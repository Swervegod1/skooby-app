# Wallet case reports release

## Product behavior

The home page leads to a no-login address lookup or an explicitly fictional demo. A result contains exact native-coin amounts, a bounded transaction graph, three factual summary statements, source receipts, a capture timestamp, and coverage limitations. These statements are deterministic; no AI model invents labels or ownership claims.

Bitcoin graphs link inputs and outputs through a transaction node. They do not infer which input funded which output, or identify people. Ethereum is native ETH data reported by BlockCypher; tokens, NFTs, and internal contract traces are outside this release. Provider data and execution outcomes are not independently audited. An observed balance or relationship is not a risk score or investment recommendation.

Public research pages do not load the Privy/Wagmi providers. Account, wallet, and casino layouts retain their authentication providers. The existing learning widget accepts the new exact-value response format.

## Configuration

| Variable | Purpose |
| --- | --- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Shared reports, distributed request limits, private casebooks, daily counters |
| `APP_SESSION_SECRET` | At least 32 random characters for account sessions; also salts request-limit identities |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Existing account and wallet login |
| `BLOCKCYPHER_API_TOKEN` | Optional server-side Ethereum provider token |
| `TRUST_PROXY_HEADERS` | Defaults false; set true only after verifying that the hosting ingress overwrites `x-forwarded-for` |

Without Redis, public analysis has a bounded per-process limiter and share creation returns 503 with a card-export fallback. Without trusted proxy headers, limits use a shared bucket: 30 analyses/minute and six share creations/hour. Verify the hosting header contract before enabling per-IP limits. Multiple instances require Redis for distributed limits. Provider rate limits still apply and should be monitored during a launch.

## Sharing and privacy

`POST /api/reports` requires JSON, a supported chain/address, explicit `consent: true`, a same-origin browser request, and the share rate limit. It fetches fresh data server-side; supplied balances and summary text are ignored. The result contains a random 128-bit report ID, seven-day expiry, and a separate 256-bit removal token. Redis stores only the token hash.

`DELETE /api/reports/:id` requires that removal token in the body. Public page data never includes the hash or token. The browser stores its controls in sessionStorage; closing that tab can lose removal access. All reports expire automatically. The page and image use dynamic rendering and no-store responses. Search metadata requests no indexing, and shared URLs are absent from the sitemap. Noindex is not access control: anyone with the URL can view the report. External preview caches, screenshots, and downloaded images cannot be recalled.

Private casebook entries are never read by the sharing endpoint. Downloading a PNG renders locally in the browser. `/privacy` explains these boundaries before launch.

## Measurement

Allowlisted counters: `demo_opened`, `analysis_completed`, `card_downloaded`, `share_created`, `share_revoked`, `share_opened`, and `referral_started`. The last event means a successful analysis after arriving through the shared-page CTA. Daily hashes expire after 90 days. Client counters honor Do Not Track and Global Privacy Control. No visitor IDs, report IDs, addresses, or referrer URLs enter these counters. Hosting/provider infrastructure may maintain its own logs.

Read a day without exposing Redis credentials to the browser:

```bash
node --env-file=.env.local scripts/growth-report.mjs 2026-10-31
```

These are event totals, not unique users, attribution, retention, or proof of virality. Bots, retries, multiple events, and privacy controls affect them. Do not report ratios as user conversion rates.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:smoke
```

The tests cover Bitcoin multi-input/change accounting, duplicate transactions, coinbase inputs, graph caps, wei precision, Ethereum fees and ambiguous records, invalid input, provider failures, request size/origin guards, Redis TTL behavior, token disclosure, revocation, and failure to persist. Fixtures are synthetic and persistence tests mock the Redis REST contract.

Deployment checks: open the demo at narrow and wide widths; inspect graph nodes with keyboard and touch; download a card; inspect a real BTC and ETH address; create a link; open it in another browser; verify preview image, source links, and noindex; remove it from the original tab and confirm page/image unavailability. Confirm real Redis expiry, deployment headers, and provider quotas in the hosting environment. Local tests do not establish that production credentials exist or that a deployed website is healthy.

Watchlists remain saved preferences, with no automatic delivery worker. No trending placement, acquisition, or paid subscription entitlement is implied by this release.
