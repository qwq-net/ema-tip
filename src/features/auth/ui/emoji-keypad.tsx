'use client';

type EmojiKeypadProps = {
  onEmojiClick: (emoji: string) => void;
  onBackspace: () => void;
  onClear: () => void;
};

const EMOJIS = ['🐶', '🐱', '🐮', '🐰', '🍔', '🍙', '🍖', '🍣', '🍎', '🍌', '🍇', '🍓'];

export function EmojiKeypad({ onEmojiClick, onBackspace, onClear }: EmojiKeypadProps) {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-4 grid grid-cols-4 gap-4">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onEmojiClick(emoji)}
            className="rounded-surface flex aspect-square items-center justify-center text-3xl transition-colors hover:bg-gray-100 active:scale-[.96]"
            aria-label={`${emoji} を入力`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onClear}
          className="rounded-control py-3 font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          クリア
        </button>
        <button
          type="button"
          onClick={onBackspace}
          className="rounded-control border border-gray-200 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          ⌫ 削除
        </button>
      </div>
    </div>
  );
}
