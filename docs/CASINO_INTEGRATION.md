# Casino Integration Boundary

Skooby.app includes a dedicated `/casino` product surface inspired by the architecture of `0xdivi-code/web3-casino`.

Reference repository: https://github.com/0xdivi-code/web3-casino

## What Skooby uses

- A separate game-provider surface rather than mixing game code into wallet analytics.
- A catalog-style UI that can represent multiple games.
- An adapter boundary where a reviewed provider could be connected later.
- Clear separation between authentication, wallet intelligence, and gaming modules.

## What Skooby does not import

The referenced repository does not declare a top-level repository license. Skooby therefore does not copy its application source wholesale. The current integration is independently written and uses the reference only as architectural inspiration.

The Skooby implementation also does not enable:

- real-money bets;
- token or crypto wagering;
- deposits or withdrawals for gaming;
- automated payouts;
- hidden wallet signing;
- custody of user funds.

## Production requirements

Any future production gaming provider should remain disabled until the operator has completed the legal, licensing, jurisdiction, age-verification/KYC, responsible-gaming, security, and provider-contract review required for the intended markets.

## Security boundary

Game-provider code must never receive seed phrases, private keys, Privy app secrets, or unrestricted signing credentials. Wallet transactions, if ever introduced for a reviewed non-gambling use case, must present the chain, contract, asset, amount, and destination to the user before approval.
