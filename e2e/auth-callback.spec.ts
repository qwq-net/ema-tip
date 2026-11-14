import { expect, test } from '@playwright/test';

// 認可拒否ならトークン交換やDB更新をせず、実際のAuth.jsでissの検証まで確認できる。
for (const [issuer, expectedError] of [
  ['https://discord.com', 'OAuthCallbackError'],
  ['https://untrusted.example', 'Configuration'],
] as const) {
  test(`Discordの認証元 ${issuer} の応答を ${expectedError} として扱う`, async ({ request }) => {
    const response = await request.get('/api/auth/callback/discord', {
      params: { iss: issuer, error: 'access_denied' },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location!).searchParams.get('error')).toBe(expectedError);
  });
}
