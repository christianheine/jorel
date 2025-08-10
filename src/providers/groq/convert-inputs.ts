import { ChatCompletionToolChoiceOption } from "groq-sdk/resources/chat/completions";
import { LlmToolChoice } from "../llm-core-provider";

export const toolChoiceToGroq = (toolChoice?: LlmToolChoice): ChatCompletionToolChoiceOption => {
  if (!toolChoice) {
    return "none";
  }

  if (toolChoice === "auto") {
    return "auto";
  } else if (toolChoice === "required") {
    return "required";
  } else if (toolChoice === "none") {
    return "none";
  } else {
    return { type: "function", function: { name: toolChoice } };
  }
};
