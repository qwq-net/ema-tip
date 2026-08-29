import { ROLE_LABELS, ROLES } from '@/entities/user/constants';
import { asc, eq } from 'drizzle-orm';
import { createInterface } from 'readline/promises';
import { db } from './index';
import { users } from './schema';

const AVAILABLE_ROLES = Object.values(ROLES);

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const allUsers = await db.query.users.findMany({
      orderBy: [asc(users.createdAt)],
    });

    if (allUsers.length === 0) {
      console.warn('ユーザーが見つかりません。先にログインしてください。');
      process.exit(1);
    }

    console.log('\n--- ロールを変更するユーザーを選択 ---');
    allUsers.forEach((u, i) => {
      const label = ROLE_LABELS[u.role] || u.role;
      console.log(`${i + 1}. ${u.name || '名前なし'} (${u.email || 'メールなし'}) [${label}]`);
    });

    const userAnswer = await rl.question('\n番号を入力 (デフォルト: 1): ');
    const userIndex = userAnswer.trim() === '' ? 0 : parseInt(userAnswer, 10) - 1;

    if (isNaN(userIndex) || userIndex < 0 || userIndex >= allUsers.length) {
      console.error('無効な選択です。');
      process.exit(1);
    }

    const targetUser = allUsers[userIndex];

    console.log(`\n--- ${targetUser.name || targetUser.id} のロールを選択 ---`);
    AVAILABLE_ROLES.forEach((role, i) => {
      const current = role === targetUser.role ? ' ← 現在' : '';
      console.log(`${i + 1}. ${ROLE_LABELS[role]} (${role})${current}`);
    });

    const roleAnswer = await rl.question('\n番号を入力: ');
    const roleIndex = parseInt(roleAnswer, 10) - 1;

    if (isNaN(roleIndex) || roleIndex < 0 || roleIndex >= AVAILABLE_ROLES.length) {
      console.error('無効な選択です。');
      process.exit(1);
    }

    const newRole = AVAILABLE_ROLES[roleIndex];

    if (newRole === targetUser.role) {
      console.log(`\nロールは既に ${ROLE_LABELS[newRole]} です。変更はありません。`);
      process.exit(0);
    }

    await db.update(users).set({ role: newRole }).where(eq(users.id, targetUser.id));

    const oldLabel = ROLE_LABELS[targetUser.role] || targetUser.role;
    const newLabel = ROLE_LABELS[newRole];
    console.log(`\n✅ ${targetUser.name || targetUser.id} のロールを ${oldLabel} → ${newLabel} に変更しました。`);
  } catch (err) {
    console.error('ロール変更に失敗しました:', err);
    process.exit(1);
  } finally {
    rl.close();
  }

  process.exit(0);
}

main();
