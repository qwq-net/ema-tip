'use client';

import { isValidUserName, MAX_NAME_LENGTH, RoleColor, RoleLabel } from '@/entities/user';
import { updateUserName } from '@/features/user/actions/user-actions';
import { Button, Input } from '@/shared/ui';
import { lookup } from '@/shared/utils/lookup';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import type { Session } from 'next-auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface EditableUserProfileProps {
  user: Session['user'];
}

export function EditableUserProfile({ user }: EditableUserProfileProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isPending, setIsPending] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    if (!isValidUserName(name)) {
      toast.error(`${MAX_NAME_LENGTH}文字以内の英数字、ひらがな、カタカナ、漢字のみ使用可能です。`);
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.append('name', name);

    const result = await updateUserName(formData);
    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('ユーザー名を変更しました');
      setIsEditing(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    setName(user.name || '');
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3">
      {user.image ? (
        <Image
          src={user.image}
          alt={user.name || 'User Avatar'}
          width={48}
          height={48}
          className="rounded-full border border-gray-100 shadow-sm"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-100">
          <span className="text-lg font-semibold text-gray-400">?</span>
        </div>
      )}
      <div className="flex flex-col">
        <span
          className={`mb-0.5 w-fit rounded border px-1.5 py-0.5 text-sm font-medium ${lookup(RoleColor, user.role ?? '') ?? ''}`}
        >
          {lookup(RoleLabel, user.role ?? '') ?? user.role}
        </span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-40 text-sm font-semibold"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={handleCancel}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="group flex items-center gap-2">
            <span className="text-lg leading-tight font-semibold text-gray-900">{user.name || 'Unknown Racer'}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label="名前を変更"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
