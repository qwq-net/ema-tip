# 運用ガイド

障害時の挙動、バックアップとリストア、整合性チェック、監査ログの参照方法をまとめる。
構成は docker compose の単一ホスト運用が前提で、サービスは app / db / redis / tunnel の4つ。

## 障害時の挙動マップ

| 停止したもの | 影響                                                                                                                                        | 自動復旧                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| redis        | ログインのレート制限が失敗しログイン不可になる。オッズ更新のSSE通知スロットルが失敗する。暫定オッズはキャッシュを素通りしてDB計算で表示継続 | コンテナ再起動で復旧。データはスロットルキーとレート制限のみで、消えても実害なし                                         |
| db           | 全機能停止                                                                                                                                  | コンテナ再起動で復旧。トランザクション途中のリクエストはロールバックされ、advisory lock はセッション切断で解放される     |
| app          | 全機能停止。SSE接続は切断されクライアントが再接続を試みる                                                                                   | 再起動で復旧。オッズ再計算のファイア・アンド・フォーゲットとSSEのtrailing edge予約は失われるが、次のベットで再計算される |
| tunnel       | 外部からのアクセス不可。localhost:3000 は生存                                                                                               | 再起動で復旧                                                                                                             |

デプロイ時の注意: app の再起動はリクエスト途中のトランザクションを切断するが、
全ての金銭操作は単一トランザクションで書くルールのため、中途半端な状態は残らない。
再起動後に `task db:reconcile` を実行すれば残高と台帳の一致を確認できる。

## バックアップとリストア

データの実体は db-data ボリュームの PostgreSQL のみ。redis は消えてよいデータしか持たない。

バックアップ:

```bash
docker compose exec -T db pg_dump -U postgres -d webapp --format=custom > backup_$(date +%Y%m%d_%H%M%S).dump
```

リストア:

```bash
docker compose exec -T db pg_restore -U postgres -d webapp --clean --if-exists < backup_YYYYMMDD_HHMMSS.dump
```

イベント開催の直前と払戻確定の完了後に手動で取得することを推奨する。
リストア後は `task db:reconcile` で整合性を確認する。

## 整合性チェック

```bash
task db:reconcile
```

残高と取引台帳の一致、ベットグループ合計、ベット状態と払戻額の整合、
確定済みレースの未処理ベット残りを突合する。読み取りのみで本番実行も安全。
不一致があれば該当行を表示して終了コード1で落ちる。

## 管理操作の監査ログ

締切・再開・着順確定・払戻確定・リセット・BET5の締切と確定は admin_action_log テーブルへ記録される。
誰がいつ何を行ったかを確認するには:

```bash
docker compose exec -T db psql -U postgres -d webapp -c \
  "SELECT created_at, actor_name, action, target_id, detail FROM admin_action_log ORDER BY created_at DESC LIMIT 50;"
```

action の値は race.close / race.reopen / race.set_closing_time / race.finalize_results /
race.finalize_payout / race.reset_results / bet5.close / bet5.update_initial_pot / bet5.finalize_payout。
記録は操作本体と同一トランザクションで行われるため、失敗してロールバックした操作のログは残らない。
