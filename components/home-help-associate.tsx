'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

const QUICK = [
  { label: 'Track a wallet', href: '/tracker' },
  { label: 'Learn crypto', href: '/learn' },
  { label: 'Connect wallet', href: '/wallet' },
  { label: 'My account', href: '/account' },
];

function answerFor(input: string) {
  const text = input.toLowerCase();
  if (text.includes('track') || text.includes('address') || text.includes('wallet')) {
    return { text: 'Use Crypto Tracker to inspect a public Bitcoin or Ethereum address, map connected wallets, and save the investigation to your casebook.', href: '/tracker', cta: 'Open Tracker' };
  }
  if (text.includes('learn') || text.includes('gas') || text.includes('bitcoin') || text.includes('ethereum')) {
    return { text: 'Skooby Learn has interactive Bitcoin and Ethereum lessons, including gas-fee tools and visual transaction flows.', href: '/learn', cta: 'Open Learn' };
  }
  if (text.includes('login') || text.includes('account') || text.includes('alert') || text.includes('casebook')) {
    return { text: 'Your Account Command Center holds synced investigations, wallet alerts, and usage information once you sign in.', href: '/account', cta: 'Open Account' };
  }
  if (text.includes('connect') || text.includes('base') || text.includes('balance')) {
    return { text: 'Wallet Intelligence connects through Privy so you can inspect wallet identity and Base balance data without sharing a seed phrase.', href: '/wallet', cta: 'Open Wallet Intelligence' };
  }
  if (text.includes('giveaway') || text.includes('gpu') || text.includes('5090') || text.includes('raffle')) {
    return { text: 'The RTX 5090 giveaway entry form is at the bottom of this page. Entry is free and limited to one registration per email.', href: '#gpu-giveaway', cta: 'Jump to Giveaway' };
  }
  return { text: 'I can point you to wallet tracking, interactive learning, account tools, wallet connection, or the GPU giveaway. Try asking what you want to do.', href: '/tracker', cta: 'Explore Tracker' };
}

export function HomeHelpAssociate() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const response = useMemo(() => answerFor(submitted), [submitted]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setSubmitted(value);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
      {open ? (
        <div className="w-[360px] max-w-full overflow-hidden rounded-[1.75rem] border border-lime-300/20 bg-[#07110d]/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/10 bg-lime-300/[0.06] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">Skooby AI Help Associate</p>
                <p className="mt-1 text-sm font-bold text-white">What are you trying to do?</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close help associate" className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/10">×</button>
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {QUICK.map((item) => <Link key={item.href} href={item.href} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/65 hover:bg-white/10 hover:text-white">{item.label}</Link>)}
            </div>

            {submitted ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs leading-5 text-white/70">{response.text}</p>
                <Link href={response.href} className="mt-3 inline-flex text-xs font-black text-lime-200">{response.cta} →</Link>
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-white/40">Guided help for finding the right Skooby tool. Ask about tracking, learning, accounts, wallets, or the giveaway.</p>
            )}

            <form onSubmit={submit} className="mt-4 flex gap-2">
              <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={180} placeholder="Ask Skooby…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-lime-300/40" />
              <button className="rounded-xl bg-lime-300 px-4 py-2.5 text-xs font-black text-black hover:bg-lime-200">Ask</button>
            </form>
          </div>
        </div>
      ) : null}

      <button onClick={() => setOpen((value) => !value)} className="flex items-center gap-3 rounded-full border border-lime-300/20 bg-[#0a1712] px-4 py-3 text-sm font-black text-white shadow-2xl hover:bg-[#102219]">
        <span className="grid size-8 place-items-center rounded-full bg-lime-300 text-black">AI</span>
        Help Associate
      </button>
    </div>
  );
}
