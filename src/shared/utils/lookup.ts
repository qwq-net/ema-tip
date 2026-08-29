/**
 * 文字列キーでマップを引き、キーが存在しなければ undefined を返す。
 * satisfies で閉じたラベルマップを、DB由来などの任意文字列で安全に参照する用途。
 */
export function lookup<V>(map: Readonly<Record<string, V>>, key: string): V | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}
