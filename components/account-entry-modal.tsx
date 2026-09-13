'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

type Intent = 'free' | 'pro' | null;

export function AccountEntryModal() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<Intent>(null);

  useEffect(() => {
    if (!authenticated || !intent) return;
    router.push(intent === 'pro' ? '/account?intent=pro' : '/account');
    setOpen(false);
    setIntent(null);
  }, [authenticated, intent, router]);

  function choose(nextIntent: Exclude<Intent, null>) {
    setIntent(nextIntent);
    if (authenticated) {
      router.push(nextIntent === 'pro' ? '/account?intent=pro' : '/account');
      setOpen(false);
      setIntent(null);
      return;
    }
    login();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-lime-300 px-5 py-3 text-sm font-black text-black shadow-[0_0_30px_rgba(190,242,100,0.18)] transition hover:scale-[1.03] hover:bg-lime-200"
      >
        {authenticated ? 'Open account' : 'Start free'}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4 py-8 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Choose your Skooby account">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close account dialog" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-lime-300/20 bg-[#08130f] shadow-2xl">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(190,242,100,0.12),transparent_35%)] px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-lime-300">Join Skooby</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">One account. Your whole research trail.</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Sign in with email or a supported wallet. Your casebooks, alerts, wallet investigations, and usage can follow you across devices.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xl text-white/60 hover:bg-white/10">×</button>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              <button
                type="button"
                onClick={() => choose('free')}
                disabled={!ready}
                className="group rounded-[1.6rem] border border-lime-300/25 bg-lime-300/[0.06] p-6 text-left transition hover:-translate-y-1 hover:bg-lime-300/[0.10] disabled:opacity-50"
              >
                <span className="rounded-full bg-lime-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-black">Best place to start</span>
                <h3 className="mt-5 text-3xl font-black">Skooby Free</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">Track wallets, learn interactively, save investigations, and start building your personal command center.</p>
                <div className="mt-6 rounded-full bg-lime-300 px-5 py-3 text-center text-sm font-black text-black group-hover:bg-lime-200">
                  {!ready ? 'Preparing…' : authenticated ? 'Open free account' : 'Create free account'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => choose('pro')}
                disabled={!ready}
                className="group rounded-[1.6rem] border border-fuchsia-300/20 bg-fuchsia-300/[0.05] p-6 text-left transition hover:-translate-y-1 hover:bg-fuchsia-300/[0.09] disabled:opacity-50"
              >
                <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-200/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100">Power users</span>
                <h3 className="mt-5 text-3xl font-black">Skooby Pro</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">Designed for deeper graph history, higher usage limits, richer monitoring, exports, and premium research features.</p>
                <div className="mt-6 rounded-full border border-fuchsia-200/25 bg-fuchsia-200/10 px-5 py-3 text-center text-sm font-black text-fuchsia-50 group-hover:bg-fuchsia-200/15">
                  {authenticated ? 'View Pro upgrade' : 'Sign in & view Pro'}
                </div>
              </button>
            </div>

            <div className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/35">
              No seed phrase required. <Link href="/account" className="font-bold text-white/55 hover:text-white">Already have an account?</Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
