"use client";

import React, { useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import { detectTraceAnomalies, AnomalyReport } from "@/lib/anomaly-detector";
import {
  X,
  AlertTriangle,
  Flame,
  Zap,
  Ghost,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface AnomalyDriftModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

export function AnomalyDriftModal({
  isOpen,
  onClose,
  trace,
}: AnomalyDriftModalProps) {
  const report: AnomalyReport = useMemo(() => {
    return detectTraceAnomalies(trace);
  }, [trace]);

  if (!isOpen || !trace) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[680px] max-w-full bg-[#0a0f1d] border border-rose-900/60 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Real-Time Anomaly &amp; Cost Drift Guard</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                  report.severity === "CRITICAL"
                    ? "bg-rose-950 text-rose-300 border border-rose-700"
                    : report.severity === "HIGH"
                    ? "bg-amber-950 text-amber-300 border border-amber-700"
                    : "bg-yellow-950 text-yellow-300 border border-yellow-700"
                }`}
              >
                {report.severity} SEVERITY
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditing trace: <span className="text-cyan-300 font-mono">{trace.title}</span>
            </p>
          </div>
        </div>

        {/* Anomaly List */}
        {report.hasAnomaly ? (
          <div className="space-y-3 mb-6">
            {report.anomalies.map((a, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {a.type === "LATENCY_SPIKE" && <Clock className="w-4 h-4 text-amber-400" />}
                    {a.type === "TOKEN_SURGE" && <Zap className="w-4 h-4 text-yellow-400" />}
                    {a.type === "HIGH_GHOST_RATIO" && <Ghost className="w-4 h-4 text-purple-400" />}
                    <span className="text-xs font-bold text-slate-200">{a.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-rose-400 font-semibold">{a.metric}</span>
                    <span className="text-slate-500">(Threshold: {a.threshold})</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{a.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-600/40 text-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-emerald-300">Within Safe Operational Baselines</h3>
            <p className="text-xs text-slate-400 mt-1">
              No latency spikes, token surges, or anomalous hallucination pruning detected.
            </p>
          </div>
        )}

        {/* Automated Mitigation Recommendations */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Production Mitigation</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>
              Enforce a strict <code className="text-purple-300 font-mono">max_tokens=2048</code> cap on non-reasoning agent turns.
            </li>
            <li>
              Inject an iterative loop constraint: <code className="text-amber-300 font-mono">&quot;Halt after 2 consecutive critic vetoes&quot;</code>.
            </li>
            <li>
              Route long-running tool executions to background sandboxes to prevent latency SLA degradation.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
