#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance with pre-initialized Mistral provider (and default models)
  const jorEl = new JorEl({
    mistral: true, // Uses process.env.MISTRAL_API_KEY
    systemMessage: "Answer in as few words as possible",
  });

  const response = await jorEl.ask("What is the capital of France?");

  console.log(response);
  // Paris
};

void main();
