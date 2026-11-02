export type AuthorizePageProps = {
  readonly clientId: string;
  readonly clientName: string;
  readonly redirectUri: string;
  readonly resource: string;
  readonly scope: string;
  readonly state?: string | undefined;
  readonly codeChallenge?: string | undefined;
  readonly codeChallengeMethod?: 'plain' | 'S256' | undefined;
  readonly error?: string | undefined;
};

export const authorizePage = (props: AuthorizePageProps) => `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Autorizar acceso MCP</title>
    <style>${STYLES}</style>
  </head>
  <body>
    <div class="wrap">
      <form class="card" method="post" action="/oauth/authorize" id="oauth-authorize-form">
        <h1>Iniciar sesión para autorizar</h1>
        <p><strong>${escapeHtml(props.clientName)}</strong> quiere conectarse a tu MCP.</p>
        ${props.error ? `<div class="error">${escapeHtml(props.error)}</div>` : ''}
        <div class="meta">
          <div>Client ID: ${escapeHtml(props.clientId)}</div>
          <div>Scope: ${escapeHtml(props.scope)}</div>
        </div>
        ${hidden('client_id', props.clientId)}
        ${hidden('redirect_uri', props.redirectUri)}
        ${hidden('resource', props.resource)}
        ${hidden('scope', props.scope)}
        ${hidden('state', props.state)}
        ${hidden('code_challenge', props.codeChallenge)}
        ${hidden('code_challenge_method', props.codeChallengeMethod)}
        <label for="email">Correo</label>
        <input id="email" name="email" type="email" placeholder="tu@email.com" required />
        <button type="button" class="secondary" id="send-otp-btn">Enviar código OTP</button>
        <div class="status" id="otp-status"></div>
        <label for="otp">Código OTP</label>
        <input id="otp" name="otp" type="text" placeholder="123456" required />
        <button type="submit">Autorizar</button>
        <div class="hint">Primero solicita el OTP y luego autoriza.</div>
      </form>
    </div>
    <script>${SEND_OTP_SCRIPT}</script>
  </body>
</html>
`;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

const hidden = (name: string, value: string | undefined) =>
  `<input type="hidden" name="${name}" value="${escapeHtml(value ?? '')}" />`;

const STYLES = `
      :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      body { margin: 0; background: #f6f8fc; color: #0f172a; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: 100%; max-width: 460px; background: #fff; border: 1px solid #dbe3f0; border-radius: 18px; padding: 24px; box-shadow: 0 20px 40px -30px rgba(15, 23, 42, .45); }
      h1 { margin: 0 0 10px; font-size: 24px; }
      p { margin: 0 0 14px; color: #334155; }
      .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; font-size: 13px; color: #1e293b; }
      label { display: block; margin: 10px 0 6px; font-weight: 600; font-size: 14px; }
      input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 10px; padding: 11px 12px; font-size: 14px; }
      button { margin-top: 14px; width: 100%; border: 0; border-radius: 10px; padding: 12px 14px; background: #0f172a; color: #fff; font-weight: 600; cursor: pointer; }
      .secondary { background: #334155; }
      .error { margin-bottom: 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 10px; padding: 9px 10px; font-size: 13px; }
      .hint { margin-top: 10px; font-size: 12px; color: #64748b; }
      .status { margin-top: 10px; font-size: 12px; color: #0f766e; }
    `;

const SEND_OTP_SCRIPT = `
      (function () {
        const sendOtpBtn = document.getElementById('send-otp-btn');
        const emailInput = document.getElementById('email');
        const status = document.getElementById('otp-status');

        if (!sendOtpBtn || !emailInput || !status) return;

        sendOtpBtn.addEventListener('click', async function () {
          const email = emailInput.value.trim();
          if (!email) {
            status.textContent = 'Ingresa tu correo primero.';
            return;
          }

          status.textContent = 'Enviando OTP...';
          sendOtpBtn.disabled = true;

          try {
            const response = await fetch('/api/login/send-otp', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
              status.textContent = data?.message || 'No se pudo enviar el OTP.';
            } else {
              status.textContent = 'OTP enviado. Revisa tu correo.';
            }
          } catch (error) {
            status.textContent = 'Error de red enviando OTP.';
          } finally {
            sendOtpBtn.disabled = false;
          }
        });
      })();
    `;
