import { sql } from 'drizzle-orm';
import { db } from './index';

/**
 * 会計の不変条件を突合し、破れがあれば該当行を表示して終了コード1で落ちる。
 * 払戻・ベット・ローンのロジックが残高と台帳の一致を壊していないかの事後検証で、
 * 監査時の手動実行と、障害疑い時のヘルスチェックを想定している。読み取りのみで破壊的操作はない。
 */
async function main() {
  let failed = false;

  const report = (label: string, rows: unknown[]) => {
    if (rows.length === 0) {
      console.log(`OK: ${label}`);
      return;
    }
    failed = true;
    console.error(`NG: ${label} (${rows.length}件)`);
    for (const row of rows.slice(0, 20)) {
      console.error('  ', JSON.stringify(row));
    }
    if (rows.length > 20) console.error(`   ...他 ${rows.length - 20} 件`);
  };

  // 不変条件1: ウォレット残高 = 取引台帳の総和。LOAN を含む全取引種別が残高へ反映される前提
  const walletMismatch = await db.execute(sql`
    SELECT w.id AS wallet_id, w.balance, COALESCE(SUM(t.amount), 0) AS tx_sum
    FROM wallet w
    LEFT JOIN transaction t ON t.wallet_id = w.id
    GROUP BY w.id, w.balance
    HAVING w.balance <> COALESCE(SUM(t.amount), 0)
  `);
  report('wallet.balance = Σ transactions.amount', walletMismatch);

  // 不変条件2: ベットグループの合計額 = 配下ベットの総和
  const groupMismatch = await db.execute(sql`
    SELECT bg.id AS bet_group_id, bg.total_amount, COALESCE(SUM(b.amount), 0) AS bets_sum
    FROM bet_group bg
    LEFT JOIN bet b ON b.bet_group_id = bg.id
    GROUP BY bg.id, bg.total_amount
    HAVING bg.total_amount <> COALESCE(SUM(b.amount), 0)
  `);
  report('bet_group.total_amount = Σ bets.amount', groupMismatch);

  // 不変条件3: ベットの状態と払戻額の整合。HIT は正の払戻、LOST は0、REFUNDED は購入額と同額
  const statusMismatch = await db.execute(sql`
    SELECT id AS bet_id, status, amount, payout
    FROM bet
    WHERE (status = 'HIT' AND (payout IS NULL OR payout <= 0))
       OR (status = 'LOST' AND COALESCE(payout, 0) <> 0)
       OR (status = 'REFUNDED' AND (payout IS NULL OR payout <> amount))
  `);
  report('bet.status と payout の整合', statusMismatch);

  // 不変条件4: 確定済みレースに PENDING のベットが残っていない
  const pendingOnFinalized = await db.execute(sql`
    SELECT b.id AS bet_id, b.race_id
    FROM bet b
    JOIN race_instance r ON r.id = b.race_id
    WHERE r.status = 'FINALIZED' AND b.status = 'PENDING'
  `);
  report('FINALIZED レースに PENDING ベットなし', pendingOnFinalized);

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Reconcile failed to run:', err);
  process.exit(1);
});
