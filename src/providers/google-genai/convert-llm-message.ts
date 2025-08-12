import { Content, Part } from "@google/genai";
import { LlmMessage, LlmToolCall, LlmUserMessageContent } from "../llm-core-provider";

function convertContentToGenerativeAiPart(content: LlmUserMessageContent): Part {
  switch (content.type) {
    case "text":
      return { text: content.text };
    case "imageUrl":
      return {
        fileData: {
          mimeType: content.mimeType || "image/jpeg",
          fileUri: content.url,
        },
      };
    case "imageData":
      return {
        inlineData: {
          mimeType: content.mimeType || "image/jpeg",
          data: content.data,
        },
      };
  }
}

/**
 * Converts a tool call to a Google Generative AI function call part
 */
function convertToolCallToFunctionCallPart(toolCall: LlmToolCall): Part {
  return {
    functionCall: {
      name: toolCall.request.function.name,
      args: toolCall.request.function.arguments as Record<string, unknown>,
    },
  };
}

/**
 * Converts a completed tool call to a Google Generative AI function response part
 */
function convertCompletedToolCallToFunctionResponsePart(toolCall: LlmToolCall): Part {
  if (toolCall.executionState === "completed") {
    return {
      functionResponse: {
        id: toolCall.id,
        name: toolCall.request.function.name,
        response: { result: toolCall.result },
      },
    };
  } else if (toolCall.executionState === "error") {
    return {
      functionResponse: {
        id: toolCall.id,
        name: toolCall.request.function.name,
        response: { error: toolCall.error.message },
      },
    };
  }

  throw new Error(`Cannot convert tool call with execution state ${toolCall.executionState} to function response`);
}

export function convertLlmMessagesToGoogleGenerativeAiMessages(messages: LlmMessage[]): {
  contents: Content[];
  systemInstruction?: string;
} {
  const contents: Content[] = [];
  let systemInstruction: string | undefined;

  for (const message of messages) {
    switch (message.role) {
      case "system":
        systemInstruction = message.content;
        break;

      case "user": {
        const parts: Part[] = [];

        if (typeof message.content === "string") {
          // Handle string content (backward compatibility)
          parts.push({ text: message.content });
        } else if (Array.isArray(message.content)) {
          // Handle array of content parts
          for (const content of message.content) {
            parts.push(convertContentToGenerativeAiPart(content));
          }
        }

        contents.push({
          role: "user",
          parts,
        });
        break;
      }

      case "assistant":
        contents.push({
          role: "model",
          parts: [{ text: message.content }],
        });
        break;

      case "assistant_with_tools": {
        // First add the assistant's text response if it exists
        const parts: Part[] = [];

        if (message.content) {
          parts.push({ text: message.content });
        }

        // Then add any function calls the assistant made
        for (const toolCall of message.toolCalls) {
          parts.push(convertToolCallToFunctionCallPart(toolCall));
        }

        // Add the assistant message with function calls
        contents.push({
          role: "model",
          parts,
        });

        // Add function responses as a user message
        const functionResponseParts: Part[] = [];

        for (const toolCall of message.toolCalls) {
          if (toolCall.executionState === "completed" || toolCall.executionState === "error") {
            functionResponseParts.push(convertCompletedToolCallToFunctionResponsePart(toolCall));
          }
        }

        // Only add the function response message if there are any completed tool calls
        if (functionResponseParts.length > 0) {
          contents.push({
            role: "user",
            parts: functionResponseParts,
          });
        }

        break;
      }
    }
  }

  return { contents, systemInstruction };
}

/**
 * Helper function to extract text content from a Content object
 */
export function extractTextFromContent(content: Content): string {
  return (content.parts ?? [])
    .map((part) => ("text" in part ? part.text : ""))
    .filter((text) => text !== undefined)
    .join("");
}
