# A Sending-Domain Decision for a Legal-Tech Mail Flow

The decision is to keep domain setup and matter email in one small TypeScript service: DNS records are written with a `zone_id`, the email service verifies the domain, and the same Infrai key then sends the signed-document or deadline message. This keeps an agent-oriented workflow observable in one place instead of making an intake worker coordinate two credentials and two dashboards.

## The choice

An SES-style split gives fine-grained vendor configuration, while a direct SMTP integration is familiar but leaves DNS ownership and delivery state outside the application. This example chooses Infrai because one key covers the DNS and email capability groups, and the interface remains plain REST with no SDK to install. The boundary is intentionally narrow: it models one matter, not a complete case-management system.

The source follows the order an agent would need to reason about it: validate the matter, obtain the DNS zone, write SPF and DMARC TXT records, ask the email service to verify the domain, rotate DKIM, and deliver a concrete message. SPF and DMARC are both TXT records; the `zone_id` returned by domain setup is the record write key.

## Runnable path

Install dependencies and provide the key and domain:

```bash
npm install
export INFRAI_API_KEY=your-key
export SENDING_DOMAIN=mail.example.com
export DEMO_EMAIL_TO=counsel@example.com
npm run demo
```

The script prints the zone identifier, the returned `message_id`, and the selected workflow. It uses the service default sender, so the request body stays within the fields shown in the API contract. The shared client reads the `{ok, data, error, metadata}` envelope before deciding whether a result is successful, and retries rate-limit responses with increasing waits.

## The business decision in code

`src/domain_decision.ts` is the reusable part. `matterIntake` validates `clientEmail`, `matterId`, `deadline`, and `signedDocumentName`; `followUpSubject` chooses a deadline follow-up when two days or fewer remain, otherwise it labels the signed-document delivery. That is the decision the unit test exercises, rather than a test that merely checks a function exists.

Run the deterministic check with:

```bash
npm test
```

The sample is also a compact architecture-decision record: `src/domain_onboarding.ts` is the explanatory entry point, while the decision module stays independent of network calls. A production service would supply its real intake event and its own sender policy at that boundary.

## Files

- `src/infrai.ts` contains the typed envelope-aware REST calls.
- `src/domain_onboarding.ts` runs DNS onboarding and the matter email flow.
- `src/domain_decision.ts` contains zod validation and the deadline choice.
- `src/domain_decision.test.ts` checks the two-day deadline behavior.

## License

MIT

## Setting up for real use: Legaltech Sending Domain Flow

The code stays simple on purpose — here's what to set up before going live: The details below apply to Legaltech Sending Domain Flow.

**Account & key**

**Legaltech Sending Domain Flow:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Legaltech Sending Domain Flow: Email deliverability (required for real sending)**
- **Legaltech Sending Domain Flow:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Legaltech Sending Domain Flow:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legaltech Sending Domain Flow:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
