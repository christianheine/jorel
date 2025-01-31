# Changelog

## 0.8.5

- Add feature to easily load documents from local files
- Improve support for models w/o temperature parameter (e.g., o3-mini)
- Improve support for models w/o system message (e.g., o1-mini)
- Add o3-mini to default models, and add example

## 0.8.4

- Future-proof embed signature and add documentation

## 0.8.3 (2025-01-23)

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


