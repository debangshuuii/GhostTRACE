"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { TraceRunData } from "@/lib/types";
import {
  Ghost,
  Activity,
  Upload,
  Download,
  RotateCw,
  Cpu,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  Search,
  GitCompare,
  ShieldCheck,
  Globe,
  Terminal,
  FileCode,
  Database,
  Lightbulb,
  Play,
  Sun,
  Moon,
  Palette,
  Scale,
  Key,
  Building2,
  Network,
  AlertTriangle,
  Bell,
  FlaskConical,
  Server,
  ShieldAlert,
} from "lucide-react";
import { detectTraceAnomalies } from "@/lib/anomaly-detector";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  environment: string;
}

interface TraceHeaderProps {
  traces: TraceRunData[];
  selectedTrace: TraceRunData | null;
  onSelectTrace: (traceId: string) => void;
  workspaces?: WorkspaceItem[];
  selectedWorkspaceId?: string;
  onSelectWorkspace?: (workspaceId: string) => void;
  onOpenUpload: () => void;
  onOpenAnalytics: () => void;
  onOpenDiff: () => void;
  onOpenGuardrails: () => void;
  onOpenRedGhost?: () => void;
  onOpenFleet: () => void;
  onOpenSdk: () => void;
  onOpenDpo: () => void;
  onOpenOptimizer: () => void;
  onOpenStudio: () => void;
  onOpenEvals?: () => void;
  onOpenRegressionSuite?: () => void;
  onOpenMcp?: () => void;
  onOpenKeys?: () => void;
  onOpenWaterfall?: () => void;
  onOpenSwarmTopology?: () => void;
  onOpenBreakpointIntervention?: () => void;
  onOpenAnomalyModal?: () => void;
  onOpenAlerts?: () => void;
  isPhantomAiOpen?: boolean;
  onTogglePhantomAi?: () => void;
  onReloadSeed: () => void;
  isSeeding?: boolean;
  isLiveConnected?: boolean;
}

export function TraceHeader({
  traces,
  selectedTrace,
  onSelectTrace,
  workspaces = [],
  selectedWorkspaceId,
  onSelectWorkspace,
  onOpenUpload,
  onOpenAnalytics,
  onOpenDiff,
  onOpenGuardrails,
  onOpenRedGhost,
  onOpenFleet,
  onOpenSdk,
  onOpenDpo,
  onOpenOptimizer,
  onOpenStudio,
  onOpenEvals,
  onOpenRegressionSuite,
  onOpenMcp,
  onOpenKeys,
  onOpenWaterfall,
  onOpenSwarmTopology,
  onOpenBreakpointIntervention,
  onOpenAnomalyModal,
  onOpenAlerts,
  isPhantomAiOpen = false,
  onTogglePhantomAi,
  onReloadSeed,
  isSeeding = false,
  isLiveConnected = false,
}: TraceHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [theme, setTheme] = useState<"cyber" | "obsidian" | "paper">("cyber");

  const cycleTheme = () => {
    const nextTheme = theme === "cyber" ? "obsidian" : theme === "obsidian" ? "paper" : "cyber";
    setTheme(nextTheme);
    document.body.classList.remove("theme-obsidian", "theme-paper");
    if (nextTheme === "obsidian") document.body.classList.add("theme-obsidian");
    if (nextTheme === "paper") document.body.classList.add("theme-paper");
  };

  // Export current trace as ZIP archive bundle
  const handleExportZip = async () => {
    if (!selectedTrace) return;
    try {
      setExporting(true);
      const zip = new JSZip();

      zip.file(`trace_${selectedTrace.id}.json`, JSON.stringify(selectedTrace, null, 2));

      const reportMarkdown = `# GhostTRACE Execution Audit Report
**Title**: ${selectedTrace.title}
**Agent**: ${selectedTrace.agentName}
**Model**: ${selectedTrace.model}
**Status**: ${selectedTrace.status}
**Total Tokens**: ${selectedTrace.totalTokens} (Reasoning: ${selectedTrace.reasoningTokens})
**Duration**: ${selectedTrace.durationMs}ms
**Ghost Branches Pruned**: ${selectedTrace.ghostBranchCount}

---
## Execution Steps Summary
${(selectedTrace.nodes || [])
  .map(
    (n) =>
      `### Step ${n.stepIndex}: ${n.label} [${n.isGhost ? "GHOST - PRUNED" : n.type}]
- **Latency**: ${n.latencyMs}ms | **Tokens**: ${n.tokens}
${n.isGhost ? `- **Rejection Reason**: ${n.ghostReason || "Pruned alternative"}` : ""}
${n.content}`
  )
  .join("\n\n")}
`;

      zip.file("AUDIT_REPORT.md", reportMarkdown);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghosttrace_${selectedTrace.id}_bundle.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // Export standalone single-file interactive HTML report
  const handleExportHtml = () => {
    if (!selectedTrace) return;
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GhostTRACE Report: ${selectedTrace.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #080d19; color: #f1f5f9; padding: 24px; margin: 0; }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 700; color: #38bdf8; }
    .meta { font-size: 13px; color: #94a3b8; margin-top: 6px; }
    .kpi-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .kpi { background: #0f172a; border: 1px solid #334155; padding: 12px 18px; border-radius: 12px; min-width: 140px; }
    .kpi-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; }
    .kpi-value { font-size: 18px; font-weight: 700; color: #f8fafc; font-family: monospace; margin-top: 4px; }
    .ghost-kpi { border-color: rgba(168, 85, 247, 0.4); background: rgba(88, 28, 135, 0.2); }
    .steps { display: flex; flex-direction: column; gap: 14px; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; }
    .ghost-card { border: 2px dashed #c084fc; background: rgba(88, 28, 135, 0.25); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
    .step-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 8px; }
    .ghost-tag { background: #881337; color: #fda4af; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
    .critic-box { background: rgba(0,0,0,0.4); border: 1px solid rgba(244, 63, 94, 0.4); padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 12px; color: #fecdd3; }
    .content { font-size: 13px; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">👻 GhostTRACE Execution Audit: ${selectedTrace.title}</div>
    <div class="meta">Agent: <b>${selectedTrace.agentName}</b> | Model: <b>${selectedTrace.model}</b> | Generated: ${new Date().toLocaleString()}</div>
  </div>

  <div class="kpi-bar">
    <div class="kpi"><div class="kpi-title">Total Tokens</div><div class="kpi-value">${selectedTrace.totalTokens.toLocaleString()}</div></div>
    <div class="kpi"><div class="kpi-title">Reasoning Tokens</div><div class="kpi-value">${selectedTrace.reasoningTokens.toLocaleString()}</div></div>
    <div class="kpi ghost-kpi"><div class="kpi-title">Ghost Paths Pruned</div><div class="kpi-value" style="color:#c084fc;">${selectedTrace.ghostBranchCount}</div></div>
    <div class="kpi"><div class="kpi-title">Duration</div><div class="kpi-value">${(selectedTrace.durationMs / 1000).toFixed(2)}s</div></div>
    <div class="kpi"><div class="kpi-title">Cost Estimate</div><div class="kpi-value">$${selectedTrace.costEstimate.toFixed(4)}</div></div>
  </div>

  <h2>Step-by-Step Decision Transcript</h2>
  <div class="steps">
    ${(selectedTrace.nodes || [])
      .map(
        (n) => `
    <div class="card ${n.isGhost ? "ghost-card" : ""}">
      <div class="step-header">
        <div>Step #${n.stepIndex}: <b>${n.label}</b> [${n.type}]</div>
        ${n.isGhost ? '<span class="ghost-tag">PRUNED GHOST</span>' : `<span style="color:#64748b;">${n.latencyMs}ms | ${n.tokens} tok</span>`}
      </div>
      <div class="content">${n.content}</div>
      ${
        n.ghostReason
          ? `<div class="critic-box"><b>Critic Veto Rationale:</b> ${n.ghostReason}</div>`
          : ""
      }
    </div>`
      )
      .join("")}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghosttrace_${selectedTrace.id}_report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-16 w-full bg-[#080d19]/90 border-b border-slate-800/80 backdrop-blur-md px-5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Trace Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-950/70 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.35)]">
            <Ghost className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-300 to-indigo-400 text-base">
                GhostTRACE
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/50">
                PRO
              </span>
              {isLiveConnected && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  title="Real-time Server-Sent Events (SSE) feed connected"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Workspace Dropdown Selector */}
        {workspaces && workspaces.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                setWorkspaceDropdownOpen(!workspaceDropdownOpen);
                setDropdownOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors shadow-sm max-w-[170px]"
              title="Select Enterprise Workspace Environment"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">
                {workspaces.find((w) => w.id === selectedWorkspaceId)?.name || "All Workspaces"}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {workspaceDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-[#0c1222] border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800">
                  <span>Workspaces ({workspaces.length})</span>
                  <span className="text-[9px] text-purple-400 font-mono">ISOLATED</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  <button
                    onClick={() => {
                      onSelectWorkspace?.("");
                      setWorkspaceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-800/60 transition-colors flex items-center justify-between ${
                      !selectedWorkspaceId ? "bg-purple-950/40 text-purple-300 font-medium" : "text-slate-300"
                    }`}
                  >
                    <span className="text-xs">🌐 All Workspaces</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">GLOBAL</span>
                  </button>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        onSelectWorkspace?.(ws.id);
                        setWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-800/60 transition-colors flex items-center justify-between ${
                        selectedWorkspaceId === ws.id ? "bg-purple-950/40 text-purple-300" : "text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-medium truncate max-w-[160px]">{ws.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">/{ws.slug}</div>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                          ws.environment === "production"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : ws.environment === "staging"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-sky-950 text-sky-400 border border-sky-800"
                        }`}
                      >
                        {ws.environment}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trace Dropdown Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setWorkspaceDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors shadow-sm max-w-[210px]"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{selectedTrace ? selectedTrace.title : "Select Trace"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 rounded-xl bg-[#0c1222] border border-slate-700 shadow-2xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Available Traces ({traces.length})
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                {traces.map((trace) => (
                  <button
                    key={trace.id}
                    onClick={() => {
                      onSelectTrace(trace.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-800/60 transition-colors ${
                      selectedTrace?.id === trace.id ? "bg-cyan-950/30 text-cyan-300" : "text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-medium truncate">{trace.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                      <span>{trace.model}</span>
                      <span>•</span>
                      <span className="text-purple-400">
                        {trace.ghostBranchCount} ghost branches
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Live KPI Chips & Breakpoint Status */}
      <div className="flex items-center gap-2">
        {/* Real-time Drift Anomaly Badge */}
        {detectTraceAnomalies(selectedTrace).hasAnomaly && (
          <button
            onClick={onOpenAnomalyModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/70 text-rose-300 text-xs font-semibold animate-pulse hover:bg-rose-900 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            title="Operational Drift Anomaly Detected: Click to inspect"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{detectTraceAnomalies(selectedTrace).anomalies.length} DRIFT ALERTS</span>
          </button>
        )}

        {Boolean(selectedTrace?.isPaused || selectedTrace?.status === "PAUSED") && (
          <button
            onClick={onOpenBreakpointIntervention}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/80 text-amber-300 text-xs font-bold animate-pulse hover:bg-amber-500/30 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)]"
            title="Breakpoint Intercepted! Click to Resume, Override or Veto"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>HIT BREAKPOINT (INTERVENE)</span>
          </button>
        )}

        {selectedTrace && (
          <div className="hidden 2xl:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/40 border border-purple-500/40 text-purple-300 text-xs shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <Ghost className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span className="font-semibold">{selectedTrace.ghostBranchCount}</span>
              <span className="text-[11px] text-purple-300/80">Ghost Paths Pruned</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-slate-300 text-xs font-mono">
              <span>{selectedTrace.totalTokens.toLocaleString()} tok</span>
              <span className="text-indigo-400 text-[11px]">
                ({Math.round((selectedTrace.reasoningTokens / (selectedTrace.totalTokens || 1)) * 100)}% CoT)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Action Tools Bar */}
      <div className="flex items-center gap-1.5">
        {/* PhantomAI Interactive Copilot Button */}
        <button
          onClick={onTogglePhantomAi}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isPhantomAiOpen
              ? "bg-purple-950/90 text-purple-200 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-1 ring-purple-400"
              : "bg-slate-900/90 hover:bg-slate-800 text-purple-300 border-purple-800/60"
          }`}
          title="Toggle PhantomAI Interactive Copilot & Solution Engine"
        >
          <Ghost className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>PhantomAI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </button>

        {/* Live Studio Run Button */}
        <button
          onClick={onOpenStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)]"
          title="Run Live Agent Execution Studio"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Live Studio</span>
        </button>

        {/* AI Prompt Optimizer Advisor */}
        <button
          onClick={onOpenOptimizer}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-medium transition-colors"
          title="Analyze Ghost Branches & Optimize System Prompt"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Advisor</span>
        </button>

        {/* DPO / RLHF Dataset Exporter */}
        <button
          onClick={onOpenDpo}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-purple-300 border border-slate-700 text-xs font-medium transition-colors"
          title="Export Chosen vs Rejected DPO Training Pairs"
        >
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden xl:inline">DPO Pairs</span>
        </button>

        {/* A/B Diff Button */}
        <button
          onClick={onOpenDiff}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Compare Two Traces Side-by-Side"
        >
          <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">Diff A/B</span>
        </button>

        {/* Guardrails Button */}
        <button
          onClick={onOpenGuardrails}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Manage Safety Guardrails & Policies"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Guardrails</span>
        </button>

        {/* Red-Ghost Adversarial Red-Teaming & Jailbreak Simulator */}
        <button
          onClick={onOpenRedGhost}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border border-rose-500/80 text-xs font-semibold transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)]"
          title="Red-Ghost Autonomous Adversarial Red-Teaming & Jailbreak Simulator"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span className="hidden lg:inline">Red-Ghost</span>
        </button>

        {/* LLM-as-a-Judge Evals Button */}
        <button
          onClick={onOpenEvals}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-600/60 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          title="Automated Evals & LLM-as-a-Judge Benchmark"
        >
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Judge Evals</span>
        </button>

        {/* Ghost-to-Test Regression Suite Button */}
        <button
          onClick={onOpenRegressionSuite}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 border border-purple-600/60 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(168,85,247,0.25)]"
          title="Ghost-to-Test Continuous Regression Suite & Golden Dataset CI/CD"
        >
          <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden lg:inline">Regressions</span>
        </button>

        {/* Fleet Stats Button */}
        <button
          onClick={onOpenFleet}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Fleet-Wide Telemetry"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Fleet</span>
        </button>

        {/* Agent SDK Button */}
        <button
          onClick={onOpenSdk}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Python, LangGraph & Webhook SDK"
        >
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden lg:inline">SDK</span>
        </button>

        {/* MCP Protocol Control Plane Button */}
        <button
          onClick={onOpenMcp}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-slate-700 text-xs font-medium transition-colors"
          title="Model Context Protocol (MCP) Server Registry & Tools"
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">MCP Hub</span>
        </button>

        {/* API Keys Button */}
        <button
          onClick={onOpenKeys}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Manage API Keys & Ingestion Tokens"
        >
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">API Keys</span>
        </button>

        {/* Webhook Incident Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-700/60 text-xs font-semibold transition-all shadow-[0_0_10px_rgba(244,63,94,0.25)]"
          title="Configure Production Incident & Webhook Alerts (Slack / Discord)"
        >
          <Bell className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden xl:inline">Alerts</span>
        </button>

        {/* Waterfall Gantt Timeline Profiler */}
        <button
          onClick={onOpenWaterfall}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-600/60 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(14,165,233,0.25)]"
          title="Agent Gantt Waterfall Timeline & Latency Profiler"
        >
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden xl:inline">Waterfall</span>
        </button>

        {/* Swarm Infinite Loop & Topology Matrix */}
        <button
          onClick={onOpenSwarmTopology}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-600/60 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(99,102,241,0.25)]"
          title="Multi-Agent Loop Detector & Communication Matrix"
        >
          <Network className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Swarm Matrix</span>
        </button>

        {/* Telemetry Charts */}
        <button
          onClick={onOpenAnalytics}
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          title="Trace Telemetry Charts"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Standalone HTML Export */}
        <button
          onClick={handleExportHtml}
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
          title="Export Standalone HTML Report (Open anywhere)"
        >
          <FileCode className="w-3.5 h-3.5 text-sky-400" />
        </button>

        {/* Export ZIP */}
        <button
          onClick={handleExportZip}
          disabled={!selectedTrace || exporting}
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          title="Export ZIP Archive Bundle"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* Import Trace */}
        <button
          onClick={onOpenUpload}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 transition-colors"
          title="Import ZIP/JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={cycleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 border border-slate-800 transition-colors"
          title={`Cycle Theme (Current: ${theme.toUpperCase()})`}
        >
          <Palette className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Seed Reset */}
        <button
          onClick={onReloadSeed}
          disabled={isSeeding}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
          title="Reset Demo Traces"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>
    </header>
  );
}
