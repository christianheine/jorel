#!/usr/bin/env ts-node

import { config } from "dotenv";
import { ImageContent, JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ mistral: true });

  jorEl.models.setDefault("pixtral-large-latest");

  // Load image
  const localImage = await ImageContent.fromFile("../image.png");

  // Pass image along with the question
  const response = await jorEl.text(["Can you describe what is in this image?", localImage]);

  console.log(response);
  // This image features a man in a futuristic, high-tech suit.
  // The suit is predominantly black with blue glowing accents,
  // particularly on the chest area where there is a distinctive,
  // V-shaped design. The man has short, dark hair and a serious
  // expression on his face. The background appears to be a dimly lit,
  // possibly industrial or technological setting, which adds to the
  // overall sci-fi aesthetic of the image. The lighting highlights
  // the man and his suit, making them the focal point of the image.
};

void main();
