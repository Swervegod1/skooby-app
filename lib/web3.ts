import { createConfig } from '@privy-io/wagmi';
import { http } from 'wagmi';
import { base } from 'wagmi/chains';

const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: rpcUrl ? http(rpcUrl) : http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
