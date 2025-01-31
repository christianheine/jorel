#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: { apiKey: process.env.OPENAI_API_KEY },
  });

  // Will return a string
  const response = await jorEl.ask("How many r's are in `strawberry`?", {
    model: "o1-mini",
    systemMessage: "", // o1-mini doesn't support system messages, so we need to pass an empty string
  });

  console.log(response);
  // The word **"strawberry"** contains **three** letter **"r"**s. Here's the breakdown:
  //
  // - **s**
  // - **t**
  // - **r**
  // - **a**
  // - **w**
  // - **b**
  // - **e**
  // - **r**
  // - **r**
  // - **y**
  //
  // So, the **"r"** appears three times in "strawberry."
};

void main();
