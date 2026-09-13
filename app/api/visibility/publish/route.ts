import { NextResponse } from 'next/server';
import { guides } from '@/lib/learn-content';
import {
  normalizeSkoobyUrls,
  sendVisibilityAnnouncements,
  submitIndexNow,
  verifyVisibilitySecret,
} from '@/lib/visibility';

const defaultUrls = [
  'https://skooby.app/',
  'https://skooby.app/tracker',
  'https://skooby.app/learn',
  'https://skooby.app/wallet',
  ...guides.map((guide) => `https://skooby.app/learn/${guide.slug}`),
];

export async function POST(request: Request) {
  if (!verifyVisibilitySecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      urls?: unknown;
      title?: unknown;
      message?: unknown;
    };

    const submitted = normalizeSkoobyUrls(body.urls);
    const urls = submitted.length ? submitted : normalizeSkoobyUrls(defaultUrls);
    const title = typeof body.title === 'string' ? body.title.slice(0, 120) : 'Skooby.app update';
    const message =
      typeof body.message === 'string'
        ? body.message.slice(0, 500)
        : 'Fresh Skooby crypto research and wallet-intelligence pages are live.';

    const settled = await Promise.allSettled([
      submitIndexNow(urls),
      sendVisibilityAnnouncements({ title, message, urls }),
    ]);

    return NextResponse.json({
      ok: true,
      urls,
      results: settled.map((result) =>
        result.status === 'fulfilled'
          ? { status: 'fulfilled', value: result.value }
          : { status: 'rejected', error: result.reason instanceof Error ? result.reason.message : 'Unknown error' },
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Visibility webhook failed.' },
      { status: 500 },
    );
  }
}
