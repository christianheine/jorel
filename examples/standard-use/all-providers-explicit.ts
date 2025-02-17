#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    grok: {
      apiKey: process.env.GROK_API_KEY,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY,
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY,
    },
    ollama: {},
    openAI: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    vertexAi: {
      location: process.env.GCP_LOCATION,
      project: process.env.GCP_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  });

  // Will return a string
  const response = await jorEl.text("What is the capital of France?");

  console.log(response);
};

void main();
