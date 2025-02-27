#!/usr/bin/env ts-node

import { config } from "dotenv";
import { generateUserMessage, ImageContent, OpenAIProvider } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });

  const response = await provider.generateResponse(
    "gpt-4o-mini",
    [await generateUserMessage("What is the capital of France?")],
    { temperature: 0.1 },
  );

  console.log(response.content, response.meta);

  const image = await ImageContent.fromFile("./image.png");

  const imageResponse = await provider.generateResponse(
    "gpt-4o-mini",
    [await generateUserMessage(["What is in this image?", image])],
    { temperature: 0.1 },
  );

  console.log(imageResponse.content, imageResponse.meta);

  const stream = provider.generateResponseStream(
    "gpt-4o-mini",
    [await generateUserMessage("What is the capital of France?")],
    { temperature: 0.1 },
  );

  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    }
    if (chunk.type === "response") {
      console.log(chunk.meta);
    }
  }
};

void main();
