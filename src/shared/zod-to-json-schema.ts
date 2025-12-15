import { toJSONSchema, ZodType } from "zod";
import { omit } from "./object-utils";

export const zodSchemaToJsonSchema = (schema: ZodType, target: "jsonSchema7" | "openAi" = "jsonSchema7") => {
  const jsonSchema = toJSONSchema(schema, {
    target: "draft-7",
    reused: "inline",
    // cycles: "ref",
    unrepresentable: "any",
  });

  const cleaned = deepClean(
    jsonSchema as Record<string, any>,
    target === "openAi" ? ["$schema"] : ["$schema", "additionalProperties"],
  );

  // OpenAI strict JSON schema is more restrictive than standard JSON Schema.
  // In particular, it requires every object schema to include a `required` array
  // that lists *every* key in `properties` (even those that were optional in Zod).
  // To preserve the intent of optional fields, we convert "optional" -> "nullable"
  // and then mark it required.
  if (target === "openAi") {
    enforceOpenAiStrictObjectRequirements(cleaned);
  }

  return cleaned;
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

function enforceOpenAiStrictObjectRequirements(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) enforceOpenAiStrictObjectRequirements(item);
    return;
  }

  if (!isPlainObject(node)) return;

  // First recurse so nested schemas get normalized too (e.g., anyOf items).
  for (const key of Object.keys(node)) {
    enforceOpenAiStrictObjectRequirements(node[key]);
  }

  if (node.type !== "object") return;
  if (!isPlainObject(node.properties)) return;

  const props = node.properties as Record<string, any>;
  const propKeys = Object.keys(props);

  const existingRequired = Array.isArray(node.required) ? (node.required as string[]) : [];
  const requiredSet = new Set(existingRequired);

  // Any property that isn't in `required` was optional in Zod v4 output.
  // OpenAI strict requires it to be required, so we make it nullable.
  for (const key of propKeys) {
    if (!requiredSet.has(key)) {
      props[key] = makeNullableSchema(props[key]);
    }
  }

  node.required = propKeys;
}

function makeNullableSchema(schema: unknown): unknown {
  if (!isPlainObject(schema)) {
    // Be conservative: if it's not a standard schema object, wrap it.
    return { anyOf: [schema, { type: "null" }] };
  }

  // Already nullable via JSON Schema "type"
  if (schema.type === "null") return schema;
  if (Array.isArray(schema.type) && schema.type.includes("null")) return schema;

  // Nullable via enum
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) return schema;

  // Nullable via combinators
  if (Array.isArray(schema.anyOf) && schema.anyOf.some((s: unknown) => schemaAllowsNull(s))) return schema;
  if (Array.isArray(schema.oneOf) && schema.oneOf.some((s: unknown) => schemaAllowsNull(s))) return schema;
  if (Array.isArray(schema.allOf) && schema.allOf.some((s: unknown) => schemaAllowsNull(s))) return schema;

  // If this is a simple `type: "string"` style schema, prefer type-union
  if (typeof schema.type === "string") {
    return { ...schema, type: [schema.type, "null"] };
  }
  if (Array.isArray(schema.type)) {
    return schema.type.includes("null") ? schema : { ...schema, type: [...schema.type, "null"] };
  }

  // Fallback: wrap
  return { anyOf: [schema, { type: "null" }] };
}

function schemaAllowsNull(schema: unknown): boolean {
  if (!isPlainObject(schema)) return false;
  if (schema.type === "null") return true;
  if (Array.isArray(schema.type) && schema.type.includes("null")) return true;
  if (Array.isArray(schema.enum) && schema.enum.includes(null)) return true;

  if (Array.isArray(schema.anyOf) && schema.anyOf.some((s: unknown) => schemaAllowsNull(s))) return true;
  if (Array.isArray(schema.oneOf) && schema.oneOf.some((s: unknown) => schemaAllowsNull(s))) return true;
  if (Array.isArray(schema.allOf) && schema.allOf.some((s: unknown) => schemaAllowsNull(s))) return true;

  return false;
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
