import { FunctionCallingMode } from "@google-cloud/vertexai";
import { LlmToolChoice } from "../llm-core-provider";

export const toolChoiceToVertexAi = (hasTools: boolean, toolChoice?: LlmToolChoice) => {
  if (!toolChoice) {
    return undefined;
  }

  if (hasTools) {
    if (toolChoice === "auto") {
      return {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      };
    } else if (toolChoice === "required") {
      return {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY,
        },
      };
    } else if (toolChoice === "none") {
      return {
        functionCallingConfig: {
          mode: FunctionCallingMode.NONE,
        },
      };
    } else {
      return {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      };
    }
  }
};
