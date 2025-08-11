#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openRouter: true, // Uses OPEN_ROUTER_API_KEY environment variable
    systemMessage: "Answer as few words as possible",
  });

  // Register the Claude 3.7 Sonnet model from Anthropic via OpenRouter
  jorEl.providers.openRouter.addModel("anthropic/claude-3-7-sonnet");

  const response = await jorEl.text("What is the capital of France", {
    model: "anthropic/claude-3-7-sonnet",
  });

  console.log(response);
  // Paris

  // You can also stream the response
  console.log("\nStreaming response:");
  for await (const chunk of jorEl.stream("What is the capital of Italy", {
    model: "anthropic/claude-3-7-sonnet",
  })) {
    process.stdout.write(chunk);
  }
  console.log("\n");
};

void main();
