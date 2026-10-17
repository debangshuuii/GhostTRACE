import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ConversationSessionData } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const targetSessionId = searchParams.get("sessionId");

    const whereClause: any = {
      sessionId: targetSessionId ? targetSessionId : { not: null },
    };
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    // Fetch all trace runs that belong to a session
    const traces = await prisma.traceRun.findMany({
      where: whereClause,
      include: {
        nodes: true,
        edges: true,
        evaluations: true,
      },
      orderBy: [
        { sessionId: "asc" },
        { turnIndex: "asc" },
        { createdAt: "asc" },
      ],
    });

    // Group traces by sessionId
    const sessionMap = new Map<string, ConversationSessionData>();

    for (const trace of traces) {
      const sId = trace.sessionId || "orphan-session";
      if (!sessionMap.has(sId)) {
        sessionMap.set(sId, {
          sessionId: sId,
          title: `Session: ${trace.title}`,
          agentName: trace.agentName,
          model: trace.model,
          turnCount: 0,
          totalTokens: 0,
          totalCost: 0,
          ghostBranchCount: 0,
          durationMs: 0,
          lastTurnAt: trace.createdAt,
          traces: [],
        });
      }

      const s = sessionMap.get(sId)!;
      s.turnCount += 1;
      s.totalTokens += trace.totalTokens;
      s.totalCost = Number((s.totalCost + trace.costEstimate).toFixed(5));
      s.ghostBranchCount += trace.ghostBranchCount;
      s.durationMs += trace.durationMs;
      if (new Date(trace.createdAt) > new Date(s.lastTurnAt)) {
        s.lastTurnAt = trace.createdAt;
      }
      let parsedTags: string[] = [];
      try {
        parsedTags = typeof trace.tags === "string" ? JSON.parse(trace.tags || "[]") : (trace.tags || []);
      } catch {
        parsedTags = [];
      }

      s.traces.push({
        ...trace,
        tags: parsedTags,
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
            status: n.status as any,
            type: n.type as any,
          };
        }),
        edges: trace.edges.map((e) => ({
          ...e,
          type: e.type as any,
        })),
      } as any);
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastTurnAt).getTime() - new Date(a.lastTurnAt).getTime()
    );

    if (targetSessionId) {
      const single = sessions.find((s) => s.sessionId === targetSessionId);
      if (!single) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json(single);
    }

    return NextResponse.json(sessions);
  } catch (err: any) {
    console.error("Failed to fetch conversation sessions:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch conversation sessions" },
      { status: 500 }
    );
  }
}
