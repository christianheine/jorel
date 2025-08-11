#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Get the underlying OpenAI client
  const openAiClient = jorEl.providers.openAi.getClient();

  console.log(openAiClient.baseURL);
};

void main();
