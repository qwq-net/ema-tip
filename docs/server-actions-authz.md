# Server Action 認可台帳

全ての `'use server'` エクスポート関数について、認可ガード・所有権検証・入力検証を棚卸しした台帳。
Server Action は認証なしで POST できる公開エンドポイントであるため、ガードなしの関数は「意図的な公開」として理由を明記する。

最終確認: 2026-09-01。アクションを追加・変更したらこの台帳も更新すること。

## 凡例

- admin: `requireAdmin()` または role 直接チェック
- user: `requireUser()` または `auth()` + null チェック
- tipster: `canManageForecasts` による TIPSTER / ADMIN 許可
- public: ガードなし。備考に理由を記載

## 認証・ユーザー

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| features/auth/actions/auth-actions.ts | discordSignIn | public | ログイン導線そのもの |
| 同上 | checkIpLockStatus | public | 返すのは呼び出し元IP自身のロック状態のみ |
| 同上 | validateGuestRegistration | public | 登録前検証。失敗をIPレート制限に記録し総当たりを防止 |
| 同上 | logout | public | サインアウト導線 |
| features/user/actions/user-actions.ts | updateUserOnboarding | user | 更新対象は常に自分自身の行 |
| 同上 | updateUserName | user | 同上。同名衝突チェックあり |

## ベット・オッズ

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| features/betting/actions.ts | placeBets | user | wallet の userId 一致と eventId 一致を検証。組合せは件数・整数性・実在番号を検証 |
| 同上 | getUserBetGroupsForRace | user | 自分のグループのみ返す |
| features/betting/actions/bet5.ts | createBet5EventAction | admin | |
| 同上 | closeBet5EventAction | admin | |
| 同上 | updateBet5InitialPotAction | admin | |
| 同上 | placeBet5BetAction | user | zod で選択と金額を検証。wallet は session の userId から解決 |
| 同上 | calculateBet5PayoutAction | admin | |
| 同上 | getBet5TicketsAction | admin | |
| entities/race/actions.ts | getPayoutResults | user | 払戻結果はログインユーザー共通の公開情報 |

## 経済

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| features/economy/claim/actions.ts | claimEvent | user | wallet は session から生成。advisory lock で二重参加防止 |
| features/economy/loan/actions.ts | borrowLoan | user | wallet は session から解決 |
| features/economy/wallet/queries.ts | getEventWallets | user | 自分の wallet のみ |
| 同上 | getWalletTransactions | user | walletId の所有権を userId 一致で検証 |
| features/stats/actions.ts | getGlobalStats | user | 自分の wallet 起点で集計 |

## ランキング・予想

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| features/ranking/actions.ts | getEventRanking | user | HIDDEN / ANONYMOUS のマスキングは毎リクエスト session 基準 |
| 同上 | getAdminEventRanking | admin | |
| 同上 | updateRankingDisplayMode | admin | |
| features/forecasts/actions.ts | upsertForecast | tipster | 更新対象は自分の forecast 行のみ |
| 同上 | getForecastsByRaceId | user | 予想はログインユーザー共通の公開情報 |
| 同上 | getMyForecast | user | 未ログインは null。自分の行のみ |

## 管理: レース

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| manage-races/actions/create.ts | createRace | admin | zod 検証あり |
| manage-races/actions/update.ts | updateRace / closeRace / reopenRace / setClosingTime | admin | |
| manage-races/actions/finalize.ts | finalizeRace | admin | |
| manage-races/actions/payout.ts | finalizePayout | admin | |
| manage-races/actions/revert.ts | resetRaceResults | admin | |
| manage-races/actions/update-odds.ts | updateGuaranteedOdds | admin | |
| manage-races/actions/read.ts | getRaces | tipster | 予想管理ページで TIPSTER も使うため |
| 同上 | getEvents | admin | |

## 管理: エントリー・マスタ

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| manage-entries/actions.ts | getRacesForSelect / getHorsesForSelect / saveEntries | admin | |
| 同上 | getRaceById | user | ユーザー向けレースページ・standby でも使用。未ログインは throw せず null。generateMetadata から呼ばれるため throw 不可 |
| 同上 | getEntriesForRace | user | ユーザー向けページでも使用 |
| 同上 | getAvailableHorses | admin | 2026-09-01 にガード追加 |
| manage-horses/actions.ts | createHorse / updateHorse / getHorses / deleteHorse / getHorse | admin | |
| manage-horse-tags/actions.ts | 全関数 | admin | |
| manage-venues/actions.ts | 全関数 | admin | |
| manage-race-definitions/actions.ts | 全関数 | admin | |
| manage-events/actions.ts | createEvent / updateEvent / updateEventStatus / getEvent | admin | |
| manage-settings/actions.ts | updateSystemDefaultOdds | admin | |

## 管理: ユーザー・その他

| ファイル | 関数 | ガード | 備考 |
| --- | --- | --- | --- |
| manage-users/actions.ts | updateUserRole / toggleUserStatus / deleteUser | admin | |
| manage-users/queries.ts | getUsers | admin | パスワードハッシュ等はカラム除外済み |
| manage-bets/actions/read.ts | getEventsWithRaces / getBetsByRace / getRaceWithBets | admin | |
| guest-codes/actions/guest-actions.ts | 全関数 | admin | |
| import-race/actions.ts | fetchRacePreview / importRace / updateOddsFromNetkeiba / fetchNetkeibaRaceResult | admin | 外部URLは許可ホスト2種 + パス + race_id 形式で検証 |

## 横断的な所見

- レート制限が存在するのはログイン系のみ。placeBets 等の書き込み系はロックと上限値で保護されるが、リクエスト回数の制限はない。クローズドコミュニティ運用のため現状は許容
- 締切タイマーはクライアント側の管理UIが closeRace を呼ぶ方式だが、placeBets が closingAt をサーバー側で検証するため、締切操作が漏れてもベットは通らない
