#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true, logLevel: "debug" });

  jorEl.models.setModelSpecificDefaults("gpt-5-mini", {
    reasoningEffort: "high",
    verbosity: "low",
  });

  jorEl.models.setDefault("gpt-5-mini");

  // Will return a string
  const response = await jorEl.text("How many r's are in `strawberry`?");

  console.log(response);
  // There are 3 r's in "strawberry."
};

void main();
