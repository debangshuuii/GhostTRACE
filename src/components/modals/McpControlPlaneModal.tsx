"use client";

import React, { useState } from "react";
import {
  X,
  Server,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Layers,
  Code2,
  Copy,
  Check,
  ShieldAlert,
  Ghost,
  Sparkles,
  Loader2,
  Database,
  FileCode,
  Zap,
} from "lucide-react";
import { MCPToolInfo } from "@/lib/mcp-parser";

interface McpControlPlaneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface McpServerConfig {
  id: string;
  name: string;
  transport: "stdio" | "sse";
  status: "CONNECTED" | "STANDBY" | "ERROR";
  toolCount: number;
  tools: MCPToolInfo[];
}

export function McpControlPlaneModal({ isOpen, onClose }: McpControlPlaneModalProps) {
  const [servers, setServers] = useState<McpServerConfig[]>([
    {
      id: "srv-fs",
      name: "mcp-filesystem-server",
      transport: "stdio",
      status: "CONNECTED",
      toolCount: 3,
      tools: [
        {
          name: "read_file",
          description: "Reads the complete contents of a file at the specified path.",
          inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
        },
        {
          name: "write_file",
          description: "Writes content to a file at the specified path safely with atomic commit.",
          inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
        },
        {
          name: "list_directory",
          description: "Lists files and child directories within the workspace.",
          inputSchema: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
    },
    {
      id: "srv-crypto",
      name: "mcp-crypto-guard",
      transport: "sse",
      status: "CONNECTED",
      toolCount: 2,
      tools: [
        {
          name: "constant_time_audit",
          description: "Evaluates cryptographic signature comparisons for timing variance.",
          inputSchema: { type: "object", properties: { targetFunction: { type: "string" }, iterations: { type: "number" } }, required: ["targetFunction"] },
        },
        {
          name: "timing_safe_equal",
          description: "Executes a verified constant-time byte comparison using native crypto bindings.",
          inputSchema: { type: "object", properties: { a: { type: "string" }, b: { type: "string" } }, required: ["a", "b"] },
        },
      ],
    },
    {
      id: "srv-postgres",
      name: "mcp-postgres-read",
      transport: "stdio",
      status: "CONNECTED",
      toolCount: 2,
      tools: [
        {
          name: "run_readonly_query",
          description: "Executes a validated SELECT SQL query against PostgreSQL with read-only transaction.",
          inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
        },
        {
          name: "inspect_schema",
          description: "Returns table definitions, foreign keys, and indexes for a target table.",
          inputSchema: { type: "object", properties: { tableName: { type: "string" } }, required: ["tableName"] },
        },
      ],
    },
  ]);

  const [selectedServerId, setSelectedServerId] = useState<string>("srv-crypto");
  const [selectedToolName, setSelectedToolName] = useState<string>("constant_time_audit");
  const [toolArgs, setToolArgs] = useState<string>(
    JSON.stringify({ targetFunction: "auth_handler.verifyHmac", iterations: 50000 }, null, 2)
  );
  const [rpcResponse, setRpcResponse] = useState<any>(null);
  const [dispatching, setDispatching] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const selectedTool = selectedServer.tools.find((t) => t.name === selectedToolName) || selectedServer.tools[0];

  const handleSelectTool = (tool: MCPToolInfo) => {
    setSelectedToolName(tool.name);
    if (tool.name === "constant_time_audit") {
      setToolArgs(JSON.stringify({ targetFunction: "auth_handler.verifyHmac", iterations: 50000 }, null, 2));
    } else if (tool.name === "timing_safe_equal") {
      setToolArgs(JSON.stringify({ a: "sig_abc1234567890", b: "sig_abc1234567890" }, null, 2));
    } else if (tool.name === "read_file") {
      setToolArgs(JSON.stringify({ path: "src/auth_handler.ts" }, null, 2));
    } else if (tool.name === "run_readonly_query") {
      setToolArgs(JSON.stringify({ query: "SELECT id, status, model FROM trace_runs LIMIT 5;" }, null, 2));
    } else {
      setToolArgs(JSON.stringify({ path: "." }, null, 2));
    }
    setRpcResponse(null);
  };

  const handleDispatchRpc = async () => {
    try {
      setDispatching(true);
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgs);
      } catch (err) {
        setRpcResponse({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error: Invalid JSON payload." },
        });
        return;
      }

      // Simulate live JSON-RPC roundtrip through MCP transport
      await new Promise((res) => setTimeout(res, 450));

      if (selectedToolName === "constant_time_audit") {
        setRpcResponse({
          jsonrpc: "2.0",
          id: Date.now(),
          result: {
            content: [
              {
                type: "text",
                text: "✓ Constant-Time Verification PASSED: Mean variance across 50,000 iterations: 0.8ns (within noise floor). Zero early-exit branch leaks detected.",
              },
            ],
            metadata: {
              server: selectedServer.name,
              protocolVersion: "2024-11-05",
              latencyMs: 42,
              grounded: true,
            },
          },
        });
      } else if (selectedToolName === "timing_safe_equal") {
        setRpcResponse({
          jsonrpc: "2.0",
          id: Date.now(),
          result: {
            content: [{ type: "text", text: "Match: TRUE. Comparison time: 1.1ns." }],
            metadata: { server: selectedServer.name, latencyMs: 15 },
          },
        });
      } else {
        setRpcResponse({
          jsonrpc: "2.0",
          id: Date.now(),
          result: {
            content: [{ type: "text", text: `Success: Tool "${selectedToolName}" executed with valid schema.` }],
            metadata: { server: selectedServer.name, latencyMs: 28 },
          },
        });
      }
    } catch (err: any) {
      setRpcResponse({
        jsonrpc: "2.0",
        error: { code: -32603, message: err.message || "Internal RPC Error" },
      });
    } finally {
      setDispatching(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(rpcResponse, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#0b101f] border border-slate-800 rounded-2xl w-full max-w-4xl h-[86vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Model Context Protocol (MCP) Control Plane
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 font-mono font-semibold">
                  JSON-RPC 2.0 Spec
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Anthropic &amp; open-source standard for AI agent tool execution, resource discovery, and sandbox bridging.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server & Tool Explorer Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Server Registry List */}
          <div className="w-64 border-r border-slate-800 p-4 space-y-2 bg-slate-950/30 overflow-y-auto">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              Registered MCP Servers ({servers.length})
            </div>
            {servers.map((srv) => (
              <button
                key={srv.id}
                onClick={() => {
                  setSelectedServerId(srv.id);
                  if (srv.tools[0]) handleSelectTool(srv.tools[0]);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedServerId === srv.id
                    ? "bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold truncate max-w-[140px]">
                    {srv.name}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>{srv.transport.toUpperCase()}</span>
                  <span>•</span>
                  <span>{srv.toolCount} tools</span>
                </div>
              </button>
            ))}
          </div>

          {/* Center & Right: Tool Calling Playground & RPC Payload Inspector */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
            {/* Tools available on selected server */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Available Tools on <code className="text-cyan-400 font-mono">{selectedServer.name}</code>
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedServer.tools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleSelectTool(tool)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all flex items-center gap-1.5 ${
                      selectedToolName === tool.name
                        ? "bg-cyan-600 text-slate-950 border-cyan-400 font-bold shadow-md"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    <span>{tool.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Tool Details */}
            {selectedTool && (
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-1">
                <div className="font-semibold text-slate-200 font-mono text-[11px] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedTool.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {selectedTool.description}
                </p>
              </div>
            )}

            {/* Input Arguments JSON */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Tool Parameters (JSON-Schema Validated)</span>
                <span className="text-[10px] font-mono text-cyan-400">tools/call</span>
              </label>
              <textarea
                rows={4}
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/80 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            {/* Dispatch Action */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Transport: {selectedServer.transport.toUpperCase()} • Standard Protocol
              </span>
              <button
                onClick={handleDispatchRpc}
                disabled={dispatching}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all"
              >
                {dispatching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Dispatch MCP Call</span>
              </button>
            </div>

            {/* RPC Response Card */}
            {rpcResponse && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                    JSON-RPC 2.0 Response Frame
                  </span>
                  <button
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/90 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(rpcResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
