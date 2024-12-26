import { OpenAIProvider } from "../../open-ai";
import {config} from "dotenv";

config();

describe("OpenAIProvider", () => {
  const apiKey = process.env.OPENAI_API_KEY || "";

  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider({ apiKey: apiKey, defaultTemperature: 0.5 });
  });

  it("should initialize with default values", () => {
    expect(provider.defaultTemperature).toBe(0.5);
  });

  // it("should generate a response", async () => {
  //   const response = await provider.generateResponse("gpt-4o-mini", [
  //     { role: "user", content: "Hello" },
  //     { role: "assistant", content: "Hi" },
  //     { role: "user", content: "How are you?" },
  //   ]);
  //
  //   expect(response.content).not.toBe("");
  //
  //   console.log(response.content);
  // });
});
