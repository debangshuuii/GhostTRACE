"use client";

import React, { useState } from "react";
import { TraceRunData } from "@/lib/types";
import {
  X,
  Globe,
  Cpu,
  Coins,
  Ghost,
  Clock,
  Search,
  BarChart3,
  Layers,
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

interface FleetTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  onSelectTrace: (traceId: string) => void;
}

export function FleetTelemetryModal({
  isOpen,
  onClose,
  traces,
  onSelectTrace,
}: FleetTelemetryModalProps) {
  const [globalSearch, setGlobalSearch] = useState("");

  if (!isOpen) return null;

  // Aggregate stats
  const totalTokens = traces.reduce((acc, t) => acc + t.totalTokens, 0);
  const totalCost = traces.reduce((acc, t) => acc + t.costEstimate, 0);
  const totalGhosts = traces.reduce((acc, t) => acc + t.ghostBranchCount, 0);
  const totalDurationSeconds = traces.reduce((acc, t) => acc + t.durationMs, 0) / 1000;

  // Model comparison data
  const modelStats = traces.reduce((acc: Record<string, { model: string; tokens: number; count: number; ghosts: number }>, t) => {
    const key = t.model.split("-")[0];
    if (!acc[key]) {
      acc[key] = { model: key, tokens: 0, count: 0, ghosts: 0 };
    }
    acc[key].tokens += t.totalTokens;
    acc[key].ghosts += t.ghostBranchCount;
    acc[key].count += 1;
    return acc;
  }, {});

  const modelChartData = Object.values(modelStats).map((m) => ({
    name: m.model,
    avgTokens: Math.round(m.tokens / m.count),
    totalGhosts: m.ghosts,
  }));

  // Global search across all traces
  const matchingTraces = traces.filter((t) => {
    if (!globalSearch) return true;
    const q = globalSearch.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.agentName.toLowerCase().includes(q) ||
      t.model.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[840px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Fleet-Wide Observability &amp; Cost Intelligence
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated telemetry, token expenditure, and pruning efficiency across all agent sessions.
            </p>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Sessions</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {traces.length}
            </div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5">Active in SQLite</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fleet Tokens</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-400/80 mt-0.5">
              Avg {Math.round(totalTokens / (traces.length || 1)).toLocaleString()} / run
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>Cumulative Cost</span>
            </div>
            <div className="text-lg font-bold text-slate-100 font-mono">
              ${totalCost.toFixed(4)}
            </div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Estimated USD</div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40">
            <div className="flex items-center gap-1.5 text-xs text-purple-300 mb-1">
              <Ghost className="w-3.5 h-3.5 text-purple-400" />
              <span>Ghost Paths Pruned</span>
            </div>
            <div className="text-lg font-bold text-purple-200 font-mono">
              {totalGhosts}
            </div>
            <div className="text-[10px] text-purple-400/80 mt-0.5">
              Unsafe / dead-ends neutralized
            </div>
          </div>
        </div>

        {/* Model Benchmark Bar Chart */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>Average Token Consumption by Model Architecture</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Benchmark Across Sessions
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelChartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val.toLocaleString()} tokens`, "Avg Consumption"]}
                />
                <Bar dataKey="avgTokens" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Search & Session Roster */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Global Session Registry
            </h4>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Filter sessions..."
                className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-52 overflow-y-auto border border-slate-800 rounded-xl bg-black/40">
            {matchingTraces.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTrace(t.id);
                  onClose();
                }}
                className="p-3 hover:bg-slate-900/70 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200">{t.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {t.agentName} • <span className="font-mono text-cyan-400">{t.model}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                  <span>{t.totalTokens.toLocaleString()} tok</span>
                  <span className="flex items-center gap-1 text-purple-400">
                    <Ghost className="w-3.5 h-3.5" />
                    {t.ghostBranchCount}
                  </span>
                  <span className="text-cyan-400 hover:underline">Inspect →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-5 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Fleet Telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
