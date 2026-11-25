import { z } from "zod";

export const matterIntake = z.object({
  clientEmail: z.string().email(),
  matterId: z.string().min(1),
  deadline: z.coerce.date(),
  signedDocumentName: z.string().min(1)
});

export type MatterIntake = z.infer<typeof matterIntake>;

export function followUpSubject(input: MatterIntake, now: Date): string {
  const days = Math.ceil((input.deadline.getTime() - now.getTime()) / 86_400_000);
  return days <= 2 ? `Deadline follow-up for matter ${input.matterId}` : `Signed document for matter ${input.matterId}`;
}

export function signedDelivery(input: MatterIntake): { to: string; subject: string; body: string } {
  return { to: input.clientEmail, subject: `Signed document for matter ${input.matterId}`, body: `${input.signedDocumentName} is ready for review.` };
}
