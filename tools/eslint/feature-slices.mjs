// eslint.config.ts は tsconfig の対象外で既定プロジェクトとして解析されるため、node:fs の型が付かない。
// ファイルシステムの読み取りをこのアダプタへ寄せ、設定側は型の付いた文字列配列を受け取る。
// eslint.config.ts から jiti 経由でロードされる前提。
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * 指定した層のスライス名を列挙する。手書きの台帳を置かず実体から導出する。
 * 呼び出し元のカレントディレクトリに依存しないよう、このファイルの位置から解決する。
 * 層のディレクトリがまだ無ければ空配列を返す。
 * @param {'features' | 'widgets'} layer 層のディレクトリ名
 * @returns {string[]} スライス名の配列
 */
export function sliceNames(layer) {
  const dir = path.resolve(import.meta.dirname, `../../src/${layer}`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}
