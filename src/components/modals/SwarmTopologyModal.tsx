"use client";

import React, { useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import { analyzeSwarmTopology } from "@/lib/swarm-analyzer";
import {
  X,
  Users,
  Repeat,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Layers,
  Zap,
} from "lucide-react";

interface SwarmTopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

export function SwarmTopologyModal({
  isOpen,
  onClose,
  trace,
}: SwarmTopologyModalProps) {
  const analysis = useMemo(() => {
    return analyzeSwarmTopology(trace);
  }, [trace]);

  if (!isOpen || !trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[720px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Swarm Topology &amp; Infinite Loop Detector</span>
              {analysis.hasLoop ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 border border-rose-600 text-rose-300 font-mono font-bold animate-pulse">
                  LOOP DETECTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono">
                  TOPOLOGY HEALTHY
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Analyzes agent-to-agent delegation handoffs, token consumption, and recursive ping-pong patterns.
            </p>
          </div>
        </div>

        {/* Loop Alarm Banner */}
        {analysis.hasLoop && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/70 text-xs text-rose-200 mb-5 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Runaway Ping-Pong Cycle Detected</span>
            </div>
            <p>{analysis.loopWarning}</p>
            <div className="text-[11px] bg-rose-950/60 p-2.5 rounded-lg border border-rose-800/40 text-rose-300">
              💡 <strong>Recommended Fix:</strong> Add an explicit stopping constraint to the Coordinator prompt:
              <code className="block mt-1 p-1 bg-black/60 rounded text-amber-300 font-mono">
                "Max delegation rounds: 2. If subagent output is inconclusive, synthesize best-effort deliverable."
              </code>
            </div>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Unique Subagents</span>
            <div className="text-lg font-bold text-indigo-400 mt-1">
              {analysis.uniqueAgents.length} Agents
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Delegation Handoffs</span>
            <div className="text-lg font-bold text-cyan-400 mt-1">
              {analysis.totalHandoffs} Handoffs
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Loop Risk State</span>
            <div
              className={`text-lg font-bold mt-1 ${
                analysis.hasLoop ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {analysis.hasLoop ? "High Blast Radius" : "Optimal"}
            </div>
          </div>
        </div>

        {/* 2D Swarm Communication Matrix Table */}
        <div className="space-y-2 mb-5">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-cyan-400" />
            <span>Agent Communication Matrix (Message Count)</span>
          </h4>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] text-slate-400">
                  <th className="p-2.5 font-medium">From \ To</th>
                  {analysis.uniqueAgents.map((agent) => (
                    <th key={agent} className="p-2.5 font-medium text-center">
                      {agent}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analysis.uniqueAgents.map((fromAgent) => (
                  <tr key={fromAgent} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-semibold text-slate-300 bg-slate-900/40">
                      {fromAgent}
                    </td>
                    {analysis.uniqueAgents.map((toAgent) => {
                      const count = analysis.communicationMatrix[fromAgent]?.[toAgent] || 0;
                      const isHigh = count >= 3;
                      return (
                        <td
                          key={toAgent}
                          className={`p-2.5 text-center font-mono font-medium ${
                            count === 0
                              ? "text-slate-600"
                              : isHigh
                              ? "bg-rose-950/70 text-rose-300 font-bold"
                              : "text-cyan-300"
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
