#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ vertexAi: true });

  // Will return a string
  const { response, meta } = await jorEl.text(
    "What is the capital of France?",
    {
      model: "gemini-1.5-flash-002",
    },
    true,
  );

  console.log(response);
  console.log(meta);
};

void main();
