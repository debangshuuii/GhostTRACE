/**
 * GhostTRACE Node.js / TypeScript SDK & Zero-Code Auto-Instrumentation
 * Native drop-in client for streaming multi-agent execution traces and counterfactual ghost branches.
 */

export interface StartTraceOptions {
  title: string;
  agentName?: string;
  model?: string;
  tags?: string[];
  description?: string;
  workspaceId?: string;
  sessionId?: string;
  turnIndex?: number;
  parentTraceId?: string;
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

    // Non-blocking fire-and-forget streaming
    this.client.send({
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
    }).catch(() => {});

    return new GhostTraceNode(this, nodeId, this.stepCounter, options.label);
  }

  public async addGhostBranch(options: AddGhostBranchOptions): Promise<GhostTraceNode> {
    this.stepCounter++;
    const nodeId = `ghost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    this.client.send({
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
    }).catch(() => {});

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

  constructor(
    public readonly endpoint: string = "http://localhost:3000",
    public readonly apiKey?: string,
    public readonly workspaceId?: string
  ) {
    this.streamUrl = `${endpoint.replace(/\/$/, "")}/api/traces/stream`;
  }

  public async send(payload: any): Promise<any> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;
      if (this.workspaceId) headers["x-workspace-id"] = this.workspaceId;

      const res = await fetch(this.streamUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      // Fail silently to avoid breaking caller app
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
        workspaceId: options.workspaceId || this.workspaceId,
        sessionId: options.sessionId,
        turnIndex: options.turnIndex,
        parentTraceId: options.parentTraceId,
      },
    });

    const traceId = res.traceId || `trace-${Date.now().toString(36)}`;
    return new TraceSession(this, traceId, options.title);
  }
}

// ----------------------------------------------------------------------
// ZERO-CODE WRAPPERS (OpenAI, Anthropic, and Function Tracing)
// ----------------------------------------------------------------------

export interface WrapOptions {
  endpoint?: string;
  apiKey?: string;
  agentName?: string;
  workspaceId?: string;
}

/**
 * Wraps an OpenAI client instance with Zero-Code tracing.
 * Intercepts client.chat.completions.create and automatically streams traces to GhostTRACE.
 */
export function wrapOpenAI<T extends { chat: { completions: { create: Function } } }>(
  client: T,
  options: WrapOptions = {}
): T {
  const gt = new GhostTraceClient(options.endpoint || "http://localhost:3000", options.apiKey, options.workspaceId);
  const origCreate = client.chat.completions.create.bind(client.chat.completions);

  client.chat.completions.create = (async (...args: any[]) => {
    const params = args[0] || {};
    const messages = params.messages || [];
    const model = params.model || "gpt-4o";

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const userPrompt = typeof lastUser?.content === "string" ? lastUser.content.slice(0, 80) : "OpenAI Chat Call";

    const session = await gt.startTrace({
      title: `OpenAI: ${userPrompt}`,
      agentName: options.agentName || "OpenAI-AutoWrapper",
      model,
      tags: ["openai", "zero-code-node"],
    });

    const promptNode = await session.addStep({
      type: "USER_PROMPT",
      label: "User Directive",
      content: typeof lastUser?.content === "string" ? lastUser.content : JSON.stringify(messages, null, 2),
      tokens: Math.round(JSON.stringify(messages).length / 4),
      latencyMs: 15,
    });

    const startT = Date.now();
    try {
      const response = await origCreate(...args);
      const latencyMs = Date.now() - startT;

      const choice = response.choices?.[0];
      const message = choice?.message;
      let content = message?.content || "";
      let reasoning = message?.reasoning_content || message?.reasoning || "";

      // Extract <think> tags if present
      if (!reasoning && content.includes("<think>")) {
        const match = content.match(/<think>([\s\S]*?)<\/think>/i);
        if (match) {
          reasoning = match[1].trim();
          content = content.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
        }
      }

      let parent = promptNode;

      // 1. Thinking Node
      if (reasoning) {
        parent = await parent.addNextStep({
          type: "THINKING",
          label: "Chain-of-Thought Reasoning",
          content: reasoning,
          tokens: Math.round(reasoning.length / 4),
          latencyMs: Math.round(latencyMs * 0.4),
        });
      }

      // 2. Tool Calls
      if (message?.tool_calls?.length) {
        for (const tc of message.tool_calls) {
          const fnName = tc.function?.name || "tool";
          const fnArgs = tc.function?.arguments || "{}";
          parent = await parent.addNextStep({
            type: "TOOL_CALL",
            label: `Tool: ${fnName}`,
            content: fnArgs,
            tokens: Math.round(fnArgs.length / 4) + 20,
            latencyMs: Math.round(latencyMs * 0.3),
          });
        }
      }

      // 3. Final Content
      if (content) {
        await parent.addNextStep({
          type: "LLM_RESPONSE",
          label: "LLM Completion",
          content,
          tokens: Math.round(content.length / 4) + 10,
          latencyMs: Math.round(latencyMs * 0.5),
        });
      }

      await session.finish("COMPLETED");
      return response;
    } catch (err: any) {
      await session.addStep({
        type: "ERROR",
        label: "OpenAI Execution Failed",
        content: err?.message || String(err),
        parentNode: promptNode,
      });
      await session.finish("FAILED");
      throw err;
    }
  }) as any;

  return client;
}

/**
 * Traces an async function call automatically with GhostTRACE.
 */
export async function withTrace<T>(
  options: StartTraceOptions,
  fn: (session: TraceSession) => Promise<T>,
  clientOptions?: WrapOptions
): Promise<T> {
  const gt = new GhostTraceClient(
    clientOptions?.endpoint || "http://localhost:3000",
    clientOptions?.apiKey,
    clientOptions?.workspaceId
  );
  const session = await gt.startTrace(options);
  try {
    const result = await fn(session);
    await session.finish("COMPLETED");
    return result;
  } catch (err: any) {
    await session.addStep({
      type: "ERROR",
      label: "Trace Task Failed",
      content: err?.message || String(err),
    });
    await session.finish("FAILED");
    throw err;
  }
}
