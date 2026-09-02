import { toast as sonnerToast } from 'sonner';

/**
 * アプリ標準のトースト。sonner の toast と同一 API で、error の既定 duration だけを Infinity に上書きする。
 * エラーは失敗理由と復旧手順を読み切るまで自動で消さない方針のため。閉じる操作で消す前提で、
 * 呼び手が data.duration を明示すればそちらが優先される。error 以外は素通しする。
 */
export const toast: typeof sonnerToast = Object.assign(
  // SAFETY: sonnerToast 本体と同一の引数をそのまま委譲する関数のため、呼び出しシグネチャは一致する。
  // メソッド群は直後の Object.assign で sonnerToast から全コピーされる
  ((message, data) => sonnerToast(message, data)) as typeof sonnerToast,
  sonnerToast,
  {
    // SAFETY: sonnerToast.error と同一の引数を受け、既定 duration を合成して委譲するだけのためシグネチャは一致する
    error: ((message, data) => sonnerToast.error(message, { duration: Infinity, ...data })) as typeof sonnerToast.error,
  }
);
