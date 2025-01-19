#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  const jorEl = new JorEl({ openAI: true}); // Uses process.env.OPENAI_API_KEY

  const response = await jorEl.ask("What is the capital of France?", {
    model: "gpt-4o-mini",
    systemMessage: "You are a helpful assistant",
    temperature: 0.5,
  });

  console.log(response);
};

void main();
