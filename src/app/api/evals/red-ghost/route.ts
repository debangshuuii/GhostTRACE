import { NextResponse } from "next/server";
import { runRedGhostSimulation } from "@/lib/red-ghost-engine";
import { TraceRunData } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trace, traceId, intensity = "deep" } = body;

    let targetTrace: TraceRunData | null = trace || null;

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

    const demoReport = runRedGhostSimulation(null, intensity);
    return NextResponse.json({
      success: true,
      report: demoReport,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch Red-Ghost baseline" },
      { status: 500 }
    );
  }
}
