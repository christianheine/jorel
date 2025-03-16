import {
  FunctionCallingMode,
  FunctionDeclaration,
  FunctionDeclarationSchema,
  GenerationConfig,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  Tool,
  ToolConfig,
} from "@google/generative-ai";
import { ZodObject } from "zod";
import {
  defaultGoogleGenAiModels,
  generateAssistantMessage,
  LlmCoreProvider,
  LlmGenerationConfig,
  LlmMessage,
  LlmResponse,
  LlmStreamResponse,
  LlmStreamResponseChunk,
  LlmStreamResponseWithToolCalls,
  LlmToolCall,
} from "../../providers";
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
  readonly client: GoogleGenerativeAI;
  private readonly safetySettings?: {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }[];

  constructor({ apiKey, safetySettings, name }: GoogleGenerativeAIConfig = {}) {
    this.name = name || "google-generative-ai";
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!key) {
      throw new Error(
        "[GoogleGenerativeAIProvider] Missing API key. Either pass it as config.apiKey or set the GOOGLE_AI_API_KEY environment variable",
      );
    }

    this.client = new GoogleGenerativeAI(key);
    this.safetySettings = safetySettings;
  }

  async generateResponse(
    model: string,
    messages: LlmMessage[],
    config: LlmGenerationConfig = {},
  ): Promise<LlmResponse> {
    const start = Date.now();

    try {
      const generativeModel = this.client.getGenerativeModel({
        model,
      });

      const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);

      const tools = this.prepareTools(config);
      const toolConfig = this.prepareToolConfig(config);
      const generationConfig = this.prepareGenerationConfig(config);
      const safetySettings = this.safetySettings;

      const result = await generativeModel.generateContent({
        contents,
        systemInstruction,
        generationConfig,
        tools,
        toolConfig,
        safetySettings,
      });

      const response = result.response;

      const content = response.text();
      const functionCalls = response.functionCalls();

      const toolCalls: MaybeUndefined<LlmToolCall[]> = functionCalls?.map((functionCall) => ({
        id: generateUniqueId(),
        request: {
          id: generateRandomId(),
          function: {
            name: functionCall.name,
            arguments: functionCall.args,
          },
        },
        approvalState: config.tools?.getTool(functionCall.name)?.requiresConfirmation
          ? "requiresApproval"
          : "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      }));

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
      const tools = this.prepareTools(config);
      const toolConfig = this.prepareToolConfig(config);
      const generationConfig = this.prepareGenerationConfig(config);
      const safetySettings = this.safetySettings;

      const generativeModel = this.client.getGenerativeModel({
        model,
        generationConfig,
        tools,
        toolConfig,
        safetySettings,
      });

      const { contents, systemInstruction } = convertLlmMessagesToGoogleGenerativeAiMessages(messages);

      const result = await generativeModel.generateContentStream({
        contents,
        generationConfig,
        systemInstruction,
        tools,
        toolConfig,
        safetySettings,
      });

      let fullContent = "";
      const toolCalls: LlmToolCall[] = [];

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;

        // Check for function calls in each chunk
        const functionCalls = chunk.functionCalls?.();

        if (functionCalls && functionCalls.length > 0) {
          // Process new function calls that haven't been seen before
          for (const functionCall of functionCalls) {
            // Check if this function call is already in our toolCalls array
            const existingToolCall = toolCalls.find(
              (tc) =>
                tc.request.function.name === functionCall.name &&
                JSON.stringify(tc.request.function.arguments) === JSON.stringify(functionCall.args),
            );

            if (!existingToolCall) {
              const newToolCall: LlmToolCall = {
                id: generateUniqueId(),
                request: {
                  id: generateRandomId(),
                  function: {
                    name: functionCall.name,
                    arguments: functionCall.args,
                  },
                },
                approvalState: config.tools?.getTool(functionCall.name)?.requiresConfirmation
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

        yield { type: "chunk", content: chunkText };
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
    return defaultGoogleGenAiModels;
  }

  async createEmbedding(model: string, text: string): Promise<number[]> {
    const generativeModel = this.client.getGenerativeModel({ model });
    const result = await generativeModel.embedContent(text);
    if (!result.embedding) {
      throw new Error("No embedding returned");
    }
    return result.embedding.values;
  }

  // Helper methods for preparing request parameters
  private prepareTools(config: LlmGenerationConfig): Tool[] | undefined {
    if (!config.tools?.asLlmFunctions?.length) {
      return undefined;
    }

    return config.tools.asLlmFunctions.map((f) => {
      const functionDeclaration: FunctionDeclaration = {
        name: f.function.name,
        description: f.function.description,
        parameters: f.function.parameters as unknown as FunctionDeclarationSchema,
      };
      return { functionDeclarations: [functionDeclaration] };
    });
  }

  private prepareToolConfig(config: LlmGenerationConfig): ToolConfig | undefined {
    if (!config.tools?.hasTools) {
      return undefined;
    }

    function toolChoiceToFunctionCallingMode(toolChoice?: string | "none" | "auto" | "required"): FunctionCallingMode {
      if (!toolChoice || toolChoice === "auto") {
        return FunctionCallingMode.AUTO;
      }

      if (toolChoice === "none") {
        return FunctionCallingMode.NONE;
      }

      if (toolChoice === "required") {
        return FunctionCallingMode.ANY;
      }

      return FunctionCallingMode.ANY;
    }

    return {
      functionCallingConfig: {
        mode: toolChoiceToFunctionCallingMode(config.toolChoice),
        allowedFunctionNames: undefined,
      },
    };
  }

  private prepareGenerationConfig(config: LlmGenerationConfig): GenerationConfig {
    const generationConfig: GenerationConfig = {
      temperature: config.temperature ?? undefined,
      maxOutputTokens: config.maxTokens ?? undefined,
      responseSchema: undefined,
    };

    if (config.json) {
      generationConfig.responseMimeType = "application/json";

      if (typeof config.json !== "boolean") {
        generationConfig.responseSchema =
          config.json instanceof ZodObject ? zodSchemaToJsonSchema(config.json) : config.json;
      }
    }

    return generationConfig;
  }
}
