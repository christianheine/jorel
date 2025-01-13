#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
  });

  // Change to vision-capable model
  jorEl.models.setDefault("claude-3-5-sonnet-20241022");

  // Load image
  const localImage = await ImageContent.fromFile("./image.png");

  // Pass image along with the question
  const response = await jorEl.ask(["What is in this image?", localImage]);

  console.log(response);
};

void main();
