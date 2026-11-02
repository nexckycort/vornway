import { SQL } from 'bun';
import { Effect } from 'effect';

const ADMIN_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://vornway:vornway@127.0.0.1:5433/vornway';

const API_DIR = new URL('../', import.meta.url).pathname;
const MIGRATIONS_DIR = new URL('../db/migrations/', import.meta.url).pathname;

const urlFor = (name: string) => {
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.href;
};

const shortId = () => Bun.randomUUIDv7('hex').slice(-12);

const migrationsHash = async () => {
  const files = [...new Bun.Glob('**/*').scanSync(MIGRATIONS_DIR)].toSorted();
  const sources = await Promise.all(
    files.map(
      async (file) =>
        `${file}\0${await Bun.file(MIGRATIONS_DIR + file).text()}`,
    ),
  );
  return Bun.hash(sources.join('\0')).toString(36);
};

const migrate = async (url: string) => {
  const prisma = Bun.spawn(
    ['bun', 'run', '--bun', 'prisma', 'migrate', 'deploy'],
    {
      cwd: API_DIR,
      env: { ...process.env, DATABASE_URL: url },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(prisma.stdout).text(),
    new Response(prisma.stderr).text(),
    prisma.exited,
  ]);
  if (code !== 0) {
    throw new Error(`prisma migrate deploy failed:\n${stdout}\n${stderr}`);
  }
};

const waitUntilIdle = async (
  admin: SQL,
  name: string,
  attempts = 50,
): Promise<void> => {
  const [row] = await admin`
    select count(*)::int as open from pg_stat_activity where datname = ${name}`;
  if (row.open === 0 || attempts === 0) return;
  await Bun.sleep(20);
  return waitUntilIdle(admin, name, attempts - 1);
};

const ensureTemplate = async (admin: SQL) => {
  const name = `vornway_template_${await migrationsHash()}`;
  const existing =
    await admin`select 1 from pg_database where datname = ${name}`;
  if (existing.length > 0) return name;

  const building = `vornway_building_${shortId()}`;
  await admin.unsafe(`create database "${building}"`);
  await migrate(urlFor(building));
  await waitUntilIdle(admin, building);
  await admin
    .unsafe(`alter database "${building}" rename to "${name}"`)
    .catch(() => admin.unsafe(`drop database "${building}"`));
  return name;
};

const open = async () => {
  const admin = new SQL(ADMIN_URL, { max: 1 });
  await admin`select 1`.catch((cause: unknown) => {
    throw new Error(
      `Integration tests need Postgres at ${ADMIN_URL}. Run \`docker compose up -d postgres\` or set TEST_DATABASE_URL.`,
      { cause },
    );
  });

  const name = `vornway_test_${shortId()}`;
  const template = await ensureTemplate(admin);
  await admin.unsafe(`create database "${name}" template "${template}"`);

  const sql = new SQL(urlFor(name), { max: 2 });
  const tables = await sql<{ table: string }[]>`
    select tablename as "table" from pg_tables
    where schemaname = 'public' and tablename <> '_prisma_migrations'`;
  const truncate = `truncate ${tables.map((row) => `"${row.table}"`).join(', ')} cascade`;
  return { admin, name, url: urlFor(name), sql, truncate };
};

let database: ReturnType<typeof open> | undefined;

export const closeTestDatabase = async () => {
  if (!database) return;
  const { admin, name, sql } = await database;
  await sql.close();
  await waitUntilIdle(admin, name);
  await admin.unsafe(`drop database "${name}" with (force)`);
  await admin.close();
};

export const testDatabase = Effect.gen(function* () {
  const db = yield* Effect.promise(() => (database ??= open()));
  yield* Effect.promise(() => db.sql.unsafe(db.truncate));

  return {
    url: db.url,
    query: <Row extends object>(text: string, params: unknown[] = []) =>
      Effect.promise(() => db.sql.unsafe<Row[]>(text, params)).pipe(
        Effect.map((rows) => [...rows]),
      ),
  };
});
