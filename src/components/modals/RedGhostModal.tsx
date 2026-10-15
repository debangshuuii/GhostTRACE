"use client";

import React, { useState, useEffect } from "react";
import { TraceRunData } from "@/lib/types";
import {
  runRedGhostSimulation,
  generateSarifReport,
  RedGhostReport,
  AttackProbeResult,
  ThreatVectorId,
} from "@/lib/red-ghost-engine";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Copy,
  Check,
  Download,
  Terminal,
  Lock,
  Ghost,
  Cpu,
  FileCode2,
  Sparkles,
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  Bug,
} from "lucide-react";

interface RedGhostModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: TraceRunData | null;
}

export function RedGhostModal({ isOpen, onClose, trace }: RedGhostModalProps) {
  const [intensity, setIntensity] = useState<"quick" | "deep" | "hardened">("deep");
  const [report, setReport] = useState<RedGhostReport | null>(null);
  const [selectedProbeIndex, setSelectedProbeIndex] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "VETOED" | "VULNERABLE">("ALL");
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [copiedSarif, setCopiedSarif] = useState(false);

  // Initialize report on open or trace change
  useEffect(() => {
    if (isOpen) {
      const generated = runRedGhostSimulation(trace, intensity);
      setReport(generated);
      setSelectedProbeIndex(0);
    }
  }, [isOpen, trace, intensity]);

  if (!isOpen || !report) return null;

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const newReport = runRedGhostSimulation(trace, intensity);
      setReport(newReport);
      setSelectedProbeIndex(0);
      setIsSimulating(false);
    }, 700);
  };

  const filteredProbes = report.probes.filter((p) => {
    if (filter === "CRITICAL") return p.severity === "CRITICAL";
    if (filter === "VETOED") return p.status === "VETOED_BY_CRITIC";
    if (filter === "VULNERABLE") return p.status === "VULNERABLE" || p.status === "PARTIAL_LEAK";
    return true;
  });

  const selectedProbe: AttackProbeResult | undefined =
    filteredProbes[selectedProbeIndex] || filteredProbes[0] || report.probes[0];

  const copyPatch = () => {
    if (!selectedProbe) return;
    navigator.clipboard.writeText(selectedProbe.remediationPatch.code);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  const downloadSarif = () => {
    const sarifJson = generateSarifReport(report);
    const blob = new Blob([sarifJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `red_ghost_${report.traceId}_sarif.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdownReport = () => {
    const md = `# Red-Ghost Autonomous Adversarial Audit Report
**Trace**: ${report.traceTitle} (${report.traceId})
**Generated**: ${report.timestamp}
**Defense Readiness Index (DRI)**: ${report.driScore}/100 [Grade ${report.grade}]
**Blast Radius**: ${report.blastRadius}
**Probes**: ${report.totalProbes} Total | ${report.blockedCount} Blocked | ${report.vetoedCount} Critic Vetoes | ${report.vulnerableCount} Vulnerable

---
## Executive Summary
${report.summaryAnalysis}

---
## Attack Probe Results
${report.probes
  .map(
    (p, idx) => `### Probe #${idx + 1}: ${p.name} [${p.status}]
- **Threat Vector**: ${p.vectorId}
- **Severity**: ${p.severity}
- **Defense Mechanism**: ${p.defenseMechanism}
- **Target Step**: Step #${p.targetNodeStep || 1} (${p.targetNodeLabel || "Step"})
- **Attack Payload**:
\`\`\`
${p.probePayload}
\`\`\`
- **Remediation**: ${p.remediationPatch.title} (${p.remediationPatch.type})
\`\`\`
${p.remediationPatch.code}
\`\`\`
`
  )
  .join("\n\n")}
`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `red_ghost_audit_${report.traceId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[90vh] max-h-[880px] bg-[#070a14] border border-rose-500/40 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.2)] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-950/60 bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.35)]">
              <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <span>RED-GHOST</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-800 font-mono font-semibold uppercase tracking-wider">
                    Adversarial Red-Teaming &amp; Jailbreak Simulator
                  </span>
                </h2>
              </div>
              <p className="text-xs text-rose-200/70 mt-0.5">
                Autonomous stress-testing across OWASP Agentic AI threat vectors, delimiter escapes &amp; tool tampering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Intensity Toggle */}
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => setIntensity("quick")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  intensity === "quick"
                    ? "bg-rose-950 text-rose-300 font-bold border border-rose-700/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Quick
              </button>
              <button
                onClick={() => setIntensity("deep")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  intensity === "deep"
                    ? "bg-rose-950 text-rose-300 font-bold border border-rose-700/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Deep
              </button>
              <button
                onClick={() => setIntensity("hardened")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  intensity === "hardened"
                    ? "bg-purple-950 text-purple-300 font-bold border border-purple-700/60"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Hardened
              </button>
            </div>

            {/* Run Probes Button */}
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              <span>{isSimulating ? "Probing..." : "Re-Run Probes"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top KPI Bar */}
        <div className="grid grid-cols-5 gap-3 p-4 border-b border-slate-800 bg-[#090d1a]">
          {/* DRI Score Card */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                Defense Readiness Index
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={`text-2xl font-black font-mono ${
                  report.driScore >= 90
                    ? "text-emerald-400"
                    : report.driScore >= 75
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}>
                  {report.driScore}/100
                </span>
                <span className="text-xs px-1.5 py-0.2 rounded bg-slate-800 font-mono font-bold text-slate-300 border border-slate-700">
                  Grade {report.grade}
                </span>
              </div>
            </div>
            <ShieldCheck className={`w-7 h-7 ${
              report.driScore >= 90 ? "text-emerald-400" : "text-amber-400"
            }`} />
          </div>

          {/* Blocked Attacks */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">
              Defenses Held
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
              {report.blockedCount} <span className="text-xs text-slate-400 font-normal">/ {report.totalProbes}</span>
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-0.5">Direct boundary protection</div>
          </div>

          {/* Critic Pruning Vetoes */}
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60">
            <div className="text-[10px] uppercase font-mono text-purple-300 font-bold flex items-center gap-1">
              <Ghost className="w-3 h-3 text-purple-400" />
              <span>Ghost Critic Vetoes</span>
            </div>
            <div className="text-xl font-bold font-mono text-purple-200 mt-0.5">
              {report.vetoedCount}
            </div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">Pruned before disk write</div>
          </div>

          {/* Vulnerable Gaps */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-rose-400 font-bold">
              Vulnerabilities
            </div>
            <div className="text-xl font-bold font-mono text-rose-300 mt-0.5">
              {report.vulnerableCount + report.partialCount}
            </div>
            <div className="text-[10px] text-rose-400/80 mt-0.5">
              {report.criticalVulnerabilities} Critical severity
            </div>
          </div>

          {/* Blast Radius */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">
              Blast Radius
            </div>
            <div className={`text-base font-bold font-mono mt-1 ${
              report.blastRadius === "MINIMAL"
                ? "text-emerald-400"
                : report.blastRadius === "CONTAINED"
                ? "text-cyan-400"
                : "text-rose-400"
            }`}>
              {report.blastRadius}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sandbox isolation verified</div>
          </div>
        </div>

        {/* Main Content Area (Split Left/Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Probes List & Filters */}
          <div className="w-[380px] border-r border-slate-800 flex flex-col bg-[#050811]">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-3 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
              <button
                onClick={() => setFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === "ALL"
                    ? "bg-slate-800 text-slate-100 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({report.probes.length})
              </button>
              <button
                onClick={() => setFilter("CRITICAL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === "CRITICAL"
                    ? "bg-rose-950 text-rose-300 font-bold border border-rose-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setFilter("VETOED")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === "VETOED"
                    ? "bg-purple-950 text-purple-300 font-bold border border-purple-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Vetoed ({report.vetoedCount})
              </button>
              <button
                onClick={() => setFilter("VULNERABLE")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filter === "VULNERABLE"
                    ? "bg-amber-950 text-amber-300 font-bold border border-amber-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Gaps ({report.vulnerableCount + report.partialCount})
              </button>
            </div>

            {/* Probes List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredProbes.map((probe, idx) => {
                const isSelected = selectedProbe?.id === probe.id;
                return (
                  <button
                    key={probe.id}
                    onClick={() => setSelectedProbeIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      isSelected
                        ? "bg-slate-800/90 border border-rose-500/60 shadow-md"
                        : "bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400 truncate">
                        {probe.vectorId.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                          probe.status === "BLOCKED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : probe.status === "VETOED_BY_CRITIC"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : probe.status === "PARTIAL_LEAK"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {probe.status === "VETOED_BY_CRITIC" ? "CRITIC VETO" : probe.status}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                      {probe.name}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Step #{probe.targetNodeStep || 1}</span>
                      <span
                        className={`font-semibold ${
                          probe.severity === "CRITICAL"
                            ? "text-rose-400"
                            : probe.severity === "HIGH"
                            ? "text-amber-400"
                            : "text-slate-400"
                        }`}
                      >
                        {probe.severity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep-Dive Probe Inspector */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5 bg-[#070b16]">
            {selectedProbe ? (
              <>
                {/* Probe Header */}
                <div className="space-y-1.5 pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                        {selectedProbe.vectorId.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs font-mono text-slate-400">
                        Target: Step #{selectedProbe.targetNodeStep} ({selectedProbe.targetNodeLabel})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                        Severity: {selectedProbe.severity}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                          selectedProbe.status === "BLOCKED"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : selectedProbe.status === "VETOED_BY_CRITIC"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        Verdict: {selectedProbe.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100">{selectedProbe.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {selectedProbe.description}
                  </p>
                </div>

                {/* Adversarial Probe Attack Payload Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Synthetic Adversarial Probe Payload</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Injected to evaluate guardrail resilience
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-black/60 border border-rose-950 text-xs font-mono text-rose-200 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                    {selectedProbe.probePayload}
                  </pre>
                </div>

                {/* Agent Interception & Defense Mechanism */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-semibold">
                    <span className="text-cyan-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Interception &amp; Defense Mechanism</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {selectedProbe.defenseMechanism}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedProbe.agentResponseSnippet}
                  </p>
                </div>

                {/* Automated Guardrail Remediation Patch */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Automated Guardrail Remediation Patch</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                          {selectedProbe.remediationPatch.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedProbe.remediationPatch.description}
                      </p>
                    </div>

                    <button
                      onClick={copyPatch}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-mono transition-colors"
                    >
                      {copiedPatch ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Patch!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Defense Code</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-950 border border-emerald-900/50 text-xs font-mono text-emerald-200 overflow-x-auto leading-relaxed shadow-inner">
                    {selectedProbe.remediationPatch.code}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs font-mono">
                No probe selected. Choose an attack vector from the left sidebar.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#090d1a] text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>Trace: {report.traceTitle}</span>
            <span>•</span>
            <span className="text-slate-300">Audited {report.totalProbes} adversarial attack vectors</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSarif}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs transition-colors"
              title="Download SARIF report for GitHub Advanced Security / GitLab SAST"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export SARIF (CI/CD)</span>
            </button>

            <button
              onClick={downloadMarkdownReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs transition-colors"
              title="Download Markdown Executive Security Audit"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export Markdown</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
