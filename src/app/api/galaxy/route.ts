import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectTracesToGalaxy } from "@/lib/embedding-galaxy";
import { TraceRunData } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const method = (searchParams.get("method") || "t-SNE") as "t-SNE" | "PCA" | "UMAP";
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {};
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const tracesDb = await prisma.traceRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        nodes: {
          orderBy: { stepIndex: "asc" },
        },
        edges: true,
      },
    });

    const traces: TraceRunData[] = tracesDb.map((t: any) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(t.tags || "[]");
      } catch {
        tags = [];
      }

      return {
        id: t.id,
        title: t.title,
        agentName: t.agentName,
        model: t.model,
        status: t.status as any,
        totalTokens: t.totalTokens,
        promptTokens: t.promptTokens,
        completionTokens: t.completionTokens,
        reasoningTokens: t.reasoningTokens,
        costEstimate: t.costEstimate,
        durationMs: t.durationMs,
        ghostBranchCount: t.ghostBranchCount,
        tags,
        createdAt: t.createdAt.toISOString(),
        nodes: t.nodes.map((n: any) => ({
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
        edges: t.edges.map((e: any) => ({
          id: e.id,
          edgeId: e.edgeId,
          source: e.source,
          target: e.target,
          label: e.label || undefined,
          isGhost: Boolean(e.isGhost),
          type: e.type as any,
        })),
      };
    });

    const result = projectTracesToGalaxy(traces, method);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("Galaxy API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to project traces to galaxy" },
      { status: 500 }
    );
  }
}
