import { describe, expect, it } from 'bun:test';
import { authorizePage, escapeHtml } from './page';

const props = {
  clientId: 'mcp_abc',
  clientName: 'Claude',
  redirectUri: 'https://claude.ai/callback',
  resource: 'https://api.vornway.com/mcp',
  scope: 'mcp:tools',
};

describe('authorizePage', () => {
  it('renders the client, the hidden OAuth fields and the form target', () => {
    const html = authorizePage({
      ...props,
      state: 'xyz',
      codeChallenge: 'a'.repeat(43),
      codeChallengeMethod: 'S256',
    });

    expect(html).toContain('<strong>Claude</strong> quiere conectarse');
    expect(html).toContain('action="/oauth/authorize"');
    expect(html).toContain('name="state" value="xyz"');
    expect(html).toContain('name="code_challenge_method" value="S256"');
    expect(html).not.toContain('class="error"');
  });

  it('escapes every value it interpolates', () => {
    const html = authorizePage({
      ...props,
      clientName: '<script>alert(1)</script>',
      redirectUri: 'https://x.test/cb?a=1&b="2"',
      state: `'><img src=x onerror=alert(1)>`,
      error: '<b>mal</b>',
    });

    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>mal</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('value="https://x.test/cb?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain('<div class="error">&lt;b&gt;mal&lt;/b&gt;</div>');
  });
});

describe('escapeHtml', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});
