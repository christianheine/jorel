import {LlmMessage} from "../../shared";
import {Content} from "@google-cloud/vertexai";

export const convertLlmMessagesToVertexAiMessages = (
  messages: LlmMessage[]
): {
  systemMessage: string;
  chatMessages: Content[];
} => {
  // 1. Extract system messages and join them together
  const systemMessages = messages.filter(m => m.role === "system");
  const systemMessage = systemMessages.map(m => m.content).join("\n");

  // 2. Create the chat messages array by converting LLM messages to Vertex AI's Content
  const chatMessages: Content[] = messages
    .filter(m => m.role !== "system")
    .map(m => {
      const content: Content = {
        role: m.role,
        parts: [
          {
            text: m.content
          }
        ]
      };
      return content;
    });

  return {
    systemMessage,
    chatMessages
  };
};
