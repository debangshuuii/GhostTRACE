"use client";

import React, { useState, useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import {
  extractDpoPairsFromTrace,
  formatPairsAsJsonl,
  formatPairsAsHuggingFaceTrl,
  formatPairsAsOpenAi,
  formatPairsAsCsv,
  DpoPair,
} from "@/lib/dpo-exporter";
import {
  X,
  Database,
  Download,
  Copy,
  Check,
  Ghost,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Layers,
} from "lucide-react";

interface DpoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  currentTrace: TraceRunData | null;
}

export function DpoExportModal({
  isOpen,
  onClose,
  traces,
  currentTrace,
}: DpoExportModalProps) {
  const [scope, setScope] = useState<"current" | "all">("current");
  const [format, setFormat] = useState<"jsonl" | "hf_trl" | "openai" | "csv">("jsonl");
  const [copied, setCopied] = useState(false);

  const pairs: DpoPair[] = useMemo(() => {
    if (!isOpen) return [];
    if (scope === "current") {
      if (!currentTrace) return [];
      return extractDpoPairsFromTrace(currentTrace);
    }
    return (traces || []).flatMap((t) => (t ? extractDpoPairsFromTrace(t) : []));
  }, [isOpen, scope, currentTrace, traces]);

  if (!isOpen) return null;

  const getFormattedData = () => {
    switch (format) {
      case "hf_trl":
        return formatPairsAsHuggingFaceTrl(pairs);
      case "openai":
        return formatPairsAsOpenAi(pairs);
      case "csv":
        return formatPairsAsCsv(pairs);
      case "jsonl":
      default:
        return formatPairsAsJsonl(pairs);
    }
  };

  const formattedData = getFormattedData();

  const handleDownload = () => {
    const isCsv = format === "csv";
    const mimeType = isCsv ? "text/csv" : "application/x-jsonlines";
    const extension = isCsv ? "csv" : "jsonl";

    const blob = new Blob([formattedData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghosttrace_${format}_dataset_${scope}_${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[880px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-purple-950/70 border border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              DPO / RLHF Preference Dataset Exporter
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                HF &amp; OpenAI Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Export verified &quot;Chosen vs. Rejected (Ghost)&quot; pairs for model fine-tuning (Hugging Face TRL / Unsloth / Axolotl).
            </p>
          </div>
        </div>

        {/* Format & Scope Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4 text-xs">
          {/* Format Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Format:</span>
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setFormat("jsonl")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === "jsonl"
                    ? "bg-purple-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Standard DPO JSON Lines"
              >
                Standard DPO
              </button>
              <button
                onClick={() => setFormat("hf_trl")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === "hf_trl"
                    ? "bg-purple-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Hugging Face TRL (DPOTrainer / ORPOTrainer)"
              >
                Hugging Face TRL
              </button>
              <button
                onClick={() => setFormat("openai")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === "openai"
                    ? "bg-purple-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="OpenAI Preference Format"
              >
                OpenAI Preference
              </button>
              <button
                onClick={() => setFormat("csv")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  format === "csv"
                    ? "bg-purple-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="CSV for Pandas and Excel"
              >
                CSV
              </button>
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Scope:</span>
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setScope("current")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scope === "current"
                    ? "bg-cyan-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Current Trace ({currentTrace?.ghostBranchCount || 0})
              </button>
              <button
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scope === "all"
                    ? "bg-cyan-600 text-white font-medium"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Fleet ({traces.reduce((acc, t) => acc + (t.ghostBranchCount || 0), 0)})
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={pairs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-all shadow-[0_0_12px_rgba(6,182,212,0.35)] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{format === "csv" ? "csv" : "jsonl"}</span>
            </button>
          </div>
        </div>

        {/* Pairs List Preview */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {pairs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No rejected ghost branches found in selected scope to build preference pairs.
            </div>
          ) : (
            pairs.map((pair, idx) => (
              <div
                key={pair.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Pair #{idx + 1} • {pair.traceTitle}</span>
                  <span className="text-cyan-400">{pair.metadata.model}</span>
                </div>

                <div className="text-xs text-slate-300 font-medium bg-black/40 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 font-mono block text-[10px] uppercase">
                    PROMPT
                  </span>
                  {pair.prompt}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* CHOSEN */}
                  <div className="rounded-lg p-3 bg-emerald-950/20 border border-emerald-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CHOSEN (PREFERRED)</span>
                    </div>
                    <p className="text-[11px] text-slate-200 line-clamp-3 leading-relaxed font-sans">
                      {pair.chosen.content}
                    </p>
                  </div>

                  {/* REJECTED GHOST */}
                  <div className="rounded-lg p-3 bg-purple-950/20 border border-purple-800/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[11px]">
                      <Ghost className="w-3.5 h-3.5" />
                      <span>REJECTED (GHOST BRANCH)</span>
                    </div>
                    <p className="text-[11px] text-purple-200/90 line-clamp-2 leading-relaxed font-sans italic">
                      {pair.rejected.content}
                    </p>
                    {pair.rejected.ghostReason && (
                      <div className="text-[10px] text-rose-300/90 font-mono truncate pt-1 border-t border-purple-900/40">
                        Veto: {pair.rejected.ghostReason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
