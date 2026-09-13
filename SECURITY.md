# Security Policy

Skooby.app includes wallet and Web3 integrations. Treat authentication, signing, and transaction code as security-sensitive.

## Never commit

- Private keys or seed phrases
- Privy app secrets
- Exchange API secrets
- Database passwords
- RPC provider secrets that grant privileged access
- Session signing keys
- Production `.env` files

Public browser identifiers such as `NEXT_PUBLIC_PRIVY_APP_ID` may be exposed to the client by design, but server-side secrets must never use a `NEXT_PUBLIC_` prefix.

## Wallet safety

- Never request or store a user's seed phrase.
- Do not sign transactions without clearly showing what the user is approving.
- Validate chain IDs, contract addresses, amounts, token decimals, and destinations before transaction submission.
- Treat third-party contract integrations as untrusted until reviewed.
- Use testnets or low-value test wallets during development.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, private keys, or user data. Contact the repository owner privately with a concise reproduction and impact description.
