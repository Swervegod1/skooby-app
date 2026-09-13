# Skooby.app Project Workspace

This branch is a safe duplicate of the current production codebase for launch, growth, deployment, security, billing, SEO, and product work.

## Working branch

`Skooby-app-project`

## Primary project tracker

GitHub Issue #5 — **Skooby.app Website Launch & Growth Project**

## Objectives

- Ship Skooby.app on Vercel with the custom domain configured correctly.
- Keep Privy authentication, signed sessions, and provider handoffs secure.
- Finish the Free → Pro conversion funnel and Stripe billing.
- Complete cloud-synced tracker/casebook/alerts infrastructure.
- Expand interactive learning content and wallet visualizations.
- Improve discoverability with sitemap, robots, IndexNow, metadata, repository topics, and opt-in announcement webhooks.
- Protect `main` with a branch ruleset and required CI.
- Use this project branch for experiments before changes are promoted to production.

## Promotion workflow

1. Make and verify changes in `skooby-app-project` or a short-lived feature branch.
2. Run lint, typecheck, and production build.
3. Review security-sensitive changes.
4. Open a pull request to `main`.
5. Require CI `verify` to pass before merge.
6. Let Vercel produce a preview deployment before production promotion.

## Production safety

Never commit API keys, wallet secrets, private keys, seed phrases, Stripe secrets, Redis tokens, webhook secrets, or server signing secrets. Use Vercel environment variables for production credentials.
