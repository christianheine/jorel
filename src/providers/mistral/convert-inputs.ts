import { Mistral } from "@mistralai/mistralai";
import { ZodObject } from "zod";
import { zodSchemaToJsonSchema } from "../../shared";
import { JsonSpecification, LlmToolChoice } from "../llm-core-provider";

type MistralChatRequest = Parameters<InstanceType<typeof Mistral>["chat"]["complete"]>[0];
type ResponseFormat = NonNullable<MistralChatRequest["responseFormat"]>;
type ToolChoice = NonNullable<MistralChatRequest["toolChoice"]>;

export const jsonResponseToMistral = (
  format?: boolean | JsonSpecification,
  schemaDescription?: string,
): ResponseFormat => {
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
      jsonSchema: {
        name: "json_schema",
        description: schemaDescription,
        schemaDefinition: format instanceof ZodObject ? zodSchemaToJsonSchema(format, "openAi") : format,
        strict: true,
      },
    };
  }

  throw new Error("Invalid format");
};

export const toolChoiceToMistral = (toolChoice?: LlmToolChoice): ToolChoice | undefined => {
  if (!toolChoice) {
    return undefined;
  }

  if (toolChoice === "auto") {
    return "auto";
  } else if (toolChoice === "required") {
    return "any"; // Mistral uses "any" instead of "required"
  } else if (toolChoice === "none") {
    return "none";
  } else {
    // For specific function names, return ToolChoice object
    return {
      type: "function",
      function: { name: toolChoice },
    };
  }
};
