"use client";

import React, { useState, useRef } from "react";
import JSZip from "jszip";
import { X, Upload, FileArchive, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { MOCK_TRACES } from "@/lib/mock-traces";

interface TraceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newTraceId?: string) => void;
}

export function TraceUploadModal({ isOpen, onClose, onUploadSuccess }: TraceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.endsWith(".zip") || selected.name.endsWith(".json")) {
        setFile(selected);
        setError(null);
      } else {
        setError("Please select a .zip or .json file");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.name.endsWith(".zip") || dropped.name.endsWith(".json")) {
        setFile(dropped);
        setError(null);
      } else {
        setError("Please drop a .zip or .json file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/traces/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload trace");
      }

      setSuccess(true);
      setTimeout(() => {
        onUploadSuccess(data.trace?.id);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  // Generate and download a sample ZIP archive so the user can test importing
  const downloadSampleZip = async () => {
    try {
      const zip = new JSZip();
      const sample = MOCK_TRACES[0];
      zip.file("trace.json", JSON.stringify(sample, null, 2));
      zip.file(
        "README.txt",
        "GhostTRACE Agent Execution Bundle\nModel: " +
          sample.model +
          "\nPruned Ghost Branches: " +
          sample.ghostBranchCount
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghosttrace_${sample.id}_sample.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate sample zip", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[520px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-400">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Import Trace Bundle (.zip / .json)
            </h3>
            <p className="text-xs text-slate-400">
              Ingest agent execution transcripts and phantom reasoning branches.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              file
                ? "border-emerald-500/60 bg-emerald-950/20"
                : "border-slate-700/80 hover:border-cyan-500/60 bg-slate-900/40 hover:bg-slate-900/70"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".zip,.json"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              {file ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-100 font-mono">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-medium text-slate-200">
                    Click to browse or drag and drop
                  </span>
                  <span className="text-xs text-slate-500">
                    Supports .ZIP (containing trace.json) or standalone .JSON
                  </span>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Trace imported successfully! Loading into inspector...</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={downloadSampleZip}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              Download Sample .ZIP Bundle
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Import &amp; Visualize</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
