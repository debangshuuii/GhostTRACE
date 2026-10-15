"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  Ghost,
  ShieldAlert,
  Key,
  Sliders,
  Cpu,
  Globe,
  Server,
} from "lucide-react";

interface LiveAgentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTraceCreated: (traceId: string) => void;
}

export function LiveAgentStudioModal({
  isOpen,
  onClose,
  onTraceCreated,
}: LiveAgentStudioModalProps) {
  const [prompt, setPrompt] = useState(
    "Scan auth_handler.ts for cryptographic timing side channels and apply constant-time patch."
  );
  const [provider, setProvider] = useState<"simulator" | "openai" | "gemini" | "ollama">("simulator");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("deepseek-r1-distill");
  const [criticSensitivity, setCriticSensitivity] = useState("Strict");
  const [executionMode, setExecutionMode] = useState<"best_of_n" | "standard">("best_of_n");
  const [running, setRunning] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  // Load saved credentials from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(`gt_studio_key_${provider}`) || "";
      const savedBase = localStorage.getItem(`gt_studio_base_${provider}`) || "";
      setApiKey(savedKey);
      if (savedBase) setBaseUrl(savedBase);
      else if (provider === "ollama") setBaseUrl("http://localhost:11434");
      else setBaseUrl("");
    }
  }, [provider]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: "simulator" | "openai" | "gemini" | "ollama") => {
    setProvider(newProvider);
    if (newProvider === "openai") setModel("gpt-4o-mini");
    else if (newProvider === "gemini") setModel("gemini-1.5-flash");
    else if (newProvider === "ollama") {
      setModel("llama3");
      setBaseUrl("http://localhost:11434");
    } else {
      setModel("deepseek-r1-distill");
    }
  };

  const handleRunAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setRunning(true);
      setProgressStatus(`Starting ${provider.toUpperCase()} reasoning loop...`);

      // Persist credentials
      if (apiKey && typeof window !== "undefined") {
        localStorage.setItem(`gt_studio_key_${provider}`, apiKey);
      }
      if (baseUrl && typeof window !== "undefined") {
        localStorage.setItem(`gt_studio_base_${provider}`, baseUrl);
      }

      const res = await fetch("/api/studio/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          provider,
          apiKey: apiKey.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
          model,
          criticSensitivity,
          executionMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Agent execution failed");
      }

      const data = await res.json();
      setProgressStatus("Agent execution complete! Broadcasting live to canvas...");

      setTimeout(() => {
        if (data.traceId) {
          onTraceCreated(data.traceId);
        }
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Live execution error:", err);
      setProgressStatus(`Error: ${err.message || "Failed to execute agent run."}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[660px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>Live Agent Execution Studio</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono">
                SSE LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Run live multi-step agent reasoning with real-time sandbox tools and dynamic Critic pruning.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunAgent} className="space-y-4">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reasoning Engine Provider
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange("simulator")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  provider === "simulator"
                    ? "bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Cpu className="w-4 h-4 mb-1" />
                <span className="text-xs font-semibold">Simulator</span>
                <span className="text-[9px] text-slate-400">Zero-Cost CoT</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("openai")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  provider === "openai"
                    ? "bg-purple-950/80 border-purple-500 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-purple-400" />
                <span className="text-xs font-semibold">OpenAI</span>
                <span className="text-[9px] text-slate-400">GPT-4o</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  provider === "gemini"
                    ? "bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Globe className="w-4 h-4 mb-1 text-indigo-400" />
                <span className="text-xs font-semibold">Gemini</span>
                <span className="text-[9px] text-slate-400">Google 1.5/2.5</span>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange("ollama")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  provider === "ollama"
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Server className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="text-xs font-semibold">Ollama</span>
                <span className="text-[9px] text-slate-400">Local Daemon</span>
              </button>
            </div>
          </div>

          {/* Real API Key or Base URL input (if not simulator) */}
          {provider !== "simulator" && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              {provider !== "ollama" ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{provider.toUpperCase()} API Key</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Paste your ${provider.toUpperCase()} API key...`}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ollama Host Endpoint</span>
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}
            </div>
          )}

          {/* Execution Topology Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Execution Topology</span>
              <span className="text-[10px] font-mono text-purple-400 font-semibold">Ghost Engine 2.0</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExecutionMode("best_of_n")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  executionMode === "best_of_n"
                    ? "bg-purple-950/60 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-300">
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                  <span>MCTS Best-of-3 Speculation</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Generates 3 speculative hypotheses in parallel, auto-pruning 2 suboptimal paths into Ghost Branches.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExecutionMode("standard")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  executionMode === "standard"
                    ? "bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-cyan-300">
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Standard Direct ReAct Loop</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Single-trunk linear agent execution loop with reactive tool invocation.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Objective / Prompt Directive
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter task objective for the autonomous agent..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Model Runtime Tag
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o, deepseek-r1-distill, llama3"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Critic Guardrail Sensitivity
              </label>
              <select
                value={criticSensitivity}
                onChange={(e) => setCriticSensitivity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Strict">Strict (Zero-Trust Critic Vetoes)</option>
                <option value="Balanced">Balanced (Standard Guardrails)</option>
                <option value="Permissive">Permissive (Fewer Prunes)</option>
              </select>
            </div>
          </div>

          {/* Progress / Status indicator */}
          {progressStatus && (
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 text-xs flex items-center gap-2 text-cyan-300">
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="font-mono text-[11px]">{progressStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400">
              Live updates broadcast directly to <code className="text-cyan-400">ReactFlow Canvas</code>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={running}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                {running ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Run Agent &amp; Watch Live</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
