import { ZodObject } from "zod";
import { JsonSpecification } from "../llm-core-provider";
import { zodSchemaToJsonSchema } from "../../shared";
import { ResponseFormat } from "@mistralai/mistralai/src/models/components/responseformat";

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
