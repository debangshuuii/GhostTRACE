"use client";

import React, { useState } from "react";
import {
  X,
  Terminal,
  Code2,
  Copy,
  Check,
  Send,
  Loader2,
  CheckCircle2,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface SdkIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTraceCreated?: (traceId: string) => void;
}

export function SdkIntegrationModal({ isOpen, onClose, onTraceCreated }: SdkIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<"proxy" | "autoinstrument" | "python" | "typescript" | "otel" | "langgraph" | "curl">("proxy");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const proxySnippet = `# 👻 ZERO-CODE TRACING PROXY (Point any OpenAI-compatible client here)
# Endpoint: http://localhost:3000/v1 (or /api/v1)

# 1. Python (OpenAI SDK):
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-..."  # Your OpenAI / DeepSeek key (or GhostTRACE gt_live_... key)
)

# DeepSeek-R1 / o1 reasoning, tool calls, and ghost branches are auto-captured!
response = client.chat.completions.create(
    model="deepseek-r1",
    messages=[
        {"role": "system", "content": "You are an autonomous cloud resilience engineer."},
        {"role": "user", "content": "Analyze memory allocation and optimize redis clusters."}
    ],
    stream=True
)

# 2. Node.js / TypeScript:
import OpenAI from "openai";
const client = new OpenAI({
  baseURL: "http://localhost:3000/v1",
  apiKey: process.env.OPENAI_API_KEY
});

# 3. Environment Variable (Works with CrewAI, AutoGen, LangChain, Cursor, Open WebUI):
export OPENAI_BASE_URL="http://localhost:3000/v1"`;

  const autoinstrumentSnippet = `# 🐍 ZERO-CODE MONKEYPATCHING (Python & Node.js)

# Option A: Python 1-Line Monkeypatching (sdk/python/ghosttrace.py)
import ghosttrace
from openai import OpenAI

# Automatically intercepts client.chat.completions.create & extracts reasoning + tool calls
ghosttrace.patch_openai()

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Diagnose latency spike on payment worker"}]
)

# Also supports Anthropic Claude 3.7 with extended thinking blocks:
ghosttrace.patch_anthropic()

# Or wrap any custom agent function directly:
@ghosttrace.trace(title="Autonomous Auditor", agent_name="SecurityBot")
def audit_database(session, db_config):
    # Your agent code here...
    return {"status": "secure"}

# -------------------------------------------------------------
# Option B: Node.js / TypeScript Client Wrapper (sdk/node/ghosttrace.ts)
import { wrapOpenAI } from "./sdk/node/ghosttrace";
import OpenAI from "openai";

const client = wrapOpenAI(new OpenAI());`;

  const pythonSnippet = `# GhostTRACE Python SDK (sdk/python/ghosttrace.py)
from ghosttrace import GhostTraceClient

client = GhostTraceClient(endpoint="http://localhost:3000")

# 1. Start agent trace session
trace = client.start_trace(
    title="Autonomous SQL Query Optimization Agent",
    agent_name="Postgres-Optimizer-Swarm",
    model="deepseek-r1-distill",
    tags=["python", "postgres", "sql-tuning"]
)

# 2. Add user prompt & reasoning steps
step1 = trace.add_step(
    node_type="USER_PROMPT",
    label="User Query",
    content="Query on orders table takes 3.8s. Recommend index to optimize."
)

step2 = step1.add_next_step(
    node_type="THINKING",
    label="Analyze EXPLAIN Output",
    content="Detected sequential scan on (customer_id, created_at).",
    tokens=420,
    latency_ms=650
)

# 3. Record counterfactual GHOST BRANCH (Pruned by critic)
step2.add_ghost_branch(
    label="Drop and Re-create Table with Clustered Index",
    content="Run DROP TABLE orders; CREATE TABLE orders ...",
    ghost_reason="Critic Policy Veto: Drops production table causing complete data loss and downtime.",
    tokens=520,
    latency_ms=480,
    confidence_score=0.18
)

# 4. Record winning chosen action
step3 = step2.add_next_step(
    node_type="TOOL_CALL",
    label="tool: execute_sql",
    content="CREATE INDEX CONCURRENTLY idx_orders_cust ON orders(customer_id, created_at DESC);",
    tokens=280,
    latency_ms=1200
)

step3.add_next_step(
    node_type="LLM_RESPONSE",
    label="Final Verified Response",
    content="Applied concurrent composite index. Benchmark latency dropped from 3.8s to 2.4ms (1,500x speedup)."
)

trace.finish("COMPLETED")`;

  const tsSnippet = `// GhostTRACE Node.js / TypeScript SDK (sdk/node/ghosttrace.ts)
import { GhostTraceClient } from "./sdk/node/ghosttrace";

const client = new GhostTraceClient("http://localhost:3000");

// 1. Start streaming trace session
const session = await client.startTrace({
  title: "Cloud Kubernetes Auto-Healer Agent",
  agentName: "K8s-Remediation-Bot",
  model: "claude-3-7-sonnet",
  tags: ["typescript", "k8s", "devops"]
});

// 2. Add prompt and thinking step
const step1 = await session.addStep({
  type: "USER_PROMPT",
  label: "Alert: OOMKilled Pod",
  content: "Pod payment-service crashed with OOMKilled (Exit Code 137)."
});

const step2 = await step1.addNextStep({
  type: "THINKING",
  label: "Heap Analysis",
  content: "Investigating JVM heap spike during bulk refunds."
});

// 3. Add speculative pruned branch (Ghost Branch)
await step2.addGhostBranch({
  label: "Speculative Deployment Rollback",
  content: "Roll back to previous revision v1.2 without investigating heap.",
  ghostReason: "Critic Veto: Rollback breaks active database migrations.",
  tokens: 490,
  latencyMs: 380
});

// 4. Chosen action and response
const step3 = await step2.addNextStep({
  type: "TOOL_CALL",
  label: "tool: kubectl patch",
  content: "kubectl patch deployment payment-service --limits memory=2Gi"
});

await step3.addNextStep({
  type: "LLM_RESPONSE",
  label: "Resolved",
  content: "Memory limit scaled to 2Gi. Pod restarted healthy."
});

await session.finish("COMPLETED");`;

  const otelSnippet = `# Standard OpenTelemetry (OTel / OTLP) Configuration
# Any standard OpenTelemetry SDK or Collector can export traces directly to GhostTRACE.

# 1. Environment Variable for OTLP HTTP Exporter:
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/v1/traces"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_SERVICE_NAME="fraud-detection-swarm"

# 2. Python OpenTelemetry Setup:
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:3000/v1/traces"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("agent-tracer")

with tracer.start_as_current_span("User Transaction Check") as root_span:
    # Set attributes
    root_span.set_attribute("gen_ai.prompt", "Evaluate transaction #TX-9982 ($45,000)")
    
    # Mark a counterfactual pruned branch with ghost=True:
    with tracer.start_as_current_span("Ghost: Auto-Block Account") as ghost_span:
        ghost_span.set_attribute("ghost", True)
        ghost_span.set_attribute("ghost.reason", "Critic Veto: VIP customer false-positive threshold.")
    
    # Record winning step:
    with tracer.start_as_current_span("tool: request_dual_review") as tool_span:
        tool_span.set_attribute("tool.name", "request_dual_review")`;

  const langgraphSnippet = `# LangChain & LangGraph Ingestion Callback
import requests

GHOSTTRACE_LANGCHAIN_ENDPOINT = "http://localhost:3000/api/ingest/langchain"

# Simply post your LangChain / LangGraph execution Run object to GhostTRACE:
run_payload = {
    "name": "Market Due Diligence Graph",
    "run_type": "chain",
    "inputs": {"input": "Analyze TSMC wafer fabrication market guidance for Q3"},
    "extra": {
        "metadata": {
            "model": "claude-3-7-sonnet",
            "agent_name": "EquityResearchAgent"
        }
    },
    "child_runs": [
        {
            "id": "step-1",
            "name": "tool: search_sec_filings",
            "run_type": "tool",
            "inputs": {"query": "TSMC 10-Q Q3 Gross Margin"},
            "outputs": {"output": "Reported 54.2% gross margin in official 10-Q filing."}
        },
        {
            "id": "ghost-1",
            "parent_run_id": "step-1",
            "name": "Ghost: Extrapolate Unverified Rumor from Forum",
            "run_type": "llm",
            "inputs": {"prompt": "Rumor claims 62% margin surge next quarter."},
            "extra": {
                "metadata": {
                    "is_ghost": True,
                    "ghost_reason": "Zero-Trust Fact Check: Unsubstantiated blog hearsay; discarded."
                }
            }
        },
        {
            "id": "step-2",
            "parent_run_id": "step-1",
            "name": "Verified Synthesis",
            "run_type": "llm",
            "outputs": {"output": "TSMC affirmed 53.5-55.5% guidance with high confidence."}
        }
    ]
}

res = requests.post(GHOSTTRACE_LANGCHAIN_ENDPOINT, json=run_payload)
print(f"Ingested into GhostTRACE: {res.json()}")`;

  const curlSnippet = `# 1. Stream trace via REST API:
curl -X POST http://localhost:3000/api/traces/stream \\
  -H "Content-Type: application/json" \\
  -d '{"event":"TRACE_START","data":{"title":"cURL Agent Trace","agentName":"cURL-Bot","model":"gpt-4o"}}'

# 2. Ingest OpenTelemetry JSON directly:
curl -X POST http://localhost:3000/api/ingest/otel \\
  -H "Content-Type: application/json" \\
  -d '{
    "resourceSpans": [{
      "resource": { "attributes": [{ "key": "service.name", "value": "curl-agent" }] },
      "scopeSpans": [{
        "spans": [
          { "spanId": "s1", "name": "User Objective", "attributes": [{ "key": "gen_ai.prompt", "value": "Run sanity test" }] },
          { "spanId": "s2", "parentSpanId": "s1", "name": "Ghost: Risky Plan", "attributes": [{ "key": "ghost", "value": true }, { "key": "ghost.reason", "value": "Policy veto" }] },
          { "spanId": "s3", "parentSpanId": "s1", "name": "Verified Output", "attributes": [{ "key": "gen_ai.completion", "value": "Verified successfully." }] }
        ]
      }]
    }]
  }'`;

  const getActiveCode = () => {
    switch (activeTab) {
      case "proxy": return proxySnippet;
      case "autoinstrument": return autoinstrumentSnippet;
      case "python": return pythonSnippet;
      case "typescript": return tsSnippet;
      case "otel": return otelSnippet;
      case "langgraph": return langgraphSnippet;
      case "curl": return curlSnippet;
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestIngest = async () => {
    try {
      setTesting(true);
      setTestSuccess(null);

      let createdTraceId = "";

      if (activeTab === "proxy") {
        // Send request through Zero-Code OpenAI-compatible Proxy
        const res = await fetch("/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ghosttrace-internal": "true",
            "x-ghosttrace-title": "Zero-Code OpenAI Proxy Test Run",
            "x-ghosttrace-agent": "ZeroCode-Proxy-Bot",
          },
          body: JSON.stringify({
            model: "deepseek-r1",
            messages: [
              {
                role: "user",
                content: "Validate the zero-code OpenAI proxy endpoint and verify reasoning chain capture.",
              },
            ],
          }),
        });
        const traceHeaderId = res.headers.get("x-ghosttrace-id");
        if (traceHeaderId) {
          createdTraceId = traceHeaderId;
        } else {
          const proxyData = await res.json();
          createdTraceId = proxyData.id?.replace("chatcmpl-", "") || "";
        }
      } else if (activeTab === "otel") {
        // Send real OpenTelemetry payload
        const otelPayload = {
          resourceSpans: [
            {
              resource: {
                attributes: [
                  { key: "service.name", value: { stringValue: "Live-OTel-Ingested-Agent" } },
                  { key: "gen_ai.request.model", value: { stringValue: "claude-3-7-sonnet" } },
                ],
              },
              scopeSpans: [
                {
                  spans: [
                    {
                      spanId: "otel-root",
                      name: "User Directive (OTel)",
                      attributes: [
                        { key: "gen_ai.prompt", value: { stringValue: "Verify zero-trust authentication payload" } },
                      ],
                    },
                    {
                      spanId: "otel-ghost",
                      parentSpanId: "otel-root",
                      name: "Ghost: Bypass Token Validation via Wildcard Secret",
                      attributes: [
                        { key: "ghost", value: { boolValue: true } },
                        { key: "ghost.reason", value: { stringValue: "Critic Security Guardrail: Prohibits wildcard secret match in production." } },
                        { key: "gen_ai.completion", value: { stringValue: "Speculatively bypass signature check..." } },
                      ],
                    },
                    {
                      spanId: "otel-verified",
                      parentSpanId: "otel-root",
                      name: "Verified: Strict RS256 Signature Audit",
                      attributes: [
                        { key: "gen_ai.completion", value: { stringValue: "Audited public key JWKS thumbprint. Signature valid." } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        };

        const res = await fetch("/api/ingest/otel", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-ghosttrace-internal": "true" },
          body: JSON.stringify(otelPayload),
        });
        const data = await res.json();
        createdTraceId = data.traceId;
      } else if (activeTab === "langgraph") {
        const langPayload = {
          name: "LangGraph Multi-Step Reasoning Run",
          run_type: "chain",
          inputs: { input: "Investigate AWS CloudTrail Anomalous API Calls" },
          extra: {
            metadata: {
              model: "deepseek-r1-distill",
              agent_name: "SecOps-Swarm",
            },
          },
          child_runs: [
            {
              id: "lg-1",
              name: "tool: cloudtrail_lookup",
              run_type: "tool",
              inputs: { eventName: "AuthorizeSecurityGroupIngress" },
              outputs: { output: "Found 0.0.0.0/0 ingress opened on port 22." },
            },
            {
              id: "lg-ghost",
              parent_run_id: "lg-1",
              name: "Ghost: Blindly Delete VPC Security Group",
              run_type: "llm",
              extra: {
                metadata: {
                  is_ghost: true,
                  ghost_reason: "Critic Veto: Deleting shared security group breaks active production RDS connections.",
                },
              },
            },
            {
              id: "lg-2",
              parent_run_id: "lg-1",
              name: "Revoke Security Group Rule Concurrently",
              run_type: "tool",
              outputs: { output: "Revoked 0.0.0.0/0 rule on port 22 without breaking existing RDS connectivity." },
            },
          ],
        };

        const res = await fetch("/api/ingest/langchain", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-ghosttrace-internal": "true" },
          body: JSON.stringify(langPayload),
        });
        const data = await res.json();
        createdTraceId = data.traceId;
      } else {
        // Standard Stream API (Python / TS / cURL)
        const streamHeaders = { "Content-Type": "application/json", "x-ghosttrace-internal": "true" };
        const startRes = await fetch("/api/traces/stream", {
          method: "POST",
          headers: streamHeaders,
          body: JSON.stringify({
            event: "TRACE_START",
            data: {
              title: `Live ${activeTab.toUpperCase()} SDK Agent Session`,
              agentName: `${activeTab.toUpperCase()}-Agent`,
              model: "deepseek-r1-distill",
              tags: [activeTab, "live-sdk", "ghost-pruning"],
              description: `Real-time execution trace ingested via ${activeTab} client.`,
            },
          }),
        });
        const startData = await startRes.json();
        createdTraceId = startData.traceId;

        // Root
        await fetch("/api/traces/stream", {
          method: "POST",
          headers: streamHeaders,
          body: JSON.stringify({
            event: "NODE_ADDED",
            traceId: createdTraceId,
            data: {
              nodeId: "stream-n1",
              stepIndex: 1,
              type: "USER_PROMPT",
              label: "User Directive via SDK",
              content: "Analyze payment latency spike and isolate failing replica.",
              tokens: 45,
              latencyMs: 12,
            },
          }),
        });

        // Ghost
        await fetch("/api/traces/stream", {
          method: "POST",
          headers: streamHeaders,
          body: JSON.stringify({
            event: "NODE_ADDED",
            traceId: createdTraceId,
            data: {
              nodeId: "stream-ghost",
              parentNodeId: "stream-n1",
              stepIndex: 2,
              type: "GHOST_REJECTED",
              label: "Ghost: Hard Reboot Master DB Node",
              content: "Proposed executing SIGKILL on active PostgreSQL primary instance.",
              isGhost: true,
              ghostReason: "Critic Guardrail: High blast radius action violates safe recovery policy.",
              tokens: 650,
              latencyMs: 780,
            },
          }),
        });

        // Final
        await fetch("/api/traces/stream", {
          method: "POST",
          headers: streamHeaders,
          body: JSON.stringify({
            event: "NODE_ADDED",
            traceId: createdTraceId,
            data: {
              nodeId: "stream-n2",
              parentNodeId: "stream-n1",
              stepIndex: 3,
              type: "LLM_RESPONSE",
              label: "Graceful Connection Drain & Failover",
              content: "Drained connections to degraded replica and promoted standby. Latency normalized to 14ms.",
              tokens: 390,
              latencyMs: 510,
            },
          }),
        });

        // End
        await fetch("/api/traces/stream", {
          method: "POST",
          headers: streamHeaders,
          body: JSON.stringify({
            event: "TRACE_END",
            traceId: createdTraceId,
            data: { status: "COMPLETED" },
          }),
        });
      }

      setTestSuccess(`Successfully ingested live trace (${createdTraceId})!`);
      if (onTraceCreated && createdTraceId) {
        onTraceCreated(createdTraceId);
      }
    } catch (err: any) {
      console.error("Test stream error:", err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[740px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Agent Framework SDK &amp; Ingestion Protocols
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                OTel Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Stream live execution paths &amp; pruned ghost branches from Python, TypeScript, OpenTelemetry, or LangGraph.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-4 mb-4 text-xs font-medium overflow-x-auto pb-1">
          {(["proxy", "autoinstrument", "python", "typescript", "otel", "langgraph", "curl"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 border-b-2 capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "border-cyan-400 text-cyan-300 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "proxy"
                ? "⚡ Zero-Code Proxy"
                : tab === "autoinstrument"
                ? "🐍 Auto-Instrument (Patch)"
                : tab === "otel"
                ? "OpenTelemetry (OTel)"
                : tab === "langgraph"
                ? "LangChain / LangGraph"
                : tab === "typescript"
                ? "TypeScript / Node"
                : tab}
            </button>
          ))}
        </div>

        {/* Code Box */}
        <div className="relative flex-1 bg-black/90 border border-slate-800 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/70 text-[11px] text-slate-400 font-mono">
            <span>
              {activeTab === "proxy"
                ? "OpenAI Client Proxy Config (Python / TS)"
                : activeTab === "autoinstrument"
                ? "sdk/python/ghosttrace.py (Monkeypatch)"
                : activeTab === "curl"
                ? "bash (cURL)"
                : activeTab === "otel"
                ? "opentelemetry_config.py"
                : activeTab === "typescript"
                ? "sdk/node/ghosttrace.ts"
                : activeTab === "langgraph"
                ? "langchain_callback.py"
                : "sdk/python/ghosttrace.py"}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Snippet"}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan-200/90 overflow-y-auto max-h-72 leading-relaxed">
            {getActiveCode()}
          </pre>
        </div>

        {/* Live Test Trigger */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px]">
            Active Endpoint:{" "}
            <code className="text-cyan-400 font-mono">
              {activeTab === "otel" ? "/v1/traces (OTLP HTTP)" : activeTab === "langgraph" ? "/api/ingest/langchain" : "/api/traces/stream"}
            </code>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestIngest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-all shadow-[0_0_12px_rgba(6,182,212,0.35)] disabled:opacity-50"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Dispatch Live Test ({activeTab.toUpperCase()})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {testSuccess && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{testSuccess} Trace is now visible in the explorer!</span>
          </div>
        )}
      </div>
    </div>
  );
}
