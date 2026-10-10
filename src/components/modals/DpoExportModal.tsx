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
  Globe,
  Code2,
  Loader2,
  ExternalLink,
  Key,
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
  const [activeTab, setActiveTab] = useState<"preview" | "hf_push" | "unsloth_recipe">("preview");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [format, setFormat] = useState<"jsonl" | "hf_trl" | "openai" | "csv">("hf_trl");
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Hugging Face Hub Push State
  const [hfToken, setHfToken] = useState("");
  const [hfRepoId, setHfRepoId] = useState("");
  const [isHfPrivate, setIsHfPrivate] = useState(false);
  const [hfPushing, setHfPushing] = useState(false);
  const [hfSuccessUrl, setHfSuccessUrl] = useState<string | null>(null);
  const [hfError, setHfError] = useState<string | null>(null);

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

  const handleHfPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfToken.trim() || !hfRepoId.trim()) return;

    try {
      setHfPushing(true);
      setHfError(null);
      setHfSuccessUrl(null);

      const res = await fetch("/api/export/huggingface", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hfToken,
          repoId: hfRepoId,
          pairsJsonl: formattedData,
          filename: "train.jsonl",
          isPrivate: isHfPrivate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish dataset");
      }

      setHfSuccessUrl(data.datasetUrl);
    } catch (err: any) {
      setHfError(err.message || "Failed to publish dataset");
    } finally {
      setHfPushing(false);
    }
  };

  const unslothScript = `# ==============================================================================
# GhostTRACE Auto-Generated DPO Fine-Tuning Recipe
# Model: Llama-3.1-8B-Instruct (4-bit QLoRA) via Unsloth & Hugging Face TRL
# Dataset: Ghost-Pruned Preference Pairs (${pairs.length} pairs)
# ==============================================================================

import torch
from unsloth import FastLanguageModel, PatchDPOTrainer
from trl import DPOTrainer, DPOConfig
from datasets import load_dataset

PatchDPOTrainer()

max_seq_length = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit",
    max_seq_length=max_seq_length,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    random_state=3407,
)

# Load the GhostTRACE exported HuggingFace TRL dataset
# Required format: {"prompt": "...", "chosen": "...", "rejected": "..."}
dataset = load_dataset("json", data_files="dataset.jsonl")

dpo_trainer = DPOTrainer(
    model=model,
    ref_model=None,
    args=DPOConfig(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_ratio=0.1,
        num_train_epochs=3,
        learning_rate=5e-6,
        logging_steps=1,
        optim="adamw_8bit",
        seed=42,
        output_dir="ghosttrace_aligned_model",
    ),
    beta=0.1,
    train_dataset=dataset["train"],
    tokenizer=tokenizer,
    max_length=max_seq_length,
    max_prompt_length=512,
)

print("Starting DPO training to eliminate Ghost branch failure paths...")
dpo_trainer.train()

# Save final merged 16-bit model
model.save_pretrained_merged("ghosttrace_aligned_final", tokenizer, save_method="merged_16bit")
print("Training complete! Model saved to ghosttrace_aligned_final.")
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(unslothScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[900px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
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
              <span>DPO / RLHF Preference Exporter &amp; Fine-Tuner</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                Hub &amp; Unsloth
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Export verified &quot;Chosen vs. Rejected (Ghost)&quot; pairs directly to Hugging Face Hub or train locally with Unsloth.
            </p>
          </div>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 mb-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === "preview"
                ? "bg-purple-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            1. Preference Pairs ({pairs.length})
          </button>
          <button
            onClick={() => setActiveTab("hf_push")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "hf_push"
                ? "bg-amber-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. Push to Hugging Face Hub</span>
          </button>
          <button
            onClick={() => setActiveTab("unsloth_recipe")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "unsloth_recipe"
                ? "bg-emerald-600 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>3. Unsloth Fine-Tuning Script</span>
          </button>
        </div>

        {activeTab === "preview" && (
          <>
            {/* Format & Scope Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4 text-xs">
              {/* Format Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Format:</span>
                <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    onClick={() => setFormat("hf_trl")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      format === "hf_trl"
                        ? "bg-purple-600 text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
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
                  >
                    OpenAI
                  </button>
                  <button
                    onClick={() => setFormat("jsonl")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      format === "jsonl"
                        ? "bg-purple-600 text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Standard DPO
                  </button>
                  <button
                    onClick={() => setFormat("csv")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      format === "csv"
                        ? "bg-purple-600 text-white font-medium"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
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
          </>
        )}

        {activeTab === "hf_push" && (
          <form onSubmit={handleHfPush} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/50 text-xs text-amber-200">
              Publish your curated GhostTRACE preference dataset directly to Hugging Face Hub with zero external dependencies.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hugging Face Access Token (Write Scope)</span>
                </label>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Dataset Repository ID
                </label>
                <input
                  type="text"
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value)}
                  placeholder="username/ghosttrace-reasoning-dpo"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hfPrivate"
                  checked={isHfPrivate}
                  onChange={(e) => setIsHfPrivate(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500"
                />
                <label htmlFor="hfPrivate" className="text-xs text-slate-300">
                  Make dataset repository private on Hugging Face Hub
                </label>
              </div>
            </div>

            {hfError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {hfError}
              </div>
            )}

            {hfSuccessUrl && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/70 text-xs text-emerald-200 flex items-center justify-between">
                <span>Dataset published successfully!</span>
                <a
                  href={hfSuccessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition-colors"
                >
                  <span>View on Hugging Face</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={hfPushing || !hfToken || !hfRepoId}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              {hfPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>{hfPushing ? "Publishing to Hub..." : "Publish Dataset to Hugging Face Hub"}</span>
            </button>
          </form>
        )}

        {activeTab === "unsloth_recipe" && (
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Ready-to-run DPO Fine-Tuning script using <code className="text-emerald-400">Unsloth</code> &amp; <code className="text-cyan-400">TRL</code>:
              </span>
              <button
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Script Copied!" : "Copy Python Script"}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/60 rounded-xl border border-slate-800 p-4 font-mono text-xs text-slate-200">
              <pre>{unslothScript}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
