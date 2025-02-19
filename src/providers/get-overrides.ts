import { LlmModelParameterOverrides, LlmModelParameterOverridesLookup } from "./llm-core-provider";

export const getModelOverrides = (model: string, lookup: LlmModelParameterOverridesLookup): LlmModelParameterOverrides => {
  const overrides = lookup[model];
  return {
    noSystemMessage: overrides?.noSystemMessage ?? false,
    noTemperature: overrides?.noTemperature ?? false
  };
}