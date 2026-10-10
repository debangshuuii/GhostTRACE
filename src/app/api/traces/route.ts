import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedTracesIfEmpty } from "@/lib/seed";
import { TraceUploadSchema } from "@/lib/types";

export async function GET(req: Request) {
  try {
    // Automatically seed if the database is brand new
    await seedTracesIfEmpty();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const model = searchParams.get("model");
    const status = searchParams.get("status");

    const traces = await prisma.traceRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        nodes: {
          orderBy: { stepIndex: "asc" },
        },
        edges: true,
        evaluations: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { nodes: true, edges: true, evaluations: true },
        },
      },
    });

    let filtered = traces.map((t) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(t.tags || "[]");
      } catch {
        tags = [];
      }
      return {
        ...t,
        tags,
        nodes: (t.nodes || []).map((n) => {
          let parsedInput = null;
          let parsedOutput = null;
          try {
            if (n.rawInput) parsedInput = typeof n.rawInput === "string" ? JSON.parse(n.rawInput) : n.rawInput;
          } catch {
            parsedInput = n.rawInput;
          }
          try {
            if (n.rawOutput) parsedOutput = typeof n.rawOutput === "string" ? JSON.parse(n.rawOutput) : n.rawOutput;
          } catch {
            parsedOutput = n.rawOutput;
          }
          return {
            ...n,
            rawInput: parsedInput,
            rawOutput: parsedOutput,
          };
        }),
        edges: t.edges || [],
      };
    });

    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.agentName.toLowerCase().includes(query) ||
          t.model.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (model && model !== "all") {
      filtered = filtered.filter((t) => t.model.toLowerCase() === model.toLowerCase());
    }

    if (status && status !== "all") {
      filtered = filtered.filter((t) => t.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error("Failed to fetch traces:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch traces" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = TraceUploadSchema.parse(body);

    const ghostCount = validated.nodes.filter((n) => n.isGhost).length;
    const totalTokens =
      validated.totalTokens ||
      validated.nodes.reduce((acc, n) => acc + (n.tokens || 0), 0);
    const durationMs =
      validated.durationMs ||
      validated.nodes.reduce((acc, n) => acc + (n.latencyMs || 0), 0);
    const costEstimate =
      validated.costEstimate ||
      validated.nodes.reduce((acc, n) => acc + (n.cost || 0), 0);

    const trace = await prisma.traceRun.create({
      data: {
        title: validated.title,
        agentName: validated.agentName,
        model: validated.model,
        status: validated.status,
        totalTokens,
        promptTokens: validated.promptTokens || Math.round(totalTokens * 0.4),
        completionTokens: validated.completionTokens || Math.round(totalTokens * 0.35),
        reasoningTokens: validated.reasoningTokens || Math.round(totalTokens * 0.25),
        costEstimate,
        durationMs,
        ghostBranchCount: ghostCount,
        tags: JSON.stringify(validated.tags || []),
        description: validated.description,
        nodes: {
          create: validated.nodes.map((node, index) => ({
            nodeId: node.nodeId || `step-${index + 1}`,
            stepIndex: node.stepIndex ?? index + 1,
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
            isGhost: node.isGhost ?? false,
            ghostReason: node.ghostReason,
            confidenceScore: node.confidenceScore,
            positionX: node.positionX ?? (index + 1) * 260,
            positionY: node.isGhost ? 80 : 240,
          })),
        },
        edges: {
          create: validated.edges.map((edge, i) => ({
            edgeId: edge.edgeId || `edge-${i + 1}`,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label,
            isGhost: edge.isGhost ?? false,
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
        evaluations: true,
      },
    });

    return NextResponse.json(trace, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create trace:", error);
    return NextResponse.json({ error: error.message || "Failed to create trace" }, { status: 400 });
  }
}
