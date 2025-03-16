import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions";
import { ZodObject } from "zod";
import { JsonSpecification, LlmToolChoice } from "../llm-core-provider";
import { zodSchemaToJsonSchema } from "../../shared";

export const jsonResponseToOpenAi = (
  format?: boolean | JsonSpecification,
  schemaDescription?: string,
): ChatCompletionCreateParamsBase["response_format"] => {
  if (!format) {
    return {
      type: "text",
    };
  } else if (typeof format === "boolean") {
    return {
      type: "json_object",
    };
  } else if (typeof format === "object") {
    return {
      type: "json_schema",
      json_schema: {
        name: "json_schema",
        description: schemaDescription,
        schema: format instanceof ZodObject ? zodSchemaToJsonSchema(format, 'openAi') : format,
        strict: true,
      },
    };
  }

  throw new Error("Invalid format");
};

export const toolChoiceToOpenAi = (toolChoice?: LlmToolChoice): ChatCompletionCreateParamsBase["tool_choice"] => {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice === "auto") {
    return "auto";
  } else if (toolChoice === "required") {
    return "required";
  } else if (toolChoice === "none") {
    return "none";
  } else {
    return { type: "function", function: { name: toolChoice } };
  }
};
