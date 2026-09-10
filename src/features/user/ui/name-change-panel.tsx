import { NameChangeForm } from '@/features/user/ui/name-change-form';
import { PageHeader } from '@/shared/ui/layout/page-header';

/**
 * 初回ログイン時のユーザー名設定画面の本体。歓迎の見出しと入力フォームを 1 枚のカードに収める。
 * オンボーディング済みの振り分けはページ側が済ませている前提で、この部品は表示だけを持つ。
 */
export function NameChangePanel({ initialName }: { initialName: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="rounded-surface w-full max-w-md space-y-8 border border-gray-200 bg-white p-8">
        <div className="flex flex-col items-center text-center">
          <PageHeader
            title="えまちっぷへようこそ"
            description={
              <>
                はじめに、ユーザー名を設定してください。
                <br />
                この名前は後から変更可能です。
              </>
            }
          />
        </div>
        <div className="flex flex-col items-center">
          <NameChangeForm initialName={initialName} />
        </div>
      </div>
    </div>
  );
}
