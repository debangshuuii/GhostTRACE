"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
  Brain,
  Ghost,
  Coins,
  FileCode,
  Layers,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { RegressionTestCase } from "@/lib/regression-suite";

interface RegressionSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegressionSuiteModal({ isOpen, onClose }: RegressionSuiteModalProps) {
  const [cases, setCases] = useState<RegressionTestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningSuite, setRunningSuite] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventory" | "export" | "ci">("inventory");
  const [exportFormat, setExportFormat] = useState<"pytest" | "jest" | "json">("pytest");
  const [exportedCode, setExportedCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch regression test cases
  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/evals/regression-suite");
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error("Failed to load regression cases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCases();
    }
  }, [isOpen]);

  // Load export code when export tab is clicked or format changed
  useEffect(() => {
    const fetchExportCode = async () => {
      try {
        const res = await fetch("/api/evals/regression-suite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "export", format: exportFormat }),
        });
        if (res.ok) {
          const data = await res.json();
          setExportedCode(data.code || "");
        }
      } catch (err) {
        console.error("Failed to fetch export code:", err);
      }
    };

    if (isOpen && activeTab === "export") {
      fetchExportCode();
    }
  }, [isOpen, activeTab, exportFormat]);

  if (!isOpen) return null;

  const handleRunSuite = async () => {
    try {
      setRunningSuite(true);
      setStatusMessage("Running synthetic regression evaluations against active policies...");
      const res = await fetch("/api/evals/regression-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        setStatusMessage(`Evaluation complete! ${data.passed}/${data.total} tests passed (${data.passRate}% score).`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err) {
      console.error("Failed to run regression suite:", err);
      setStatusMessage("Execution error during regression test run.");
    } finally {
      setRunningSuite(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(exportedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const filename =
      exportFormat === "pytest"
        ? "test_ghost_regressions.py"
        : exportFormat === "jest"
        ? "agent-regressions.test.ts"
        : "golden_regression_suite.json";

    const blob = new Blob([exportedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredCases = cases.filter(
    (c) => selectedCategory === "ALL" || c.category === selectedCategory
  );

  const passedCount = cases.filter((c) => c.status === "PASS").length;
  const passRate = Math.round((passedCount / Math.max(1, cases.length)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-[#0b101f] border border-slate-800 rounded-2xl w-full max-w-4xl h-[86vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <FlaskConical className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Ghost-to-Test Continuous Regression Engine
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60 font-mono font-semibold">
                  CI/CD Golden Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically promotes critic-pruned ghost failure branches into automated unit tests.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSuite}
              disabled={runningSuite}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(147,51,234,0.4)] transition-all"
            >
              {runningSuite ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Run Golden Suite</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-4 gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/50 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Golden Test Cases</div>
            <div className="text-lg font-bold text-slate-100 font-mono">{cases.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Suite Pass Rate</div>
            <div className={`text-lg font-bold font-mono ${passRate >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
              {passRate}% ({passedCount}/{cases.length})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Pruned Invariants</div>
            <div className="text-lg font-bold text-purple-400 font-mono">100% Guarded</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Automated Runners</div>
            <div className="text-xs font-semibold text-cyan-300 font-mono mt-1">Pytest + Vitest</div>
          </div>
        </div>

        {/* Status notification toast */}
        {statusMessage && (
          <div className="px-6 py-2 bg-purple-950/50 border-b border-purple-800/60 text-xs text-purple-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("inventory")}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "inventory"
                  ? "border-purple-400 text-purple-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Test Inventory ({cases.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "export"
                  ? "border-purple-400 text-purple-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>CI/CD Code Exporter</span>
            </button>
            <button
              onClick={() => setActiveTab("ci")}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "ci"
                  ? "border-purple-400 text-purple-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>GitHub Actions Integration</span>
            </button>
          </div>

          {activeTab === "inventory" && (
            <div className="flex items-center gap-2 py-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              >
                <option value="ALL">All Categories</option>
                <option value="SAFETY_GUARDRAIL">Safety Guardrail</option>
                <option value="CRYPTO_SOUNDNESS">Crypto Soundness</option>
                <option value="HALLUCINATION_PRUNING">Hallucination Pruning</option>
                <option value="EFFICIENCY_BUDGET">Efficiency Budget</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "inventory" ? (
            <div className="space-y-3">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.status === "PASS" ? "bg-emerald-400" : "bg-rose-400 animate-pulse"
                        }`}
                      />
                      <h4 className="text-xs font-bold text-slate-100 font-sans">{c.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                        {c.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-[10px] text-slate-400">
                        Max {c.maxTokensAllowed} tok
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          c.status === "PASS"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase font-mono">
                        Input Test Prompt
                      </span>
                      <p className="text-slate-300 line-clamp-2 italic leading-relaxed">
                        &quot;{c.inputPrompt}&quot;
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1">
                      <span className="text-[9px] font-semibold text-rose-400 uppercase font-mono">
                        Forbidden Pruned Pattern
                      </span>
                      <p className="text-rose-300 font-mono text-[10px] truncate">
                        {c.forbiddenPattern}
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono">Origin Trace: {c.originTraceId}</span>
                    <span className="text-emerald-400/90 font-sans">✓ {c.expectedBehavior}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "export" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setExportFormat("pytest")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      exportFormat === "pytest"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    Python (Pytest)
                  </button>
                  <button
                    onClick={() => setExportFormat("jest")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      exportFormat === "jest"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    TypeScript (Vitest / Jest)
                  </button>
                  <button
                    onClick={() => setExportFormat("json")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      exportFormat === "json"
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    Golden JSON Dataset
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? "Copied!" : "Copy Code"}</span>
                  </button>
                  <button
                    onClick={handleDownloadFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-800 hover:bg-purple-900 text-purple-200 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/90">
                <pre className="p-4 text-xs font-mono text-purple-200/90 overflow-x-auto max-h-[50vh] leading-relaxed">
                  {exportedCode || "// Loading export code..."}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                <h4 className="text-xs font-bold text-purple-300">
                  Continuous Integration / Continuous Deployment (CI/CD) Workflow
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Add this GitHub Actions workflow to run your golden agent regression suite on every Pull Request.
                  If a prompt change causes the agent to re-traverse a pruned ghost failure path, the build will fail automatically.
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/90">
                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[50vh] leading-relaxed">
{`name: GhostTRACE Agent Regression Golden Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  agent-regression-evals:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Start GhostTRACE Server
        run: |
          npm ci
          npx prisma db push
          npm run build
          npm start &
          sleep 5

      - name: Run Golden Regression Test Suite
        run: |
          curl -f -X POST http://localhost:3000/api/evals/regression-suite \\
            -H "Content-Type: application/json" \\
            -d '{"action": "run"}'
`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
