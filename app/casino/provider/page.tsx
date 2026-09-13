import type { Metadata } from 'next';
import ProviderHandoff from '@/components/provider-handoff';

export const metadata: Metadata = {
  title: 'Connecting to Casino Provider | Skooby',
  description: 'Secure handoff from Skooby to the configured external casino provider.',
};

export default function CasinoProviderPage() {
  return <ProviderHandoff />;
}
