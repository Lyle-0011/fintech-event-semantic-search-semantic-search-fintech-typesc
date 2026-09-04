import { InfraiVectorClient } from "../src/infrai_vector_client.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the demo");

const client = new InfraiVectorClient(apiKey);
const collection = process.env.INFRAI_COLLECTION ?? "payment-events";
const embedding = await client.embed("unusual high value international transfer");
const result = await client.query(collection, embedding, 2);
console.log(JSON.stringify(result, null, 2));
