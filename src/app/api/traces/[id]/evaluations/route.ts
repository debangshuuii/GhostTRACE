import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const EvaluationSchema = z.object({
  evaluator: z.string().default("Human Reviewer"),
  rating: z.number().min(1).max(5),
  verdict: z.enum(["OPTIMAL", "SUBOPTIMAL", "FAILED", "HALLUCINATION_DETECTED"]),
  feedback: z.string().min(1, "Feedback comment is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = EvaluationSchema.parse(body);

    const evaluation = await prisma.traceEvaluation.create({
      data: {
        traceRunId: id,
        evaluator: validated.evaluator,
        rating: validated.rating,
        verdict: validated.verdict,
        feedback: validated.feedback,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add evaluation:", error);
    return NextResponse.json({ error: error.message || "Failed to add evaluation" }, { status: 400 });
  }
}
