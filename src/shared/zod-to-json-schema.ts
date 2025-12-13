import { toJSONSchema, ZodType } from "zod";
import { omit } from "./object-utils";

export const zodSchemaToJsonSchema = (schema: ZodType, target: "jsonSchema7" | "openAi" = "jsonSchema7") => {
  const jsonSchema = toJSONSchema(schema, {
    target: "draft-7",
    reused: "inline",
    // cycles: "ref",
    unrepresentable: "any",
  });

  return deepClean(
    jsonSchema as Record<string, any>,
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
