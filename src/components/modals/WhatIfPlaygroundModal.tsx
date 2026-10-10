"use client";

import React, { useState } from "react";
import { TraceNodeData } from "@/lib/types";
import {
  X,
  GitFork,
  Ghost,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface WhatIfPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentNode: TraceNodeData | null;
  traceId: string | null;
  onForkCreated: () => void;
}

export function WhatIfPlaygroundModal({
  isOpen,
  onClose,
  parentNode,
  traceId,
  onForkCreated,
}: WhatIfPlaygroundModalProps) {
  const [branchTitle, setBranchTitle] = useState("");
  const [alternativeContent, setAlternativeContent] = useState("");
  const [isGhost, setIsGhost] = useState(false);
  const [criticFeedback, setCriticFeedback] = useState("");
  const [model, setModel] = useState("deepseek-r1-distill");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !parentNode || !traceId) return null;

  const handleGenerateAiBranch = async (mode: "speculative_ghost" | "optimal_alternative") => {
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch(`/api/traces/${traceId}/fork/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentNode: {
            nodeId: parentNode.nodeId,
            label: parentNode.label,
            content: parentNode.content,
            type: parentNode.type,
            stepIndex: parentNode.stepIndex,
          },
          mode,
          criticStrictness: 0.9,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate counterfactual");

      setBranchTitle(data.generated.branchTitle);
      setAlternativeContent(data.generated.alternativeContent);
      setIsGhost(data.generated.isGhost);
      setCriticFeedback(data.generated.criticFeedback);
    } catch (err: any) {
      setError(err.message || "Failed to generate alternative with AI critic");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alternativeContent.trim()) {
      setError("Please provide the alternative reasoning or action content.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/traces/${traceId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentStepId: parentNode.nodeId,
          branchTitle: branchTitle || `Counterfactual: Alternative to ${parentNode.label}`,
          branchType: isGhost ? "GHOST_REJECTED" : "THINKING",
          alternativeContent,
          criticFeedback: isGhost ? criticFeedback : null,
          isGhost,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create counterfactual branch");

      onForkCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit counterfactual branch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[640px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <GitFork className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Counterfactual Branch Playground
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                Critic Powered
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Fork reasoning path from Step #{parentNode.stepIndex} ({parentNode.label})
            </p>
          </div>
        </div>

        {/* Parent Context Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 mb-4 text-xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Parent Execution Node #{parentNode.stepIndex}:</span>
            <span className="text-cyan-400">{parentNode.type}</span>
          </div>
          <p className="text-slate-200 line-clamp-2 italic font-sans text-xs">
            &quot;{parentNode.content}&quot;
          </p>
        </div>

        {/* AI Counterfactual One-Click Generators */}
        <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/30 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Counterfactual Synthesizer &amp; Critic:
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleGenerateAiBranch("speculative_ghost")}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-purple-900/50 hover:bg-purple-800/60 border border-purple-600/50 text-purple-200 text-xs font-medium transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)] disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ghost className="w-3.5 h-3.5" />}
              <span>Generate Speculative Ghost</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerateAiBranch("optimal_alternative")}
              disabled={generating}
              className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-600/50 text-cyan-200 text-xs font-medium transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Generate Optimal Alternative</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Branch Title / Hypothesis Name
              </label>
              <input
                type="text"
                value={branchTitle}
                onChange={(e) => setBranchTitle(e.target.value)}
                placeholder="e.g. Speculative Fix: Dynamic In-Memory Cache"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Evaluator Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="deepseek-r1-distill">deepseek-r1</option>
                <option value="claude-3-7-sonnet">claude-3-7</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Alternative Reasoning or Tool Command
            </label>
            <textarea
              rows={4}
              value={alternativeContent}
              onChange={(e) => setAlternativeContent(e.target.value)}
              placeholder="Describe the counterfactual thought chain, alternative tool call, or prompt mutation..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 font-sans"
            />
          </div>

          {/* Critic Evaluation & Ghost Branch Settings */}
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ghost className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-purple-200">
                  Mark as Rejected Ghost Branch?
                </span>
              </div>
              <input
                type="checkbox"
                checked={isGhost}
                onChange={(e) => setIsGhost(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-purple-300/80">
              When checked, this branch is treated as pruned by the critic (represented on canvas
              with glowing dashed purple edges and ghost telemetry).
            </p>

            {isGhost ? (
              <div className="pt-2 border-t border-purple-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Critic Veto Rationale:</span>
                </div>
                <input
                  type="text"
                  value={criticFeedback}
                  onChange={(e) => setCriticFeedback(e.target.value)}
                  placeholder="e.g. Failed safety policy: unbounded cache memory leak risk"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/50 border border-rose-800/60 text-xs text-rose-200 placeholder:text-rose-400/50 focus:outline-none focus:border-rose-500"
                />
              </div>
            ) : (
              criticFeedback && (
                <div className="pt-2 border-t border-purple-900/50 flex items-center gap-2 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{criticFeedback}</span>
                </div>
              )
            )}
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Commit Branch into DAG</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
