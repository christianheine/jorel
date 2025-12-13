#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ groq: true });

  jorEl.providers.groq.addModel("llama-3.1-8b-instant");

  // Will return a string
  const response = await jorEl.text("What is the capital of France?", {
    model: "llama-3.1-8b-instant",
  });

  console.log(response);
};

void main();
