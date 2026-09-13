# Visibility Webhooks

Skooby includes a signed server endpoint at `/api/visibility/publish` for legitimate discovery and announcement automation.

## Environment variables

Configure these in the deployment platform:

- `VISIBILITY_WEBHOOK_SECRET` — required, unique random value with at least 32 characters.
- `INDEXNOW_KEY` — optional IndexNow key used for URL discovery submissions.
- `DISCORD_ANNOUNCEMENT_WEBHOOK_URL` — optional Discord announcement webhook.
- `SLACK_ANNOUNCEMENT_WEBHOOK_URL` — optional Slack announcement webhook.

The endpoint only accepts canonical `https://skooby.app` / `https://www.skooby.app` URLs. It never accepts a caller-supplied outbound webhook destination.

## Call the webhook

Send a POST request to:

`https://skooby.app/api/visibility/publish`

Header:

`Authorization: Bearer <VISIBILITY_WEBHOOK_SECRET>`

Example body:

```json
{
  "title": "New Skooby research is live",
  "message": "Fresh wallet intelligence and crypto education pages are available.",
  "urls": [
    "https://skooby.app/tracker",
    "https://skooby.app/learn"
  ]
}
```

If `urls` is omitted, the route submits the homepage, tracker, learning hub, wallet page, and every current learning guide.

## Visibility behavior

- IndexNow receives canonical Skooby URLs when `INDEXNOW_KEY` is configured.
- The IndexNow verification key is served at `/indexnow-key.txt`.
- Discord announcements are only sent to official `discord.com` / `discordapp.com` webhook URLs.
- Slack announcements are only sent to official `hooks.slack.com` webhook URLs.
- Failed providers do not expose secrets in the response.

## Recommended triggers

Use this endpoint after a successful production deployment or when a new public guide/page is published. Good sources include a Vercel deployment webhook, GitHub Actions after a successful production CI run, or a trusted CMS publish hook.

Do not trigger the endpoint for private account pages, user-specific data, or every minor content edit.
