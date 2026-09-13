# Recommended GitHub Ruleset for `main`

Create this in **Settings → Rules → Rulesets → New branch ruleset**.

## Ruleset

- Name: `Protect main`
- Enforcement status: `Active`
- Target branches: include `refs/heads/main`
- Bypass: repository administrators only (keep emergency/admin access for `Swervegod1`)

## Protections

Enable:

- Restrict deletions
- Block force pushes
- Require a pull request before merging
  - Required approvals: `0` for a solo-maintainer workflow
  - Dismiss stale approvals: optional
  - Require review from Code Owners: **off** while the repository has a single maintainer
- Require status checks to pass
  - Required check: `verify`
  - Require branches to be up to date before merging
- Require conversation resolution before merging
- Require linear history

Do **not** enable signed-commit enforcement unless every automated GitHub/Vercel/connector write path is configured to sign commits, otherwise routine automation can be blocked.

## Why this setup

This protects production from accidental force pushes and branch deletion, ensures the existing CI job runs before merge, and keeps a pull-request audit trail while preserving an administrator bypass for urgent production fixes.

## CODEOWNERS

The repository includes `.github/CODEOWNERS` assigning ownership to `@Swervegod1`, with explicit coverage for authentication, API, casino-security, provider-handoff, and GitHub workflow files.
