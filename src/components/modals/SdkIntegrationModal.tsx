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
  FlaskConical,
  ArrowRight,
} from "lucide-react";

interface SdkIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTraceCreated?: (traceId: string) => void;
}

const PRESET_PAYLOADS = {
  langchain: {
    endpoint: "/api/ingest/langchain",
    name: "LangGraph Multi-Step Agent (with Ghost Veto)",
    body: {
      name: "Autonomous Cloud Infrastructure Healer",
      run_type: "chain",
      inputs: { input: "Investigate latency spike and isolate failing payment replica." },
      extra: {
        metadata: {
          model: "claude-3-7-sonnet",
          agent_name: "CloudResilienceAgent"
        }
      },
      child_runs: [
        {
          name: "Query Kubernetes Pod Metrics",
          run_type: "tool",
          inputs: { namespace: "production", deployment: "payment-worker" },
          outputs: { oomCount: 4, memoryUsagePercent: 96.8 }
        },
        {
          name: "Ghost: Hard Reboot Database Cluster Master",
          run_type: "llm",
          inputs: { action: "cluster_reboot" },
          outputs: { output: "Initiating emergency failover restart." },
          extra: {
            metadata: {
              is_ghost: true,
              ghost_reason: "Critic Security Veto: Destructive restart causes cascading connection pool exhaustion."
            }
          }
        },
        {
          name: "Scale Pod Memory Limits Gracefully",
          run_type: "tool",
          inputs: { limits: "memory=2Gi", requests: "memory=1Gi" },
          outputs: { status: "Deployment patched. Rollout status: 3/3 pods healthy." }
        },
        {
          name: "Final Executive Resolution",
          run_type: "llm",
          inputs: { status: "RESOLVED" },
          outputs: { output: "Root cause: OOM on bulk refunds. Memory limit doubled to 2Gi. Cluster latency returned to 32ms nominal." }
        }
      ]
    }
  },
  otel: {
    endpoint: "/api/ingest/otel",
    name: "OpenTelemetry (OTel JSON Spans)",
    body: {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "Kafka-Event-Processor" } },
              { key: "gen_ai.request.model", value: { stringValue: "deepseek-r1" } }
            ]
          },
          scopeSpans: [
            {
              spans: [
                {
                  spanId: "otel-s1",
                  name: "Kafka Lag Analysis",
                  attributes: [
                    { key: "gen_ai.prompt", value: { stringValue: "Evaluate partition lag on checkout-transactions topic." } }
                  ]
                },
                {
                  spanId: "otel-ghost",
                  parentSpanId: "otel-s1",
                  name: "Ghost: Purge Unprocessed Queue Messages",
                  attributes: [
                    { key: "ghost", value: { boolValue: true } },
                    { key: "ghost.reason", value: { stringValue: "Critic Guardrail Veto: Dropping customer transactions violates zero-data-loss policy." } }
                  ]
                },
                {
                  spanId: "otel-s2",
                  parentSpanId: "otel-s1",
                  name: "Autoscale Partition Consumer Replicas",
                  attributes: [
                    { key: "gen_ai.completion", value: { stringValue: "Scaled 4 additional consumer pods. Queue lag completely drained." } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  mcp: {
    endpoint: "/api/ingest/mcp",
    name: "Anthropic MCP Tool Call Exchange",
    body: {
      clientName: "Claude Desktop (MCP Host)",
      serverName: "production-postgres-mcp",
      model: "claude-3-7-sonnet",
      prompt: "Inspect transactions index health and mitigate table bloat",
      exchanges: [
        {
          method: "tools/call",
          request: { name: "explain_query", arguments: { sql: "SELECT * FROM transactions WHERE user_id = 'usr_998'" } },
          response: { plan: "Seq Scan on transactions (cost=0.00..4520.00 rows=1)" },
          latencyMs: 120
        },
        {
          method: "tools/call",
          request: { name: "drop_table", arguments: { table: "transactions" } },
          isGhost: true,
          ghostReason: "Critic Policy Veto: Destructive table drop blocked on production primary",
          latencyMs: 80
        },
        {
          method: "tools/call",
          request: { name: "create_index", arguments: { sql: "CREATE INDEX CONCURRENTLY idx_tx_user ON transactions(user_id);" } },
          response: { status: "SUCCESS", indexSize: "42MB" },
          latencyMs: 450
        }
      ]
    }
  }
};

export function SdkIntegrationModal({ isOpen, onClose, onTraceCreated }: SdkIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<
    "playground" | "proxy" | "autoinstrument" | "mcp" | "python" | "typescript" | "otel" | "langgraph" | "curl"
  >("playground");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [createdTraceId, setCreatedTraceId] = useState<string | null>(null);

  // Playground State
  const [selectedPreset, setSelectedPreset] = useState<"langchain" | "otel" | "mcp">("langchain");
  const [playgroundJson, setPlaygroundJson] = useState<string>(
    JSON.stringify(PRESET_PAYLOADS.langchain.body, null, 2)
  );
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<string>(
    PRESET_PAYLOADS.langchain.endpoint
  );
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetKey: "langchain" | "otel" | "mcp") => {
    setSelectedPreset(presetKey);
    const preset = PRESET_PAYLOADS[presetKey];
    setPlaygroundEndpoint(preset.endpoint);
    setPlaygroundJson(JSON.stringify(preset.body, null, 2));
    setPlaygroundResponse(null);
    setJsonError(null);
  };

  const handleDispatchPlayground = async () => {
    try {
      setTesting(true);
      setJsonError(null);
      setPlaygroundResponse(null);

      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(playgroundJson);
      } catch (err: any) {
        setJsonError(`Invalid JSON syntax: ${err.message}`);
        setTesting(false);
        return;
      }

      const res = await fetch(playgroundEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ghosttrace-internal": "true",
        },
        body: JSON.stringify(parsedPayload),
      });

      const responseData = await res.json();
      setPlaygroundResponse(responseData);

      if (res.ok && responseData.traceId) {
        setCreatedTraceId(responseData.traceId);
        if (onTraceCreated) {
          onTraceCreated(responseData.traceId);
        }
      } else {
        setJsonError(responseData.error || `HTTP ${res.status}: Failed to ingest`);
      }
    } catch (err: any) {
      setJsonError(err.message || "Network request failed");
    } finally {
      setTesting(false);
    }
  };

  const proxySnippet = `# 👻 ZERO-CODE TRACING PROXY (Point any OpenAI-compatible client here)
# Endpoint: http://localhost:3000/v1 (or /api/v1)

# 1. Python (OpenAI SDK):
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="sk-..."  # Your OpenAI / DeepSeek key (or GhostTRACE gt_live_... key)
)

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

# 3. Environment Variable (Works with CrewAI, AutoGen, LangChain, Cursor):
export OPENAI_BASE_URL="http://localhost:3000/v1"`;

  const autoinstrumentSnippet = `# 📦 OFFICIAL PUBLIC REGISTRIES:
# pip install ghosttrace
# npm install ghosttrace

# 🐍 Option A: Python 1-Line Auto-Instrumentation (pip install ghosttrace)
import ghosttrace
from openai import OpenAI

ghosttrace.patch_openai()

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Diagnose latency spike on payment worker"}]
)

ghosttrace.patch_anthropic()`;

  const pythonSnippet = `# GhostTRACE Python Native SDK
from ghosttrace import GhostTraceClient

client = GhostTraceClient("http://localhost:3000")
trace = client.start_trace(title="Fraud Detection Swarm", model="claude-3-7-sonnet")

step1 = trace.add_step(type="USER_PROMPT", content="Check transaction $45,000")
step1.add_ghost_branch(
    label="Auto-Block VIP Account",
    ghost_reason="Critic Veto: Exceeds false-positive threshold."
)
trace.finish(status="COMPLETED")`;

  const tsSnippet = `// GhostTRACE TypeScript SDK
import { GhostTraceClient } from "./sdk/node/ghosttrace";

const client = new GhostTraceClient("http://localhost:3000");
const session = await client.startTrace({
  title: "Cloud Kubernetes Auto-Healer",
  model: "claude-3-7-sonnet"
});
await session.finish("COMPLETED");`;

  const otelSnippet = `# Standard OpenTelemetry (OTel / OTLP) Configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:3000/v1/traces"
export OTEL_EXPORTER_OTLP_PROTOCOL="http/json"
export OTEL_SERVICE_NAME="fraud-detection-swarm"`;

  const langgraphSnippet = `# LangChain & LangGraph Ingestion Callback
import requests

GHOSTTRACE_ENDPOINT = "http://localhost:3000/api/ingest/langchain"
# POST Run object directly to GhostTRACE:
res = requests.post(GHOSTTRACE_ENDPOINT, json=run_payload)`;

  const curlSnippet = `curl -X POST http://localhost:3000/api/ingest/langchain \\
  -H "Content-Type: application/json" \\
  -d '{"name": "cURL Agent Run", "inputs": {"input": "Ping"}}'`;

  const mcpSnippet = `# Model Context Protocol (MCP) Ingestion
Endpoint: http://localhost:3000/api/ingest/mcp
Send exchanges array with tool calls and optional ghost branch annotations.`;

  const getActiveCode = () => {
    switch (activeTab) {
      case "proxy": return proxySnippet;
      case "autoinstrument": return autoinstrumentSnippet;
      case "mcp": return mcpSnippet;
      case "python": return pythonSnippet;
      case "typescript": return tsSnippet;
      case "otel": return otelSnippet;
      case "langgraph": return langgraphSnippet;
      case "curl": return curlSnippet;
      default: return "";
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-[840px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Agent Framework SDK &amp; Live Ingestion Playground
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                OTel &amp; MCP Ingest
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Integrate LangChain, OpenTelemetry, Anthropic MCP, or dispatch custom payloads in real-time.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 gap-4 mb-4 text-xs overflow-x-auto shrink-0 pb-0.5">
          <button
            onClick={() => setActiveTab("playground")}
            className={`pb-2.5 border-b-2 font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "playground"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Playground</span>
          </button>
          {[
            "proxy",
            "autoinstrument",
            "mcp",
            "otel",
            "langgraph",
            "python",
            "typescript",
            "curl",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-2.5 border-b-2 capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "border-cyan-400 text-cyan-300 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "proxy"
                ? "⚡ Zero-Code Proxy"
                : tab === "autoinstrument"
                ? "🐍 Auto-Patch"
                : tab === "mcp"
                ? "Anthropic MCP"
                : tab === "otel"
                ? "OTel (OTLP)"
                : tab === "langgraph"
                ? "LangChain"
                : tab === "typescript"
                ? "Node.js"
                : tab}
            </button>
          ))}
        </div>

        {/* Main Body */}
        {activeTab === "playground" ? (
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            {/* Playground Toolbar */}
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Protocol Preset:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => handleSelectPreset(e.target.value as any)}
                  className="bg-black/60 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-medium outline-none"
                >
                  <option value="langchain">LangGraph Multi-Step Chain</option>
                  <option value="otel">OpenTelemetry JSON Spans</option>
                  <option value="mcp">Anthropic MCP Tool Call</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono text-[11px]">
                  Endpoint: <span className="text-cyan-400">{playgroundEndpoint}</span>
                </span>
              </div>
            </div>

            {/* Editable JSON Editor */}
            <div className="flex-1 min-h-0 flex flex-col bg-black/90 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 font-mono shrink-0">
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                  Editable Ingestion Request Body (JSON)
                </span>
                <span className="text-[10px] text-slate-500">Edit payload before dispatching</span>
              </div>
              <textarea
                value={playgroundJson}
                onChange={(e) => {
                  setPlaygroundJson(e.target.value);
                  setJsonError(null);
                }}
                className="flex-1 w-full bg-transparent p-3.5 font-mono text-xs text-cyan-200/90 outline-none resize-none leading-relaxed overflow-y-auto selection:bg-cyan-900/50"
                spellCheck={false}
              />
            </div>

            {/* Validation / Result Bar */}
            {jsonError && (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-xs text-rose-300 shrink-0">
                {jsonError}
              </div>
            )}

            {playgroundResponse && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between shrink-0 font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    201 CREATED
                  </span>
                  <span className="text-slate-300">
                    Trace ID: <code className="text-cyan-300 font-bold">{playgroundResponse.traceId}</code>
                  </span>
                  {playgroundResponse.ghostsDetected !== undefined && (
                    <span className="text-purple-300">
                      • {playgroundResponse.ghostsDetected} ghost branch detected
                    </span>
                  )}
                </div>

                {createdTraceId && (
                  <button
                    onClick={() => {
                      if (onTraceCreated) onTraceCreated(createdTraceId);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    <span>View on Canvas</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Playground Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-500">
                Dispatches live HTTP POST to local ingest pipeline.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDispatchPlayground}
                  disabled={testing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Dispatch Ingestion Payload</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Code Documentation View */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative flex-1 bg-black/90 border border-slate-800 rounded-xl overflow-hidden mb-4 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/70 text-[11px] text-slate-400 font-mono shrink-0">
                <span>
                  {activeTab === "proxy"
                    ? "OpenAI Client Proxy Config (Python / TS)"
                    : activeTab === "autoinstrument"
                    ? "sdk/python/ghosttrace.py (Monkeypatch)"
                    : activeTab === "mcp"
                    ? "claude_desktop_config.json / MCP Client"
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
              <pre className="flex-1 p-4 text-xs font-mono text-cyan-200/90 overflow-y-auto leading-relaxed">
                {getActiveCode()}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("playground");
                  if (activeTab === "otel") handleSelectPreset("otel");
                  else if (activeTab === "mcp") handleSelectPreset("mcp");
                  else handleSelectPreset("langchain");
                }}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Test this protocol in Interactive Playground →</span>
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
        )}
      </div>
    </div>
  );
}
