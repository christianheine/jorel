#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAiAzure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiUrl: process.env.AZURE_OPENAI_ENDPOINT,
    },
    systemMessage: "Answer with as few words as possible",
  });

  jorEl.providers.openAiAzure.addModel("gpt-5-mini", true, {
    reasoningEffort: "minimal",
    verbosity: "low",
  });

  const response = await jorEl.text("What is the capital of France");

  console.log(response);
  // Paris
};

void main();
