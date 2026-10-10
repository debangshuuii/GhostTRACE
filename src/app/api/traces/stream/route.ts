import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/auth-guard";
import { traceEventBus } from "@/lib/trace-event-bus";

export async function POST(req: Request) {
  try {
    const auth = await validateApiKey(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const { event, traceId, data } = body;

    if (event === "TRACE_START") {
      const trace = await prisma.traceRun.create({
        data: {
          title: data.title || "Live Streaming Agent Trace",
          agentName: data.agentName || "Autonomous Agent",
          model: data.model || "gpt-4o",
          status: "RUNNING",
          tags: JSON.stringify(data.tags || ["live-stream"]),
          description: data.description || "Ingested via GhostTRACE Streaming API",
        },
      });

      traceEventBus.emit("trace_update", {
        event: "TRACE_START",
        trace: { ...trace, nodes: [], edges: [] },
      });

      return NextResponse.json({ success: true, traceId: trace.id }, { status: 201 });
    }

    if (event === "NODE_ADDED") {
      if (!traceId) {
        return NextResponse.json({ error: "traceId required for NODE_ADDED" }, { status: 400 });
      }

      const node = await prisma.traceNode.create({
        data: {
          traceRunId: traceId,
          nodeId: data.nodeId || `node-${Date.now().toString().slice(-6)}`,
          stepIndex: data.stepIndex || 1,
          type: data.type || "THINKING",
          label: data.label || "Live Step",
          role: data.role || "assistant",
          content: data.content || "",
          rawInput: data.rawInput ? JSON.stringify(data.rawInput) : null,
          rawOutput: data.rawOutput ? JSON.stringify(data.rawOutput) : null,
          latencyMs: data.latencyMs || 0,
          tokens: data.tokens || 0,
          cost: data.cost || 0,
          status: data.isGhost ? "PRUNED" : "SUCCESS",
          isGhost: Boolean(data.isGhost),
          ghostReason: data.ghostReason || null,
          confidenceScore: data.confidenceScore || 0.9,
          positionX: data.positionX || 300,
          positionY: data.positionY || 200,
        },
      });

      // If edge provided
      let createdEdge = null;
      if (data.parentNodeId) {
        createdEdge = await prisma.traceEdge.create({
          data: {
            traceRunId: traceId,
            edgeId: `edge-${data.parentNodeId}-${node.nodeId}`,
            source: data.parentNodeId,
            target: node.nodeId,
            type: data.isGhost ? "GHOST_PRUNED" : "DEFAULT",
            label: data.isGhost ? "Pruned Ghost" : "Next",
            isGhost: Boolean(data.isGhost),
          },
        });
      }

      // Update trace stats
      await prisma.traceRun.update({
        where: { id: traceId },
        data: {
          totalTokens: { increment: data.tokens || 0 },
          ghostBranchCount: data.isGhost ? { increment: 1 } : undefined,
          durationMs: { increment: data.latencyMs || 0 },
        },
      });

      traceEventBus.emit("trace_update", {
        event: "NODE_ADDED",
        traceId,
        node,
        edge: createdEdge,
      });

      return NextResponse.json({ success: true, node, edge: createdEdge }, { status: 201 });
    }

    if (event === "TRACE_END") {
      if (!traceId) {
        return NextResponse.json({ error: "traceId required" }, { status: 400 });
      }
      const updated = await prisma.traceRun.update({
        where: { id: traceId },
        data: {
          status: data?.status || "COMPLETED",
        },
      });

      traceEventBus.emit("trace_update", {
        event: "TRACE_END",
        traceId,
        status: updated.status,
      });

      return NextResponse.json({ success: true, traceId, status: updated.status });
    }

    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  } catch (error: any) {
    console.error("Streaming ingestion error:", error);
    return NextResponse.json({ error: error.message || "Failed to process stream" }, { status: 500 });
  }
}
