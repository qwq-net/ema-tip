/**
 * 文字列キーでマップを引き、キーが存在しなければ undefined を返す。
 * satisfies で閉じたラベルマップを、DB由来などの任意文字列で安全に参照する用途。
 */
export function lookup<V>(map: Readonly<Record<string, V>>, key: string): V | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

/** value が候補 options に含まれればその union 型として返し、含まれなければ null を返す。 */
export function narrowToOption<T extends string>(options: readonly T[], value: string | null | undefined): T | null {
  return options.find((option) => option === value) ?? null;
}
