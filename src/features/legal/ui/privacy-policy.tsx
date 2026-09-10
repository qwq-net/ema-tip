import { Prose, SectionTitle } from '@/shared/ui';

/** プライバシーポリシーの本文。節ごとに section で区切り、見出しは SectionTitle で揃える。 */
export function PrivacyPolicy() {
  return (
    <Prose>
      <section>
        <SectionTitle>運営について</SectionTitle>
        <p>
          本サイトは個人が運営するサービスです。 ログイン情報やユーザー情報の取り扱いには細心の注意を払っておりますが、
          予期せぬ攻撃やトラブルに対して、完全に安全であることを保証するものではありません。
        </p>
      </section>

      <section>
        <SectionTitle>情報の入力について</SectionTitle>
        <p>
          本サイトでは、氏名、住所、電話番号、クレジットカード情報などの
          個人を特定できる重要な情報は、絶対に入力しないようにお願いいたします。
        </p>
      </section>

      <section>
        <SectionTitle>Cookie について</SectionTitle>
        <p>
          当サイトでは、ログイン状態の維持など、サービスの基本機能を提供するために Cookie を使用しています。
          アクセス解析や広告配信を目的とした、個人の行動を追跡するための Cookie は使用しておりません。
        </p>
      </section>

      <section>
        <SectionTitle>プライバシーポリシーの変更</SectionTitle>
        <p>
          運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本ポリシーを変更することができるものとします。
        </p>
      </section>
    </Prose>
  );
}
