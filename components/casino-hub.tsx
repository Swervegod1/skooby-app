'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConnectWallet } from '@/components/connect-wallet';

const games = [
  { id: 'slots', name: 'Slots', icon: '🎰', action: 'spin', cta: 'Spin reels', detail: 'Three-reel instant game with provider-backed results.' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', action: 'start', cta: 'Deal hand', detail: 'Start a hand, then hit or stand through the casino API.' },
  { id: 'roulette', name: 'Roulette', icon: '🎡', action: 'spin', cta: 'Spin wheel', detail: 'Choose red, black, odd, even, or a straight number.' },
  { id: 'crash', name: 'Crash', icon: '📈', action: 'bet', cta: 'Launch round', detail: 'Choose a target multiplier and see if the round reaches it.' },
  { id: 'dice', name: 'Dice', icon: '🎲', action: 'roll', cta: 'Roll dice', detail: 'Fast dice round using the source-compatible roll endpoint.' },
  { id: 'baccarat', name: 'Baccarat', icon: '♦️', action: 'start', cta: 'Deal round', detail: 'Pick player, banker, or tie and deal the round.' },
  { id: 'poker', name: 'Poker', icon: '♠️', action: 'action', cta: 'Deal hand', detail: 'Five-card demo/provider hand surfaced through the poker adapter.' },
] as const;

type GameId = (typeof games)[number]['id'];
type CasinoMode = 'demo' | 'provider';

type CasinoEnvelope = {
  ok: boolean;
  mode: CasinoMode;
  game: string;
  action: string;
  data: unknown;
};

type StatusResponse = {
  provider?: 'external' | 'demo';
  configured?: boolean;
  demoFallback?: boolean;
};

function extractBalanceDelta(value: unknown) {
  if (!value || typeof value !== 'object') return 0;
  const delta = (value as Record<string, unknown>).balanceDelta;
  return typeof delta === 'number' && Number.isFinite(delta) ? delta : 0;
}

export function CasinoHub() {
  const [selectedId, setSelectedId] = useState<GameId>('slots');
  const [bet, setBet] = useState(10);
  const [credits, setCredits] = useState(1000);
  const [choice, setChoice] = useState('red');
  const [crashTarget, setCrashTarget] = useState(2);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CasinoMode>('demo');
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [result, setResult] = useState<CasinoEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => games.find((game) => game.id === selectedId) ?? games[0], [selectedId]);

  useEffect(() => {
    void fetch('/api/casino/status', { cache: 'no-store' })
      .then((response) => response.json() as Promise<StatusResponse>)
      .then((data) => {
        setProviderConfigured(Boolean(data.configured));
        setMode(data.provider === 'external' ? 'provider' : 'demo');
      })
      .catch(() => undefined);
  }, []);

  async function callGame(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${selected.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, ...extra }),
      });
      const data = (await response.json()) as CasinoEnvelope;
      if (!response.ok || !data.ok) {
        throw new Error(typeof data.data === 'object' && data.data && 'error' in data.data ? String((data.data as Record<string, unknown>).error) : 'Casino request failed.');
      }

      setResult(data);
      setMode(data.mode);
      if (data.mode === 'demo') {
        setCredits((current) => Math.max(0, Math.round((current + extractBalanceDelta(data.data)) * 100) / 100));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Casino request failed.');
    } finally {
      setLoading(false);
    }
  }

  function playPrimary() {
    if (selected.id === 'roulette') return callGame('spin', { choice });
    if (selected.id === 'crash') return callGame('bet', { target: crashTarget });
    if (selected.id === 'baccarat') return callGame('start', { choice });
    return callGame(selected.action);
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a1511]/95 shadow-2xl shadow-black/30">
      <div className="flex flex-col border-b border-white/10 bg-black/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-xl text-black">🐕</span>
          <div>
            <p className="text-sm font-black tracking-tight">SKOOBY CASINO</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Web3 game gateway</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0">
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${mode === 'provider' ? 'bg-lime-300' : 'bg-amber-300'}`} />
            {mode === 'provider' ? 'Provider connected' : 'Demo engine'}
          </div>
          <ConnectWallet />
        </div>
      </div>

      <div className="grid min-h-[690px] lg:grid-cols-[220px_1fr_300px]">
        <aside className="border-b border-white/10 bg-black/15 p-4 lg:border-b-0 lg:border-r">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Games</p>
          <div className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => {
                  setSelectedId(game.id);
                  setResult(null);
                  setError(null);
                }}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${selected.id === game.id ? 'bg-lime-300 text-black' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'}`}
              >
                <span className="text-xl">{game.icon}</span>
                <span className="text-sm font-black">{game.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">API mode</p>
            <p className="mt-2 text-sm font-black">{providerConfigured ? 'External provider' : 'Instant demo'}</p>
            <p className="mt-2 text-xs leading-5 text-white/40">
              {providerConfigured ? 'Requests are proxied server-side to your configured casino backend.' : 'Add the casino backend URL in server environment variables to switch from demo to provider mode.'}
            </p>
          </div>
        </aside>

        <section className="relative p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(163,230,53,0.08),transparent_35%)]" />
          <div className="relative mx-auto max-w-3xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Now playing</p>
                <h2 className="mt-2 text-4xl font-black tracking-[-0.04em]">{selected.icon} {selected.name}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">{selected.detail}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Demo credits</p>
                <p className="mt-1 text-2xl font-black text-lime-200">{credits.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-black/30 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Bet amount</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={bet}
                    onChange={(event) => setBet(Math.max(1, Number(event.target.value) || 1))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-bold outline-none transition focus:border-lime-300/40"
                  />
                </label>

                {selected.id === 'roulette' && (
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Pick</span>
                    <select value={choice} onChange={(event) => setChoice(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101d18] px-4 py-3 font-bold outline-none">
                      <option value="red">Red</option>
                      <option value="black">Black</option>
                      <option value="even">Even</option>
                      <option value="odd">Odd</option>
                    </select>
                  </label>
                )}

                {selected.id === 'baccarat' && (
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Pick</span>
                    <select value={choice} onChange={(event) => setChoice(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101d18] px-4 py-3 font-bold outline-none">
                      <option value="player">Player</option>
                      <option value="banker">Banker</option>
                      <option value="tie">Tie</option>
                    </select>
                  </label>
                )}

                {selected.id === 'crash' && (
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Auto cashout</span>
                    <input type="number" min="1.01" max="10" step="0.1" value={crashTarget} onChange={(event) => setCrashTarget(Math.max(1.01, Number(event.target.value) || 2))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-bold outline-none" />
                  </label>
                )}
              </div>

              <button
                onClick={() => void playPrimary()}
                disabled={loading || (mode === 'demo' && bet > credits)}
                className="mt-5 w-full rounded-2xl bg-lime-300 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Running…' : selected.cta}
              </button>

              {selected.id === 'blackjack' && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button onClick={() => void callGame('hit')} disabled={loading} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black hover:bg-white/[0.08]">Hit</button>
                  <button onClick={() => void callGame('stand')} disabled={loading} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black hover:bg-white/[0.08]">Stand</button>
                </div>
              )}
            </div>

            <div className="mt-5 min-h-48 rounded-[2rem] border border-white/10 bg-[#08100d] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Game result</p>
                {result && <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/35">{result.mode}</span>}
              </div>
              {error ? (
                <p className="mt-6 rounded-2xl border border-red-300/15 bg-red-300/[0.06] p-4 text-sm text-red-100">{error}</p>
              ) : result ? (
                <pre className="mt-5 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-lime-100/80">{JSON.stringify(result.data, null, 2)}</pre>
              ) : (
                <div className="grid min-h-32 place-items-center text-center text-sm text-white/30">Choose a game, set your bet, and play a round.</div>
              )}
            </div>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-black/15 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">Casino API</p>
          <h3 className="mt-2 text-xl font-black">Provider bridge</h3>
          <p className="mt-3 text-sm leading-6 text-white/45">The Skooby route layer mirrors the referenced casino contract for Slots, Blackjack, Roulette, Crash, Dice, Baccarat, and Poker.</p>

          <div className="mt-5 space-y-2 text-xs text-white/45">
            <div className="rounded-xl bg-white/[0.04] p-3"><span className="font-black text-white/70">POST</span> /api/game/slots/spin</div>
            <div className="rounded-xl bg-white/[0.04] p-3"><span className="font-black text-white/70">POST</span> /api/game/blackjack/start</div>
            <div className="rounded-xl bg-white/[0.04] p-3"><span className="font-black text-white/70">POST</span> /api/game/roulette/spin</div>
            <div className="rounded-xl bg-white/[0.04] p-3"><span className="font-black text-white/70">POST</span> /api/game/crash/bet</div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200/10 bg-amber-200/[0.04] p-4">
            <p className="text-xs font-black text-amber-100">Production note</p>
            <p className="mt-2 text-xs leading-5 text-white/40">Demo credits have no cash value. Real-money gaming requires a licensed backend, jurisdiction controls, age/KYC checks, responsible-gaming controls, and audited game logic.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
