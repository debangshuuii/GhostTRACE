"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import {
  projectTracesToGalaxy,
  GalaxyPoint,
  SemanticCluster,
  GalaxyProjectionResult,
} from "@/lib/embedding-galaxy";
import { sciFiAudio } from "@/lib/ghost-voice-engine";
import {
  X,
  Orbit,
  Sparkles,
  Search,
  Filter,
  Ghost,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Layers,
  ArrowRight,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Target,
  Compass,
} from "lucide-react";

interface EmbeddingGalaxyModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  onSelectNode: (node: TraceNodeData | null) => void;
  onSelectTrace: (traceId: string) => void;
}

export function EmbeddingGalaxyModal({
  isOpen,
  onClose,
  traces,
  onSelectNode,
  onSelectTrace,
}: EmbeddingGalaxyModalProps) {
  const [projectionMethod, setProjectionMethod] = useState<"t-SNE" | "PCA" | "UMAP">("t-SNE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<GalaxyPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<GalaxyPoint | null>(null);
  const [ghostOnlyFilter, setGhostOnlyFilter] = useState(false);
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);

  // Canvas Viewport State (Pan & Zoom)
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute galaxy projection data
  const galaxyData: GalaxyProjectionResult = useMemo(() => {
    return projectTracesToGalaxy(traces, projectionMethod);
  }, [traces, projectionMethod]);

  // Audio on open
  useEffect(() => {
    if (isOpen) {
      try {
        sciFiAudio.playStepChime();
      } catch {}
    }
  }, [isOpen]);

  // Filtered points
  const visiblePoints = useMemo(() => {
    return galaxyData.points.filter((p) => {
      if (ghostOnlyFilter && !p.isGhost) return false;
      if (activeClusterId !== null && p.clusterId !== activeClusterId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.label.toLowerCase().includes(q) ||
          p.snippet.toLowerCase().includes(q) ||
          p.traceTitle.toLowerCase().includes(q) ||
          (p.ghostReason && p.ghostReason.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [galaxyData, ghostOnlyFilter, activeClusterId, searchQuery]);

  // Coordinate conversion helper: galaxy [-100, 100] to canvas pixels
  const toCanvasCoords = useCallback(
    (gx: number, gy: number, width: number, height: number) => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;
      const scale = (Math.min(width, height) / 240) * zoom;
      return {
        cx: centerX + gx * scale,
        cy: centerY + gy * scale,
      };
    },
    [pan, zoom]
  );

  // Render loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 1. Clear background
    ctx.fillStyle = "#040714";
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle star dust
    for (let i = 0; i < 60; i++) {
      const starX = ((i * 137.5) % width);
      const starY = ((i * 293.7) % height);
      ctx.fillStyle = i % 3 === 0 ? "rgba(6, 182, 212, 0.25)" : "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(starX, starY, (i % 2) + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw ambient cluster glowing nebulae
    galaxyData.clusters.forEach((cluster) => {
      const { cx, cy } = toCanvasCoords(cluster.centroid.x, cluster.centroid.y, width, height);
      const radius = (cluster.radius * 2.2 * (Math.min(width, height) / 240)) * zoom;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, cluster.glowColor);
      grad.addColorStop(0.7, "rgba(4, 7, 20, 0.05)");
      grad.addColorStop(1, "rgba(4, 7, 20, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Cluster label
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = cluster.color;
      ctx.textAlign = "center";
      ctx.fillText(cluster.name.toUpperCase(), cx, cy - radius * 0.85);
    });

    // 4. Draw trajectory path lines between nodes in same trace
    const pointsByTrace: Record<string, GalaxyPoint[]> = {};
    visiblePoints.forEach((p) => {
      if (!pointsByTrace[p.traceId]) pointsByTrace[p.traceId] = [];
      pointsByTrace[p.traceId].push(p);
    });

    Object.values(pointsByTrace).forEach((tracePoints) => {
      tracePoints.sort((a, b) => a.stepIndex - b.stepIndex);
      if (tracePoints.length < 2) return;

      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < tracePoints.length - 1; i++) {
        const p1 = toCanvasCoords(tracePoints[i].x, tracePoints[i].y, width, height);
        const p2 = toCanvasCoords(tracePoints[i + 1].x, tracePoints[i + 1].y, width, height);
        if (i === 0) ctx.moveTo(p1.cx, p1.cy);
        ctx.lineTo(p2.cx, p2.cy);
      }
      ctx.stroke();
    });

    // 5. Draw star points
    visiblePoints.forEach((p) => {
      const { cx, cy } = toCanvasCoords(p.x, p.y, width, height);
      const isSelected = selectedPoint?.id === p.id;
      const isHovered = hoveredPoint?.id === p.id;

      // Glow effect
      if (isSelected || isHovered || p.isGhost) {
        ctx.shadowColor = p.isGhost ? "#f43f5e" : p.clusterColor;
        ctx.shadowBlur = isSelected ? 20 : isHovered ? 15 : 10;
      } else {
        ctx.shadowBlur = 0;
      }

      // Outer rings for ghosts or selected
      if (p.isGhost) {
        ctx.strokeStyle = isSelected ? "#f43f5e" : "rgba(244, 63, 94, 0.6)";
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, isSelected ? 10 : 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isSelected) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main star dot
      ctx.fillStyle = p.isGhost ? "#f43f5e" : p.clusterColor;
      ctx.beginPath();
      const dotRadius = isSelected ? 5 : isHovered ? 4.5 : p.isGhost ? 3.5 : 3;
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;
    });
  }, [isOpen, galaxyData, visiblePoints, selectedPoint, hoveredPoint, pan, zoom, toCanvasCoords]);

  // Handle Canvas Mouse Interaction (Hover & Click Selection)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dragging / Pan
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hit test points
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let found: GalaxyPoint | null = null;
    for (const p of visiblePoints) {
      const { cx, cy } = toCanvasCoords(p.x, p.y, rect.width, rect.height);
      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      if (dist < 10) {
        found = p;
        break;
      }
    }

    if (found && found.id !== hoveredPoint?.id) {
      setHoveredPoint(found);
      try {
        sciFiAudio.playRadarBlip();
      } catch {}
    } else if (!found && hoveredPoint) {
      setHoveredPoint(null);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let clicked: GalaxyPoint | null = null;
    for (const p of visiblePoints) {
      const { cx, cy } = toCanvasCoords(p.x, p.y, rect.width, rect.height);
      const dist = Math.hypot(mouseX - cx, mouseY - cy);
      if (dist < 12) {
        clicked = p;
        break;
      }
    }

    if (clicked) {
      setSelectedPoint(clicked);
      try {
        sciFiAudio.playSuccessChime();
      } catch {}
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.max(0.4, Math.min(3.5, prev * zoomFactor)));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedPoint(null);
    try {
      sciFiAudio.playCyberClick();
    } catch {}
  };

  const handleJumpToNode = () => {
    if (!selectedPoint) return;
    const targetTrace = traces.find((t) => t.id === selectedPoint.traceId);
    if (targetTrace) {
      onSelectTrace(targetTrace.id);
      const node = targetTrace.nodes?.find(
        (n) => (n.nodeId || n.id) === selectedPoint.nodeId
      );
      if (node) {
        onSelectNode(node);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-full max-w-7xl bg-[#030612] border border-cyan-500/50 rounded-2xl shadow-[0_0_80px_rgba(6,182,212,0.3)] flex flex-col overflow-hidden ring-1 ring-cyan-500/30 relative">
        {/* Top Header Control Deck */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#050a19]/90 backdrop-blur-sm flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/60 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <Orbit className="w-6 h-6 animate-spin" style={{ animationDuration: "30s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  <span>Semantic Embedding Galaxy</span>
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-500/60 text-[10px] font-mono font-bold tracking-wider">
                  {galaxyData.totalPoints} EMBEDDING NODES
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/60 text-[10px] font-mono font-bold tracking-wider">
                  {(galaxyData.ghostRatio * 100).toFixed(0)}% GHOST VETOES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                High-dimensional error clustering & manifold projection across thoughts, tool calls, and counterfactual vetoes
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Projection Method Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs font-mono">
              {(["t-SNE", "PCA", "UMAP"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setProjectionMethod(m);
                    try {
                      sciFiAudio.playCyberClick();
                    } catch {}
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    projectionMethod === m
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Legend */}
        <div className="px-6 py-2.5 border-b border-slate-800/80 bg-[#060b1e]/90 backdrop-blur-sm flex items-center justify-between gap-4 z-20 shrink-0 text-xs font-mono">
          {/* Cluster Pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveClusterId(null)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                activeClusterId === null
                  ? "bg-slate-800 text-slate-100 border-slate-600 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              All Clusters ({galaxyData.clusters.length})
            </button>

            {galaxyData.clusters.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveClusterId(activeClusterId === c.id ? null : c.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                  activeClusterId === c.id
                    ? "bg-slate-800 text-white border-slate-500 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate">{c.name}</span>
                <span className="text-[10px] text-slate-500">({c.pointCount})</span>
              </button>
            ))}
          </div>

          {/* Quick Search & Ghost Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setGhostOnlyFilter(!ghostOnlyFilter)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                ghostOnlyFilter
                  ? "bg-rose-950 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <Ghost className="w-3.5 h-3.5 text-rose-400" />
              <span>Ghost Vetoes Only</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search galaxy..."
                className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 font-sans w-40"
              />
            </div>
          </div>
        </div>

        {/* Interactive Galaxy Viewport */}
        <div className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseDown={handleCanvasMouseDown}
            onMouseUp={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            className="w-full h-full block"
          />

          {/* Navigation Zoom / Pan Float Buttons */}
          <div className="absolute bottom-5 left-5 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl text-slate-400 z-30">
            <button
              onClick={() => setZoom((z) => Math.min(3.5, z * 1.2))}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z * 0.8))}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Reset Viewport"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="px-2 text-[10px] font-mono text-cyan-400">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Floating Hover Indicator Tooltip */}
          {hoveredPoint && !selectedPoint && (
            <div className="absolute top-5 left-5 p-3 rounded-xl bg-[#090e1f]/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md max-w-sm pointer-events-none z-30 animate-in fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: hoveredPoint.clusterColor }}
                />
                <span className="text-xs font-bold text-slate-100 truncate">
                  Step #{hoveredPoint.stepIndex}: {hoveredPoint.label}
                </span>
                {hoveredPoint.isGhost && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    GHOST
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2">{hoveredPoint.snippet}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-slate-400">
                <span>{hoveredPoint.clusterName}</span>
                <span>•</span>
                <span>{hoveredPoint.tokens} tok</span>
              </div>
            </div>
          )}

          {/* Locked Selected Node Inspector Card (Drawer) */}
          {selectedPoint && (
            <div className="absolute top-5 right-5 w-96 rounded-2xl bg-[#070b1a]/95 border border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.25)] backdrop-blur-lg p-5 z-40 animate-in slide-in-from-right duration-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedPoint.clusterColor }}
                    />
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                      {selectedPoint.nodeType}
                    </span>
                    {selectedPoint.isGhost && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700 uppercase">
                        PRUNED GHOST
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 truncate mt-1">
                    Step #{selectedPoint.stepIndex}: {selectedPoint.label}
                  </h3>
                  <div className="text-[11px] text-slate-400 truncate">
                    Trace: {selectedPoint.traceTitle}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPoint(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Ghost Veto Reason (if pruned) */}
              {selectedPoint.isGhost && selectedPoint.ghostReason && (
                <div className="mb-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/60 text-rose-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Critic Veto Rationale</span>
                  </div>
                  <p className="leading-relaxed">{selectedPoint.ghostReason}</p>
                </div>
              )}

              {/* Node Content Snippet */}
              <div className="mb-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                  Thought / Tool Payload
                </div>
                <div className="p-3 rounded-xl bg-black/50 border border-slate-800 text-xs font-mono text-slate-300 max-h-36 overflow-y-auto leading-relaxed">
                  {selectedPoint.snippet || "(No content)"}
                </div>
              </div>

              {/* Metadata Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">Cluster</span>
                  <span className="text-slate-200 font-semibold truncate block">
                    {selectedPoint.clusterName}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">Tokens</span>
                  <span className="text-cyan-300 font-bold">
                    {selectedPoint.tokens.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Jump to DAG Node Action */}
              <button
                onClick={handleJumpToNode}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Target className="w-4 h-4" />
                <span>Focus in Reasoning DAG</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-[#050a19] flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Drag to Pan • Wheel to Zoom • Click node to Inspect</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-purple-400 font-bold">
              Silhouette Separability: {galaxyData.silhouetteScore}
            </span>
          </div>

          <div>
            <span>Projection: {galaxyData.projectionMethod} 2D Manifold</span>
          </div>
        </div>
      </div>
    </div>
  );
}
