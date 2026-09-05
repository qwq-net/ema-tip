import type { db } from '@/shared/db';
import { adminActionLogs, type AdminActionDetail } from '@/shared/db/schema';

interface DbExecutor {
  insert: (typeof db)['insert'];
}

/** 監査ログに残す実行者。認可済みのセッションの user をそのまま渡す */
interface AdminActor {
  id: string;
  name?: string | null;
}

interface AdminActionLog {
  action: string;
  targetId: string;
  detail?: AdminActionDetail;
}

/**
 * 管理操作の監査ログを1件記録する。締切・確定・取消など金銭と状態遷移に関わる操作の追跡用。
 * executor に db.transaction の tx を渡すと本体操作と同一トランザクションで記録され、
 * 操作は成功したのにログだけ欠ける状態を防げる。トランザクションのない操作は db を渡す。
 * actor には認可済みセッションの user を渡す前提。冪等スキップ等で状態が変わらなかった場合は呼ばないこと。
 */
export async function logAdminAction(
  executor: DbExecutor,
  actor: AdminActor,
  { action, targetId, detail }: AdminActionLog
) {
  await executor.insert(adminActionLogs).values({
    actorId: actor.id,
    actorName: actor.name ?? null,
    action,
    targetId,
    detail,
  });
}
