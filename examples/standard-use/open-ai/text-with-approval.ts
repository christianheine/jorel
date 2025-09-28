#!/usr/bin/env ts-node

import { config } from "dotenv";
import { JorEl, LlmToolKit } from "../../../src";

config({ path: "../../../.env" });

// Create tools with approval requirements
const tools = new LlmToolKit([
  {
    name: "read_file",
    description: "Read contents of a file",
    requiresConfirmation: false, // Safe operation
    executor: async (args: { filename: string }) => ({
      content: `Contents of ${args.filename}: Sample file content...`,
    }),
    params: {
      type: "object",
      properties: {
        filename: { type: "string" },
      },
      required: ["filename"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file permanently",
    requiresConfirmation: true, // Requires approval
    executor: async (args: { filename: string }) => ({
      success: true,
      message: `File ${args.filename} deleted successfully`,
    }),
    params: {
      type: "object",
      properties: {
        filename: { type: "string" },
      },
      required: ["filename"],
    },
  },
  {
    name: "send_email",
    description: "Send an email",
    requiresConfirmation: true, // Requires approval
    executor: async (args: { to: string; subject: string; body: string }) => ({
      messageId: "msg_12345",
      status: "sent",
      to: args.to,
      subject: args.subject,
      body: args.body,
    }),
    params: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
  },
]);

const main = async () => {
  const jorEl = new JorEl({ openAI: true });

  // Generate initial response with tools that require approval
  const initialGeneration = await jorEl.text(
    "Read config.txt, delete temp.log, and send an email to admin@company.com about the cleanup",
    { tools },
    true,
  );

  console.dir(initialGeneration, { depth: null });

  if (initialGeneration.stopReason === "toolCallsRequireApproval") {
    // Find message requiring approval
    const messageRequiringApproval = tools.utilities.messages.getLatestMessageWithApprovalRequired(
      initialGeneration.messages,
    );

    if (!messageRequiringApproval) {
      console.log("No message requiring approval found");
      return;
    }

    // Get tool calls requiring approval
    const toolCallsRequiringApproval =
      tools.utilities.message.extractToolCallsRequiringApproval(messageRequiringApproval);

    let updatedMessages = initialGeneration.messages;

    for (const toolCall of toolCallsRequiringApproval) {
      const { name } = toolCall.request.function;

      if (name === "delete_file") {
        updatedMessages = tools.utilities.messages.rejectToolCalls(updatedMessages, {
          toolCallIds: toolCall.id,
        }); // Reject dangerous file deletion
      } else {
        updatedMessages = tools.utilities.messages.approveToolCalls(updatedMessages, {
          toolCallIds: toolCall.id,
        }); // Approve other actions
      }
    }

    // Process pending tool calls, if any
    if (tools.utilities.messages.getNumberOfPendingToolCalls(updatedMessages) > 0) {
      updatedMessages = await jorEl.processToolCalls(updatedMessages, { tools });
    }

    // Generate final response
    const finalResult = await jorEl.text(updatedMessages, { tools }, true);

    console.dir(finalResult, { depth: null });
  } else {
    console.log("No approval required. All actions completed.");
    console.log(`Response: ${initialGeneration.response}`);
  }
};

void main();
