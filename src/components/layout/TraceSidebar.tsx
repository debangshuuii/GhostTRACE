"use client";

import React, { useState, useMemo } from "react";
import { TraceRunData } from "@/lib/types";
import {
  Search,
  Ghost,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Clock,
  MessageSquare,
  ChevronDown,
  AlertTriangle,
  ArrowUpDown,
  Coins,
  Cpu,
  CheckCircle2,
} from "lucide-react";

interface TraceSidebarProps {
  traces: TraceRunData[];
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
  onDeleteTrace: (traceId: string) => void;
  onOpenUpload: () => void;
}

export function TraceSidebar({
  traces,
  selectedTraceId,
  onSelectTrace,
  onDeleteTrace,
  onOpenUpload,
}: TraceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GHOSTS" | "ERRORS" | "COMPLETED">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "tokens" | "duration" | "cost" | "ghosts">("newest");
  const [viewMode, setViewMode] = useState<"traces" | "sessions">("traces");
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Dynamically discover all models present in current traces
  const dynamicModels = useMemo(() => {
    const set = new Set<string>();
    traces.forEach((t) => {
      if (t.model) set.add(t.model);
    });
    return ["all", ...Array.from(set)];
  }, [traces]);

  // Counts for status filters
  const ghostCountTotal = useMemo(() => traces.filter((t) => t.ghostBranchCount > 0).length, [traces]);
  const errorCountTotal = useMemo(
    () =>
      traces.filter(
        (t) =>
          t.status === "FAILED" ||
          (Array.isArray(t.nodes) && t.nodes.some((n) => n.status === "ERROR"))
      ).length,
    [traces]
  );

  const filtered = useMemo(() => {
    return traces
      .filter((t) => {
        const matchesSearch =
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.agentName.toLowerCase().includes(search.toLowerCase()) ||
          t.model.toLowerCase().includes(search.toLowerCase()) ||
          (t.sessionId && t.sessionId.toLowerCase().includes(search.toLowerCase()));

        const matchesModel =
          selectedModel === "all" || t.model.toLowerCase().includes(selectedModel.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === "GHOSTS") {
          matchesStatus = t.ghostBranchCount > 0;
        } else if (statusFilter === "ERRORS") {
          matchesStatus =
            t.status === "FAILED" ||
            (Array.isArray(t.nodes) && t.nodes.some((n) => n.status === "ERROR"));
        } else if (statusFilter === "COMPLETED") {
          matchesStatus = t.status === "COMPLETED";
        }

        return matchesSearch && matchesModel && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "tokens") return b.totalTokens - a.totalTokens;
        if (sortBy === "duration") return b.durationMs - a.durationMs;
        if (sortBy === "cost") return b.costEstimate - a.costEstimate;
        if (sortBy === "ghosts") return b.ghostBranchCount - a.ghostBranchCount;
        return 0; // default order from backend
      });
  }, [traces, search, selectedModel, statusFilter, sortBy]);

  const sessions = useMemo(() => {
    const map: Record<
      string,
      {
        sessionId: string;
        title: string;
        agentName: string;
        model: string;
        turns: TraceRunData[];
        totalTokens: number;
        ghostCount: number;
        cost: number;
      }
    > = {};

    for (const t of filtered) {
      const sId = t.sessionId || `single-${t.id}`;
      if (!map[sId]) {
        map[sId] = {
          sessionId: sId,
          title: t.sessionId ? `Session: ${t.sessionId}` : t.title,
          agentName: t.agentName,
          model: t.model,
          turns: [],
          totalTokens: 0,
          ghostCount: 0,
          cost: 0,
        };
      }
      map[sId].turns.push(t);
      map[sId].totalTokens += t.totalTokens;
      map[sId].ghostCount += t.ghostBranchCount;
      map[sId].cost = Number((map[sId].cost + t.costEstimate).toFixed(5));
    }

    Object.values(map).forEach((s) => {
      s.turns.sort((a, b) => (a.turnIndex || 1) - (b.turnIndex || 1));
    });

    return Object.values(map);
  }, [filtered]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] === undefined ? false : !prev[sessionId],
    }));
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-[#080d19] border-r border-slate-800 flex flex-col items-center py-4 z-20 shrink-0 select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mb-4"
          title="Expand Trace Explorer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-2">
          {traces.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTrace(t.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                selectedTraceId === t.id
                  ? "bg-purple-600/40 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              title={t.title}
            >
              <Ghost className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 h-full bg-[#080d19] border-r border-slate-800/80 flex flex-col z-20 shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Trace Explorer
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {filtered.length} / {traces.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenUpload}
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Import New Trace (.json / .zip)"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="p-3 border-b border-slate-800/60 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traces, agents, tags..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 font-medium"
          />
        </div>

        {/* Status Facet Filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-medium pb-0.5">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-2 py-0.5 rounded-md shrink-0 transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-800 text-slate-100 border border-slate-700 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All ({traces.length})
          </button>
          <button
            onClick={() => setStatusFilter("GHOSTS")}
            className={`px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === "GHOSTS"
                ? "bg-purple-950 text-purple-200 border border-purple-800 font-semibold"
                : "text-purple-400/80 hover:text-purple-300"
            }`}
          >
            <Ghost className="w-2.5 h-2.5" />
            <span>Ghosts ({ghostCountTotal})</span>
          </button>
          <button
            onClick={() => setStatusFilter("ERRORS")}
            className={`px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all ${
              statusFilter === "ERRORS"
                ? "bg-rose-950 text-rose-200 border border-rose-800 font-semibold"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>Errors ({errorCountTotal})</span>
          </button>
          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={`px-2 py-0.5 rounded-md shrink-0 transition-all ${
              statusFilter === "COMPLETED"
                ? "bg-emerald-950 text-emerald-200 border border-emerald-800 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Passed
          </button>
        </div>

        {/* Dynamic Model & Sort Bar */}
        <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
          {/* Dynamic Model Select */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-[10px] outline-none max-w-[130px] truncate"
            title="Filter by LLM Engine"
          >
            {dynamicModels.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "Model: All" : m}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 text-slate-400 shrink-0">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-300 text-[10px] outline-none cursor-pointer"
            >
              <option value="newest">Recent</option>
              <option value="tokens">Most Tokens</option>
              <option value="duration">Latency</option>
              <option value="cost">Highest Cost</option>
              <option value="ghosts">Most Ghosts</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Mode Toggle: All Runs vs Conversation Threads */}
      <div className="flex border-b border-slate-800 text-[11px] font-medium bg-slate-950/40">
        <button
          onClick={() => setViewMode("traces")}
          className={`flex-1 py-1.5 border-b-2 text-center transition-all ${
            viewMode === "traces"
              ? "border-cyan-400 text-cyan-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          All Runs ({filtered.length})
        </button>
        <button
          onClick={() => setViewMode("sessions")}
          className={`flex-1 py-1.5 border-b-2 text-center transition-all flex items-center justify-center gap-1 ${
            viewMode === "sessions"
              ? "border-purple-400 text-purple-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3 h-3 text-purple-400" />
          <span>Threads ({sessions.length})</span>
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No matching traces found for filters
          </div>
        ) : viewMode === "traces" ? (
          filtered.map((t) => {
            const isSelected = selectedTraceId === t.id;
            const hasError =
              t.status === "FAILED" ||
              (Array.isArray(t.nodes) && t.nodes.some((n) => n.status === "ERROR"));

            return (
              <div
                key={t.id}
                onClick={() => onSelectTrace(t.id)}
                className={`group relative rounded-xl p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-900 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.18)]"
                    : "hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h4
                    className={`text-xs font-semibold line-clamp-1 leading-snug ${
                      isSelected ? "text-cyan-300" : "text-slate-200 group-hover:text-slate-100"
                    }`}
                  >
                    {t.title}
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete trace "${t.title}"?`)) {
                        onDeleteTrace(t.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Delete Trace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="truncate">{t.agentName}</span>
                  {hasError && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                      VETO / ERR
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 truncate max-w-[80px]">
                      {t.model.split("-")[0]}
                    </span>
                    {t.ghostBranchCount > 0 && (
                      <span className="flex items-center gap-0.5 text-purple-400 font-semibold">
                        <Ghost className="w-3 h-3" />
                        {t.ghostBranchCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span>{(t.totalTokens / 1000).toFixed(1)}k tokens</span>
                    <span>•</span>
                    <span>{(t.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* Multi-Turn Conversation Thread View */
          sessions.map((s) => {
            const hasSelected = s.turns.some((turn) => turn.id === selectedTraceId);
            const isExpanded = expandedSessions[s.sessionId] ?? hasSelected;

            return (
              <div
                key={s.sessionId}
                className={`rounded-xl border transition-all mb-2 overflow-hidden ${
                  hasSelected
                    ? "border-purple-600/40 bg-purple-950/10 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
                    : "border-slate-800/80 bg-slate-900/30 hover:border-slate-700"
                }`}
              >
                {/* Session Header Card */}
                <div
                  onClick={() => toggleSession(s.sessionId)}
                  className="p-2.5 cursor-pointer flex items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {s.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {s.agentName} • {s.turns.length} turns
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono shrink-0">
                    <span className="text-purple-300 font-semibold">{s.ghostCount} ghosts</span>
                    <p className="text-slate-500">${s.cost.toFixed(3)}</p>
                  </div>
                </div>

                {/* Expanded Turns */}
                {isExpanded && (
                  <div className="bg-slate-950/60 border-t border-slate-800/60 p-1.5 space-y-1">
                    {s.turns.map((turn, tIdx) => {
                      const isTurnSelected = selectedTraceId === turn.id;
                      return (
                        <div
                          key={turn.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrace(turn.id);
                          }}
                          className={`p-2 rounded-lg cursor-pointer text-xs transition-all flex items-center justify-between ${
                            isTurnSelected
                              ? "bg-purple-950/80 border border-purple-500/60 text-purple-200"
                              : "hover:bg-slate-900 text-slate-300"
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-slate-500">
                              T{turn.turnIndex ?? tIdx + 1}
                            </span>
                            <span className="truncate font-medium">{turn.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">
                            {turn.ghostBranchCount > 0 ? `👻 ${turn.ghostBranchCount}` : "✓"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
