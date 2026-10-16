"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TraceRunData } from "@/lib/types";
import {
  analyzePromptCacheEconomics,
  SUPPORTED_MODELS_PRICING,
  CacheOptimizationAnalysis,
} from "@/lib/cache-cost-optimizer";
import { sciFiAudio } from "@/lib/ghost-voice-engine";
import {
  X,
  Coins,
  TrendingDown,
  Sparkles,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Code,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Clock,
  Sliders,
  DollarSign,
  Flame,
} from "lucide-react";

interface PromptCacheOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

export function PromptCacheOptimizerModal({
  isOpen,
  onClose,
  trace,
}: PromptCacheOptimizerModalProps) {
  const [selectedModelId, setSelectedModelId] = useState<string>("claude-3-7-sonnet");
  const [monthlyScale, setMonthlyScale] = useState<number>(25000);
  const [activeTab, setActiveTab] = useState<"blueprint" | "audit" | "code">("blueprint");
  const [codeLanguage, setCodeLanguage] = useState<"python" | "typescript">("python");
  const [copied, setCopied] = useState(false);

  // Sound effect on open
  useEffect(() => {
    if (isOpen) {
      try {
        sciFiAudio.playSuccessChime();
      } catch {}
    }
  }, [isOpen]);

  // Compute live analysis
  const analysis: CacheOptimizationAnalysis | null = useMemo(() => {
    if (!trace) return null;
    return analyzePromptCacheEconomics(trace, selectedModelId, monthlyScale);
  }, [trace, selectedModelId, monthlyScale]);

  if (!isOpen || !trace || !analysis) return null;

  const handleCopyCode = () => {
    const code =
      codeLanguage === "python"
        ? analysis.codeSnippetPython
        : analysis.codeSnippetTypeScript;
    navigator.clipboard.writeText(code);
    setCopied(true);
    try {
      sciFiAudio.playCyberClick();
    } catch {}
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-[960px] max-w-full bg-[#080d1a] border border-cyan-500/50 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh] overflow-hidden ring-1 ring-cyan-500/30">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-800 bg-[#060a14] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                  Prompt Caching & Token Cost Slasher
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/70 text-[10px] font-mono font-bold tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  -{analysis.savingsPercentage}% TOKENS
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                  {analysis.model.provider}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Anthropic Ephemeral & OpenAI Prefix Caching Simulator for Trace #{trace.id.slice(0, 10)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Controls Bar: Model & Fleet Scale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#090e1f] border border-slate-800">
            {/* Target Model Selector */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Target Model Engine
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                  try {
                    sciFiAudio.playCyberClick();
                  } catch {}
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 outline-none focus:border-cyan-500 font-sans"
              >
                {Object.values(SUPPORTED_MODELS_PRICING).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.cacheDiscountPercent}% Cache Discount
                  </option>
                ))}
              </select>
            </div>

            {/* Projected Monthly Runs Scale Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                <span className="uppercase tracking-wider">Monthly Agent Runs Scale</span>
                <span className="text-cyan-400 font-bold">{monthlyScale.toLocaleString()} runs/mo</span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={monthlyScale}
                onChange={(e) => setMonthlyScale(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span>1K</span>
                <span>50K</span>
                <span>100K</span>
                <span>200K runs/mo</span>
              </div>
            </div>
          </div>

          {/* Hero Financial Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Single Run Cost */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Single Run Cost</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-400 line-through">
                  ${analysis.baselineCostUsd.toFixed(4)}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-black text-emerald-400">
                  ${analysis.optimizedCostUsd.toFixed(4)}
                </span>
              </div>
              <div className="text-[10px] text-emerald-400/90 font-mono mt-1 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                <span>Save ${(analysis.netSavingsUsd).toFixed(4)} per agent run</span>
              </div>
            </div>

            {/* Projected Monthly Savings */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 relative overflow-hidden group shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="text-[11px] font-mono text-emerald-300 uppercase font-semibold">
                Monthly Net Savings
              </div>
              <div className="text-2xl font-black text-emerald-300 mt-1">
                +${Math.round(analysis.projectedMonthlyNetSavingsUsd).toLocaleString()}/mo
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Down from ${Math.round(analysis.projectedMonthlyBaselineUsd).toLocaleString()}/mo
              </div>
            </div>

            {/* Cache Hit Ratio */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Projected Hit Ratio</div>
              <div className="text-2xl font-bold text-cyan-300 mt-1">
                {(analysis.cacheHitRatio * 100).toFixed(1)}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${analysis.cacheHitRatio * 100}%` }}
                />
              </div>
            </div>

            {/* Breakpoints Utilized */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Active Breakpoints</div>
              <div className="text-2xl font-bold text-purple-300 mt-1">
                {analysis.maxBreakpointsUsed} <span className="text-xs text-slate-500 font-normal">/ 4 max</span>
              </div>
              <div className="text-[10px] text-purple-400/80 font-mono mt-1">
                {analysis.cachedInputTokens.toLocaleString()} tokens cached
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-xs font-mono">
            <button
              onClick={() => {
                setActiveTab("blueprint");
                try {
                  sciFiAudio.playCyberClick();
                } catch {}
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "blueprint"
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-500/70 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Breakpoint Blueprint</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("audit");
                try {
                  sciFiAudio.playCyberClick();
                } catch {}
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-amber-950 text-amber-300 border border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Anti-Pattern Audit ({analysis.antiPatterns.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("code");
                try {
                  sciFiAudio.playCyberClick();
                } catch {}
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "code"
                  ? "bg-purple-950 text-purple-300 border border-purple-500/70 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>1-Click SDK Implementation</span>
            </button>
          </div>

          {/* TAB 1: BREAKPOINT BLUEPRINT */}
          {activeTab === "blueprint" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Visualizing prefix token checkpoints across the execution pipeline. Each ephemeral breakpoint saves{" "}
                <span className="text-emerald-400 font-semibold">{analysis.model.cacheDiscountPercent}% on input tokens</span> across subsequent agent steps.
              </div>

              <div className="space-y-2.5">
                {analysis.breakpoints.map((bp, idx) => (
                  <div
                    key={bp.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                      bp.isEligibleForCache
                        ? "bg-[#0a1226] border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                        : "bg-slate-900/50 border-slate-800 opacity-80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 border ${
                          bp.isEligibleForCache
                            ? "bg-cyan-950 text-cyan-300 border-cyan-600"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 truncate">
                            {bp.label}
                          </span>
                          {bp.isEligibleForCache ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 uppercase">
                              CACHE HIT (-{analysis.model.cacheDiscountPercent}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 uppercase">
                              UNCACHED DELTA
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{bp.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className="text-xs font-bold text-slate-200">
                        {bp.tokenCount.toLocaleString()} tok
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Prefix: {bp.cumulativePrefixTokens.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ANTI-PATTERN AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Cache invalidation audits. Even a 1-character dynamic jitter in early prompt tokens invalidates downstream cache keys.
              </div>

              <div className="space-y-3">
                {analysis.antiPatterns.map((ap, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      ap.severity === "critical"
                        ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                        : ap.severity === "warning"
                        ? "bg-amber-950/30 border-amber-500/50 text-amber-200"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-semibold text-xs">
                        {ap.severity === "critical" ? (
                          <Flame className="w-4 h-4 text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        <span>{ap.title}</span>
                      </div>
                      {ap.location && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-300">
                          {ap.location}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{ap.description}</p>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-cyan-300">
                      💡 Fix: {ap.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 1-CLICK SDK IMPLEMENTATION */}
          {activeTab === "code" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <button
                    onClick={() => setCodeLanguage("python")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      codeLanguage === "python"
                        ? "bg-cyan-950 text-cyan-300 border border-cyan-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Python (anthropic)
                  </button>
                  <button
                    onClick={() => setCodeLanguage("typescript")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      codeLanguage === "typescript"
                        ? "bg-purple-950 text-purple-300 border border-purple-700"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    TypeScript (@anthropic-ai/sdk)
                  </button>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#040711]">
                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[260px]">
                  <code>
                    {codeLanguage === "python"
                      ? analysis.codeSnippetPython
                      : analysis.codeSnippetTypeScript}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#060a14] flex items-center justify-between shrink-0 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Anthropic Ephemeral Cache TTL: 5 minutes • Automatic renewal on hit</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
