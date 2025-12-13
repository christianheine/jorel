#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ mistral: true });

  // Register a model
  jorEl.providers.mistral.addModel("mistral-medium-latest");

  const response = await jorEl.embed("What is the capital of France?");

  console.log(response);
  //[ -0.00006461143493652344, 0.00905609130859375, ... ]
};

void main();
