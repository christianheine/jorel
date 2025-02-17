#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    anthropic: true, // Uses // Uses process.env.ANTHROPIC_API_KEY
    grok: true, // Uses process.env.GROK_API_KEY
    groq: true, // Uses process.env.GROQ_API_KEY
    mistral: true, // Uses process.env.MISTRAL_API_KEY
    ollama: true, // No API key needed
    openAI: true, // Uses process.env.OPENAI_API_KEY
    vertexAi: true, //  Uses process.env.GOOGLE_APPLICATION_CREDENTIALS, process.env.GCP_LOCATION, process.env.GCP_PROJECT
  });

  // Will return a string
  const response = await jorEl.text("What is the capital of France?");

  console.log(response);
};

void main();
