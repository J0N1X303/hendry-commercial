# Cold Call Cara — Version 1

**Investment status:** VALIDATE (not BUILD)
**Home:** `https://hendrycommercial.co.uk/cara/`
**Product:** A free, zero-API-cost, in-browser preparation and micro-coaching tool for prospect calls, introductions and follow-ups.

## Operating proposition
Before a real commercial contact, help the user make one better decision about their approach in approximately a minute. The real conversation is the practice, not an AI simulation.

User journey:
1. Choose call, introduction or follow-up.
2. Enter the subject/desired discovery, plus optional commercial context and anticipated difficulty.
3. Receive an opening, one open discovery question, an objection-handling approach and one behavioural improvement.
4. Make the real contact. Optionally reflect with one click.
5. Managers share specific short coaching challenges through `?skill=...`.

## Non-negotiable coaching principles
- **Open questions by default:** discovery questions should allow meaningful explanation. Closed questions are appropriate for permission, clarification, verification and agreeing a next step.
- **Neutrality:** do not presume the customer is unhappy, has problems, needs a supplier or intends to buy.
- **Curiosity before pitching:** a relevant reason to contact matters, but understanding the current situation comes first.
- **One question at a time:** never stack multiple discovery questions.
- **Listen before proceeding:** the next question should depend on the customer's answer, not a rigid script.
- **Respect boundaries:** recognise no fit, busy prospects and clear refusals. Avoid artificial urgency.
- **Source honesty:** no fabricated market signals, private intentions or claimed prospect research.
- **Useful guidance, not grades:** avoid invented performance scores or a default of congratulating every salesperson.

## Technical cost constraints
- Vanilla HTML, CSS and JavaScript. No build step, external AI API, account service or backend dependencies.
- No automatic research or sending user-entered prospect information to third-party services.
- Optional persistence is limited to the seller's offer in localStorage; clearing is supported.
- No microphone recording, voice imitation or call transcripts.

## Validation: do not call this a proven business
Initial evidence sought: genuine repeat use immediately before real contacts, manager-initiated sharing of specific coaching challenges, and reports of concrete changes to actual conversations. Stronger proof requires observable customer actions and eventually willingness to pay; feedback alone is insufficient.

Suggested kill test: if testers don't voluntarily return to Cara for at least three genuine prospect contacts, don't extend scope in the hope that additional features will generate engagement.

## Editorial QA
The final generated question is checked by `checkDiscoveryQuestion()` in `cara.js`. It must be an open question, not a bundle of questions, and cannot contain the listed leading phrases; a safe fallback is provided otherwise.

Before changing copy:
- Try a supplier-change scenario with an incumbent: no assumption that the incumbent is failing.
- Try a no-reply follow-up: no implication that the prospect owes a response.
- Try a busy buyer: respect time and a clear no.
- Try a new-product-launch scenario: do not assert a purchasing requirement.
- Try introductions by email as well as calls: no yes/no discovery in the primary approach.
- Verify a manager's `?skill=existing-supplier` deep link selects the correct coaching lesson.
- Check input text is rendered only via `textContent` and not HTML injection.
- Test on iPhone Safari and desktop Chrome before wider promotion.

No production site claims should be made until the merged code is actually served at the URL.
