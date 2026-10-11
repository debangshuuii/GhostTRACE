import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMCPPayload, generateMockMCPTrace, isMCPPayload } from "@/lib/mcp-parser";
import { validateApiKey } from "@/lib/auth-guard";


/**
 * GET /api/ingest/mcp
 * Returns protocol handshake & documentation for Model Context Protocol integration
 */
export async function GET() {
  return NextResponse.json({
    protocol: "Model Context Protocol (MCP) Ingestion Bridge",
    version: "2024-11-05",
    supportedMethods: [
      "tools/list",
      "tools/call",
      "resources/list",
      "resources/read",
      "prompts/list",
      "prompts/get",
      "initialize",
    ],
    sampleIngestFormat: {
      clientName: "Claude Desktop / Cursor / Cline",
      serverName: "postgres-mcp-server",
      model: "claude-3-7-sonnet",
      exchanges: [
        {
          method: "tools/call",
          request: { name: "execute_query", arguments: { sql: "SELECT 1;" } },
          response: { rows: [{ "?column?": 1 }] },
          isGhost: false,
          latencyMs: 120,
        },
      ],
    },
    demoEndpoint: "POST /api/ingest/mcp with { sample: true } to instantly generate a demo MCP trace",
  });
}

/**
 * POST /api/ingest/mcp
 * Ingests MCP JSON-RPC 2.0 messages, exchanges, or sample test data
 */
export async function POST(req: Request) {
  try {
    const auth = await validateApiKey(req);
    // Allow development test requests or authenticated users
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let traceData;
    if (body.sample === true || Object.keys(body).length === 0) {
      traceData = generateMockMCPTrace();
    } else {
      traceData = parseMCPPayload(body);
    }

    const ghostCount = traceData.nodes.filter((n) => n.isGhost).length;
    const totalTokens = traceData.nodes.reduce((acc, n) => acc + (n.tokens || 0), 0);
    const durationMs = traceData.nodes.reduce((acc, n) => acc + (n.latencyMs || 0), 0);
    const costEstimate = traceData.nodes.reduce((acc, n) => acc + (n.cost || 0), 0);

    const created = await prisma.traceRun.create({
      data: {
        workspaceId: auth.apiKey?.workspaceId || body.workspaceId || null,
        title: traceData.title || "MCP Ingested Agent Trace",
        agentName: traceData.agentName || "MCP Client Host",
        model: traceData.model || "claude-3-7-sonnet",
        status: "COMPLETED",
        totalTokens,
        promptTokens: Math.round(totalTokens * 0.3),
        completionTokens: Math.round(totalTokens * 0.4),
        reasoningTokens: Math.round(totalTokens * 0.3),
        costEstimate,
        durationMs,
        ghostBranchCount: ghostCount,
        tags: JSON.stringify(traceData.tags || ["mcp", "model-context-protocol"]),
        description: traceData.description || "Ingested Model Context Protocol session",
        nodes: {
          create: traceData.nodes.map((node, index) => ({
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
            positionY: node.positionY || (node.isGhost ? 60 : 200),
          })),
        },
        edges: {
          create: traceData.edges.map((edge) => ({
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
        traceTitle: created.title,
        nodesIngested: traceData.nodes.length,
        ghostBranchesDetected: ghostCount,
        totalTokens,
        costEstimate,
        message: "Model Context Protocol trace ingested successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("MCP ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to ingest Model Context Protocol payload" },
      { status: 400 }
    );
  }
}
