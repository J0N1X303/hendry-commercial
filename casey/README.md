# Cold Call Casey

Public section: https://hendrycommercial.co.uk/casey/

Restored from the preserved V4.3 interface on 2 November 2026 at the owner's request. No account, Basic password, Cloudflare Access, invitation list, admin view, D1 database or saved server-side history is used. An offering can optionally be remembered in the visitor's local browser; Clear local data removes it. Inputs are sent to Cloudflare Workers AI for generation, without application logging of prompts or results.

Cloudflare Pages serves the custom domain and builds `functions/casey/api.js`. Its Workers AI binding must be named `AI` in production and preview. The separate static Worker is not the custom domain host. Existing Buyer Readiness functions, database and secrets remain independent and must be preserved.

The inference module lives in `lib/casey-prep.js`, outside the Pages route tree. It sends one AI request, with a single question-only repair when needed, and streams real acknowledgement/heartbeat messages. Browser sends one POST per click, keeps form contents on errors and does not automatically resend ambiguous failures. Existing best-effort per-isolate IP throttling remains; it is not a strict account-wide spending cap.

The invitation beta branch is superseded and must not be merged. Retire its separately provisioned `casey-beta` database only after checking that no retained records are needed. Historical deployments retain their old code; removing passwords from this public release does not rewrite archived deployments.

Run `node tests/casey-api.mjs` for stateless API and streaming regression checks. Verify actual call, introduction email and follow-up generation on the deployed Pages preview and production before handing off. No automatic email sending is implemented.
