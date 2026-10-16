# GhostTRACE Node.js / TypeScript SDK 👻🔍

[![npm version](https://img.shields.io/npm/v/ghosttrace.svg)](https://www.npmjs.com/package/ghosttrace)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

Official Node.js and TypeScript client for **[GhostTRACE](https://github.com/debangshuuii/GhostTRACE)** — the open-source autonomous AI agent execution & reasoning trace inspector.

Capture execution trees, tool calls, multi-agent handoffs, and **counterfactual "Ghost Branches"** (pruned speculative hypotheses and safety policy interventions).

---

## 📦 Installation

```bash
npm install ghosttrace
# or
pnpm add ghosttrace
# or
yarn add ghosttrace
```

---

## ⚡ 1-Line Zero-Code Auto-Instrumentation

Wrap any standard OpenAI client instance (OpenAI, DeepSeek, Azure, Groq, Ollama) in 1 line:

```typescript
import OpenAI from "openai";
import { wrapOpenAI } from "ghosttrace";

// Wrap your existing client
const client = wrapOpenAI(new OpenAI(), {
  endpoint: "http://localhost:3000",
  agentName: "CustomerSupportAgent",
});

// Use OpenAI exactly as normal
const completion = await client.chat.completions.create({
  model: "deepseek-r1",
  messages: [{ role: "user", content: "Optimize database indexes for query" }],
});
// Full prompt, reasoning <think> tags, and tool calls are now streaming live to GhostTRACE!
```

---

## 🌳 Explicit Multi-Agent Tracing & Counterfactual Ghost Branches

```typescript
import { GhostTraceClient } from "ghosttrace";

const client = new GhostTraceClient("http://localhost:3000");

// 1. Start Trace
const session = await client.startTrace({
  title: "Multi-Agent Code Generator",
  agentName: "CoordinatorSwarm",
  model: "claude-3-7-sonnet",
  tags: ["swarm", "code-gen"],
});

// 2. Add Prompt Step
const promptNode = await session.addStep({
  type: "USER_PROMPT",
  label: "User Directive",
  content: "Refactor authenticateUser to use Argon2",
});

// 3. Add Thinking Node
const thinkingNode = await promptNode.addNextStep({
  type: "THINKING",
  label: "Cryptographic Analysis",
  content: "Evaluating bcrypt vs argon2id memory hardness invariants...",
});

// 4. Record a PRUNED GHOST BRANCH (Hypothesis Vetoed by Critic)
await thinkingNode.addGhostBranch({
  label: "Store password in plaintext cache",
  content: "Alternative hypothesis: cache raw secret for 30s to bypass hashing latency.",
  ghostReason: "VETOED by CryptoGuard: plain text credential exposure policy violation.",
});

// 5. Add Chosen Tool Call
const toolNode = await thinkingNode.addNextStep({
  type: "TOOL_CALL",
  label: "Tool: npm_install",
  content: "npm install argon2",
});

// 6. Complete Trace
await session.finish("COMPLETED");
```

---

## 🎯 `withTrace` Helper

```typescript
import { withTrace } from "ghosttrace";

const result = await withTrace(
  { title: "Invoice Synthesis Task", model: "gpt-4o" },
  async (session) => {
    const step1 = await session.addStep({
      type: "TOOL_CALL",
      label: "Fetch Billing Data",
      content: "GET /api/v1/invoices/9481",
    });

    return { status: "processed" };
  }
);
```

---

## 📄 License
MIT © [Debangshu Sinha](https://github.com/debangshuuii/GhostTRACE)
