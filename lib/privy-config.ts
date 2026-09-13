export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmtz0m84b01jy0bl5127de4iv';

export const PRIVY_DEFAULT_JWKS_URL =
  `https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`;
