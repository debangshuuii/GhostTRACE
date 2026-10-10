import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { traceEventBus } from "@/lib/trace-event-bus";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, nodeId, overrideInput, vetoReason } = body;

    const trace = await prisma.traceRun.findUnique({
      where: { id },
      include: { nodes: true },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const targetNode = nodeId
      ? trace.nodes.find((n) => n.nodeId === nodeId)
      : trace.nodes.find((n) => n.stepIndex === trace.pausedStep);

    if (action === "RESUME") {
      await prisma.traceRun.update({
        where: { id },
        data: {
          isPaused: false,
          pausedStep: null,
          status: "RUNNING",
        },
      });

      if (targetNode) {
        await prisma.traceNode.update({
          where: { id: targetNode.id },
          data: {
            status: "SUCCESS",
            interventionVerdict: "RESUMED",
          },
        });
      }

      traceEventBus.emit("trace_update", {
        event: "BREAKPOINT_RESUMED",
        traceId: id,
        nodeId: targetNode?.nodeId,
      });

      return NextResponse.json({ success: true, action: "RESUME", traceId: id });
    }

    if (action === "OVERRIDE") {
      if (!overrideInput) {
        return NextResponse.json({ error: "overrideInput is required for OVERRIDE" }, { status: 400 });
      }

      await prisma.traceRun.update({
        where: { id },
        data: {
          isPaused: false,
          pausedStep: null,
          status: "RUNNING",
        },
      });

      if (targetNode) {
        await prisma.traceNode.update({
          where: { id: targetNode.id },
          data: {
            content: overrideInput,
            interventionInput: overrideInput,
            interventionVerdict: "OVERRIDDEN",
            status: "SUCCESS",
          },
        });
      }

      traceEventBus.emit("trace_update", {
        event: "BREAKPOINT_OVERRIDDEN",
        traceId: id,
        nodeId: targetNode?.nodeId,
        overrideInput,
      });

      return NextResponse.json({
        success: true,
        action: "OVERRIDE",
        traceId: id,
        overrideInput,
      });
    }

    if (action === "VETO") {
      const reason = vetoReason || "Human Operator Intercept: Hypothesis vetoed during live breakpoint.";

      await prisma.traceRun.update({
        where: { id },
        data: {
          isPaused: false,
          pausedStep: null,
          status: "RUNNING",
          ghostBranchCount: { increment: 1 },
        },
      });

      if (targetNode) {
        await prisma.traceNode.update({
          where: { id: targetNode.id },
          data: {
            isGhost: true,
            type: "GHOST_REJECTED",
            status: "PRUNED",
            ghostReason: reason,
            interventionVerdict: "VETOED",
          },
        });
      }

      traceEventBus.emit("trace_update", {
        event: "BREAKPOINT_VETOED",
        traceId: id,
        nodeId: targetNode?.nodeId,
        reason,
      });

      return NextResponse.json({
        success: true,
        action: "VETO",
        traceId: id,
        reason,
      });
    }

    return NextResponse.json({ error: "Invalid action. Must be RESUME, OVERRIDE, or VETO" }, { status: 400 });
  } catch (error: any) {
    console.error("Intervention error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process intervention" },
      { status: 500 }
    );
  }
}
