import { LlmModelParameterOverridesLookup } from "./llm-core-provider";

export const modelParameterOverrides: LlmModelParameterOverridesLookup = {
  "o3-mini-2025-01-31": { noTemperature: true },
  "o3-mini": { noTemperature: true },
  "o1-preview": { noTemperature: true, noSystemMessage: true },
  "o1-preview-2024-09-12": { noTemperature: true, noSystemMessage: true },
  "o1-mini": { noTemperature: true, noSystemMessage: true },
  "o1-mini-2024-09-12": { noTemperature: true, noSystemMessage: true },
  o1: { noTemperature: true },
  "o1-2024-12-17": { noTemperature: true },
  "gpt-5-nano": { noTemperature: true },
  "gpt-5": { noTemperature: true },
  "gpt-5-mini-2025-08-07": { noTemperature: true },
  "gpt-5-mini": { noTemperature: true },
  "gpt-5-nano-2025-08-07": { noTemperature: true },
  "gpt-5-chat-latest": { noTemperature: true },
  "gpt-5-2025-08-07": { noTemperature: true },
};
