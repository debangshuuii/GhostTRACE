/**
 * Test script verifying GhostTRACE Zero-Code Node.js Auto-Instrumentation.
 */

import { wrapOpenAI, withTrace } from "./dist/ghosttrace.js";

class MockOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: async ({ messages, model }) => {
          const userPrompt = messages[messages.length - 1]?.content || "";
          return {
            id: "chatcmpl-test-123",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: `Synthesized answer for: ${userPrompt}`,
                  reasoning_content: "Step 1: Analyzed schema constraints.\nStep 2: Selected B-Tree index.",
                },
              },
            ],
            usage: {
              prompt_tokens: 30,
              completion_tokens: 45,
              total_tokens: 75,
            },
          };
        },
      },
    };
  }
}

async function run() {
  console.log("Testing wrapOpenAI()...");
  const rawClient = new MockOpenAI();
  const client = wrapOpenAI(rawClient, { endpoint: "http://localhost:3000" });

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "Recommend memory allocation for Valkey cache on 8 vCPUs." },
    ],
  });

  console.log("Mock completion result:", res.choices[0].message.content);

  console.log("Testing withTrace()...");
  const taskResult = await withTrace(
    {
      title: "Microservice Resiliency Check",
      agentName: "ChaosEngineerBot",
      model: "claude-3-7-sonnet",
    },
    async (session) => {
      const step1 = await session.addStep({
        type: "THINKING",
        label: "Circuit Breaker Inspection",
        content: "Checking timeout configuration on downstream auth service.",
      });

      await step1.addGhostBranch({
        label: "Infinite Retry Loop without Exponential Backoff",
        content: "Proposing naive retry every 10ms until 200 OK.",
        ghostReason: "Critic Veto: Causes thundering herd problem and cascade outage.",
      });

      return { resilient: true, backoffMs: 250 };
    }
  );

  console.log("withTrace task result:", taskResult);
  console.log("\nAll Node SDK tests passed successfully!");
}

run().catch(console.error);
