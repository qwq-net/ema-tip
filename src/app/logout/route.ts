import { signOut } from '@/shared/config/auth';

/**
 * ログアウトの受け口。素のフォーム送信で呼ばれ、セッション Cookie を消してからログイン画面へ 303 で返す。
 * サーバーアクションではなく Route Handler にしているのは、ブラウザ自身にフォーム送信と遷移を任せて
 * クライアントルーターの状態や SSE 起点の再描画に左右されないようにするため。
 * 遷移先は相対パスで返す。next start の request.url は Host ヘッダではなくサーバー自身のホスト名で
 * 組まれるため、そこから絶対 URL を作るとトンネル越しの利用者が localhost へ飛ばされる。
 * 第三者のページから画像タグ等で勝手にログアウトさせられないよう GET は受けない。
 */
export async function POST() {
  await signOut({ redirect: false });
  return new Response(null, { status: 303, headers: { Location: '/login' } });
}
