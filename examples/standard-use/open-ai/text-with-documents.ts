#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmDocument } from "../../../src";

config({ path: "../../../.env" });

const main = async () => {
  // Create instance
  const jorEl = new JorEl({ openAI: true });

  // Load document from local documentation files
  const jorElIntro = await LlmDocument.fromFile("../../../docs/docs/intro.md");
  const jorElQuickStart = await LlmDocument.fromFile("../../../docs/docs/quick-start.md");

  // Generate the response with the documents as context
  const response = await jorEl.text("Describe the main features of JorEl.", {
    documents: [jorElIntro, jorElQuickStart],
    systemMessage: "Be succinct",
  });

  console.log(response);
  // JorEl offers a unified interface for multiple LLM providers,
  // simplifying interactions with various models.
  //
  // Its main features include:
  // 1. **Unified API**: Interact with different LLM providers like OpenAI, Anthropic, and
  //    Google Vertex AI through a consistent interface.
  // 2. **Response Generation**: Use methods like `text`, `json`, and `stream`
  //    to generate text or JSON responses easily.
  // 3. **Contextual Documents**: Provide grounding documents to inform responses,
  //    enhancing the relevance of generated content.
  // 4. **Tool Integration**: Easily integrate tools for specific tasks,
  //    allowing for more complex interactions and functionalities.
  // 5. **Agent Support**: Create and manage agents for delegation and task execution,
  //    enabling advanced conversational capabilities.
  // 6. **Embeddings**: Generate embeddings for text.
  // 7. **Configuration Options**: Customize model parameters,
  //    system messages, and metadata for tailored responses.
  // 8. **Streaming Responses**: Stream responses in real-time,
  //    useful for applications requiring immediate feedback.
  //
  // Overall, JorEl abstracts complexity while providing powerful features for LLM interactions.
};

void main();
