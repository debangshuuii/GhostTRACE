import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateTraceWithJudge } from "@/lib/eval-engine";
import { TraceRunData } from "@/lib/types";

export async function GET() {
  try {
    const traces = await prisma.traceRun.findMany({
      include: {
        nodes: { orderBy: { stepIndex: "asc" } },
        edges: true,
        evaluations: true,
      },
    });

    const evaluatedTraces = traces.map((t) => {
      const traceData: TraceRunData = {
        ...t,
        status: (t.status as any) || "COMPLETED",
        tags: JSON.parse(t.tags || "[]"),
        nodes: t.nodes.map((n) => ({
          ...n,
          type: n.type as any,
          status: n.status as any,
          rawInput: n.rawInput ? JSON.parse(n.rawInput) : null,
          rawOutput: n.rawOutput ? JSON.parse(n.rawOutput) : null,
        })) as any,
        edges: t.edges as any,
      };

      const report = evaluateTraceWithJudge(traceData, "deepseek-r1-distill");
      return {
        id: t.id,
        title: t.title,
        agentName: t.agentName,
        model: t.model,
        rating: report.overallRating,
        scorePct: report.overallScorePct,
        verdict: report.verdict,
        faithfulness: report.faithfulnessScore,
        ghostPruning: report.ghostPruningScore,
        safety: report.safetyComplianceScore,
        costEfficiency: report.costEfficiencyScore,
        totalTokens: t.totalTokens,
        durationMs: t.durationMs,
        ghostCount: t.ghostBranchCount,
      };
    });

    // Group by model
    const modelLeaderboard: Record<string, {
      model: string;
      avgScore: number;
      avgFaithfulness: number;
      avgGhostPruning: number;
      avgSafety: number;
      traceCount: number;
      totalGhostsPruned: number;
    }> = {};

    for (const item of evaluatedTraces) {
      if (!modelLeaderboard[item.model]) {
        modelLeaderboard[item.model] = {
          model: item.model,
          avgScore: 0,
          avgFaithfulness: 0,
          avgGhostPruning: 0,
          avgSafety: 0,
          traceCount: 0,
          totalGhostsPruned: 0,
        };
      }
      const m = modelLeaderboard[item.model];
      m.avgScore += item.scorePct;
      m.avgFaithfulness += item.faithfulness;
      m.avgGhostPruning += item.ghostPruning;
      m.avgSafety += item.safety;
      m.traceCount += 1;
      m.totalGhostsPruned += item.ghostCount;
    }

    const leaderboard = Object.values(modelLeaderboard).map((m) => ({
      ...m,
      avgScore: Math.round(m.avgScore / m.traceCount),
      avgFaithfulness: Math.round(m.avgFaithfulness / m.traceCount),
      avgGhostPruning: Math.round(m.avgGhostPruning / m.traceCount),
      avgSafety: Math.round(m.avgSafety / m.traceCount),
    })).sort((a, b) => b.avgScore - a.avgScore);

    return NextResponse.json({
      success: true,
      leaderboard,
      evaluatedTraces,
    });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch evaluation leaderboard" },
      { status: 500 }
    );
  }
}
