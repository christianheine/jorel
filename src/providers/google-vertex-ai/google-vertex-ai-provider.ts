import {ClientError, Content, GenerateContentResponse, GoogleApiError, HarmBlockThreshold, HarmCategory, StreamGenerateContentResult, Tool, VertexAI} from "@google-cloud/vertexai";
import {_assistantMessage, generateRandomId, LlmCoreProvider, LlmGenerationConfig, LlmMessage, LlmResponse, LlmResponseWithToolCalls, LlmStreamResponse, LlmStreamResponseChunk, LlmToolCall, MaybeUndefined} from "../../shared";
import {convertLlmMessagesToVertexAiMessages} from "./convert-llm-message";
import {FunctionDeclaration, FunctionDeclarationSchema} from "@google-cloud/vertexai/src/types/content";

const defaultSafetySettings = [
  {category: HarmCategory.HARM_CATEGORY_UNSPECIFIED, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH},
  {category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH},
  {category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH},
  {category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
  {category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE},
];

export {HarmCategory as VertexAiHarmCategory, HarmBlockThreshold as VertexAiHarmBlockThreshold};

export interface GoogleVertexAiConfig {
  project?: string;
  location?: string;
  keyFilename?: string;
  defaultTemperature?: number;
  safetySettings?: { category: HarmCategory, threshold: HarmBlockThreshold }[];
}

const _provider = "GoogleVertexAiProvider";

/** Provides access to GoogleVertexAi and other compatible services */
export class GoogleVertexAiProvider implements LlmCoreProvider {
  public defaultTemperature;
  private client: VertexAI;
  private readonly safetySettings: { category: HarmCategory, threshold: HarmBlockThreshold }[] = defaultSafetySettings;

  constructor({project, location, keyFilename, defaultTemperature, safetySettings}: GoogleVertexAiConfig = {}) {
    const config = {
      project: project || process.env.GCP_PROJECT,
      location: location || process.env.GCP_LOCATION,
      keyFilename: keyFilename || process.env.GOOGLE_APPLICATION_CREDENTIALS,
    };

    if (!(config.project)) throw new Error("[GoogleVertexAiProvider] Missing GCP project. Either pass it as config.project or set the GCP_PROJECT environment variable");
    if (!config.location) throw new Error("[GoogleVertexAiProvider] Missing GCP location. Either pass it as config.location or set the GCP_LOCATION environment variable");

    this.client = new VertexAI({
      googleAuthOptions: {
        projectId: config.project,
        keyFilename: config.keyFilename,
      },
      location: config.location,
      project: config.project,
    });

    this.defaultTemperature = defaultTemperature ?? 0;
    if (safetySettings) {
      this.safetySettings = safetySettings;
    }
  }

  async generateResponse(model: string, messages: LlmMessage[], config: LlmGenerationConfig = {}): Promise<LlmResponse | LlmResponseWithToolCalls> {
    const start = Date.now();

    const {chatMessages, systemMessage} = await convertLlmMessagesToVertexAiMessages(messages);

    const generativeModel = this.client.getGenerativeModel({
      model,
    });

    const temperature = config.temperature || 0;
    const maxTokens = config.maxTokens || undefined;

    let response: GenerateContentResponse;

    try {
      response = (
        await generativeModel.generateContent({
          contents: chatMessages,
          systemInstruction: systemMessage,
          tools: config.tools?.llmFunctions.map<Tool>(f => {
            const functionDeclarations: FunctionDeclaration[] = [{
              name: f.function.name,
              description: f.function.description,
              parameters: f.function.parameters as unknown as FunctionDeclarationSchema,
            }];
            return ({functionDeclarations});
          }),
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: config.json ? "application/json" : "text/plain",
          },
          safetySettings: this.safetySettings
        })
      ).response;
    } catch (error: unknown) {
      if (error instanceof ClientError) {
        throw new Error(`[GoogleVertexAiProvider] Error generating content: ${error.message}`);
      }
      if (error instanceof GoogleApiError) {
        throw new Error(`[GoogleVertexAiProvider] Error generating content: ${error.message}, code: ${error.code}, status: ${error.status}, details: ${error.errorDetails}`);
      }
      throw error;
    }

    const inputTokens = response.usageMetadata?.promptTokenCount;
    const outputTokens = response.usageMetadata?.candidatesTokenCount;

    const responseContent: Content = response.candidates && response.candidates.length > 0 ? response.candidates[0].content : {role: "model", parts: [{text: ""}]};

    const content = responseContent.parts.filter(p => !!p.text).map(p => p.text).join("").trim();

    const toolCalls: MaybeUndefined<LlmToolCall[]> = responseContent.parts.filter(p => p.functionCall).map(p => {
      const functionCall = p.functionCall!;
      return {
        request: {
          id: generateRandomId(),
          function: {
            name: functionCall.name,
            arguments: functionCall.args,
          },
        },
        approvalState: "noApprovalRequired",
        executionState: "pending",
        result: null,
        error: null,
      };
    });

    const durationMs = Date.now() - start;

    return {
      ..._assistantMessage(content, toolCalls),
      meta: {
        model,
        _provider,
        durationMs,
        inputTokens,
        outputTokens,
      }
    };
  }

  async* generateResponseStream(model: string, messages: LlmMessage[], config: Omit<LlmGenerationConfig, "tools" | "toolChoice"> = {}
  ): AsyncGenerator<LlmStreamResponseChunk, LlmStreamResponse, unknown> {
    const start = Date.now();

    const {chatMessages, systemMessage} = await convertLlmMessagesToVertexAiMessages(messages);

    const generativeModel = this.client.getGenerativeModel({
      model,
    });

    const temperature = config.temperature || 0;
    const maxTokens = config.maxTokens || undefined;

    const response: StreamGenerateContentResult = (
      await generativeModel.generateContentStream({
        contents: chatMessages,
        systemInstruction: systemMessage,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          responseMimeType: config.json ? "application/json" : "text/plain",
        },
        safetySettings: this.safetySettings
      })
    );

    const durationMs = Date.now() - start;

    for await (const res of response.stream) {
      const content: Content = res.candidates && res.candidates.length > 0 ? res.candidates[0].content : {role: "model", parts: [{text: ""}]};
      if (content && content.parts && content.parts.length > 0) {
        const textContent = content.parts.map((part) => ("text" in part ? part.text : "")).join("");
        if (textContent.length > 0) {
          yield {type: "chunk", content: textContent};
        }
      }
    }

    const r = await response.response;
    const content: Content = r.candidates && r.candidates.length > 0 ? r.candidates[0].content : {role: "model", parts: [{text: ""}]};

    const inputTokens = r.usageMetadata?.promptTokenCount;
    const outputTokens = r.usageMetadata?.candidatesTokenCount;

    const contentText = content.parts.map(p => p.text).join("");

    return {
      type: "response",
      content: contentText,
      meta: {
        model,
        _provider,
        durationMs,
        inputTokens,
        outputTokens,
      }
    };
  }

  async getAvailableModels(): Promise<string[]> {
    return [];
  }
}
