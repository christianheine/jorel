#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    vertexAi: {
      location: process.env.GCP_LOCATION,
      project: process.env.GCP_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  });

  // Change to vision-capable model
  jorEl.models.setDefault("gemini-1.5-flash-001");

  // Load image
  const localImage = await ImageContent.fromFile("./image.png");

  // Pass image along with the question
  const response = await jorEl.ask(["Can you describe what is in this image?", localImage]);

  console.log(response);
};

void main();
