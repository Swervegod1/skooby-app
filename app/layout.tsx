import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://skooby.app'),
  title: {
    default: 'Skooby.app — Follow the Money',
    template: '%s | Skooby.app',
  },
  description:
    'Skooby.app makes crypto wallets, transactions, tokens, and on-chain activity easier to understand.',
  keywords: [
    'crypto tracker',
    'wallet tracker',
    'Web3',
    'Base',
    'blockchain',
    'crypto portfolio',
    'on-chain analytics',
  ],
  openGraph: {
    title: 'Skooby.app — Follow the Money',
    description: 'Understand wallets, transactions, tokens, and on-chain activity without the noise.',
    url: 'https://skooby.app',
    siteName: 'Skooby.app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skooby.app — Follow the Money',
    description: 'Understand wallets, transactions, tokens, and on-chain activity without the noise.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
