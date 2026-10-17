# Beta deployment status — 17 October 2026

This operational update supersedes the Pages deployment instructions in README.md. The existing Cloudflare integration uses Workers Previews, not Pages.

- Actual build failure: missing `previews` configuration block.
- Fixed using `beta-worker.js`, a standalone Worker that verifies configuration and Access identity before any hostname response or static asset. Only index.html, beta.js and beta.css are routed; repository source files are never served.
- Preview deployment verified Ready for commit `19e3101895ce67ffdda46950693f52b9de822a55`. Dashboard shows AI, ASSETS and CASEY_BETA_DB bindings.
- Dedicated D1 `casey-beta` created, UUID `ede992d4-2687-44ff-be3b-032d8ea3e88d`. Applied `migrations/casey-beta/0001_beta_runs.sql` through its dashboard console. This does not update Wrangler's migration tracking table; the SQL is idempotent.
- Preview D1 binding is defined in `previews.d1_databases`; no production D1 binding added.
- `CASEY_BETA_ENABLED=false` in both configuration sections. Hosted beta page visibly denies access.
- Public main and the existing private /casey/ deployment were not deployed or changed. This beta hostname serves only the beta interface after authentication.
- No merge or invitations. External testing/public launch hold remains until 1 November 2026 or explicit legal clearance.

## Blocker and next steps

Cloudflare Zero Trust is not activated on the account. Its Free activation checkout requires payment details, Terms acceptance and consent to excess-usage charges. Account owner must complete activation. No payment details or agreements were submitted by this task.

After activation, create a self-hosted Access application covering only the beta Preview hostname (and its version hostname, or use the appropriate Preview-specific Worker destination). Do not apply a blanket Access change to public main or other previews. Use One-time PIN with an explicit email allowlist; initial administrator requested by owner is `jonny.hendry@outlook.com`, with no testers yet supplied. Copy actual team issuer and application AUD to preview configuration, alongside allowed/admin email lists. Keep disabled until configured and approved for admin testing. Changes to Wrangler-managed vars must be recorded consistently to avoid a later deployment resetting dashboard values.

## Verification

`node scripts/test-beta.mjs` passes locally with real signed RS256 test tokens, local SQLite and mocked AI/JWKS. Covers expiry, issuer, audience, invite allowlist, per-user history/detail isolation, admin list/detail, successful input/result persistence, failure persistence, feedback, deletion and asset routing. Separate checks passed for disabled/missing/forged identity on seven routes with GET and POST.

These are not real Cloudflare OTP or Workers AI tests. Hosted email login, non-invited denial, per-user/admin acceptance and actual AI-to-D1 logging must still be tested. A second approved test identity is needed for hosted cross-user isolation. Never claim this beta ready before those checks pass. Retention remains lazy deletion after 30 days; no daily expiry job was added.
