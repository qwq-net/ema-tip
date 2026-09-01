import { headers } from 'next/headers';

/**
 * クライアント IP を返す。ログインレート制限のキーとして使われる前提。
 * 本番はオリジンを 127.0.0.1 にバインドし Cloudflare Tunnel 経由でのみ到達するため、
 * Cloudflare が付け直す cf-connecting-ip だけを信頼する。
 * x-forwarded-for 等はクライアントが偽装でき、レート制限の回避に使えるため見ない。
 * ローカル開発の直アクセスなどヘッダがない場合は '127.0.0.1' を返す。
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();

  const cfIp = headersList.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}
