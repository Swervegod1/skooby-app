'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export function GpuGiveaway() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/giveaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          reason: data.get('reason'),
          website: data.get('website'),
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; duplicate?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to submit entry.');

      if (payload.duplicate) {
        setStatus('duplicate');
        setMessage('That email is already registered for this giveaway.');
      } else {
        setStatus('success');
        setMessage('You’re on the list. Keep an eye on your inbox for giveaway updates.');
        form.reset();
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to submit entry.');
    }
  }

  return (
    <section id="gpu-giveaway" className="relative mx-auto max-w-6xl px-6 pb-10 pt-6">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-cyan-200/20 bg-[#071e22] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(190,242,100,0.16),transparent_26%),radial-gradient(circle_at_90%_80%,rgba(34,211,238,0.14),transparent_32%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-10">
          <div className="relative min-h-[260px]">
            <div className="absolute inset-x-2 bottom-7 top-7 rounded-[2rem_3.8rem_1.4rem_2rem] border-4 border-[#0b5b63] bg-[#1da5aa] shadow-[inset_0_-28px_0_#0f737a]">
              <div className="absolute left-8 top-7 h-20 w-[42%] rounded-2xl border-4 border-[#0b5b63] bg-[#102d36]" />
              <div className="absolute right-8 top-7 h-20 w-[26%] skew-x-[-10deg] rounded-2xl border-4 border-[#0b5b63] bg-[#102d36]" />
              <div className="absolute inset-x-7 bottom-12 rounded-2xl bg-[#b7f34d] px-4 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-[#11331c] shadow-lg">
                Skooby Mystery Ride · RTX 5090 Giveaway
              </div>
              <div className="absolute left-4 top-[43%] size-14 rounded-full bg-[#b7f34d]/90 blur-[1px]" />
              <div className="absolute right-5 top-[47%] h-8 w-16 rounded-full bg-[#b7f34d]/80" />
            </div>
            <div className="absolute bottom-1 left-[18%] size-16 rounded-full border-[10px] border-[#111827] bg-[#d7eef0] shadow-lg" />
            <div className="absolute bottom-1 right-[18%] size-16 rounded-full border-[10px] border-[#111827] bg-[#d7eef0] shadow-lg" />
          </div>

          <div>
            <div className="inline-flex rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">Free entry · no purchase necessary</div>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Win a GeForce RTX 5090.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/60">Enter your name, email, and tell us why this upgrade would matter to you. One registration per email.</p>

            <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input name="name" required minLength={2} maxLength={80} placeholder="Your name" autoComplete="name" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-lime-300/50" />
              <input name="email" required type="email" maxLength={160} placeholder="Email address" autoComplete="email" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-lime-300/50" />
              <textarea name="reason" required minLength={20} maxLength={800} rows={4} placeholder="Why is it important that you win?" className="sm:col-span-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-lime-300/50" />
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-[11px] leading-5 text-white/35">By entering, you agree to the <Link href="/giveaway-rules" className="font-bold text-white/60 underline underline-offset-2">giveaway terms</Link>. Independently operated by Skooby.app. NVIDIA is not a sponsor or administrator of this promotion.</p>
                <button disabled={status === 'submitting'} className="shrink-0 rounded-full bg-lime-300 px-6 py-3 text-sm font-black text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60">
                  {status === 'submitting' ? 'Submitting…' : 'Enter giveaway'}
                </button>
              </div>
            </form>

            {message ? <p className={`mt-4 text-sm font-semibold ${status === 'error' ? 'text-rose-300' : 'text-lime-200'}`}>{message}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
