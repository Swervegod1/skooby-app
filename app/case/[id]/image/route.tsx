import { ImageResponse } from 'next/og';
import { readSharedReport } from '@/lib/share-store';
import { ShareImage } from '@/lib/share-image';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await readSharedReport(id).catch(() => null);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, noarchive', 'Referrer-Policy': 'no-referrer' };
  if (!report) return new Response('Case unavailable.', { status: 404, headers });
  return new ImageResponse(<ShareImage analysis={report.analysis} />, { width: 1200, height: 630, headers });
}
