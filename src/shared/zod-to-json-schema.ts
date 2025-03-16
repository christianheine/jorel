import { Schema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { omit } from "./object-utils";

export const zodSchemaToJsonSchema = (zod: Schema, target: "jsonSchema7" | "openAi" = "jsonSchema7") => {
  return deepClean(
    zodToJsonSchema(zod, {
      $refStrategy: "none",
      target,
    }),
    target === "openAi" ? ["$schema"] : ["$schema", "additionalProperties"],
  );
};

function deepClean(schema: Record<string, any>, keysToRemove: string[]): any {
  if (Array.isArray(schema)) {
    return schema.map((item) => deepClean(item, keysToRemove));
  } else if (typeof schema === "object" && schema !== null) {
    const cleaned = omit(schema, keysToRemove) as Record<string, any>;
    for (const key of Object.keys(cleaned)) {
      cleaned[key] = deepClean(cleaned[key], keysToRemove);
    }
    return cleaned;
  }
  return schema;
}
