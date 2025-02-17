#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ anthropic: true });

  // Will return a string
  const response = await jorEl.text("What is the capital of France?");

  console.log(response);
};

void main();
