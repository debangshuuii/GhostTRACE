import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { traceEventBus } from "@/lib/trace-event-bus";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const trace = await prisma.traceRun.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        isPaused: true,
        pausedStep: true,
      },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    let pausedNode = null;
    if (trace.isPaused && trace.pausedStep) {
      pausedNode = await prisma.traceNode.findFirst({
        where: { traceRunId: id, stepIndex: trace.pausedStep },
      });
    }

    return NextResponse.json({
      success: true,
      isPaused: trace.isPaused,
      pausedStep: trace.pausedStep,
      pausedNode,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch breakpoint status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nodeId, stepIndex, reason = "Breakpoint triggered by agent policy" } = body;

    // Update trace to PAUSED
    const updatedTrace = await prisma.traceRun.update({
      where: { id },
      data: {
        isPaused: true,
        pausedStep: stepIndex || 1,
        status: "PAUSED",
      },
    });

    let node = null;
    if (nodeId) {
      node = await prisma.traceNode.updateMany({
        where: { traceRunId: id, nodeId },
        data: {
          status: "PAUSED",
        },
      });
    }

    // Broadcast breakpoint event to UI via SSE
    traceEventBus.emit("trace_update", {
      event: "BREAKPOINT_HIT",
      traceId: id,
      nodeId,
      stepIndex: stepIndex || 1,
      reason,
    });

    return NextResponse.json({
      success: true,
      paused: true,
      traceId: id,
      nodeId,
      stepIndex,
      reason,
    });
  } catch (error: any) {
    console.error("Failed to trigger breakpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set breakpoint" },
      { status: 500 }
    );
  }
}
