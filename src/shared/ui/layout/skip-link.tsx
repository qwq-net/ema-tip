/**
 * キーボード操作で繰り返しの導線を飛ばして本文へ移るリンク。フォーカスが当たるまで視覚的に隠れる。
 * 飛び先は id="main" の要素で、利用者側と管理側の main がそれぞれ持つ前提。
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="focus:rounded-control focus:text-primary focus:ring-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:ring-2"
    >
      本文へ移動
    </a>
  );
}
