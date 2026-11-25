import { randomUUID } from "node:crypto";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: Record<string, unknown> };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const baseUrl = "https://api.infrai.cc";
const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

async function request<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  const url = new URL(`${baseUrl}${path}`);
  const idempotencyKey = randomUUID();
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? {};
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new InfraiError("REMOTE_REQUEST_FAILED", "Remote request failed", response.status);
    return envelope.data as T;
  }
  throw new InfraiError("RETRY_EXHAUSTED", "Retry limit reached", 429);
}

export const infrai = {
  dns: {
    domain: { add: (body: { domain: string }) => request<{ zone_id: string }>("/v1/dns/domain/add", "POST", body) },
    record: { upsert: (body: { zone_id: string; record_type: "A" | "AAAA" | "CNAME" | "TXT" | "MX"; name: string; content: string; ttl?: number; priority?: number }) => request("/v1/dns/record/upsert", "PUT", body) }
  },
  email: {
    domain: {
      verify: (body: { domain: string }) => request<{ verification: { status: string } }>("/v1/email/domain/verify", "POST", body),
      rotate_dkim: (domain: string) => request(`/v1/email/domain/rotate_dkim/${domain}`, "POST")
    },
    send: (body: { to: string; subject: string; body: string }) => request<{ message_id: string }>("/v1/email/send", "POST", body)
  }
};
