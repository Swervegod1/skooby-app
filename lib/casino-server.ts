import { randomInt } from 'node:crypto';

const routeMap = {
  slots: {
    spin: { method: 'POST', path: '/api/game/slots/spin' },
    history: { method: 'GET', path: '/api/game/slots/history' },
    config: { method: 'GET', path: '/api/game/slots/config' },
    leaderboard: { method: 'GET', path: '/api/game/slots/leaderboard' },
  },
  blackjack: {
    start: { method: 'POST', path: '/api/game/blackjack/start' },
    hit: { method: 'POST', path: '/api/game/blackjack/hit' },
    stand: { method: 'POST', path: '/api/game/blackjack/stand' },
    double: { method: 'POST', path: '/api/game/blackjack/double' },
    split: { method: 'POST', path: '/api/game/blackjack/split' },
  },
  baccarat: {
    start: { method: 'POST', path: '/api/game/baccarat/start' },
    history: { method: 'GET', path: '/api/game/baccarat/history' },
  },
  crash: {
    bet: { method: 'POST', path: '/api/game/crash/bet' },
    cashout: { method: 'POST', path: '/api/game/crash/cashout' },
    status: { method: 'GET', path: '/api/game/crash/status' },
  },
  dice: {
    roll: { method: 'POST', path: '/api/game/dice/roll' },
    history: { method: 'GET', path: '/api/game/dice/history' },
  },
  roulette: {
    bet: { method: 'POST', path: '/api/game/roulette/bet' },
    spin: { method: 'POST', path: '/api/game/roulette/spin' },
    result: { method: 'GET', path: '/api/game/roulette/result' },
  },
  poker: {
    join: { method: 'POST', path: '/api/game/poker/join' },
    bet: { method: 'POST', path: '/api/game/poker/bet' },
    fold: { method: 'POST', path: '/api/game/poker/fold' },
    action: { method: 'POST', path: '/api/game/poker/action' },
  },
} as const;

type GameName = keyof typeof routeMap;
type Payload = Record<string, unknown>;

type CasinoDispatchInput = {
  game: string;
  action: string;
  method: 'GET' | 'POST';
  payload?: Payload;
  authorization?: string | null;
};

type CasinoDispatchResult = {
  ok: boolean;
  status: number;
  mode: 'provider' | 'demo';
  body: unknown;
};

function normalizeBet(payload?: Payload) {
  const value = Number(payload?.bet ?? 10);
  if (!Number.isFinite(value)) return 10;
  return Math.min(10_000, Math.max(1, Math.round(value * 100) / 100));
}

function randomCard() {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suits = ['♠', '♥', '♦', '♣'];
  return `${ranks[randomInt(ranks.length)]}${suits[randomInt(suits.length)]}`;
}

function blackjackValue(card: string) {
  const rank = card.slice(0, -1);
  if (rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(rank)) return 10;
  return Number(rank);
}

function handValue(cards: string[]) {
  let total = cards.reduce((sum, card) => sum + blackjackValue(card), 0);
  let aces = cards.filter((card) => card.startsWith('A')).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function demoResponse(game: GameName, action: string, payload?: Payload) {
  const bet = normalizeBet(payload);

  if (game === 'slots') {
    if (action !== 'spin') return { message: 'Demo history is session-local.', items: [] };
    const symbols = ['🍒', '💎', '7️⃣', '🔔', '⭐', '🍋'];
    const reels = [symbols[randomInt(symbols.length)], symbols[randomInt(symbols.length)], symbols[randomInt(symbols.length)]];
    const counts = reels.map((symbol) => reels.filter((item) => item === symbol).length);
    const multiplier = counts.some((count) => count === 3) ? 8 : counts.some((count) => count === 2) ? 2 : 0;
    const payout = bet * multiplier;
    return { reels, bet, multiplier, payout, balanceDelta: payout - bet };
  }

  if (game === 'dice') {
    if (action !== 'roll') return { message: 'Demo history is session-local.', items: [] };
    const roll = randomInt(1, 7);
    const won = roll >= 4;
    const payout = won ? Math.round(bet * 1.8 * 100) / 100 : 0;
    return { roll, target: '4–6', bet, payout, won, balanceDelta: payout - bet };
  }

  if (game === 'roulette') {
    if (action !== 'spin' && action !== 'bet') return { lastResult: randomInt(0, 37) };
    const number = randomInt(0, 37);
    const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const color = number === 0 ? 'green' : red.has(number) ? 'red' : 'black';
    const choice = String(payload?.choice ?? 'red').toLowerCase();
    const numericChoice = Number(choice);
    const won = choice === color || (choice === 'even' && number !== 0 && number % 2 === 0) || (choice === 'odd' && number % 2 === 1) || (Number.isInteger(numericChoice) && numericChoice === number);
    const multiplier = Number.isInteger(numericChoice) ? 36 : 2;
    const payout = won ? bet * multiplier : 0;
    return { number, color, choice, bet, won, payout, balanceDelta: payout - bet };
  }

  if (game === 'blackjack') {
    if (action === 'hit') {
      const card = randomCard();
      return { card, message: 'Add this card to your current hand.' };
    }
    if (action === 'stand') {
      const dealer = [randomCard(), randomCard()];
      return { dealer, dealerValue: handValue(dealer), message: 'Demo dealer result.' };
    }
    const player = [randomCard(), randomCard()];
    const dealer = [randomCard(), '🂠'];
    return { player, playerValue: handValue(player), dealer, bet, balanceDelta: -bet };
  }

  if (game === 'baccarat') {
    const player = randomInt(0, 10);
    const banker = randomInt(0, 10);
    const outcome = player === banker ? 'tie' : player > banker ? 'player' : 'banker';
    const pick = String(payload?.choice ?? 'player').toLowerCase();
    const won = pick === outcome;
    const multiplier = outcome === 'tie' ? 8 : 2;
    const payout = won ? bet * multiplier : 0;
    return { player, banker, outcome, pick, bet, won, payout, balanceDelta: payout - bet };
  }

  if (game === 'crash') {
    const crashPoint = Math.round((1 + Math.random() ** 2 * 9) * 100) / 100;
    const target = Math.max(1.01, Math.min(10, Number(payload?.target ?? 2)));
    const won = target <= crashPoint;
    const payout = won ? Math.round(bet * target * 100) / 100 : 0;
    return { crashPoint, target, bet, won, payout, balanceDelta: payout - bet };
  }

  const cards = Array.from({ length: 5 }, randomCard);
  return { cards, bet, message: action === 'fold' ? 'Hand folded.' : 'Demo five-card hand.' };
}

function isKnownRoute(game: string, action: string): game is GameName {
  return game in routeMap && action in routeMap[game as GameName];
}

export function casinoProviderStatus() {
  return {
    configured: Boolean(process.env.CASINO_API_BASE_URL),
    demoFallback: process.env.CASINO_ALLOW_DEMO_FALLBACK !== 'false',
  };
}

export async function dispatchCasinoRequest(input: CasinoDispatchInput): Promise<CasinoDispatchResult> {
  const { game, action, method, payload } = input;

  if (!isKnownRoute(game, action)) {
    return { ok: false, status: 404, mode: 'demo', body: { error: 'Unknown casino game/action.' } };
  }

  const route = routeMap[game][action as keyof (typeof routeMap)[typeof game]] as { method: 'GET' | 'POST'; path: string };
  if (route.method !== method) {
    return { ok: false, status: 405, mode: 'demo', body: { error: `Use ${route.method} for this casino action.` } };
  }

  const baseUrl = process.env.CASINO_API_BASE_URL?.replace(/\/$/, '');
  if (baseUrl) {
    try {
      const providerToken = process.env.CASINO_API_TOKEN;
      const headers = new Headers({ Accept: 'application/json' });
      if (method === 'POST') headers.set('Content-Type', 'application/json');
      if (providerToken) headers.set('Authorization', `Bearer ${providerToken}`);

      const response = await fetch(`${baseUrl}${route.path}`, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(payload ?? {}) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });

      const contentType = response.headers.get('content-type') ?? '';
      const body = contentType.includes('application/json') ? await response.json() : { message: await response.text() };
      return { ok: response.ok, status: response.status, mode: 'provider', body };
    } catch (error) {
      if (process.env.CASINO_ALLOW_DEMO_FALLBACK === 'false') {
        return {
          ok: false,
          status: 502,
          mode: 'provider',
          body: { error: error instanceof Error ? error.message : 'Casino provider unavailable.' },
        };
      }
    }
  }

  return { ok: true, status: 200, mode: 'demo', body: demoResponse(game, action, payload) };
}
