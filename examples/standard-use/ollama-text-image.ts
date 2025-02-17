#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl();

  // Register Ollama provider
  jorEl.providers.registerOllama();

  // System messages are required for Ollama
  jorEl.systemMessage = "You are an expert in describing images";

  // Register Ollama model which is capable of vision
  jorEl.models.register({
    model: "llama3.2-vision",
    provider: "ollama",
    setAsDefault: true,
  });

  // Load image
  const localImage = await ImageContent.fromFile("./image.png");

  // Pass image along with the question
  const response = await jorEl.text(["What is in this image?", localImage]);

  console.log(response);
};

void main();
