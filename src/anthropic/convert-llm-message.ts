import {LlmMessage} from "../shared";
import Anthropic from "@anthropic-ai/sdk";

export const convertLlmMessagesToAnthropicMessages = (messages: LlmMessage[]): {
  systemMessage: string;
  chatMessages: Anthropic.MessageParam[]
} => {
  const systemMessages = messages.filter(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  const systemMessage = systemMessages.map(m => m.content).join("\n");

  return {
    systemMessage,
    chatMessages: chatMessages.map(m => {
      if (m.role === "user") {
        return {
          role: "user",
          content: m.content,
        };
      } else if (m.role === "assistant") {
        return {
          role: "assistant",
          content: m.content,
        };
      }
      throw new Error(`Unsupported message role`);
    }),
  };
};