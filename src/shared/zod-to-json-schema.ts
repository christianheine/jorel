import { zodTextFormat } from "openai/helpers/zod";
import { toJSONSchema, ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ZodType as ZodTypeV3 } from "zod/v3";
import { omit } from "./object-utils";

function isZodV4(zodObject: ZodType | ZodTypeV3): zodObject is ZodType {
  return "_zod" in zodObject;
}

export const zodSchemaToJsonSchema = <ZodInput extends ZodType | ZodTypeV3>(
  zodObject: ZodInput,
  target: "jsonSchema7" | "openAi" = "jsonSchema7",
  name = "response",
) => {
  if (target === "openAi") {
    return zodTextFormat(zodObject, name).schema;
  }

  return deepClean(
    isZodV4(zodObject)
      ? toJSONSchema(zodObject, {
          target: "draft-7",
        })
      : zodToJsonSchema(zodObject as ZodTypeV3, {
          target: "jsonSchema7",
        }),
    ["additionalProperties"],
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
