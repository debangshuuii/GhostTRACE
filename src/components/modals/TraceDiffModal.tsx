"use client";

import React, { useState } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import {
  X,
  GitCompare,
  TrendingDown,
  TrendingUp,
  Ghost,
  Cpu,
  Clock,
  Coins,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Copy,
  Check,
  FileCode2,
} from "lucide-react";

interface TraceDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  currentTraceId: string | null;
}

function computeSimpleLineDiff(textA: string, textB: string) {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const max = Math.max(linesA.length, linesB.length);
  const diffs: { type: "same" | "added" | "deleted" | "modified"; a?: string; b?: string }[] = [];

  for (let i = 0; i < max; i++) {
    const a = linesA[i];
    const b = linesB[i];
    if (a === undefined) {
      diffs.push({ type: "added", b });
    } else if (b === undefined) {
      diffs.push({ type: "deleted", a });
    } else if (a === b) {
      diffs.push({ type: "same", a, b });
    } else {
      diffs.push({ type: "modified", a, b });
    }
  }
  return diffs;
}

export function TraceDiffModal({
  isOpen,
  onClose,
  traces,
  currentTraceId,
}: TraceDiffModalProps) {
  const [traceAId, setTraceAId] = useState<string>(currentTraceId || (traces[0]?.id ?? ""));
  const [traceBId, setTraceBId] = useState<string>(
    traces.find((t) => t.id !== currentTraceId)?.id || (traces[1]?.id ?? traces[0]?.id ?? "")
  );

  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(0);
  const [diffMode, setDiffMode] = useState<"side-by-side" | "diff">("side-by-side");
  const [copiedSide, setCopiedSide] = useState<"A" | "B" | null>(null);

  if (!isOpen) return null;

  const traceA = traces.find((t) => t.id === traceAId);
  const traceB = traces.find((t) => t.id === traceBId);

  if (!traceA || !traceB) return null;

  const nodesA = Array.isArray(traceA.nodes) ? traceA.nodes : [];
  const nodesB = Array.isArray(traceB.nodes) ? traceB.nodes : [];

  const tokenDelta = traceB.totalTokens - traceA.totalTokens;
  const tokenDeltaPct = Math.round((tokenDelta / (traceA.totalTokens || 1)) * 100);

  const durationDelta = traceB.durationMs - traceA.durationMs;
  const ghostDelta = traceB.ghostBranchCount - traceA.ghostBranchCount;
  const costDelta = traceB.costEstimate - traceA.costEstimate;

  const handleSwapTraces = () => {
    const temp = traceAId;
    setTraceAId(traceBId);
    setTraceBId(temp);
  };

  const handleCopy = (text: string, side: "A" | "B") => {
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 1800);
  };

  const selectedNodeA: TraceNodeData | undefined =
    expandedStepIndex !== null ? nodesA[expandedStepIndex] : undefined;
  const selectedNodeB: TraceNodeData | undefined =
    expandedStepIndex !== null ? nodesB[expandedStepIndex] : undefined;

  const textA = selectedNodeA?.content || (selectedNodeA?.rawOutput ? JSON.stringify(selectedNodeA.rawOutput, null, 2) : "");
  const textB = selectedNodeB?.content || (selectedNodeB?.rawOutput ? JSON.stringify(selectedNodeB.rawOutput, null, 2) : "");
  const lineDiffs = computeSimpleLineDiff(textA, textB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-[960px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Trace A/B Comparison &amp; Deep Payload Diff Inspector
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                A/B Regression
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Benchmark execution trajectories, step token overheads, and inspect line-by-line prompt/output diffs.
            </p>
          </div>
        </div>

        {/* Trace Selectors with Swap Action */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="flex-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="text-[10px] font-mono font-semibold uppercase text-slate-400">
              Trace A (Baseline Run)
            </label>
            <select
              value={traceAId}
              onChange={(e) => setTraceAId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {traces.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.model})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwapTraces}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/80 transition-all hover:scale-105"
            title="Swap Baseline and Comparison Traces"
          >
            <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
          </button>

          <div className="flex-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <label className="text-[10px] font-mono font-semibold uppercase text-cyan-400">
              Trace B (Comparison Run)
            </label>
            <select
              value={traceBId}
              onChange={(e) => setTraceBId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {traces.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.model})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Delta Summary Matrix */}
        <div className="grid grid-cols-4 gap-3 mb-5 shrink-0">
          {/* Tokens */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Tokens</span>
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              {traceA.totalTokens.toLocaleString()} → {traceB.totalTokens.toLocaleString()}
            </div>
            <div
              className={`flex items-center gap-1 text-[11px] font-mono font-semibold mt-1 ${
                tokenDelta <= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {tokenDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>
                {tokenDelta > 0 ? `+${tokenDelta.toLocaleString()}` : tokenDelta.toLocaleString()} ({tokenDeltaPct}%)
              </span>
            </div>
          </div>

          {/* Ghost Branches */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
              <Ghost className="w-3.5 h-3.5 text-purple-400" />
              <span>Ghost Branches</span>
            </div>
            <div className="text-sm font-bold text-purple-200 font-mono">
              {traceA.ghostBranchCount} → {traceB.ghostBranchCount}
            </div>
            <div className="text-[11px] font-mono mt-1 text-purple-300">
              {ghostDelta === 0
                ? "Identical pruning"
                : ghostDelta < 0
                ? `${Math.abs(ghostDelta)} fewer dead-ends`
                : `${ghostDelta} more alternative tests`}
            </div>
          </div>

          {/* Duration */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Duration</span>
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              {(traceA.durationMs / 1000).toFixed(1)}s → {(traceB.durationMs / 1000).toFixed(1)}s
            </div>
            <div
              className={`text-[11px] font-mono mt-1 ${
                durationDelta <= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {durationDelta <= 0
                ? `${(Math.abs(durationDelta) / 1000).toFixed(2)}s faster`
                : `+${(durationDelta / 1000).toFixed(2)}s slower`}
            </div>
          </div>

          {/* Cost */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Cost Est.</span>
            </div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              ${traceA.costEstimate.toFixed(4)} → ${traceB.costEstimate.toFixed(4)}
            </div>
            <div
              className={`text-[11px] font-mono mt-1 ${
                costDelta <= 0 ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              {costDelta <= 0 ? `Saved $${Math.abs(costDelta).toFixed(4)}` : `+$${costDelta.toFixed(4)}`}
            </div>
          </div>
        </div>

        {/* Main Content Area: Step List & Deep Diff Inspector Split */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          {/* Step Comparison Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <div className="grid grid-cols-2 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span>Trace A Steps ({nodesA.length})</span>
                <span className="text-[10px] text-slate-400 font-mono">{traceA.model}</span>
              </div>
              <div className="flex items-center justify-between pl-4">
                <span>Trace B Steps ({nodesB.length})</span>
                <span className="text-[10px] text-cyan-400 font-mono">{traceB.model}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
              {Array.from({
                length: Math.max(nodesA.length, nodesB.length),
              }).map((_, idx) => {
                const nodeA = nodesA[idx];
                const nodeB = nodesB[idx];
                const isSelected = expandedStepIndex === idx;

                const stepTokenDelta = (nodeB?.tokens || 0) - (nodeA?.tokens || 0);

                return (
                  <div
                    key={idx}
                    onClick={() => setExpandedStepIndex(idx)}
                    className={`grid grid-cols-2 p-2.5 text-xs gap-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-slate-800/80 border-l-2 border-indigo-400"
                        : "hover:bg-slate-900/50"
                    }`}
                  >
                    {/* Node A summary */}
                    <div className="flex items-center justify-between pr-2">
                      {nodeA ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">#{nodeA.stepIndex}</span>
                          <span className={`font-medium truncate ${nodeA.isGhost ? "text-purple-400" : "text-slate-200"}`}>
                            {nodeA.label}
                          </span>
                          {nodeA.isGhost && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono shrink-0">
                              Ghost
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic text-[11px]">— No step —</span>
                      )}
                      {nodeA && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {nodeA.tokens}t
                        </span>
                      )}
                    </div>

                    {/* Node B summary */}
                    <div className="flex items-center justify-between pl-2">
                      {nodeB ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[10px] text-cyan-600 shrink-0">#{nodeB.stepIndex}</span>
                          <span className={`font-medium truncate ${nodeB.isGhost ? "text-purple-400" : "text-cyan-200"}`}>
                            {nodeB.label}
                          </span>
                          {nodeB.isGhost && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono shrink-0">
                              Ghost
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic text-[11px]">— No step —</span>
                      )}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {nodeB && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {nodeB.tokens}t
                          </span>
                        )}
                        {nodeA && nodeB && (
                          <span
                            className={`text-[9px] font-mono px-1 rounded ${
                              stepTokenDelta <= 0 ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                            }`}
                          >
                            {stepTokenDelta > 0 ? `+${stepTokenDelta}` : stepTokenDelta}
                          </span>
                        )}
                        {isSelected ? (
                          <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Step Payload Diff View */}
          {expandedStepIndex !== null && (
            <div className="flex-1 min-h-0 bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                    Step #{expandedStepIndex + 1} Deep Diff
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {selectedNodeA ? selectedNodeA.label : "None"} vs {selectedNodeB ? selectedNodeB.label : "None"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setDiffMode("side-by-side")}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        diffMode === "side-by-side"
                          ? "bg-indigo-950 text-indigo-300 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Side-by-Side
                    </button>
                    <button
                      onClick={() => setDiffMode("diff")}
                      className={`px-2 py-0.5 rounded font-medium transition-colors ${
                        diffMode === "diff"
                          ? "bg-indigo-950 text-indigo-300 font-semibold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Unified Line Diff
                    </button>
                  </div>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {diffMode === "side-by-side" ? (
                  <div className="grid grid-cols-2 gap-3 h-full">
                    {/* Left Side (Node A) */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/60 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300 font-mono">
                          Trace A: {selectedNodeA?.label || "Step Empty"}
                        </span>
                        {selectedNodeA && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              {selectedNodeA.tokens}t • {selectedNodeA.latencyMs}ms
                            </span>
                            <button
                              onClick={() => handleCopy(textA, "A")}
                              className="text-slate-400 hover:text-slate-200 p-0.5"
                              title="Copy content"
                            >
                              {copiedSide === "A" ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedNodeA?.isGhost && (
                        <div className="mb-2 p-2 rounded bg-purple-950/40 border border-purple-800/50 text-[11px] text-purple-300 flex items-start gap-1.5">
                          <Ghost className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Ghost Pruned: </span>
                            {selectedNodeA.ghostReason || "Pruned alternative branch."}
                          </div>
                        </div>
                      )}

                      <pre className="flex-1 overflow-auto text-[11px] font-mono text-slate-300 whitespace-pre-wrap select-text leading-relaxed p-1">
                        {textA || <span className="text-slate-600 italic">No content recorded.</span>}
                      </pre>
                    </div>

                    {/* Right Side (Node B) */}
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/60 text-xs text-slate-400">
                        <span className="font-semibold text-cyan-300 font-mono">
                          Trace B: {selectedNodeB?.label || "Step Empty"}
                        </span>
                        {selectedNodeB && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">
                              {selectedNodeB.tokens}t • {selectedNodeB.latencyMs}ms
                            </span>
                            <button
                              onClick={() => handleCopy(textB, "B")}
                              className="text-slate-400 hover:text-slate-200 p-0.5"
                              title="Copy content"
                            >
                              {copiedSide === "B" ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {selectedNodeB?.isGhost && (
                        <div className="mb-2 p-2 rounded bg-purple-950/40 border border-purple-800/50 text-[11px] text-purple-300 flex items-start gap-1.5">
                          <Ghost className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Ghost Pruned: </span>
                            {selectedNodeB.ghostReason || "Pruned alternative branch."}
                          </div>
                        </div>
                      )}

                      <pre className="flex-1 overflow-auto text-[11px] font-mono text-slate-300 whitespace-pre-wrap select-text leading-relaxed p-1">
                        {textB || <span className="text-slate-600 italic">No content recorded.</span>}
                      </pre>
                    </div>
                  </div>
                ) : (
                  /* Unified Line Diff */
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 font-mono text-[11px] leading-relaxed overflow-auto">
                    {lineDiffs.map((d, i) => {
                      if (d.type === "added") {
                        return (
                          <div key={i} className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded">
                            + {d.b}
                          </div>
                        );
                      }
                      if (d.type === "deleted") {
                        return (
                          <div key={i} className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded">
                            - {d.a}
                          </div>
                        );
                      }
                      if (d.type === "modified") {
                        return (
                          <div key={i} className="space-y-0.5">
                            <div className="bg-rose-950/30 text-rose-400 px-2 py-0.5 rounded">
                              - {d.a}
                            </div>
                            <div className="bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded">
                              + {d.b}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="text-slate-400 px-2 py-0.5">
                          &nbsp;&nbsp;{d.a}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/80 shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            {traceA.id} ↔ {traceB.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
