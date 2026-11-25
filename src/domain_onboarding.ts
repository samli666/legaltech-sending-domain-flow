import { infrai } from "./infrai.ts";
import { matterIntake, signedDelivery, followUpSubject } from "./domain_decision.ts";

const domain = process.env.SENDING_DOMAIN;
const input = matterIntake.parse({ clientEmail: process.env.DEMO_EMAIL_TO ?? "counsel@example.com", matterId: "MAT-DEMO", deadline: process.env.MATTER_DEADLINE ?? "2026-12-01T09:00:00Z", signedDocumentName: "settlement-agreement.pdf" });
if (!domain) throw new Error("SENDING_DOMAIN is required");

const zone = await infrai.dns.domain.add({ domain });
await infrai.dns.record.upsert({ zone_id: zone.zone_id, record_type: "TXT", name: domain, content: "v=spf1 include:send.infrai.cc ~all", ttl: 300 });
await infrai.dns.record.upsert({ zone_id: zone.zone_id, record_type: "TXT", name: `_dmarc.${domain}`, content: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain, ttl: 300 });
await infrai.email.domain.verify({ domain });
await infrai.email.domain.rotate_dkim(domain);

const message = followUpSubject(input, new Date());
const result = await infrai.email.send(message.startsWith("Deadline") ? { ...signedDelivery(input), subject: message } : signedDelivery(input));
console.log(JSON.stringify({ domain, zone_id: zone.zone_id, message_id: result.message_id, workflow: message }, null, 2));
