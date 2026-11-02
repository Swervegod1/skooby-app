import type { Metadata } from 'next';
import { OracleDashboard } from '@/components/oracle-dashboard';
import './oracle.css';

export const metadata: Metadata = {
  title: 'ORACLE X — Evidence before action',
  description: 'GHOST WHALE // ORACLE X: transparent spot-market research, reproducible forecasts and controlled paper trading by Skooby.',
  robots: { index: false, follow: false },
};
export default function OraclePage() { return <OracleDashboard />; }
