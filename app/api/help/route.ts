import { NextResponse } from 'next/server';

const ROUTES = `
Skooby routes:
- /tracker: server-cached crypto market radar, Bitcoin/Ethereum public-address analysis, wallet relationship graphs, cloud casebooks and alerts.
- /learn: interactive Bitcoin/Ethereum education, gas tools, transaction diagrams.
- /wallet: Privy wallet connection and Base wallet intelligence.
- /account: synced investigations, alerts, usage and account access.
- /#gpu-giveaway: free-entry RTX 5090 giveaway form.
`;

function fallback(question: string) {
  const text = question.toLowerCase();
  if (/(giveaway|gpu|5090|raffle)/.test(text)) return 'The RTX 5090 giveaway form is at the bottom of the Skooby homepage. Entry is free and limited to one registration per email.';
  if (/(learn|gas|bitcoin|ethereum)/.test(text)) return 'Open Skooby Learn for interactive Bitcoin and Ethereum guides, including gas-fee tools and visual transaction flows.';
  if (/(account|alert|casebook|login)/.test(text)) return 'Open your Account Command Center for synced investigations, public-wallet alerts, and usage information.';
  if (/(wallet|connect|base|balance)/.test(text)) return 'Use Wallet Intelligence to connect through Privy and inspect wallet identity and Base balance data without sharing a seed phrase.';
  return 'Use Crypto Tracker to investigate public Bitcoin or Ethereum addresses, map wallet relationships, and save research to your casebook.';
}

function extractText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return '';
  const pieces: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const typed = part as { type?: string; text?: string };
      if (typed.type === 'output_text' && typeof typed.text === 'string') pieces.push(typed.text);
    }
  }
  return pieces.join('\n').trim();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: unknown };
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (!question) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ answer: fallback(question), mode: 'guided' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_HELP_MODEL || 'gpt-5.6-luna',
        store: false,
        max_output_tokens: 220,
        input: [
          {
            role: 'developer',
            content: `You are the Skooby.app Help Associate. Give short, friendly product-navigation help using only the listed Skooby capabilities. Do not provide financial, investment, gambling, or legal advice. Never ask for passwords, seed phrases, private keys, or financial credentials. If the user asks for something outside Skooby, explain that you can help them find the right Skooby feature. ${ROUTES}`,
          },
          { role: 'user', content: question },
        ],
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`OpenAI request failed (${response.status}).`);
    const payload = (await response.json()) as unknown;
    const answer = extractText(payload) || fallback(question);
    return NextResponse.json({ answer, mode: 'ai' });
  } catch (error) {
    console.error('Help Associate AI fallback:', error);
    return NextResponse.json({ answer: fallback(question), mode: 'guided' });
  }
}
