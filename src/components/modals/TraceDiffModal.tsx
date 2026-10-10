"use client";

import React, { useState } from "react";
import { TraceRunData } from "@/lib/types";
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Ghost,
  Cpu,
  Clock,
  Coins,
  CheckCircle2,
} from "lucide-react";

interface TraceDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  currentTraceId: string | null;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[840px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/50 text-indigo-400">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Trace A/B Comparison &amp; Efficiency Diff
            </h3>
            <p className="text-xs text-slate-400">
              Benchmark execution paths, token overhead, and ghost branch pruning between runs.
            </p>
          </div>
        </div>

        {/* Trace Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase text-slate-400">
              Trace A (Baseline Run)
            </label>
            <select
              value={traceAId}
              onChange={(e) => setTraceAId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {traces.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.model})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <label className="text-[11px] font-mono font-semibold uppercase text-cyan-400">
              Trace B (Comparison Run)
            </label>
            <select
              value={traceBId}
              onChange={(e) => setTraceBId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/50 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
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
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* Tokens */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Tokens</span>
            </div>
            <div className="text-base font-bold text-slate-100 font-mono">
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
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-purple-800/40 bg-purple-950/20">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
              <Ghost className="w-3.5 h-3.5 text-purple-400" />
              <span>Ghost Branches</span>
            </div>
            <div className="text-base font-bold text-purple-200 font-mono">
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
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Duration</span>
            </div>
            <div className="text-base font-bold text-slate-100 font-mono">
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
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Cost Est.</span>
            </div>
            <div className="text-base font-bold text-slate-100 font-mono">
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

        {/* Step-by-Step Comparison Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden mb-4">
          <div className="grid grid-cols-2 bg-slate-900/80 p-3 text-xs font-semibold text-slate-300 border-b border-slate-800">
            <span>Trace A Steps ({nodesA.length})</span>
            <span>Trace B Steps ({nodesB.length})</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
            {Array.from({
              length: Math.max(nodesA.length, nodesB.length),
            }).map((_, idx) => {
              const nodeA = nodesA[idx];
              const nodeB = nodesB[idx];
              return (
                <div key={idx} className="grid grid-cols-2 p-2.5 text-xs gap-3">
                  <div className="space-y-0.5">
                    {nodeA ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">#{nodeA.stepIndex}</span>
                        <span className={`font-medium ${nodeA.isGhost ? "text-purple-400" : "text-slate-200"}`}>
                          {nodeA.label}
                        </span>
                        {nodeA.isGhost && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                            Ghost
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600 italic text-[11px]">— No corresponding step —</span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {nodeB ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">#{nodeB.stepIndex}</span>
                        <span className={`font-medium ${nodeB.isGhost ? "text-purple-400" : "text-cyan-200"}`}>
                          {nodeB.label}
                        </span>
                        {nodeB.isGhost && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                            Ghost
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600 italic text-[11px]">— No corresponding step —</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
