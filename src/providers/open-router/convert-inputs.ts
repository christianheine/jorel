import {
  ChatGenerationParamsResponseFormatJSONObject,
  ChatGenerationParamsResponseFormatPython,
  ChatGenerationParamsResponseFormatText,
  Reasoning,
  ReasoningSummaryVerbosity,
  ResponseFormatJSONSchema,
  ResponseFormatTextGrammar,
} from "@openrouter/sdk/esm/models";
import { ZodObject } from "zod";
import { zodSchemaToJsonSchema } from "../../shared";
import { JsonSpecification, LlmToolChoice, ReasoningEffort } from "../llm-core-provider";

/**
 * Convert JorEl JSON response config to OpenRouter format
 */
export const jsonResponseToOpenRouter = (
  format?: boolean | JsonSpecification,
  schemaDescription?: string,
):
  | ResponseFormatJSONSchema
  | ResponseFormatTextGrammar
  | ChatGenerationParamsResponseFormatText
  | ChatGenerationParamsResponseFormatJSONObject
  | ChatGenerationParamsResponseFormatPython
  | undefined => {
  if (!format) {
    return undefined;
  }

  if (format === true) {
    return { type: "json_object" };
  }

  // JSON schema provided
  return {
    type: "json_schema",
    jsonSchema: {
      name: "response",
      description: schemaDescription || "Response schema",
      schema: format instanceof ZodObject ? zodSchemaToJsonSchema(format, "openAi") : format,
    },
  };
};

/**
 * Convert JorEl tool choice to OpenRouter format
 */
export const toolChoiceToOpenRouter = (toolChoice?: LlmToolChoice): any | undefined => {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice === "none") {
    return "none";
  }

  if (toolChoice === "auto") {
    return "auto";
  }

  if (toolChoice === "required") {
    return "required";
  }

  // Specific tool name
  return {
    type: "function",
    function: {
      name: toolChoice,
    },
  };
};

/**
 * Convert reasoning effort and verbosity to OpenRouter format
 */
export const reasoningToOpenRouter = (
  reasoningEffort?: ReasoningEffort,
  reasoningSummaryVerbosity?: ReasoningSummaryVerbosity,
): Reasoning | undefined => {
  if (!reasoningEffort && !reasoningSummaryVerbosity) {
    return undefined;
  }

  return {
    effort: reasoningEffort,
    summary: reasoningSummaryVerbosity || "auto",
  };
};
