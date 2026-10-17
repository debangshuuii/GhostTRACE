import { NextResponse } from "next/server";
import { runRedGhostSimulation } from "@/lib/red-ghost-engine";
import { TraceRunData } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trace, traceId, intensity = "deep" } = body;

    let targetTrace: TraceRunData | null = trace || null;

    if (!targetTrace && traceId) {
      const dbTrace = await prisma.traceRun.findUnique({
        where: { id: traceId },
        include: {
          nodes: { orderBy: { stepIndex: "asc" } },
          edges: true,
          evaluations: true,
        },
      });

      if (dbTrace) {
        targetTrace = {
          ...dbTrace,
          tags: typeof dbTrace.tags === "string" ? JSON.parse(dbTrace.tags || "[]") : dbTrace.tags,
          nodes: dbTrace.nodes.map((n) => {
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
              status: n.status as any,
              type: n.type as any,
            };
          }),
          edges: dbTrace.edges.map((e) => ({
            ...e,
            type: e.type as any,
          })),
        } as TraceRunData;
      }
    }

    // Run simulation
    const report = runRedGhostSimulation(targetTrace, intensity);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error("Error running Red-Ghost adversarial simulation:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute Red-Ghost simulation" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const intensity = (searchParams.get("intensity") as "quick" | "deep" | "hardened") || "deep";
    const traceId = searchParams.get("traceId");

    let targetTrace: TraceRunData | null = null;
    if (traceId) {
      const dbTrace = await prisma.traceRun.findUnique({
        where: { id: traceId },
        include: {
          nodes: { orderBy: { stepIndex: "asc" } },
          edges: true,
        },
      });
      if (dbTrace) {
        targetTrace = {
          ...dbTrace,
          tags: typeof dbTrace.tags === "string" ? JSON.parse(dbTrace.tags || "[]") : dbTrace.tags,
          nodes: dbTrace.nodes.map((n) => ({
            ...n,
            status: n.status as any,
            type: n.type as any,
          })),
          edges: dbTrace.edges.map((e) => ({
            ...e,
            type: e.type as any,
          })),
        } as TraceRunData;
      }
    }

    const report = runRedGhostSimulation(targetTrace, intensity);
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch Red-Ghost baseline" },
      { status: 500 }
    );
  }
}

