import { OpenAIProvider } from "../../providers";
import { config } from "dotenv";

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
});
