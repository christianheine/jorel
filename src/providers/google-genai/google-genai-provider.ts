import {
  FunctionCallingConfigMode,
  GenerateContentConfig,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import { ZodObject } from "zod";
import {
  generateAssistantMessage,
  initialGoogleGenAiModels,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseWithToolCalls,
  LlmToolCall,
} from "..";
import { generateRandomId, generateUniqueId, MaybeUndefined, zodSchemaToJsonSchema } from "../../shared";
import { convertLlmMessagesToGoogleGenerativeAiMessages } from "./convert-llm-message";

export interface GoogleGenerativeAIConfig {
  apiKey?: string;
  safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];
  name?: string;
}

export class GoogleGenerativeAIProvider implements LlmCoreProvider {
  public readonly name: string;
  static readonly defaultName = "google-generative-ai";

  readonly client: GoogleGenAI;

  private readonly safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];

  constructor(options: GoogleGenerativeAIConfig = {}) {
    this.name = options.name || GoogleGenerativeAIProvider.defaultName;
    const apiKey = options.apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "[GoogleGenerativeAIProvider] Missing API key. Either pass it as config.apiKey or set the GOOGLE_AI_API_KEY environment variable",
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    this.safetySettings = options.safetySettings;
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    try {
      const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);

      const requestConfig = this.prepareGenerationConfig(config);

      // Add system instruction to config if present
      if (systemInstruction) {
        requestConfig.systemInstruction = systemInstruction;
      }

      const result = await this.client.models.generateContent({
        model,
        contents,
        config: requestConfig,
      });

      const content = result.text ?? "";
      const functionCalls = result.functionCalls ?? [];

      const toolCalls: MaybeUndefined<LlmToolCall[]> =
        functionCalls.length > 0
          ? functionCalls.map((functionCall) => ({
              id: generateUniqueId(),
              request: {
                id: generateRandomId(),
                function: {
                  name: functionCall.name ?? "",
                  arguments: functionCall.args ?? {},
                },
              },
              approvalState: config.tools?.getTool(functionCall.name ?? "")?.requiresConfirmation
                ? "requiresApproval"
                : "noApprovalRequired",
              executionState: "pending",
              result: null,
              error: null,
            }))
          : undefined;

      const durationMs = Date.now() - start;

      return {
        ...generateAssistantMessage(content, toolCalls),
        meta: {
          model,
          provider: this.name,
          temperature: config.temperature ?? undefined,
          durationMs,
          inputTokens: undefined,
          outputTokens: undefined,
        },
      };
    } catch (error) {
      throw new Error(`[GoogleGenerativeAIProvider] Error generating content: ${error}`);
    }
  }

  async *generateResponseStream(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): AsyncGenerator<LlmStreamResponseChunk | LlmStreamResponse | LlmStreamResponseWithToolCalls> {
    const start = Date.now();

    try {
      const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);
      const requestConfig = this.prepareGenerationConfig(config);

      // Add system instruction to config if present
      if (systemInstruction) {
        requestConfig.systemInstruction = systemInstruction;
      }

      const streamResult = await this.client.models.generateContentStream({
        model,
        contents,
        config: requestConfig,
      });

      let fullContent = "";
      const toolCalls: LlmToolCall[] = [];

      for await (const chunk of streamResult) {
        const chunkText = chunk.text ?? "";
        fullContent += chunkText;

        // Check for function calls in each chunk
        const functionCalls = chunk.functionCalls ?? [];

        if (functionCalls && functionCalls.length > 0) {
          // Process new function calls that haven't been seen before
          for (const functionCall of functionCalls) {
            // Check if this function call is already in our toolCalls array
            const existingToolCall = toolCalls.find(
              (tc) =>
                tc.request.function.name === (functionCall.name ?? "") &&
                JSON.stringify(tc.request.function.arguments) === JSON.stringify(functionCall.args ?? {}),
            );

            if (!existingToolCall) {
              const newToolCall: LlmToolCall = {
                id: generateUniqueId(),
                request: {
                  id: generateRandomId(),
                  function: {
                    name: functionCall.name ?? "",
                    arguments: functionCall.args ?? {},
                  },
                },
                approvalState: config.tools?.getTool(functionCall.name ?? "")?.requiresConfirmation
                  ? "requiresApproval"
                  : "noApprovalRequired",
                executionState: "pending",
                result: null,
                error: null,
              };

              toolCalls.push(newToolCall);
            }
          }
        }

        if (chunkText) {
          yield { type: "chunk", content: chunkText };
        }
      }

      const durationMs = Date.now() - start;
      const meta = {
        model,
        provider: this.name,
        temperature: config.temperature ?? undefined,
        durationMs,
        inputTokens: undefined,
        outputTokens: undefined,
      };

      // If we have tool calls, yield a response with tools
      if (toolCalls.length > 0) {
        yield {
          type: "response",
          role: "assistant_with_tools",
          content: fullContent,
          toolCalls,
          meta,
        };
      } else {
        yield {
          type: "response",
          role: "assistant",
          content: fullContent,
          meta,
        };
      }
    } catch (error) {
      throw new Error(`[GoogleGenerativeAIProvider] Error generating content stream: ${error}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return initialGoogleGenAiModels;
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const result = await this.client.models.embedContent({
      model,
      contents: [{ role: "user", parts: [{ text }] }],
    });
    if (!result.embeddings || result.embeddings.length === 0) {
      throw new Error("No embedding returned");
    }
    return result.embeddings[0].values ?? [];
  }

  // Helper method for preparing request configuration
  private prepareGenerationConfig(config: LlmGenerationConfig): GenerateContentConfig {
    const requestConfig: GenerateContentConfig = {
      safetySettings: this.safetySettings,
    };

    // Add generation config
    if (config.temperature !== undefined || config.maxTokens !== undefined || config.json) {
      requestConfig.temperature = config.temperature ?? undefined;
      requestConfig.maxOutputTokens = config.maxTokens ?? undefined;

      if (config.json) {
        requestConfig.responseMimeType = "application/json";

        if (typeof config.json !== "boolean") {
          requestConfig.responseSchema =
            config.json instanceof ZodObject ? zodSchemaToJsonSchema(config.json) : config.json;
        }
      }
    }

    // Add tools
    if (config.tools?.asLlmFunctions?.length) {
      // @ts-expect-error Type 'Partial<LlmFunctionParameters>' is not assignable to type 'Schema'
      // Types of property 'type' are incompatible.
      // Type 'LlmFunctionParameter | undefined' is not assignable to type 'Type | undefined'.
      // Type '"string"' is not assignable to type 'Type | undefined'. Did you mean 'Type.STRING'?
      // TODO: Fix type errors.
      requestConfig.tools = config.tools.asLlmFunctions.map((f) => ({
        functionDeclarations: [
          {
            name: f.function.name,
            description: f.function.description,
            parameters: f.function.parameters,
          },
        ],
      }));
    }

    // Add tool config
    if (config.tools?.hasTools && config.toolChoice) {
      let mode: FunctionCallingConfigMode = FunctionCallingConfigMode.AUTO;
      if (config.toolChoice === "none") {
        mode = FunctionCallingConfigMode.NONE;
      } else if (config.toolChoice === "required") {
        mode = FunctionCallingConfigMode.ANY;
      }

      requestConfig.toolConfig = {
        functionCallingConfig: {
          mode,
        },
      };
    }

    return requestConfig;
  }
}
