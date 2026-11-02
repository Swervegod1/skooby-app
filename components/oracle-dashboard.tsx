'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OracleAnalysis, OracleStatus, OracleTab } from '@/lib/oracle-types';

const tabs: OracleTab[] = ['Overview', 'Discover', 'Smart Money', 'Forecast', 'Portfolio', 'Strategy Lab', 'Safety', 'Settings'];
const currency = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) : 'Unavailable';
const percent = (n: unknown, digits = 1) => typeof n === 'number' && Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : 'Unavailable';
const number = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(3) : 'Unavailable';
const date = (value?: string | number | null) => value == null ? 'Awaiting a sourced observation' : new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value).toLocaleString();

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/oracle/${path}`, { cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'ORACLE is unavailable.');
  return data as T;
}
function Metric({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="ox-metric"><span className="ox-label">{label}</span><strong>{children}</strong>{hint && <small>{hint}</small>}</div>;
}
function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="ox-empty"><span className="ox-empty-icon" aria-hidden="true">◎</span><h3>{title}</h3><p>{children}</p></div>;
}
function Evidence({ data }: { data: unknown }) {
  return <pre className="ox-evidence">{JSON.stringify(data, null, 2)}</pre>;
}
function PriceTrace({ analysis }: { analysis: OracleAnalysis | null }) {
  const points = (analysis?.prices || []).filter(p => Number.isFinite(p.close)).slice(-96);
  if (points.length < 2) return <div className="ox-chart-empty">A price trace appears after a successful market analysis.</div>;
  const min = Math.min(...points.map(p => p.close));
  const max = Math.max(...points.map(p => p.close));
  const range = max - min || max * .001 || 1;
  const coords = points.map((p, i) => `${i * 800 / (points.length - 1)},${156 - (p.close - min) / range * 132}`).join(' ');
  return <div className="ox-chart"><div className="ox-chart-labels"><span>{currency(max)}</span><span>Historical closes · {points.length} observations</span></div><svg viewBox="0 0 800 180" role="img" aria-label={`${analysis?.product} historical closing prices from ${currency(points[0].close)} to ${currency(points.at(-1)?.close)}`} preserveAspectRatio="none"><defs><linearGradient id="ox-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7bf1c8" stopOpacity=".2"/><stop offset="100%" stopColor="#7bf1c8" stopOpacity="0"/></linearGradient></defs><path d={`M0,180 L${coords.replaceAll(' ', ' L')} L800,180 Z`} fill="url(#ox-fill)"/><polyline points={coords} fill="none" stroke="#7bf1c8" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="ox-chart-labels"><span>{date(points[0].time)}</span><span>{date(points.at(-1)?.time)}</span></div></div>;
}
function Forecast({ analysis }: { analysis: OracleAnalysis | null }) {
  const f = analysis?.forecast;
  if (!f) return <Empty title="No forecast available">Analyze a supported spot market. Insufficient or invalid data produces NO TRADE.</Empty>;
  return <><div className="ox-stat-grid"><Metric label="Probability of a positive return" hint={`${f.horizon_hours}-hour horizon · model estimate`}>{percent(f.probability_up)}</Metric><Metric label="Expected return after costs" hint="Fees and execution assumptions apply">{percent(f.expected_net_return, 2)}</Metric><Metric label="5th to 95th return quantiles" hint="Model estimates, not a guaranteed range">{percent(f.return_quantiles.q05)} / {percent(f.return_quantiles.q95)}</Metric></div><div className="ox-callout">Reliability: {f.reliability}. {f.validation.eligible ? 'Meets the configured research eligibility checks.' : 'Research evidence does not qualify this model for trading.'}</div><details><summary>Calibration and validation evidence</summary><div className="ox-stat-grid"><Metric label="Brier score">{number(f.validation.brier)}</Metric><Metric label="Baseline Brier">{number(f.validation.baseline_brier)}</Metric><Metric label="Calibration error">{number(f.validation.ece)}</Metric><Metric label="Out-of-sample observations">{f.validation.test_samples}</Metric></div><p className="ox-muted">Lower Brier is better. Calibration measures historical agreement between predicted probabilities and observed outcomes. A low score alone does not establish a profitable edge.</p></details></>;
}

export function OracleDashboard() {
  const [tab, setTab] = useState<OracleTab>('Overview');
  const [status, setStatus] = useState<OracleStatus | null>(null);
  const [product, setProduct] = useState('BTC-USD');
  const [horizon, setHorizon] = useState(4);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState<unknown>(null);
  const [experiments, setExperiments] = useState<unknown>(null);
  const [ledger, setLedger] = useState<unknown>(null);
  const orderKey = useRef<{ decision: string; key: string } | null>(null);
  const refresh = useCallback(async () => { const next = await api<OracleStatus>('status'); setStatus(next); return next; }, []);
  useEffect(() => { let active = true; api<OracleStatus>('status').then(data => { if (active) setStatus(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const action = async (label: string, run: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(label); setError(''); setNotice('');
    try { await run(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'The request failed.'); } finally { setBusy(''); }
  };
  const selectTab = (next: OracleTab) => { setTab(next); if (next === 'Strategy Lab') void action('Loading experiments', async () => setExperiments(await api('experiments'))); if (next === 'Smart Money') void action('Loading ledger', async () => setLedger(await api('ledger'))); };
  const analysis = status?.last_analysis || null;
  const portfolio = status?.portfolio;
  const staleValuation = portfolio?.valuation === 'STALE_COST_BASIS';
  const commandMessage = response && typeof response === 'object' && 'message' in response && typeof response.message === 'string' ? response.message : null;
  const paperEligible = status && !status.paused && analysis?.risk.allowed && ['BUY', 'SELL'].includes(analysis.decision);
  const paperOrder = async () => {
    if (!analysis || !paperEligible) return;
    if (orderKey.current?.decision !== analysis.id) orderKey.current = { decision: analysis.id, key: crypto.randomUUID() };
    await api('paper/order', { decision_id: analysis.id, idempotency_key: orderKey.current.key });
    setNotice('Paper order processed. Review the simulated fill in Portfolio.');
  };
  return <div className="ox-app">
    <aside className="ox-sidebar"><Link href="/" className="ox-brand"><span className="ox-brand-mark">S</span>SKOOBY<span className="ox-brand-dot">.</span></Link><div className="ox-sidebar-caption">INTELLIGENCE TERMINAL</div><nav aria-label="ORACLE workspace">{tabs.map((item, index) => <button key={item} type="button" aria-current={tab === item ? 'page' : undefined} onClick={() => selectTab(item)}><span className="ox-nav-number">0{index + 1}</span>{item}{tab === item && <span className="ox-nav-dot"/>}</button>)}</nav><div className="ox-sidebar-footer"><span className="ox-pulse"/>INDEPENDENT RISK CONTROL<p>Evidence before action.<br/>Capital before conviction.</p><Link href="/account">Account & sign in ↗</Link></div></aside>
    <main className="ox-main"><header className="ox-topbar"><span>GHOST WHALE <span className="ox-dim">{'//'}</span> ORACLE X</span><div><span className="ox-mode"><i/>PAPER ONLY</span><button className="ox-pause" type="button" disabled={!status || !!busy} onClick={() => void action('Updating safety state', async () => { await api('pause', { paused: !status?.paused }); })}>{status?.paused ? 'Resume paper trading' : 'Pause trading'}</button></div></header>
      <section className="ox-heading"><div><div className="ox-eyebrow">RESEARCH-DRIVEN CRYPTO INTELLIGENCE</div><h1>{tab === 'Overview' ? <>Clarity. Before <em>conviction.</em></> : tab}</h1><p>{tab === 'Overview' ? 'See the evidence. Understand the downside. Decide whether action is justified.' : 'Every important claim stays connected to its evidence.'}</p></div><span className={`ox-connection ${status ? 'connected' : ''}`}><i/>{status ? status.paused ? 'Paper trading paused' : 'Research workspace connected' : 'Awaiting connection'}</span></section>
      {error && <div role="alert" className="ox-alert">{error}{error.includes('Sign in') && <> <Link href="/account">Open account →</Link></>}</div>}
      {notice && <div role="status" className="ox-success">{notice}</div>}
      <div className="ox-analyze-bar"><label>Spot market<select value={product} onChange={e => setProduct(e.target.value)} disabled={!!busy}><option value="BTC-USD">Bitcoin · BTC / USD</option><option value="ETH-USD">Ethereum · ETH / USD</option></select></label><label>Forecast horizon<select value={horizon} onChange={e => setHorizon(Number(e.target.value))} disabled={!!busy}><option value={1}>1 hour</option><option value={4}>4 hours</option><option value={24}>24 hours</option></select></label><button className="ox-primary" type="button" disabled={!!busy} onClick={() => void action('Analyzing market', async () => { await api('analyze', { product, horizon }); })}>{busy || 'ANALYZE MARKET'}<span aria-hidden="true">↗</span></button></div>
      {tab === 'Overview' && <>
        <div className="ox-overview-grid"><section className="ox-card ox-decision"><div className="ox-card-title"><span>ORACLE DECISION</span><span className="ox-tag">{analysis ? 'EVIDENCE ATTACHED' : 'AWAITING EVIDENCE'}</span></div><div className="ox-decision-text">{analysis?.decision || 'NO TRADE'}<span aria-hidden="true">↗</span></div><h2>{analysis?.product ? `${analysis.product} · Coinbase spot` : 'Patience is a position.'}</h2><p>{analysis?.reason || 'No market analysis has been completed in this workspace. Run an analysis to evaluate the available evidence.'}</p><div className="ox-next-action"><span className="ox-label">NEXT ACTION</span><strong>{status?.paused ? 'Trading is paused. Research remains available.' : paperEligible ? 'Review the evidence before simulating this trade.' : 'Preserve capital until the evidence supports an entry.'}</strong></div><button className="ox-secondary" type="button" disabled={!paperEligible || !!busy} onClick={() => void action('Simulating order', paperOrder)}>Simulate eligible order <span>→</span></button></section>
        <section className="ox-card ox-market"><div className="ox-card-title"><span>MARKET STATUS</span><span className="ox-tag">{analysis?.market_status || 'NOT ASSESSED'}</span></div><div className="ox-market-heading"><h2>{analysis?.product || 'Market observation'}</h2><span>{analysis?.data_mode || 'No data loaded'}</span></div><PriceTrace analysis={analysis}/><div className="ox-source"><span>{analysis?.source || 'Coinbase · awaiting data'}</span><span>Latest candle: {date(analysis?.latest_candle_closed_at)}</span><span>Received: {date(analysis?.observed_at)}</span></div></section></div>
        <section className="ox-card"><div className="ox-card-title"><span>FUTURECAST</span><button className="ox-text-button" onClick={() => setTab('Forecast')}>Inspect forecast →</button></div><Forecast analysis={analysis}/></section>
        <div className="ox-bottom-grid"><section className="ox-card"><div className="ox-card-title"><span>MY PAPER PORTFOLIO</span><span className="ox-tag">SIMULATED</span></div><div className="ox-stat-grid"><Metric label={staleValuation ? 'Equity at cost basis' : 'Equity'}>{currency(portfolio?.equity)}</Metric><Metric label="Realized P&L">{currency(portfolio?.realized_pnl)}</Metric><Metric label="Exposure">{currency(portfolio?.exposure)}</Metric></div><button className="ox-text-button" onClick={() => setTab('Portfolio')}>Inspect accounting →</button></section><section className="ox-card"><div className="ox-card-title"><span>RISK COMMANDER</span><span className="ox-risk-dot"/></div><h3>{analysis?.risk.allowed ? 'Research checks passed' : 'No eligible order'}</h3><p>{analysis?.risk.reasons?.join(' · ') || 'Orders require independent checks. A forecast cannot override a rejection.'}</p><button className="ox-text-button" onClick={() => setTab('Safety')}>Inspect safety controls →</button></section></div>
      </>}
      {tab === 'Forecast' && <section className="ox-card"><div className="ox-card-title"><span>PROBABILITIES, NOT PROMISES</span><span className="ox-tag">{analysis?.product || 'NO ASSET'}</span></div><Forecast analysis={analysis}/><details><summary>Full source and model evidence</summary><Evidence data={analysis}/></details></section>}
      {tab === 'Discover' && <section className="ox-card"><div className="ox-card-title"><span>SPOT RESEARCH UNIVERSE</span><span className="ox-tag">2 SUPPORTED MARKETS</span></div><div className="ox-discover-grid">{[['BTC-USD', 'Bitcoin', 'The benchmark.'], ['ETH-USD', 'Ethereum', 'The challenger.']].map(([id, name, copy]) => <button className="ox-asset" key={id} onClick={() => { setProduct(id); setTab('Overview'); }}><span className="ox-asset-symbol">{id[0]}</span><h2>{name}</h2><span>{id} · Coinbase</span><p>{copy} Select to research current data and forecast eligibility.</p><strong>Research market ↗</strong></button>)}</div><div className="ox-callout">Microcap discovery is research-only and is not enabled for execution. Contract controls, sellability, related-wallet concentration and actual liquidity require independent verification.</div></section>}
      {tab === 'Smart Money' && <section className="ox-card"><div className="ox-card-title"><span>VERIFIED TRADER INTELLIGENCE LEDGER</span><span className="ox-tag">PUBLIC EVIDENCE ONLY</span></div><Empty title="A wallet is not a verified track record">Wallet records remain unverified until transfers, funding, fees, open exposure and missing history are accounted for. No automatic copy trading.</Empty>{ledger != null && <details><summary>Inspect available ledger records</summary><Evidence data={ledger}/></details>}</section>}
      {tab === 'Portfolio' && <section className="ox-card"><div className="ox-card-title"><span>PAPER PERFORMANCE</span><span className="ox-tag">NEVER LIVE CAPITAL</span></div><div className="ox-stat-grid"><Metric label="Starting capital">{currency(portfolio?.starting_capital)}</Metric><Metric label={staleValuation ? 'Equity at cost basis' : 'Equity'}>{currency(portfolio?.equity)}</Metric><Metric label="Cash">{currency(portfolio?.cash)}</Metric><Metric label="Realized P&L">{currency(portfolio?.realized_pnl)}</Metric><Metric label="Unrealized P&L">{staleValuation ? 'Unpriced' : currency(portfolio?.unrealized_pnl)}</Metric><Metric label="Trading fees">{currency(portfolio?.fees)}</Metric></div>{staleValuation && <div className="ox-callout">Current prices are missing. Equity and exposure use cost basis; they are not current market valuations.</div>}<details open><summary>Open paper positions</summary><Evidence data={portfolio?.positions ?? 'Account not connected'}/></details><details><summary>Orders and simulated fills</summary><Evidence data={portfolio?.orders ?? 'Account not connected'}/></details><p className="ox-muted">Simulated execution cannot demonstrate live fill quality. Account balances shown here are paper accounting only.</p></section>}
      {tab === 'Strategy Lab' && <section className="ox-card"><div className="ox-card-title"><span>CHAMPION / CHALLENGER RESEARCH</span><span className="ox-tag">NO AUTOMATIC PROMOTION</span></div><h2>Earn the right to trade.</h2><p>Experiments must survive chronological validation, realistic costs and passive benchmarks. Failed trials stay in the record.</p>{experiments == null ? <Empty title="No experiment response yet">Select this tab again to reload the experiment registry.</Empty> : <Evidence data={experiments}/>}</section>}
      {tab === 'Safety' && <section className="ox-card"><div className="ox-card-title"><span>DETERMINISTIC CONTROLS</span><span className="ox-tag">LIVE EXECUTION DISABLED</span></div><div className="ox-stat-grid"><Metric label="Execution mode">PAPER ONLY</Metric><Metric label="Manual pause">{status ? status.paused ? 'ACTIVE' : 'Ready' : 'Unavailable'}</Metric><Metric label="Latest risk decision">{analysis?.risk.allowed ? 'Eligible for simulation' : 'NO TRADE'}</Metric></div><h3>Latest rejection reasons</h3><p>{analysis?.risk.reasons?.join(' · ') || 'No evaluated order.'}</p><h3>Independent agent evidence</h3>{analysis?.agents?.map(agent => <details key={agent.name}><summary>{agent.name} · {agent.status}</summary><p>{Array.isArray(agent.evidence) ? agent.evidence.join(' · ') : agent.evidence}</p></details>)}<div className="ox-callout">The forecasting engine cannot authorize live trading. A pause, stale feed, duplicate order or failed risk check blocks execution regardless of model confidence.</div><details><summary>Full risk record</summary><Evidence data={analysis?.risk ?? null}/></details></section>}
      {tab === 'Settings' && <section className="ox-card"><div className="ox-card-title"><span>WORKSPACE CONFIGURATION</span><span className="ox-tag">PAPER RESEARCH</span></div><dl className="ox-settings"><dt>Execution</dt><dd>Simulation only. No live-order endpoint is exposed.</dd><dt>Markets</dt><dd>BTC-USD and ETH-USD spot</dd><dt>Forecast horizons</dt><dd>1, 4 and 24 hours. Other horizons require additional validation.</dd><dt>Account</dt><dd><Link href="/account">Manage your Skooby sign-in ↗</Link></dd><dt>Service connection</dt><dd>{status ? 'Connected through the authenticated Skooby server.' : 'Not connected. Sign in, or configure the ORACLE service on the server.'}</dd><dt>Data freshness</dt><dd>Refresh and analyze on demand. Old observations are not live prices.</dd></dl></section>}
      <section className="ox-command"><span className="ox-command-icon" aria-hidden="true">⌘</span><form onSubmit={e => { e.preventDefault(); void action('Interpreting command', async () => { setResponse(await api('command', { text: command })); }); }}><label htmlFor="ox-command">ASK ORACLE</label><div><input id="ox-command" value={command} onChange={e => setCommand(e.target.value)} placeholder='Try “What happens if Bitcoin drops 5%?”' maxLength={300}/><button type="submit" disabled={!command.trim() || !!busy} aria-label="Send command">↵</button></div></form></section>{response != null && <section className="ox-card" aria-live="polite"><div className="ox-card-title"><span>COMMAND RESPONSE</span></div>{commandMessage && <p>{commandMessage}</p>}<details><summary>Inspect command evidence</summary><Evidence data={response}/></details></section>}
      <footer className="ox-footer"><span>SKOOBY / ORACLE X</span><p>Research estimates can be wrong. NO TRADE is a valid outcome.</p><span>SPOT · NO LEVERAGE · PAPER</span></footer>
    </main>
  </div>;
}
