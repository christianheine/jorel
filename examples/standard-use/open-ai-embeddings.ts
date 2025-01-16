#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Will return an array of numbers (length is determined by the model)
  const response = await jorEl.embed("Embeddings are really just numbers");

  console.log(response.slice(0, 10), `... (${response.length} total)`);
};

void main();
