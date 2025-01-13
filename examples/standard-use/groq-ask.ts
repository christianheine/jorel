#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    groq: { apiKey: process.env.GROQ_API_KEY },
  });

  // Will return a string
  const response = await jorEl.ask("What is the capital of France?", {
    model: "llama-3.1-8b-instant",
  });

  console.log(response);
};

void main();
