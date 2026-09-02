type LogoMarkProps = {
  size?: number;
  className?: string;
};

// 絵馬に馬蹄を描いたブランドマーク。色は @theme の primary / gold トークンに追従する。
// 隣にサービス名テキストを置く前提の装飾扱いで、aria-hidden を固定している。
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M23 4 Q27 6 29 10.5" fill="none" stroke="var(--color-gold)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 19 Q32 10 40 4" fill="none" stroke="var(--color-gold)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M4 24 L32 14 L60 24 V52 a4 4 0 0 1 -4 4 H8 a4 4 0 0 1 -4 -4 Z" fill="var(--color-primary)" />
      <circle cx="31.5" cy="19.5" r="2.5" fill="var(--color-gold)" />
      <path
        d="M24 30 V38 a8 8 0 0 0 16 0 V30"
        stroke="var(--color-gold)"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
