#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: {apiKey: process.env.OPENAI_API_KEY},
  });

  // When requesting metadata (third function parameter), the response will include additional information about the request
  const {response, meta} = await jorEl.ask("What are the capitals of France and Germany?", {
    systemMessage: "Answer as succinctly as possible",
  }, true);

  console.log(response);
  // The capital of France is Paris, and the capital of Germany is Berlin.

  console.log(meta);
  // {
  //   _provider: 'OpenAIProvider',
  //   provider: 'openai'
  //   model: 'gpt-4o-mini',
  //   durationMs: 1469,
  //   inputTokens: 26,
  //   outputTokens: 16,
  // }
};

void main();