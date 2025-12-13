#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ vertexAi: true });

  // Register a model
  jorEl.providers.vertexAi.addModel("gemini-2.5-flash");

  // Will return a string
  const response = await jorEl.text("What is the capital of France?");

  console.log(response);
};

void main();
