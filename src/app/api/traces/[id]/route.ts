import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trace = await prisma.traceRun.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { stepIndex: "asc" },
        },
        edges: true,
        evaluations: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!trace) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    // Safely parse JSON string fields
    let tags: string[] = [];
    try {
      tags = JSON.parse(trace.tags || "[]");
    } catch {
      tags = [];
    }

    const parsed = {
      ...trace,
      tags,
      nodes: trace.nodes.map((n) => {
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
    };

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Failed to fetch trace details:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch trace" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.traceRun.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Failed to delete trace:", error);
    return NextResponse.json({ error: error.message || "Failed to delete trace" }, { status: 500 });
  }
}
