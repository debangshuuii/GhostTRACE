"use client";

import React, { useState, useEffect } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import {
  analyzeRootCause,
  generateIncidentPostMortemMarkdown,
  RcaReport,
} from "@/lib/rca-engine";
import { sanitizePiiText } from "@/lib/pii-sanitizer";
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Flame,
  Clock,
  Coins,
  Cpu,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface RcaPostMortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
  selectedNode?: TraceNodeData | null;
}

export function RcaPostMortemModal({
  isOpen,
  onClose,
  trace,
  selectedNode,
}: RcaPostMortemModalProps) {
  const [report, setReport] = useState<RcaReport | null>(null);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  useEffect(() => {
    if (isOpen && trace) {
      const rca = analyzeRootCause(trace, selectedNode?.nodeId || null);
      setReport(rca);
    }
  }, [isOpen, trace, selectedNode]);

  if (!isOpen || !trace || !report) return null;

  const copyPatch = () => {
    navigator.clipboard.writeText(report.remediation.codeSnippet);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const copyMarkdown = () => {
    const rawMd = generateIncidentPostMortemMarkdown(report);
    const md = sanitizePiiText(rawMd).sanitized;
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const downloadMarkdown = () => {
    const rawMd = generateIncidentPostMortemMarkdown(report);
    const md = sanitizePiiText(rawMd).sanitized;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rca_postmortem_${report.traceId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = () => {
    switch (report.severity) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      default:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-amber-500/30 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Autonomous Root Cause Analysis (RCA)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase ${getSeverityBadge()}`}
                >
                  {report.severity}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {report.failureMode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated causal deconstruction and incident post-mortem for{" "}
                <span className="text-amber-300 font-mono font-medium">
                  {report.traceTitle}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-all cursor-pointer"
              title="Copy Markdown Report"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied MD</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy MD</span>
                </>
              )}
            </button>

            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Post-Mortem</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/20 space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Incident Root Cause Summary
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed">
              {report.rootCauseSummary}
            </p>
            <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="text-slate-300 font-medium">Impact Assessment: </span>
              {report.impactAssessment}
            </div>
          </div>

          {/* Blast Radius Metrics Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Failed Terminal Step
              </span>
              <span className="text-base font-bold text-amber-400 font-mono mt-1">
                Step #{report.failedStepIndex}
              </span>
              <span className="text-[11px] text-slate-500 truncate mt-0.5">
                {report.failedNodeLabel}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Wasted Token Burn
              </span>
              <span className="text-base font-bold text-rose-400 font-mono mt-1">
                {report.blastRadius.wastedTokens.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Reasoning tokens
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Wasted Cost (Est.)
              </span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-1">
                ${report.blastRadius.wastedCostEstimate.toFixed(5)}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                At model standard rate
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                Pruned Ghost Branches
              </span>
              <span className="text-base font-bold text-purple-400 font-mono mt-1">
                {report.blastRadius.prunedBranchCount}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Quarantined paths
              </span>
            </div>
          </div>

          {/* Causal Chain Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" /> Causal Failure
              Timeline
            </h4>

            <div className="space-y-2.5">
              {report.causalChain.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                    item.role === "ROOT_CAUSE"
                      ? "bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                      : item.role === "TRIGGER"
                      ? "bg-slate-950/60 border-cyan-500/30"
                      : "bg-slate-950/40 border-slate-800"
                  }`}
                >
                  <div
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                      item.role === "ROOT_CAUSE"
                        ? "bg-rose-500 text-slate-950"
                        : item.role === "TRIGGER"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    Step #{item.stepIndex}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-200">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                        {item.type}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold ml-auto ${
                          item.role === "ROOT_CAUSE"
                            ? "text-rose-400"
                            : item.role === "TRIGGER"
                            ? "text-cyan-400"
                            : "text-slate-400"
                        }`}
                      >
                        [{item.role}]
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Remediation Blueprint */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Automated Remediation Blueprint: {report.remediation.title}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {report.remediation.explanation}
                </p>
              </div>

              <button
                onClick={copyPatch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedPatch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Patch</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Patch</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-lg bg-black/90 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{report.remediation.codeSnippet}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
