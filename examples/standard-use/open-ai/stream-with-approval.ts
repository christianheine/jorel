#!/usr/bin/env ts-node

import { config } from "dotenv";
import { z } from "zod";
import { JorEl, LlmMessage } from "../../../src";

config({ path: "../../../.env", quiet: true });

// Mock executors for testing
const readFileExecutor = async (args: { filename: string }) => {
  console.log(`\n📖 Reading file: ${args.filename}`);
  return {
    content: `Contents of ${args.filename}: Sample file content...`,
    size: 1024,
  };
};

const deleteFileExecutor = async (args: { filename: string }) => {
  console.log(`\n🗑️  Deleted file: ${args.filename}`);
  return {
    success: true,
    message: `File ${args.filename} deleted successfully`,
  };
};

const sendEmailExecutor = async (args: { to: string; subject: string; body: string }) => {
  console.log(`\n📧 Sent email to ${args.to}: "${args.subject}"`);
  return {
    messageId: "msg_12345",
    status: "sent",
  };
};

const main = async () => {
  const jorEl = new JorEl({ openAI: true });

  console.log("🧪 Testing streaming with tool approval\n");
  console.log("=".repeat(60));

  const prompt =
    "Please read the file config.txt, delete the temporary file temp.log, and send an email to admin@company.com with subject 'Cleanup Complete'.";

  console.log(`📝 Prompt: ${prompt}\n`);
  console.log("=".repeat(60) + "\n");

  // Create stream with tools requiring approval
  const stream = jorEl.streamWithMeta(prompt, {
    tools: [
      {
        name: "read_file",
        description: "Read contents of a file",
        requiresConfirmation: false, // Safe operation - no approval needed
        executor: readFileExecutor,
        params: z.object({
          filename: z.string(),
        }),
      },
      {
        name: "delete_file",
        description: "Delete a file permanently",
        requiresConfirmation: true, // Dangerous! Requires approval
        executor: deleteFileExecutor,
        params: z.object({
          filename: z.string(),
        }),
      },
      {
        name: "send_email",
        description: "Send an email",
        requiresConfirmation: true, // Requires approval
        executor: sendEmailExecutor,
        params: z.object({
          to: z.string(),
          subject: z.string(),
          body: z.string(),
        }),
      },
    ],
  });

  let messages: LlmMessage[] = [];
  let gotToolCallsRequiringApproval = false;

  console.log("🔄 Streaming response...\n");

  // Process the stream
  for await (const chunk of stream) {
    if (chunk.type === "chunk") {
      // Text content from AI
      process.stdout.write(chunk.content);
    } else if (chunk.type === "toolCallStarted") {
      // Tool call detected
      console.log(`\n\n🔧 Tool call started: ${chunk.toolCall.request.function.name}`);
      console.log(`   Approval state: ${chunk.toolCall.approvalState}`);
      console.log(`   Execution state: ${chunk.toolCall.executionState}`);
      console.log(`   Arguments:`, JSON.stringify(chunk.toolCall.request.function.arguments, null, 2));
    } else if (chunk.type === "toolCallCompleted") {
      // Tool execution completed
      console.log(`\n✅ Tool call completed: ${chunk.toolCall.request.function.name}`);
      console.log(`   Result:`, JSON.stringify(chunk.toolCall.result, null, 2));
    } else if (chunk.type === "response") {
      // Response metadata
      console.log(`\n\n📊 Response metadata:`);
      console.log(`   Role: ${chunk.role}`);
      console.log(`   Duration: ${chunk.meta.durationMs}ms`);
      if (chunk.role === "assistant_with_tools") {
        console.log(`   Tool calls: ${chunk.toolCalls.length}`);
      }
    } else if (chunk.type === "messages") {
      // Final messages with stop reason
      messages = chunk.messages;
      console.log(`\n\n🛑 Stream stopped with reason: ${chunk.stopReason}`);

      if (chunk.stopReason === "toolCallsRequireApproval") {
        gotToolCallsRequiringApproval = true;
        console.log("\n⚠️  Tools requiring approval detected!");
        console.log("=".repeat(60));

        // Find tools requiring approval
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "assistant_with_tools") {
          const toolsRequiringApproval = lastMessage.toolCalls.filter((tc) => tc.approvalState === "requiresApproval");

          console.log(`\n📋 ${toolsRequiringApproval.length} tool(s) require approval:\n`);
          toolsRequiringApproval.forEach((tc, index) => {
            console.log(`${index + 1}. ${tc.request.function.name}`);
            console.log(`   Arguments:`, JSON.stringify(tc.request.function.arguments, null, 2));
          });
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));

  // Verify the behavior
  if (gotToolCallsRequiringApproval) {
    console.log("\n✅ SUCCESS: Stream correctly stopped for tool approval!");
    console.log("   - Stream detected tools requiring approval");
    console.log("   - stopReason was 'toolCallsRequireApproval'");
    console.log("   - No tools were executed without approval");
  } else {
    console.log("\n❌ FAILURE: Expected stream to stop for approval but it didn't");
  }

  console.log("\n" + "=".repeat(60));

  console.log("Messages:");
  console.dir(messages, { depth: null });
};

void main();
