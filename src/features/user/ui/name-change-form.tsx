'use client';

import { isValidUserName, MAX_NAME_LENGTH } from '@/entities/user';
import { updateUserOnboarding } from '@/features/user/actions/user-actions';
import { toast } from '@/shared/lib/toast';
import { Button, Input } from '@/shared/ui';
import { preventEnterSubmit } from '@/shared/utils/form';
import { Loader2 } from 'lucide-react';
import { useActionState, useState } from 'react';

export function NameChangeForm({ initialName }: { initialName: string }) {
  // React 19 は action の完了後にフォームを初期値へ戻すため、入力値を state で持つ。
  // エラーで戻ってきたときも打った値が残る
  const [name, setName] = useState(initialName);
  const [state, action, isPending] = useActionState(async (_: { error?: string } | null, formData: FormData) => {
    const result = await updateUserOnboarding(formData);
    if (result.error) {
      toast.error(result.error);
      return { error: result.error };
    }
    toast.success('ユーザー名を設定しました');
    return null;
  }, null);

  const validateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value && !isValidUserName(value)) {
      e.target.setCustomValidity(`${MAX_NAME_LENGTH}文字以内の英数字、ひらがな、カタカナ、漢字のみ使用可能です。`);
    } else {
      e.target.setCustomValidity('');
    }
  };

  return (
    <form action={action} onKeyDown={preventEnterSubmit} className="w-full max-w-sm space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm leading-none font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          ユーザー名
        </label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={validateInput}
          placeholder="ユーザー名を入力"
          required
          pattern="^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$"
          title="英数字、ひらがな、カタカナ、漢字のみ使用可能です。"
        />
        <p className="text-text-sub text-sm">
          英数字、ひらがな、カタカナ、漢字が使用可能です。特殊記号は使用できません。
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : null}
        登録
      </Button>
      {state?.error && <p className="text-error text-sm">{state.error}</p>}
    </form>
  );
}
