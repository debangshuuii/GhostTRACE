"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  RotateCw,
  Play,
  Brain,
  CheckCircle2,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { TraceNodeData } from "@/lib/types";

interface StepReExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TraceNodeData | null;
  traceId: string | null;
  onReExecutionComplete: () => void;
}

export function StepReExecuteModal({
  isOpen,
  onClose,
  node,
  traceId,
  onReExecutionComplete,
}: StepReExecuteModalProps) {
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("");
  const [strategy, setStrategy] = useState<"COMPLETE_DOWNSTREAM" | "SINGLE_ALTERNATIVE">(
    "COMPLETE_DOWNSTREAM"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setContent(node.content || "");
      setLabel(`Re-run of Step #${node.stepIndex}: ${node.label}`);
    }
  }, [node]);

  if (!isOpen || !node || !traceId) return null;

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/traces/${traceId}/re-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNodeId: node.nodeId,
          modifiedContent: content,
          modifiedLabel: label,
          reExecutionStrategy: strategy,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to re-execute step downstream");
      }

      onReExecutionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to re-execute downstream path");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#0b101f] border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <RotateCw className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Live In-DAG Step Re-Execution
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 font-mono">
                  Jupyter DAG
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit reasoning or tool outputs at Step #{node.stepIndex} and re-run execution downstream.
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

        {/* Form Body */}
        <form onSubmit={handleExecute} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Modified Step Label / Hypothesis Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>Modified Reasoning / Prompt Content</span>
              <span className="text-[10px] font-mono text-slate-400">
                Origin Step #{node.stepIndex} ({node.type})
              </span>
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {/* Strategy selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Downstream Propagation Strategy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStrategy("COMPLETE_DOWNSTREAM")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  strategy === "COMPLETE_DOWNSTREAM"
                    ? "bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Downstream Rollout</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Automatically re-executes subsequent tool verification and delivers updated final synthesis.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStrategy("SINGLE_ALTERNATIVE")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  strategy === "SINGLE_ALTERNATIVE"
                    ? "bg-cyan-950/50 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-cyan-300">
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Single Hypothesis Branch</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                  Branches only the single modified step into the DAG without triggering downstream tools.
                </p>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 font-mono">
              Live updates broadcast directly via SSE to Canvas
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Re-Execute Downstream</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
