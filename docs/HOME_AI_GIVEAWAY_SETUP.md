# Homepage AI Help + GPU Giveaway setup

## Giveaway storage

The RTX 5090 giveaway form stores entries server-side in Redis. Configure:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The browser never writes giveaway entries directly to Redis. `/api/giveaway` validates name, email, and reason, uses a hidden honeypot field for basic bot filtering, and prevents duplicate registrations by hashing the normalized email into a Redis deduplication key. The stored entry includes the submitted name, normalized email, reason, and timestamp so an eligible winner can be contacted.

Do not use localStorage for giveaway entry data.

## Skooby AI Help Associate

The homepage Help Associate always works in guided mode. To enable server-side AI responses, configure:

- `OPENAI_API_KEY`
- `OPENAI_HELP_MODEL` (optional; defaults to `gpt-5.6-luna`)

The AI request is made only from `/api/help`; the API key is never exposed to the browser. The Responses API call uses `store: false` and instructs the assistant to provide product-navigation help only. If the AI request fails or the key is absent, the endpoint returns Skooby's built-in guided answer instead.

## Promotion notes

- The intended prize is one GeForce RTX 5090 graphics card.
- Entry is free and no purchase is required.
- One registration is accepted per email address.
- The promotion is independently operated by Skooby.app and does not imply NVIDIA sponsorship or administration.
- Keep `/giveaway-rules` current before winner selection, including any material changes to eligibility, dates, prize availability, or administration.
