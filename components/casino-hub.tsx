'use client';

import { useState } from 'react';

const games = [
  { name: 'Slots', icon: '🎰', status: 'UI ready', detail: 'Game-card shell and launch surface.' },
  { name: 'Blackjack', icon: '🃏', status: 'Preview', detail: 'Table layout placeholder for future licensed integration.' },
  { name: 'Roulette', icon: '🎡', status: 'Preview', detail: 'Wheel and table presentation layer only.' },
  { name: 'Crash', icon: '📈', status: 'Preview', detail: 'Chart-style game presentation layer only.' },
  { name: 'Dice', icon: '🎲', status: 'Preview', detail: 'Dice-game presentation layer only.' },
  { name: 'Baccarat', icon: '♦️', status: 'Preview', detail: 'Card-table presentation layer only.' },
];

export function CasinoHub() {
  const [selected, setSelected] = useState(games[0]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
      <section className="rounded-[2rem] border border-fuchsia-300/15 bg-gradient-to-b from-fuchsia-400/[0.08] to-white/[0.03] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">Skooby Casino Hub</p>
            <h2 className="mt-2 text-3xl font-black">Game integration surface</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-white/60">NO WAGERING ENABLED</span>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <button
              key={game.name}
              onClick={() => setSelected(game)}
              className={`rounded-3xl border p-5 text-left transition ${selected.name === game.name ? 'border-fuchsia-300/35 bg-fuchsia-300/10' : 'border-white/10 bg-black/20 hover:bg-white/[0.05]'}`}
            >
              <div className="text-4xl">{game.icon}</div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-lg font-black">{game.name}</p>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/45">{game.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/45">{game.detail}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Selected module</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-5xl">{selected.icon}</span>
            <div>
              <h3 className="text-2xl font-black">{selected.name}</h3>
              <p className="mt-1 text-sm text-white/50">{selected.detail}</p>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-lime-300/15 bg-lime-300/[0.05] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">Integration status</p>
          <p className="mt-3 text-sm leading-6 text-white/60">The Skooby casino area is isolated from wallet-intelligence features. The current build exposes navigation, game catalog structure, and integration boundaries without deposits, payouts, or wagering actions.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Architecture</p>
          <ul className="mt-4 space-y-3 text-sm text-white/55">
            <li>• Privy remains the primary Skooby authentication layer.</li>
            <li>• Game providers live behind a dedicated adapter boundary.</li>
            <li>• Wallet analytics never shares signing secrets with game code.</li>
            <li>• Production gaming requires licensing, jurisdiction, age/KYC, and provider review.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
