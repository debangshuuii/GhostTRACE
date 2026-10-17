"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import {
  UserPromptNode,
  ThinkingNode,
  ToolCallNode,
  GhostBranchNode,
  SubagentSpawnNode,
  LlmResponseNode,
  SwimlaneLaneNode,
} from "./CustomNodes";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import { getDagreLayout } from "@/lib/graph-layout";
import {
  Eye,
  EyeOff,
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Zap,
  Network,
  GitBranch,
  Layers,
  Map as MapIcon,
  Video,
  Disc,
  ArrowRightCircle,
  ArrowDownCircle,
  Search,
  Filter,
  X,
  Camera,
} from "lucide-react";
import { toPng, toSvg } from "html-to-image";

interface FlowCanvasProps {
  trace: TraceRunData | null;
  onSelectNode: (node: TraceNodeData | null) => void;
  selectedNodeId?: string | null;
  onForkNode?: (node: TraceNodeData) => void;
}

export function FlowCanvas({
  trace,
  onSelectNode,
  selectedNodeId,
  onForkNode,
}: FlowCanvasProps) {
  const [showGhostBranches, setShowGhostBranches] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ghosttrace_show_ghost_branches");
        if (saved !== null) return saved === "true";
      } catch {}
    }
    return true;
  });

  const [viewMode, setViewMode] = useState<"dag" | "auto_lr" | "auto_tb" | "tot" | "swimlane">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ghosttrace_view_mode");
        if (saved && ["dag", "auto_lr", "auto_tb", "tot", "swimlane"].includes(saved)) {
          return saved as any;
        }
      } catch {}
    }
    return "dag";
  });

  const [showMiniMap, setShowMiniMap] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "GHOST" | "TOOL" | "LLM" | "THINKING">("ALL");

  useEffect(() => {
    try {
      localStorage.setItem("ghosttrace_show_ghost_branches", String(showGhostBranches));
    } catch {}
  }, [showGhostBranches]);

  useEffect(() => {
    try {
      localStorage.setItem("ghosttrace_view_mode", viewMode);
    } catch {}
  }, [viewMode]);

  // Canvas Image / Vector Export State
  const [exportingImage, setExportingImage] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const handleExportImage = async (format: "png" | "svg" = "png") => {
    if (!canvasContainerRef.current) return;
    try {
      setExportingImage(true);
      const flowElement = canvasContainerRef.current.querySelector(".react-flow__viewport") as HTMLElement;
      const targetElement = flowElement || canvasContainerRef.current;

      const dataUrl =
        format === "png"
          ? await toPng(targetElement, {
              backgroundColor: "#070b12",
              cacheBust: true,
              pixelRatio: 2,
              filter: (node: any) => {
                if (node.classList?.contains("react-flow__panel")) return false;
                if (node.classList?.contains("react-flow__controls")) return false;
                if (node.classList?.contains("react-flow__minimap")) return false;
                return true;
              },
            })
          : await toSvg(targetElement, {
              backgroundColor: "#070b12",
              cacheBust: true,
            });

      const link = document.createElement("a");
      link.download = `ghosttrace_${trace?.id || "graph"}_dag.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export canvas image:", err);
    } finally {
      setExportingImage(false);
    }
  };

  // Time-Travel Debugger Scrubber State
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Screen Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleToggleScreenRecord = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false,
      });

      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ghosttrace_${trace?.id || "replay"}_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Rewind and start playback automatically while recording
      setReplayStep(1);
      setIsPlaying(true);
    } catch (err) {
      console.warn("Screen recording was cancelled or not supported:", err);
      setIsRecording(false);
    }
  };

  const nodeTypes = useMemo(
    () => ({
      USER_PROMPT: UserPromptNode,
      THINKING: ThinkingNode,
      TOOL_CALL: ToolCallNode,
      TOOL_RESULT: ToolCallNode,
      GHOST_REJECTED: GhostBranchNode,
      SUBAGENT_SPAWN: SubagentSpawnNode,
      LLM_RESPONSE: LlmResponseNode,
      ERROR: GhostBranchNode,
      SWIMLANE_LANE: SwimlaneLaneNode,
    }),
    []
  );

  const maxStep = useMemo(() => {
    if (!trace || !Array.isArray(trace.nodes) || trace.nodes.length === 0) return 1;
    return Math.max(...trace.nodes.map((n) => n.stepIndex));
  }, [trace]);

  // Reset replay step when trace changes
  useEffect(() => {
    setReplayStep(null);
    setIsPlaying(false);
  }, [trace?.id]);

  // Handle Playback Interval
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(400, Math.round(1400 / playbackSpeed));
      playIntervalRef.current = setInterval(() => {
        setReplayStep((prev) => {
          const current = prev === null ? 1 : prev;
          if (current >= maxStep) {
            setIsPlaying(false);
            return maxStep;
          }
          return current + 1;
        });
      }, intervalMs);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, maxStep, playbackSpeed]);

  // Convert TraceRunData nodes and edges into ReactFlow elements
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!trace || !Array.isArray(trace.nodes)) return { initialNodes: [], initialEdges: [] };

    const visibleTraceNodes = trace.nodes.filter((n) => {
      if (!showGhostBranches && n.isGhost) return false;
      if (replayStep !== null && n.stepIndex > replayStep) return false;
      return true;
    });

    const flowNodes: Node[] = [];

    // Inject 5 Swimlane Backdrop Bands when in swimlane mode
    if (viewMode === "swimlane") {
      const laneWidth = Math.max((visibleTraceNodes.length + 1) * 320 + 260, 2400);

      const lanes = [
        {
          id: "lane-user",
          label: "1. INGRESS & OBJECTIVE",
          sublabel: "External User Prompt & Intent",
          badgeStyle: "bg-sky-950/80 text-sky-300 border-sky-700/60",
          bgColor: "bg-sky-950/10",
          borderColor: "border-sky-900/40",
          y: 20,
        },
        {
          id: "lane-planner",
          label: "2. PLANNER & COT REASONING",
          sublabel: "Autonomous Strategy & Sub-Hypotheses",
          badgeStyle: "bg-indigo-950/80 text-indigo-300 border-indigo-700/60",
          bgColor: "bg-indigo-950/10",
          borderColor: "border-indigo-900/40",
          y: 180,
        },
        {
          id: "lane-tools",
          label: "3. TOOL EXECUTION & SANDBOX",
          sublabel: "APIs, Code Compilation & Shell Operations",
          badgeStyle: "bg-amber-950/80 text-amber-300 border-amber-700/60",
          bgColor: "bg-amber-950/10",
          borderColor: "border-amber-900/40",
          y: 340,
        },
        {
          id: "lane-critic",
          label: "4. ADVERSARIAL CRITIC (GHOST PRUNING)",
          sublabel: "Safety Vetoes & Pruned Hallucinated Dead-Ends",
          badgeStyle: "bg-purple-950/80 text-purple-300 border-purple-700/60",
          bgColor: "bg-purple-950/15",
          borderColor: "border-purple-800/50",
          y: 500,
        },
        {
          id: "lane-synthesis",
          label: "5. SYNTHESIS & VERIFIED DELIVERY",
          sublabel: "Final Patch, Benchmark & Verified Deliverable",
          badgeStyle: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
          bgColor: "bg-emerald-950/10",
          borderColor: "border-emerald-900/40",
          y: 660,
        },
      ];

      lanes.forEach((lane) => {
        flowNodes.push({
          id: lane.id,
          type: "SWIMLANE_LANE",
          position: { x: -20, y: lane.y },
          draggable: false,
          selectable: false,
          zIndex: -1,
          data: {
            ...lane,
            width: laneWidth,
            height: 140,
          } as any,
        });
      });
    }

    const queryLower = searchQuery.toLowerCase().trim();

    visibleTraceNodes.forEach((n, idx) => {
      const isCurrentStep = replayStep !== null && n.stepIndex === replayStep;

      let posX = n.positionX || 0;
      let posY = n.positionY || 0;

      if (viewMode === "tot") {
        posX = (n.stepIndex - 1) * 360 + 50;
        posY = n.isGhost ? 50 + (idx % 2) * 280 : 200;
      } else if (viewMode === "swimlane") {
        posX = (n.stepIndex - 1) * 320 + 80;
        if (n.type === "USER_PROMPT") {
          posY = 45;
        } else if (n.isGhost || n.type === "GHOST_REJECTED") {
          posY = 525;
        } else if (n.type === "TOOL_CALL" || n.type === "TOOL_RESULT") {
          posY = 365;
        } else if (n.type === "LLM_RESPONSE") {
          posY = 685;
        } else {
          posY = 205; // Planning / Thinking
        }
      }

      const matchesFilter =
        filterType === "ALL" ||
        (filterType === "GHOST" && n.isGhost) ||
        (filterType === "TOOL" && (n.type === "TOOL_CALL" || n.type === "TOOL_RESULT")) ||
        (filterType === "LLM" && n.type === "LLM_RESPONSE") ||
        (filterType === "THINKING" && n.type === "THINKING");

      const matchesQuery =
        !queryLower ||
        Boolean(n.label?.toLowerCase().includes(queryLower)) ||
        Boolean(n.content?.toLowerCase().includes(queryLower)) ||
        Boolean(n.role?.toLowerCase().includes(queryLower)) ||
        Boolean(n.ghostReason?.toLowerCase().includes(queryLower));

      const isDimmed = (queryLower.length > 0 || filterType !== "ALL") && (!matchesFilter || !matchesQuery);

      flowNodes.push({
        id: n.nodeId,
        type: n.type,
        position: { x: posX, y: posY },
        data: {
          ...n,
          totScore: n.isGhost ? "Q: 0.28 (Pruned)" : "Q: 0.94 (Optimal)",
          swimlaneRole:
            n.type === "USER_PROMPT"
              ? "Ingress"
              : n.isGhost
              ? "Security Critic"
              : n.type === "TOOL_CALL"
              ? "Tool Runner"
              : n.type === "LLM_RESPONSE"
              ? "Synthesizer"
              : "Planner",
        } as any,
        selected: n.nodeId === selectedNodeId || isCurrentStep,
        style: isDimmed ? { opacity: 0.22, filter: "grayscale(80%)", transition: "all 0.25s ease" } : undefined,
      });
    });

    const visibleNodeIds = new Set(flowNodes.map((n) => n.id));
    const rawEdges = Array.isArray(trace.edges) ? trace.edges : [];

    const flowEdges: Edge[] = rawEdges
      .filter((e) => {
        if (!showGhostBranches && e.isGhost) return false;
        return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
      })
      .map((e) => ({
        id: e.edgeId || `edge-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label:
          viewMode === "tot" && e.isGhost
            ? "Pruned Branch"
            : viewMode === "swimlane" && e.isGhost
            ? "Critic Veto"
            : e.label,
        type: "smoothstep",
        animated: !e.isGhost,
        className: e.isGhost ? "ghost-edge" : undefined,
        style: {
          stroke: e.isGhost ? "#c084fc" : "#0ea5e9",
          strokeWidth: e.isGhost ? 2 : 2.5,
          strokeDasharray: e.isGhost ? "5,5" : undefined,
        },
        labelStyle: {
          fill: e.isGhost ? "#e9d5ff" : "#94a3b8",
          fontSize: 10,
          fontWeight: 600,
          fontFamily: "monospace",
        },
        labelBgStyle: {
          fill: "#0f172a",
          fillOpacity: 0.85,
          rx: 4,
          ry: 4,
        },
      }));

    if (viewMode === "auto_lr" || viewMode === "auto_tb") {
      const layout = getDagreLayout(flowNodes, flowEdges, {
        direction: viewMode === "auto_lr" ? "LR" : "TB",
        nodeWidth: 300,
        nodeHeight: 160,
        rankSep: 140,
        nodeSep: 75,
      });
      return { initialNodes: layout.nodes, initialEdges: layout.edges };
    }

    return { initialNodes: flowNodes, initialEdges: flowEdges };
  }, [trace, showGhostBranches, selectedNodeId, replayStep, viewMode, searchQuery, filterType]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    onSelectNode((node.data as any) as TraceNodeData);
  };

  const onPaneClick = () => {
    onSelectNode(null);
  };

  if (!trace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
        <Sparkles className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm">Loading trace graph canvas...</p>
      </div>
    );
  }

  const currentScrubValue = replayStep === null ? maxStep : replayStep;

  return (
    <div ref={canvasContainerRef} className="w-full h-full relative select-none bg-[#070b12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes as any}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(255, 255, 255, 0.07)"
        />
        <Controls position="bottom-left" showInteractive={false} className="!mb-24" />
        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            zoomable
            pannable
            nodeColor={(node: any) => {
              if (node.type === "SWIMLANE_LANE") return "transparent";
              if (node.data?.isGhost) return "#c084fc";
              if (node.data?.type === "THINKING") return "#818cf8";
              if (node.data?.type === "TOOL_CALL") return "#fbbf24";
              if (node.data?.type === "LLM_RESPONSE") return "#34d399";
              return "#38bdf8";
            }}
            maskColor="rgba(8, 12, 20, 0.75)"
            className="!m-4 !mb-24 !rounded-xl overflow-hidden border border-slate-800 shadow-2xl backdrop-blur-md"
          />
        )}

        {/* Top Control Bar with View Mode, Search, Filter & Toggles */}
        <Panel position="top-left" className="!m-4 flex items-center gap-2 flex-wrap max-w-[calc(100vw-360px)]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex rounded-md bg-slate-800 p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode("dag")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "dag"
                    ? "bg-cyan-500 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="DAG Layout Mode"
              >
                <Network className="w-3 h-3" />
                <span>DAG</span>
              </button>
              <button
                onClick={() => setViewMode("auto_lr")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "auto_lr"
                    ? "bg-sky-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Dagre Auto-Layout (Hierarchical Left-to-Right)"
              >
                <ArrowRightCircle className="w-3 h-3 text-sky-200" />
                <span>Auto LR</span>
              </button>
              <button
                onClick={() => setViewMode("auto_tb")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "auto_tb"
                    ? "bg-teal-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Dagre Auto-Layout (Hierarchical Top-to-Bottom Tree)"
              >
                <ArrowDownCircle className="w-3 h-3 text-teal-200" />
                <span>Auto TB</span>
              </button>
              <button
                onClick={() => setViewMode("tot")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "tot"
                    ? "bg-purple-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Tree-of-Thoughts / Search Tree Mode"
              >
                <GitBranch className="w-3 h-3" />
                <span>Tree-of-Thoughts</span>
              </button>
              <button
                onClick={() => setViewMode("swimlane")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  viewMode === "swimlane"
                    ? "bg-emerald-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Multi-Agent Swarm Swimlanes"
              >
                <Layers className="w-3 h-3" />
                <span>Swarm Swimlanes</span>
              </button>
            </div>

            <span className="text-slate-600">|</span>

            {/* Quick Node Search */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/90 border border-slate-700/80">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="bg-transparent text-[11px] text-slate-200 placeholder-slate-500 outline-none w-24 focus:w-36 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-slate-200"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-800 text-[11px] text-slate-300 border border-slate-700 rounded-md px-2 py-1 outline-none font-medium cursor-pointer"
                title="Filter nodes by type"
              >
                <option value="ALL">Filter: All Nodes</option>
                <option value="GHOST">Pruned Vetos Only</option>
                <option value="TOOL">Tool Executions</option>
                <option value="THINKING">Planning / Reasoning</option>
                <option value="LLM">Deliverables Only</option>
              </select>
            </div>

            <span className="text-slate-600">|</span>

            {/* Ghost Branches Toggle */}
            <button
              onClick={() => setShowGhostBranches(!showGhostBranches)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                showGhostBranches
                  ? "bg-purple-900/60 text-purple-200 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {showGhostBranches ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-purple-300" />
                  <span>Ghost Branches: ON ({trace.ghostBranchCount})</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ghost Branches: OFF</span>
                </>
              )}
            </button>

            <span className="text-slate-600">|</span>

            {/* MiniMap Toggle */}
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-all ${
                showMiniMap
                  ? "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle MiniMap"
            >
              <MapIcon className="w-3 h-3" />
              <span>Map {showMiniMap ? "ON" : "OFF"}</span>
            </button>

            <span className="text-slate-600">|</span>

            {/* 1-Click High-Res Canvas Snapshot Export */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExportImage("png")}
                disabled={exportingImage}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 font-medium transition-all disabled:opacity-50"
                title="Export High-Resolution Canvas Snapshot (PNG)"
              >
                <Camera className={`w-3 h-3 text-cyan-400 ${exportingImage ? "animate-spin" : ""}`} />
                <span>{exportingImage ? "Capturing..." : "PNG"}</span>
              </button>
              <button
                onClick={() => handleExportImage("svg")}
                disabled={exportingImage}
                className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/80 font-mono text-[10px] transition-all disabled:opacity-50"
                title="Export Vector Graph (SVG)"
              >
                <span>SVG</span>
              </button>
            </div>

            <span className="text-slate-600">|</span>

            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px] px-1">
              <span>{nodes.length} nodes</span>
            </div>
          </div>
        </Panel>

        {/* Bottom Time-Travel Execution Scrubber Panel */}
        <Panel position="bottom-center" className="!mb-4 !mx-auto w-[680px] max-w-[94%]">
          <div className="bg-[#0b101e]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-semibold text-cyan-300 font-mono text-[11px]">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Execution Replay
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {replayStep === null ? "Full DAG" : `Step ${replayStep} of ${maxStep}`}
                </span>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Speed:</span>
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded transition-all font-mono ${
                      playbackSpeed === spd
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Slider Scrubber */}
            <div className="flex items-center gap-3 px-1">
              <input
                type="range"
                min={1}
                max={maxStep}
                value={currentScrubValue}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setIsPlaying(false);
                  setReplayStep(val >= maxStep ? null : val);
                }}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setReplayStep(1);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Rewind to Step 1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setReplayStep((prev) => {
                      const cur = prev === null ? maxStep : prev;
                      return Math.max(1, cur - 1);
                    });
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Step Backward"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false);
                    } else {
                      if (replayStep === null || replayStep >= maxStep) {
                        setReplayStep(1);
                      }
                      setIsPlaying(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isPlaying
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                      : "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play Replay</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setReplayStep((prev) => {
                      const cur = prev === null ? maxStep : prev;
                      if (cur >= maxStep) return null;
                      return cur + 1;
                    });
                  }}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Step Forward"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleScreenRecord}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse shadow-[0_0_12px_rgba(225,29,72,0.5)]"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  }`}
                  title="Capture animated video of execution replay (.webm)"
                >
                  {isRecording ? (
                    <>
                      <Disc className="w-3.5 h-3.5 text-white animate-spin" />
                      <span>Recording... (Stop)</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5 text-rose-400" />
                      <span>Record Replay</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setReplayStep(null);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium ${
                    replayStep === null
                      ? "bg-slate-800 text-cyan-300 border border-cyan-800/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Show Complete DAG
                </button>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
