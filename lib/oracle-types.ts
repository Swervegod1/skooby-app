export type OracleTab = 'Overview' | 'Discover' | 'Smart Money' | 'Forecast' | 'Portfolio' | 'Strategy Lab' | 'Safety' | 'Settings';
export type OracleForecast = {
  horizon_hours: number;
  probability_up: number;
  expected_net_return: number;
  return_quantiles: { q05: number; q50: number; q95: number };
  validation: { brier: number; baseline_brier: number; ece: number; test_samples: number; eligible: boolean };
  reliability: string;
};
export type OracleAnalysis = {
  id: string; product: string; market_status: string; decision: string; reason: string;
  source: string | null; observed_at: string | number | null; data_mode?: string; latest_candle_closed_at?: string | number | null; forecast: OracleForecast | null;
  risk: { allowed: boolean; reasons: string[]; notional: number; stop_price: number | null };
  agents: { name: string; status: string; evidence: string | string[] }[];
  prices: { time: string | number; close: number }[];
};
export type OracleStatus = {
  mode: 'paper'; paused: boolean; live_enabled: false;
  portfolio: {
    valuation?: string; starting_capital: number; cash: number; equity: number; realized_pnl: number;
    unrealized_pnl: number; fees: number; exposure: number;
    positions: unknown[] | Record<string, unknown>; orders: unknown[];
  };
  last_analysis: OracleAnalysis | null;
};

/** Strict browser-request contract. Unknown fields never reach the control plane. */
export function oracleRequestBody(path: string, input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('A JSON object is required.');
  const value = input as Record<string, unknown>;
  if (path === 'analyze' && ['BTC-USD', 'ETH-USD'].includes(String(value.product)) && [1, 4, 24].includes(Number(value.horizon))) {
    return { product: value.product, horizon: Number(value.horizon) };
  }
  if (path === 'pause' && typeof value.paused === 'boolean') return { paused: value.paused };
  if (path === 'paper/order' && typeof value.decision_id === 'string' && /^[\w-]{1,100}$/.test(value.decision_id) && typeof value.idempotency_key === 'string' && /^[\w-]{8,100}$/.test(value.idempotency_key)) {
    return { decision_id: value.decision_id, idempotency_key: value.idempotency_key };
  }
  if (path === 'command' && typeof value.text === 'string' && value.text.trim().length > 0 && value.text.length <= 300) return { text: value.text.trim() };
  throw new Error('The request contains unsupported parameters.');
}
