/**
 * SKOOBY ALPHA ORACLE V1.2 — deterministic, research-only execution harness.
 * No brokerage connection, order submission, wallet signing, or transaction broadcasting.
 * The novelty score here is a regularized PCA/Mahalanobis proximity score;
 * it is NOT FreqAI's normalized Euclidean-nearest-neighbor Dissimilarity Index.
 */
export type Side = 'LONG' | 'SHORT';
export type Decision = 'LONG' | 'SHORT' | 'HOLD' | 'CLOSE';
export type Timeframe = '15m' | '1h' | '4h';
export type SourceFamily = 'spot' | 'onchain' | 'security' | 'social' | 'derivatives' | 'technical';

export type Candle = { at: string; open: number; high: number; low: number; close: number; volume: number };
export type Position = { symbol: string; side: Side; entryPrice: number; leverage: number; size: number };
export type Portfolio = {
  equity: number;
  peakEquity: number;
  dayStartEquity: number;
  dayAnchorUtc: string; // YYYY-MM-DD. Must be rolled forward by the trusted portfolio service.
  asOf: string;
  positions: Position[];
  hardHalt?: boolean;
};
export type RiskPolicy = {
  maxDailyDrawdown: number;
  maxPeakDrawdown: number;
  maxLeverage: number;
  minScore: number;
  maxPortfolioAgeMs: number;
};
export const DEFAULT_RISK_POLICY: Readonly<RiskPolicy> = Object.freeze({
  maxDailyDrawdown: 0.05,
  maxPeakDrawdown: 0.10,
  maxLeverage: 3,
  minScore: 75,
  maxPortfolioAgeMs: 120_000,
});
export type Gate = { allowed: boolean; code: string; reasons: string[]; requiresHumanApproval: true };

function ensureFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}
function fractionalDrop(anchor: number, current: number): number {
  if (!(anchor > 0)) return 1;
  return Math.max(0, (anchor - current) / anchor);
}
function validUtc(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || !value.endsWith('Z')) throw new Error('Invalid UTC ISO timestamp');
  return timestamp;
}
function isPriceWinner(pos: Position, marketPrice: number): boolean {
  return pos.side === 'LONG' ? marketPrice > pos.entryPrice : marketPrice < pos.entryPrice;
}

/** Statelessly checks a new/add research proposal against authoritative persisted portfolio metrics. */
export function checkRisk(
  portfolio: Portfolio | null,
  order: { symbol: string; side: Side; leverage: number; action: 'OPEN' | 'ADD'; currentPrice?: number; atrPct?: number },
  now = new Date(), policy: RiskPolicy = DEFAULT_RISK_POLICY,
): Gate {
  const reasons: string[] = [];
  if (!portfolio) reasons.push('PORTFOLIO_UNAVAILABLE');
  if (portfolio) {
    try {
      if (Math.abs(now.getTime() - validUtc(portfolio.asOf)) > policy.maxPortfolioAgeMs) reasons.push('PORTFOLIO_STALE');
    } catch { reasons.push('PORTFOLIO_TIMESTAMP_INVALID'); }
    if (portfolio.dayAnchorUtc !== now.toISOString().slice(0, 10)) reasons.push('UTC_DAY_ANCHOR_STALE');
    if (![portfolio.equity, portfolio.peakEquity, portfolio.dayStartEquity].every(v => Number.isFinite(v) && v > 0)) {
      reasons.push('PORTFOLIO_INVALID');
    } else {
      if (fractionalDrop(portfolio.dayStartEquity, portfolio.equity) >= policy.maxDailyDrawdown) reasons.push('DAILY_DRAWDOWN_HALT');
      if (fractionalDrop(portfolio.peakEquity, portfolio.equity) >= policy.maxPeakDrawdown) reasons.push('TOTAL_DRAWDOWN_HALT');
    }
    if (portfolio.hardHalt) reasons.push('OPERATOR_HALT');
    const existing = portfolio.positions.find(p => p.symbol === order.symbol);
    if (order.action === 'OPEN' && existing) reasons.push('POSITION_ALREADY_OPEN');
    if (order.action === 'ADD') {
      if (!existing) reasons.push('NO_EXISTING_POSITION');
      else {
        if (existing.side !== order.side) reasons.push('DIRECTION_MISMATCH');
        if (!(order.currentPrice != null && Number.isFinite(order.currentPrice) && isPriceWinner(existing, order.currentPrice))) reasons.push('AVERAGING_DOWN_BLOCKED');
      }
    }
  }
  if (!order.symbol.trim() || !['LONG', 'SHORT'].includes(order.side)) reasons.push('ORDER_INVALID');
  if (!Number.isFinite(order.leverage) || order.leverage < 1 || order.leverage > policy.maxLeverage) reasons.push('LEVERAGE_OUT_OF_RANGE');
  if (order.atrPct != null && (!Number.isFinite(order.atrPct) || order.atrPct < 0)) reasons.push('ATR_INVALID');
  if (order.atrPct != null && order.atrPct > 0.03 && order.leverage > 1) reasons.push('HIGH_VOLATILITY_1X_ONLY');
  return { allowed: reasons.length === 0, code: reasons[0] ?? 'RESEARCH_ONLY_PASS', reasons, requiresHumanApproval: true };
}

/** Jacobi eigendecomposition of small symmetric matrices (intended <= 24 features). */
function symmetricEigen(matrix: number[][]): { values: number[]; vectors: number[][] } {
  const n = matrix.length;
  const a = matrix.map(row => [...row]);
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Number(i === j)));
  for (let sweep = 0; sweep < 60 * n * n; sweep++) {
    let p = 0, q = 0, max = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (Math.abs(a[i][j]) > max) { max = Math.abs(a[i][j]); p = i; q = j; }
    }
    if (max < 1e-11) break;
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
    const c = 1 / Math.sqrt(1 + t * t), s = t * c;
    const app = a[p][p], aqq = a[q][q], apq = a[p][q];
    a[p][p] = app - t * apq;
    a[q][q] = aqq + t * apq;
    a[p][q] = 0; a[q][p] = 0;
    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[p][k] = a[k][p];
        a[k][q] = s * akp + c * akq; a[q][k] = a[k][q];
      }
      const vkp = v[k][p], vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
    }
  }
  const indices = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
  return { values: indices.map(i => a[i][i]), vectors: v.map(row => indices.map(i => row[i])) };
}

function percentile(values: number[], percentileValue: number): number {
  if (!(percentileValue >= 0 && percentileValue <= 100) || values.length < 1) throw new Error('Invalid percentile');
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentileValue / 100;
  const low = Math.floor(index), high = Math.ceil(index), fraction = index - low;
  return sorted[low] * (1 - fraction) + sorted[high] * fraction;
}

/** Separate from FreqAI DI. Fit on training data; calibrate on disjoint validation data. */
export class MahalanobisNoveltyGate {
  private mean: number[] = [];
  private directions: number[][] = [];
  private eigenvalues: number[] = [];
  private cutoff: number | null = null;
  private readonly nComponents?: number;
  constructor(nComponents?: number) { this.nComponents = nComponents; }
  fit(training: number[][]): this {
    if (training.length < 12) throw new Error('Need at least 12 training samples');
    const dimensions = training[0]?.length ?? 0;
    if (dimensions < 1 || dimensions > 24 || training.length < 2 * dimensions) throw new Error('Insufficient samples or unsupported feature dimensions');
    if (this.nComponents !== undefined && (!Number.isInteger(this.nComponents) || this.nComponents < 1 || this.nComponents > dimensions)) throw new Error('Invalid nComponents');
    for (const row of training) {
      if (row.length !== dimensions || row.some(x => !Number.isFinite(x))) throw new Error('Training matrix invalid');
    }
    this.mean = Array.from({ length: dimensions }, (_, j) => training.reduce((sum, row) => sum + row[j], 0) / training.length);
    const cov = Array.from({ length: dimensions }, () => Array(dimensions).fill(0) as number[]);
    for (const row of training) for (let i = 0; i < dimensions; i++) for (let j = 0; j < dimensions; j++) {
      cov[i][j] += ((row[i] - this.mean[i]) * (row[j] - this.mean[j])) / (training.length - 1);
    }
    const trace = cov.reduce((sum, row, i) => sum + row[i], 0);
    const shrink = Math.max(1e-9, (trace / dimensions) * 1e-5);
    for (let i = 0; i < dimensions; i++) cov[i][i] += shrink;
    const eigen = symmetricEigen(cov);
    const n = this.nComponents ?? dimensions;
    this.eigenvalues = eigen.values.slice(0, n).map(value => Math.max(shrink, value));
    this.directions = eigen.vectors.map(row => row.slice(0, n));
    this.cutoff = null;
    return this;
  }
  score(row: number[]): number {
    if (!this.mean.length || row.length !== this.mean.length || row.some(x => !Number.isFinite(x))) throw new Error('Model unfit or input invalid');
    let d2 = 0;
    for (let j = 0; j < this.eigenvalues.length; j++) {
      let projection = 0;
      for (let i = 0; i < row.length; i++) projection += (row[i] - this.mean[i]) * this.directions[i][j];
      d2 += projection * projection / this.eigenvalues[j];
    }
    return 1 / (1 + Math.sqrt(Math.max(0, d2)));
  }
  calibrate(validation: number[][], atPercentile = 5): number {
    if (validation.length < 12) throw new Error('Need an independent validation window >=12 observations');
    this.cutoff = percentile(validation.map(row => this.score(row)), atPercentile);
    return this.cutoff;
  }
  judge(row: number[]): { accepted: boolean; score: number; cutoff: number | null; reason: string } {
    const score = this.score(row);
    return { accepted: this.cutoff !== null && score >= this.cutoff, score, cutoff: this.cutoff,
      reason: this.cutoff === null ? 'NOT_CALIBRATED' : score < this.cutoff ? 'OUT_OF_DISTRIBUTION' : 'PASS' };
  }
}

export type Indicators = {
  lastClose: number; ema20: number; ema50: number; ema200: number | null;
  rsi14: number; atr14: number; atrPct: number; macd: { line: number; signal: number; histogram: number };
  return1: number; volumeZ: number; candleAt: string;
};
function exponential(values: number[], period: number, alpha = 2 / (period + 1)): number[] {
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  return out;
}
export function enrichCandles(candles: Candle[]): Indicators {
  if (candles.length < 50) throw new Error('At least 50 candles required for technical indicators');
  let previousAt = -Infinity;
  for (const candle of candles) {
    const at = validUtc(candle.at);
    if (at <= previousAt) throw new Error('Candles must be chronologically ordered');
    previousAt = at;
    for (const name of ['open', 'high', 'low', 'close', 'volume'] as const) ensureFinite(candle[name], name);
    if (candle.low <= 0 || candle.high < Math.max(candle.low, candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.volume < 0) throw new Error('Invalid OHLCV candle');
  }
  const close = candles.map(x => x.close);
  const gain = close.map((x, i) => i ? Math.max(0, x - close[i - 1]) : 0);
  const loss = close.map((x, i) => i ? Math.max(0, close[i - 1] - x) : 0);
  const avgGain = exponential(gain, 14, 1 / 14).at(-1)!;
  const avgLoss = exponential(loss, 14, 1 / 14).at(-1)!;
  const rsi14 = avgGain === 0 && avgLoss === 0 ? 50 : avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  const trueRanges = candles.map((x, i) => i === 0 ? x.high - x.low : Math.max(x.high - x.low, Math.abs(x.high - close[i - 1]), Math.abs(x.low - close[i - 1])));
  const atr14 = exponential(trueRanges, 14, 1 / 14).at(-1)!;
  const ema12 = exponential(close, 12), ema26 = exponential(close, 26);
  const macdValues = ema12.map((v, i) => v - ema26[i]);
  const macdSignal = exponential(macdValues, 9);
  const volumes = candles.map(x => x.volume);
  const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((sum, v) => sum + (v - volumeMean) ** 2, 0) / Math.max(1, volumes.length - 1);
  const lastClose = close.at(-1)!;
  return {
    lastClose, ema20: exponential(close, 20).at(-1)!, ema50: exponential(close, 50).at(-1)!,
    ema200: close.length >= 200 ? exponential(close, 200).at(-1)! : null,
    rsi14, atr14, atrPct: atr14 / lastClose,
    macd: { line: macdValues.at(-1)!, signal: macdSignal.at(-1)!, histogram: macdValues.at(-1)! - macdSignal.at(-1)! },
    return1: lastClose / close[close.length - 2] - 1,
    volumeZ: Math.sqrt(variance) > 1e-12 ? (volumes.at(-1)! - volumeMean) / Math.sqrt(variance) : 0,
    candleAt: candles.at(-1)!.at,
  };
}

export type OracleEvidence = { family: SourceFamily; source: string; observedAt: string; status: 'VERIFIED' | 'UNAVAILABLE' | 'STALE'; detail?: string };
export type ResearchInput = {
  symbol: string;
  marketAsOf: string;
  candles?: Partial<Record<Timeframe, Candle[]>>;
  evidence: OracleEvidence[];
  portfolio: Portfolio | null;
  perp?: { fundingRate: number | null; openInterestDelta: number | null; orderbookImbalance: number | null };
};
export type ResearchPayload = {
  version: '1.2'; timestampUtc: string; symbol: string; decision: 'HOLD'; executionEnabled: false;
  reasons: string[]; portfolio: { equity: number | null; dailyDrawdownPct: number | null; peakDrawdownPct: number | null };
  constraints: { maxLeverage: number; minimumScore: number; noAddToLoser: true; humanApprovalRequired: true };
  evidence: OracleEvidence[];
  timeframes: Partial<Record<Timeframe, Indicators>>;
  perp: { fundingRate: number | null; openInterestDelta: number | null; orderbookImbalance: number | null };
};
export const ORACLE_ARENA_SYSTEM_PROMPT = `You are SKOOBY-ARENA, a READ-ONLY market research agent.\nNever execute or authorize a trade.\nReturn one JSON object with decision HOLD unless independent fresh evidence, calibrated risk gates, and explicit human review are available.\nThe deterministic risk engine has priority over your outputs. No martingale, averaging down or leverage above policy.\nDo not invent forecasts, model certainty, wallet actions, or missing inputs.`;

export function buildResearchPayload(input: ResearchInput, now = new Date()): ResearchPayload {
  const reasons: string[] = [];
  let marketTime = NaN;
  try { marketTime = validUtc(input.marketAsOf); } catch { reasons.push('MARKET_TIMESTAMP_INVALID'); }
  if (!Number.isFinite(marketTime) || Math.abs(now.getTime() - marketTime) > 120_000) reasons.push('MARKET_STALE');
  const required: SourceFamily[] = ['spot', 'onchain', 'security', 'social', 'derivatives', 'technical'];
  for (const family of required) {
    const verified = input.evidence.some(ev => {
      if (ev.family !== family || ev.status !== 'VERIFIED' || !ev.source.trim()) return false;
      try { return Math.abs(now.getTime() - validUtc(ev.observedAt)) <= 300_000; } catch { return false; }
    });
    if (!verified) reasons.push(`MISSING_${family.toUpperCase()}`);
  }
  const timeframes: Partial<Record<Timeframe, Indicators>> = {};
  for (const tf of ['15m', '1h', '4h'] as const) {
    const source = input.candles?.[tf];
    if (!source) { reasons.push(`MISSING_CANDLES_${tf}`); continue; }
    try {
      const indicators = enrichCandles(source);
      const age = now.getTime() - validUtc(indicators.candleAt);
      const intervalMs = { '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000 }[tf];
      if (age < -intervalMs || age > intervalMs * 2) reasons.push(`STALE_CANDLES_${tf}`);
      timeframes[tf] = indicators;
    } catch { reasons.push(`INVALID_CANDLES_${tf}`); }
  }
  const guard = checkRisk(input.portfolio, { symbol: input.symbol, side: 'LONG', leverage: 1, action: 'OPEN', atrPct: timeframes['1h']?.atrPct }, now);
  reasons.push(...guard.reasons);
  return {
    version: '1.2', timestampUtc: now.toISOString(), symbol: input.symbol, decision: 'HOLD', executionEnabled: false,
    reasons: [...new Set(reasons)], evidence: input.evidence, timeframes,
    portfolio: {
      equity: input.portfolio?.equity ?? null,
      dailyDrawdownPct: input.portfolio ? 100 * fractionalDrop(input.portfolio.dayStartEquity, input.portfolio.equity) : null,
      peakDrawdownPct: input.portfolio ? 100 * fractionalDrop(input.portfolio.peakEquity, input.portfolio.equity) : null,
    },
    constraints: { maxLeverage: DEFAULT_RISK_POLICY.maxLeverage, minimumScore: DEFAULT_RISK_POLICY.minScore, noAddToLoser: true, humanApprovalRequired: true },
    perp: { fundingRate: input.perp?.fundingRate ?? null, openInterestDelta: input.perp?.openInterestDelta ?? null, orderbookImbalance: input.perp?.orderbookImbalance ?? null },
  };
}

export type ArenaProposal = {
  decision: Decision; symbol: string | null; leverage: number; sizePctOfEquity: number;
  entryType: 'MARKET' | 'LIMIT'; limitPrice: number | null; stopLoss: number | null;
  takeProfit: number | null; confidence: number; reasoning: string;
};
/** STRICT fail-closed boundary for arbitrary LLM output. Returns HOLD only; never a trade executor. */
export function validateArenaProposal(candidate: unknown, payload: ResearchPayload): { acceptedForResearch: boolean; decision: 'HOLD'; reasons: string[] } {
  const obj = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Record<string, unknown> : {};
  const reasons: string[] = [...payload.reasons];
  const exactKeys = ['decision', 'symbol', 'leverage', 'size_pct_of_equity', 'entry_type', 'limit_price', 'stop_loss', 'take_profit', 'confidence', 'reasoning'];
  if (Object.keys(obj).some(k => !exactKeys.includes(k)) || exactKeys.some(k => !(k in obj))) reasons.push('SCHEMA_MISMATCH');
  if (!['LONG', 'SHORT', 'HOLD', 'CLOSE'].includes(String(obj.decision))) reasons.push('DECISION_INVALID');
  if (typeof obj.symbol !== 'string' && obj.symbol !== null) reasons.push('SYMBOL_INVALID');
  if (!Number.isInteger(obj.leverage) || (obj.leverage as number) < 1 || (obj.leverage as number) > 3) reasons.push('LEVERAGE_INVALID');
  if (typeof obj.size_pct_of_equity !== 'number' || !Number.isFinite(obj.size_pct_of_equity) || obj.size_pct_of_equity < 0 || obj.size_pct_of_equity > 100) reasons.push('SIZE_INVALID');
  if (obj.entry_type !== 'MARKET' && obj.entry_type !== 'LIMIT') reasons.push('ENTRY_TYPE_INVALID');
  for (const key of ['limit_price', 'stop_loss', 'take_profit'] as const) {
    if (obj[key] !== null && (typeof obj[key] !== 'number' || !Number.isFinite(obj[key]) || obj[key] <= 0)) reasons.push(`${key.toUpperCase()}_INVALID`);
  }
  if (typeof obj.confidence !== 'number' || !Number.isFinite(obj.confidence) || obj.confidence < 0 || obj.confidence > 100) reasons.push('CONFIDENCE_INVALID');
  if (typeof obj.reasoning !== 'string' || !obj.reasoning.trim()) reasons.push('REASONING_MISSING');
  if (obj.decision !== 'HOLD') reasons.push('EXECUTION_DISABLED');
  return { acceptedForResearch: reasons.length === 0, decision: 'HOLD', reasons: [...new Set(reasons)] };
}
