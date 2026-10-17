# Cold Call Casey — Invitation-only beta (NOT YET ENABLED)

**Status:** Implementation branch only. Default **CLOSED**. Existing `/casey/` preview and public main have not been modified. **Do not merge, expose, or invite external testers before 1 November 2026 / appropriate legal clearance.**

## What this branch adds

- `/casey-beta/` — standalone mobile-ready beta interface for calls and sales emails, with one consent checkbox before submission.
- Cloudflare Access email OTP for each *invited* person, administered in Cloudflare Zero Trust. The app does not generate invitation emails or OTPs itself.
- `functions/_beta/auth.js` cryptographically verifies Cloudflare Access **RS256 JWT**, issuer, audience, expiry, issued-at/not-before, email and invited-user allowlist; no identity supplied by the browser is trusted. Unconfigured = DENIED.
- `functions/casey-beta/api.js` reuses existing Casey AI coaching engine, stores user email, inputs, outputs, status, errors, latency and feedback in Cloudflare D1, with per-email 12/hour cap. The existing AI content rules stay in place.
- Per-tester history and record details, admin-only recent records, voluntary feedback and self-service deletion.
- Detailed data auto-excluded from results after 30 days, and expired entries deleted lazily on API reads or new submissions. A daily Cron Trigger is required for **guaranteed calendar-day deletion** even with no traffic; not installed in this build.
- No prospect data included in Access JWT, URL, browser history or Git commits; record details are JSON over authenticated responses.

## Required Cloudflare setup (must be completed by account owner before enabling)

1. **Create a SEPARATE Cloudflare Pages preview/test deployment** from branch `feature/casey-invite-beta-20261017`, not the live production site. Verify custom preview hostname and protect the **entire hostname** with Cloudflare Access before testing. Cloudflare's preview deployment domain must be covered by the Access app and policy.
2. In Cloudflare Zero Trust → Access → Applications, create a self-hosted application for the actual beta preview hostname. Sign-in method: **One-time PIN**. Policy: **Allow** only specific invited email addresses; administrators must also be allowed. Do not select Everyone. Capture the Application AUD tag and the team domain `https://<team>.cloudflareaccess.com` for environment variables.
3. Create a **D1 database** (suggest `casey-beta`). Apply `migrations/casey-beta/0001_beta_runs.sql` using D1 migration tooling/dashboard. Bind it to the **preview** Pages project as `CASEY_BETA_DB`. Do not point it at an unrelated production database. Set `CASEY_BETA_ENABLED` to `true` **only after** the Access app, database and all required variables are ready.
4. Set preview-only environment variables:
   - `CASEY_BETA_ENABLED=true`
   - `CASEY_BETA_TEAM_DOMAIN=https://<team>.cloudflareaccess.com`
   - `CASEY_BETA_AUD=<Access application AUD tag>`
   - `CASEY_BETA_ALLOWED_EMAILS=<comma-separated invited emails including administrator>`
   - `CASEY_BETA_ADMIN_EMAILS=<comma-separated administrator emails, subset of allowed>`
   - Preview `AI` binding (existing Casey model)
   - Preview `CASEY_BETA_DB` D1 database binding.
5. Make sure the beta preview deploys with the latest Git branch. Visit `/casey-beta/` as an invited identity, validate Access one-time-PIN login, generate a fictional call, and confirm a single row appears in D1 with both user email and saved AI result. Test another user: **cannot** read the first user's record by guessing its UUID. Confirm a non-invited account gets blocked by Access AND by server allowlist. Confirm admin detail access; ordinary user cannot see admin list. Check delete.
6. Do not put private API tokens or session cookies in Git. Keep JWT issuer/AUD and tester allowlists as configuration, not in public source. Inform testers in writing before inviting them that their *inputs and outputs* will be stored and visible to the administrator. No live client confidential data.

## Beta data and privacy

Tables contain: verified Access email and subject, submission time, preparation channel, goal, seller description, buyer description, model-generated result JSON (when successful), status, error code, processing time, feedback choice and optional free-text comment. Entries are filtered out after 30 days and removed on subsequent API activity. Explicit acknowledgment is required before generation. Testers can delete all their records; admin can review all active records. No password storage in D1. Treat the invitation list and prospective customer details as personal data; finalise privacy notice/legal basis and deletion/export requests before external testing.

## Outstanding limitations / signoff

- **Cloudflare Access and D1 have not been created or configured through this repository.** Beta route returns 503/403 until configured.
- Existing `/casey/` private preview still uses shared legacy Basic credentials; it must **not** be sent to invitees.
- No Cloudflare operational logs or real first-attempt benchmark were available during build.
- 12/hour per-email limit is an application budget safeguard but not strict concurrency-safe accounting. Before broader launch use Cloudflare WAF/rate limiting plus a transactional counter or queue.
- Admin list currently shows up to 100 recent active records. Automatic daily scheduled expiry without traffic and export of records remain future work.
- Manual beta user acceptance and UK GDPR privacy review are still required before inviting external testers.

## Acceptance checklist

- [ ] Access protects the hostname and email PIN identity is verified.
- [ ] D1 migration and binding are applied in **preview** environment.
- [ ] No invitee can see another invitee's detailed inputs or outputs.
- [ ] Admin can review inputs, outputs, feedback and errors.
- [ ] Saved data gets filtered/deleted after 30 days; set up daily cron for exact-time erasure.
- [ ] Zero access when `CASEY_BETA_ENABLED` is missing/false.
- [ ] No confidential employer/customer material in beta test data.
- [ ] Public `main` unchanged; legal timing cleared before invitations.
