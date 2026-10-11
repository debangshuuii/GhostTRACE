import { TraceUploadData, TraceNodeData, TraceEdgeData } from "./types";

export interface MCPJsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface MCPJsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface MCPResourceInfo {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface MCPExchange {
  id?: string | number;
  method: string;
  server?: string;
  request?: Record<string, any>;
  response?: Record<string, any>;
  latencyMs?: number;
  isGhost?: boolean;
  ghostReason?: string;
  confidenceScore?: number;
}

export interface MCPTracePayload {
  title?: string;
  clientName?: string;
  serverName?: string;
  model?: string;
  sessionId?: string;
  messages?: Array<MCPJsonRpcRequest | MCPJsonRpcResponse | any>;
  exchanges?: MCPExchange[];
  tools?: MCPToolInfo[];
  resources?: MCPResourceInfo[];
}

/**
 * Checks if raw object resembles an MCP payload or JSON-RPC message
 */
export function isMCPPayload(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  if (Array.isArray(data)) {
    return data.some((m) => m && (m.jsonrpc === "2.0" || m.method?.startsWith("tools/") || m.method?.startsWith("resources/")));
  }
  return Boolean(
    data.messages?.some?.((m: any) => m?.jsonrpc === "2.0" || m?.method?.startsWith("tools/")) ||
    data.exchanges?.length ||
    data.serverName ||
    data.method?.startsWith("tools/") ||
    data.method?.startsWith("resources/")
  );
}

/**
 * Extracts structured MCP metadata from a TraceNodeData object
 */
export function extractMCPMetadata(node: TraceNodeData | null): {
  isMcp: boolean;
  method?: string;
  server?: string;
  toolName?: string;
  resourceUri?: string;
  latencyMs?: number;
  params?: any;
  result?: any;
  error?: any;
  protocolVersion?: string;
} {
  if (!node) return { isMcp: false };

  // 1. From node.metadata
  if (node.metadata?.mcp) {
    return { isMcp: true, ...node.metadata.mcp };
  }

  // 2. From node.rawInput if it contains an mcp wrapper
  if (node.rawInput && typeof node.rawInput === "object" && node.rawInput.mcp) {
    return { isMcp: true, ...node.rawInput.mcp };
  }

  // 3. Fallback inference from label or type
  if (node.label.startsWith("mcp:") || node.label.toLowerCase().includes("mcp/")) {
    const parts = node.label.replace(/^mcp:\s*/i, "").split(" ");
    return {
      isMcp: true,
      method: parts[0] || "tools/call",
      toolName: parts[1] || node.label,
      server: "mcp-server",
      latencyMs: node.latencyMs || 0,
      params: node.rawInput,
      result: node.rawOutput,
    };
  }

  return { isMcp: false };
}

/**
 * Parses Model Context Protocol (MCP) logs or JSON-RPC 2.0 payloads into GhostTRACE DAG format
 */
export function parseMCPPayload(payload: MCPTracePayload | any[] | any): TraceUploadData {
  if (Array.isArray(payload)) {
    payload = { messages: payload };
  }

  const clientName = payload.clientName || "Claude Desktop (MCP Host)";
  const serverName = payload.serverName || "Multi-MCP Ecosystem";
  const model = payload.model || "claude-3-7-sonnet";
  const traceTitle = payload.title || `MCP Trace: ${clientName} ↔ ${serverName}`;

  const nodes: TraceNodeData[] = [];
  const edges: TraceEdgeData[] = [];
  let stepIndex = 1;
  let previousNodeId: string | null = null;

  // Root node: Agent / User interaction start
  const rootNodeId = "mcp-step-root";
  const initialPrompt =
    payload.prompt ||
    payload.title ||
    `Model Context Protocol Session initialized between ${clientName} and ${serverName}`;

  nodes.push({
    nodeId: rootNodeId,
    stepIndex: stepIndex++,
    type: "USER_PROMPT",
    label: "MCP Client Session Start",
    role: "user",
    content: initialPrompt,
    status: "SUCCESS",
    isGhost: false,
    latencyMs: 15,
    tokens: 45,
    cost: 0.0001,
    positionX: 50,
    positionY: 200,
    metadata: {
      mcp: {
        protocolVersion: "2024-11-05",
        clientName,
        serverName,
        method: "initialize",
      },
    },
  });
  previousNodeId = rootNodeId;

  // If exchanges array provided directly:
  if (Array.isArray(payload.exchanges) && payload.exchanges.length > 0) {
    for (const ex of payload.exchanges) {
      const isGhost = Boolean(ex.isGhost);
      const nodeId = `mcp-step-${stepIndex}`;
      const method = ex.method || "tools/call";
      const server = ex.server || serverName;

      let toolName = "unknown";
      if (ex.request?.name) toolName = ex.request.name;
      else if (typeof ex.request?.params?.name === "string") toolName = ex.request.params.name;

      const label = `mcp:${method} → ${toolName}`;
      const latency = ex.latencyMs || Math.floor(Math.random() * 200 + 80);
      const tokens = Math.floor(Math.random() * 250 + 120);
      const cost = Number(((tokens / 1000) * 0.003).toFixed(5));

      nodes.push({
        nodeId,
        stepIndex: stepIndex++,
        type: isGhost ? "GHOST_REJECTED" : "TOOL_CALL",
        label,
        role: "tool",
        content: isGhost
          ? `[GHOST MCP BRANCH] Evaluated tool call '${toolName}' against ${server}, but action was pruned.`
          : `Executed MCP RPC [${method}] on server [${server}] with arguments: ${JSON.stringify(ex.request || {})}`,
        rawInput: ex.request,
        rawOutput: ex.response,
        latencyMs: latency,
        tokens,
        cost,
        status: isGhost ? "PRUNED" : "SUCCESS",
        isGhost,
        ghostReason: ex.ghostReason || (isGhost ? "MCP Security Policy: Speculative action pruned by Critic." : undefined),
        confidenceScore: ex.confidenceScore ?? (isGhost ? 0.35 : 0.96),
        positionX: 50 + (stepIndex - 1) * 240,
        positionY: isGhost ? 60 : 200,
        metadata: {
          mcp: {
            protocolVersion: "2024-11-05",
            method,
            server,
            toolName,
            params: ex.request,
            result: ex.response,
            latencyMs: latency,
          },
        },
      });

      if (previousNodeId) {
        edges.push({
          edgeId: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "pruned (mcp policy)" : "mcp rpc",
          isGhost,
        });
      }

      if (!isGhost) {
        previousNodeId = nodeId;
      }
    }
  } else if (Array.isArray(payload.messages) && payload.messages.length > 0) {
    // Process JSON-RPC request / response messages
    const requestsById = new Map<string | number, MCPJsonRpcRequest>();
    const responsesById = new Map<string | number, MCPJsonRpcResponse>();

    for (const msg of payload.messages) {
      if (!msg) continue;
      if (msg.method) {
        const id = msg.id ?? `req-${stepIndex}`;
        requestsById.set(id, msg);
      } else if (msg.result !== undefined || msg.error !== undefined) {
        const id = msg.id ?? `res-${stepIndex}`;
        responsesById.set(id, msg);
      }
    }

    // Pair requests with responses
    for (const [id, req] of requestsById.entries()) {
      const resp = responsesById.get(id);
      const isError = Boolean(resp?.error);
      const isGhost = Boolean(isError || req.params?._isGhost);
      const nodeId = `mcp-step-${stepIndex}`;
      const toolName = req.params?.name || req.method.split("/")[1] || "call";
      const label = `mcp:${req.method} → ${toolName}`;

      const latency = Math.floor(Math.random() * 180 + 70);
      const tokens = Math.floor(Math.random() * 220 + 90);
      const cost = Number(((tokens / 1000) * 0.003).toFixed(5));

      nodes.push({
        nodeId,
        stepIndex: stepIndex++,
        type: isGhost ? "GHOST_REJECTED" : "TOOL_CALL",
        label,
        role: "tool",
        content: `MCP JSON-RPC Method: ${req.method}\nParams: ${JSON.stringify(req.params || {}, null, 2)}\nResult: ${JSON.stringify(resp?.result || resp?.error || "OK", null, 2)}`,
        rawInput: req.params,
        rawOutput: resp?.result || resp?.error,
        latencyMs: latency,
        tokens,
        cost,
        status: isGhost ? "PRUNED" : "SUCCESS",
        isGhost,
        ghostReason: resp?.error?.message || (isGhost ? "MCP RPC call rejected or pruned" : undefined),
        confidenceScore: isGhost ? 0.4 : 0.94,
        positionX: 50 + (stepIndex - 1) * 240,
        positionY: isGhost ? 60 : 200,
        metadata: {
          mcp: {
            protocolVersion: "2024-11-05",
            method: req.method,
            server: serverName,
            toolName,
            params: req.params,
            result: resp?.result,
            error: resp?.error,
            latencyMs: latency,
          },
        },
      });

      if (previousNodeId) {
        edges.push({
          edgeId: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "pruned mcp" : "rpc result",
          isGhost,
        });
      }

      if (!isGhost) {
        previousNodeId = nodeId;
      }
    }
  }

  // Final LLM synthesis node
  const finalNodeId = `mcp-step-synthesis`;
  nodes.push({
    nodeId: finalNodeId,
    stepIndex: stepIndex++,
    type: "LLM_RESPONSE",
    label: "MCP Synthesis & Execution Summary",
    role: "assistant",
    content: `All MCP tool interactions successfully reconciled. Speculative ghost branches were evaluated and safely discarded, preserving client workspace state.`,
    latencyMs: 340,
    tokens: 410,
    cost: 0.0012,
    status: "SUCCESS",
    isGhost: false,
    positionX: 50 + (stepIndex - 1) * 240,
    positionY: 200,
  });

  if (previousNodeId) {
    edges.push({
      edgeId: `edge-${previousNodeId}-${finalNodeId}`,
      source: previousNodeId,
      target: finalNodeId,
      type: "DEFAULT",
      label: "final output",
      isGhost: false,
    });
  }

  return {
    title: traceTitle,
    agentName: clientName,
    model,
    tags: ["mcp", "model-context-protocol", "tools", "anthropic"],
    description: `Ingested MCP session with ${nodes.filter((n) => n.isGhost).length} pruned speculative branches.`,
    nodes,
    edges,
  };
}

/**
 * Generates an end-to-end multi-server MCP trace with counterfactual ghost branches for testing & demos
 */
export function generateMockMCPTrace(): TraceUploadData {
  return parseMCPPayload({
    title: "Claude 3.7 Sonnet ↔ PostgreSQL & Filesystem MCP Servers",
    clientName: "Claude Desktop (MCP Client)",
    serverName: "Multi-MCP Gateway (postgres-mcp + filesystem-mcp)",
    model: "claude-3-7-sonnet",
    prompt: "Investigate database latency spike, inspect migration files, and add an index to 'transactions' table safely.",
    exchanges: [
      {
        id: 1,
        method: "tools/list",
        server: "postgres-mcp",
        request: {},
        response: {
          tools: [
            { name: "read_query", description: "Execute read-only SQL query" },
            { name: "execute_ddl", description: "Execute DDL schema modification" },
            { name: "explain_query", description: "Run EXPLAIN ANALYZE on query" },
          ],
        },
        latencyMs: 95,
      },
      {
        id: 2,
        method: "resources/read",
        server: "filesystem-mcp",
        request: { uri: "file:///workspace/migrations/20261011_transactions.sql" },
        response: {
          mimeType: "text/x-sql",
          contents: "CREATE TABLE transactions (id UUID PRIMARY KEY, user_id UUID, amount DECIMAL, created_at TIMESTAMP);",
        },
        latencyMs: 45,
      },
      {
        id: 3,
        method: "tools/call",
        server: "postgres-mcp",
        request: {
          name: "explain_query",
          arguments: { sql: "SELECT * FROM transactions WHERE user_id = 'usr_991' ORDER BY created_at DESC LIMIT 10;" },
        },
        response: {
          plan: "Seq Scan on transactions (cost=0.00..38120.50 rows=10 width=128) - Filter: (user_id = 'usr_991')",
          recommendation: "Missing composite B-Tree index on (user_id, created_at DESC)",
        },
        latencyMs: 310,
      },
      // GHOST SPECULATIVE BRANCH 1 (Pruned)
      {
        id: 4,
        method: "tools/call",
        server: "postgres-mcp",
        request: {
          name: "execute_ddl",
          arguments: { sql: "DROP TABLE transactions CASCADE; CREATE TABLE transactions (id UUID PRIMARY KEY, ...);" },
        },
        response: {
          error: "CRITIC POLICY VETO: Speculative drop table rejected. Destructive action violates Production Data Integrity Policy.",
        },
        isGhost: true,
        ghostReason: "Critic Policy Veto: Speculative branch attempted table drop on live production replica. Action halted before execution.",
        confidenceScore: 0.12,
        latencyMs: 120,
      },
      // GHOST SPECULATIVE BRANCH 2 (Pruned)
      {
        id: 5,
        method: "tools/call",
        server: "postgres-mcp",
        request: {
          name: "execute_ddl",
          arguments: { sql: "CREATE INDEX idx_trans_user ON transactions(user_id);" },
        },
        response: {
          warning: "Single-column index does not cover ORDER BY created_at DESC sort condition.",
        },
        isGhost: true,
        ghostReason: "Suboptimal Query Plan: Sub-branch pruned because composite index is required for 0-ms sort elimination.",
        confidenceScore: 0.48,
        latencyMs: 240,
      },
      // COMMITTED WINNING TOOL CALL
      {
        id: 6,
        method: "tools/call",
        server: "postgres-mcp",
        request: {
          name: "execute_ddl",
          arguments: {
            sql: "CREATE INDEX CONCURRENTLY idx_transactions_user_created ON transactions(user_id, created_at DESC);",
          },
        },
        response: {
          status: "SUCCESS",
          durationMs: 840,
          details: "Index idx_transactions_user_created built successfully in concurrent non-locking mode.",
        },
        latencyMs: 850,
      },
    ],
  });
}
