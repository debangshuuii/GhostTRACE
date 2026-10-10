import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { TraceUploadSchema } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let traceData: any = null;

    if (file.name.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(buffer);
      // Search for any json file in the archive
      let targetFileName = "trace.json";
      if (!zip.files[targetFileName]) {
        const found = Object.keys(zip.files).find((name) => name.endsWith(".json") && !name.startsWith("__MACOSX"));
        if (found) targetFileName = found;
      }

      if (!zip.files[targetFileName]) {
        return NextResponse.json(
          { error: "No JSON trace file found in uploaded ZIP archive." },
          { status: 400 }
        );
      }

      const jsonStr = await zip.files[targetFileName].async("string");
      traceData = JSON.parse(jsonStr);
    } else if (file.name.endsWith(".json")) {
      const jsonStr = buffer.toString("utf-8");
      traceData = JSON.parse(jsonStr);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .json or .zip archive." },
        { status: 400 }
      );
    }

    const validated = TraceUploadSchema.parse(traceData);
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
      },
    });

    return NextResponse.json({ success: true, trace }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process trace archive" },
      { status: 400 }
    );
  }
}
