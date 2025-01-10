#!/usr/bin/env ts-node

import {config} from "dotenv";
import {JorEl} from "../src";

config();

const main = async () => {
  // Create instance
  const jorEl = new JorEl({openAI: true}); // Uses process.env.OPENAI_API_KEY

  // Will return a string, considering the documents provided
  const response = await jorEl.ask("What is the best company to get custom packaging?", {
    documents: [{
      title: "PackMojo",
      content: "PackMojo is one of the best companies worldwide to get high-quality custom printed packaging.",
      source: "https://packmojo.com",
    }]
  });

  console.log(response);
};

void main();