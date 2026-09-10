import type { ReactNode } from 'react';

/**
 * 利用規約やガイドのような文章ページの本文の器。段落と箇条書きと節の間隔をここで一括して決め、
 * 中身は素の p と ul と section で書く。見出しは SectionTitle を使い、個別の mb は付けない。
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8 text-gray-700 [&_p]:leading-relaxed [&_section]:space-y-4 [&_ul]:list-inside [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4">
      {children}
    </div>
  );
}
