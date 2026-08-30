'use server';

import { isValidUserName, MAX_NAME_LENGTH } from '@/entities/user';
import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { formString } from '@/shared/utils/form';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateUserOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }

  const name = formString(formData, 'name');

  if (!isValidUserName(name)) {
    return { error: `無効な名前です。${MAX_NAME_LENGTH}文字以内の英数字、ひらがな、カタカナ、漢字のみ使用可能です。` };
  }

  // 既存ユーザーと同名にすると、名前でログインするゲストがどちらの行に解決されるか不定になる
  const existingUser = await db.query.users.findFirst({
    where: eq(users.name, name),
  });
  if (existingUser && existingUser.id !== session.user.id) {
    return { error: 'この名前は既に使用されています。' };
  }

  try {
    await db
      .update(users)
      .set({
        name: name,
        isOnboardingCompleted: true,
      })
      .where(eq(users.id, session.user.id));
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'ユーザーの更新に失敗しました。もう一度お試しください。' };
  }

  revalidatePath('/mypage');
  redirect('/mypage');
}

export async function updateUserName(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }

  const name = formString(formData, 'name');

  if (!isValidUserName(name)) {
    return { error: `無効な名前です。${MAX_NAME_LENGTH}文字以内の英数字、ひらがな、カタカナ、漢字のみ使用可能です。` };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.name, name),
  });

  if (existingUser && existingUser.id !== session.user.id) {
    return { error: 'この名前は既に使用されています。' };
  }

  try {
    await db
      .update(users)
      .set({
        name: name,
      })
      .where(eq(users.id, session.user.id));
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'ユーザーの更新に失敗しました。もう一度お試しください。' };
  }

  revalidatePath('/mypage');
  return { success: true };
}
