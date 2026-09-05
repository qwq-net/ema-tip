/**
 * 1 行だけ返る想定のクエリ結果から先頭行を取り出す。
 * 行が無いのは呼び出し側の前提が崩れた状態なので例外を投げ、進行中のトランザクションを失敗させる。
 * label は失敗時のメッセージへ載せる対象名。
 */
export function firstRow<T>(rows: T[], label: string): T {
  const [row] = rows;
  if (row === undefined) {
    throw new Error(`${label}の登録結果を取得できませんでした`);
  }
  return row;
}
