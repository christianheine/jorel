#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // When requesting metadata, the JorEl will return additional information
  const { response, meta, messages } = await jorEl.text(
    "What are the capitals of France and Germany?",
    {
      systemMessage: "Answer as succinctly as possible",
    },
    true, // Request metadata
  );

  console.log(response);
  // The capital of France is Paris, and the capital of Germany is Berlin.

  console.log(meta);
  // {
  //   model: 'gpt-4o-mini',
  //   provider: 'openai',
  //   temperature: 0,
  //   durationMs: 757,
  //   inputTokens: 26,
  //   outputTokens: 16
  // }

  console.log(messages);
  // [
  //   {
  //     id: 'a473376f-0c12-4ae6-b449-c2e9cb75c27d',
  //     role: 'system',
  //     content: 'Answer as succinctly as possible',
  //     createdAt: 1737504961402
  //   },
  //   {
  //     id: '16fb56cc-2cd8-4663-976c-bc8a123d9bce',
  //     role: 'user',
  //     content: 'What are the capitals of France and Germany?',
  //     createdAt: 1737504961402
  //   }
  // ]
};

void main();
