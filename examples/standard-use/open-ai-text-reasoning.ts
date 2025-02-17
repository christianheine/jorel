#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Will return a string
  const response = await jorEl.text("How many r's are in `strawberry`?", {
    model: "o1-mini",
    systemMessage: "", // o1-mini doesn't support system messages, so we pass an empty string
  });

  console.log(response);
  // The word **"strawberry"** contains **three** letter **"r"**s. Here's the breakdown:
  // ...
};

void main();
