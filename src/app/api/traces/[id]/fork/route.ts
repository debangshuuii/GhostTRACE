import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params;
    const body = await req.json();

    const {
      parentStepId,
      branchTitle,
      branchType,
      alternativeContent,
      criticFeedback,
      isGhost,
      model,
    } = body;

    const trace = await prisma.traceRun.findUnique({
      where: { id: traceId },
      include: { nodes: true },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    const parentNode = trace.nodes.find((n) => n.nodeId === parentStepId);
    const parentIndex = parentNode ? parentNode.stepIndex : 1;
    const newStepIndex = parentIndex + 1;
    const newNodeId = `fork-${Date.now().toString().slice(-6)}`;

    // Create the new forked node
    const newNode = await prisma.traceNode.create({
      data: {
        traceRunId: traceId,
        nodeId: newNodeId,
        stepIndex: newStepIndex,
        type: branchType || (isGhost ? "GHOST_REJECTED" : "THINKING"),
        label: branchTitle || "Counterfactual Experiment Branch",
        content: alternativeContent,
        status: isGhost ? "PRUNED" : "SUCCESS",
        isGhost: Boolean(isGhost),
        ghostReason: isGhost ? criticFeedback : null,
        confidenceScore: isGhost ? 0.35 : 0.95,
        latencyMs: 950,
        tokens: 680,
        cost: 0.0025,
        positionX: parentNode ? parentNode.positionX + 320 : 600,
        positionY: parentNode ? parentNode.positionY + (isGhost ? -180 : 180) : 100,
      },
    });

    // Create edge connecting parent to forked node
    const newEdge = await prisma.traceEdge.create({
      data: {
        traceRunId: traceId,
        edgeId: `edge-${parentStepId}-${newNodeId}`,
        source: parentStepId,
        target: newNodeId,
        type: isGhost ? "GHOST_PRUNED" : "BRANCH",
        label: isGhost ? "Counterfactual (Pruned)" : "Forked Path",
        isGhost: Boolean(isGhost),
      },
    });

    // Update trace ghost count and tokens if needed
    if (isGhost) {
      await prisma.traceRun.update({
        where: { id: traceId },
        data: {
          ghostBranchCount: { increment: 1 },
          totalTokens: { increment: 680 },
        },
      });
    }

    return NextResponse.json({ success: true, node: newNode, edge: newEdge }, { status: 201 });
  } catch (error: any) {
    console.error("Fork branch error:", error);
    return NextResponse.json({ error: error.message || "Failed to fork branch" }, { status: 500 });
  }
}
