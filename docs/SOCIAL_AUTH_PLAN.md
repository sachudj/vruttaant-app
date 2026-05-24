# Social Authentication Plan (Google + Apple)

**Date**: May 24, 2026  
**Status**: Planned  
**Scope**: Add social sign-in (Google and Apple) while preserving the existing JWT access/refresh backend model.

## Execution Snapshot

- [x] O1. Data model + migration safety (compatibility baseline completed May 24, 2026)
- [x] O2. Backend social auth endpoint (baseline completed May 24, 2026)
- [x] O3. Mobile Google sign-in integration (baseline completed May 24, 2026)
- [x] O4. Mobile Apple sign-in integration (baseline completed May 24, 2026)
- [x] O5. Security hardening (nonce replay defense + explicit email-linking policy completed May 24, 2026)
- [ ] O6. Testing + validation
- [ ] O7. Documentation parity sweep

## Objectives

- Allow users to sign in with Google and Apple from the mobile app.
- Keep one unified backend session model: access token + refresh token.
- Preserve guest-first browsing and optional-auth behavior on public endpoints.
- Maintain compatibility with existing email/password users.

## Architecture Decision

Use **mobile provider SDK -> backend token verification -> existing JWT issuance**.

- Mobile receives provider identity token.
- Backend verifies provider token (issuer, audience, signature, expiry, nonce where required).
- Backend finds or creates user.
- Backend returns the same token payload currently used by `/api/v1/auth/login`.

This avoids introducing provider tokens into protected API routes and keeps all authorization unchanged.

## Implementation Tracks

### O1. Data Model + Migration Safety

- Update user model to support social identities:
  - Add `authProviders` array or provider-specific fields (`googleSub`, `appleSub`).
  - Make `passwordHash` optional for social-only accounts.
  - Keep `email` unique where present.
- Backward compatibility:
  - Existing password users remain valid.
  - Existing refresh-token/session behavior remains unchanged.

Acceptance criteria:
- Existing login/signup flow continues working without modifications to clients.
- New social users can be persisted without `passwordHash`.

### O2. Backend Social Auth Endpoint

- Add `POST /api/v1/auth/social` with payload:
  - `provider`: `google` | `apple`
  - `idToken`: string
  - `nonce`: optional for Google, required for Apple flow if generated on client
- Implement provider verification service:
  - Google: verify ID token against expected audience/client ID.
  - Apple: verify identity token claims and nonce rules.
- Map verified identity to user:
  - Match by provider subject first (`sub`), then controlled email-linking rule.
- Reuse existing JWT + refresh issuance and refresh-token storage.

Acceptance criteria:
- Valid provider token returns the same response shape as current login.
- Invalid/expired/mismatched tokens return standard 401/400 error envelope.

### O3. Mobile App Integration

- Add dependencies:
  - `google_sign_in`
  - `sign_in_with_apple`
- Extend auth service:
  - `loginWithGoogle()`
  - `loginWithApple()`
  - Both call backend `/api/v1/auth/social` and store JWTs exactly like password login.
- Update login sheet UI:
  - Add social buttons beneath existing email/password login.
  - Keep existing login as fallback.

Acceptance criteria:
- User can authenticate end-to-end using either provider.
- Existing token refresh, logout, and authenticated features continue working.

### O4. Security Hardening

- Add/verify env vars:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `APPLE_SERVICE_ID` or relevant audience value
  - `APPLE_TEAM_ID`, `APPLE_KEY_ID` only if needed for specific server-side validation path
- Add strict claim checks:
  - `iss`, `aud`, `exp`, `sub`
  - nonce replay protections for Apple if nonce is used
- Add account-linking policy:
  - Define whether same email across providers auto-links or requires explicit confirmation.

Acceptance criteria:
- Security tests for audience mismatch, token expiry, malformed token, and provider mismatch pass.

### O5. Testing + Validation

Backend tests:
- Unit tests for token verification adapters (mock external verification calls).
- Controller tests for success/failure cases and account linking.
- Contract tests for `/api/v1/auth/social` response parity with login.

Mobile tests:
- Service tests for social login success/failure parsing.
- Widget tests for social buttons and loading/error states.

Manual validation:
- Guest browsing still works.
- Social sign-in -> bookmarks/profile/preferences actions succeed.
- Logout revokes session and returns app to guest/auth-required prompts.

### O6. Documentation Updates

Required docs to update in same cycle:
- `docs/API_ENDPOINTS.md`
  - Add `/api/v1/auth/social` contract and examples.
- `docs/BACKEND.md`
  - Add social auth env vars and verification notes.
- `docs/MOBILE_APP.md`
  - Add provider setup steps for Android/iOS.
- `docs/SECRETS_POLICY.md`
  - Add OAuth credential handling and rotation guidance.
- `docs/ROADMAP.md`
  - Add Track O checklist and completion notes.
- `docs/PROJECT_STATUS.md`
  - Add social auth feature status when shipped.

## Suggested Execution Sequence (Low Risk)

1. O1 model prep and compatibility tests.
2. O2 backend endpoint with mocked verification tests.
3. O3 Google mobile integration first.
4. O3 Apple integration second (platform config complexity).
5. O4 hardening pass.
6. O5 final regression suite.
7. O6 docs parity sweep and Postman update.

## Rollout Strategy

- Phase 1: Release backend endpoint + Google login.
- Phase 2: Enable Apple login after iOS capability/provisioning verification.
- Keep email/password enabled at all times as fallback.

## Risks and Mitigations

- Apple setup complexity (certificates/capabilities):
  - Mitigation: separate Apple rollout phase and dedicated config checklist.
- Account collision/linking ambiguity:
  - Mitigation: explicit linking policy and test coverage.
- Provider SDK behavior changes:
  - Mitigation: pin package versions and add integration smoke tests.

## Definition of Done

- Google + Apple login working on supported platforms.
- Existing JWT auth flows unaffected.
- Security checks and automated tests passing.
- Docs and Postman collection updated in the same release.
- Session note added to roadmap with commit hash and rollback note.
