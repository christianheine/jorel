import { z } from "zod";
import { zodSchemaToJsonSchema } from "../../shared/zod-to-json-schema";

describe("zodSchemaToJsonSchema", () => {
  it("should convert a simple string schema", () => {
    const stringSchema = z.string();
    const jsonSchema = zodSchemaToJsonSchema(stringSchema);

    expect(jsonSchema).toEqual({
      type: "string",
    });
  });

  it("should convert a number schema", () => {
    const numberSchema = z.number();
    const jsonSchema = zodSchemaToJsonSchema(numberSchema);

    expect(jsonSchema).toEqual({
      type: "number",
    });
  });

  it("should convert an object schema", () => {
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
      isActive: z.boolean(),
    });

    const jsonSchema = zodSchemaToJsonSchema(objectSchema);

    expect(jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        isActive: { type: "boolean" },
      },
      required: ["name", "age", "isActive"],
    });
  });

  it("should convert an array schema", () => {
    const arraySchema = z.array(z.string());
    const jsonSchema = zodSchemaToJsonSchema(arraySchema);

    expect(jsonSchema).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("should convert a union schema", () => {
    const unionSchema = z.union([z.string(), z.number()]);
    const jsonSchema = zodSchemaToJsonSchema(unionSchema);

    expect(jsonSchema).toEqual({
      type: ["string", "number"],
    });
  });

  it("should convert a schema with constraints", () => {
    const constrainedSchema = z.string().min(3).max(10).email();
    const jsonSchema = zodSchemaToJsonSchema(constrainedSchema);

    expect(jsonSchema).toEqual({
      type: "string",
      minLength: 3,
      maxLength: 10,
      format: "email",
    });
  });

  it("should remove $schema property for jsonSchema7 target", () => {
    const schema = z.string();
    const jsonSchema = zodSchemaToJsonSchema(schema, "jsonSchema7");

    expect(jsonSchema.$schema).toBeUndefined();
  });

  it("should remove $schema and additionalProperties for jsonSchema7 target", () => {
    const schema = z.object({ name: z.string() });
    const jsonSchema = zodSchemaToJsonSchema(schema, "jsonSchema7");

    expect(jsonSchema.$schema).toBeUndefined();
    expect(jsonSchema.additionalProperties).toBeUndefined();
  });

  it("should only remove $schema for openAi target", () => {
    const schema = z.object({ name: z.string() });
    const jsonSchema = zodSchemaToJsonSchema(schema, "openAi");

    expect(jsonSchema.$schema).toBeUndefined();
    // additionalProperties should be present for openAi target
    expect(jsonSchema.additionalProperties).toBeDefined();
  });

  it("should handle nested objects", () => {
    const nestedSchema = z.object({
      user: z.object({
        profile: z.object({
          firstName: z.string(),
          lastName: z.string(),
        }),
        settings: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        }),
      }),
    });

    const jsonSchema = zodSchemaToJsonSchema(nestedSchema);

    expect(jsonSchema).toEqual({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            profile: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
              },
              required: ["firstName", "lastName"],
            },
            settings: {
              type: "object",
              properties: {
                theme: { type: "string", enum: ["light", "dark"] },
                notifications: { type: "boolean" },
              },
              required: ["theme", "notifications"],
            },
          },
          required: ["profile", "settings"],
        },
      },
      required: ["user"],
    });
  });

  it("should convert an object schema with openAi target and include additionalProperties", () => {
    const objectSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const jsonSchema = zodSchemaToJsonSchema(objectSchema, "openAi");

    expect(jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name", "age"],
      additionalProperties: false,
    });
  });

  it("should handle complex schemas with openAi target", () => {
    const complexSchema = z.object({
      id: z.string().uuid(),
      user: z.object({
        name: z.string(),
        email: z.string().email(),
        role: z.enum(["admin", "user", "guest"]),
      }),
      tags: z.array(z.string()),
      createdAt: z.date(),
    });

    const jsonSchema = zodSchemaToJsonSchema(complexSchema, "openAi");

    expect(jsonSchema.additionalProperties).toBe(false);

    expect(jsonSchema.properties.user.additionalProperties).toBe(false);

    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema.properties.id.type).toBe("string");
    expect(jsonSchema.properties.id.format).toBe("uuid");
    expect(jsonSchema.properties.tags.type).toBe("array");
    expect(jsonSchema.properties.user.properties.role.enum).toEqual(["admin", "user", "guest"]);
  });
});
