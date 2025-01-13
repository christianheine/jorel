#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true }); // Uses process.env.OPENAI_API_KEY

  // When requesting metadata (third function parameter), the response will include additional information about the request
  const { response, meta } = await jorEl.ask(
    "What are the capitals of France and Germany?",
    {
      systemMessage: "Answer as succinctly as possible",
    },
    true,
  );

  console.log(response);
  // The capital of France is Paris, and the capital of Germany is Berlin.

  console.log(meta);
  // {
  //   model: 'gpt-4o-mini',
  //   provider: 'openai',
  //   durationMs: 730,
  //   inputTokens: 26,
  //   outputTokens: 16,
  // }
};

void main();
