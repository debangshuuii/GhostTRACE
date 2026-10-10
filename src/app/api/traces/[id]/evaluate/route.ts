import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateTraceWithJudge } from "@/lib/eval-engine";
import { TraceRunData } from "@/lib/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params;
    const body = await req.json().catch(() => ({}));
    const judgeModel = body.judgeModel || "deepseek-r1-distill";

    const trace = await prisma.traceRun.findUnique({
      where: { id: traceId },
      include: {
        nodes: { orderBy: { stepIndex: "asc" } },
        edges: true,
        evaluations: true,
      },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const traceData: TraceRunData = {
      ...trace,
      status: (trace.status as any) || "COMPLETED",
      tags: JSON.parse(trace.tags || "[]"),
      nodes: trace.nodes.map((n) => ({
        ...n,
        type: n.type as any,
        status: n.status as any,
        rawInput: n.rawInput ? JSON.parse(n.rawInput) : null,
        rawOutput: n.rawOutput ? JSON.parse(n.rawOutput) : null,
      })) as any,
      edges: trace.edges as any,
    };

    const report = evaluateTraceWithJudge(traceData, judgeModel);

    // Persist into database
    const savedEval = await prisma.traceEvaluation.create({
      data: {
        traceRunId: traceId,
        evaluator: report.evaluatorName,
        rating: report.overallRating,
        verdict: report.verdict,
        feedback: report.judgeCritique,
      },
    });

    return NextResponse.json({
      success: true,
      report,
      evaluationId: savedEval.id,
    });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run automated evaluation" },
      { status: 500 }
    );
  }
}
