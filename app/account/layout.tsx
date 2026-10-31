import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
