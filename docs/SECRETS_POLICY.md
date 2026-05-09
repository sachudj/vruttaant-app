# Secrets Management Policy

## Purpose

Define how secrets are created, stored, rotated, and revoked for Vruttaant environments.

## Scope

Applies to:

- GitHub Actions secrets
- Backend runtime credentials
- Third-party API keys (LLM, monitoring)
- Local development secrets

## Core Rules

1. Never commit secrets to source control.
2. Use environment variables for all runtime secrets.
3. Separate secrets by environment (`dev`, `staging`, `prod`).
4. Use least privilege for each credential.
5. Rotate credentials on schedule and after any suspected exposure.

## Storage Standards

- GitHub CI/CD: store in repository or environment-level GitHub Secrets.
- Local development: use `backend/.env` only for non-production credentials.
- Production: inject via deployment platform secret manager (not checked into repo).

## Required Environment Variables

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MONGODB_URI`
- `SENTRY_DSN` (if enabled)
- LLM provider key(s) as configured in backend service

## Rotation Policy

- High-risk secrets (JWT signing keys, DB creds): every 90 days.
- Third-party API keys: every 90 days or provider policy, whichever is stricter.
- Immediate rotation on team member offboarding or security incident.

## Incident Procedure

If a secret is exposed:

1. Revoke/rotate immediately.
2. Invalidate dependent tokens/sessions if applicable.
3. Audit logs for abuse window.
4. Open incident note in `docs/` with timeline and remediation.

## Verification Checklist

- CI runs secret scanning (Trivy secret scanner).
- `.env` files are git-ignored.
- Release checklist confirms production secret rotation date is current.
