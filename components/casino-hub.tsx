'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ConnectWallet } from '@/components/connect-wallet';
import { ProvablyFairVerifier } from '@/components/provably-fair-verifier';

const games = [
  { id: 'slots', name: 'Slots', icon: '🎰', action: 'spin', cta: 'Spin reels' },
  { id: 'blackjack', name: 'Blackjack', icon: '🃏', action: 'start', cta: 'Deal hand' },
  { id: 'roulette', name: 'Roulette', icon: '🎡', action: 'spin', cta: 'Spin wheel' },
  { id: 'crash', name: 'Crash', icon: '📈', action: 'bet', cta: 'Launch round' },
  { id: 'dice', name: 'Dice', icon: '🎲', action: 'roll', cta: 'Roll dice' },
  { id: 'baccarat', name: 'Baccarat', icon: '♦️', action: 'start', cta: 'Deal round' },
  { id: 'poker', name: 'Poker', icon: '♠️', action: 'action', cta: 'Deal hand' },
] as const;

type GameId = (typeof games)[number]['id'];
type CasinoEnvelope = {
  ok: boolean;
  mode: 'demo' | 'provider';
  game: string;
  action: string;
  data: unknown;
  authoritativeCredits?: number | null;
};

type Leader = { rank: number; player: string; credits: number };

export function CasinoHub() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [selectedId, setSelectedId] = useState<GameId>('slots');
  const [bet, setBet] = useState(10);
  const [credits, setCredits] = useState<number | null>(null);
  const [choice, setChoice] = useState('red');
  const [crashTarget, setCrashTarget] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CasinoEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  const selected = useMemo(() => games.find((game) => game.id === selectedId) ?? games[0], [selectedId]);

  async function authHeaders() {
    const token = await getAccessToken();
    if (!token) throw new Error('Sign in to use play credits.');
    return { Authorization: `Bearer ${token}` };
  }

  useEffect(() => {
    if (!ready || !authenticated) {
      setCredits(null);
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const headers = await authHeaders();
        const response = await fetch('/api/casino/credits', { headers, cache: 'no-store' });
        const data = (await response.json()) as { credits?: number };
        if (active && response.ok && typeof data.credits === 'number') setCredits(data.credits);
      } catch {
        if (active) setCredits(null);
      }
    };
    void load();
    return () => { active = false; };
  }, [ready, authenticated]);

  useEffect(() => {
    void fetch('/api/casino/leaderboard')
      .then((response) => response.json() as Promise<{ leaders?: Leader[] }>)
      .then((data) => setLeaders(data.leaders ?? []))
      .catch(() => setLeaders([]));
  }, [result]);

  async function callGame(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/game/${selected.id}/${action}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, ...extra }),
      });
      const data = (await response.json()) as CasinoEnvelope;
      if (!response.ok || !data.ok) {
        const message = data.data && typeof data.data === 'object' && 'error' in data.data
          ? String((data.data as Record<string, unknown>).error)
          : 'Casino request failed.';
        throw new Error(message);
      }
      setResult(data);
      if (typeof data.authoritativeCredits === 'number') setCredits(data.authoritativeCredits);
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
      <header className="flex flex-col gap-4 border-b border-white/10 bg-black/25 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black">SKOOBY CASINO</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Server-authoritative play credits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black text-lime-100">
            {credits === null ? 'Credits locked' : `${credits.toFixed(2)} credits`}
          </div>
          <ConnectWallet />
        </div>
      </header>

      <div className="grid lg:grid-cols-[210px_1fr_320px]">
        <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Games</p>
          <div className="space-y-1">
            {games.map((game) => (
              <button key={game.id} onClick={() => { setSelectedId(game.id); setResult(null); setError(null); }} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${selected.id === game.id ? 'bg-lime-300 text-black' : 'text-white/60 hover:bg-white/[0.06]'}`}>
                <span className="text-xl">{game.icon}</span>{game.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="p-5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-200">Now playing</p>
          <h2 className="mt-2 text-4xl font-black">{selected.icon} {selected.name}</h2>
          <div className="mt-7 rounded-[2rem] border border-white/10 bg-black/30 p-5 sm:p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Play-credit amount</span>
                <input type="number" min="1" step="1" value={bet} onChange={(event) => setBet(Math.max(1, Number(event.target.value) || 1))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-bold outline-none" />
              </label>
              {selected.id === 'roulette' || selected.id === 'baccarat' ? (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Pick</span>
                  <select value={choice} onChange={(event) => setChoice(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101d18] px-4 py-3 font-bold outline-none">
                    {selected.id === 'roulette' ? <><option value="red">Red</option><option value="black">Black</option><option value="even">Even</option><option value="odd">Odd</option></> : <><option value="player">Player</option><option value="banker">Banker</option><option value="tie">Tie</option></>}
                  </select>
                </label>
              ) : null}
              {selected.id === 'crash' ? (
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Demo target</span>
                  <input type="number" min="1.01" max="10" step="0.1" value={crashTarget} onChange={(event) => setCrashTarget(Math.max(1.01, Number(event.target.value) || 2))} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 font-bold outline-none" />
                </label>
              ) : null}
            </div>
            <button onClick={() => void playPrimary()} disabled={loading || !authenticated || credits === null} className="mt-5 w-full rounded-2xl bg-lime-300 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-black disabled:opacity-40">{loading ? 'Validating…' : selected.cta}</button>
            {selected.id === 'blackjack' ? <div className="mt-3 grid grid-cols-2 gap-3"><button onClick={() => void callGame('hit')} className="rounded-2xl border border-white/10 p-3 font-black">Hit</button><button onClick={() => void callGame('stand')} className="rounded-2xl border border-white/10 p-3 font-black">Stand</button></div> : null}
          </div>

          <div className="mt-5 min-h-44 rounded-[2rem] border border-white/10 bg-[#08100d] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Validated result</p>
            {error ? <p className="mt-5 rounded-2xl border border-red-300/15 bg-red-300/[0.06] p-4 text-sm text-red-100">{error}</p> : result ? <pre className="mt-5 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-lime-100/80">{JSON.stringify(result.data, null, 2)}</pre> : <p className="mt-8 text-center text-sm text-white/30">Authenticate, choose a game, and run a play-credit round.</p>}
          </div>
        </section>

        <aside className="space-y-4 border-t border-white/10 p-5 lg:border-l lg:border-t-0">
          <ProvablyFairVerifier />
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-200">Live rankings</p>
            <div className="mt-3 space-y-2">
              {leaders.slice(0, 8).map((leader) => <div key={`${leader.rank}-${leader.player}`} className="flex justify-between text-xs text-white/55"><span>#{leader.rank} {leader.player}</span><span className="font-black text-white/75">{leader.credits.toFixed(2)}</span></div>)}
              {!leaders.length ? <p className="text-xs text-white/35">Leaderboard will appear when the secure credit store is configured.</p> : null}
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-xs leading-5 text-white/45">
            Browser state is display-only. Balance changes are accepted only from authenticated game APIs or signed provider webhooks and are persisted server-side.
          </section>
        </aside>
      </div>
    </div>
  );
}
