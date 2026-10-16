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
- **Official PyPI & npm Packages**: Install directly via `pip install ghosttrace` and `npm install ghosttrace`. Includes automated GitHub Actions CI/CD publishing workflows (`.github/workflows/`).

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

### 11. 🧵 Multi-Turn Conversation Sessions & Thread Hierarchy
- Group isolated agent runs into persistent conversation threads (`sessionId`, `turnIndex`).
- Inspect context drift, accumulated memory, and ghost pruning frequency across turns in real-world chat and coding workflows.
- Switch between **"All Runs"** and **"Grouped Threads"** directly in the Trace Explorer sidebar.

### 12. 🚨 Real-Time Production Incident Webhook Alerting (Slack / Discord)
- Automated dispatch to Slack (Block Kit) and Discord (rich embeds) on:
  - Guardrail policy vetoes (destructive commands, secret leaks)
  - Runaway swarm ping-pong loops
  - Step token blast radius spikes (> 5,000 tokens)
  - Agent runtime crashes & unhandled exceptions
- Includes 1-click test beacon verification and configurable minimum alert severity thresholds.

### 13. 🧠 Deep Reasoning & Chain-of-Thought (CoT) Cognitive Profiler
- Deconstructs reasoning tokens (`<think>` tags and thinking chains) into **4 semantic trajectory phases**:
  - `Hypothesis & Goal Formulation` (Sky)
  - `Constraint & Invariant Verification` (Indigo)
  - `Hesitation & Rollback` (Rose)
  - `Decisive Synthesis` (Emerald)
- Identifies **Cognitive Drift**, circular reasoning loops, proposition cycling, and ungrounded claims.
- Integrated mini-trajectory progress bars in `ThinkingNode` on canvas and in `NodeInspectorDrawer`.

### 14. 👻 Ghost Engine 2.0: Best-of-3 Speculative MCTS Tree Search
- Select **"MCTS Best-of-3 Speculation"** in Live Agent Studio.
- Agent spawns 3 diverse candidate hypotheses simultaneously (Aggressive Direct Action, Brute-Force AST Scan, and Verified Primitive).
- Automated Critic Evaluators score each path; the winner becomes the active trunk, while suboptimal alternatives automatically materialize as **interactive Ghost Branches** with rejection rationales.

### 15. 🧪 "Ghost-to-Test" Continuous Regression Suite & CI/CD Golden Exporter
- 1-Click promotion of any pruned ghost failure or critic veto into a permanent **Automated Regression Test Case**.
- Built-in runner with live pass-rate scoreboard and regression drift alerts.
- Export entire suite to:
  - **Pytest** (`test_ghost_regressions.py`)
  - **Vitest / Jest** (`agent-regressions.test.ts`)
  - **Golden JSON Dataset**
  - **GitHub Actions CI/CD YAML**

### 16. ⚡ Live In-DAG Step Re-Execution ("Jupyter for Agent DAGs")
- Click **"Re-run"** on any node in the inspector or canvas.
- Edit prompt, thought, or tool outputs directly at that step.
- Automatically re-runs downstream tools and synthesizes an updated deliverable live into the DAG with real-time SSE streaming.

### 17. 🐝 A2A (Agent-to-Agent) Interactive Sequence Diagram & Loop Circuit-Breaker
- Interactive UML-style sequence chart tracking chronological message exchanges between Swarm Coordinator, Subagents, and Safety Critics.
- **Active Loop Circuit-Breaker**: Automatically caps reciprocal agent ping-pong at configurable rounds (default: 3) and injects a synthetic coordinator resolution to prevent token explosion.

### 18. 🔌 Model Context Protocol (MCP) Live Control Plane & RPC Tester
- Native support for Anthropic & open-source MCP servers (`filesystem`, `crypto-guard`, `postgres-read`).
- Test tool execution in isolation with JSON-Schema validation and inspect JSON-RPC 2.0 request/response frames.

### 19. 🚀 Mission Control SOC Wall & High-Density Telemetry Ticker
- **Full-Screen Cyberpunk Command Deck**: Instant toggle via toolbar button or `Ctrl+M` / `Cmd+M` hotkey.
- **Analog-Digital Radial Speedometers**: Real-time Token Burn Tachometer, Critic Veto Odometer, Step Latency Dial, and CoT Density Gauge.
- **Cognitive Drift Seismograph**: Real-time canvas EEG waveform monitor of reasoning stability and ghost branch entropy.
- **Quarantined Ghost Pods**: Threat containment vault of all pruned hypotheses with 1-click DAG inspection.
- **High-Speed Live Terminal Stream**: Chronological millisecond telemetry feed with severity filtering and audio feedback.
- **Tactile Sci-Fi Audio FX**: Integrated procedural Web Audio API synthesizers for radar sweeps, keystrokes, and emergency alarms.

### 20. ⚡ ClickHouse & TimescaleDB High-Velocity Columnar Adapters
- **ClickHouse Columnar Engine (`MergeTree`)**: Ingest 100M+ spans/day with sub-3ms P95 vector latency calculations and monthly partitioning.
- **TimescaleDB PostgreSQL Hypertables**: Automated chunking, 7-day compression rollups, and continuous aggregate `time_bucket` queries.
- **Unified Storage Orchestrator & Dual-Write Pipeline**: Concurrently write metadata to SQLite/Postgres while streaming high-velocity spans to ClickHouse.
- **Live Throughput Benchmark Runner**: Test and compare write throughput (spans/sec) directly from the **Cluster** UI.
- **Docker Profiles**: Launch with `docker compose --profile clickhouse up` or `docker compose --profile timescaledb up`.

### 21. 🔐 Hosted Cloud Multi-Tenant Auth & Role-Based Access Control (RBAC)
- **OAuth Single Sign-On (GitHub / Google)**: Multi-tenant user identity with verified provider links.
- **4-Tier Granular RBAC Matrix**:
  - `OWNER`: Full cloud control, billing, member invites, security governance, and workspace deletion.
  - `ADMIN`: API key rotation, guardrail threshold management, incident webhook alerts, and ClickHouse cluster migrations.
  - `DEVELOPER`: Live Agent Studio execution, in-DAG breakpoint interventions, Red-Ghost simulation, and DPO training export.
  - `VIEWER`: Read-only audit access to execution trees, time-travel playback, and telemetry charts.
- **Team Workspace Management**: Invite members via email, update roles in real time, and inspect authorization logs.

### 22. ⚡ Spotlight Command Palette (`Ctrl+K` / `⌘K`) & Omni-Search
- **Raycast & Linear-Style Command Center**: Press `Ctrl+K` or `⌘K` from anywhere in the application to summon the central HUD with tactile cyber audio feedback.
- **Unified Omni-Search**: Instant fuzzy search across system actions, loaded traces, step contents, tool calls, and pruned ghost hypotheses.
- **Category Filter Tabs**: Quick filter pills for `ALL`, `ACTIONS`, `TRACES`, `STEPS`, and `GHOSTS`.
- **Full Keyboard Navigation**: Seamless `↑`/`↓` cycling, `Enter` selection with audio chime, and `Esc` dismissal.
- **Direct Deep-Linking**: Jump directly into individual execution steps or counterfactual ghost branches on the canvas with 1 keystroke.

### 23. 💰 Prompt Caching & Token Budget Cost Optimizer ("Anthropic & OpenAI Cost Slasher")
- **Live Dollar ROI Calculator**: Automatically analyzes input/output token prefixes across any trace DAG and computes before/after cost per run and monthly fleet projections.
- **Provider Pricing Engine**: Built-in support for Anthropic Claude 3.7 Sonnet (90% cache discount), Claude 3.5 Haiku, OpenAI GPT-4o (50% prefix discount), and DeepSeek-R1 (75% discount).
- **Interactive Breakpoint Blueprint**: Visualizes static system instructions, tool schema declarations, and multi-turn checkpoints (`cache_control: {"type": "ephemeral"}`).
- **Cache Invalidation Anti-Pattern Audit**: Proactively flags volatile timestamps, randomized nonces, and tool ordering jitter that bust cache hit rates.
- **1-Click SDK Exporter**: Generates production-ready Python (`anthropic.beta.prompt_caching`) and TypeScript (`@anthropic-ai/sdk`) boilerplate code with 1 click.

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
