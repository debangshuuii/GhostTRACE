import { TraceRunData, TraceNodeData } from "../types";

export type StorageEngineType = "prisma" | "clickhouse" | "timescaledb" | "dual";

export interface StorageConfig {
  engine: StorageEngineType;
  clickhouse?: {
    host: string;
    database: string;
    user?: string;
    password?: string;
  };
  timescaledb?: {
    url: string;
    hypertablePrefix?: string;
  };
}

export interface StorageStatus {
  engine: StorageEngineType;
  isReady: boolean;
  latencyMs: number;
  rowCount: {
    traces: number;
    nodes: number;
  };
  details: string;
  features: string[];
}

export interface FleetAggregates {
  totalTraces: number;
  totalTokens: number;
  reasoningTokens: number;
  totalCost: number;
  totalGhostBranches: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  modelsBreakdown: Array<{
    model: string;
    traceCount: number;
    avgTokens: number;
    ghostCount: number;
  }>;
  hourlyThroughput?: Array<{
    timeBucket: string;
    throughputPerSec: number;
    tokensPerSec: number;
  }>;
}

export interface BenchmarkResult {
  engine: StorageEngineType;
  spansIngested: number;
  durationMs: number;
  throughputSpansPerSec: number;
  batchLatencyMs: number;
  success: boolean;
  notes: string;
}

export interface IStorageAdapter {
  readonly name: StorageEngineType;
  init(): Promise<{ success: boolean; message: string }>;
  ping(): Promise<{ alive: boolean; latencyMs: number }>;
  ingestTrace(trace: TraceRunData): Promise<void>;
  ingestNodes(traceId: string, nodes: TraceNodeData[]): Promise<void>;
  getTraces(filters?: {
    workspaceId?: string;
    model?: string;
    status?: string;
    limit?: number;
  }): Promise<TraceRunData[]>;
  getTraceById(id: string): Promise<TraceRunData | null>;
  getFleetAggregates(workspaceId?: string): Promise<FleetAggregates>;
  runBenchmark(spanCount?: number): Promise<BenchmarkResult>;
}
