# Cold Call Casey — V3 pre-launch test

**Investment decision: VALIDATE — not BUILD**  
**Brand:** Cold Call Casey (formerly Cold Call Cara).  
**Release:** withheld from Hendry Commercial production until 1 November 2026 and appropriate legal clearance.  
**Private test:** `/casey/` on a Cloudflare Pages branch preview, protected by the existing Basic Auth credentials (username still `cara` by deliberate user choice; password unchanged).

## What Casey does

A short, context-aware coach for actual prospect calls, first emails and follow-ups. The objective is one useful behaviour change before making real contact, not roleplay and not a generic email generator.

The user enters a buyer situation and a seller offering (saved only locally if requested). Casey uses Cloudflare Workers AI, not external website research, to return:

1. **Commercial hypothesis:** why the contact might be relevant, with facts clearly distinguished from assumptions.
2. **Opening:** natural spoken language for calls, or one complete email draft for an email channel.
3. **Initial discovery:** one relevant, open, neutral question.
4. **Intelligent follow-up:** a **different**, open question that explores a distinct dimension after the buyer responds.
5. **Listen for:** specific unknowns or signals and their implication for relevance.
6. **If they push back:** human, respectful handling without assuming dissatisfaction.
7. **One thing to try:** real behavioural coaching with a reason.
8. **Don't assume:** one explicit evidential/psychological boundary.

For **calls**, initial and follow-up discovery questions are distinct on screen, and the caller gets listening cues. For **email**, the initial question is included **once** in the complete copyable email; the separately displayed question is the different, future question **only if they respond**. Do not display or duplicate the sent question elsewhere as coaching. This was a V2 failure and is a regression test.

## Coaching standards

- A buyer has their own reality; their priorities, constraints, supplier arrangements, buying intentions and even relevance are initially unknown.
- Open discovery questions by default. Closed questions only for permission, clarification, verification and confirming next steps.
- One meaningful question at a time. Follow the answer, don't interrogate or simply work through a prepared sequence.
- Avoid leading and problem-assuming questions.
- Translate the seller capability into a *possible*, not invented, buyer outcome.
- Sound human and commercially competent: shorter, more relevant, less pitchy.
- Respect their time and a clear no; qualifying out is a useful result.
- Never claim buyer research or intelligence absent from input.
- Do not reward pressuring for a meeting or invent performance scores.

## Architecture and privacy

- Pages preview requires Cloudflare `AI` binding in preview environment.
- Backend: `functions/api/casey-prep.js`, private route `functions/casey/api.js`.
- Private auth: `functions/_middleware.js` intercepts `/casey/*`; blocks direct unprotected API `/api/casey-prep` and old `/cara` routes.
- Frontend: `casey/index.html`, `casey/casey.js`, `casey/casey.css`.
- No prospect web research or permanent user submissions storage. User context is sent for inference; avoid confidential/customer personal data in tests.
- Existing remembered seller offer migrates from Cara V1/V2 localStorage keys. User credentials unchanged.
- Git branch `archive/cara-v2-pre-casey-20261016` retains unmodified previous version, independently of the Casey work.
- This is NOT a zero-cost unlimited free API: Workers AI usage and quotas still apply.

## Required regression tests

- Hall & Woodhouse menu printing: seller offers menu printing with pre-approved templates and four-day turnaround; user merely knows prospect is linked to menus. Casey must NOT invent menu-change frequency, dissatisfaction, number of sites or a procurement project.
- First email: output contains exactly one initial open question; output panel shows a DIFFERENT question for a later reply. Copy email must not repeat question or copy all coaching text.
- Follow-up: do not claim a previous conversation unless the context supplies it.
- Call: natural human opening and one separate open discovery question, with concrete listening signals and a distinct potential next question.
- Existing supplier: accept good incumbent fit rather than seeking to undermine them.
- Busy prospect or clear refusal: respect it, qualify out where appropriate.
- Error responses: insufficient input, no binding, rate-limit, quality failure and service unavailable must not blame adequate inputs.
- Mobile iPhone browser, desktop, copy, keyboard accessibility, private password gate and noindex.
- Public `main`: no Casey/Cara files, live routes, homepage tile or sitemap entry before launch.

Do not merge the test branch into production until user approval following legal review.

## V3.1 commercial-coaching refinement (16 October 2026)

Following hands-on seller testing, four output areas have been rebuilt:
- Commercial objective: articulate the underlying conditional buyer decision or trade-off, plus the evidence that would establish relevance.
- Listen for: exactly three conditional signals, each split into what to notice, what that could mean, and the next appropriate move.
- Pushback: three separate pathways: reframe where receptive; reposition/reconnect with permission if timing is wrong; and respect a clear no. Buyer statements and seller responses must never be confused.
- Don't assume: scenario-specific assumption linked to a concrete verification or open discovery method.

The primary response is visible, other pushback options are expandable. Outbound email contains one question only; the other coaching questions never appear inside the copied draft.

Structured regression checks cover all three channels, 3 signals, 3 pushbacks, neutral open discovery, clear refusal, copy behaviour, and client DOM references. These checks do not establish live-model quality, latency, physical phone layout or deployment authentication: those require live testing before launch.

DO NOT merge or publicly launch before 1 November 2026 and owner approval.

## V3.2 reliability correction — quality errors after the V3.1 expansion

The live preview was reported rejecting otherwise sufficient seller and prospect inputs as 'generation_quality' after two AI drafts. Diagnosis: V3.1 demanded all 3 signals, all 3 pushback paths, exact string lengths, nested strict JSON schema and every optional field. That combination was brittle for Llama 3.3 70B on Cloudflare Workers AI.

Correction:
- Request simple JSON object rather than strict nested `json_schema` on the initial attempt; fall back to instructed plain JSON on retry.
- Permit two substantive conditional signals rather than fail the whole card if one is missing.
- Keep a specific model-generated reframe; omit an unavailable secondary reconnect option instead of inventing sales language.
- Use a deterministic safe close for a missing/unsafe 'do not contact' response.
- Do not require an `angle_test` or `verify` paragraph for the rest of a commercially useful card to be shown. Hide missing optional elements.
- Never relax initial/follow-up open-question validation, the prohibition on leading questions in reframes, ground-to-input checks, or hallucinated buyer facts.
- Return an error reason code without sending buyer/seller text back to logs. Do not record raw AI drafts.

Regression tests cover full and partial responses, call/email duplication, closing down after clear no, direct endpoint authentication and missing browser elements. No confirmed live-authenticated model call was available to this development environment: final judgement requires using the private preview.

Keep V3.1 archived on branch `archive/casey-v3-1-before-reliability-20261016`. Public production remains without Casey.

## V3.3 first-request reliability and progress (16 October 2026)

Reported user symptoms: first submission sometimes times out at 28 seconds or suffers a brief network failure; an identical immediate retry often works. Root cause is not conclusively known (could involve slow first model invocation, network conditions or preview authentication), but the 28-second client timeout was objectively shorter than the server's possible two attempts.

Changes:
- Extend single request deadline to 70 seconds, preserving existing user inputs throughout.
- Show a responsive, accessible **indeterminate** progress bar and elapsed time, explicitly not a made-up percent complete.
- After 12 seconds advise that AI generation is still running; after 40 seconds explain that response is slower than normal.
- On an early fetch-level TypeError occurring within ten seconds, automatically retry the network call **once**, after 800ms. Never repeat after lengthy generation, an HTTP response, a 429, or timeout: re-invoking the model could waste quota.
- Keep submission disabled during work, restore it when done, stop the timers and hide progress on success/failure.
- Preserve the current local storage behavior, unchanged preview password, and the November release hold.

QA: JS compiles, every referenced DOM ID exists, one test simulates early network failure then successful retry, and the progress UI is indeterminate and respects reduced-motion settings. Live model latency and real-world iPhone testing must be observed by the user; a successful Cloudflare preview build alone does not verify them.
