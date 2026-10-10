"use client";

import React, { useState, useMemo } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import {
  X,
  Clock,
  Zap,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Flame,
} from "lucide-react";

interface WaterfallTimelineDrawerProps {
  trace: TraceRunData | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectNode?: (node: TraceNodeData) => void;
}

export function WaterfallTimelineDrawer({
  trace,
  isOpen,
  onClose,
  onSelectNode,
}: WaterfallTimelineDrawerProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const nodes = useMemo(() => {
    if (!trace || !Array.isArray(trace.nodes)) return [];
    return [...trace.nodes].sort((a, b) => a.stepIndex - b.stepIndex);
  }, [trace]);

  // Compute accumulated start offsets and waterfall spans
  const { timelineSpans, totalDurationMs, longestSpanNodeId } = useMemo(() => {
    let currentOffset = 0;
    let longestMs = 0;
    let longestId = "";

    const spans = nodes.map((node) => {
      const latency = Math.max(node.latencyMs || 100, 30);
      const startMs = currentOffset;
      // Sequential offset advancement
      currentOffset += latency;

      if (latency > longestMs) {
        longestMs = latency;
        longestId = node.nodeId;
      }

      return {
        node,
        startMs,
        latencyMs: latency,
        endMs: startMs + latency,
      };
    });

    const total = Math.max(currentOffset, trace?.durationMs || 1000);
    return { timelineSpans: spans, totalDurationMs: total, longestSpanNodeId: longestId };
  }, [nodes, trace]);

  if (!isOpen || !trace) return null;

  const filteredSpans = timelineSpans.filter((s) => {
    if (filterType === "ALL") return true;
    if (filterType === "GHOST") return s.node.isGhost;
    if (filterType === "TOOL") return s.node.type === "TOOL_CALL" || s.node.type === "TOOL_RESULT";
    if (filterType === "LLM") return s.node.type === "LLM_RESPONSE" || s.node.type === "THINKING";
    return true;
  });

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#080d1a]/95 border-t border-slate-800 backdrop-blur-xl shadow-2xl transition-all duration-300 max-h-[50vh] flex flex-col animate-in slide-in-from-bottom">
      {/* Top Drawer Handle & Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Agent Execution Waterfall &amp; Critical Path Timeline</span>
              <span className="font-mono text-[10px] text-cyan-400 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Total: {totalDurationMs}ms
              </span>
            </h3>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 text-xs">
          {/* Filter Chips */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-[11px]">
            {["ALL", "LLM", "TOOL", "GHOST"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-0.5 rounded transition-all font-medium ${
                  filterType === type
                    ? "bg-cyan-500 text-slate-950 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Waterfall Grid Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Time Scale Axis */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 border-b border-slate-800/60 pb-1 px-44">
          <span>0ms</span>
          <span>{Math.round(totalDurationMs * 0.25)}ms</span>
          <span>{Math.round(totalDurationMs * 0.5)}ms</span>
          <span>{Math.round(totalDurationMs * 0.75)}ms</span>
          <span>{totalDurationMs}ms</span>
        </div>

        {/* Spans Rows */}
        {filteredSpans.map((span) => {
          const { node, startMs, latencyMs } = span;
          const leftPercent = Math.min((startMs / totalDurationMs) * 100, 95);
          const widthPercent = Math.max((latencyMs / totalDurationMs) * 100, 3);
          const isBottleneck = node.nodeId === longestSpanNodeId;

          let barColor = "bg-sky-500 border-sky-400";
          if (node.isGhost) barColor = "bg-purple-600 border-purple-400";
          else if (node.type === "TOOL_CALL" || node.type === "TOOL_RESULT")
            barColor = "bg-amber-500 border-amber-400";
          else if (node.type === "LLM_RESPONSE") barColor = "bg-emerald-500 border-emerald-400";
          else if (node.type === "THINKING") barColor = "bg-indigo-500 border-indigo-400";

          return (
            <div
              key={node.nodeId}
              onClick={() => onSelectNode && onSelectNode(node)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-800/40 cursor-pointer transition-colors group"
            >
              {/* Row Label */}
              <div className="w-44 shrink-0 flex items-center gap-2 truncate">
                <span className="font-mono text-[10px] text-slate-500 w-5">
                  #{node.stepIndex}
                </span>
                <span className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300">
                  {node.label}
                </span>
                {isBottleneck && (
                  <span
                    className="flex items-center text-[9px] text-amber-400 bg-amber-950/80 px-1 rounded border border-amber-800/60"
                    title="Critical path sequential bottleneck"
                  >
                    <Flame className="w-2.5 h-2.5 mr-0.5 fill-current" /> Slow
                  </span>
                )}
              </div>

              {/* Bar Canvas Track */}
              <div className="flex-1 h-5 bg-slate-900/80 rounded-md relative overflow-hidden border border-slate-800/60">
                <div
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                  className={`absolute top-0 bottom-0 rounded border-y border-x shadow-md flex items-center justify-between px-1.5 text-[9px] font-mono font-semibold text-slate-950 transition-all ${barColor}`}
                >
                  <span className="truncate">{latencyMs}ms</span>
                  {node.tokens ? (
                    <span className="text-[8px] opacity-75">{node.tokens}t</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
