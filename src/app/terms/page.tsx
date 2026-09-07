import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '利用規約',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-text-main mb-8 text-3xl font-semibold">利用規約</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">本サービスについて</h2>
          <p className="leading-relaxed">
            本サイトは個人によって運営されており、いつサービスが終了するかは未定です。
            予告なくサービスを停止・終了する場合がありますので、あらかじめご了承ください。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">利用の推奨と保証</h2>
          <p className="leading-relaxed">
            関係者以外の利用は推奨しておらず、本サイトの利用に関して一切の保証をいたしません。
            本サイトを利用して発生した、いかなるトラブルや損害についても、運営者は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">金銭のやり取りについて</h2>
          <p className="leading-relaxed">
            当サイト上での金銭のやり取りは一切発生しません。
            また、ユーザー間を含め、本サイトを利用して金銭のやり取りを行うことは固く禁止いたします。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">禁止事項</h2>
          <p className="mb-2 leading-relaxed">ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul className="list-inside list-disc space-y-1 pl-4">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>本サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
            <li>本サービスの運営を妨害するおそれのある行為</li>
            <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
            <li>他のユーザーに成りすます行為</li>
            <li>当サイトのバグや不具合を意図的に利用する行為</li>
            <li>スパム行為や、他者への迷惑行為</li>
            <li>その他、運営者が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">アカウントの停止・削除</h2>
          <p className="leading-relaxed">
            運営者は、ユーザーが利用規約に違反した場合、または運営者が不適切と判断した場合、
            事前の通知なく、該当ユーザーによる本サービスの利用を停止、またはアカウントを削除することができるものとします。
            また、これによりユーザーに生じた損害について、一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">免責事項（情報の扱い）</h2>
          <p className="leading-relaxed">
            当サイトは正確な情報を提供する情報サイトではありません。 また、実在する団体や競技とは一切関係ありません。
            記載されている情報は全て演出またはフィクションです。
            万が一現実と一致することがあっても偶然であり、当サイトは一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">利用規約の変更</h2>
          <p className="leading-relaxed">
            運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-text-main mb-4 text-xl font-semibold">お問い合わせ</h2>
          <p className="leading-relaxed">本サービスに関するお問い合わせやトラブルのご連絡は、受け付けておりません。</p>
        </section>
      </div>
    </div>
  );
}
