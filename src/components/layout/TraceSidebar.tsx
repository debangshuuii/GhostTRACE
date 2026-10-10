"use client";

import React, { useState } from "react";
import { TraceRunData } from "@/lib/types";
import {
  Search,
  Filter,
  Ghost,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Clock,
  Sparkles,
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

  const models = ["all", "deepseek-r1-distill", "claude-3-7-sonnet", "gpt-4o"];

  const filtered = traces.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.agentName.toLowerCase().includes(search.toLowerCase()) ||
      t.model.toLowerCase().includes(search.toLowerCase());

    const matchesModel =
      selectedModel === "all" || t.model.toLowerCase().includes(selectedModel.toLowerCase());

    return matchesSearch && matchesModel;
  });

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-[#080d19] border-r border-slate-800 flex flex-col items-center py-4 z-20 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mb-4"
          title="Expand Trace Explorer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex flex-col gap-2">
          {traces.slice(0, 5).map((t) => (
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
    <aside className="w-72 h-full bg-[#080d19] border-r border-slate-800/80 flex flex-col z-20 shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Trace Explorer
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {traces.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenUpload}
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Import New Trace"
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

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traces & tags..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        {/* Model Filter Pills */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5 text-[10px]">
          {models.map((m) => (
            <button
              key={m}
              onClick={() => setSelectedModel(m)}
              className={`px-2 py-0.5 rounded-md capitalize shrink-0 transition-all ${
                selectedModel === m
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {m === "all" ? "All" : m.split("-")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Trace List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No matching traces found
          </div>
        ) : (
          filtered.map((t) => {
            const isSelected = selectedTraceId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTrace(t.id)}
                className={`group relative rounded-xl p-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-900 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
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

                <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                  {t.agentName}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                      {t.model.split("-")[0]}
                    </span>
                    <span className="flex items-center gap-1 text-purple-400 font-semibold">
                      <Ghost className="w-3 h-3" />
                      {t.ghostBranchCount}
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {(t.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
