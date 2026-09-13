import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'RTX 5090 Giveaway Terms | Skooby',
  description: 'Terms and entry information for the independently operated Skooby.app RTX 5090 giveaway.',
};

export default function GiveawayRulesPage() {
  return (
    <main className="min-h-screen bg-[#07110d] text-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black">SKOOBY<span className="text-lime-300">.APP</span></Link>
        <Link href="/#gpu-giveaway" className="text-sm font-black text-lime-200">Back to giveaway</Link>
      </nav>

      <article className="mx-auto max-w-4xl px-6 pb-24 pt-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">Promotion terms</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Skooby.app RTX 5090 Giveaway</h1>
        <p className="mt-5 leading-7 text-white/55">This promotion is independently operated by Skooby.app and is not sponsored, administered, or endorsed by NVIDIA. NVIDIA and GeForce are trademarks of their respective owner.</p>

        <div className="mt-10 space-y-7 text-sm leading-7 text-white/65">
          <section><h2 className="text-lg font-black text-white">No purchase necessary</h2><p className="mt-2">Entry is free. A purchase, payment, wallet transaction, subscription, or other consideration is not required to enter or improve the chance of selection.</p></section>
          <section><h2 className="text-lg font-black text-white">Eligibility</h2><p className="mt-2">Entrants must have reached the age of majority where they live and must be legally permitted to participate in a promotional giveaway. The promotion is void where prohibited or restricted by law.</p></section>
          <section><h2 className="text-lg font-black text-white">How to enter</h2><p className="mt-2">Submit your name, valid email address, and a short explanation of why the GPU would matter to you using the homepage form. One registration is accepted per email address. Automated, fraudulent, or incomplete entries may be removed.</p></section>
          <section><h2 className="text-lg font-black text-white">Prize</h2><p className="mt-2">The intended prize is one NVIDIA GeForce RTX 5090 graphics card. If that specific model becomes unavailable, Skooby.app may substitute a graphics card of comparable or greater retail value. No cash alternative is promised unless required by applicable law.</p></section>
          <section><h2 className="text-lg font-black text-white">Selection and notification</h2><p className="mt-2">An eligible entry will be selected from the valid entry pool after the promotion closes. The selected entrant will be contacted using the submitted email address and may be required to confirm eligibility and delivery information before a prize is issued. Failure to respond may result in selection of another eligible entrant.</p></section>
          <section><h2 className="text-lg font-black text-white">Entry data</h2><p className="mt-2">Name, email, reason, and submission time are collected for giveaway administration, duplicate-entry prevention, winner contact, and promotion-related updates. Do not submit passwords, wallet seed phrases, private keys, financial information, or other sensitive credentials.</p></section>
          <section><h2 className="text-lg font-black text-white">Fair use and changes</h2><p className="mt-2">Skooby.app may pause, extend, cancel, or modify the promotion if technical failures, abuse, legal restrictions, prize availability, or other circumstances make normal administration impractical. Any material change should be displayed on this page before winner selection.</p></section>
        </div>
      </article>
    </main>
  );
}
