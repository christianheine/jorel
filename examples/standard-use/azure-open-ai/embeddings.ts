#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAiAzure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiUrl: process.env.AZURE_OPENAI_ENDPOINT,
    },
  });

  jorEl.models.embeddings.register({
    model: "text-embedding-3-small",
    dimensions: 1536,
    provider: "openai-azure",
    setAsDefault: true,
  });
  // jorEl.models.embeddings.register({ model: "text-embedding-3-large", dimensions: 3072, provider: "openai-azure" });

  // Will return an array of numbers (length is determined by the model)
  const response = await jorEl.embed("Embeddings are really just numbers");

  console.log(response.slice(0, 10), `... (${response.length} total)`);
};

void main();
