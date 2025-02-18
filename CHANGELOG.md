# Changelog

## 0.11.0 (wip)

- [BREAKING] LlmMessageContent (which is used in LlmUserMessage) has been simplified always to an array of
  LLmMessageTextContent or LLmMessageImageUrlContent or LLmMessageImageDataUrlContent.
  This won't affect the standard APIs (`text`, `json` and `stream` methods), but will affect calls to
  some of the core methods (e.g., `generate`, `generateAndProcessTools`, `generateStreamAndProcessTools`)
- CoreLlmMessages and LlmMessage types have been merged into LlmMessage types
-  `ImageContent` now has an optional `metadata` property which can be used to pass additional information about the image,
  which is then included in the `LLmMessageImageUrlContent` or `LLmMessageImageDataUrlContent` objects. This can be useful
  when managing images outside the message history (e.g., in S3 or other cloud storage)
- `generateUserMessage` is now async to allow for immediate ImageContent conversion (and future use-cases)
- Add support for tool-use when generating streams with Ollama
- Add support for tool-use when generating streams with Vertex AI
- Fix issue when passing tool parameters from zod to Vertex AI

## 0.10.0 (2025-02-17)

- [BREAKING] Move the final `json` boolean parameter from the end of the core.`generate` and core.`generateAndProcessTools` methods into the configuration
- [BREAKING] Add latest user message to message history when using the `includeMeta` flag
- [DEPRECATED] Rename `ask` to `text` which better reflects the nature of the method
- Add support for passing JSON schema definitions for json outputs
- Add support to pass the message history to the `text`, `json` and `stream`/`streamWithMeta` methods

## 0.9.6 (2025-02-15)

- Add support for max tokens in generations
- Add support for tool-choice for Vertex AI (non-streaming)

## 0.9.5 (2025-02-14)

- Freeze versions of dependencies

## 0.9.4 (2025-02-13)

- Stream tool use events (start & end) in JorEl.core.generateStreamAndProcessTools and JorEl.streamWithMeta

## 0.9.3 (2025-02-08)

- Add native support for Mistral AI
- Fix an issue which may have caused generations to fail when using Groq
- Add tool choice when generating streams with OpenAI provider
- Revise/ extend default models for Vertex AI, including gemini-2.0-flash-001
- Simplify model registration & expose underlying clients for native providers

## 0.9.2 (2025-02-06)

- Fix issue when approving all tool calls at once (w/o passing any id)

## 0.9.1 (2025-02-02)

- Allow documents to be instantiated from a url, a list of urls, or a list of file paths
- Allow images to be instantiated from a list of files or urls
- Improve error handling for empty tasks

## 0.9.0 (2025-02-02)

- Further simplify how tools can be passed to the `ask`, `json` and `stream` methods
- Add new method `streamWithMeta` to create streams with metadata (including intermediate messages during tool processing)
- Improve examples

## 0.8.5 (2025-02-01)

- Add feature to easily load documents from local files
- Improve support for models w/o temperature parameter (e.g., o3-mini)
- Improve support for models w/o system message (e.g., o1-mini)
- Add o3-mini to default models, and add example

## 0.8.4 (2025-01-23)

- Future-proof embed signature and add documentation

## 0.8.3 (2025-01-22)

- Add helpers to generate system and user messages from an existing JorEl instance
- Return previous messages (including tool messages which were internally generated) from the `ask` and `json` methods

## 0.8.2 (2025-01-21)

- Small refinements to how tasks are created

## 0.8.1 (2025-01-20)

- Add support for custom attributes in documents
- Extend public API for jorEl, e.g. to set the document system message after initialization
- Add initial content for dedicated documentation website

## 0.8.0 (2025-01-19)

- Add support for streaming with tool use
- Add logging
- Add support for tasks via agents, including transfer and delegation

## 0.7.2 (2025-01-16)

- Add support for creating embeddings (Open AI, Groq, Grok, Ollama)

## 0.7.1 (2025-01-13)

- Add native support for passing Zod objects as tool params
- Restructured examples into major categories (standard-use, provider-apis, agents)
- Prepare tool-use for agentic use cases

## 0.7.0 (2025-01-12)

- Add support for passing documents to JorEls, `ask`, `stream` and `json` methods'
- Further simplify provider instantiation, by allowing to pass a {[provider]:true} to the JorEl constructor
- Fix issue when streaming responses

## 0.6.0 (2025-01-04)

- Add (experimental) support for tool use (non-streaming responses for all providers & JorEl's `generate` method)

## 0.5.1 (2024-12-31)

- Add metadata to responses: duration, model, input & output tokens (where available)

## 0.5.0 (2024-12-30)

- Add vision support for all current providers (OpenAI, Anthropic, Ollama, Groq, Grok, VertexAI)
- Add ImageContent class to simplify passing images into prompts
- Extend JorEl's ask, stream and json methods to support vision

## 0.4.0 (2024-12-28)

- Add support for Grok and VertexAI

## 0.3.0 (2024-12-27)

- Add support for Anthropic and Groq

## 0.2.0 (2024-12-26)

- Add support for Ollama
- Improve documentation

## 0.1.0 (2024-12-26)

- Initial release with support for OpenAI


