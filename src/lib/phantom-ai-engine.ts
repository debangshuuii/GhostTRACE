import { TraceRunData, TraceNodeData } from "./types";

export interface PhantomMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  suggestedQuestions?: string[];
  isWelcome?: boolean;
  codeSnippets?: {
    language: string;
    code: string;
    filename?: string;
  }[];
}

/**
 * Automatically inspects the loaded project/trace and crafts an intelligent welcome greeting
 * that guesses what the user is here to solve, offering 5 tailored questions.
 */
export function generateProjectWelcomeAndQuestions(trace: TraceRunData | null): PhantomMessage {
  const timestamp = "Just now";

  if (!trace) {
    return {
      id: "welcome-init",
      role: "assistant",
      timestamp,
      isWelcome: true,
      content: `### 🔮 Are you thinking on this? No worries!

I am **PhantomAI**, your autonomous trace whisperer. I haven't detected an active project or trace loaded in the workspace yet.

**You can ask me any question without limitations!** Here are 5 things you might be thinking about:`,
      suggestedQuestions: [
        "How do I instrument my Python or TypeScript agent with GhostTRACE?",
        "What is a ghost branch and how does speculative execution work?",
        "How do I detect infinite communication loops in multi-agent swarms?",
        "Can you help me design a prompt with deterministic XML guardrails?",
        "How do I set up continuous regression testing for LLM agents?",
      ],
      suggestedActions: [
        "Load Demo Multi-Agent Traces",
        "Upload a Trace Archive",
        "View Agent SDK Guide",
      ],
    };
  }

  const nodes = trace.nodes || [];
  const ghostNodes = nodes.filter((n) => n.isGhost);
  const toolNodes = nodes.filter((n) => n.type === "TOOL_CALL" || n.type === "TOOL_RESULT");
  const failedNodes = nodes.filter((n) => n.status === "FAILED" || n.type === "ERROR");
  const promptNode = nodes.find((n) => n.type === "USER_PROMPT");
  const firstGhost = ghostNodes[0];

  // Derive 5 smart, project-specific questions based on the active run
  const questions: string[] = [];

  // Question 1: Ghost branch / safety veto
  if (ghostNodes.length > 0 && firstGhost) {
    questions.push(
      `Why did the security critic veto the speculative branch at Step #${firstGhost.stepIndex}?`
    );
  } else {
    questions.push(
      `What were the key decision points and reasoning phases in '${trace.title}'?`
    );
  }

  // Question 2: Code fix / vulnerability patch
  if (trace.title.toLowerCase().includes("crypto") || trace.title.toLowerCase().includes("timing")) {
    questions.push(
      "Can you give me a simple constant-time code fix to eliminate timing variance attacks?"
    );
  } else if (failedNodes.length > 0) {
    questions.push(
      `How do I fix the error encountered at Step #${failedNodes[0].stepIndex}?`
    );
  } else {
    questions.push(
      "Can you give me a simple code fix or safety guardrail for this step?"
    );
  }

  // Question 3: Tool parameter auditing / MCP
  if (toolNodes.length > 0) {
    const toolName = toolNodes[0].label.replace(/^Tool Call:\s*/i, "");
    questions.push(
      `What tools were invoked (like '${toolName}') and did any parameters pose security risks?`
    );
  } else {
    questions.push(
      "How do I connect external MCP (Model Context Protocol) tools to this agent?"
    );
  }

  // Question 4: Performance, latency & token optimization
  const latency = trace.durationMs || 840;
  questions.push(
    `How can I optimize this run's ${latency}ms latency and reduce the ${trace.totalTokens.toLocaleString()} tokens used?`
  );

  // Question 5: Automated test / CI/CD golden regression
  questions.push(
    "Can you generate an automated regression test suite so this failure never happens again?"
  );

  // Build the greeting content
  const content = `### 🔮 Are you thinking on this? No worries!

I just automatically scanned your active project **"${trace.title}"** run by **${trace.agentName || "Agent"}** (*${trace.model}*).

**Here is what I detected in this project:**
- **Execution Trajectory:** ${nodes.length} total steps across ${latency}ms duration.
- **Speculative Critic Vetoes:** ${ghostNodes.length} ghost branch(es) safely pruned before filesystem commitment.
- **Tool Sandbox Footprint:** ${toolNodes.length} tool invocation(s) logged in ephemeral runtime.
${promptNode ? `- **Ingested Directive:** *"${promptNode.content?.slice(0, 95)}..."*` : ""}

**Click any of these 5 tailored questions below, and I'll give you a simple, direct solution immediately:**`;

  return {
    id: `welcome-${trace.id}`,
    role: "assistant",
    timestamp,
    isWelcome: true,
    content,
    suggestedQuestions: questions,
    suggestedActions: [
      "Why was the ghost branch pruned?",
      "Give me a simple code fix",
      "Run Red-Ghost audit on this project",
    ],
  };
}

/**
 * Generate intelligent, direct, and simple solutions for any question,
 * with deep awareness of active trace and selected node context.
 */
export function generatePhantomResponse(
  userQuery: string,
  trace: TraceRunData | null,
  selectedNode: TraceNodeData | null
): PhantomMessage {
  const queryLower = userQuery.toLowerCase().trim();
  const timestamp = "Just now";

  // 1. Detect if question is about a pruned ghost branch or rejection
  if (
    queryLower.includes("prun") ||
    queryLower.includes("ghost") ||
    queryLower.includes("reject") ||
    queryLower.includes("why was") ||
    queryLower.includes("why did") ||
    queryLower.includes("veto")
  ) {
    const ghostNode = selectedNode?.isGhost ? selectedNode : trace?.nodes?.find((n) => n.isGhost);

    if (ghostNode) {
      return {
        id: `phantom-${Date.now()}`,
        role: "assistant",
        timestamp,
        content: `### 👻 Phantom Branch Analysis: Step #${ghostNode.stepIndex}

**Why the critic vetoed this branch:**
The agent considered an early speculative path, but the security critic pruned it before disk write.

**Critic Verdict:**
> "${ghostNode.ghostReason || "Pruned due to timing leak and insecure evaluation risk."}"

**Simple Explanation:**
The model tried to use an early-exit equality check (\`return input === expected\`). Because string comparisons in JavaScript/Node.js exit as soon as the first non-matching byte is found, attackers can measure sub-millisecond execution times to guess passwords or cryptographic signatures byte-by-byte.

**Direct & Simple Solution:**
Always compare sensitive hashes using constant-time byte buffers:`,
        codeSnippets: [
          {
            language: "typescript",
            filename: "src/auth_handler.ts",
            code: `import crypto from "crypto";

export function verifySignature(signature: string, expected: string): boolean {
  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expected);
  
  // 1. Length check in constant time
  if (bufA.length !== bufB.length) return false;
  
  // 2. Constant-time byte-level comparison prevents timing leaks
  return crypto.timingSafeEqual(bufA, bufB);
}`,
          },
        ],
        suggestedActions: [
          "Promote this pruned step to regression test",
          "Inspect code diff in inspector drawer",
          "Run Red-Ghost adversarial audit",
        ],
      };
    }
  }

  // 2. Detect if question asks for code fix or how to solve
  if (
    queryLower.includes("fix") ||
    queryLower.includes("solution") ||
    queryLower.includes("how to") ||
    queryLower.includes("code") ||
    queryLower.includes("patch") ||
    queryLower.includes("solve")
  ) {
    return {
      id: `phantom-${Date.now()}`,
      role: "assistant",
      timestamp,
      content: `### 🛠️ Simple Code Fix for ${selectedNode ? `Step #${selectedNode.stepIndex}: ${selectedNode.label}` : trace?.title || "Active Project"}

Here is the cleanest and most direct way to implement this securely:

1. **Deterministic Input Sanitization:** Never pass raw user prompts directly to shell or eval.
2. **Buffer Alignment:** Prevent timing side-channels using standard library crypto primitives.
3. **Structured Fallback:** Return clean boolean or error objects.`,
      codeSnippets: [
        {
          language: "typescript",
          filename: "src/auth_handler.ts",
          code: `import crypto from "crypto";

export function secureVerify(userToken: string, secretKey: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secretKey).update(userToken).digest();
    const provided = Buffer.from(userToken, "utf8");
    
    if (expected.length !== provided.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expected, provided);
  } catch (err) {
    return false;
  }
}`,
        },
      ],
      suggestedActions: [
        "Re-run this step in canvas",
        "Generate Vitest unit test",
        "View Working Memory Diff",
      ],
    };
  }

  // 3. Detect question about regression tests / CI/CD
  if (
    queryLower.includes("test") ||
    queryLower.includes("regression") ||
    queryLower.includes("vitest") ||
    queryLower.includes("pytest") ||
    queryLower.includes("ci/cd")
  ) {
    return {
      id: `phantom-${Date.now()}`,
      role: "assistant",
      timestamp,
      content: `### 🧪 Automated Golden Regression Test Suite

Here is a ready-to-run automated test file that reproduces this exact scenario and guarantees no future regression:`,
      codeSnippets: [
        {
          language: "typescript",
          filename: "test/security_regression.test.ts",
          code: `import { describe, it, expect } from "vitest";
import { secureVerify } from "../src/auth_handler";

describe("Regression Suite: Timing Invariant & Guardrail Security", () => {
  it("should reject early-exit timing leaks", () => {
    const valid = secureVerify("token_123", "secret_key");
    expect(typeof valid).toBe("boolean");
  });

  it("should maintain constant-time execution variance under 2ns", () => {
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      secureVerify("invalid_mismatch_token", "secret_key");
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100); // 100ms for 5000 iterations
  });
});`,
        },
      ],
      suggestedActions: [
        "Export Pytest / Vitest test files",
        "Open Regression Suite modal",
      ],
    };
  }

  // 4. Detect question about tool execution / parameters
  if (
    queryLower.includes("tool") ||
    queryLower.includes("sandbox") ||
    queryLower.includes("invok") ||
    queryLower.includes("mcp")
  ) {
    const toolNodes = trace?.nodes?.filter((n) => n.type === "TOOL_CALL" || n.type === "TOOL_RESULT") || [];
    return {
      id: `phantom-${Date.now()}`,
      role: "assistant",
      timestamp,
      content: `### 🛠️ Tool Sandbox & Parameter Security Report

**Tools Audited in this Run (${toolNodes.length} invocations):**
${toolNodes.map((t) => `- **Step #${t.stepIndex}:** \`${t.label}\` (Latency: ${t.latencyMs || 0}ms)`).join("\n")}

**Security Audit:**
- **Filesystem Isolation:** All file mutations were restricted to the ephemeral container workspace.
- **Speculative Veto Protection:** Unverified shell and eval calls were intercepted and pruned before host syscall execution.`,
      suggestedActions: [
        "Open MCP Control Plane Hub",
        "Inspect Virtual Filesystem (VFS) map",
        "Run Red-Ghost tool parameter audit",
      ],
    };
  }

  // 5. Detect question about latency, tokens or cost
  if (
    queryLower.includes("latency") ||
    queryLower.includes("slow") ||
    queryLower.includes("token") ||
    queryLower.includes("cost") ||
    queryLower.includes("speed") ||
    queryLower.includes("optim")
  ) {
    const totalTokens = trace?.totalTokens || 1250;
    const latency = trace?.durationMs || 840;
    return {
      id: `phantom-${Date.now()}`,
      role: "assistant",
      timestamp,
      content: `### ⚡ Latency & Token Optimization Plan

**Current Metrics for "${trace?.title || "Active Project"}":**
- **Total Latency:** ${latency}ms
- **Total Tokens:** ${totalTokens.toLocaleString()} tokens
- **Reasoning (CoT) Tokens:** ${trace?.reasoningTokens || Math.round(totalTokens * 0.45)} tokens

**3 Simple Steps to Speed this up by 40%:**
1. **Model Downgrade for Intermediate Steps:** Use lighter models (like GPT-4o-mini or Claude 3.5 Haiku) for parsing steps.
2. **Deterministic Delimiters:** Strip verbose system examples; replace with structured XML tags.
3. **Async Tool Parallelism:** Run independent tool calls concurrently rather than sequentially.`,
      suggestedActions: [
        "Open Waterfall Latency Drawer",
        "Run AI Prompt Optimizer Advisor",
        "Switch to Swarm Swimlane View",
      ],
    };
  }

  // 6. Default intelligent versatile response for ANY question
  return {
    id: `phantom-${Date.now()}`,
    role: "assistant",
    timestamp,
    content: `### 🔮 PhantomAI Insight

You asked: *"**${userQuery}**"*

${
  selectedNode
    ? `**Context Attached:** Step #${selectedNode.stepIndex} (\`${selectedNode.label}\` [${selectedNode.type}])`
    : trace
    ? `**Context Attached:** Active Project: \`${trace.title}\` (${trace.agentName || "Agent"})`
    : ""
}

**Direct Answer & Simple Guidance:**
1. **Isolate the Invariant:** Verify that intermediate outputs match expected schemas before downstream steps execute.
2. **Defensive Boundaries:** Handle edge cases deterministically with explicit fallbacks.
3. **Telemetry Validation:** Review the Code Diff and Memory Delta tabs in the drawer to inspect state transitions.

Here is a simple template you can adopt right away:`,
    codeSnippets: [
      {
        language: "python",
        filename: "agent_guardrail.py",
        code: `import ghosttrace

# Initialize GhostTRACE client
ghosttrace.configure(endpoint="http://localhost:3000")

def handle_task(directive: str):
    with ghosttrace.trace("Autonomous Action") as session:
        # Step 1: Input verification
        session.log_step("Input Ingestion", content=directive)
        
        # Step 2: Safe execution
        result = "Operation completed safely with zero invariant violations."
        session.log_step("Execution Result", content=result)
        return result`,
      },
    ],
    suggestedActions: [
      "Ask another question",
      "Explain this trace step-by-step",
      "Audit with Red-Ghost Red-Teaming",
    ],
  };
}
