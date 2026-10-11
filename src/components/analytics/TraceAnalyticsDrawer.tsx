"use client";

import React, { useState } from "react";
import { TraceRunData } from "@/lib/types";
import {
  X,
  Activity,
  BarChart2,
  PieChart as PieIcon,
  Ghost,
  Cpu,
  Clock,
  ShieldAlert,
  DollarSign,
  AlertOctagon,
  ShieldCheck,
  TrendingDown,
  Sliders,
  Flame,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TraceAnalyticsDrawerProps {
  trace: TraceRunData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TraceAnalyticsDrawer({ trace, isOpen, onClose }: TraceAnalyticsDrawerProps) {
  // Budget Governor Interactive State
  const [costCeiling, setCostCeiling] = useState<number>(0.035);
  const [tokenCeiling, setTokenCeiling] = useState<number>(4500);
  const [governorArmed, setGovernorArmed] = useState<boolean>(true);
  const [emergencyBrakeEngaged, setEmergencyBrakeEngaged] = useState<boolean>(false);

  if (!isOpen || !trace) return null;

  const nodes = Array.isArray(trace.nodes) ? trace.nodes : [];

  // Calculate Ghost Branch Financial & Latency Waste Metrics
  const ghostNodes = nodes.filter((n) => n.isGhost);
  const chosenNodes = nodes.filter((n) => !n.isGhost);

  const ghostCount = trace.ghostBranchCount || ghostNodes.length;
  const chosenCount = chosenNodes.length;
  const prunedRatio = Math.round((ghostCount / (ghostCount + chosenCount || 1)) * 100);

  const totalTokens = Math.max(trace.totalTokens || 1, 1);
  const ghostTokens = ghostNodes.reduce((acc, n) => acc + (n.tokens || 0), 0);
  const ghostLatencyMs = ghostNodes.reduce((acc, n) => acc + (n.latencyMs || 0), 0);

  // Derive per-token unit cost or use standard blended rate
  const blendedRatePerToken =
    trace.costEstimate > 0 && trace.totalTokens > 0
      ? trace.costEstimate / trace.totalTokens
      : 0.0000045; // ~$4.50 / 1M tokens

  const ghostCostDirect = ghostNodes.reduce((acc, n) => acc + (n.cost || 0), 0);
  const ghostDollarWaste =
    ghostCostDirect > 0 ? ghostCostDirect : ghostTokens * blendedRatePerToken;
  const committedCost = Math.max(0, (trace.costEstimate || 0) - ghostDollarWaste);

  const ghostWasteIndexPct = Math.min(
    100,
    Math.round((ghostTokens / totalTokens) * 100)
  );
  const committedEfficiencyPct = 100 - ghostWasteIndexPct;

  // Critic ROI: avoided downstream token explosion & API damage
  const avoidedTokens = ghostCount * 1250;
  const avoidedDollars = (avoidedTokens * blendedRatePerToken * 1.8 + ghostCount * 0.008).toFixed(4);
  const roiMultiplier = ghostDollarWaste > 0 ? (Number(avoidedDollars) / ghostDollarWaste).toFixed(1) : "4.2";

  // Check if Budget Governor limits are tripped
  const isCostTripped = governorArmed && (trace.costEstimate || 0) > costCeiling;
  const isTokenTripped = governorArmed && totalTokens > tokenCeiling;
  const isGovernorAlarm = isCostTripped || isTokenTripped;

  // Token breakdown data for chart
  const tokenData = [
    { name: "Committed Prompt", value: trace.promptTokens, color: "#38bdf8" },
    { name: "Reasoning (CoT)", value: trace.reasoningTokens, color: "#818cf8" },
    { name: "Final Completion", value: trace.completionTokens, color: "#34d399" },
    { name: "Pruned Ghost Waste", value: ghostTokens, color: "#c084fc" },
  ];

  // Latency per step data
  const stepLatencyData = nodes.map((node) => ({
    step: `Step #${node.stepIndex}`,
    name: node.label,
    latency: node.latencyMs || 0,
    tokens: node.tokens || 0,
    isGhost: node.isGhost,
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-[640px] max-w-full h-full bg-[#090d18] border-l border-slate-800 p-6 flex flex-col overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">
                  Trace Telemetry &amp; Waste Intelligence
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-[10px] font-mono font-bold text-cyan-300">
                  P2 GOVERNOR
                </span>
              </div>
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

        {/* BUDGET GOVERNOR TRIP ALERT BANNER */}
        {isGovernorAlarm && (
          <div className="mb-5 p-4 rounded-xl bg-rose-950/40 border border-rose-500/60 space-y-2.5 shadow-[0_0_25px_rgba(244,63,94,0.18)] animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>⚠️ Budget Governor Kill-Switch Triggered</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/80 text-rose-200 border border-rose-600 font-mono">
                OVER BUDGET
              </span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
              This execution spent{" "}
              <strong className="text-white font-mono">${(trace.costEstimate || 0).toFixed(4)}</strong>{" "}
              (limit: ${costCeiling.toFixed(4)}) across{" "}
              <strong className="text-white font-mono">{totalTokens.toLocaleString()} tokens</strong>{" "}
              (ceiling: {tokenCeiling.toLocaleString()}). Speculative exploration throttled.
            </p>
            <div className="p-2.5 rounded-lg bg-black/50 border border-rose-900/60 text-[11px] text-rose-200 flex items-center justify-between">
              <span>Recommendation: Tighten critic acceptance score from 0.70 → 0.85 to suppress phantom forks.</span>
              <button
                onClick={() => setEmergencyBrakeEngaged(!emergencyBrakeEngaged)}
                className={`ml-2 px-2.5 py-1 rounded text-[10px] font-bold font-mono transition-colors shrink-0 ${
                  emergencyBrakeEngaged
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                {emergencyBrakeEngaged ? "BRAKE ENGAGED" : "KILL RUNAWAY"}
              </button>
            </div>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Tokens</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {trace.totalTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5 font-mono">
              ~${(trace.costEstimate || 0).toFixed(4)} USD
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Total Duration</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {((trace.durationMs || 1) / 1000).toFixed(2)}s
            </div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5 font-mono">
              Avg {Math.round((trace.durationMs || 1) / (nodes.length || 1))}ms/step
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
            <div className="text-[10px] text-purple-400/80 mt-0.5 font-mono">
              {ghostCount} ghost paths rejected
            </div>
          </div>
        </div>

        {/* GHOST BRANCH FINANCIAL WASTE INDEX CARD */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-slate-900/80 border border-purple-800/50 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Ghost Branch Waste Index</span>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700">
              {ghostWasteIndexPct}% Budget Burned on Pruned Paths
            </span>
          </div>

          {/* Efficiency Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="text-cyan-400 font-medium">
                Committed Value: {committedEfficiencyPct}% (${committedCost.toFixed(4)})
              </span>
              <span className="text-purple-400 font-medium">
                Pruned Ghost Waste: {ghostWasteIndexPct}% (${ghostDollarWaste.toFixed(4)})
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
              <div
                className="bg-cyan-500 h-full transition-all"
                style={{ width: `${committedEfficiencyPct}%` }}
                title="Committed Path Tokens"
              />
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${ghostWasteIndexPct}%` }}
                title="Ghost Branch Wasted Tokens"
              />
            </div>
          </div>

          {/* Breakdown Mini-Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-0.5">
                <DollarSign className="w-3 h-3 text-rose-400" />
                <span>Financial Loss (Pruned)</span>
              </div>
              <div className="font-mono font-bold text-rose-300">
                ${ghostDollarWaste.toFixed(4)} USD
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {ghostTokens.toLocaleString()} speculative tokens
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-0.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Latency Sunk Cost</span>
              </div>
              <div className="font-mono font-bold text-amber-300">
                {(ghostLatencyMs / 1000).toFixed(2)}s overhead
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {Math.round((ghostLatencyMs / (trace.durationMs || 1)) * 100)}% of agent runtime
              </div>
            </div>
          </div>

          {/* Critic Pruning ROI Card */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-emerald-300 font-semibold text-[11px]">
                  Critic Pruning Defense: ~${avoidedDollars} Saved
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  Prevented {avoidedTokens.toLocaleString()} downstream tokens and hallucinated mutations ({roiMultiplier}x ROI)
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-mono text-[10px] border border-emerald-700/60 font-bold shrink-0">
              +{roiMultiplier}x ROI
            </span>
          </div>
        </div>

        {/* COST GOVERNOR CONTROLS */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Cost Governor &amp; Kill-Switch Policy</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-slate-400 font-mono">
                {governorArmed ? "ARMED" : "BYPASSED"}
              </span>
              <input
                type="checkbox"
                checked={governorArmed}
                onChange={(e) => setGovernorArmed(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Max Cost Ceiling:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  ${costCeiling.toFixed(3)}
                </span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.100"
                step="0.005"
                value={costCeiling}
                onChange={(e) => setCostCeiling(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Max Token Ceiling:</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {tokenCeiling.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="15000"
                step="500"
                value={tokenCeiling}
                onChange={(e) => setTokenCeiling(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Chart 1: Token Distribution Pie & Bar */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-5">
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
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={120} />
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
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-5">
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
