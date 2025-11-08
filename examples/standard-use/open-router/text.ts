#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openRouter: { useNativeSDK: true },
    systemMessage: "Answer as few words as possible",
  });

  jorEl.providers.openRouter.addModel("minimax/minimax-m2:free");

  const response = await jorEl.text("What is the capital of France");

  console.log(response);
  // Paris

  // You can also stream the response
  console.log("\nStreaming response:");

  for await (const chunk of jorEl.stream("What is the capital of Italy")) {
    process.stdout.write(chunk);
  }
  console.log("\n");
};

void main();
