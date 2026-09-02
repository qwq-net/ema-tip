# ルール

## コマンド

- 基本は taskfile の内容での実行を優先すること
- task を使用しない場合は pnpm を使用すること

## 環境

- Dockerによる再現性ある環境を推奨する
- ClaudeCode による開発を推奨する
- docs/ 等にドキュメントを残さず、コメント等に残す

## 推奨スキル

- ponytail の導入を推奨する
- superpowers の導入を推奨する
- 非導入環境である場合、ユーザーに案内を促すこと

## フロントエンド方針

- 再利用可能な統一性のあるコンポーネントを意識する
- 過度な抽象化はせず、運用に即した現実的な判断をする
- form action を使う編集フォームは、保存で更新されるサーバー値を key にして再マウントする。理由: React 19 が action 完了後にフィールドを初期値へ自動リセットし、useState 管理の入力で表示と送信値が乖離するため。updatedAt が無いテーブルは初期データの JSON.stringify を key にする

## デザインシステム

- 色・角丸・書体・文字サイズは `src/app/styles/globals.css` の @theme が唯一の管理点。維持する慣習色の例外一覧もここのコメントにある
- 文字色ロールに素の gray-400 等を使わず text-text-sub などのロールトークンを使う
- 文字の標準は text-sm。15px に上書き済みで、これ未満のサイズを新設しない。text-xs は 12px の小型チップ限定で font-semibold 併記が必須。任意値サイズ text-[Npx] は禁止
- 太さは 2 段。見出し・金額・ボタン・小型チップ・状態表示は font-semibold、説明・ラベル・補助テキストは normal で色が区別を担う
- 角丸は rounded-control・rounded-surface・rounded-chip・rounded-full の 4 種のみ
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
