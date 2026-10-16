import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzePromptCacheEconomics, SUPPORTED_MODELS_PRICING } from "@/lib/cache-cost-optimizer";
import { TraceRunData } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const traceId = searchParams.get("traceId");
    const modelId = searchParams.get("modelId") || undefined;
    const monthlyRuns = parseInt(searchParams.get("monthlyRuns") || "25000", 10);

    let trace: TraceRunData | null = null;

    if (traceId) {
      const dbTrace = await prisma.traceRun.findUnique({
        where: { id: traceId },
        include: {
          nodes: {
            orderBy: { stepIndex: "asc" },
          },
          edges: true,
        },
      });

      if (dbTrace) {
        let tags: string[] = [];
        try {
          tags = JSON.parse(dbTrace.tags || "[]");
        } catch {
          tags = [];
        }

        trace = {
          id: dbTrace.id,
          title: dbTrace.title,
          agentName: dbTrace.agentName,
          model: dbTrace.model,
          status: dbTrace.status as any,
          totalTokens: dbTrace.totalTokens,
          promptTokens: dbTrace.promptTokens,
          completionTokens: dbTrace.completionTokens,
          reasoningTokens: dbTrace.reasoningTokens,
          costEstimate: dbTrace.costEstimate,
          durationMs: dbTrace.durationMs,
          ghostBranchCount: dbTrace.ghostBranchCount,
          tags,
          createdAt: dbTrace.createdAt.toISOString(),
          nodes: dbTrace.nodes.map((n: any) => ({
            id: n.id,
            nodeId: n.nodeId,
            stepIndex: n.stepIndex,
            type: n.type as any,
            label: n.label,
            content: n.content,
            thought: n.thought || undefined,
            ghostReason: n.ghostReason || undefined,
            isGhost: Boolean(n.isGhost),
            tokens: n.tokens || 0,
            latencyMs: n.latencyMs || 0,
            status: n.status as any,
            createdAt: n.createdAt.toISOString(),
          })),
          edges: dbTrace.edges.map((e: any) => ({
            id: e.id,
            edgeId: e.edgeId,
            source: e.source,
            target: e.target,
            label: e.label || undefined,
            isGhost: Boolean(e.isGhost),
            type: e.type as any,
          })),
        };
      }
    }

    // Fallback default trace for mock simulation if no trace specified
    if (!trace) {
      trace = {
        id: "mock-eval-trace",
        title: "Autonomous Multi-Turn Cloud SRE Incident Response",
        agentName: "SRE-Orchestrator",
        model: modelId || "claude-3-7-sonnet",
        status: "COMPLETED",
        durationMs: 8420,
        totalTokens: 18450,
        promptTokens: 14200,
        completionTokens: 4250,
        reasoningTokens: 9200,
        costEstimate: 0.142,
        ghostBranchCount: 3,
        tags: ["sre", "multi-turn", "incident"],
        createdAt: new Date().toISOString(),
        nodes: [
          {
            id: "n-1",
            nodeId: "n-1",
            stepIndex: 1,
            type: "USER_PROMPT",
            label: "Incident Trigger",
            content: "Investigate high P99 latency on Kubernetes ingress controller",
            isGhost: false,
            tokens: 450,
            latencyMs: 12,
            status: "SUCCESS",
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-2",
            nodeId: "n-2",
            stepIndex: 2,
            type: "THINKING",
            label: "Hypothesis Evaluation",
            content: "Reviewing TimescaleDB telemetry metrics and cluster ingress routing tables",
            isGhost: false,
            tokens: 3800,
            latencyMs: 1200,
            status: "SUCCESS",
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-3",
            nodeId: "n-3",
            stepIndex: 3,
            type: "TOOL_CALL",
            label: "Query Ingress Metrics",
            content: '{"service": "ingress-nginx", "window": "15m"}',
            isGhost: false,
            tokens: 850,
            latencyMs: 340,
            status: "SUCCESS",
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-4",
            nodeId: "n-4",
            stepIndex: 4,
            type: "GHOST_REJECTED",
            label: "Dangerous Node Drain",
            content: "kubectl drain node-3 --force --delete-emptydir-data",
            ghostReason: "VETO: Destructive action violates safety policy without quorum confirmation",
            isGhost: true,
            tokens: 1200,
            latencyMs: 220,
            status: "FAILED",
            createdAt: new Date().toISOString(),
          },
          {
            id: "n-5",
            nodeId: "n-5",
            stepIndex: 5,
            type: "LLM_RESPONSE",
            label: "Canary Rollback",
            content: "kubectl rollout undo deployment/ingress-nginx",
            isGhost: false,
            tokens: 920,
            latencyMs: 510,
            status: "SUCCESS",
            createdAt: new Date().toISOString(),
          },
        ],
        edges: [],
      };
    }

    const analysis = analyzePromptCacheEconomics(trace, modelId, monthlyRuns);

    return NextResponse.json({
      success: true,
      models: Object.values(SUPPORTED_MODELS_PRICING),
      analysis,
    });
  } catch (err: any) {
    console.error("Cache optimizer error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to analyze cache economics" },
      { status: 500 }
    );
  }
}
