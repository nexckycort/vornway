type OAuthAuthorizePageProps = {
  clientId: string;
  clientName: string;
  redirectUri: string;
  resource: string;
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  error?: string;
};

export function OAuthAuthorizePage(props: OAuthAuthorizePageProps) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Autorizar acceso MCP</title>
        <style>{`
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
        `}</style>
      </head>
      <body>
        <div class="wrap">
          <form
            class="card"
            method="post"
            action="/authorize"
            id="oauth-authorize-form"
          >
            <h1>Iniciar sesión para autorizar</h1>
            <p>
              <strong>{props.clientName}</strong> quiere conectarse a tu MCP.
            </p>

            {props.error ? <div class="error">{props.error}</div> : null}

            <div class="meta">
              <div>Client ID: {props.clientId}</div>
              <div>Scope: {props.scope}</div>
            </div>

            <input type="hidden" name="client_id" value={props.clientId} />
            <input
              type="hidden"
              name="redirect_uri"
              value={props.redirectUri}
            />
            <input type="hidden" name="resource" value={props.resource} />
            <input type="hidden" name="scope" value={props.scope} />
            <input type="hidden" name="state" value={props.state ?? ''} />
            <input
              type="hidden"
              name="code_challenge"
              value={props.codeChallenge ?? ''}
            />
            <input
              type="hidden"
              name="code_challenge_method"
              value={props.codeChallengeMethod ?? ''}
            />

            <label htmlFor="email">Correo</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              required
            />

            <button type="button" class="secondary" id="send-otp-btn">
              Enviar código OTP
            </button>
            <div class="status" id="otp-status"></div>

            <label htmlFor="otp">Código OTP</label>
            <input
              id="otp"
              name="otp"
              type="text"
              placeholder="123456"
              required
            />

            <button type="submit">Autorizar</button>
            <div class="hint">Primero solicita el OTP y luego autoriza.</div>
          </form>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
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
                      headers: {
                        'content-type': 'application/json'
                      },
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
            `,
          }}
        />
      </body>
    </html>
  );
}
