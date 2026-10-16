"use strict";
/**
 * GhostTRACE Node.js / TypeScript SDK & Zero-Code Auto-Instrumentation
 * Native drop-in client for streaming multi-agent execution traces and counterfactual ghost branches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostTraceClient = exports.TraceSession = exports.GhostTraceNode = void 0;
exports.wrapOpenAI = wrapOpenAI;
exports.withTrace = withTrace;
class GhostTraceNode {
    session;
    nodeId;
    stepIndex;
    label;
    constructor(session, nodeId, stepIndex, label) {
        this.session = session;
        this.nodeId = nodeId;
        this.stepIndex = stepIndex;
        this.label = label;
    }
    addGhostBranch(options) {
        return this.session.addGhostBranch({ ...options, parentNode: this });
    }
    addNextStep(options) {
        return this.session.addStep({ ...options, parentNode: this });
    }
}
exports.GhostTraceNode = GhostTraceNode;
class TraceSession {
    client;
    traceId;
    title;
    stepCounter = 0;
    constructor(client, traceId, title) {
        this.client = client;
        this.traceId = traceId;
        this.title = title;
    }
    async addStep(options) {
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
        }).catch(() => { });
        return new GhostTraceNode(this, nodeId, this.stepCounter, options.label);
    }
    async addGhostBranch(options) {
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
        }).catch(() => { });
        return new GhostTraceNode(this, nodeId, this.stepCounter, options.label);
    }
    async finish(status = "COMPLETED") {
        await this.client.send({
            event: "TRACE_END",
            traceId: this.traceId,
            data: { status },
        });
    }
}
exports.TraceSession = TraceSession;
class GhostTraceClient {
    endpoint;
    apiKey;
    workspaceId;
    streamUrl;
    constructor(endpoint = "http://localhost:3000", apiKey, workspaceId) {
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.workspaceId = workspaceId;
        this.streamUrl = `${endpoint.replace(/\/$/, "")}/api/traces/stream`;
    }
    async send(payload) {
        try {
            const headers = { "Content-Type": "application/json" };
            if (this.apiKey)
                headers["Authorization"] = `Bearer ${this.apiKey}`;
            if (this.workspaceId)
                headers["x-workspace-id"] = this.workspaceId;
            const res = await fetch(this.streamUrl, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            return await res.json();
        }
        catch (err) {
            // Fail silently to avoid breaking caller app
            return {};
        }
    }
    async startTrace(options) {
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
exports.GhostTraceClient = GhostTraceClient;
/**
 * Wraps an OpenAI client instance with Zero-Code tracing.
 * Intercepts client.chat.completions.create and automatically streams traces to GhostTRACE.
 */
function wrapOpenAI(client, options = {}) {
    const gt = new GhostTraceClient(options.endpoint || "http://localhost:3000", options.apiKey, options.workspaceId);
    const origCreate = client.chat.completions.create.bind(client.chat.completions);
    client.chat.completions.create = (async (...args) => {
        const params = args[0] || {};
        const messages = params.messages || [];
        const model = params.model || "gpt-4o";
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
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
        }
        catch (err) {
            await session.addStep({
                type: "ERROR",
                label: "OpenAI Execution Failed",
                content: err?.message || String(err),
                parentNode: promptNode,
            });
            await session.finish("FAILED");
            throw err;
        }
    });
    return client;
}
/**
 * Traces an async function call automatically with GhostTRACE.
 */
async function withTrace(options, fn, clientOptions) {
    const gt = new GhostTraceClient(clientOptions?.endpoint || "http://localhost:3000", clientOptions?.apiKey, clientOptions?.workspaceId);
    const session = await gt.startTrace(options);
    try {
        const result = await fn(session);
        await session.finish("COMPLETED");
        return result;
    }
    catch (err) {
        await session.addStep({
            type: "ERROR",
            label: "Trace Task Failed",
            content: err?.message || String(err),
        });
        await session.finish("FAILED");
        throw err;
    }
}
