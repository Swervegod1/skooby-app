'use client';

import Link from 'next/link';
import {useMemo, useState} from 'react';
import {getSymbolicCalendar} from '@/lib/gematria';
import type {Cipher} from '@/lib/gematria';

const CIPHERS: {value: Cipher; label: string}[] = [
  {value: 'english-ordinal', label: 'English Ordinal (A=1, Z=26)'},
  {value: 'english-reduction', label: 'English Reduction (1–9 letters)'},
  {value: 'english-reverse', label: 'English Reverse Ordinal'},
  {value: 'hebrew-standard', label: 'Hebrew Standard (Mispar Hechrachi)'},
  {value: 'hebrew-gadol', label: 'Hebrew Gadol (final letters elevated)'},
];
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'UTC'];
const fieldClass = 'mt-2 w-full rounded-xl border border-white/15 bg-[#14251c] px-4 py-3 text-white outline-none focus:border-lime-300';

export default function GematriaOraclePage() {
  const [name, setName] = useState('');
  const [hebrewName, setHebrewName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [focusPhrase, setFocusPhrase] = useState('');
  const [cipher, setCipher] = useState<Cipher>('english-ordinal');
  const [timezone, setTimezone] = useState('America/New_York');
  const [submitted, setSubmitted] = useState(false);
  const hebrew = cipher.startsWith('hebrew-');

  const outcome = useMemo(() => {
    if (!submitted) return null;
    try {
      return {data: getSymbolicCalendar({name, hebrewName, birthDate, focusPhrase, cipher, timezone}), error: null};
    } catch (error) {
      return {data: null, error: error instanceof Error ? error.message : 'Unable to calculate.'};
    }
  }, [submitted, name, hebrewName, birthDate, focusPhrase, cipher, timezone]);

  return (
    <main className="min-h-screen bg-[#07110d] px-5 pb-20 text-white">
      <div className="mx-auto max-w-5xl pt-8">
        <nav className="flex items-center justify-between gap-4">
          <Link className="text-xl font-black" href="/">SKOOBY<span className="text-lime-300">.APP</span></Link>
          <Link className="text-sm text-white/60 hover:text-white" href="/tracker">Market tracker ↗</Link>
        </nav>
        <header className="max-w-3xl pb-10 pt-16">
          <div className="mb-4 inline-flex rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-2 text-xs font-black tracking-widest text-lime-200">ALPHA ORACLE V1.2 · PERSONAL CALENDAR</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Gematria <span className="text-lime-300">timing explorer.</span></h1>
          <p className="mt-5 max-w-2xl text-white/65">Calculate historical letter-values and modern numerology cycles. See symbolic dates and time windows for reviewing trading research—not buy or sell signals.</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-lg font-bold">Personalize your calendar</h2>
            <p className="mt-1 text-sm text-white/50">Your details stay in this browser session. No account or server upload required.</p>
            <form className="mt-6 space-y-5" onSubmit={(event) => {event.preventDefault(); setSubmitted(true);}}>
              <label className="block text-sm font-semibold">Full name (preferably birth name)
                <input className={fieldClass} autoComplete="off" maxLength={120} value={name} onChange={(event) => {setName(event.target.value); setSubmitted(false);}} placeholder="Enter full name" required={!hebrew} />
              </label>
              <label className="block text-sm font-semibold">Birth date
                <input className={fieldClass} type="date" autoComplete="off" value={birthDate} onChange={(event) => {setBirthDate(event.target.value); setSubmitted(false);}} required />
              </label>
              <label className="block text-sm font-semibold">Gematria tradition
                <select className={fieldClass} value={cipher} onChange={(event) => {setCipher(event.target.value as Cipher); setSubmitted(false);}}>
                  {CIPHERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {hebrew && <label className="block text-sm font-semibold">Name spelled in Hebrew (required)
                <input className={fieldClass} lang="he" dir="rtl" autoComplete="off" value={hebrewName} onChange={(event) => {setHebrewName(event.target.value); setSubmitted(false);}} placeholder="השם בעברית" required />
                <span className="mt-2 block text-xs font-normal text-white/50">No automatic transliteration: spelling affects historical gematria totals.</span>
              </label>}
              <label className="block text-sm font-semibold">Focus phrase (optional)
                <input className={fieldClass} autoComplete="off" maxLength={100} value={focusPhrase} onChange={(event) => {setFocusPhrase(event.target.value); setSubmitted(false);}} placeholder={hebrew ? 'Use Hebrew letters' : 'e.g. patience'} />
              </label>
              <label className="block text-sm font-semibold">Time zone
                <select className={fieldClass} value={timezone} onChange={(event) => {setTimezone(event.target.value); setSubmitted(false);}}>
                  {TIMEZONES.map((zone) => <option value={zone} key={zone}>{zone.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <button type="submit" className="w-full rounded-full bg-lime-300 px-6 py-3.5 font-black text-[#07110d] transition hover:bg-lime-200">Calculate symbolic windows</button>
            </form>
          </section>
          <section aria-live="polite" className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
            <h2 className="text-lg font-bold">Your symbolic calendar</h2>
            {outcome?.error && <p role="alert" className="mt-5 rounded-xl border border-rose-300/30 bg-rose-500/10 p-4 text-rose-200">{outcome.error}</p>}
            {!outcome && <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-10 text-center text-white/45">Enter your details to calculate reproducible letter totals and personal-day windows.</div>}
            {outcome?.data && <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ['Name value', outcome.data.nameValue], ['Name root', outcome.data.nameRoot], ['Life path', outcome.data.lifePath],
                ].map(([label, value]) => <div key={label} className="rounded-2xl bg-black/25 p-4"><p className="text-xs text-white/50">{label}</p><p className="mt-2 text-3xl font-black text-lime-300">{value}</p></div>)}
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/50">Upcoming symbolic review windows · {timezone}</p>
              <div className="mt-3 space-y-3">
                {outcome.data.windows.map((window) => <article key={window.date} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{window.date} · {window.localTime}</p><p className="mt-1 text-xs text-white/50">Personal day {window.personalDay} · Clock root {window.timeRoot}</p></div><span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs font-bold text-lime-200">Symbolic match</span></div>
                  <p className="mt-2 text-sm text-white/60">{window.explanations.join(' · ')}</p>
                </article>)}
                {!outcome.data.windows.length && <p className="text-sm text-white/60">No matching dates under the current matching rules in the next 30 days.</p>}
              </div>
            </>}
            <div className="mt-7 rounded-xl border border-amber-200/20 bg-amber-200/[0.07] p-4 text-sm leading-6 text-amber-100/85">
              <strong>Important:</strong> Gematria and numerology are cultural or spiritual practices, not validated methods for forecasting prices. A suggested time is only a reminder to review independent market signals. Never enter, increase leverage, or override a stop because of this calendar.
            </div>
          </section>
        </div>
        <p className="mt-8 text-xs leading-6 text-white/45">Method: English letter ciphers or Hebrew standard/gadol; digital roots and calendar-year personal-day numerology. Next 30 days; at most one highest-matching 09:00–20:45 local observation time per day. No market data, orders, or guarantees.</p>
      </div>
    </main>
  );
}
