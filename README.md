# GhostTRACE 👻🔍
### Autonomous AI Agent Execution & Reasoning Trace Inspector

> **GhostTRACE** is an open-source observability studio and reasoning DAG inspector designed for autonomous AI agents, multi-agent swarms, and reasoning LLMs (DeepSeek-R1, Claude 3.7 Sonnet, OpenAI o1/GPT-4o). It specializes in visualizing execution trees, subagent handoffs, tool calls, and **counterfactual "Ghost Branches"** — speculative hypotheses, pruned reasoning paths, hallucination rollbacks, and safety policy interventions.

---

## 🌟 Key Features

### 1. 🤖 Live Agent Execution Studio & Sandbox
- Run reasoning loops directly in the GhostTRACE UI with customizable models (`deepseek-r1`, `claude-3-7-sonnet`, `gpt-4o`, `gemini-1.5-flash`, `ollama`).
- Built-in sandbox tools: `read_file`, `web_search`, and `criticEvaluator`.
- Watch live agent loops spawn thoughts, evaluate hypotheses, and prune ghost branches in real-time.

### 2. ⚡ Real-Time Server-Sent Events (SSE) Live Stream Feed
- Native `/api/traces/live` SSE streaming endpoint for live span broadcasting.
- Watch nodes, critic vetoes, and reasoning handoffs materialize on the canvas dynamically without refreshing.

### 3. 🏊 Multi-Agent Swarm Swimlanes & Dagre Auto-Layout
- **Swarm Swimlanes**: Segregates swarm tasks across 5 distinct bands: `Ingress (Gateway)`, `Planner (Coordinator)`, `Tools & Subagents`, `Critic (Safety Vetoes)`, and `Synthesis (Deliverables)`.
- **Dagre Hierarchical Auto-Layout**: Topological collision-free layout engines (**Auto LR** and **Auto TB**) powered by `@dagrejs/dagre`.
- **Interactive MiniMap**: Global canvas navigator with color-coded node categories.
- **Node Filter & Search**: Instant keyword search and category filtering with non-matching node dimming.

### 4. ⚡ Zero-Code OpenAI-Compatible Tracing Proxy & SDKs
- **Zero-Code Tracing Reverse Proxy**: Point any OpenAI-compatible client (OpenAI, DeepSeek, LangChain, CrewAI, AutoGen, Cursor) to `http://localhost:3000/v1` (`/v1/chat/completions`). GhostTRACE automatically intercepts reasoning paths, CoT `<think>` tags, tool calls, and critic-pruned ghost branches with zero code changes!
- **Zero-Code Python Monkeypatching**: `ghosttrace.patch_openai()` and `ghosttrace.patch_anthropic()` automatically instrument any existing client in 1 line.
- **Zero-Code TypeScript / Node Wrapper**: `wrapOpenAI(client)` and `withTrace(fn)`.
- **OpenTelemetry Standard Ingestion**: Ingest spans directly via `/api/ingest/otel` and standard collector alias `/v1/traces`.
- **LangChain & LangGraph**: Dedicated `/api/ingest/langchain` endpoint for RunTree payloads.
- **Official Python & Node.js SDKs**: `sdk/python/ghosttrace.py` and `sdk/node/ghosttrace.ts`.

### 5. 🔑 Multi-Tenant API Key Management with SHA-256 Hashing
- Issue scoped credentials (`gt_live_...` for production, `gt_test_...` for staging).
- Cryptographic SHA-256 key hashing at rest with one-time secret reveal dialogue.
- Automated `lastUsedAt` telemetry tracking.

### 6. 🏆 Automated Evals & LLM-as-a-Judge Fleet Benchmark
- Multi-dimensional scoring for Faithfulness, Ghost Pruning Efficiency, Safety Policy Adherence, and Cost.
- Fleet-wide comparative leaderboard ranking agent runs across models and prompts.

### 7. 🎯 Multi-Format DPO & Fine-Tuning Exporter
- Automatically extracts **Chosen (Preferred)** vs. **Rejected (Ghost Branch)** pairs from your traces.
- 1-click export to:
  - **HuggingFace TRL** format (`prompt`, `chosen`, `rejected`)
  - **OpenAI Fine-Tuning** JSONL
  - **Standard CSV** (RFC-4180)
  - **Raw DPO JSON**

### 8. 🎥 Native Screen Video Replay & HTML Bundler
- Built-in browser `MediaRecorder` captures execution replay videos in `.webm` format.
- Export full audit packages as self-contained interactive `.zip` bundles or single-file HTML reports.

### 9. 🔀 Counterfactual "What-If" Branch Playground
- Click **"Fork Step"** on any node.
- AI synthesizers generate speculative ghost branches or optimal alternative branches directly into the live DAG.

### 10. 🛡️ Guardrails & Safety Policy Engine
- Pre-configured checks for destructive commands (`rm -rf`, `DROP TABLE`, `kubectl drain`), secret/credential leaks, token spikes, and hallucinations.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) + SQLite (`dev.db`)
- **Graph Visualization**: [@xyflow/react](https://reactflow.dev/) (React Flow v12) + [@dagrejs/dagre](https://github.com/dagrejs/dagre)
- **Real-Time Streaming**: Server-Sent Events (SSE) + Node `EventEmitter`
- **Charts & Telemetry**: [Recharts](https://recharts.org/)
- **Archive Extraction & Bundling**: [JSZip](https://stuk.github.io/jszip/)
- **Validation**: [Zod](https://zod.dev/)
- **Containerization**: Docker & Docker Compose

---

## 🏁 Quickstart

### Option A: Local Node.js

```bash
# 1. Install dependencies
npm install

# 2. Synchronize database
npx prisma generate
npx prisma db push

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Docker Compose

```bash
docker compose up --build
```

---

## 📄 License
MIT
