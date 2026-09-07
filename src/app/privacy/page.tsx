import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-text-main mb-8 text-3xl font-semibold">プライバシーポリシー</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">運営について</h2>
          <p className="leading-relaxed">
            本サイトは個人が運営するサービスです。
            ログイン情報やユーザー情報の取り扱いには細心の注意を払っておりますが、
            予期せぬ攻撃やトラブルに対して、完全に安全であることを保証するものではありません。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">情報の入力について</h2>
          <p className="leading-relaxed">
            本サイトでは、氏名、住所、電話番号、クレジットカード情報などの
            個人を特定できる重要な情報は、絶対に入力しないようにお願いいたします。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">Cookie（クッキー）について</h2>
          <p className="leading-relaxed">
            当サイトでは、ログイン状態の維持など、サービスの基本機能を提供するためにCookie（クッキー）を使用しています。
            アクセス解析や広告配信を目的とした、個人の行動を追跡するためのCookieは使用しておりません。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">プライバシーポリシーの変更</h2>
          <p className="leading-relaxed">
            運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本ポリシーを変更することができるものとします。
          </p>
        </section>
      </div>
    </div>
  );
}
