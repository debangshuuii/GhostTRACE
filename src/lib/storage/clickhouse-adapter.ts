import {
  IStorageAdapter,
  StorageEngineType,
  FleetAggregates,
  BenchmarkResult,
} from "./storage-adapter.interface";
import { TraceRunData, TraceNodeData } from "../types";

export interface ClickHouseOptions {
  host?: string;
  database?: string;
  user?: string;
  password?: string;
}

export class ClickHouseAdapter implements IStorageAdapter {
  public readonly name: StorageEngineType = "clickhouse";
  private host: string;
  private database: string;
  private user: string;
  private password?: string;

  constructor(options?: ClickHouseOptions) {
    this.host =
      options?.host ||
      process.env.CLICKHOUSE_HOST ||
      "http://localhost:8123";
    this.database =
      options?.database ||
      process.env.CLICKHOUSE_DATABASE ||
      "ghosttrace";
    this.user =
      options?.user ||
      process.env.CLICKHOUSE_USER ||
      "default";
    this.password =
      options?.password ||
      process.env.CLICKHOUSE_PASSWORD ||
      "";
  }

  /**
   * Helper to execute arbitrary ClickHouse SQL via standard HTTP interface.
   */
  private async executeSql(sql: string): Promise<string> {
    const url = new URL(this.host);
    url.searchParams.set("database", this.database);

    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    if (this.user) {
      headers["X-ClickHouse-User"] = this.user;
    }
    if (this.password) {
      headers["X-ClickHouse-Key"] = this.password;
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: sql,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ClickHouse query failed [${res.status}]: ${errText}`);
    }

    return await res.text();
  }

  /**
   * Executes a query returning parsed JSON rows.
   */
  private async queryJson<T = any>(sql: string): Promise<T[]> {
    const jsonSql = sql.trim().endsWith("FORMAT JSON")
      ? sql
      : `${sql} FORMAT JSON`;
    const resText = await this.executeSql(jsonSql);
    try {
      const parsed = JSON.parse(resText);
      return (parsed.data || []) as T[];
    } catch {
      return [];
    }
  }

  /**
   * Ping / Healthcheck for ClickHouse server.
   */
  public async ping(): Promise<{ alive: boolean; latencyMs: number }> {
    const start = performance.now();
    try {
      const res = await fetch(`${this.host}/ping`, { method: "GET" });
      const latencyMs = Math.round(performance.now() - start);
      return {
        alive: res.ok,
        latencyMs,
      };
    } catch {
      // In offline/mock mode or when container isn't running yet
      return {
        alive: false,
        latencyMs: 999,
      };
    }
  }

  /**
   * Initialize ClickHouse database and columnar MergeTree tables.
   */
  public async init(): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Ensure database exists
      await this.executeSql(`CREATE DATABASE IF NOT EXISTS ${this.database};`);

      // 2. Traces table (MergeTree partitioned by month)
      const createTracesTable = `
        CREATE TABLE IF NOT EXISTS ${this.database}.ghost_traces (
          id String,
          workspace_id LowCardinality(String),
          title String,
          agent_name LowCardinality(String),
          model LowCardinality(String),
          status LowCardinality(String),
          is_paused UInt8,
          total_tokens UInt32,
          reasoning_tokens UInt32,
          cost_estimate Float64,
          duration_ms UInt32,
          ghost_branch_count UInt16,
          session_id Nullable(String),
          tags Array(String),
          description Nullable(String),
          created_at DateTime64(3, 'UTC') DEFAULT now64()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(created_at)
        ORDER BY (workspace_id, model, created_at, id);
      `;
      await this.executeSql(createTracesTable);

      // 3. Nodes/Spans table (MergeTree sorted by trace and step)
      const createNodesTable = `
        CREATE TABLE IF NOT EXISTS ${this.database}.ghost_nodes (
          id String,
          trace_id String,
          node_id String,
          step_index UInt16,
          type LowCardinality(String),
          label String,
          role Nullable(String),
          content String,
          raw_input Nullable(String),
          raw_output Nullable(String),
          latency_ms UInt32,
          tokens UInt32,
          cost Float64,
          status LowCardinality(String),
          is_ghost UInt8,
          ghost_reason Nullable(String),
          confidence_score Nullable(Float32),
          position_x Float32,
          position_y Float32,
          created_at DateTime64(3, 'UTC') DEFAULT now64()
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(created_at)
        ORDER BY (trace_id, step_index, id);
      `;
      await this.executeSql(createNodesTable);

      return {
        success: true,
        message: `ClickHouse schema initialized successfully on [${this.database}] with MergeTree columnar engine.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `ClickHouse init notice: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Bulk insert a trace run into ClickHouse.
   */
  public async ingestTrace(trace: TraceRunData): Promise<void> {
    const row = {
      id: trace.id,
      workspace_id: trace.workspaceId || "global",
      title: trace.title,
      agent_name: trace.agentName,
      model: trace.model,
      status: trace.status,
      is_paused: trace.isPaused ? 1 : 0,
      total_tokens: trace.totalTokens || 0,
      reasoning_tokens: trace.reasoningTokens || 0,
      cost_estimate: trace.costEstimate || 0.0,
      duration_ms: trace.durationMs || 0,
      ghost_branch_count: trace.ghostBranchCount || 0,
      session_id: trace.sessionId || null,
      tags: trace.tags || [],
      description: trace.description || null,
      created_at: new Date(trace.createdAt || Date.now()).toISOString().replace("T", " ").replace("Z", ""),
    };

    const sql = `INSERT INTO ${this.database}.ghost_traces FORMAT JSONEachRow\n${JSON.stringify(row)}`;
    await this.executeSql(sql);

    if (trace.nodes && trace.nodes.length > 0) {
      await this.ingestNodes(trace.id, trace.nodes);
    }
  }

  /**
   * Bulk columnar insert for spans/nodes.
   */
  public async ingestNodes(traceId: string, nodes: TraceNodeData[]): Promise<void> {
    if (!nodes || nodes.length === 0) return;

    const rows = nodes.map((n, idx) => ({
      id: n.id || `node-${traceId}-${idx}`,
      trace_id: traceId,
      node_id: n.nodeId || `step-${idx + 1}`,
      step_index: n.stepIndex ?? idx + 1,
      type: n.type,
      label: n.label,
      role: n.role || null,
      content: (n.content || "").slice(0, 10000), // Protect payload limits
      raw_input: n.rawInput ? JSON.stringify(n.rawInput) : null,
      raw_output: n.rawOutput ? JSON.stringify(n.rawOutput) : null,
      latency_ms: n.latencyMs || 0,
      tokens: n.tokens || 0,
      cost: n.cost || 0.0,
      status: n.status || "SUCCESS",
      is_ghost: n.isGhost ? 1 : 0,
      ghost_reason: n.ghostReason || null,
      confidence_score: n.confidenceScore || 1.0,
      position_x: n.positionX || 0,
      position_y: n.positionY || 0,
      created_at: new Date(n.createdAt || Date.now()).toISOString().replace("T", " ").replace("Z", ""),
    }));

    const payload = rows.map((r) => JSON.stringify(r)).join("\n");
    const sql = `INSERT INTO ${this.database}.ghost_nodes FORMAT JSONEachRow\n${payload}`;
    await this.executeSql(sql);
  }

  /**
   * Query traces with ClickHouse fast columnar scan.
   */
  public async getTraces(filters?: {
    workspaceId?: string;
    model?: string;
    status?: string;
    limit?: number;
  }): Promise<TraceRunData[]> {
    const whereClauses: string[] = [];
    if (filters?.workspaceId) {
      whereClauses.push(`workspace_id = '${filters.workspaceId.replace(/'/g, "\\'")}'`);
    }
    if (filters?.model && filters.model !== "all") {
      whereClauses.push(`model = '${filters.model.replace(/'/g, "\\'")}'`);
    }
    if (filters?.status && filters.status !== "all") {
      whereClauses.push(`status = '${filters.status.replace(/'/g, "\\'")}'`);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const limit = filters?.limit || 50;

    const sql = `
      SELECT
        id, workspace_id as workspaceId, title, agent_name as agentName, model,
        status, is_paused as isPaused, total_tokens as totalTokens,
        reasoning_tokens as reasoningTokens, cost_estimate as costEstimate,
        duration_ms as durationMs, ghost_branch_count as ghostBranchCount,
        session_id as sessionId, tags, description,
        toString(created_at) as createdAt
      FROM ${this.database}.ghost_traces
      ${whereStr}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return await this.queryJson<TraceRunData>(sql);
  }

  /**
   * Fetch complete trace with nodes by ID.
   */
  public async getTraceById(id: string): Promise<TraceRunData | null> {
    const cleanId = id.replace(/'/g, "\\'");
    const traceRows = await this.queryJson<TraceRunData>(
      `SELECT * FROM ${this.database}.ghost_traces WHERE id = '${cleanId}' LIMIT 1`
    );

    if (traceRows.length === 0) return null;
    const trace = traceRows[0];

    const nodeRows = await this.queryJson<any>(
      `SELECT * FROM ${this.database}.ghost_nodes WHERE trace_id = '${cleanId}' ORDER BY step_index ASC`
    );

    trace.nodes = nodeRows.map((nr) => ({
      id: nr.id,
      traceRunId: nr.trace_id,
      nodeId: nr.node_id,
      stepIndex: nr.step_index,
      type: nr.type,
      label: nr.label,
      role: nr.role,
      content: nr.content,
      rawInput: nr.raw_input ? JSON.parse(nr.raw_input) : null,
      rawOutput: nr.raw_output ? JSON.parse(nr.raw_output) : null,
      latencyMs: nr.latency_ms,
      tokens: nr.tokens,
      cost: nr.cost,
      status: nr.status,
      isGhost: Boolean(nr.is_ghost),
      ghostReason: nr.ghost_reason,
      confidenceScore: nr.confidence_score,
      positionX: nr.position_x,
      positionY: nr.position_y,
      createdAt: nr.created_at,
    }));

    return trace;
  }

  /**
   * Instantaneous Columnar Fleet Aggregations (P95, token sums, model breakdown).
   */
  public async getFleetAggregates(workspaceId?: string): Promise<FleetAggregates> {
    const where = workspaceId ? `WHERE workspace_id = '${workspaceId.replace(/'/g, "\\'")}'` : "";

    const summarySql = `
      SELECT
        count() as totalTraces,
        sum(total_tokens) as totalTokens,
        sum(reasoning_tokens) as reasoningTokens,
        sum(cost_estimate) as totalCost,
        sum(ghost_branch_count) as totalGhostBranches,
        avg(duration_ms) as avgLatencyMs,
        quantile(0.95)(duration_ms) as p95LatencyMs
      FROM ${this.database}.ghost_traces
      ${where}
    `;

    const summaryRows = await this.queryJson<any>(summarySql);
    const summary = summaryRows[0] || {
      totalTraces: 0,
      totalTokens: 0,
      reasoningTokens: 0,
      totalCost: 0,
      totalGhostBranches: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
    };

    const modelSql = `
      SELECT
        model,
        count() as traceCount,
        avg(total_tokens) as avgTokens,
        sum(ghost_branch_count) as ghostCount
      FROM ${this.database}.ghost_traces
      ${where}
      GROUP BY model
      ORDER BY traceCount DESC
    `;
    const modelRows = await this.queryJson<any>(modelSql);

    return {
      totalTraces: Number(summary.totalTraces || 0),
      totalTokens: Number(summary.totalTokens || 0),
      reasoningTokens: Number(summary.reasoningTokens || 0),
      totalCost: Number(summary.totalCost || 0),
      totalGhostBranches: Number(summary.totalGhostBranches || 0),
      avgLatencyMs: Math.round(Number(summary.avgLatencyMs || 0)),
      p95LatencyMs: Math.round(Number(summary.p95LatencyMs || 0)),
      modelsBreakdown: modelRows.map((m) => ({
        model: m.model,
        traceCount: Number(m.traceCount),
        avgTokens: Math.round(Number(m.avgTokens)),
        ghostCount: Number(m.ghostCount),
      })),
    };
  }

  /**
   * High-Throughput Columnar Benchmark Runner.
   * Generates batches of spans and measures ClickHouse ingestion speed.
   */
  public async runBenchmark(spanCount: number = 2500): Promise<BenchmarkResult> {
    const start = performance.now();
    try {
      const syntheticTraceId = `bench-ch-${Date.now()}`;
      const dummyNodes: TraceNodeData[] = [];

      for (let i = 0; i < spanCount; i++) {
        dummyNodes.push({
          id: `bench-node-${i}`,
          traceRunId: syntheticTraceId,
          nodeId: `step-${i}`,
          stepIndex: i + 1,
          type: i % 4 === 0 ? "THINKING" : i % 7 === 0 ? "GHOST_REJECTED" : "TOOL_CALL",
          label: `Benchmark Span #${i}`,
          content: `Synthetic reasoning payload for ClickHouse high-velocity columnar ingestion test step ${i}.`,
          tokens: Math.floor(Math.random() * 250) + 20,
          latencyMs: Math.floor(Math.random() * 60) + 10,
          cost: 0.00012,
          status: "SUCCESS",
          isGhost: i % 7 === 0,
          ghostReason: i % 7 === 0 ? "Synthetic critic benchmark veto" : undefined,
        });
      }

      await this.ingestNodes(syntheticTraceId, dummyNodes);
      const durationMs = Math.round(performance.now() - start);
      const throughput = Math.round((spanCount / Math.max(durationMs, 1)) * 1000);

      return {
        engine: "clickhouse",
        spansIngested: spanCount,
        durationMs,
        throughputSpansPerSec: throughput,
        batchLatencyMs: durationMs,
        success: true,
        notes: `Successfully ingested ${spanCount} spans into ClickHouse MergeTree at ${throughput.toLocaleString()} spans/sec.`,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      return {
        engine: "clickhouse",
        spansIngested: 0,
        durationMs,
        throughputSpansPerSec: 0,
        batchLatencyMs: durationMs,
        success: false,
        notes: `Benchmark notice: ${err.message || String(err)}`,
      };
    }
  }
}
