"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import { sciFiAudio } from "@/lib/ghost-voice-engine";
import {
  Search,
  Command,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  Ghost,
  Radio,
  Crosshair,
  ShieldAlert,
  Play,
  Database,
  Key,
  Scale,
  FlaskConical,
  Server,
  Clock,
  Network,
  Bell,
  Palette,
  Terminal,
  Activity,
  Check,
  CornerDownLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Coins,
  Orbit,
} from "lucide-react";

export interface CommandItem {
  id: string;
  category: "action" | "trace" | "node" | "ghost";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  selectedTrace: TraceRunData | null;
  onSelectTrace: (traceId: string) => void;
  onSelectNode: (node: TraceNodeData | null) => void;
  actions: {
    openMissionControl: () => void;
    openRedGhost: () => void;
    openStudio: () => void;
    openStorage: () => void;
    openAuthRbac: () => void;
    openCacheOptimizer: () => void;
    openGalaxy: () => void;
    openDpo: () => void;
    openEvals: () => void;
    openRegressionSuite: () => void;
    openMcp: () => void;
    openWaterfall: () => void;
    openSwarm: () => void;
    openKeys: () => void;
    openAlerts: () => void;
    openGuardrails: () => void;
    openAnalytics: () => void;
    cycleTheme: () => void;
    reloadSeed: () => void;
  };
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  traces,
  selectedTrace,
  onSelectTrace,
  onSelectNode,
  actions,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<"ALL" | "ACTIONS" | "TRACES" | "STEPS" | "GHOSTS">("ALL");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      try {
        sciFiAudio.playStepChime();
      } catch {}
    }
  }, [isOpen]);

  // Build searchable items catalogue
  const allItems: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // 1. Core Quick Actions
    list.push(
      {
        id: "cmd-mission-control",
        category: "action",
        title: "Launch Mission Control SOC Wall",
        subtitle: "Full-screen high-density telemetry deck with analog tachometers & audio",
        badge: "Ctrl+M",
        badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-700",
        icon: <Crosshair className="w-4 h-4 text-cyan-400" />,
        onSelect: () => actions.openMissionControl(),
        keywords: ["soc", "nasa", "twitch", "mission", "telemetry", "dials", "speedometer"],
      },
      {
        id: "cmd-red-ghost",
        category: "action",
        title: "Simulate Red-Ghost Adversarial Attack",
        subtitle: "Autonomous jailbreak simulator testing blue guardrail policy defenses",
        badge: "SECURITY",
        badgeColor: "bg-rose-950 text-rose-300 border-rose-700",
        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        onSelect: () => actions.openRedGhost(),
        keywords: ["red", "ghost", "adversary", "jailbreak", "attack", "redteam", "security"],
      },
      {
        id: "cmd-live-studio",
        category: "action",
        title: "Open Live Agent Execution Studio",
        subtitle: "Run sandbox agent loops with DeepSeek-R1, Claude 3.7, GPT-4o, or Ollama",
        badge: "SANDBOX",
        badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-700",
        icon: <Play className="w-4 h-4 text-emerald-400" />,
        onSelect: () => actions.openStudio(),
        keywords: ["studio", "live", "sandbox", "mcts", "run", "execute", "agent"],
      },
      {
        id: "cmd-storage",
        category: "action",
        title: "Cluster Storage & ClickHouse / TimescaleDB Adapters",
        subtitle: "Switch columnar engines, run schema DDL, and benchmark 100M+ span throughput",
        badge: "STORAGE",
        badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-700",
        icon: <Database className="w-4 h-4 text-cyan-400" />,
        onSelect: () => actions.openStorage(),
        keywords: ["clickhouse", "timescaledb", "sqlite", "prisma", "storage", "database", "cluster", "benchmark"],
      },
      {
        id: "cmd-auth-rbac",
        category: "action",
        title: "Cloud Multi-Tenant Auth & RBAC",
        subtitle: "Manage GitHub/Google OAuth identities, team members, and role permissions",
        badge: "AUTH",
        badgeColor: "bg-purple-950 text-purple-300 border-purple-700",
        icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
        onSelect: () => actions.openAuthRbac(),
        keywords: ["auth", "rbac", "oauth", "github", "google", "members", "team", "roles"],
      },
      {
        id: "cmd-cost-slasher",
        category: "action",
        title: "Prompt Caching & Token Cost Slasher",
        subtitle: "Anthropic Ephemeral & OpenAI Prefix Caching Simulator with Live Fleet ROI Calculator",
        badge: "-90% TOKENS",
        badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-700",
        icon: <Coins className="w-4 h-4 text-emerald-400" />,
        onSelect: () => actions.openCacheOptimizer(),
        keywords: ["cache", "caching", "cost", "tokens", "budget", "anthropic", "ephemeral", "savings", "slasher"],
      },
      {
        id: "cmd-embedding-galaxy",
        category: "action",
        title: "Launch Semantic Embedding Galaxy (t-SNE / PCA)",
        subtitle: "High-dimensional visual error clustering across agent thoughts and pruned ghost branches",
        badge: "GALAXY",
        badgeColor: "bg-purple-950 text-purple-300 border-purple-700",
        icon: <Orbit className="w-4 h-4 text-purple-400" />,
        onSelect: () => actions.openGalaxy(),
        keywords: ["galaxy", "embedding", "tsne", "pca", "umap", "cluster", "vector", "atlas", "stars"],
      },
      {
        id: "cmd-dpo-export",
        category: "action",
        title: "Export DPO & Fine-Tuning Dataset",
        subtitle: "Generate HuggingFace TRL & OpenAI format from Chosen vs Pruned Ghost pairs",
        badge: "RLHF",
        badgeColor: "bg-purple-950 text-purple-300 border-purple-700",
        icon: <Database className="w-4 h-4 text-purple-400" />,
        onSelect: () => actions.openDpo(),
        keywords: ["dpo", "rlhf", "export", "fine-tuning", "huggingface", "trl", "dataset"],
      },
      {
        id: "cmd-judge-evals",
        category: "action",
        title: "LLM-as-a-Judge Automated Benchmark",
        subtitle: "Fleet-wide comparative scoring on faithfulness, safety adherence, and cost",
        badge: "EVALS",
        badgeColor: "bg-amber-950 text-amber-300 border-amber-700",
        icon: <Scale className="w-4 h-4 text-amber-400" />,
        onSelect: () => actions.openEvals(),
        keywords: ["evals", "judge", "benchmark", "leaderboard", "scoring", "faithfulness"],
      },
      {
        id: "cmd-regression-suite",
        category: "action",
        title: "Ghost-to-Test Continuous Regression Suite",
        subtitle: "Export golden Pytest & Vitest regression suites with GitHub Actions CI/CD YAML",
        badge: "CI/CD",
        badgeColor: "bg-purple-950 text-purple-300 border-purple-700",
        icon: <FlaskConical className="w-4 h-4 text-purple-400" />,
        onSelect: () => actions.openRegressionSuite(),
        keywords: ["regression", "test", "pytest", "vitest", "ci", "cd", "golden"],
      },
      {
        id: "cmd-mcp-hub",
        category: "action",
        title: "Model Context Protocol (MCP) Control Plane",
        subtitle: "Inspect Anthropic MCP servers, validate JSON-RPC frames, and execute tools",
        badge: "MCP",
        badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-700",
        icon: <Server className="w-4 h-4 text-cyan-400" />,
        onSelect: () => actions.openMcp(),
        keywords: ["mcp", "protocol", "anthropic", "rpc", "tools", "servers"],
      },
      {
        id: "cmd-waterfall",
        category: "action",
        title: "Gantt Waterfall Latency Profiler",
        subtitle: "Interactive execution timeline pinpointing parallel subagent bottlenecks",
        badge: "PROFILER",
        badgeColor: "bg-sky-950 text-sky-300 border-sky-700",
        icon: <Clock className="w-4 h-4 text-sky-400" />,
        onSelect: () => actions.openWaterfall(),
        keywords: ["waterfall", "gantt", "latency", "timeline", "duration", "profiler"],
      },
      {
        id: "cmd-swarm-matrix",
        category: "action",
        title: "Swarm A2A Matrix & Loop Circuit-Breaker",
        subtitle: "Chronological agent sequence diagram and infinite ping-pong loop detector",
        badge: "SWARM",
        badgeColor: "bg-indigo-950 text-indigo-300 border-indigo-700",
        icon: <Network className="w-4 h-4 text-indigo-400" />,
        onSelect: () => actions.openSwarm(),
        keywords: ["swarm", "matrix", "sequence", "circuit-breaker", "loop", "ping-pong"],
      },
      {
        id: "cmd-guardrails",
        category: "action",
        title: "Manage Safety Policies & Guardrails",
        subtitle: "Configure destructive command, credential leak, and token spike vetoes",
        badge: "SHIELD",
        badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-700",
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        onSelect: () => actions.openGuardrails(),
        keywords: ["guardrails", "safety", "policies", "rules", "destructive", "rm -rf"],
      },
      {
        id: "cmd-cycle-theme",
        category: "action",
        title: "Cycle Visual Theme",
        subtitle: "Toggle between Cyber Blue, Obsidian Minimalist, and White Audit Paper",
        badge: "THEME",
        badgeColor: "bg-amber-950 text-amber-300 border-amber-700",
        icon: <Palette className="w-4 h-4 text-amber-400" />,
        onSelect: () => actions.cycleTheme(),
        keywords: ["theme", "cyber", "obsidian", "paper", "dark", "light"],
      },
      {
        id: "cmd-reload-seed",
        category: "action",
        title: "Reset Demo Trace Database",
        subtitle: "Re-seeds SQLite with rich multi-agent traces and pruned ghost branches",
        badge: "SEED",
        badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
        icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
        onSelect: () => actions.reloadSeed(),
        keywords: ["seed", "reset", "demo", "reload", "restore"],
      }
    );

    // 2. All Available Traces
    traces.forEach((t) => {
      list.push({
        id: `trace-${t.id}`,
        category: "trace",
        title: t.title,
        subtitle: `Agent: ${t.agentName} • Model: ${t.model} • ${t.ghostBranchCount} Ghost Branches • ${t.totalTokens.toLocaleString()} tokens`,
        badge: t.model,
        badgeColor: "bg-slate-800 text-cyan-300 border-slate-700",
        icon: <Layers className="w-4 h-4 text-indigo-400" />,
        onSelect: () => {
          onSelectTrace(t.id);
          onSelectNode(null);
        },
        keywords: [t.title, t.agentName, t.model, ...(t.tags || [])],
      });
    });

    // 3. Nodes & Steps in Active Trace
    if (selectedTrace?.nodes) {
      selectedTrace.nodes.forEach((n) => {
        const isGhost = n.isGhost || n.type === "GHOST_REJECTED";
        const contentSnippet = (n.content || "").slice(0, 120);

        list.push({
          id: `node-${n.id || n.nodeId}`,
          category: isGhost ? "ghost" : "node",
          title: `Step #${n.stepIndex}: ${n.label}`,
          subtitle: isGhost
            ? `Veto Rationale: ${n.ghostReason || "Pruned counterfactual path"}`
            : contentSnippet,
          badge: isGhost ? "PRUNED GHOST" : n.type,
          badgeColor: isGhost
            ? "bg-rose-950 text-rose-300 border-rose-800"
            : "bg-slate-800 text-slate-300 border-slate-700",
          icon: isGhost ? (
            <Ghost className="w-4 h-4 text-purple-400" />
          ) : (
            <Terminal className="w-4 h-4 text-cyan-400" />
          ),
          onSelect: () => {
            onSelectNode(n);
          },
          keywords: [
            n.label,
            n.type,
            n.content,
            n.ghostReason || "",
            `step ${n.stepIndex}`,
            `step #${n.stepIndex}`,
          ],
        });
      });
    }

    return list;
  }, [traces, selectedTrace, actions, onSelectTrace, onSelectNode]);

  // Fuzzy filter based on user query and active category
  const filteredItems = useMemo(() => {
    let base = allItems;
    if (activeCategory === "ACTIONS") base = base.filter((i) => i.category === "action");
    if (activeCategory === "TRACES") base = base.filter((i) => i.category === "trace");
    if (activeCategory === "STEPS") base = base.filter((i) => i.category === "node");
    if (activeCategory === "GHOSTS") base = base.filter((i) => i.category === "ghost");

    if (!query.trim()) return base.slice(0, 40);

    const q = query.toLowerCase().trim();
    return base
      .filter((item) => {
        if (item.title.toLowerCase().includes(q)) return true;
        if (item.subtitle && item.subtitle.toLowerCase().includes(q)) return true;
        if (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q))) return true;
        return false;
      })
      .slice(0, 40);
  }, [allItems, query, activeCategory]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Global Keydown navigation (ArrowUp, ArrowDown, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
        try {
          sciFiAudio.playCyberClick();
        } catch {}
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
        try {
          sciFiAudio.playCyberClick();
        } catch {}
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) {
          try {
            sciFiAudio.playSuccessChime();
          } catch {}
          item.onSelect();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#090e1c] border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden ring-1 ring-cyan-500/30">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-[#060a14]">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search traces, or inspect node steps..."
            className="flex-1 bg-transparent text-sm font-sans text-slate-100 placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-800/80 bg-[#080d1a] flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
          {(["ALL", "ACTIONS", "TRACES", "STEPS", "GHOSTS"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full font-bold transition-all ${
                activeCategory === cat
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/30">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Command className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              <div>No matching commands, traces, or steps found for "{query}".</div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/30"
                      : "bg-transparent border-transparent hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg border shrink-0 ${
                        item.category === "ghost"
                          ? "bg-purple-950/80 border-purple-500/60 text-purple-400"
                          : item.category === "action"
                          ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-400"
                          : item.category === "trace"
                          ? "bg-indigo-950/80 border-indigo-500/60 text-indigo-400"
                          : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                              item.badgeColor || "bg-slate-800 text-slate-400 border-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && (
                      <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-mono font-bold">
                        <span>SELECT</span>
                        <CornerDownLeft className="w-2.5 h-2.5" />
                      </kbd>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-[#060a14] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">↓</kbd> to navigate
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">↵</kbd> to select
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>{filteredItems.length} results</span>
          </div>
        </div>
      </div>
    </div>
  );
}
