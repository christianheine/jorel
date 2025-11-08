#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openRouter: { useNativeSDK: true } });

  jorEl.providers.openRouter.addModel("anthropic/claude-haiku-4.5");

  // Will return a string
  const response = await jorEl.text("How many r's are in `strawberry`?", {
    reasoningEffort: "high",
  });

  console.log(response);
  // There are 3 r's in "strawberry."
};

void main();
