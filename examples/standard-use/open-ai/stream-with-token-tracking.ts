import { config } from "dotenv";
import { JorEl } from "../../../src";
import { LlmToolKit } from "../../../src/tools";

config({ path: "../../../.env", quiet: true });

/**
 * Example demonstrating the new token tracking feature for multi-generation requests.
 *
 * When tool calls are involved, multiple generations may occur:
 * 1. Initial generation: Model decides to call tools
 * 2. Subsequent generation(s): Model synthesizes final answer with tool results
 *
 * The meta object now includes:
 * - Cumulative inputTokens and outputTokens across all generations
 * - A generations array with details about each individual generation attempt
 */

// Mock tool for demonstration
const weatherTool = {
  name: "getWeather",
  description: "Get the current weather for a city",
  parameters: {
    type: "object" as const,
    properties: {
      city: { type: "string" as const, description: "The city name" },
    },
    required: ["city"],
  },
  executor: async (inputs: { city: string }) => {
    return {
      city: inputs.city,
      temperature: 72,
      condition: "Sunny",
    };
  },
};

const stockTool = {
  name: "getStockPrice",
  description: "Get the current stock price for a ticker symbol",
  parameters: {
    type: "object" as const,
    properties: {
      ticker: { type: "string" as const, description: "The stock ticker symbol" },
    },
    required: ["ticker"],
  },
  executor: async (inputs: { ticker: string }) => {
    return {
      ticker: inputs.ticker,
      price: 150.25,
      change: 2.5,
    };
  },
};

async function main() {
  const jorel = new JorEl({
    openAI: true,
  });

  const tools = new LlmToolKit([weatherTool, stockTool]);

  console.log();
  console.log("=".repeat(80));
  console.log("Streaming Token Tracking Example");
  console.log("=".repeat(80));
  console.log();

  let finalMeta;

  const stream = jorel.streamWithMeta("What's the weather in New York and the stock price of AAPL?", {
    model: "gpt-5-nano",
    tools,
  });

  console.log("Streaming response:");
  process.stdout.write("   ");

  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      process.stdout.write(chunk.content);
    } else if (chunk.type === "response") {
      finalMeta = chunk.meta;
    } else if (chunk.type === "messages") {
      console.log();
      console.log();
      console.log("-".repeat(80));
      console.log("Final Token Usage (from streaming):");
      console.log("-".repeat(80));
      console.log();

      if (finalMeta) {
        console.log("📊 Cumulative Token Usage:");
        console.log(`   Total Input Tokens:  ${finalMeta.inputTokens ?? "N/A"}`);
        console.log(`   Total Output Tokens: ${finalMeta.outputTokens ?? "N/A"}`);
        console.log(`   Total Duration:      ${finalMeta.durationMs}ms`);
        console.log();

        // Display individual generations if multiple occurred
        if (finalMeta.generations && finalMeta.generations.length > 1) {
          console.log("🔍 Individual Generation Attempts:");
          console.log();

          finalMeta.generations.forEach((gen, index) => {
            console.log(`   Generation ${index + 1}:`);
            console.log(`     Type:          ${gen.hadToolCalls ? "Tool Call Request" : "Final Response"}`);
            console.log(`     Model:         ${gen.model}`);
            console.log(`     Provider:      ${gen.provider}`);
            console.log(`     Input Tokens:  ${gen.inputTokens ?? "N/A"}`);
            console.log(`     Output Tokens: ${gen.outputTokens ?? "N/A"}`);
            console.log(`     Duration:      ${gen.durationMs}ms`);
            console.log(`     Timestamp:     ${new Date(gen.timestamp).toISOString()}`);
            console.log();
          });
        } else {
          console.log("💡 This was a single-generation request (no tool calls were made).");
        }
      }
    }
  }

  console.log();
  console.log("=".repeat(80));
}

void main();
