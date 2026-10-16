import { z } from "zod";

export type NodeType =
  | "USER_PROMPT"
  | "THINKING"
  | "TOOL_CALL"
  | "TOOL_RESULT"
  | "LLM_RESPONSE"
  | "GHOST_REJECTED"
  | "SUBAGENT_SPAWN"
  | "ERROR";

export type NodeStatus = "SUCCESS" | "FAILED" | "PRUNED" | "ROLLED_BACK" | "RUNNING" | "ERROR" | "PAUSED";

export type EdgeType = "DEFAULT" | "BRANCH" | "GHOST_PRUNED" | "FALLBACK" | "SUBAGENT";

export interface TraceNodeData {
  id?: string;
  nodeId: string;
  stepIndex: number;
  type: NodeType;
  label: string;
  role?: string;
  content: string;
  rawInput?: any;
  rawOutput?: any;
  latencyMs?: number;
  tokens?: number;
  cost?: number;
  status: NodeStatus;
  isGhost: boolean;
  ghostReason?: string;
  confidenceScore?: number;
  positionX?: number;
  positionY?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  interventionInput?: string | null;
  interventionVerdict?: string | null;
  isPaused?: boolean;
  traceRunId?: string;
  createdAt?: string | Date;
}

export interface TraceEdgeData {
  id?: string;
  edgeId: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  isGhost?: boolean;
}

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  environment: "production" | "staging" | "development" | string;
  createdAt?: string | Date;
}

export interface TraceUploadData {
  title?: string;
  agentName?: string;
  model?: string;
  tags?: string[];
  description?: string;
  workspaceId?: string;
  nodes: TraceNodeData[];
  edges: TraceEdgeData[];
}

export interface TraceEvaluationData {
  id?: string;
  evaluator: string;
  rating: number; // 1-5
  verdict: "OPTIMAL" | "SUBOPTIMAL" | "FAILED" | "HALLUCINATION_DETECTED" | string;
  feedback: string;
  createdAt?: string | Date;
}

export interface TraceRunData {
  id: string;
  title: string;
  agentName: string;
  model: string;
  status: "COMPLETED" | "FAILED" | "RUNNING" | "PRUNED" | "PAUSED";
  workspaceId?: string | null;
  isPaused?: boolean;
  pausedStep?: number | null;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  costEstimate: number;
  durationMs: number;
  ghostBranchCount: number;
  sessionId?: string | null;
  turnIndex?: number;
  parentTraceId?: string | null;
  tags: string[];
  description?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  nodes: TraceNodeData[];
  edges: TraceEdgeData[];
  evaluations?: TraceEvaluationData[];
}

export interface ConversationSessionData {
  sessionId: string;
  title: string;
  agentName: string;
  model: string;
  turnCount: number;
  totalTokens: number;
  totalCost: number;
  ghostBranchCount: number;
  durationMs: number;
  lastTurnAt: string | Date;
  traces: TraceRunData[];
}

export interface WebhookAlertConfigData {
  id?: string;
  workspaceId?: string | null;
  name: string;
  url: string;
  type: "SLACK" | "DISCORD" | "GENERIC";
  enabled: boolean;
  alertOnGuardrail: boolean;
  alertOnSwarmLoop: boolean;
  alertOnTokenSpike: boolean;
  alertOnError: boolean;
  minSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  createdAt?: string | Date;
}

// Zod Schema for Uploading & Ingestion validation
export const TraceNodeSchema = z.object({
  nodeId: z.string(),
  stepIndex: z.number().default(0),
  type: z.enum([
    "USER_PROMPT",
    "THINKING",
    "TOOL_CALL",
    "TOOL_RESULT",
    "LLM_RESPONSE",
    "GHOST_REJECTED",
    "SUBAGENT_SPAWN",
    "ERROR",
  ]),
  label: z.string(),
  role: z.string().optional(),
  content: z.string().default(""),
  rawInput: z.any().optional(),
  rawOutput: z.any().optional(),
  latencyMs: z.number().optional().default(0),
  tokens: z.number().optional().default(0),
  cost: z.number().optional().default(0),
  status: z.enum(["SUCCESS", "FAILED", "PRUNED", "ROLLED_BACK", "RUNNING"]).default("SUCCESS"),
  isGhost: z.boolean().default(false),
  ghostReason: z.string().optional(),
  confidenceScore: z.number().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const TraceEdgeSchema = z.object({
  edgeId: z.string().optional(),
  source: z.string(),
  target: z.string(),
  type: z.enum(["DEFAULT", "BRANCH", "GHOST_PRUNED", "FALLBACK", "SUBAGENT"]).default("DEFAULT"),
  label: z.string().optional(),
  isGhost: z.boolean().default(false),
});

export const TraceUploadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Trace title is required"),
  agentName: z.string().default("Autonomous Agent"),
  model: z.string().default("gpt-4o"),
  status: z.enum(["COMPLETED", "FAILED", "RUNNING", "PRUNED"]).default("COMPLETED"),
  totalTokens: z.number().optional(),
  promptTokens: z.number().optional().default(0),
  completionTokens: z.number().optional().default(0),
  reasoningTokens: z.number().optional().default(0),
  costEstimate: z.number().optional().default(0),
  durationMs: z.number().optional().default(0),
  ghostBranchCount: z.number().optional().default(0),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  nodes: z.array(TraceNodeSchema),
  edges: z.array(TraceEdgeSchema),
  evaluations: z
    .array(
      z.object({
        evaluator: z.string(),
        rating: z.number(),
        verdict: z.enum(["OPTIMAL", "SUBOPTIMAL", "FAILED", "HALLUCINATION_DETECTED"]),
        feedback: z.string(),
      })
    )
    .optional(),
});
