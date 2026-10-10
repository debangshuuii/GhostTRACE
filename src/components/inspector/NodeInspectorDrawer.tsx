"use client";

import React, { useState } from "react";
import { TraceNodeData } from "@/lib/types";
import {
  X,
  Ghost,
  Brain,
  Wrench,
  MessageSquare,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
  Copy,
  Check,
  Code2,
  Sparkles,
  GitFork,
  BookOpen,
  FileText,
  Search,
} from "lucide-react";

interface NodeInspectorDrawerProps {
  node: TraceNodeData | null;
  onClose: () => void;
  onForkNode?: (node: TraceNodeData) => void;
}

export function NodeInspectorDrawer({ node, onClose, onForkNode }: NodeInspectorDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "memory" | "raw">("details");

  if (!node) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNodeIcon = () => {
    if (node.isGhost) return <Ghost className="w-5 h-5 text-purple-400" />;
    switch (node.type) {
      case "USER_PROMPT":
        return <MessageSquare className="w-5 h-5 text-sky-400" />;
      case "THINKING":
        return <Brain className="w-5 h-5 text-indigo-400" />;
      case "TOOL_CALL":
      case "TOOL_RESULT":
        return <Wrench className="w-5 h-5 text-amber-400" />;
      case "SUBAGENT_SPAWN":
        return <Bot className="w-5 h-5 text-cyan-400" />;
      case "LLM_RESPONSE":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-slate-400" />;
    }
  };

  // Mock retrieved RAG context chunks for inspection
  const ragContext = [
    {
      title: "RFC 2104: HMAC Keyed-Hashing for Message Authentication",
      score: 0.94,
      used: !node.isGhost,
      snippet: "Constant-time comparison is necessary to prevent timing attacks when verifying digests.",
    },
    {
      title: "V8 Engine Optimization Guide (Branch Elimination)",
      score: 0.62,
      used: false,
      snippet: "Bitwise loops may be optimized into early-exit jumps by compiler unrolling.",
      ghostContext: true,
    },
    {
      title: "Cloud Infrastructure Policy v4.2",
      score: 0.45,
      used: false,
      snippet: "Ephemeral containers must be preserved prior to pod evictions for forensic integrity.",
      ghostContext: true,
    },
  ];

  return (
    <div className="absolute top-0 right-0 h-full w-[460px] max-w-full bg-[#0a0f1d]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-40 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
            {getNodeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wide uppercase text-slate-300">
                {node.isGhost ? "Ghost Alternative" : node.type.replace("_", " ")}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Step #{node.stepIndex}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 truncate max-w-[240px]">
              {node.label}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Copy Node JSON"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs & Action */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 bg-slate-950/40">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === "details"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Inspection
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "memory"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Memory &amp; RAG
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "raw"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Raw Payload
          </button>
        </div>

        {/* Fork Button */}
        {onForkNode && (
          <button
            onClick={() => onForkNode(node)}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 transition-colors"
            title="Fork Counterfactual Branch from this step"
          >
            <GitFork className="w-3 h-3" />
            <span>Fork Step</span>
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === "details" ? (
          <>
            {/* GHOST BRANCH ALERT IF APPLICABLE */}
            {node.isGhost && (
              <div className="rounded-xl p-4 bg-purple-950/40 border border-purple-500/40 space-y-3 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Ghost className="w-4 h-4 text-purple-400" />
                  <span>PHANTOM / PRUNED BRANCH</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 font-semibold border border-rose-700/60">
                    STATUS: REJECTED
                  </span>
                </div>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  This execution path represents a speculative branch evaluated by the agent or model
                  that was pruned prior to final output commitment.
                </p>

                {node.ghostReason && (
                  <div className="p-3 rounded-lg bg-black/40 border border-rose-500/30 text-xs text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Critic Verdict / Rejection Rationale</span>
                    </div>
                    <p className="text-[11px] text-rose-300/90 leading-relaxed font-sans">
                      {node.ghostReason}
                    </p>
                  </div>
                )}

                {node.confidenceScore !== undefined && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-purple-300">
                      <span>Speculative Confidence:</span>
                      <span className="font-mono font-bold text-rose-300">
                        {(node.confidenceScore * 100).toFixed(0)}% (Below threshold)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-purple-900">
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${node.confidenceScore * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Latency</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 font-mono">
                  {node.latencyMs || 0}ms
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Tokens</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 font-mono">
                  {node.tokens || 0}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>Est. Cost</span>
                </div>
                <div className="text-xs font-semibold text-slate-200 font-mono">
                  ${node.cost ? node.cost.toFixed(4) : "0.000"}
                </div>
              </div>
            </div>

            {/* Main Content Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
                Step Output / Thought Expression
              </label>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                {node.content}
              </div>
            </div>

            {/* Tool Input / Arguments */}
            {node.rawInput && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider text-[10px]">
                  Tool Invocation Arguments
                </label>
                <pre className="p-3 rounded-lg bg-black/60 border border-amber-900/40 text-[11px] font-mono text-amber-200 overflow-x-auto">
                  {typeof node.rawInput === "string"
                    ? node.rawInput
                    : JSON.stringify(node.rawInput, null, 2)}
                </pre>
              </div>
            )}

            {/* Tool Output / Result */}
            {node.rawOutput && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
                  Tool Execution Result
                </label>
                <pre className="p-3 rounded-lg bg-black/60 border border-emerald-900/40 text-[11px] font-mono text-emerald-200 overflow-x-auto max-h-48">
                  {typeof node.rawOutput === "string"
                    ? node.rawOutput
                    : JSON.stringify(node.rawOutput, null, 2)}
                </pre>
              </div>
            )}
          </>
        ) : activeTab === "memory" ? (
          <div className="space-y-4">
            {/* Working Memory State */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active Working Memory (Scratchpad)</span>
              </h4>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                <div><span className="text-slate-500">task_objective:</span> &quot;Patch timing vulnerability&quot;</div>
                <div><span className="text-slate-500">current_depth:</span> {node.stepIndex}</div>
                <div><span className="text-slate-500">active_target:</span> &quot;auth_handler.ts&quot;</div>
                <div><span className="text-slate-500">critic_status:</span> {node.isGhost ? "VETOED" : "PASSED"}</div>
              </div>
            </div>

            {/* RAG Retrieved Documents */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Retrieved Context Chunks &amp; Ghost Documents</span>
              </h4>

              <div className="space-y-2">
                {ragContext.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                      doc.ghostContext
                        ? "bg-purple-950/20 border-purple-800/40"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200 truncate max-w-[240px]">
                        {doc.title}
                      </span>
                      {doc.ghostContext ? (
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[9px] font-bold">
                          GHOST CONTEXT (IGNORED)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-mono text-[10px]">
                          Similarity: {(doc.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                      &quot;{doc.snippet}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <pre className="p-3.5 rounded-xl bg-black/80 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
              {JSON.stringify(node, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
