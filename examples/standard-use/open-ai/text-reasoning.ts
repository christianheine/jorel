#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  jorEl.models.setDefault("o1-mini");

  // Will return a string
  const response = await jorEl.text("How many r's are in `strawberry`?");

  console.log(response);
  // The word **"strawberry"** contains **three** letter **"r"**s. Here's the breakdown:
  // ...
};

void main();
