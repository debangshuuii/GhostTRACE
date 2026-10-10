"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Brain,
  Wrench,
  Ghost,
  MessageSquare,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  Cpu,
} from "lucide-react";
import { TraceNodeData } from "@/lib/types";

// Base Wrapper for consistent styling
const NodeWrapper = ({
  children,
  selected,
  className = "",
  isGhost = false,
  isPaused = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
  isGhost?: boolean;
  isPaused?: boolean;
}) => (
  <div
    className={`relative min-w-[280px] max-w-[340px] rounded-xl p-3.5 transition-all duration-200 cursor-pointer backdrop-blur-md shadow-xl ${
      isPaused
        ? "ring-2 ring-amber-400 border-amber-500 bg-amber-950/40 animate-pulse shadow-[0_0_30px_rgba(245,158,11,0.5)]"
        : selected
        ? "ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
        : "hover:border-slate-500"
    } ${isGhost ? "ghost-node-glow border-purple-500/50 bg-purple-950/20" : className}`}
  >
    {isPaused && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-lg animate-bounce z-20">
        <span>⏸ HIT BREAKPOINT</span>
      </div>
    )}
    {children}
  </div>
);

// 1. User Prompt Node
export const UserPromptNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-slate-900/90 border border-slate-700/80 text-slate-100"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>USER PROMPT</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Step #{node.stepIndex}
        </span>
      </div>
      <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed font-normal">
        {node.content}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900"
      />
    </NodeWrapper>
  );
});
UserPromptNode.displayName = "UserPromptNode";

// 2. Thinking / Reasoning Chain Node
export const ThinkingNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-indigo-950/40 border border-indigo-700/50 text-indigo-100 shadow-[0_4px_20px_rgba(79,70,229,0.15)]"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
          <Brain className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
          <span>REASONING / COT</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 font-mono">
          {node.tokens ? `${node.tokens} tok` : "think"}
        </span>
      </div>
      <div className="text-xs font-medium text-slate-200 mb-1">{node.label}</div>
      <p className="text-[11px] text-slate-400 line-clamp-2 italic leading-relaxed">
        &quot;{node.content}&quot;
      </p>
      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-indigo-900/50 text-[10px] text-indigo-300/80">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {node.latencyMs}ms
        </span>
        {node.confidenceScore && (
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            {(node.confidenceScore * 100).toFixed(0)}% conf
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900"
      />
    </NodeWrapper>
  );
});
ThinkingNode.displayName = "ThinkingNode";

// 3. Tool Call Node
export const ToolCallNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-amber-950/30 border border-amber-600/40 text-amber-100"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-400">
          <Wrench className="w-3.5 h-3.5" />
          <span>TOOL CALL</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-mono">
          Step #{node.stepIndex}
        </span>
      </div>
      <div className="text-xs font-mono font-medium text-amber-200 mb-1 truncate">
        {node.label}
      </div>
      <p className="text-[11px] text-slate-300 line-clamp-2 font-mono bg-black/40 p-1.5 rounded border border-amber-900/40">
        {node.content}
      </p>
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-amber-900/40 text-[10px] text-amber-300/70">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {node.latencyMs}ms
        </span>
        <span className="flex items-center gap-1">
          <Coins className="w-3 h-3" />
          ${node.cost?.toFixed(4) || "0.00"}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900"
      />
    </NodeWrapper>
  );
});
ToolCallNode.displayName = "ToolCallNode";

// 4. Ghost Branch Node (REJECTED ALTERNATIVE)
export const GhostBranchNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isGhost={true}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-purple-950/30 border-2 border-dashed border-purple-400/60 text-purple-100"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
          <Ghost className="w-4 h-4 text-purple-400 animate-bounce" />
          <span className="tracking-wide text-[11px]">GHOST BRANCH (PRUNED)</span>
        </div>
        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
          REJECTED
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-100 mb-1">{node.label}</div>
      <p className="text-[11px] text-purple-200/80 line-clamp-2 mb-2 italic">
        {node.content}
      </p>

      {/* Critic Rejection Reason Box */}
      {node.ghostReason && (
        <div className="p-2 rounded bg-purple-900/30 border border-purple-500/30 text-[10px] text-purple-200 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            <strong className="text-rose-300">Critic Verdict: </strong>
            {node.ghostReason}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-purple-800/40 text-[10px] text-purple-300/70 font-mono">
        <span>Pruned at step #{node.stepIndex}</span>
        {node.confidenceScore && (
          <span className="text-rose-300">
            Score: {(node.confidenceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900"
      />
    </NodeWrapper>
  );
});
GhostBranchNode.displayName = "GhostBranchNode";

// 5. Subagent Spawn Node
export const SubagentSpawnNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-cyan-950/40 border border-cyan-500/40 text-cyan-100"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>SUBAGENT SPAWN</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 font-mono">
          Parallel
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-100 mb-1">{node.label}</div>
      <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 font-mono bg-cyan-950/70 p-1.5 rounded border border-cyan-900/50">
        {node.content}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900"
      />
    </NodeWrapper>
  );
});
SubagentSpawnNode.displayName = "SubagentSpawnNode";

// 6. LLM Response / Final Output Node
export const LlmResponseNode = memo((props: NodeProps) => {
  const node = props.data as unknown as TraceNodeData;
  return (
    <NodeWrapper
      selected={Boolean(props.selected)}
      isPaused={node.status === "PAUSED" || Boolean((node as any).isPaused)}
      className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-100 shadow-[0_4px_25px_rgba(16,185,129,0.15)]"
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900"
      />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>FINAL VERIFIED OUTPUT</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">
          Success
        </span>
      </div>
      <div className="text-xs font-semibold text-slate-100 mb-1">{node.label}</div>
      <p className="text-[11px] text-slate-200 line-clamp-3 leading-relaxed">
        {node.content}
      </p>
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-emerald-900/50 text-[10px] text-emerald-300/80">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {node.latencyMs}ms
        </span>
        <span className="flex items-center gap-1">
          <Coins className="w-3 h-3" />
          ${node.cost?.toFixed(4) || "0.00"}
        </span>
      </div>
    </NodeWrapper>
  );
});
LlmResponseNode.displayName = "LlmResponseNode";

// 7. Swimlane Backdrop Lane Node (Multi-Agent Swarm Layout)
export const SwimlaneLaneNode = memo((props: NodeProps) => {
  const data = props.data as unknown as {
    label: string;
    sublabel: string;
    badgeStyle: string;
    bgColor: string;
    borderColor: string;
    width: number;
    height: number;
  };

  return (
    <div
      style={{ width: data.width || 1800, height: data.height || 140 }}
      className={`rounded-2xl border ${data.borderColor} ${data.bgColor} p-3.5 pointer-events-none select-none relative transition-all shadow-inner`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border font-mono ${data.badgeStyle}`}
        >
          {data.label}
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          {data.sublabel}
        </span>
      </div>
    </div>
  );
});
SwimlaneLaneNode.displayName = "SwimlaneLaneNode";

