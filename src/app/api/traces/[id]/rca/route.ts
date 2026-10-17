import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  analyzeRootCause,
  generateIncidentPostMortemMarkdown,
} from "@/lib/rca-engine";
import { TraceRunData } from "@/lib/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get("nodeId");

    const trace = await prisma.traceRun.findUnique({
      where: { id },
      include: {
        nodes: { orderBy: { stepIndex: "asc" } },
        edges: true,
      },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const rca = analyzeRootCause(trace as unknown as TraceRunData, nodeId);
    const markdown = generateIncidentPostMortemMarkdown(rca);

    return NextResponse.json({
      success: true,
      report: rca,
      markdown,
    });
  } catch (error: any) {
    console.error("Failed to run root cause analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate RCA" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { nodeId, trace } = body;

    let targetTrace: TraceRunData | null = trace || null;

    if (!targetTrace) {
      const dbTrace = await prisma.traceRun.findUnique({
        where: { id },
        include: {
          nodes: { orderBy: { stepIndex: "asc" } },
          edges: true,
        },
      });
      if (dbTrace) {
        targetTrace = dbTrace as unknown as TraceRunData;
      }
    }

    if (!targetTrace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const rca = analyzeRootCause(targetTrace, nodeId);
    const markdown = generateIncidentPostMortemMarkdown(rca);

    return NextResponse.json({
      success: true,
      report: rca,
      markdown,
    });
  } catch (error: any) {
    console.error("Failed to run root cause analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate RCA" },
      { status: 500 }
    );
  }
}
