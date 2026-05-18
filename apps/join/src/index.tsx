import type { Context } from 'hono';
import { Hono } from 'hono';

import { db } from './connection';

type InviteGroup = {
  name: string;
  description: string | null;
  type: string;
  inviteCode: string;
  owner: {
    name: string | null;
  } | null;
  _count: {
    GroupMember: number;
  };
};

const app = new Hono();

app.get('/:inviteCode', async (c) => {
  const inviteCode = normalizeInviteCode(c.req.param('inviteCode'));
  const group = await getInviteGroup(inviteCode);
  const origin = getPublicOrigin(c);
  const appInviteUrl = getAppInviteUrl(inviteCode);

  if (!group) {
    return c.html(
      <InvitePage
        origin={origin}
        title="Invitación no encontrada"
        description="Este enlace ya no es válido o el grupo fue eliminado."
        inviteCode={inviteCode}
        inviterName={null}
        memberCount={0}
        groupType={null}
        appInviteUrl={appInviteUrl}
        notFound
      />,
      404,
    );
  }

  return c.html(
    <InvitePage
      origin={origin}
      title={group.name}
      description={buildInviteDescription(group)}
      inviteCode={group.inviteCode}
      inviterName={group.owner?.name ?? null}
      memberCount={group._count.GroupMember}
      groupType={group.type}
      appInviteUrl={appInviteUrl}
    />,
  );
});

app.get('/:inviteCode/og-image.svg', async (c) => {
  const inviteCode = normalizeInviteCode(c.req.param('inviteCode'));
  const group = await getInviteGroup(inviteCode);

  const svg = buildInvitationImage({
    title: group?.name ?? 'Invitación no encontrada',
    inviterName: group?.owner?.name ?? 'Vornway',
    memberCount: group?._count.GroupMember ?? 0,
    groupType: group?.type ?? null,
    notFound: !group,
  });

  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=600, s-maxage=600',
  });
});

export default app;

async function getInviteGroup(inviteCode: string) {
  return db.group.findUnique({
    where: {
      inviteCode,
    },
    select: {
      name: true,
      description: true,
      type: true,
      inviteCode: true,
      owner: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          GroupMember: true,
        },
      },
    },
  });
}

function getPublicOrigin(c: Context): string {
  const requestUrl = new URL(c.req.url);
  const forwardedProto = firstHeaderValue(c.req.header('x-forwarded-proto'));
  const forwardedHost = firstHeaderValue(c.req.header('x-forwarded-host'));

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return requestUrl.origin;
}

function firstHeaderValue(value?: string): string | undefined {
  if (!value) return undefined;
  return value.split(',')[0]?.trim() || undefined;
}

function normalizeInviteCode(value: string) {
  return value.trim().replace(/[?#].*$/g, '').replace(/\/+$/g, '');
}

function buildInviteDescription(group: InviteGroup) {
  const inviter = group.owner?.name?.trim();
  const groupLabel = formatGroupType(group.type);

  if (inviter) {
    return `${inviter} te invitó a ${group.name} en Vornway. ${groupLabel}. ${group._count.GroupMember} participante(s).`;
  }

  return `Te invitaron a ${group.name} en Vornway. ${groupLabel}. ${group._count.GroupMember} participante(s).`;
}

function formatGroupType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'viajes') return 'Grupo de viajes';
  if (normalized === 'meta') return 'Meta de ahorro';
  return `Grupo ${value}`;
}

function getInviteUrl(origin: string, inviteCode: string) {
  return `${origin}/${inviteCode}`;
}

function getAppInviteUrl(inviteCode: string) {
  return `https://app.vornway.com/i/${inviteCode}`;
}

function buildInvitationImage(input: {
  title: string;
  inviterName: string;
  memberCount: number;
  groupType: string | null;
  notFound: boolean;
}) {
  const typeLabel = input.groupType ? formatGroupType(input.groupType) : 'Vornway';
  const title = escapeXml(input.title);
  const inviter = escapeXml(input.inviterName);
  const memberLabel = `${input.memberCount} participante${input.memberCount === 1 ? '' : 's'}`;
  const subtitle = input.notFound
    ? 'Este enlace no está disponible'
    : `${typeLabel} · ${memberLabel}`;
  const safeSubtitle = escapeXml(subtitle);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="bg" x1="64" y1="28" x2="1136" y2="604" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFF7F8"/>
      <stop offset="0.55" stop-color="#FFE3EA"/>
      <stop offset="1" stop-color="#F8FAFC"/>
    </linearGradient>
    <linearGradient id="accent" x1="192" y1="92" x2="1008" y2="540" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E11D48"/>
      <stop offset="1" stop-color="#FB7185"/>
    </linearGradient>
    <filter id="shadow" x="120" y="110" width="960" height="440" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#0F172A" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1030" cy="108" r="120" fill="#FEE2E2" opacity="0.5"/>
  <circle cx="184" cy="542" r="150" fill="#FCE7F3" opacity="0.55"/>

  <g filter="url(#shadow)">
    <rect x="144" y="92" width="912" height="446" rx="36" fill="white"/>
  </g>

  <rect x="176" y="126" width="126" height="44" rx="22" fill="#FCE7F3"/>
  <text x="239" y="155" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="#E11D48">Vornway</text>

  <text x="176" y="250" font-family="Poppins, Arial, sans-serif" font-size="54" font-weight="700" fill="#0F172A">${title}</text>
  <text x="176" y="306" font-family="Poppins, Arial, sans-serif" font-size="27" font-weight="500" fill="#475569">${safeSubtitle}</text>

  <rect x="176" y="350" width="848" height="106" rx="28" fill="#FFF1F2" stroke="#FECDD3"/>
  <circle cx="226" cy="403" r="28" fill="url(#accent)"/>
  <text x="226" y="412" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="26" font-weight="700" fill="white">${input.notFound ? '!' : '↗'}</text>
  <text x="280" y="394" font-family="Poppins, Arial, sans-serif" font-size="24" font-weight="700" fill="#0F172A">${input.notFound ? 'Enlace no disponible' : 'Te están invitando a un grupo'}</text>
  <text x="280" y="426" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="500" fill="#475569">${input.notFound ? 'Pide un nuevo enlace al dueño del grupo.' : `Invitado por ${inviter}`}</text>

  <text x="176" y="518" font-family="Poppins, Arial, sans-serif" font-size="19" font-weight="600" fill="#64748B">Mira gastos, saldos y participantes desde la app</text>
  <rect x="855" y="490" width="169" height="54" rx="27" fill="#E11D48"/>
  <text x="940" y="524" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="20" font-weight="700" fill="white">Unirme</text>
</svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function InvitePage(props: {
  origin: string;
  title: string;
  description: string;
  inviteCode: string;
  inviterName: string | null;
  memberCount: number;
  groupType: string | null;
  appInviteUrl: string;
  notFound?: boolean;
}) {
  const inviteUrl = getInviteUrl(props.origin, props.inviteCode);
  const imageUrl = `${props.origin}/${props.inviteCode}/og-image.svg`;
  const groupTypeLabel = props.groupType ? formatGroupType(props.groupType) : null;

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#e11d48" />
        <title>{props.title}</title>
        <meta name="description" content={props.description} />
        <link rel="canonical" href={inviteUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Vornway" />
        <meta property="og:title" content={props.title} />
        <meta property="og:description" content={props.description} />
        <meta property="og:url" content={inviteUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:alt" content={props.title} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta httpEquiv="refresh" content={`0;url=${props.appInviteUrl}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(props.appInviteUrl)});`,
          }}
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={props.title} />
        <meta name="twitter:description" content={props.description} />
        <meta name="twitter:image" content={imageUrl} />
        <style>{`
          :root {
            color-scheme: light;
            font-family: Poppins, Arial, sans-serif;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(225, 29, 72, 0.12), transparent 34%),
              radial-gradient(circle at bottom right, rgba(251, 113, 133, 0.18), transparent 30%),
              linear-gradient(180deg, #fff7f8 0%, #ffffff 100%);
            color: #0f172a;
          }
          .shell {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px;
          }
          .card {
            width: min(100%, 720px);
            border-radius: 32px;
            background: rgba(255, 255, 255, 0.88);
            box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
            border: 1px solid rgba(226, 232, 240, 0.9);
            overflow: hidden;
            backdrop-filter: blur(14px);
          }
          .hero {
            padding: 28px;
            background:
              linear-gradient(135deg, rgba(225, 29, 72, 0.08), rgba(251, 113, 133, 0.04)),
              white;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            border-radius: 999px;
            background: #fff1f2;
            color: #e11d48;
            font-size: 14px;
            font-weight: 700;
          }
          h1 {
            margin: 18px 0 10px;
            font-size: clamp(2rem, 6vw, 3.7rem);
            line-height: 0.98;
            letter-spacing: -0.04em;
          }
          .subtitle {
            margin: 0;
            font-size: clamp(1rem, 2.8vw, 1.35rem);
            line-height: 1.5;
            color: #475569;
          }
          .grid {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 18px;
            padding: 0 28px 28px;
          }
          .panel {
            border-radius: 28px;
            border: 1px solid #e2e8f0;
            background: #fff;
            padding: 22px;
          }
          .panel-title {
            font-size: 14px;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }
          .meta {
            margin: 10px 0 0;
            display: grid;
            gap: 12px;
          }
          .meta-row {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #0f172a;
          }
          .icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            background: #fff1f2;
            color: #e11d48;
            font-size: 22px;
            flex: none;
          }
          .meta-label {
            font-size: 14px;
            color: #64748b;
          }
          .meta-value {
            font-size: 16px;
            font-weight: 700;
          }
          .cta {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 14px;
            background: linear-gradient(180deg, #fff1f2, #ffffff);
          }
          .cta strong {
            display: block;
            font-size: 1.3rem;
            line-height: 1.2;
          }
          .cta p {
            margin: 0;
            color: #475569;
            line-height: 1.6;
          }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            min-height: 54px;
            border-radius: 999px;
            background: #e11d48;
            color: white;
            text-decoration: none;
            font-size: 16px;
            font-weight: 700;
            box-shadow: 0 12px 28px rgba(225, 29, 72, 0.22);
          }
          .footer {
            padding: 0 28px 28px;
            color: #94a3b8;
            font-size: 13px;
          }
          @media (max-width: 720px) {
            .card {
              border-radius: 28px;
            }
            .hero, .grid, .footer {
              padding-left: 20px;
              padding-right: 20px;
            }
            .grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </head>
      <body>
        <main className="shell">
          <section className="card">
            <div className="hero">
              <span className="pill">Vornway · Invitación</span>
              <h1>{props.title}</h1>
              <p className="subtitle">{props.description}</p>
            </div>

            <div className="grid">
              <div className="panel">
                <p className="panel-title">Detalles</p>
                <div className="meta">
                  <div className="meta-row">
                    <div className="icon">👤</div>
                    <div>
                      <div className="meta-label">Te invitó</div>
                      <div className="meta-value">
                        {props.inviterName ?? 'Un miembro del grupo'}
                      </div>
                    </div>
                  </div>
                  <div className="meta-row">
                    <div className="icon">👥</div>
                    <div>
                      <div className="meta-label">Participantes</div>
                      <div className="meta-value">
                        {props.memberCount} participante
                        {props.memberCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <div className="meta-row">
                    <div className="icon">💬</div>
                    <div>
                      <div className="meta-label">Tipo</div>
                      <div className="meta-value">
                        {groupTypeLabel ?? 'Grupo compartido'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel cta">
                <div>
                  <strong>
                    {props.notFound
                      ? 'Este enlace no está disponible'
                      : 'Mira gastos, saldos y participantes desde la app'}
                  </strong>
                  <p>
                    {props.notFound
                      ? 'Pide un nuevo enlace al dueño del grupo.'
                      : 'Abre la invitación para unirte y empezar a ver la actividad del grupo.'}
                  </p>
                </div>

                <a className="button" href={props.appInviteUrl}>
                  {props.notFound ? 'Volver' : 'Abrir en la app'}
                </a>
              </div>
            </div>

            <div className="footer">
              Si no redirige automáticamente, abre este enlace:{' '}
              {props.appInviteUrl}
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
