import { NextResponse } from 'next/server';
import { saveGiveawayEntry } from '@/lib/giveaway-store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = cleanText(body.name, 80);
    const email = cleanText(body.email, 160).toLowerCase();
    const reason = cleanText(body.reason, 800);
    const website = cleanText(body.website, 200);

    // Honeypot: normal users never fill this field.
    if (website) return NextResponse.json({ ok: true });

    if (name.length < 2) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (reason.length < 20) {
      return NextResponse.json({ error: 'Tell us a little more about why winning would matter to you.' }, { status: 400 });
    }

    const result = await saveGiveawayEntry({ name, email, reason });
    if (result.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    return NextResponse.json({ ok: true, duplicate: false });
  } catch (error) {
    console.error('Giveaway entry failed:', error);
    return NextResponse.json(
      { error: 'Entry is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }
}
