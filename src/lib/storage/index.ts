import {
  IStorageAdapter,
  StorageEngineType,
  StorageStatus,
  FleetAggregates,
  BenchmarkResult,
} from "./storage-adapter.interface";
import { ClickHouseAdapter } from "./clickhouse-adapter";
import { TimescaleDBAdapter } from "./timescaledb-adapter";
import { PrismaAdapter } from "./prisma-adapter";
import { TraceRunData, TraceNodeData } from "../types";

export class StorageOrchestrator {
  private activeEngine: StorageEngineType;
  private prismaAdapter: PrismaAdapter;
  private clickhouseAdapter: ClickHouseAdapter;
  private timescaledbAdapter: TimescaleDBAdapter;

  constructor() {
    const envEngine = (process.env.STORAGE_ENGINE || "prisma").toLowerCase() as StorageEngineType;
    this.activeEngine = ["prisma", "clickhouse", "timescaledb", "dual"].includes(envEngine)
      ? envEngine
      : "prisma";

    this.prismaAdapter = new PrismaAdapter();
    this.clickhouseAdapter = new ClickHouseAdapter();
    this.timescaledbAdapter = new TimescaleDBAdapter();
  }

  public getActiveEngine(): StorageEngineType {
    return this.activeEngine;
  }

  public setActiveEngine(engine: StorageEngineType) {
    this.activeEngine = engine;
  }

  public getAdapter(engine?: StorageEngineType): IStorageAdapter {
    const target = engine || this.activeEngine;
    switch (target) {
      case "clickhouse":
        return this.clickhouseAdapter;
      case "timescaledb":
        return this.timescaledbAdapter;
      case "prisma":
      case "dual":
      default:
        return this.prismaAdapter;
    }
  }

  /**
   * Bulk ingest trace.
   * If in 'dual' mode, writes to both Prisma AND ClickHouse!
   */
  public async ingestTrace(trace: TraceRunData): Promise<void> {
    if (this.activeEngine === "dual") {
      await Promise.allSettled([
        this.prismaAdapter.ingestTrace(trace),
        this.clickhouseAdapter.ingestTrace(trace),
      ]);
      return;
    }

    const adapter = this.getAdapter();
    await adapter.ingestTrace(trace);
  }

  /**
   * Bulk ingest nodes.
   */
  public async ingestNodes(traceId: string, nodes: TraceNodeData[]): Promise<void> {
    if (this.activeEngine === "dual") {
      await Promise.allSettled([
        this.prismaAdapter.ingestNodes(traceId, nodes),
        this.clickhouseAdapter.ingestNodes(traceId, nodes),
      ]);
      return;
    }

    const adapter = this.getAdapter();
    await adapter.ingestNodes(traceId, nodes);
  }

  /**
   * Query traces from the primary storage engine.
   */
  public async getTraces(filters?: {
    workspaceId?: string;
    model?: string;
    status?: string;
    limit?: number;
  }): Promise<TraceRunData[]> {
    const adapter = this.getAdapter();
    return await adapter.getTraces(filters);
  }

  /**
   * Fetch complete trace with nodes.
   */
  public async getTraceById(id: string): Promise<TraceRunData | null> {
    const adapter = this.getAdapter();
    return await adapter.getTraceById(id);
  }

  /**
   * Get fleet aggregates from active engine (or fast columnar scan if clickhouse).
   */
  public async getFleetAggregates(workspaceId?: string): Promise<FleetAggregates> {
    const adapter = this.getAdapter();
    return await adapter.getFleetAggregates(workspaceId);
  }

  /**
   * Inspect all available storage engines and return comprehensive diagnostics.
   */
  public async getDiagnostics(): Promise<{
    activeEngine: StorageEngineType;
    engines: Record<StorageEngineType, StorageStatus>;
  }> {
    const [prismaPing, chPing, tsPing] = await Promise.all([
      this.prismaAdapter.ping(),
      this.clickhouseAdapter.ping(),
      this.timescaledbAdapter.ping(),
    ]);

    return {
      activeEngine: this.activeEngine,
      engines: {
        prisma: {
          engine: "prisma",
          isReady: prismaPing.alive,
          latencyMs: prismaPing.latencyMs,
          rowCount: { traces: 0, nodes: 0 },
          details: "SQLite relational engine with embedded zero-config persistence.",
          features: ["Zero-Config", "ACID", "Local File Storage", "Foreign Key Cascades"],
        },
        clickhouse: {
          engine: "clickhouse",
          isReady: chPing.alive,
          latencyMs: chPing.latencyMs,
          rowCount: { traces: 0, nodes: 0 },
          details: "Ultra-high-throughput columnar MergeTree engine for billions of AI spans.",
          features: ["Columnar Storage", "P95 Vector Aggregations", "100M+ Spans/Day", "Native Compression"],
        },
        timescaledb: {
          engine: "timescaledb",
          isReady: tsPing.alive,
          latencyMs: tsPing.latencyMs,
          rowCount: { traces: 0, nodes: 0 },
          details: "PostgreSQL time-series hypertables with automated chunk compression.",
          features: ["Hypertables", "Time-Bucket SQL", "Automated Compression Rollup", "Full SQL Joins"],
        },
        dual: {
          engine: "dual",
          isReady: prismaPing.alive && chPing.alive,
          latencyMs: Math.max(prismaPing.latencyMs, chPing.latencyMs),
          rowCount: { traces: 0, nodes: 0 },
          details: "Dual-write pipeline: Writes concurrently to SQLite for metadata and ClickHouse for telemetry.",
          features: ["Dual Ingestion", "Fault Tolerance", "Zero-Downtime Migration", "Hybrid Query Routing"],
        },
      },
    };
  }

  /**
   * Runs synthetic benchmark across engines.
   */
  public async benchmarkEngine(engine: StorageEngineType, spanCount: number = 2000): Promise<BenchmarkResult> {
    const adapter = this.getAdapter(engine);
    return await adapter.runBenchmark(spanCount);
  }
}

// Global singleton orchestrator
const globalForStorage = globalThis as unknown as {
  storageOrchestrator?: StorageOrchestrator;
};

export const storageOrchestrator =
  globalForStorage.storageOrchestrator ?? new StorageOrchestrator();

if (process.env.NODE_ENV !== "production") {
  globalForStorage.storageOrchestrator = storageOrchestrator;
}

export * from "./storage-adapter.interface";
export * from "./clickhouse-adapter";
export * from "./timescaledb-adapter";
export * from "./prisma-adapter";
