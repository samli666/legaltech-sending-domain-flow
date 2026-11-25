import { strict as assert } from "node:assert";
import { followUpSubject, matterIntake } from "./domain_decision.ts";

const matter = matterIntake.parse({ clientEmail: "counsel@example.com", matterId: "MAT-42", deadline: "2026-10-26T12:00:00Z", signedDocumentName: "engagement.pdf" });
assert.equal(followUpSubject(matter, new Date("2026-10-24T12:00:00Z")), "Deadline follow-up for matter MAT-42");
console.log("domain decision test passed");
