#!/usr/bin/env ts-node

import { config } from "dotenv";
import * as readline from "readline";
import { JorEl, LlmToolKit } from "../../../src";

config({ path: "../../../.env", quiet: true });

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to prompt user for approval
const promptForApproval = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      const response = answer.toLowerCase().trim();
      if (response === "y" || response === "yes") {
        resolve(true);
      } else if (response === "n" || response === "no") {
        resolve(false);
      } else {
        console.log("Please enter 'y' for yes or 'n' for no.");
        promptForApproval(message).then(resolve);
      }
    });
  });
};

// Mock executors
const deleteFileExecutor = async (args: { filename: string }) => {
  console.log(`🗑️  Deleted file: ${args.filename}`);
  return { success: true, message: `File ${args.filename} deleted successfully` };
};

const readFileExecutor = async (args: { filename: string }) => {
  console.log(`📖 Reading file: ${args.filename}`);
  return {
    content: `Contents of ${args.filename}: Lorem ipsum dolor sit amet...`,
    size: 1024,
  };
};

const sendEmailExecutor = async (args: { to: string; subject: string; body: string }) => {
  console.log(`📧 Sent email to ${args.to}: "${args.subject}"`);
  return { messageId: "msg_12345", status: "sent" };
};

// Create tools with mixed approval requirements
const tools = new LlmToolKit([
  {
    name: "read_file",
    description: "Read contents of a file",
    requiresConfirmation: false, // Safe operation
    executor: readFileExecutor,
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
    requiresConfirmation: true, // Dangerous operation!
    executor: deleteFileExecutor,
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
    executor: sendEmailExecutor,
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

  // Register a model
  jorEl.providers.openAi.addModel("gpt-5-nano");

  jorEl.models.setDefault("gpt-5-nano");

  const prompt =
    "Please read the contents of config.txt, delete the temporary file temp.log, and send an email to admin@company.com with the subject 'System Cleanup Complete' and a brief message about the cleanup.";

  console.log(`🔍 Prompt: ${prompt}\n`);

  try {
    // Generate a response with tools that require approval
    const initialGeneration = await jorEl.text(prompt, { tools }, true);

    if (initialGeneration.stopReason === "toolCallsRequireApproval") {
      console.log("⚠️  Some actions require your approval before proceeding.\n");

      // Find the message that requires approval
      const messageRequiringApproval = tools.utilities.messages.getLatestMessageWithApprovalRequired(
        initialGeneration.messages,
      );

      if (!messageRequiringApproval) {
        console.log("❌ No message requiring approval found");
        return;
      }

      // Extract tool calls requiring approval
      const toolCallsRequiringApproval =
        tools.utilities.message.extractToolCallsRequiringApproval(messageRequiringApproval);
      let updatedMessages = initialGeneration.messages;

      // Review each tool call with the user
      for (const toolCall of toolCallsRequiringApproval) {
        const { name } = toolCall.request.function;
        const args = toolCall.request.function.arguments as any;

        // Create a user-friendly description of the action
        let actionDescription = "";
        switch (name) {
          case "delete_file":
            actionDescription = `🗑️  Delete file "${args.filename}"`;
            break;
          case "send_email":
            actionDescription = `📧 Send email to "${args.to}" with subject "${args.subject}"`;
            break;
          default:
            actionDescription = `🔧 Execute ${name} with args: ${JSON.stringify(args)}`;
        }

        // Ask for user approval
        const approved = await promptForApproval(`${actionDescription}?`);

        if (approved) {
          console.log("✅ Approved\n");
          updatedMessages = tools.utilities.messages.approveToolCalls(updatedMessages, {
            toolCallIds: toolCall.id,
          });
        } else {
          console.log("❌ Rejected\n");
          updatedMessages = tools.utilities.messages.rejectToolCalls(updatedMessages, {
            toolCallIds: toolCall.id,
          });
        }
      }

      // Process the approved tool calls
      console.log("🔄 Processing your decisions...\n");

      if (tools.utilities.messages.getNumberOfPendingToolCalls(updatedMessages) > 0) {
        updatedMessages = await jorEl.processToolCalls(updatedMessages, { tools });
      }

      // Generate final response based on the processed tool calls
      const finalResult = await jorEl.text(updatedMessages, { tools }, true);

      console.log("✨ Task completed!");
      console.log(`📝 Response: ${finalResult.response}\n`);

      // Show what was actually executed successfully
      const allToolCalls = finalResult.messages
        .filter((msg) => msg.role === "assistant_with_tools")
        .flatMap((msg) => msg.toolCalls)
        .filter((call) => call.executionState === "completed");

      console.log("📋 Action results:");
      allToolCalls.forEach((call) => {
        const { name } = call.request.function;
        const args = call.request.function.arguments as any;
        const isSuccessful = call.result && !(call.result as any).error;

        // Get action description and status
        let actionDescription = "";
        const status = isSuccessful ? "✅" : "❌";
        const statusText = isSuccessful ? "" : " (rejected)";

        switch (name) {
          case "read_file":
            actionDescription = `Read file: ${args.filename}`;
            break;
          case "delete_file":
            actionDescription = `Delete file: ${args.filename}`;
            break;
          case "send_email":
            actionDescription = `Send email to: ${args.to}`;
            break;
          default:
            actionDescription = `Execute ${name}`;
        }

        console.log(`  ${status} ${actionDescription}${statusText}`);
      });
    } else {
      console.log("✨ All actions completed without requiring approval!");
      console.log(`📝 Response: ${initialGeneration.response}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    rl.close();
  }
};

void main();
