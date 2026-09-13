import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { deleteCasebookEntry, listCasebook, saveCasebookEntry } from '@/lib/cloud-store';

function validAddress(chain: 'bitcoin' | 'ethereum', address: string) {
  if (chain === 'ethereum') return /^0x[a-fA-F0-9]{40}$/.test(address);
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,90}$/.test(address);
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    return NextResponse.json({ entries: await listCasebook(session.userId) });
  } catch {
    return NextResponse.json({ entries: [], cloudSync: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = (await request.json()) as { chain?: 'bitcoin' | 'ethereum'; address?: string; label?: string };
  if (!body.chain || !body.address || !validAddress(body.chain, body.address)) {
    return NextResponse.json({ error: 'Invalid chain or address.' }, { status: 400 });
  }
  try {
    const entry = await saveCasebookEntry(session.userId, {
      chain: body.chain,
      address: body.address,
      label: body.label?.trim().slice(0, 80) || undefined,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save case.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing case ID.' }, { status: 400 });
  try {
    return NextResponse.json({ deleted: await deleteCasebookEntry(session.userId, id) });
  } catch {
    return NextResponse.json({ error: 'Unable to delete case.' }, { status: 503 });
  }
}
