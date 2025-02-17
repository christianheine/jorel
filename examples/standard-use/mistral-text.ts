#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    mistral: true,
    systemMessage: "Answer in as few words as possible",
  });

  const response = await jorEl.text("What is the capital of France?");

  console.log(response);
  // Paris
};

void main();
