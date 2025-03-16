import { Tool } from "ollama";
import { ZodObject } from "zod";
import { JsonSpecification } from "../llm-core-provider";
import { zodSchemaToJsonSchema } from "../../shared";

export const jsonResponseToOllama = (
  format?: boolean | JsonSpecification,
): string | Record<string, any> | undefined => {
  if (!format) {
    return undefined;
  } else if (typeof format === "boolean") {
    return "json";
  } else if (typeof format === "object") {
    return format instanceof ZodObject ? zodSchemaToJsonSchema(format) : format;
  }

  throw new Error("Invalid format");
};

export const toolsToOllama = (tools?: {
  asLlmFunctions?: { function: { name: string; description?: string; parameters?: any } }[];
}): Tool[] | undefined => {
  if (!tools?.asLlmFunctions?.length) {
    return undefined;
  }

  return tools.asLlmFunctions.map(
    (f): Tool => ({
      type: "function",
      function: {
        name: f.function.name,
        description: f.function.description ?? "",
        parameters: {
          type: f.function.parameters?.type ?? "object",
          properties: f.function.parameters?.properties ?? ({} as Record<string, any>),
          required: f.function.parameters?.required ?? [],
        },
      },
    }),
  );
};
