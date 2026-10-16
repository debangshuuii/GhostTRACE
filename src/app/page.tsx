"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { TraceHeader } from "@/components/layout/TraceHeader";
import { TraceSidebar } from "@/components/layout/TraceSidebar";
import { NodeInspectorDrawer } from "@/components/inspector/NodeInspectorDrawer";
import { TraceAnalyticsDrawer } from "@/components/analytics/TraceAnalyticsDrawer";
import { TraceUploadModal } from "@/components/modals/TraceUploadModal";
import { WhatIfPlaygroundModal } from "@/components/modals/WhatIfPlaygroundModal";
import { TraceDiffModal } from "@/components/modals/TraceDiffModal";
import { GuardrailsModal } from "@/components/modals/GuardrailsModal";
import { FleetTelemetryModal } from "@/components/modals/FleetTelemetryModal";
import { SdkIntegrationModal } from "@/components/modals/SdkIntegrationModal";
import { DpoExportModal } from "@/components/modals/DpoExportModal";
import { PromptOptimizerModal } from "@/components/modals/PromptOptimizerModal";
import { LiveAgentStudioModal } from "@/components/modals/LiveAgentStudioModal";
import { AutomatedEvalsModal } from "@/components/modals/AutomatedEvalsModal";
import { ApiKeyManagementModal } from "@/components/modals/ApiKeyManagementModal";
import { BreakpointInterventionModal } from "@/components/modals/BreakpointInterventionModal";
import { WaterfallTimelineDrawer } from "@/components/analytics/WaterfallTimelineDrawer";
import { SwarmTopologyModal } from "@/components/modals/SwarmTopologyModal";
import { AnomalyDriftModal } from "@/components/modals/AnomalyDriftModal";
import { WebhookAlertsModal } from "@/components/modals/WebhookAlertsModal";
import { RegressionSuiteModal } from "@/components/modals/RegressionSuiteModal";
import { StepReExecuteModal } from "@/components/modals/StepReExecuteModal";
import { McpControlPlaneModal } from "@/components/modals/McpControlPlaneModal";
import { RedGhostModal } from "@/components/modals/RedGhostModal";
import { MissionControlModal } from "@/components/modals/MissionControlModal";
import { StorageAdapterModal } from "@/components/modals/StorageAdapterModal";
import { AuthRbacModal } from "@/components/modals/AuthRbacModal";
import { CommandPaletteModal } from "@/components/modals/CommandPaletteModal";
import { PromptCacheOptimizerModal } from "@/components/modals/PromptCacheOptimizerModal";
import { EmbeddingGalaxyModal } from "@/components/modals/EmbeddingGalaxyModal";
import { PhantomAiPanel } from "@/components/copilot/PhantomAiPanel";
import { WorkspaceItem } from "@/components/layout/TraceHeader";
import { Sparkles, AlertCircle, Ghost } from "lucide-react";

export default function Home() {
  const [traces, setTraces] = useState<TraceRunData[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceRunData | null>(null);
  const [selectedNode, setSelectedNode] = useState<TraceNodeData | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // PhantomAI Copilot State
  const [phantomAiOpen, setPhantomAiOpen] = useState(false);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(false);
  const [whatIfModalOpen, setWhatIfModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [guardrailsModalOpen, setGuardrailsModalOpen] = useState(false);
  const [redGhostModalOpen, setRedGhostModalOpen] = useState(false);
  const [fleetModalOpen, setFleetModalOpen] = useState(false);
  const [sdkModalOpen, setSdkModalOpen] = useState(false);
  const [dpoModalOpen, setDpoModalOpen] = useState(false);
  const [optimizerModalOpen, setOptimizerModalOpen] = useState(false);
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [evalsModalOpen, setEvalsModalOpen] = useState(false);
  const [keysModalOpen, setKeysModalOpen] = useState(false);
  const [waterfallDrawerOpen, setWaterfallDrawerOpen] = useState(false);
  const [swarmModalOpen, setSwarmModalOpen] = useState(false);
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [breakpointModalOpen, setBreakpointModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [regressionModalOpen, setRegressionModalOpen] = useState(false);
  const [reExecuteModalOpen, setReExecuteModalOpen] = useState(false);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [missionControlOpen, setMissionControlOpen] = useState(false);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [authRbacOpen, setAuthRbacOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cacheOptimizerOpen, setCacheOptimizerOpen] = useState(false);
  const [galaxyModalOpen, setGalaxyModalOpen] = useState(false);
  const [nodeToReExecute, setNodeToReExecute] = useState<TraceNodeData | null>(null);
  const [pausedNode, setPausedNode] = useState<TraceNodeData | null>(null);
  const [nodeToFork, setNodeToFork] = useState<TraceNodeData | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (err) {
      console.warn("Failed to load workspaces:", err);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Fetch all trace runs (optionally filtered by workspaceId)
  const fetchTraces = useCallback(async (selectId?: string, workspaceId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const wsId = workspaceId !== undefined ? workspaceId : selectedWorkspaceId;
      const url = wsId ? `/api/traces?workspaceId=${encodeURIComponent(wsId)}` : "/api/traces";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load traces from database");
      const data: TraceRunData[] = await res.json();
      setTraces(data);

      if (data.length > 0) {
        const targetId = selectId || selectedTraceId;
        const matched = data.find((t) => t.id === targetId);
        const traceObj = matched || data[0];

        setSelectedTraceId(traceObj.id);
        setSelectedTrace(traceObj);
        setSelectedNode(null);
      } else {
        setSelectedTrace(null);
        setSelectedTraceId(null);
      }
    } catch (err: any) {
      console.warn("Failed to fetch traces:", err);
      setError(err.message || "Failed to fetch traces");
    } finally {
      setLoading(false);
    }
  }, [selectedTraceId, selectedWorkspaceId]);

  // Fetch detailed trace with all nodes and edges (with instant cache & safe fallback)
  const fetchTraceDetails = async (id: string) => {
    try {
      const existing = traces.find((t) => t.id === id);
      if (existing && Array.isArray(existing.nodes) && existing.nodes.length > 0) {
        setSelectedTrace(existing);
        setSelectedTraceId(id);
        setSelectedNode(null);
        return;
      }

      const res = await fetch(`/api/traces/${encodeURIComponent(id)}`);
      if (!res.ok) {
        console.warn(`Trace ${id} not found, falling back.`);
        if (traces.length > 0) {
          setSelectedTrace(traces[0]);
          setSelectedTraceId(traces[0].id);
          setSelectedNode(null);
        }
        return;
      }
      const data: TraceRunData = await res.json();
      setSelectedTrace(data);
      setSelectedTraceId(id);
      setSelectedNode(null);
    } catch (err: any) {
      console.warn("Could not load trace details:", err);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  // Real-Time Server-Sent Events (SSE) Stream Listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/traces/live");

      eventSource.addEventListener("connected", () => {
        setIsLiveConnected(true);
      });

      eventSource.addEventListener("trace_update", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "TRACE_START" && payload.trace) {
            setTraces((prev) => [payload.trace, ...prev]);
            setSelectedTraceId((curr) => curr || payload.trace.id);
            setSelectedTrace((curr) => curr || payload.trace);
          } else if (payload.event === "NODE_ADDED" && payload.node) {
            const { traceId, node, edge } = payload;
            setSelectedTrace((prev) => {
              if (!prev || prev.id !== traceId) return prev;
              const currentNodes = Array.isArray(prev.nodes) ? prev.nodes : [];
              const currentEdges = Array.isArray(prev.edges) ? prev.edges : [];
              if (currentNodes.some((n) => n.nodeId === node.nodeId)) return prev;

              return {
                ...prev,
                nodes: [...currentNodes, node],
                edges: edge ? [...currentEdges, edge] : currentEdges,
                ghostBranchCount: node.isGhost ? (prev.ghostBranchCount || 0) + 1 : prev.ghostBranchCount,
              };
            });

            setTraces((prev) =>
              prev.map((t) => {
                if (t.id !== traceId) return t;
                const existingNodes = Array.isArray(t.nodes) ? t.nodes : [];
                if (existingNodes.some((n) => n.nodeId === node.nodeId)) return t;
                return {
                  ...t,
                  nodes: [...existingNodes, node],
                  edges: edge && Array.isArray(t.edges) ? [...t.edges, edge] : t.edges,
                  ghostBranchCount: node.isGhost ? (t.ghostBranchCount || 0) + 1 : t.ghostBranchCount,
                };
              })
            );
          } else if (payload.event === "TRACE_END") {
            const { traceId, status } = payload;
            setTraces((prev) =>
              prev.map((t) => (t.id === traceId ? { ...t, status: status || "COMPLETED" } : t))
            );
            setSelectedTrace((prev) =>
              prev && prev.id === traceId ? { ...prev, status: status || "COMPLETED" } : prev
            );
          } else if (payload.event === "BREAKPOINT_HIT") {
            const { traceId, node } = payload;
            if (node) {
              setPausedNode(node);
              setBreakpointModalOpen(true);
              setSelectedTrace((prev) =>
                prev && prev.id === traceId
                  ? {
                      ...prev,
                      isPaused: true,
                      status: "PAUSED",
                      nodes: (prev.nodes || []).map((n) =>
                        n.nodeId === node.nodeId ? { ...n, status: "PAUSED" } : n
                      ),
                    }
                  : prev
              );
              setTraces((prev) =>
                prev.map((t) =>
                  t.id === traceId ? { ...t, isPaused: true, status: "PAUSED" } : t
                )
              );
            }
          }
        } catch (err) {
          console.warn("Failed to parse live trace SSE payload:", err);
        }
      });

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (err) {
      console.warn("Failed to initialize SSE EventSource:", err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleSelectWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    fetchTraces(undefined, workspaceId);
  };

  const handleOpenBreakpointIntervention = () => {
    if (!selectedTrace) return;
    const paused =
      selectedTrace.nodes?.find((n) => n.status === "PAUSED") ||
      selectedTrace.nodes?.[selectedTrace.nodes.length - 1] ||
      null;
    setPausedNode(paused);
    setBreakpointModalOpen(true);
  };

  const handleSelectTrace = (id: string) => {
    const existing = traces.find((t) => t.id === id);
    if (existing && Array.isArray(existing.nodes) && existing.nodes.length > 0) {
      setSelectedTrace(existing);
      setSelectedTraceId(id);
      setSelectedNode(null);
      return;
    }
    setSelectedTraceId(id);
    fetchTraceDetails(id);
  };

  const handleDeleteTrace = async (id: string) => {
    try {
      await fetch(`/api/traces/${id}`, { method: "DELETE" });
      const remaining = traces.filter((t) => t.id !== id);
      setTraces(remaining);
      if (remaining.length > 0) {
        if (selectedTraceId === id) {
          handleSelectTrace(remaining[0].id);
        }
      } else {
        setSelectedTrace(null);
        setSelectedTraceId(null);
      }
    } catch (err) {
      console.warn("Failed to delete trace", err);
    }
  };

  const handleReloadSeed = async () => {
    try {
      setIsSeeding(true);
      setSelectedTrace(null);
      setSelectedTraceId(null);
      await fetch("/api/traces/seed?reset=true", { method: "POST" });
      await fetchTraces();
    } catch (err) {
      console.warn("Failed to re-seed traces", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenFork = (node: TraceNodeData) => {
    setNodeToFork(node);
    setWhatIfModalOpen(true);
  };

  const handleOpenReExecute = (node: TraceNodeData) => {
    setNodeToReExecute(node);
    setReExecuteModalOpen(true);
  };

  const handlePromoteToTest = async (node: TraceNodeData) => {
    try {
      await fetch("/api/evals/regression-suite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_from_node", trace: selectedTrace, node }),
      });
      setRegressionModalOpen(true);
    } catch (err) {
      console.error("Failed to promote node to regression test:", err);
    }
  };

  // Global hotkeys: Ctrl+M / Cmd+M for Mission Control SOC Wall, Ctrl+K / Cmd+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setMissionControlOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070b12] text-slate-100 font-sans">
      {/* Top Header */}
      <TraceHeader
        traces={traces}
        selectedTrace={selectedTrace}
        onSelectTrace={handleSelectTrace}
        workspaces={workspaces}
        selectedWorkspaceId={selectedWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenAnalytics={() => setAnalyticsDrawerOpen(true)}
        onOpenDiff={() => setDiffModalOpen(true)}
        onOpenGuardrails={() => setGuardrailsModalOpen(true)}
        onOpenRedGhost={() => setRedGhostModalOpen(true)}
        onOpenFleet={() => setFleetModalOpen(true)}
        onOpenSdk={() => setSdkModalOpen(true)}
        onOpenDpo={() => setDpoModalOpen(true)}
        onOpenOptimizer={() => setOptimizerModalOpen(true)}
        onOpenStudio={() => setStudioModalOpen(true)}
        onOpenEvals={() => setEvalsModalOpen(true)}
        onOpenRegressionSuite={() => setRegressionModalOpen(true)}
        onOpenMcp={() => setMcpModalOpen(true)}
        onOpenKeys={() => setKeysModalOpen(true)}
        onOpenWaterfall={() => setWaterfallDrawerOpen(true)}
        onOpenSwarmTopology={() => setSwarmModalOpen(true)}
        onOpenBreakpointIntervention={handleOpenBreakpointIntervention}
        onOpenAnomalyModal={() => setAnomalyModalOpen(true)}
        onOpenAlerts={() => setAlertsModalOpen(true)}
        onOpenMissionControl={() => setMissionControlOpen(true)}
        onOpenStorageAdapter={() => setStorageModalOpen(true)}
        onOpenAuthRbac={() => setAuthRbacOpen(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenCacheOptimizer={() => setCacheOptimizerOpen(true)}
        onOpenGalaxy={() => setGalaxyModalOpen(true)}
        isPhantomAiOpen={phantomAiOpen}
        onTogglePhantomAi={() => setPhantomAiOpen(!phantomAiOpen)}
        onReloadSeed={handleReloadSeed}
        isSeeding={isSeeding}
        isLiveConnected={isLiveConnected}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 w-full h-[calc(100vh-64px)] relative overflow-hidden">
        {/* Left Sidebar */}
        <TraceSidebar
          traces={traces}
          selectedTraceId={selectedTraceId}
          onSelectTrace={handleSelectTrace}
          onDeleteTrace={handleDeleteTrace}
          onOpenUpload={() => setUploadModalOpen(true)}
        />

        {/* Center / Canvas Area */}
        <main className="flex-1 h-full relative overflow-hidden flex flex-col">
          {loading && !selectedTrace ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Ghost className="w-10 h-10 text-purple-400 animate-bounce" />
              <p className="text-sm font-medium">Connecting to Prisma database &amp; loading execution traces...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-rose-400 p-6 text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">{error}</p>
              <button
                onClick={() => fetchTraces()}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs hover:bg-slate-700"
              >
                Retry
              </button>
            </div>
          ) : selectedTrace ? (
            <FlowCanvas
              trace={selectedTrace}
              onSelectNode={setSelectedNode}
              selectedNodeId={selectedNode?.nodeId}
              onForkNode={handleOpenFork}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
              <Ghost className="w-12 h-12 text-slate-600" />
              <div className="text-center">
                <h3 className="text-sm font-semibold text-slate-300">No Traces in Workspace</h3>
                <p className="text-xs text-slate-500 mt-1">Import a .zip archive or restore sample traces</p>
              </div>
              <button
                onClick={handleReloadSeed}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Load Demo Multi-Agent Traces
              </button>
            </div>
          )}

          {/* Floating PhantomAI Quick-Open Button when closed */}
          {!phantomAiOpen && (
            <button
              onClick={() => setPhantomAiOpen(true)}
              className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#080d1a]/95 hover:bg-purple-950/90 border border-purple-500/60 text-purple-200 text-xs font-semibold shadow-[0_0_20px_rgba(168,85,247,0.35)] backdrop-blur-md transition-all hover:scale-105"
              title="Open PhantomAI Interactive Copilot & Solution Assistant"
            >
              <Ghost className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Ask PhantomAI</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </button>
          )}

          {/* Node Inspector Drawer */}
          <NodeInspectorDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onForkNode={handleOpenFork}
            onReExecuteNode={handleOpenReExecute}
            onPromoteToTest={handlePromoteToTest}
            onOpenRedGhost={() => setRedGhostModalOpen(true)}
          />
        </main>

        {/* PhantomAI Side-by-Side Interactive Copilot Split View */}
        <PhantomAiPanel
          trace={selectedTrace}
          selectedNode={selectedNode}
          onClearSelectedNode={() => setSelectedNode(null)}
          isOpen={phantomAiOpen}
          onClose={() => setPhantomAiOpen(false)}
        />
      </div>

      {/* Analytics Drawer (Recharts) */}
      <TraceAnalyticsDrawer
        trace={selectedTrace}
        isOpen={analyticsDrawerOpen}
        onClose={() => setAnalyticsDrawerOpen(false)}
      />

      {/* Upload ZIP / JSON Modal (JSZip) */}
      <TraceUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={(newId) => {
          fetchTraces(newId);
        }}
      />

      {/* Counterfactual What-If Playground Modal */}
      <WhatIfPlaygroundModal
        isOpen={whatIfModalOpen}
        onClose={() => {
          setWhatIfModalOpen(false);
          setNodeToFork(null);
        }}
        parentNode={nodeToFork}
        traceId={selectedTraceId}
        onForkCreated={() => {
          if (selectedTraceId) fetchTraceDetails(selectedTraceId);
        }}
      />

      {/* Trace A/B Diff Modal */}
      <TraceDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        traces={traces}
        currentTraceId={selectedTraceId}
      />

      {/* Guardrails Safety Policy Modal */}
      <GuardrailsModal
        isOpen={guardrailsModalOpen}
        onClose={() => setGuardrailsModalOpen(false)}
        trace={selectedTrace}
        onSelectNode={(nodeId) => {
          const found = selectedTrace?.nodes?.find((n) => n.nodeId === nodeId);
          if (found) setSelectedNode(found);
        }}
      />

      {/* Fleet-Wide Telemetry Modal */}
      <FleetTelemetryModal
        isOpen={fleetModalOpen}
        onClose={() => setFleetModalOpen(false)}
        traces={traces}
        onSelectTrace={handleSelectTrace}
      />

      {/* Agent Framework SDK Modal */}
      <SdkIntegrationModal
        isOpen={sdkModalOpen}
        onClose={() => setSdkModalOpen(false)}
        onTraceCreated={(newId) => {
          fetchTraces(newId);
        }}
      />

      {/* DPO Dataset Exporter Modal */}
      <DpoExportModal
        isOpen={dpoModalOpen}
        onClose={() => setDpoModalOpen(false)}
        traces={traces}
        currentTrace={selectedTrace}
      />

      {/* AI Prompt Optimizer Modal */}
      <PromptOptimizerModal
        isOpen={optimizerModalOpen}
        onClose={() => setOptimizerModalOpen(false)}
        trace={selectedTrace}
      />

      {/* Live Agent Execution Studio Modal */}
      <LiveAgentStudioModal
        isOpen={studioModalOpen}
        onClose={() => setStudioModalOpen(false)}
        onTraceCreated={(newId) => {
          fetchTraces(newId);
        }}
      />

      {/* Automated Evals & LLM-as-a-Judge Modal */}
      <AutomatedEvalsModal
        isOpen={evalsModalOpen}
        onClose={() => setEvalsModalOpen(false)}
        trace={selectedTrace}
      />

      {/* Multi-Tenant API Key Management Modal */}
      <ApiKeyManagementModal
        isOpen={keysModalOpen}
        onClose={() => setKeysModalOpen(false)}
      />

      {/* Waterfall Timeline & Latency Profiler Drawer */}
      <WaterfallTimelineDrawer
        trace={selectedTrace}
        isOpen={waterfallDrawerOpen}
        onClose={() => setWaterfallDrawerOpen(false)}
        onSelectNode={(node) => setSelectedNode(node)}
      />

      {/* Swarm Loop Detector & Communication Matrix Modal */}
      <SwarmTopologyModal
        trace={selectedTrace}
        isOpen={swarmModalOpen}
        onClose={() => setSwarmModalOpen(false)}
      />

      {/* Live Breakpoint Human-in-the-Loop Intervention Modal */}
      <BreakpointInterventionModal
        isOpen={breakpointModalOpen}
        onClose={() => {
          setBreakpointModalOpen(false);
          setPausedNode(null);
        }}
        traceId={selectedTraceId}
        node={pausedNode}
        onInterventionComplete={() => {
          if (selectedTraceId) fetchTraceDetails(selectedTraceId);
          fetchTraces(selectedTraceId || undefined);
        }}
      />

      {/* Operational Drift & Anomaly Modal */}
      <AnomalyDriftModal
        isOpen={anomalyModalOpen}
        onClose={() => setAnomalyModalOpen(false)}
        trace={selectedTrace}
      />

      {/* Production Webhook Incident Alerts (Slack / Discord) */}
      <WebhookAlertsModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        workspaceId={selectedWorkspaceId}
      />

      {/* Ghost-to-Test Continuous Regression Golden Suite Modal */}
      <RegressionSuiteModal
        isOpen={regressionModalOpen}
        onClose={() => setRegressionModalOpen(false)}
      />

      {/* Live In-DAG Step Re-Execution Modal (Jupyter for Agent DAGs) */}
      <StepReExecuteModal
        isOpen={reExecuteModalOpen}
        onClose={() => {
          setReExecuteModalOpen(false);
          setNodeToReExecute(null);
        }}
        node={nodeToReExecute}
        traceId={selectedTraceId}
        onReExecutionComplete={() => {
          if (selectedTraceId) fetchTraceDetails(selectedTraceId);
          fetchTraces(selectedTraceId || undefined);
        }}
      />

      {/* Model Context Protocol (MCP) Live Control Plane Modal */}
      <McpControlPlaneModal
        isOpen={mcpModalOpen}
        onClose={() => setMcpModalOpen(false)}
      />

      {/* Red-Ghost Autonomous Adversarial Red-Teaming & Jailbreak Simulator Modal */}
      <RedGhostModal
        isOpen={redGhostModalOpen}
        onClose={() => setRedGhostModalOpen(false)}
        trace={selectedTrace}
      />

      {/* Mission Control NASA/Twitch-Style SOC Telemetry Wall Modal */}
      <MissionControlModal
        isOpen={missionControlOpen}
        onClose={() => setMissionControlOpen(false)}
        traces={traces}
        selectedTrace={selectedTrace}
        onSelectTrace={handleSelectTrace}
        onSelectNode={(node) => setSelectedNode(node)}
      />

      {/* Enterprise Storage Adapters (ClickHouse & TimescaleDB) Modal */}
      <StorageAdapterModal
        isOpen={storageModalOpen}
        onClose={() => setStorageModalOpen(false)}
      />

      {/* Hosted Cloud Multi-Tenant Auth & RBAC Modal */}
      <AuthRbacModal
        isOpen={authRbacOpen}
        onClose={() => setAuthRbacOpen(false)}
        workspaceId={selectedWorkspaceId}
      />

      {/* Spotlight Command Palette (Ctrl+K / ⌘K) & Omni-Search */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        traces={traces}
        selectedTrace={selectedTrace}
        onSelectTrace={handleSelectTrace}
        onSelectNode={(node) => setSelectedNode(node)}
        actions={{
          openMissionControl: () => setMissionControlOpen(true),
          openRedGhost: () => setRedGhostModalOpen(true),
          openStudio: () => setStudioModalOpen(true),
          openStorage: () => setStorageModalOpen(true),
          openAuthRbac: () => setAuthRbacOpen(true),
          openCacheOptimizer: () => setCacheOptimizerOpen(true),
          openGalaxy: () => setGalaxyModalOpen(true),
          openDpo: () => setDpoModalOpen(true),
          openEvals: () => setEvalsModalOpen(true),
          openRegressionSuite: () => setRegressionModalOpen(true),
          openMcp: () => setMcpModalOpen(true),
          openWaterfall: () => setWaterfallDrawerOpen(true),
          openSwarm: () => setSwarmModalOpen(true),
          openKeys: () => setKeysModalOpen(true),
          openAlerts: () => setAlertsModalOpen(true),
          openGuardrails: () => setGuardrailsModalOpen(true),
          openAnalytics: () => setAnalyticsDrawerOpen(true),
          cycleTheme: () => {
            const isDark = document.body.classList.contains("theme-obsidian");
            const isPaper = document.body.classList.contains("theme-paper");
            document.body.classList.remove("theme-obsidian", "theme-paper");
            if (!isDark && !isPaper) {
              document.body.classList.add("theme-obsidian");
            } else if (isDark) {
              document.body.classList.add("theme-paper");
            }
          },
          reloadSeed: handleReloadSeed,
        }}
      />

      {/* Prompt Caching & Token Cost Slasher Modal */}
      <PromptCacheOptimizerModal
        isOpen={cacheOptimizerOpen}
        onClose={() => setCacheOptimizerOpen(false)}
        trace={selectedTrace}
      />

      {/* High-Dimensional Semantic Embedding Galaxy (t-SNE / PCA) Modal */}
      <EmbeddingGalaxyModal
        isOpen={galaxyModalOpen}
        onClose={() => setGalaxyModalOpen(false)}
        traces={traces}
        onSelectTrace={handleSelectTrace}
        onSelectNode={(node) => setSelectedNode(node)}
      />
    </div>
  );
}
