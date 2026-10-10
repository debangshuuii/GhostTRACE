import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TraceNodeData, TraceEdgeData } from "@/lib/types";
import { validateApiKey } from "@/lib/auth-guard";

interface LangChainRun {
  id?: string;
  name?: string;
  run_type?: string;
  inputs?: any;
  outputs?: any;
  error?: string;
  start_time?: number | string;
  end_time?: number | string;
  extra?: {
    metadata?: {
      model?: string;
      agent_name?: string;
      is_ghost?: boolean;
      ghost_reason?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  child_runs?: LangChainRun[];
  parent_run_id?: string;
}

export async function POST(req: Request) {
  try {
    const auth = await validateApiKey(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = (await req.json()) as LangChainRun;

    const flattened: LangChainRun[] = [];
    function flatten(run: LangChainRun) {
      flattened.push(run);
      if (run.child_runs && Array.isArray(run.child_runs)) {
        for (const child of run.child_runs) {
          flatten(child);
        }
      }
    }
    flatten(body);

    if (flattened.length === 0) {
      return NextResponse.json({ error: "Empty LangChain run payload" }, { status: 400 });
    }

    const title = body.inputs?.input || body.name || "LangChain / LangGraph Agent Execution";
    const agentName = body.extra?.metadata?.agent_name || body.name || "LangChain Agent";
    const model = body.extra?.metadata?.model || "claude-3-7-sonnet";

    const nodes: TraceNodeData[] = [];
    const edges: TraceEdgeData[] = [];

    flattened.forEach((run, index) => {
      const nodeId = run.id || `lc-${index + 1}`;
      const isGhost = Boolean(run.extra?.metadata?.is_ghost || run.error?.includes("Critic Veto") || false);
      const ghostReason = run.extra?.metadata?.ghost_reason || (isGhost ? run.error || "Critic pruned hypothesis" : undefined);

      let nodeType: TraceNodeData["type"] = "THINKING";
      if (index === 0) {
        nodeType = "USER_PROMPT";
      } else if (isGhost) {
        nodeType = "GHOST_REJECTED";
      } else if (run.run_type === "tool") {
        nodeType = "TOOL_CALL";
      } else if (run.run_type === "llm" || index === flattened.length - 1) {
        nodeType = "LLM_RESPONSE";
      }

      let content = "";
      if (typeof run.outputs?.output === "string") {
        content = run.outputs.output;
      } else if (typeof run.inputs?.input === "string") {
        content = run.inputs.input;
      } else {
        content = JSON.stringify(run.outputs || run.inputs || `${run.name} executed`);
      }

      nodes.push({
        nodeId,
        stepIndex: index + 1,
        type: nodeType,
        label: run.name || `Step #${index + 1}`,
        role: isGhost ? "assistant" : index === 0 ? "user" : "assistant",
        content,
        rawInput: run.inputs || null,
        rawOutput: run.outputs || null,
        latencyMs: 350,
        tokens: 650,
        cost: 0.002,
        status: isGhost ? "PRUNED" : run.error ? "ERROR" : "SUCCESS",
        isGhost,
        ghostReason,
        confidenceScore: isGhost ? 0.4 : 0.95,
        positionX: 50 + index * 260,
        positionY: isGhost ? 80 : 220,
      });

      if (run.parent_run_id && nodes.some((n) => n.nodeId === run.parent_run_id)) {
        edges.push({
          edgeId: `edge-${run.parent_run_id}-${nodeId}`,
          source: run.parent_run_id,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "Pruned Alternative" : "Next",
          isGhost,
        });
      } else if (index > 0) {
        const prevNode = nodes[index - 1];
        edges.push({
          edgeId: `edge-${prevNode.nodeId}-${nodeId}`,
          source: prevNode.nodeId,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "Pruned Alternative" : "Next",
          isGhost,
        });
      }
    });

    const ghostCount = nodes.filter((n) => n.isGhost).length;
    const totalTokens = nodes.reduce((acc, n) => acc + (n.tokens || 0), 0);
    const durationMs = nodes.reduce((acc, n) => acc + (n.latencyMs || 0), 0);
    const costEstimate = nodes.reduce((acc, n) => acc + (n.cost || 0), 0);

    const created = await prisma.traceRun.create({
      data: {
        workspaceId: auth.apiKey?.workspaceId || (body as any).workspaceId || null,
        title,
        agentName,
        model,
        status: "COMPLETED",
        totalTokens,
        promptTokens: Math.round(totalTokens * 0.25),
        completionTokens: Math.round(totalTokens * 0.35),
        reasoningTokens: Math.round(totalTokens * 0.4),
        costEstimate,
        durationMs,
        ghostBranchCount: ghostCount,
        tags: JSON.stringify(["langchain", "langgraph", "live-ingestion"]),
        description: `Ingested from LangChain/LangGraph run callback (${nodes.length} steps)`,
        nodes: {
          create: nodes.map((node) => ({
            nodeId: node.nodeId,
            stepIndex: node.stepIndex,
            type: node.type,
            label: node.label,
            role: node.role,
            content: node.content,
            rawInput: node.rawInput ? JSON.stringify(node.rawInput) : null,
            rawOutput: node.rawOutput ? JSON.stringify(node.rawOutput) : null,
            latencyMs: node.latencyMs,
            tokens: node.tokens,
            cost: node.cost,
            status: node.status,
            isGhost: node.isGhost,
            ghostReason: node.ghostReason || null,
            confidenceScore: node.confidenceScore || null,
            positionX: node.positionX,
            positionY: node.positionY,
          })),
        },
        edges: {
          create: edges.map((edge) => ({
            edgeId: edge.edgeId,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label || null,
            isGhost: edge.isGhost,
          })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      traceId: created.id,
      nodesIngested: nodes.length,
      ghostsDetected: ghostCount,
    }, { status: 201 });
  } catch (error: any) {
    console.error("LangChain ingestion error:", error);
    return NextResponse.json({ error: error.message || "Failed to ingest LangChain run" }, { status: 400 });
  }
}
