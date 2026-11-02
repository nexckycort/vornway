import { Effect } from 'effect';
import type { Device, TestApp } from '../../../testkit/app';
import { signIn } from '../../../testkit/login';

export const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

export type Paged<T> = {
  data: T[];
  pagination: { limit: number; total: number; nextCursor: string | null };
};

export const bodyOf = <T>(response: { body: Record<string, unknown> }) =>
  response.body as T;

export const createGroup = (
  device: Device,
  overrides: Record<string, unknown> = {},
) =>
  device
    .post('/api/groups', { name: 'Viaje', type: 'trip', ...overrides })
    .pipe(
      Effect.map((response) => ({
        id: response.body.id as string,
        imageUrl: response.body.imageUrl as string | null,
      })),
    );

export const memberIdOf = (app: TestApp, group: string, userId: string) =>
  app.db
    .query(
      'select id from group_member where "groupId" = $1 and "userId" = $2',
      [group, userId],
    )
    .pipe(Effect.map((rows) => String((rows[0] as { id: string }).id)));

export const addMember = (
  device: Device,
  group: string,
  name: string,
  linkedUserId?: string,
) =>
  device
    .post(`/api/groups/${group}/members`, {
      name,
      ...(linkedUserId ? { linkedUserId } : {}),
    })
    .pipe(Effect.map((response) => response.body.id as string));

export const trip = (app: TestApp) =>
  Effect.gen(function* () {
    const ana = yield* signIn(app, 'ana@vornway.test');
    const bruno = yield* signIn(app, 'bruno@vornway.test');
    const { id: group } = yield* createGroup(ana.device);
    const anaMember = yield* memberIdOf(app, group, ana.id);
    const brunoMember = yield* addMember(ana.device, group, 'Bruno', bruno.id);
    return { ana, bruno, group, anaMember, brunoMember };
  });

export const expense = (overrides: Record<string, unknown> = {}) => ({
  description: 'Cena',
  amount: 100,
  currency: 'COP',
  ...overrides,
});

export const createExpense = (
  device: Device,
  group: string,
  overrides: Record<string, unknown> = {},
) =>
  device
    .post(`/api/groups/${group}/expenses`, expense(overrides))
    .pipe(Effect.map((response) => response.body.id as string));

export const walkPages = <T extends { id: string }>(
  device: Device,
  path: string,
  limit: number,
) =>
  Effect.gen(function* () {
    const ids: string[] = [];
    const totals: number[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const separator = path.includes('?') ? '&' : '?';
      const response: { body: Record<string, unknown> } = yield* device.get(
        `${path}${separator}limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
      );
      const page = bodyOf<Paged<T>>(response);
      ids.push(...page.data.map((item) => item.id));
      totals.push(page.pagination.total);
      cursor = page.pagination.nextCursor;
      pages += 1;
    } while (cursor);
    return { ids, totals, pages };
  });

export const sessionCookie = (app: TestApp, email: string) =>
  Effect.gen(function* () {
    const headers = {
      'content-type': 'application/json',
      'expo-origin': 'vornway://',
    };
    yield* app.fetch('/api/auth/email-otp/send-verification-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, type: 'sign-in' }),
    });
    const response = yield* app.fetch('/api/auth/sign-in/email-otp', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, otp: app.email.otpFor(email) }),
    });
    return response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ');
  });

export const eventually = <A, E, R>(
  check: Effect.Effect<A | undefined, E, R>,
) =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const value = yield* check;
      if (value !== undefined) return value;
      yield* Effect.sleep('20 millis');
    }
    return undefined;
  });

export const waitFor = <A>(read: () => A | undefined) =>
  eventually(Effect.sync(read));
