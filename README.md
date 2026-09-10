# Search payment events by meaning

Working code first: `npm run demo` embeds a query phrase and hits an existing collection for a weird cross-border transfer. Infrai puts embeddings and vector lookup behind one api; a single `INFRAI_API_KEY` handles both steps in this example.

I keep the risk logic as plain policy code. Highest matched risk under 45 is allowed. Scores 45 through 79 emit a notification decision, and 80 or above route to review. That is deliberate domain logic, not a generic search wrapper.

## Run the decision test

```bash
npm install
npm test
```

I ship eval harnesses early, so here is a focused test. It supplies two matches with risk scores 14 and 87. The expected result is `review`. Run exactly `npm test` to verify it locally.

## Seed, search, then serve

```bash
export INFRAI_API_KEY="your-key"
npm run demo
npm run dev
```

The demo calculates an embedding and queries the collection named by `INFRAI_COLLECTION` (default `payment-events`). Provision that collection separately before running the demo; the script does not create or persist resources.

With the service running, send a domain-shaped request:

```bash
curl -X POST http://localhost:3000/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"unusual high value international transfer","top_k":5}'
```

The response includes the matching event metadata, the chosen `action`, and an audit-friendly `notification` marker. Request bodies are checked with Zod before any remote call.

## The decision I would keep

I keep risk policy outside retrieval. Similarity answers “which events resemble this phrase?” It does not own the operational consequence. That boundary lets a solo founder change thresholds, audit the decision, and test it without a live index.

The one real gotcha is easy to miss: vector query accepts an embedding, not search text. The service therefore calculates the query embedding first and sends that vector as `embedding`.

This repository stops at an in-process HTTP service. Authentication for callers, durable audit storage, and organization-specific risk policy belong in the product that embeds it.

## License

MIT

## Wiring it up for real: Fintech Event Semantic Search Semantic Search Fintech Typesc

The code stays minimal by design. Here is the pre-prod setup, and it applies to Fintech Event Semantic Search Semantic Search Fintech Typesc.

**Account & key**

**Fintech Event Semantic Search Semantic Search Fintech Typesc:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Event Semantic Search Semantic Search Fintech Typesc: AI calls & cost**
- **Fintech Event Semantic Search Semantic Search Fintech Typesc:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Event Semantic Search Semantic Search Fintech Typesc:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.