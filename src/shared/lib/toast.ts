import { toast as sonnerToast } from 'sonner';

type ErrorParameters = Parameters<typeof sonnerToast.error>;

/**
 * アプリ標準のトースト。sonner の toast と同一 API で、error の既定 duration だけを Infinity に上書きする。
 * エラーは失敗理由と復旧手順を読み切るまで自動で消さない方針のため。閉じる操作で消す前提で、
 * 呼び手が data.duration を明示すればそちらが優先される。error 以外は素通しする。
 */
export const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    error: (message: ErrorParameters[0], data?: ErrorParameters[1]) =>
      sonnerToast.error(message, { duration: Infinity, ...data }),
  }
);
