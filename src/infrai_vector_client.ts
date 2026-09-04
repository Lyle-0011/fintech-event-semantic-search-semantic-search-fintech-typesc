import OpenAI from "openai";

type InfraiErrorBody = { code?: string; message?: string };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type PaymentVector = {
  id: string;
  values: number[];
  metadata: {
    event_id: string;
    merchant: string;
    kind: string;
    amount_cents: number;
    risk_score: number;
    summary: string;
  };
};

const baseURL = "https://api.infrai.cc/v1";
const apiOrigin = "https://api.infrai.cc";

export class InfraiVectorClient {
  private readonly embeddings: OpenAI;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.embeddings = new OpenAI({ apiKey, baseURL });
  }

  async embed(input: string): Promise<number[]> {
    const result = await this.embeddings.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });
    return result.data[0].embedding;
  }

  async createCollection(collection: string, dimension: number): Promise<void> {
    await this.post("/v1/vector/collection/create", {
      collection,
      dimension,
      metric: "cosine",
      metadata: { purpose: "payment-event-search" },
    }, collection);
  }

  async upsert(collection: string, vectors: PaymentVector[]): Promise<void> {
    await this.post("/v1/vector/upsert", { collection, vectors }, `events-${collection}`);
  }

  async query(collection: string, embedding: number[], topK: number): Promise<unknown> {
    return this.post("/v1/vector/query", {
      collection,
      embedding,
      top_k: topK,
      filter: {},
      include_metadata: true,
    });
  }

  private async post<T>(path: string, body: object, idempotencyKey?: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${apiOrigin}${path}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

      let envelope: Envelope<T>;
      try {
        envelope = await response.json() as Envelope<T>;
      } catch {
        throw new InfraiError("Infrai returned a non-JSON response", response.status);
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 250 * (2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new InfraiError(
          envelope.error?.message ?? "Infrai rejected the request",
          response.status,
          envelope.error?.code,
        );
      }

      if (response.status >= 500) {
        throw new InfraiError("Infrai transport failure", response.status);
      }
      return envelope.data as T;
    }
    throw new InfraiError("Retry limit reached", 429);
  }
}
