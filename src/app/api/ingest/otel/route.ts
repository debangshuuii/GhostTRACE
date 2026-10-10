import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseOtelPayload } from "@/lib/otel-parser";
import { validateApiKey } from "@/lib/auth-guard";

export async function POST(req: Request) {
  try {
    const auth = await validateApiKey(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await req.json();
    const traceData = parseOtelPayload(body);

    const ghostCount = traceData.nodes.filter((n: any) => n.isGhost).length;
    const totalTokens = traceData.nodes.reduce((acc: number, n: any) => acc + (n.tokens || 0), 0);
    const durationMs = traceData.nodes.reduce((acc: number, n: any) => acc + (n.latencyMs || 0), 0);
    const costEstimate = traceData.nodes.reduce((acc: number, n: any) => acc + (n.cost || 0), 0);

    const created = await prisma.traceRun.create({
      data: {
        workspaceId: auth.apiKey?.workspaceId || body.workspaceId || null,
        title: traceData.title || "OpenTelemetry Ingested Trace",
        agentName: traceData.agentName || "OTel Collector",
        model: traceData.model || "otel-service",
        status: "COMPLETED",
        totalTokens,
        promptTokens: Math.round(totalTokens * 0.25),
        completionTokens: Math.round(totalTokens * 0.35),
        reasoningTokens: Math.round(totalTokens * 0.4),
        costEstimate,
        durationMs,
        ghostBranchCount: ghostCount,
        tags: JSON.stringify(traceData.tags || ["otel"]),
        description: traceData.description,
        nodes: {
          create: traceData.nodes.map((node: any, index: number) => ({
            nodeId: node.nodeId,
            stepIndex: node.stepIndex || index + 1,
            type: node.type,
            label: node.label,
            role: node.role || "assistant",
            content: node.content,
            rawInput: node.rawInput ? JSON.stringify(node.rawInput) : null,
            rawOutput: node.rawOutput ? JSON.stringify(node.rawOutput) : null,
            latencyMs: node.latencyMs || 0,
            tokens: node.tokens || 0,
            cost: node.cost || 0,
            status: node.status || "SUCCESS",
            isGhost: node.isGhost || false,
            ghostReason: node.ghostReason || null,
            confidenceScore: node.confidenceScore || null,
            positionX: node.positionX || 50 + index * 260,
            positionY: node.positionY || (node.isGhost ? 80 : 220),
          })),
        },
        edges: {
          create: traceData.edges.map((edge: any) => ({
            edgeId: edge.edgeId,
            source: edge.source,
            target: edge.target,
            type: edge.type || "DEFAULT",
            label: edge.label || null,
            isGhost: edge.isGhost || false,
          })),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        traceId: created.id,
        nodesIngested: traceData.nodes.length,
        ghostsDetected: ghostCount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("OpenTelemetry ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest OpenTelemetry spans" },
      { status: 400 }
    );
  }
}
