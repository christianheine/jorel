#!/usr/bin/env ts-node

import { config } from "dotenv";
import { generateUserMessage } from "../../src";
import { GoogleGenerativeAIProvider } from "../../src/providers";

config({ path: "../../.env" });

const main = async () => {
  const provider = new GoogleGenerativeAIProvider({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  });

  const models = await provider.getAvailableModels();
  console.log("Available models:", models);

  const response = await provider.generateResponse(
    "gemini-2.0-flash-001",
    [await generateUserMessage("What is the capital of France?")],
    { temperature: 0.1 },
  );

  console.log("\nResponse:", response.content);
  console.log("Meta:", response.meta);

  const stream = provider.generateResponseStream(
    "gemini-2.0-flash-001",
    [await generateUserMessage("Tell me a short story about a cat.")],
    { temperature: 0.7 },
  );

  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    }
    if (chunk.type === "response") {
      console.log("\nMeta:", chunk.meta);
    }
  }
};

void main();
