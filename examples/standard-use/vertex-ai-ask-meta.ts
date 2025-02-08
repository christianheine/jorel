#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    vertexAi: {
      location: process.env.GCP_LOCATION,
      project: process.env.GCP_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  });

  // Will return a string
  const { response, meta } = await jorEl.ask(
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
