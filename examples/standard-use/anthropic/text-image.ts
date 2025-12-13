#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ anthropic: true });

  // Register a model
  jorEl.providers.anthropic.addModel("claude-haiku-4-5");

  // Change to vision-capable model
  jorEl.models.setDefault("claude-haiku-4-5");

  // Load image
  const localImage = await ImageContent.fromFile("../image.png");

  // Pass image along with the question
  const response = await jorEl.text(["What is in this image?", localImage]);

  console.log(response);
};

void main();
