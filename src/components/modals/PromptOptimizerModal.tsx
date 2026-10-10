"use client";

import React, { useState, useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import { generatePromptOptimization, OptimizationInsight } from "@/lib/prompt-optimizer";
import {
  X,
  Sparkles,
  Cpu,
  Coins,
  TrendingDown,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Lightbulb,
} from "lucide-react";

interface PromptOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

export function PromptOptimizerModal({
  isOpen,
  onClose,
  trace,
}: PromptOptimizerModalProps) {
  const [copied, setCopied] = useState(false);

  const optimization: OptimizationInsight | null = useMemo(() => {
    if (!trace) return null;
    return generatePromptOptimization(trace);
  }, [trace]);

  if (!isOpen || !trace || !optimization) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(optimization.optimizedSystemPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[780px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Ghost Pruning AI Optimizer &amp; Token Advisor
            </h3>
            <p className="text-xs text-slate-400">
              Synthesizes negative prompt constraints to stop the agent from exploring dead-ends in future runs.
            </p>
          </div>
        </div>

        {/* Savings KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>Tokens on Ghost Branches</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {optimization.totalGhostTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">
              ~{optimization.wastedPercentage}% of total run tokens
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Estimated Cost Waste</span>
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              ${optimization.wastedCostUsd.toFixed(4)}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">
              Eliminated with optimized constraints
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Pruned Hypotheses</span>
            </div>
            <div className="text-lg font-bold text-purple-200 font-mono">
              {trace.ghostBranchCount} Branches
            </div>
            <div className="text-[10px] text-purple-400/80 mt-0.5">
              Analyzed for negative constraints
            </div>
          </div>
        </div>

        {/* Root Causes & Injected Rules */}
        <div className="mb-6 space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Identified Bottlenecks &amp; Pruning Rules</span>
          </h4>

          <div className="space-y-2">
            {optimization.recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-black/40 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300 font-mono text-[11px]">
                    [{rec.category}]
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    Save ~{rec.estimatedTokensSaved} tok
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  Issue: &quot;{rec.issue}&quot;
                </p>
                <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-200">
                  <span className="font-semibold text-amber-400">Rule to inject: </span>
                  {rec.suggestedConstraint}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimized System Prompt Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Optimized System Prompt (Ready to Deploy)
            </h4>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied System Prompt!" : "Copy System Prompt"}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-black/80 border border-slate-800 text-xs font-mono text-cyan-200/90 leading-relaxed overflow-x-auto max-h-56 whitespace-pre-wrap">
            {optimization.optimizedSystemPrompt}
          </pre>
        </div>

        <div className="flex justify-end pt-5 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Advisor
          </button>
        </div>
      </div>
    </div>
  );
}
