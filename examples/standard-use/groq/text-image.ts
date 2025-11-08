#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    groq: true,
    systemMessage: "", // Important for this model to set this to an empty string
  });

  // Change to vision-capable model
  jorEl.models.setDefault("llama-3.2-11b-vision-preview");

  // Load image
  const localImage = await ImageContent.fromFile("../image.png");

  // Pass image along with the question
  const response = await jorEl.text(["Can you describe what is in this image?", localImage]);

  console.log(response);
};

void main();
