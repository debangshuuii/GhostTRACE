"use client";

import React, { useState, useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import { DEFAULT_GUARDRAILS, GuardrailRule, auditTraceNodes } from "@/lib/guardrails";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Sliders,
  Filter,
} from "lucide-react";

interface GuardrailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
  onSelectNode?: (nodeId: string) => void;
}

export function GuardrailsModal({
  isOpen,
  onClose,
  trace,
  onSelectNode,
}: GuardrailsModalProps) {
  const [rules, setRules] = useState<GuardrailRule[]>(DEFAULT_GUARDRAILS);

  const violations = useMemo(() => {
    if (!trace || !Array.isArray(trace.nodes)) return [];
    return auditTraceNodes(trace.nodes, rules);
  }, [trace, rules]);

  if (!isOpen) return null;

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[720px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Agent Guardrails &amp; Safety Policy Engine
            </h3>
            <p className="text-xs text-slate-400">
              Enforce blast-radius thresholds, secret masking, and destructive command interception.
            </p>
          </div>
        </div>

        {/* Active Audit Status Banner */}
        <div
          className={`p-4 rounded-xl border mb-6 flex items-center justify-between ${
            violations.length === 0
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/30 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {violations.length === 0 ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
            )}
            <div>
              <div className="text-xs font-bold tracking-wide uppercase">
                {violations.length === 0 ? "All Guardrails Cleared" : `${violations.length} Policy Interceptions`}
              </div>
              <p className="text-[11px] opacity-80">
                {violations.length === 0
                  ? "Current trace nodes complied with all active safety and credential rules."
                  : "Ghost branches caught and neutralized non-compliant actions."}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-black/40 border border-current font-bold">
            {rules.filter((r) => r.enabled).length}/{rules.length} Policies Active
          </span>
        </div>

        {/* Violations List if any */}
        {violations.length > 0 && (
          <div className="mb-6 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
              Flagged Violations in Current Trace ({violations.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {violations.map((v, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (onSelectNode) {
                      onSelectNode(v.nodeId);
                      onClose();
                    }
                  }}
                  className="p-3 rounded-lg bg-black/50 border border-rose-900/50 hover:border-rose-500 cursor-pointer transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                        {v.severity}
                      </span>
                      <span className="text-xs font-medium text-slate-200">
                        Step #{v.stepIndex}: {v.nodeLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-300/80 font-sans">{v.reason}</p>
                  </div>
                  <span className="text-[10px] text-cyan-400 hover:underline shrink-0 mt-1">
                    Inspect Node →
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configurable Guardrail Policies */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Policy Rules Configuration
          </h4>

          <div className="space-y-2.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{rule.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        rule.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : rule.severity === "HIGH"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-blue-950 text-blue-300 border border-blue-800"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-5 mt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Save &amp; Close Policy Manager
          </button>
        </div>
      </div>
    </div>
  );
}
