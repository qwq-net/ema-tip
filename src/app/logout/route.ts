import { signOut } from '@/shared/config/auth';
import { NextResponse } from 'next/server';

/**
 * ログアウトの受け口。素のフォーム送信で呼ばれ、セッション Cookie を消してからログイン画面へ 303 で返す。
 * サーバーアクションではなく Route Handler にしているのは、ブラウザ自身にフォーム送信と遷移を任せて
 * クライアントルーターの状態や SSE 起点の再描画に左右されないようにするため。
 * 遷移先はリクエストのオリジンから組み、トンネルや別ホストで開いていても同じオリジンへ戻す。
 * 第三者のページから画像タグ等で勝手にログアウトさせられないよう GET は受けない。
 */
export async function POST(request: Request) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
