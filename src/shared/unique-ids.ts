import { ulid } from "ulid";
import { v4, v7 } from "uuid";

export type MessageIdGeneratorFunction = (params: { timestamp: number }) => string;

export type MessageIdGenerator = "ulid" | "uuidv4" | "uuidv7" | MessageIdGeneratorFunction;

/**
 * Resolves a MessageIdGenerator to a function that generates unique IDs
 */
export const resolveIdGenerator = (generator: MessageIdGenerator): MessageIdGeneratorFunction => {
  if (typeof generator === "function") {
    return generator;
  }
  switch (generator) {
    case "ulid":
      return (params: { timestamp: number }) => ulid(params.timestamp);
    case "uuidv4":
      return () => v4();
    case "uuidv7":
      return (params: { timestamp: number }) => v7({ msecs: params.timestamp });
    default:
      throw new Error(`Unknown ID generator: ${generator}`);
  }
};

/**
 * Default unique ID generator (uuidv7)
 */
export const generateUniqueId = (timestamp?: number): string => {
  return v7({ msecs: timestamp ?? Date.now() });
};

/**
 * Generate a unique ID using the specified generator
 * @param generator - The generator to use (defaults to uuidv7)
 * @param role - The role of the message (used by custom generators)
 */
export const generateMessageId = (generator: MessageIdGenerator = "uuidv7", timestamp?: number): string => {
  const generatorFn = resolveIdGenerator(generator);
  return generatorFn({ timestamp: timestamp ?? Date.now() });
};
