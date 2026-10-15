"use client";

import React, { useState } from "react";
import { TraceNodeData } from "@/lib/types";
import { extractMCPMetadata } from "@/lib/mcp-parser";
import { analyzeChainOfThought } from "@/lib/cot-analyzer";
import { extractNodeDiffAndMemory } from "@/lib/code-diff-engine";
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
  Search,
  Server,
  Layers,
  ShieldAlert,
  ArrowRight,
  Database,
  FlaskConical,
  Zap,
  TrendingDown,
  RotateCw,
  FileCode2,
  FolderTree,
  Folder,
  Plus,
  Minus,
  FileDiff,
  CheckCheck,
} from "lucide-react";

interface NodeInspectorDrawerProps {
  node: TraceNodeData | null;
  onClose: () => void;
  onForkNode?: (node: TraceNodeData) => void;
  onReExecuteNode?: (node: TraceNodeData) => void;
  onPromoteToTest?: (node: TraceNodeData) => void;
  onOpenRedGhost?: () => void;
}

export function NodeInspectorDrawer({
  node,
  onClose,
  onForkNode,
  onReExecuteNode,
  onPromoteToTest,
  onOpenRedGhost,
}: NodeInspectorDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "diff" | "cot" | "mcp" | "memory" | "raw">("details");
  const [selectedDiffFileIndex, setSelectedDiffFileIndex] = useState(0);
  const [diffSubTab, setDiffSubTab] = useState<"code_diff" | "vfs" | "scratchpad">("code_diff");

  if (!node) return null;

  const mcpInfo = extractMCPMetadata(node);
  const cot = analyzeChainOfThought(node.content);
  const stateDiff = extractNodeDiffAndMemory(node);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNodeIcon = () => {
    if (node.isGhost) return <Ghost className="w-5 h-5 text-purple-400" />;
    if (mcpInfo.isMcp) return <Server className="w-5 h-5 text-cyan-400" />;
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
    <div className="absolute top-0 right-0 h-full w-[490px] max-w-full bg-[#0a0f1d]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-40 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
            {getNodeIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wide uppercase text-slate-300">
                {node.isGhost
                  ? "Ghost Alternative"
                  : mcpInfo.isMcp
                  ? "MCP Protocol RPC"
                  : node.type.replace("_", " ")}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Step #{node.stepIndex}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 truncate max-w-[260px]">
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
        <div className="flex gap-2.5 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === "details"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Inspection
          </button>
          <button
            onClick={() => setActiveTab("diff")}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "diff"
                ? "border-emerald-400 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileDiff className="w-3.5 h-3.5 text-emerald-400" />
            <span>Code Diff &amp; FS</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
              +{stateDiff.fileDiffs.reduce((a, b) => a + b.additions, 0)}/-{stateDiff.fileDiffs.reduce((a, b) => a + b.deletions, 0)}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("cot")}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "cot"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>CoT Reasoning</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
              {cot.efficiencyScore}%
            </span>
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "mcp"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>MCP Protocol</span>
            {mcpInfo.isMcp && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "memory"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Memory &amp; RAG</span>
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "raw"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Raw</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 ml-2">
          {node.isGhost && onPromoteToTest && (
            <button
              onClick={() => onPromoteToTest(node)}
              className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-950/60 border border-purple-800/60 hover:bg-purple-900/60 transition-colors whitespace-nowrap"
              title="Promote pruned ghost failure into an automated regression unit test"
            >
              <FlaskConical className="w-3 h-3 text-purple-400" />
              <span>Promote to Test</span>
            </button>
          )}

          {onReExecuteNode && (
            <button
              onClick={() => onReExecuteNode(node)}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 transition-colors whitespace-nowrap"
              title="Edit step in canvas and re-execute downstream path"
            >
              <RotateCw className="w-3 h-3 text-emerald-400" />
              <span>Re-run</span>
            </button>
          )}

          {onForkNode && (
            <button
              onClick={() => onForkNode(node)}
              className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 transition-colors whitespace-nowrap"
              title="Fork Counterfactual Branch from this step"
            >
              <GitFork className="w-3 h-3" />
              <span>Fork</span>
            </button>
          )}

          {onOpenRedGhost && (
            <button
              onClick={onOpenRedGhost}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900/60 transition-colors whitespace-nowrap"
              title="Run Red-Ghost Adversarial Red-Teaming Simulator"
            >
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Red-Ghost</span>
            </button>
          )}
        </div>
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
                  ${node.cost ? node.cost.toFixed(4) : "0.0000"}
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
        ) : activeTab === "diff" ? (
          /* CODE DIFF, WORKING MEMORY & VIRTUAL FILESYSTEM TAB */
          <div className="space-y-4">
            {/* Sub-tab Switcher */}
            <div className="flex gap-2 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDiffSubTab("code_diff")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  diffSubTab === "code_diff"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileDiff className="w-3.5 h-3.5 text-emerald-400" />
                <span>Code Diff ({stateDiff.fileDiffs.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDiffSubTab("vfs")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  diffSubTab === "vfs"
                    ? "bg-cyan-950/80 text-cyan-300 border border-cyan-600/60 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                <span>Virtual FS ({stateDiff.virtualFiles.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDiffSubTab("scratchpad")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  diffSubTab === "scratchpad"
                    ? "bg-indigo-950/80 text-indigo-300 border border-indigo-600/60 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Memory Delta</span>
              </button>
            </div>

            {diffSubTab === "code_diff" ? (
              /* UNIFIED GIT CODE DIFF VIEW */
              <div className="space-y-3">
                {/* File Tabs */}
                {stateDiff.fileDiffs.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {stateDiff.fileDiffs.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDiffFileIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all flex items-center gap-2 whitespace-nowrap ${
                          selectedDiffFileIndex === idx
                            ? "bg-slate-800 text-slate-100 border-emerald-500 shadow-sm"
                            : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{file.filename}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">+{file.additions}</span>
                        <span className="text-[10px] text-rose-400 font-bold">-{file.deletions}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const currentFile =
                    stateDiff.fileDiffs[selectedDiffFileIndex] || stateDiff.fileDiffs[0];
                  if (!currentFile) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No filesystem diffs recorded for this step.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {/* Ghost Branch Alert if this was a rejected speculative patch */}
                      {currentFile.isGhostDiff && (
                        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs space-y-1.5 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                          <div className="flex items-center gap-1.5 font-bold text-purple-300">
                            <Ghost className="w-3.5 h-3.5 text-purple-400" />
                            <span>Speculative Patch Vetoed Prior to Disk Commit</span>
                          </div>
                          <p className="text-[11px] text-purple-200/90 leading-relaxed font-sans">
                            {currentFile.ghostVerdict || "This mutation was safely pruned by the critic policy."}
                          </p>
                        </div>
                      )}

                      {/* Diff File Header */}
                      <div className="flex items-center justify-between px-3.5 py-2 rounded-t-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <FileCode2 className="w-4 h-4 text-emerald-400" />
                          <span className="font-semibold text-slate-200">{currentFile.filename}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                            {currentFile.language}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-400 font-bold">+{currentFile.additions}</span>
                          <span className="text-rose-400 font-bold">-{currentFile.deletions}</span>
                        </div>
                      </div>

                      {/* Diff Line-by-Line Unified Viewer */}
                      <div className="rounded-b-xl border-x border-b border-slate-800 bg-[#060913] font-mono text-xs overflow-x-auto max-h-[46vh] leading-relaxed">
                        {currentFile.lines.map((line, lIdx) => {
                          if (line.type === "header") {
                            return (
                              <div
                                key={lIdx}
                                className="px-3 py-1 bg-cyan-950/30 text-cyan-400/90 text-[11px] border-y border-cyan-900/30 select-none font-semibold"
                              >
                                {line.content}
                              </div>
                            );
                          }

                          if (line.type === "added") {
                            return (
                              <div
                                key={lIdx}
                                className="flex items-stretch bg-emerald-950/25 hover:bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500"
                              >
                                <span className="w-9 px-2 py-0.5 text-right text-[10px] text-emerald-600 select-none border-r border-slate-800/80 shrink-0">
                                  {line.newLineNumber}
                                </span>
                                <span className="w-5 text-center text-[11px] text-emerald-400 font-bold select-none shrink-0">
                                  +
                                </span>
                                <span className="px-2 py-0.5 whitespace-pre overflow-x-visible">
                                  {line.content.replace(/^\+\s*/, "")}
                                </span>
                              </div>
                            );
                          }

                          if (line.type === "deleted") {
                            return (
                              <div
                                key={lIdx}
                                className="flex items-stretch bg-rose-950/25 hover:bg-rose-950/40 text-rose-200 border-l-2 border-rose-500"
                              >
                                <span className="w-9 px-2 py-0.5 text-right text-[10px] text-rose-600 select-none border-r border-slate-800/80 shrink-0">
                                  {line.oldLineNumber}
                                </span>
                                <span className="w-5 text-center text-[11px] text-rose-400 font-bold select-none shrink-0">
                                  -
                                </span>
                                <span className="px-2 py-0.5 whitespace-pre line-through opacity-85 overflow-x-visible">
                                  {line.content.replace(/^-\s*/, "")}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={lIdx}
                              className="flex items-stretch text-slate-400 hover:bg-slate-900/40"
                            >
                              <span className="w-9 px-2 py-0.5 text-right text-[10px] text-slate-600 select-none border-r border-slate-800/80 shrink-0">
                                {line.newLineNumber}
                              </span>
                              <span className="w-5 text-center text-[11px] text-slate-600 select-none shrink-0">
                                &nbsp;
                              </span>
                              <span className="px-2 py-0.5 whitespace-pre overflow-x-visible">
                                {line.content}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : diffSubTab === "vfs" ? (
              /* VIRTUAL FILESYSTEM & CONTAINER SANDBOX VIEW */
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                    Workspace Filesystem Map ({stateDiff.virtualFiles.length} files tracked)
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden divide-y divide-slate-800/60 text-xs font-mono">
                    {stateDiff.virtualFiles.map((vFile, idx) => (
                      <div
                        key={idx}
                        className="p-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-slate-200 font-semibold">{vFile.path}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-[11px]">{vFile.size}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              vFile.status === "MODIFIED"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : vFile.status === "CREATED"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : vFile.status === "GHOST_REJECTED"
                                ? "bg-purple-950 text-purple-300 border border-purple-800"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {vFile.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sandbox Container Environment Snapshot */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 text-xs font-mono">
                  <div className="font-semibold text-slate-200 text-[11px] flex items-center justify-between pb-1.5 border-b border-slate-800">
                    <span className="text-cyan-400">Sandbox Isolation Environment</span>
                    <span className="text-emerald-400 text-[10px]">
                      Exit Code: {stateDiff.activeEnvironment.exitCode} (PASS)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">CWD:</span> {stateDiff.activeEnvironment.cwd}
                    </div>
                    <div>
                      <span className="text-slate-500">Runtime:</span> {stateDiff.activeEnvironment.runtime}
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Container:</span> {stateDiff.activeEnvironment.sandboxContainer}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* WORKING MEMORY SCRATCHPAD DELTAS VIEW */
              <div className="space-y-3">
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Scratchpad State Transitions Before vs After Step
                </span>
                <div className="space-y-2">
                  {stateDiff.memoryDeltas.map((delta, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">{delta.key}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                            {delta.category}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            delta.type === "ADDED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : delta.type === "MODIFIED"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : delta.type === "REMOVED"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {delta.type}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono space-y-1 pt-1">
                        {delta.previousValue && (
                          <div className="text-rose-400/80 line-through">
                            - {delta.previousValue}
                          </div>
                        )}
                        <div className="text-emerald-400">
                          + {delta.currentValue}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "cot" ? (
          /* CHAIN OF THOUGHT (CoT) REASONING PROFILER TAB */
          <div className="space-y-4">
            {/* Cognitive Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-1">
                <div className="text-[10px] font-mono text-indigo-300/80 uppercase">Reasoning Efficiency</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold font-mono ${
                    cot.efficiencyScore >= 80
                      ? "text-emerald-400"
                      : cot.efficiencyScore >= 60
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}>
                    {cot.efficiencyScore}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cot.efficiencyScore >= 80 ? "Optimal" : "Drifting"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-1">
                <div className="text-[10px] font-mono text-indigo-300/80 uppercase">Hesitation / Drift</div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-bold font-mono ${
                    cot.hesitationRatePct > 30 ? "text-rose-400" : "text-indigo-300"
                  }`}>
                    {cot.hesitationRatePct}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cot.circularLoopDetected ? "Loop Detected" : "Linear Flow"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Thinking Token Blast</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-slate-200">
                    {cot.totalTokens}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">tokens</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Cognitive Velocity</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {cot.cognitiveVelocityScore}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">/100 index</span>
                </div>
              </div>
            </div>

            {/* Anomalies & Circular Loops Alerts */}
            {cot.anomalies.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cognitive Drift &amp; Reasoning Bottlenecks</span>
                </div>
                <ul className="text-[11px] text-rose-200/90 space-y-1 list-disc pl-4 font-sans">
                  {cot.anomalies.map((ano, i) => (
                    <li key={i}>{ano}</li>
                  ))}
                </ul>
                {cot.recommendations.length > 0 && (
                  <div className="pt-2 border-t border-rose-900/50 text-[10px] text-rose-300/80 space-y-0.5">
                    <span className="font-semibold text-rose-200">Suggested Action:</span>
                    <p>{cot.recommendations.join(" ")}</p>
                  </div>
                )}
              </div>
            )}

            {/* 4-Phase CoT Trajectory Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                  Semantic Reasoning Phases
                </span>
                <span className="text-[10px] font-mono text-indigo-400">
                  Deconstruction (4 Phases)
                </span>
              </div>

              {/* Progress Stack */}
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex gap-1 border border-slate-800 p-0.5">
                {cot.phases.map((p, idx) => (
                  <div
                    key={idx}
                    title={`${p.label}: ${p.percentage}% (${p.tokenCount} tok)`}
                    style={{
                      width: `${Math.max(5, p.percentage)}%`,
                      backgroundColor: p.color,
                    }}
                    className="h-full rounded-sm opacity-90 hover:opacity-100 transition-all cursor-pointer"
                  />
                ))}
              </div>

              {/* Phase Cards */}
              <div className="space-y-2 pt-1">
                {cot.phases.map((phase, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="font-semibold text-slate-200 font-mono text-[11px]">
                          {phase.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {phase.tokenCount} tok ({phase.percentage}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans leading-relaxed line-clamp-3 italic">
                      {phase.snippet || "No explicit content matched this phase segment."}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Raw Thinking Text */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3 h-3" />
                <span>Complete Internal Reasoning Block (&lt;think&gt;)</span>
              </label>
              <div className="p-3.5 rounded-xl bg-black/60 border border-indigo-950 text-xs font-mono text-indigo-200/90 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {node.content}
              </div>
            </div>
          </div>
        ) : activeTab === "mcp" ? (
          /* MODEL CONTEXT PROTOCOL (MCP) TAB */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                    Model Context Protocol (MCP) Frame
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-mono text-[10px] border border-cyan-700">
                  JSON-RPC 2.0
                </span>
              </div>
              <p className="text-xs text-cyan-100/80 leading-relaxed">
                Standardized protocol inspection for Anthropic &amp; open-source agent tooling
                (Claude Desktop, Cursor, Cline).
              </p>
            </div>

            {/* MCP Metadata Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">MCP Method</span>
                <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                  {mcpInfo.method || (node.type === "TOOL_CALL" ? "tools/call" : "prompts/get")}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Target Server / Host</span>
                <span className="font-mono text-slate-200">
                  {mcpInfo.server || "mcp-agent-gateway"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400 font-medium">Protocol Schema Status</span>
                <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validated JSON-Schema
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Transport Latency</span>
                <span className="font-mono text-indigo-300">
                  {node.latencyMs || mcpInfo.latencyMs || 85}ms roundtrip
                </span>
              </div>
            </div>

            {/* If Ghost MCP Operation */}
            {node.isGhost && (
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span>Speculative MCP Action Vetoed</span>
                </div>
                <p className="text-xs text-purple-200/90 font-sans">
                  The model generated an MCP JSON-RPC call against {mcpInfo.server || "the tool host"},
                  but GhostTRACE Critic policy intercepted and pruned the payload before live dispatch.
                </p>
                {node.ghostReason && (
                  <div className="text-[11px] p-2 rounded bg-black/50 border border-purple-900/60 text-rose-300 font-mono">
                    {node.ghostReason}
                  </div>
                )}
              </div>
            )}

            {/* MCP Request / Arguments */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                MCP JSON-RPC Request Params
              </label>
              <pre className="p-3 rounded-lg bg-black/70 border border-slate-800 text-[11px] font-mono text-cyan-200 overflow-x-auto max-h-52">
                {JSON.stringify(
                  mcpInfo.params || node.rawInput || {
                    method: mcpInfo.method || "tools/call",
                    params: { name: node.label, arguments: {} },
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* MCP Response / Result */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                MCP JSON-RPC Execution Result
              </label>
              <pre className="p-3 rounded-lg bg-black/70 border border-slate-800 text-[11px] font-mono text-emerald-200 overflow-x-auto max-h-52">
                {JSON.stringify(
                  mcpInfo.result || node.rawOutput || {
                    result: { content: [{ type: "text", text: node.content }] },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
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
