import { NextResponse } from "next/server";
import { storageOrchestrator, StorageEngineType } from "@/lib/storage";

export async function GET() {
  try {
    const diagnostics = await storageOrchestrator.getDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch storage diagnostics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "switch_engine";

    if (action === "switch_engine") {
      const engine = body.engine as StorageEngineType;
      if (!["prisma", "clickhouse", "timescaledb", "dual"].includes(engine)) {
        return NextResponse.json({ error: "Invalid storage engine specified" }, { status: 400 });
      }
      storageOrchestrator.setActiveEngine(engine);
      const diagnostics = await storageOrchestrator.getDiagnostics();
      return NextResponse.json({
        success: true,
        message: `Switched active storage engine to [${engine}].`,
        diagnostics,
      });
    }

    if (action === "init_schema") {
      const engine = (body.engine || "clickhouse") as StorageEngineType;
      const adapter = storageOrchestrator.getAdapter(engine);
      const result = await adapter.init();
      return NextResponse.json(result);
    }

    if (action === "benchmark") {
      const engine = (body.engine || storageOrchestrator.getActiveEngine()) as StorageEngineType;
      const spanCount = Number(body.spanCount) || 2000;
      const benchResult = await storageOrchestrator.benchmarkEngine(engine, spanCount);
      return NextResponse.json(benchResult);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Storage operation failed" },
      { status: 500 }
    );
  }
}
