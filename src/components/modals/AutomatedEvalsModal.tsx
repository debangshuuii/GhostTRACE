"use client";

import React, { useState, useEffect } from "react";
import { TraceRunData } from "@/lib/types";
import { evaluateTraceWithJudge, DetailedEvaluationReport } from "@/lib/eval-engine";
import {
  X,
  Scale,
  Sparkles,
  ShieldCheck,
  Zap,
  Coins,
  Cpu,
  Clock,
  Ghost,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trophy,
  BarChart3,
  Award,
  Layers,
} from "lucide-react";

interface AutomatedEvalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

interface LeaderboardItem {
  model: string;
  avgScore: number;
  avgFaithfulness: number;
  avgGhostPruning: number;
  avgSafety: number;
  traceCount: number;
  totalGhostsPruned: number;
}

export function AutomatedEvalsModal({ isOpen, onClose, trace }: AutomatedEvalsModalProps) {
  const [activeTab, setActiveTab] = useState<"diagnostic" | "leaderboard">("diagnostic");
  const [judgeModel, setJudgeModel] = useState<string>("deepseek-r1-distill");
  const [evalReport, setEvalReport] = useState<DetailedEvaluationReport | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  useEffect(() => {
    if (trace && isOpen) {
      setEvalReport(evaluateTraceWithJudge(trace, judgeModel));
    }
  }, [trace, isOpen, judgeModel]);

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await fetch("/api/evals/leaderboard");
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeTab === "leaderboard" && isOpen) {
      fetchLeaderboard();
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleRunLiveEval = async () => {
    if (!trace) return;
    try {
      setRunning(true);
      const res = await fetch(`/api/traces/${trace.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeModel }),
      });
      const data = await res.json();
      if (data.report) {
        setEvalReport(data.report);
      }
    } catch (err) {
      console.error("Live eval error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[840px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Automated Evals &amp; LLM-as-a-Judge Benchmark
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                  Alignment Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Multi-dimensional trace scoring: Faithfulness, Ghost Hallucination Suppression &amp; Safety Compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-4 mb-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "diagnostic"
                ? "border-amber-400 text-amber-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Trace Diagnostic ({trace?.title ? trace.title.slice(0, 30) + "..." : "Current"})</span>
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "leaderboard"
                ? "border-amber-400 text-amber-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Fleet Model Leaderboard</span>
          </button>
        </div>

        {/* Tab 1: Diagnostic */}
        {activeTab === "diagnostic" && evalReport && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Top Score Banner */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-purple-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Overall Judge Rating
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono text-amber-400">
                      {evalReport.overallScorePct}%
                    </span>
                    <span className="text-sm text-slate-400 font-mono">
                      ({evalReport.overallRating}/5 Stars)
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${
                          i < evalReport.overallRating ? "text-amber-400" : "text-slate-700"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Verdict
                  </span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border ${
                      evalReport.verdict === "OPTIMAL"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-700/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-purple-950 text-purple-300 border-purple-700/80"
                    }`}
                  >
                    {evalReport.verdict}
                  </span>
                </div>
              </div>

              {/* Model Select & Trigger */}
              <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Evaluator Judge Model
                  </label>
                  <select
                    value={judgeModel}
                    onChange={(e) => setJudgeModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="deepseek-r1-distill">DeepSeek-R1 (Distill CoT Judge)</option>
                    <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Thinking Judge)</option>
                    <option value="gpt-4o">GPT-4o (Standard Judge)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRunLiveEval}
                  disabled={running}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] disabled:opacity-50"
                >
                  {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Run Live Evaluation &amp; Persist</span>
                </button>
              </div>
            </div>

            {/* 4 Multi-Dimensional Criteria Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    Faithfulness &amp; Grounding
                  </span>
                  <span className="font-mono font-bold text-sky-400">{evalReport.faithfulnessScore}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{ width: `${evalReport.faithfulnessScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Adherence to external tool telemetry without speculative hallucination.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Ghost className="w-4 h-4 text-purple-400" />
                    Ghost Pruning Precision
                  </span>
                  <span className="font-mono font-bold text-purple-400">{evalReport.ghostPruningScore}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all"
                    style={{ width: `${evalReport.ghostPruningScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Efficiency in intercepting and vetoing unviable branches ({evalReport.metrics.ghostCount} caught).
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Safety &amp; Blast Radius Control
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    {evalReport.safetyComplianceScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${evalReport.safetyComplianceScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Zero high-impact destructive operations executed outside sandbox policies.
                </p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    Cost &amp; Token Economy
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {evalReport.costEfficiencyScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${evalReport.costEfficiencyScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Productive reasoning tokens ({evalReport.metrics.productiveTokens}) vs wasted ghost tokens ({evalReport.metrics.wastedTokens}).
                </p>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Key Strengths
                </span>
                <ul className="text-xs text-slate-300 space-y-1">
                  {evalReport.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Areas for Improvement
                </span>
                <ul className="text-xs text-slate-300 space-y-1">
                  {evalReport.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* LLM-as-a-Judge Rationale Box */}
            <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 space-y-1 leading-relaxed">
              <span className="text-[10px] text-amber-400/80 uppercase tracking-wider block font-bold mb-1">
                Judge Synthesis Feedback ({evalReport.evaluatorName})
              </span>
              <div className="whitespace-pre-wrap">{evalReport.judgeCritique}</div>
            </div>
          </div>
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center h-48 gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Aggregating fleet evaluation scores across traces...</span>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-900/80 p-3 text-xs font-semibold text-slate-300 border-b border-slate-800">
                  <span className="col-span-2">Model Architecture</span>
                  <span className="text-center">Overall Score</span>
                  <span className="text-center">Faithfulness</span>
                  <span className="text-center">Ghost Pruning</span>
                  <span className="text-center">Safety</span>
                  <span className="text-right">Traces</span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {leaderboard.map((item, idx) => (
                    <div
                      key={item.model}
                      className="grid grid-cols-7 p-3 text-xs items-center hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-slate-200">{item.model}</div>
                          <div className="text-[10px] text-purple-400 font-mono">
                            {item.totalGhostsPruned} ghost branches pruned
                          </div>
                        </div>
                      </div>

                      <div className="text-center font-mono font-bold text-amber-400">
                        {item.avgScore}%
                      </div>
                      <div className="text-center font-mono text-sky-400">
                        {item.avgFaithfulness}%
                      </div>
                      <div className="text-center font-mono text-purple-400">
                        {item.avgGhostPruning}%
                      </div>
                      <div className="text-center font-mono text-emerald-400">
                        {item.avgSafety}%
                      </div>
                      <div className="text-right font-mono text-slate-400">
                        {item.traceCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
