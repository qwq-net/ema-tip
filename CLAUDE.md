# ルール

## コマンド

- 基本は taskfile の内容での実行を優先すること
- task を使用しない場合は pnpm を使用すること

## 環境

- Dockerによる再現性ある環境を推奨する
- ClaudeCode による開発を推奨する
- コードの仕様はコメントに、手順は Taskfile に残す。検証で得た知見のように単一のコメントに紐付かないものだけ docs/ へ残す。docs/superpowers/ は作業用でありコミットしない

## 推奨スキル

- ponytail の導入を推奨する
- superpowers の導入を推奨する
- 非導入環境である場合、ユーザーに案内を促すこと

## フロントエンド方針

- 再利用可能な統一性のあるコンポーネントを意識する
- 過度な抽象化はせず、運用に即した現実的な判断をする
- form action を使う編集フォームは、保存で更新されるサーバー値を key にして再マウントする。理由: React 19 が action 完了後にフィールドを初期値へ自動リセットし、useState 管理の入力で表示と送信値が乖離するため。updatedAt が無いテーブルは初期データの JSON.stringify を key にする
- 利用者が高頻度で呼ぶ Server Action に revalidatePath を足さない。応答に対象ページの再レンダリングが同梱され、待ち時間がほぼ倍になる。動的ページの鮮度は呼び手の router.refresh と SSE で担保し、画面反映は E2E で検証する。キャッシュされるページを導入する場合のみ revalidate を再検討する
- SSE 起点のトーストは開催中に1回きりの状態変化に限る。購入のたびに全員へ届くオッズ更新のような高頻度イベントは、値の表示自体の更新で伝える

## Lint

- 型付きルールは typescript-eslint の strictTypeChecked と stylisticTypeChecked。誤検知を切る判断は eslint.config.ts のコメントに理由を書く
- 複雑度は sonarjs の cognitive-complexity 15 が主軸で complexity 15 は粗い網。超過したら関数を分ける。閾値は上げない
- FSD の層方向は no-restricted-imports で強制する。shared から entities は constants と types の葉モジュールのみ参照できる
- eslint-disable は理由付きの行単位のみ。ファイル単位の無効化はしない。不要になった指定は reportUnusedDisableDirectives が検出する
- 新しいルールを足すときは warn で入れて既存違反を潰し、ゼロになった時点で error へ昇格する
- lint は `--max-warnings 0`。warning はそのまま CI の失敗になる
- no-unnecessary-condition は off。tsconfig の noUncheckedIndexedAccess が無効な間は正しいガードを不要と誤判定するため、添字アクセスの厳格化とセットで有効化する
- 見送り中の候補は3つ。noUncheckedIndexedAccess は tsc エラー約225件、exactOptionalPropertyTypes は約22件。import/no-cycle は WSL にネイティブ resolver が無く未計測なのでコンテナ内で測る
- features 間の越境4件は今回制限していない。層境界の残る穴はここだけ

## デザインシステム

- 色・角丸・書体・文字サイズは `src/app/styles/globals.css` の @theme が唯一の管理点。維持する慣習色の例外一覧もここのコメントにある
- 文字色ロールに素の gray-400 等を使わず text-text-sub などのロールトークンを使う
- 文字の標準は text-sm。15px に上書き済みで、これ未満のサイズを新設しない。text-xs は 12px の小型チップ限定で font-semibold 併記が必須。任意値サイズ text-[Npx] は禁止
- 太さは 2 段。見出し・金額・ボタン・小型チップ・状態表示は font-semibold、説明・ラベル・補助テキストは normal で色が区別を担う
- 角丸は rounded-control・rounded-surface・rounded-chip・rounded-full の 4 種のみ
- 状態の単語チップは Badge 部品のピルを使い、手組みのステータスピルを作らない。テーブルやカード行内の小型マーカーだけ rounded-chip + px-1.5 py-0.5 の高密度仕様を使う
- 帯型の状態通知は Alert 部品を使う。成功・警告・エラー・情報の意味色は @theme の success/warning/error/info トークン3点組が単一管理点で、面や文字の直書きをしない
- 分類チップの色は @theme のカテゴリ識別パレット cat-* を Badge 経由で使う。生の Tailwind パレット色は慣習色ファイル以外に書かない。逸脱は color-usage.test.ts が検出する
- border と divide には必ず色を併記する。Tailwind v4 の既定は currentColor で黒い枠線になる
- 静的なカードやテーブルに影を付けない。shadow はダイアログ・ドロップダウン・固定フッターなど浮遊要素専用
- 逸脱は theme-contrast・radius-scale・type-scale の各テストが CI で検出する

## 監査基準

- YAGNI 原則を基本とする
- 設計手法の基本は FSD でシステムを構築する

## git運用関連

- AI側ではコミットを行わないこと
- 対応したファイル + 推奨コミットメッセージをセットでコードブロックとして出力する
- コマンドとして構成する
