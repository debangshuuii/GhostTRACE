"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Edit3,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Bot,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { TraceNodeData } from "@/lib/types";

interface BreakpointInterventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceId: string | null;
  node: TraceNodeData | null;
  onInterventionComplete: () => void;
}

export function BreakpointInterventionModal({
  isOpen,
  onClose,
  traceId,
  node,
  onInterventionComplete,
}: BreakpointInterventionModalProps) {
  const [activeTab, setActiveTab] = useState<"resume" | "override" | "veto">("resume");
  const [overrideText, setOverrideText] = useState(node?.content || "");
  const [vetoReason, setVetoReason] = useState(
    "Human Operator Safety Intercept: Prohibiting dangerous or misaligned hypothesis."
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !node || !traceId) return null;

  const handleIntervene = async (action: "RESUME" | "OVERRIDE" | "VETO") => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/traces/${traceId}/intervene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          nodeId: node.nodeId,
          overrideInput: action === "OVERRIDE" ? overrideText : undefined,
          vetoReason: action === "VETO" ? vetoReason : undefined,
        }),
      });

      if (res.ok) {
        onInterventionComplete();
        onClose();
      }
    } catch (err) {
      console.error("Failed to submit intervention:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-[620px] max-w-full bg-[#0d1222] border-2 border-amber-500/80 rounded-2xl p-6 shadow-[0_0_35px_rgba(245,158,11,0.3)] relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/70 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Human-in-the-Loop Breakpoint Intercept</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 border border-amber-600 text-amber-300 font-mono">
                PAUSED AT STEP {node.stepIndex}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              The autonomous agent paused before continuing. Review its proposed thought/action below.
            </p>
          </div>
        </div>

        {/* Current Node Inspection Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">{node.label}</span>
            <span className="font-mono text-[11px] text-cyan-400 uppercase">{node.type}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800/80 text-slate-300 font-mono text-xs max-h-36 overflow-y-auto whitespace-pre-wrap">
            {node.content}
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("resume")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "resume"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-600/60 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            1. Resume (Allow)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("override")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "override"
                ? "bg-sky-950 text-sky-300 border border-sky-600/60 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            2. Override Input
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("veto")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "veto"
                ? "bg-rose-950 text-rose-300 border border-rose-600/60 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3. Critic Veto (Prune Ghost)
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "resume" && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200 space-y-3 mb-5">
            <p>
              Allows the agent to execute this step with its current parameters. Execution will continue to subsequent reasoning steps automatically.
            </p>
            <button
              onClick={() => handleIntervene("RESUME")}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>Approve &amp; Resume Agent</span>
            </button>
          </div>
        )}

        {activeTab === "override" && (
          <div className="space-y-3 mb-5">
            <label className="block text-xs font-medium text-slate-300">
              Substitute Thought / Parameters
            </label>
            <textarea
              rows={3}
              value={overrideText}
              onChange={(e) => setOverrideText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono outline-none focus:border-sky-500"
              placeholder="Inject operator corrected thoughts or tool arguments..."
            />
            <button
              onClick={() => handleIntervene("OVERRIDE")}
              disabled={submitting || !overrideText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              <span>Apply Override &amp; Resume</span>
            </button>
          </div>
        )}

        {activeTab === "veto" && (
          <div className="space-y-3 mb-5">
            <label className="block text-xs font-medium text-rose-300">
              Critic Veto Justification
            </label>
            <textarea
              rows={2}
              value={vetoReason}
              onChange={(e) => setVetoReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-rose-900/60 text-xs text-rose-100 font-sans outline-none focus:border-rose-500"
              placeholder="Explain why this branch was rejected..."
            />
            <button
              onClick={() => handleIntervene("VETO")}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
              <span>Inject Human Veto &amp; Prune as Ghost</span>
            </button>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
}
