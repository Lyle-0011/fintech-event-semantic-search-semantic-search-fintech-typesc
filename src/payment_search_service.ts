import { createServer } from "node:http";
import { z } from "zod";
import { InfraiError, InfraiVectorClient } from "./infrai_vector_client.js";
import { chooseRiskAction, type SearchMatch } from "./risk_action.js";

const searchBody = z.object({
  query: z.string().min(3).max(300),
  top_k: z.number().int().min(1).max(20).default(5),
});

const matchSchema = z.object({
  metadata: z.object({
    event_id: z.string(),
    risk_score: z.number().min(0).max(100),
  }),
}).passthrough();

const queryResultSchema = z.object({ matches: z.array(matchSchema) });
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const collection = process.env.INFRAI_COLLECTION ?? "payment-events";
const client = new InfraiVectorClient(apiKey);

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/search") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = searchBody.parse(await readJson(request));
    const embedding = await client.embed(input.query);
    const raw = await client.query(collection, embedding, input.top_k);
    const parsed = queryResultSchema.parse(raw);
    const matches: SearchMatch[] = parsed.matches.map(({ metadata }) => metadata);
    send(response, 200, {
      query: input.query,
      matches: parsed.matches,
      action: chooseRiskAction(matches),
      notification: matches.length > 0 ? "audit_event_search_recorded" : "no_match_recorded",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      send(response, 400, { error: "Invalid request", details: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.message, code: error.code });
      return;
    }
    send(response, 500, { error: "Request processing failed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Payment search listening on http://localhost:${port}`));
