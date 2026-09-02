# えまちっぷ (ema-tip)

## 概要

Winning Post などのプレイデータをもとに、仲間内で仮想の競馬・馬券を楽しむためのWebアプリです。

## 技術スタック

- Framework: Next.js (App Router)
- Database: PostgreSQL + Drizzle ORM
- Session / Cache: Redis
- Styling: Tailwind CSS v4
- Auth: Auth.js (Discord OAuth)
- Testing: Vitest
- Infrastructure: Docker Compose + Cloudflare Tunnel

## 推奨環境

- OS: Ubuntu
- vCPU: 2+
- MEMORY: 4GB+

## 開発環境セットアップ

前提: Docker と [Task](https://taskfile.dev/) がインストールされていること。

1. `.env.sample` をコピーして `.env` を作成し、必要な値を設定します。
2. コンテナを起動します。Next.js アプリ、PostgreSQL、Redis が立ち上がります。

   ```bash
   task up
   ```

3. 初回起動時やリセット時はデータベースをセットアップします。

   ```bash
   task db:setup
   ```

利用可能なコマンドの一覧は `task --list` で確認できます。コンテナ内で任意の pnpm コマンドを実行したい場合は `task run -- <コマンド>` を使います。

### Cloudflare Tunnel による外部公開と実機確認

Cloudflare Zero Trust でトンネルを作成し、`.env` に `TUNNEL_TOKEN` を設定すると、`task docker:up` で `tunnel` コンテナも起動して外部からアクセスできます。トンネルの稼働状況は `task docker:logs:tunnel` で確認します。

## シードデータ

マスタデータは以下のJSONで管理しています。変更後は `task db:seed` で反映します。

- `src/shared/db/seeds/venues.json`: 競馬場マスタ
- `src/shared/db/seeds/races.json`: レース定義マスタ
- `src/shared/db/seeds/horses.json`: 馬マスタ

ユーザーロールの変更は `task db:role -- --user=<username>` で行います。

## 本番環境での実行

本番は Proxmox VM 上の Docker で運用し、Cloudflare Tunnel 経由で公開します。`.env` に `TUNNEL_TOKEN` を設定した上で、VM上で以下を実行します。

```bash
task prod:up       # 起動・更新
task prod:migrate  # スキーマ変更時のみ実行するDBマイグレーション
task prod:down     # 停止
```

### アーキテクチャメモ: Cloudflare環境下でのSSE

Cloudflare を経由する通信は、100秒間無通信が続くと HTTP 524 として強制切断されます。本アプリはリアルタイム通信にSSEを使うため、以下の対策を実装済みです。

1. Keep-Alive Ping: サーバー側の `src/app/api/events/race-status/route.ts` から約30秒間隔で ping を送信。
2. 自動再接続: クライアントの `src/shared/hooks/use-sse.ts` で40秒以上 ping がない場合はソケットを破棄して再接続。

SSE接続のタイムアウトが問題になる場合は、該当ファイルのパラメータを調整してください。

## ディレクトリ構成

Feature-Sliced Design (FSD) をベースにしています。

- `src/app`: App Router のページとAPIルート
- `src/features`: betting, economy, ranking, admin などの機能モジュール
- `src/entities`: bet の払戻・オッズ計算などのドメインモデルとロジック
- `src/shared`: 共有UI・ユーティリティ・DB・設定
