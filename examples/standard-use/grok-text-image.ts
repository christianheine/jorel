#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ grok: true });

  // Change to vision-capable model
  jorEl.models.setDefault("grok-2-vision-1212");

  // Load image
  const localImage = await ImageContent.fromFile("./image.png");

  // Pass image along with the question
  const response = await jorEl.text(["What is in this image?", localImage]);

  console.log(response);
};

void main();
