import { cn } from '@/shared/utils/cn';

/**
 * レースの馬場と距離と頭数を点で区切って並べる 1 行。
 * entrantCount は出走中の頭数を渡す前提。取消・除外馬は呼び手側で除外する。
 * className は前後の余白調整だけに使い、文字色やサイズは上書きしない前提。
 */
export function RaceMetaRow({
  surface,
  distance,
  entrantCount,
  className,
}: {
  surface: string;
  distance: number;
  entrantCount: number;
  className?: string;
}) {
  return (
    <div className={cn('text-text-sub flex items-center gap-3 text-sm', className)}>
      <span>{surface}</span>
      <span className="h-1 w-1 rounded-full bg-gray-300" />
      <span>{distance}m</span>
      <span className="h-1 w-1 rounded-full bg-gray-300" />
      <span>{entrantCount}頭</span>
    </div>
  );
}
