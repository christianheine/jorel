#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance with pre-initialized OpenAI provider (and default models)
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
  });

  const response = await jorEl.ask("What is the capital of France, in one word?");

  console.log(response);
  // Paris
};

void main();
