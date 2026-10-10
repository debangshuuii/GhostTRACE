/**
 * GhostTRACE Node.js / TypeScript SDK
 * Native drop-in client for streaming multi-agent execution traces and counterfactual ghost branches.
 */

export interface StartTraceOptions {
  title: string;
  agentName?: string;
  model?: string;
  tags?: string[];
  description?: string;
}

export interface AddStepOptions {
  type: "USER_PROMPT" | "THINKING" | "TOOL_CALL" | "LLM_RESPONSE" | "ERROR";
  label: string;
  content: string;
  tokens?: number;
  latencyMs?: number;
  rawInput?: any;
  rawOutput?: any;
  parentNode?: GhostTraceNode;
}

export interface AddGhostBranchOptions {
  label: string;
  content: string;
  ghostReason: string;
  tokens?: number;
  latencyMs?: number;
  confidenceScore?: number;
  parentNode: GhostTraceNode;
}

export class GhostTraceNode {
  constructor(
    public readonly session: TraceSession,
    public readonly nodeId: string,
    public readonly stepIndex: number,
    public readonly label: string
  ) {}

  public addGhostBranch(options: Omit<AddGhostBranchOptions, "parentNode">): Promise<GhostTraceNode> {
    return this.session.addGhostBranch({ ...options, parentNode: this });
  }

  public addNextStep(options: Omit<AddStepOptions, "parentNode">): Promise<GhostTraceNode> {
    return this.session.addStep({ ...options, parentNode: this });
  }
}

export class TraceSession {
  private stepCounter = 0;

  constructor(
    private readonly client: GhostTraceClient,
    public readonly traceId: string,
    public readonly title: string
  ) {}

  public async addStep(options: AddStepOptions): Promise<GhostTraceNode> {
    this.stepCounter++;
    const nodeId = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    await this.client.send({
      event: "NODE_ADDED",
      traceId: this.traceId,
      data: {
        nodeId,
        stepIndex: this.stepCounter,
        type: options.type,
        label: options.label,
        role: this.stepCounter > 1 ? "assistant" : "user",
        content: options.content,
        tokens: options.tokens ?? 400,
        latencyMs: options.latencyMs ?? 250,
        isGhost: false,
        parentNodeId: options.parentNode?.nodeId ?? null,
        rawInput: options.rawInput ?? null,
        rawOutput: options.rawOutput ?? null,
      },
    });

    return new GhostTraceNode(this, nodeId, this.stepCounter, options.label);
  }

  public async addGhostBranch(options: AddGhostBranchOptions): Promise<GhostTraceNode> {
    this.stepCounter++;
    const nodeId = `ghost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    await this.client.send({
      event: "NODE_ADDED",
      traceId: this.traceId,
      data: {
        nodeId,
        stepIndex: this.stepCounter,
        type: "GHOST_REJECTED",
        label: `Ghost: ${options.label}`,
        role: "assistant",
        content: options.content,
        tokens: options.tokens ?? 450,
        latencyMs: options.latencyMs ?? 350,
        isGhost: true,
        ghostReason: options.ghostReason,
        confidenceScore: options.confidenceScore ?? 0.4,
        parentNodeId: options.parentNode.nodeId,
      },
    });

    return new GhostTraceNode(this, nodeId, this.stepCounter, options.label);
  }

  public async finish(status: "COMPLETED" | "FAILED" = "COMPLETED"): Promise<void> {
    await this.client.send({
      event: "TRACE_END",
      traceId: this.traceId,
      data: { status },
    });
  }
}

export class GhostTraceClient {
  private readonly streamUrl: string;

  constructor(public readonly endpoint: string = "http://localhost:3000") {
    this.streamUrl = `${endpoint.replace(/\/$/, "")}/api/traces/stream`;
  }

  public async send(payload: any): Promise<any> {
    try {
      const res = await fetch(this.streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.warn("[GhostTRACE Warning] Failed to stream event:", err);
      return {};
    }
  }

  public async startTrace(options: StartTraceOptions): Promise<TraceSession> {
    const res = await this.send({
      event: "TRACE_START",
      data: {
        title: options.title,
        agentName: options.agentName || "Autonomous TypeScript Agent",
        model: options.model || "claude-3-7-sonnet",
        tags: options.tags || ["typescript-sdk", "live-stream"],
        description: options.description || "Ingested via GhostTRACE Node.js SDK",
      },
    });

    const traceId = res.traceId || `trace-${Date.now().toString(36)}`;
    return new TraceSession(this, traceId, options.title);
  }
}
