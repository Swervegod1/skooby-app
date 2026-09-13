import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { listAlerts, saveAlert } from '@/lib/cloud-store';

function validAddress(chain: 'bitcoin' | 'ethereum', address: string) {
  if (chain === 'ethereum') return /^0x[a-fA-F0-9]{40}$/.test(address);
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,90}$/.test(address);
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    return NextResponse.json({ alerts: await listAlerts(session.userId) });
  } catch {
    return NextResponse.json({ alerts: [], cloudSync: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = (await request.json()) as { chain?: 'bitcoin' | 'ethereum'; address?: string };
  if (!body.chain || !body.address || !validAddress(body.chain, body.address)) {
    return NextResponse.json({ error: 'Invalid chain or address.' }, { status: 400 });
  }
  try {
    return NextResponse.json({ alert: await saveAlert(session.userId, body.address, body.chain) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create alert.' }, { status: 503 });
  }
}
