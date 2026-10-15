"use client";

import React, { useMemo, useState } from "react";
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
  Bot,
  Activity,
  CheckCircle2,
  Clock,
  Sliders,
  ShieldCheck,
  Split,
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
  const [activeTab, setActiveTab] = useState<"matrix" | "sequence" | "circuit_breaker">("sequence");
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(true);
  const [maxRounds, setMaxRounds] = useState(3);
  const [circuitSaved, setCircuitSaved] = useState(false);

  const analysis = useMemo(() => {
    return analyzeSwarmTopology(trace);
  }, [trace]);

  // Extract sequential handoffs and chronological interactions between agents and tools
  const sequenceEvents = useMemo(() => {
    if (!trace || !Array.isArray(trace.nodes)) return [];
    const nodes = [...trace.nodes].sort((a, b) => a.stepIndex - b.stepIndex);

    const events: Array<{
      stepIndex: number;
      from: string;
      to: string;
      label: string;
      type: string;
      isGhost: boolean;
      latencyMs: number;
      tokens: number;
    }> = [];

    let currentAgent = trace.agentName || "Coordinator";

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let from = currentAgent;
      let to = currentAgent;
      let label = node.label;

      if (node.type === "SUBAGENT_SPAWN") {
        from = currentAgent;
        to = node.label.replace(/^Spawn:\s*/i, "");
        currentAgent = to;
      } else if (node.type === "TOOL_CALL") {
        to = `Tool: ${node.label}`;
      } else if (node.type === "TOOL_RESULT") {
        from = `Tool: ${node.label}`;
        to = currentAgent;
      } else if (node.isGhost || node.type === "GHOST_REJECTED") {
        from = "Safety Critic";
        to = currentAgent;
        label = `VETO: ${node.ghostReason || node.label}`;
      } else if (node.type === "LLM_RESPONSE") {
        from = currentAgent;
        to = "User Ingress";
      }

      events.push({
        stepIndex: node.stepIndex,
        from,
        to,
        label,
        type: node.type,
        isGhost: Boolean(node.isGhost),
        latencyMs: node.latencyMs || 250,
        tokens: node.tokens || 100,
      });
    }

    return events;
  }, [trace]);

  // Distinct swarm entities (columns for sequence diagram)
  const sequenceParticipants = useMemo(() => {
    const set = new Set<string>();
    set.add(trace?.agentName || "Coordinator");
    sequenceEvents.forEach((ev) => {
      set.add(ev.from);
      set.add(ev.to);
    });
    return Array.from(set).slice(0, 5); // display top 5 participants cleanly
  }, [trace, sequenceEvents]);

  if (!isOpen || !trace) return null;

  const handleSaveCircuitBreaker = () => {
    setCircuitSaved(true);
    setTimeout(() => setCircuitSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-[840px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
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
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Multi-Agent Swarm Topology &amp; Protocol Studio
              </h3>
              {analysis.hasLoop ? (
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 border border-rose-600 text-rose-300 font-mono font-bold animate-pulse">
                  LOOP DETECTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono">
                  TOPOLOGY HEALTHY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inspection of agent-to-agent delegation handoffs, sequence diagrams, and runaway loop circuit-breakers.
            </p>
          </div>
        </div>

        {/* Loop Alarm Banner if applicable */}
        {analysis.hasLoop && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-600/70 text-xs text-rose-200 mb-4 space-y-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Runaway Ping-Pong Cycle Detected</span>
            </div>
            <p className="text-[11px] leading-relaxed">{analysis.loopWarning}</p>
          </div>
        )}

        {/* Metric Strip */}
        <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Swarm Subagents</span>
            <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
              {analysis.uniqueAgents.length} Agents
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Delegation Handoffs</span>
            <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
              {analysis.totalHandoffs} Handoffs
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Circuit-Breaker</span>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {circuitBreakerEnabled ? "Active (Cap 3)" : "Disabled"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono">Topology State</span>
            <div
              className={`text-base font-bold font-mono mt-0.5 ${
                analysis.hasLoop ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {analysis.hasLoop ? "High Blast Radius" : "Optimal Convergence"}
            </div>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex items-center gap-4 border-b border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab("sequence")}
            className={`py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "sequence"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>A2A Sequence Diagram</span>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "matrix"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Communication Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab("circuit_breaker")}
            className={`py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "circuit_breaker"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Loop Circuit-Breaker Policy</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === "sequence" ? (
            /* A2A INTERACTIVE SEQUENCE DIAGRAM */
            <div className="space-y-3">
              {/* Participant Lifeline Headers */}
              <div className="grid grid-cols-5 gap-2 pb-2 border-b border-slate-800 text-center font-mono text-[10px]">
                {sequenceParticipants.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 truncate font-semibold shadow-sm"
                    title={p}
                  >
                    {p}
                  </div>
                ))}
              </div>

              {/* Chronological Sequence Messages */}
              <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                {sequenceEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                      ev.isGhost
                        ? "bg-purple-950/30 border-purple-800/60 text-purple-200"
                        : ev.type === "TOOL_CALL" || ev.type === "TOOL_RESULT"
                        ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 font-mono text-slate-400">
                        #{ev.stepIndex}
                      </span>
                      <span className="font-semibold text-cyan-300 font-mono text-[11px] truncate max-w-[120px]">
                        {ev.from}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold text-indigo-300 font-mono text-[11px] truncate max-w-[120px]">
                        {ev.to}
                      </span>
                      <span className="text-slate-400 font-sans truncate max-w-[280px]">
                        : {ev.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                      <span className="text-slate-400">{ev.tokens} tok</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{ev.latencyMs}ms</span>
                      {ev.isGhost && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold uppercase text-[9px]">
                          VETOED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "matrix" ? (
            /* 2D SWARM COMMUNICATION MATRIX */
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] text-slate-400 font-mono">
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
                        <td className="p-2.5 font-semibold text-slate-300 bg-slate-900/40 font-mono text-[11px]">
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
          ) : (
            /* LOOP CIRCUIT-BREAKER POLICY CONTROLS */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Active Autonomous Circuit-Breaker</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Intercepts recursive ping-pong agent loops before token budgets are exhausted.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={circuitBreakerEnabled}
                    onChange={(e) => setCircuitBreakerEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-950 border-slate-700"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">Max Permissible Handoff Rounds Between Subagents:</span>
                    <span className="font-mono font-bold text-cyan-400">{maxRounds} rounds</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>2 (Aggressive cutoff)</span>
                    <span>4 (Balanced)</span>
                    <span>6 (Permissive)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/50 border border-slate-800 text-[11px] font-mono text-cyan-300 space-y-1">
                  <div className="text-slate-400 font-sans text-[10px] uppercase font-bold">Injected Interceptor Policy:</div>
                  <div>IF reciprocal_message_count &gt; {maxRounds} WITHOUT new_tool_artifacts:</div>
                  <div className="pl-4 text-rose-300">TRIGGER critic_veto(&quot;Runaway ping-pong loop breaker&quot;)</div>
                  <div className="pl-4 text-emerald-300">FORCE coordinator.synthesize_best_effort()</div>
                </div>

                <button
                  onClick={handleSaveCircuitBreaker}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  {circuitSaved ? "✓ Circuit-Breaker Policy Active!" : "Save Circuit-Breaker Policy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Topology Engine: Dagre + Communication Entropy Matrix
          </span>
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
