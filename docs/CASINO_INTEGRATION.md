# Skooby Casino Integration

Skooby.app includes a dedicated `/casino` play-credit product surface modeled on the public API contract documented by `0xdivi-code/web3-casino`.

Reference repository: https://github.com/0xdivi-code/web3-casino

## Architecture

- Privy remains Skooby's browser authentication and wallet layer.
- Casino traffic stays behind dedicated `/api/game/*` routes.
- Sandbox provider credentials are server-only.
- If no sandbox provider is configured, Skooby runs its built-in play-credit simulation engine.
- No deposit, withdrawal, cash-payout, custody, or real-money wallet endpoints are exposed by Skooby.
- An optional external-provider handoff can send users to a separately operated provider site; any account funding, withdrawals, custody, payouts, or regulated gaming activity remain on that provider's service and terms.

## External provider handoff

Set `CASINO_PUBLIC_LAUNCH_URL` to the provider's public launch URL and optionally set `CASINO_PROVIDER_NAME` for display. When configured, `/casino` displays an `Open provider` handoff link.

Skooby does not proxy funding or withdrawal requests through this handoff and does not receive provider wallet credentials or custody user funds.

## Supported game routes

- `POST /api/game/slots/spin`
- `GET /api/game/slots/history`
- `GET /api/game/slots/config`
- `GET /api/game/slots/leaderboard`
- `POST /api/game/blackjack/start`
- `POST /api/game/blackjack/hit`
- `POST /api/game/blackjack/stand`
- `POST /api/game/blackjack/double`
- `POST /api/game/blackjack/split`
- `POST /api/game/baccarat/start`
- `GET /api/game/baccarat/history`
- `POST /api/game/crash/bet`
- `POST /api/game/crash/cashout`
- `GET /api/game/crash/status`
- `POST /api/game/dice/roll`
- `GET /api/game/dice/history`
- `POST /api/game/roulette/bet`
- `POST /api/game/roulette/spin`
- `GET /api/game/roulette/result`
- `POST /api/game/poker/join`
- `POST /api/game/poker/bet`
- `POST /api/game/poker/fold`
- `POST /api/game/poker/action`

## Demo mode

When `CASINO_API_BASE_URL` is empty, the routes use Skooby's local simulation engine. Demo credits have no cash value and are not persisted.

## Sandbox provider mode

Set `CASINO_API_BASE_URL` to a test/sandbox deployment that implements the referenced game paths. If the sandbox requires a server bearer token, set `CASINO_API_TOKEN`. The browser never receives this token.

If the sandbox is unavailable, Skooby falls back to demo mode unless `CASINO_ALLOW_DEMO_FALLBACK=false`.

## Licensing boundary

The referenced repository does not declare a top-level project license. Skooby therefore does not copy the referenced application source wholesale. The implementation in this repository is independently written around the documented API shape.

## Security boundary

Game-provider code must never receive seed phrases, private keys, Privy app secrets, or unrestricted signing credentials. Keep all provider credentials outside `NEXT_PUBLIC_*` variables.
