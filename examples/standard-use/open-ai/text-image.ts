#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  // Load image
  const localImage = await ImageContent.fromFile("../image.png");

  // Pass image along with the question
  const response = await jorEl.text(["Can you describe what is in this image?", localImage]);

  console.log(response);
  // The image features a character wearing
  // a futuristic, armored suit that has glowing
  // blue accents.The individual has dark hair
  // and a serious expression, suggesting a moment
  // of contemplation or readiness.
  // The background appears to be a dimly lit,
  // high-tech environment, enhancing the sci-fi
  // aesthetic of the scene.
};

void main();
