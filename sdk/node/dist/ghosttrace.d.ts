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
export declare class GhostTraceNode {
    readonly session: TraceSession;
    readonly nodeId: string;
    readonly stepIndex: number;
    readonly label: string;
    constructor(session: TraceSession, nodeId: string, stepIndex: number, label: string);
    addGhostBranch(options: Omit<AddGhostBranchOptions, "parentNode">): Promise<GhostTraceNode>;
    addNextStep(options: Omit<AddStepOptions, "parentNode">): Promise<GhostTraceNode>;
}
export declare class TraceSession {
    private readonly client;
    readonly traceId: string;
    readonly title: string;
    private stepCounter;
    constructor(client: GhostTraceClient, traceId: string, title: string);
    addStep(options: AddStepOptions): Promise<GhostTraceNode>;
    addGhostBranch(options: AddGhostBranchOptions): Promise<GhostTraceNode>;
    finish(status?: "COMPLETED" | "FAILED"): Promise<void>;
}
export declare class GhostTraceClient {
    readonly endpoint: string;
    readonly apiKey?: string | undefined;
    readonly workspaceId?: string | undefined;
    private readonly streamUrl;
    constructor(endpoint?: string, apiKey?: string | undefined, workspaceId?: string | undefined);
    send(payload: any): Promise<any>;
    startTrace(options: StartTraceOptions): Promise<TraceSession>;
}
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
export declare function wrapOpenAI<T extends {
    chat: {
        completions: {
            create: Function;
        };
    };
}>(client: T, options?: WrapOptions): T;
/**
 * Traces an async function call automatically with GhostTRACE.
 */
export declare function withTrace<T>(options: StartTraceOptions, fn: (session: TraceSession) => Promise<T>, clientOptions?: WrapOptions): Promise<T>;
//# sourceMappingURL=ghosttrace.d.ts.map