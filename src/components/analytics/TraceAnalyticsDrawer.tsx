"use client";

import React from "react";
import { TraceRunData } from "@/lib/types";
import {
  X,
  Activity,
  Zap,
  BarChart2,
  PieChart as PieIcon,
  Ghost,
  Cpu,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";

interface TraceAnalyticsDrawerProps {
  trace: TraceRunData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TraceAnalyticsDrawer({ trace, isOpen, onClose }: TraceAnalyticsDrawerProps) {
  if (!isOpen || !trace) return null;

  // Token breakdown data
  const tokenData = [
    { name: "Prompt Tokens", value: trace.promptTokens, color: "#38bdf8" },
    { name: "Reasoning (CoT)", value: trace.reasoningTokens, color: "#818cf8" },
    { name: "Completion", value: trace.completionTokens, color: "#34d399" },
  ];

  const nodes = Array.isArray(trace.nodes) ? trace.nodes : [];

  // Latency per step data
  const stepLatencyData = nodes.map((node) => ({
    step: `Step #${node.stepIndex}`,
    name: node.label,
    latency: node.latencyMs || 0,
    tokens: node.tokens || 0,
    isGhost: node.isGhost,
  }));

  const ghostCount = trace.ghostBranchCount || nodes.filter((n) => n.isGhost).length;
  const chosenCount = nodes.filter((n) => !n.isGhost).length;
  const prunedRatio = Math.round((ghostCount / (ghostCount + chosenCount || 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-[600px] max-w-full h-full bg-[#090d18] border-l border-slate-800 p-6 flex flex-col overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Trace Telemetry &amp; Performance
              </h2>
              <p className="text-xs text-slate-400">
                {trace.title} • {trace.model}
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

        {/* Top KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Tokens</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {trace.totalTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5">
              ~${trace.costEstimate?.toFixed(4) || "0.00"} USD
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Total Duration</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {(trace.durationMs / 1000).toFixed(2)}s
            </div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5">
              Avg {Math.round(trace.durationMs / (nodes.length || 1))}ms/step
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-purple-800/40 bg-purple-950/20">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
              <Ghost className="w-3.5 h-3.5 text-purple-400" />
              <span>Pruning Rate</span>
            </div>
            <div className="text-lg font-bold text-purple-200 font-mono">
              {prunedRatio}%
            </div>
            <div className="text-[10px] text-purple-400/80 mt-0.5">
              {ghostCount} ghost paths rejected
            </div>
          </div>
        </div>

        {/* Chart 1: Token Distribution Pie & Bar */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <PieIcon className="w-4 h-4 text-cyan-400" />
              <span>Token Composition Distribution</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Reasoning Ratio:{" "}
              {Math.round((trace.reasoningTokens / (trace.totalTokens || 1)) * 100)}%
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any) => [`${value} tokens`, "Count"]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {tokenData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Step Latency Breakdown */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Latency per Step (Bottleneck Inspector)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Purple = Ghost Branch
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepLatencyData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                <XAxis dataKey="step" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _: any, item: any) => [
                    `${val}ms (${item.payload.tokens} tokens)`,
                    item.payload.isGhost ? "Ghost (Pruned)" : "Chosen",
                  ]}
                  labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.name || ""}
                />
                <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                  {stepLatencyData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.isGhost ? "#c084fc" : "#06b6d4"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critic & Evaluations Section */}
        {trace.evaluations && trace.evaluations.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-3">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Critic Evaluation &amp; Guardrails</span>
            </div>
            <div className="space-y-2">
              {trace.evaluations.map((ev, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">{ev.evaluator}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                      {ev.verdict} (Rating: {ev.rating}/5)
                    </span>
                  </div>
                  <p className="text-slate-400 font-sans">{ev.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
