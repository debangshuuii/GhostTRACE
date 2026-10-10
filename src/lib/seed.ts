import { prisma } from "./prisma";
import { MOCK_TRACES } from "./mock-traces";

export async function seedTracesIfEmpty() {
  const count = await prisma.traceRun.count();
  if (count > 0) {
    return { seeded: false, count };
  }

  for (const trace of MOCK_TRACES) {
    await prisma.traceRun.create({
      data: {
        id: trace.id,
        title: trace.title,
        agentName: trace.agentName,
        model: trace.model,
        status: trace.status,
        totalTokens: trace.totalTokens,
        promptTokens: trace.promptTokens,
        completionTokens: trace.completionTokens,
        reasoningTokens: trace.reasoningTokens,
        costEstimate: trace.costEstimate,
        durationMs: trace.durationMs,
        ghostBranchCount: trace.ghostBranchCount,
        tags: JSON.stringify(trace.tags),
        description: trace.description,
        createdAt: new Date(trace.createdAt),
        nodes: {
          create: trace.nodes.map((node) => ({
            nodeId: node.nodeId,
            stepIndex: node.stepIndex,
            type: node.type,
            label: node.label,
            role: node.role,
            content: node.content,
            rawInput: node.rawInput ? JSON.stringify(node.rawInput) : null,
            rawOutput: node.rawOutput ? JSON.stringify(node.rawOutput) : null,
            latencyMs: node.latencyMs ?? 0,
            tokens: node.tokens ?? 0,
            cost: node.cost ?? 0,
            status: node.status,
            isGhost: node.isGhost,
            ghostReason: node.ghostReason,
            confidenceScore: node.confidenceScore,
            positionX: node.positionX ?? 0,
            positionY: node.positionY ?? 0,
          })),
        },
        edges: {
          create: trace.edges.map((edge) => ({
            edgeId: edge.edgeId,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label,
            isGhost: edge.isGhost ?? false,
          })),
        },
        evaluations: {
          create: (trace.evaluations || []).map((ev) => ({
            evaluator: ev.evaluator,
            rating: ev.rating,
            verdict: ev.verdict,
            feedback: ev.feedback,
            createdAt: ev.createdAt ? new Date(ev.createdAt) : new Date(),
          })),
        },
      },
    });
  }

  return { seeded: true, count: MOCK_TRACES.length };
}
