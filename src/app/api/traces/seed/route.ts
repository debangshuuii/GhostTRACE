import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MOCK_TRACES } from "@/lib/mock-traces";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reset = searchParams.get("reset") === "true";

    if (reset) {
      await prisma.traceEvaluation.deleteMany();
      await prisma.traceEdge.deleteMany();
      await prisma.traceNode.deleteMany();
      await prisma.traceRun.deleteMany();
    }

    for (const trace of MOCK_TRACES) {
      const exists = await prisma.traceRun.findUnique({ where: { id: trace.id } });
      if (!exists) {
        await prisma.traceRun.create({
          data: {
            id: trace.id,
            title: trace.title,
            agentName: trace.agentName,
            model: trace.model,
            status: trace.status,
            totalTokens: trace.totalTokens,
            promptTokens: trace.promptTokens,
            completionTokens: trace.completionTokens,
            reasoningTokens: trace.reasoningTokens,
            costEstimate: trace.costEstimate,
            durationMs: trace.durationMs,
            ghostBranchCount: trace.ghostBranchCount,
            tags: JSON.stringify(trace.tags),
            description: trace.description,
            createdAt: new Date(trace.createdAt),
            nodes: {
              create: trace.nodes.map((n) => ({
                nodeId: n.nodeId,
                stepIndex: n.stepIndex,
                type: n.type,
                label: n.label,
                role: n.role,
                content: n.content,
                rawInput: n.rawInput ? JSON.stringify(n.rawInput) : null,
                rawOutput: n.rawOutput ? JSON.stringify(n.rawOutput) : null,
                latencyMs: n.latencyMs ?? 0,
                tokens: n.tokens ?? 0,
                cost: n.cost ?? 0,
                status: n.status,
                isGhost: n.isGhost,
                ghostReason: n.ghostReason,
                confidenceScore: n.confidenceScore,
                positionX: n.positionX ?? 0,
                positionY: n.positionY ?? 0,
              })),
            },
            edges: {
              create: trace.edges.map((e) => ({
                edgeId: e.edgeId,
                source: e.source,
                target: e.target,
                type: e.type,
                label: e.label,
                isGhost: e.isGhost ?? false,
              })),
            },
            evaluations: {
              create: (trace.evaluations || []).map((ev) => ({
                evaluator: ev.evaluator,
                rating: ev.rating,
                verdict: ev.verdict,
                feedback: ev.feedback,
                createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
              })),
            },
          },
        });
      }
    }

    const count = await prisma.traceRun.count();
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message || "Failed to seed" }, { status: 500 });
  }
}
