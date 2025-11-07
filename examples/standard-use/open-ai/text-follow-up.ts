#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env", quiet: true });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  const { response, messages } = await jorEl.text(
    "What is the capital of France",
    {
      systemMessage: "Answer as few words as possible",
    },
    true,
  );

  console.log(response);
  // Paris

  const followUpResponse = await jorEl.text("And Germany?", {
    messageHistory: messages,
    systemMessage: "Answer with additional details",
  });

  console.log(followUpResponse);
  // The capital of Germany is Berlin. Berlin is not only the largest city in Germany
  // but also a significant cultural, political, and historical center in Europe.
  // It is known for its rich history, vibrant arts scene, and landmarks such as the
  // Brandenburg Gate, the Berlin Wall, and Museum Island.
};

void main();
