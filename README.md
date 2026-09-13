# Skooby.app

**Skooby.app** is a Web3-first crypto intelligence and wallet experience built to make on-chain activity easier to understand, explore, and use.

## Current product modules

### Wallet Intelligence — `/wallet`
- Privy authentication and embedded/linked wallet support
- Wagmi + Viem connection on Base
- Live connected address, chain ID, identity, and native balance
- Guardrails that keep wallet secrets out of the repository

### Crypto Market Tracker — `/market`
- Server-side market data proxy
- Major-asset USD prices
- 24-hour percentage movement
- Market capitalization
- Automatic client refresh with graceful provider failure handling

### Casino Integration Hub — `/casino`
- Isolated game-provider architecture
- Multi-game catalog UI
- Independently written integration shell inspired by `0xdivi-code/web3-casino`
- No real-money betting, deposits, withdrawals, payouts, or crypto wagering enabled

See [`docs/CASINO_INTEGRATION.md`](docs/CASINO_INTEGRATION.md) for the integration boundary and licensing notes.

## Core stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- Privy authentication and embedded wallets
- Wagmi + Viem for EVM wallet and chain interactions
- TanStack Query for client-side async state
- Base as the default EVM network foundation
- GitHub Actions for lint, typecheck, and production-build verification

## Local setup

```bash
git clone https://github.com/Swervegod1/skooby-app.git
cd skooby-app
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in your own values.

```env
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_BASE_RPC_URL=
```

Never commit private keys, API secrets, wallet seed phrases, Privy app secrets, or production credentials.

## Scripts

```bash
npm run dev       # local development
npm run build     # production build
npm run start     # serve production build
npm run lint      # lint the project
npm run typecheck # TypeScript validation
```

## Security

Skooby.app handles Web3-facing functionality, so secrets and signing credentials must remain server-side or in the appropriate wallet/provider system. See `SECURITY.md` before adding integrations that move funds, sign transactions, or authenticate users.

## Deployment

The app is structured for deployment on Vercel or another platform that supports modern Next.js applications. Add environment variables through the deployment platform rather than committing them to Git.

## Repository

Maintained by [Swervegod1](https://github.com/Swervegod1).

Website: https://skooby.app
