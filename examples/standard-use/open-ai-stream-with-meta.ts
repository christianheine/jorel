#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmMessage } from "../../src";

config({ path: "../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Will return a stream of strings
  let stream = jorEl.streamWithMeta("Where is the Eiffel Tower located?");

  let messageHistory: LlmMessage[] = [];

  // Print each chunk
  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    } else {
      process.stdout.write("\n" + chunk.type + ":\n");
      process.stdout.write(JSON.stringify(chunk, null, 2));
      process.stdout.write("\n");
    }

    if (chunk.type === "messages") {
      messageHistory = chunk.messages;
    }
  }

  process.stdout.write("\n");

  stream = jorEl.streamWithMeta("How about the Metropolitan Museum of Art?", {
    messageHistory,
  });

  // Print each chunk
  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    } else {
      process.stdout.write("\n" + chunk.type + ":\n");
      process.stdout.write(JSON.stringify(chunk, null, 2));
      process.stdout.write("\n");
    }

    if (chunk.type === "messages") {
      messageHistory = chunk.messages;
    }
  }

  console.log(messageHistory);

  // {
  //   "type": "messages",
  //   "messages": [
  //     {
  //       "id": "79f649d2-a6a0-4f94-b07b-023f107f2572",
  //       "role": "system",
  //       "content": "You are a helpful assistant.",
  //       "createdAt": 1739924603498
  //     },
  //     {
  //       "id": "923f69b2-681a-4626-80d2-13851da97803",
  //       "role": "user",
  //       "createdAt": 1739924602412,
  //       "content": [
  //         {
  //           "type": "text",
  //           "text": "Where is the Eiffel Tower located?"
  //         }
  //       ]
  //     },
  //     {
  //       "id": "5a723030-d1b1-4be4-872e-29ba937a266f",
  //       "role": "assistant",
  //       "content": "The Eiffel Tower is located in Paris, France. Specifically, it is situated on the Champ de Mars near the Seine River in the 7th arrondissement of the city.",
  //       "createdAt": 1739924603497
  //     },
  //     {
  //       "id": "9088fc2d-fba5-43cf-9839-e37e6d53064a",
  //       "role": "user",
  //       "createdAt": 1739924603498,
  //       "content": [
  //         {
  //           "type": "text",
  //           "text": "How about the Metropolitan Museum of Art?"
  //         }
  //       ]
  //     },
  //     {
  //       "id": "b732433e-96bb-44ef-bbfe-89e2b172733b",
  //       "role": "assistant",
  //       "content": "The Metropolitan Museum of Art, often referred to as \"The Met,\" is located in New York City, USA. Its main building, known as The Met Fifth Avenue, is situated on the eastern edge of Central Park along Fifth Avenue. The museum also has a second location called The Met Cloisters, which is dedicated to the art and architecture of medieval Europe and is located in Fort Tryon Park in Upper Manhattan.",
  //       "createdAt": 1739924605332
  //     }
  //   ]
  // }
};

void main();
