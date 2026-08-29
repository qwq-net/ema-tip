'use server';

import { auth } from '@/shared/config/auth';
import { db } from '@/shared/db';
import { users } from '@/shared/db/schema';
import { formString } from '@/shared/utils/form';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const VALID_NAME_REGEX = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;

export async function updateUserOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('認証されていません');
  }

  const name = formString(formData, 'name');

  if (!name || !VALID_NAME_REGEX.test(name)) {
    return { error: '無効な名前です。英数字、ひらがな、カタカナ、漢字のみ使用可能です。' };
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

  if (!name || !VALID_NAME_REGEX.test(name)) {
    return { error: '無効な名前です。英数字、ひらがな、カタカナ、漢字のみ使用可能です。' };
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
