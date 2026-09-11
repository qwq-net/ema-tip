import { notifyError } from '@/shared/lib/notify';

/**
 * サーバー側で処理しきれなかった例外を受け取る Next.js のフック。
 * Server Component の描画・Route Handler・Server Action の全てが対象で、
 * runAction を通らない経路の異常もここへ来る。
 * 使われ方: Next.js が自動で呼ぶ。アプリのコードから呼ばないこと。
 */
export function onRequestError(
  // eslint-disable-next-line anti-slop/no-unknown-parameters -- 呼び出すのは Next.js で、throw された値は何でも来うる。ここが境界そのもので、下の instanceof が正規化にあたる
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string }
): void {
  void notifyError({
    kind: 'render',
    title: 'サーバー側で処理されない例外が発生しました',
    detail: error instanceof Error ? error.message : String(error),
    context: { path: request.path, method: request.method, routeType: context.routeType },
    cause: error,
  });
}
