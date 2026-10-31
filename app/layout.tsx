import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './case.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://skooby.app'),
  title: {
    default: 'Skooby — Follow the blockchain trail',
    template: '%s | Skooby.app',
  },
  description:
    'Turn a public Bitcoin or Ethereum address into a readable case file with transaction maps, source-linked evidence and shareable cards.',
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
    title: 'Skooby — Follow the blockchain trail',
    description: 'Readable evidence. Transaction maps. Shareable case files.',
    url: 'https://skooby.app',
    siteName: 'Skooby.app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Skooby — Follow the blockchain trail',
    description: 'Readable evidence. Transaction maps. Shareable case files.',
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

