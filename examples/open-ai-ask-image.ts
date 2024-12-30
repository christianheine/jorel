#!/usr/bin/env ts-node

import {config} from "dotenv";
import {ImageContent, JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({
    openAI: {apiKey: process.env.OPENAI_API_KEY},
  });

  // Load image
  const localImage = await ImageContent.fromFile("./image.png");

  // Pass image along with the question
  const response = await jorEl.ask(["Can you describe what is in this image?", localImage]);

  console.log(response);
};

void main();