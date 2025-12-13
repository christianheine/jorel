#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  const jorEl = new JorEl({ openAI: true });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  const response = await jorEl.text("What is the capital of France?", {
    model: "gpt-5-nano",
    systemMessage: "You are a helpful assistant",
    temperature: 0.5,
  });

  console.log(response);
};

void main();
