import { prisma } from "@/lib/prisma";
import { traceEventBus } from "@/lib/trace-event-bus";
import { DEFAULT_GUARDRAILS } from "@/lib/guardrails";
import { TraceNodeData } from "@/lib/types";

export interface CreateProxyTraceOptions {
  model: string;
  messages: Array<{ role: string; content?: string | any; tool_calls?: any[] }>;
  responseContent?: string;
  reasoningContent?: string;
  toolCalls?: any[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  durationMs: number;
  workspaceId?: string | null;
  customTitle?: string | null;
  agentName?: string | null;
  tags?: string[];
  status?: "COMPLETED" | "FAILED";
  errorMessage?: string;
}

/**
 * Extracts Chain-of-Thought thinking blocks from text (<think>...</think> tags).
 */
export function extractThinking(text: string): { thinking: string | null; cleanContent: string } {
  if (!text) return { thinking: null, cleanContent: "" };
  const match = text.match(/<think>([\s\S]*?)<\/think>/i);
  if (match) {
    const thinking = match[1].trim();
    const cleanContent = text.replace(/<think>[\s\S]*?<\/think>/i, "").trim();
    return { thinking, cleanContent };
  }
  return { thinking: null, cleanContent: text };
}

/**
 * Persists an OpenAI proxy completion trace into Prisma and emits live SSE updates.
 */
export async function createProxyTrace(opts: CreateProxyTraceOptions) {
  const {
    model,
    messages = [],
    durationMs,
    workspaceId,
    customTitle,
    agentName,
    status = "COMPLETED",
    errorMessage,
  } = opts;

  // Extract user directive and system prompt
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1];
  const userPromptText = typeof lastUserMsg?.content === "string" 
    ? lastUserMsg.content 
    : JSON.stringify(lastUserMsg?.content || "No user prompt");

  const systemMessage = messages.find((m) => m.role === "system" || m.role === "developer");
  const systemPromptText = systemMessage && typeof systemMessage.content === "string" 
    ? systemMessage.content 
    : null;

  // Resolve content and reasoning
  let responseText = opts.responseContent || "";
  let reasoningText = opts.reasoningContent || "";

  if (!reasoningText && responseText) {
    const extracted = extractThinking(responseText);
    if (extracted.thinking) {
      reasoningText = extracted.thinking;
      responseText = extracted.cleanContent;
    }
  }

  // Token estimates
  const promptTokens = opts.usage?.prompt_tokens ?? Math.max(15, Math.round(JSON.stringify(messages).length / 4));
  const completionTokens = opts.usage?.completion_tokens ?? Math.max(20, Math.round((responseText.length + reasoningText.length) / 4));
  const totalTokens = opts.usage?.total_tokens ?? (promptTokens + completionTokens);
  const reasoningTokens = opts.usage?.completion_tokens_details?.reasoning_tokens ?? (reasoningText ? Math.round(reasoningText.length / 4) : 0);

  // Approximate cost estimate (using average blended GPT-4o / DeepSeek rates)
  const costEstimate = Number(((promptTokens * 0.0000025) + (completionTokens * 0.00001)).toFixed(5));

  const title = customTitle || `Proxy: ${userPromptText.slice(0, 50)}${userPromptText.length > 50 ? "..." : ""}`;
  const effectiveAgent = agentName || "ZeroCode-ProxyAgent";

  const allTags = Array.from(new Set([
    "proxy",
    "zero-code",
    model,
    ...(opts.tags || []),
    ...(reasoningText ? ["cot-reasoning"] : []),
    ...(opts.toolCalls?.length ? ["tool-calls"] : []),
  ]));

  // 1. Create TraceRun
  const trace = await prisma.traceRun.create({
    data: {
      workspaceId: workspaceId || null,
      title,
      agentName: effectiveAgent,
      model,
      status: errorMessage ? "FAILED" : status,
      totalTokens,
      promptTokens,
      completionTokens,
      reasoningTokens,
      costEstimate,
      durationMs,
      tags: JSON.stringify(allTags),
      description: `Intercepted via GhostTRACE OpenAI Zero-Code Tracing Proxy for model: ${model}.`,
    },
  });

  traceEventBus.emit("trace_update", {
    event: "TRACE_START",
    trace: { ...trace, nodes: [], edges: [] },
  });

  let stepCounter = 1;
  let previousNodeId: string | null = null;
  let ghostCount = 0;

  // Helper to append node & edge
  async function appendNode(nodeData: {
    type: string;
    label: string;
    role: string;
    content: string;
    isGhost?: boolean;
    ghostReason?: string;
    rawInput?: any;
    rawOutput?: any;
    tokens?: number;
    latencyMs?: number;
    posX?: number;
    posY?: number;
  }) {
    const nodeId = `${trace.id}-s${stepCounter}`;
    const isGhost = Boolean(nodeData.isGhost);
    if (isGhost) ghostCount++;

    const node = await prisma.traceNode.create({
      data: {
        traceRunId: trace.id,
        nodeId,
        stepIndex: stepCounter,
        type: nodeData.type,
        label: nodeData.label,
        role: nodeData.role,
        content: nodeData.content,
        rawInput: nodeData.rawInput ? JSON.stringify(nodeData.rawInput) : null,
        rawOutput: nodeData.rawOutput ? JSON.stringify(nodeData.rawOutput) : null,
        latencyMs: nodeData.latencyMs || Math.round(durationMs / 4),
        tokens: nodeData.tokens || Math.round(totalTokens / 4),
        cost: Number((costEstimate / 4).toFixed(5)),
        status: isGhost ? "PRUNED" : (nodeData.type === "ERROR" ? "FAILED" : "SUCCESS"),
        isGhost,
        ghostReason: nodeData.ghostReason || null,
        confidenceScore: isGhost ? 0.25 : 0.95,
        positionX: nodeData.posX ?? (60 + stepCounter * 270),
        positionY: nodeData.posY ?? (isGhost ? 480 : 200),
      },
    });

    let edge = null;
    if (previousNodeId) {
      edge = await prisma.traceEdge.create({
        data: {
          traceRunId: trace.id,
          edgeId: `edge-${previousNodeId}-${nodeId}`,
          source: previousNodeId,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "Critic Veto" : "Next",
          isGhost,
        },
      });
    }

    traceEventBus.emit("trace_update", {
      event: "NODE_ADDED",
      traceId: trace.id,
      node,
      edge,
    });

    if (!isGhost) {
      previousNodeId = nodeId;
    }
    stepCounter++;
    return node;
  }

  // Step 1: User Prompt
  const userNode = await appendNode({
    type: "USER_PROMPT",
    label: "User Directive",
    role: "user",
    content: userPromptText,
    rawInput: messages,
    tokens: promptTokens,
    latencyMs: 15,
    posY: 80,
  });

  // Step 2: System / Developer Persona (if present)
  if (systemPromptText) {
    await appendNode({
      type: "THINKING",
      label: "System Instructions & Constraints",
      role: "system",
      content: systemPromptText,
      tokens: Math.round(systemPromptText.length / 4),
      latencyMs: 10,
      posY: 180,
    });
  }

  // Step 3: Chain-of-Thought / DeepSeek Reasoning
  if (reasoningText) {
    await appendNode({
      type: "THINKING",
      label: "Chain-of-Thought Reasoning",
      role: "assistant",
      content: reasoningText,
      tokens: reasoningTokens || Math.round(reasoningText.length / 4),
      latencyMs: Math.round(durationMs * 0.4),
      posY: 220,
    });
  }

  // Step 4: Guardrail Safety Audit (Check for Ghost Branches)
  const auditTargetText = `${userPromptText} ${reasoningText} ${responseText} ${JSON.stringify(opts.toolCalls || "")}`;
  for (const rule of DEFAULT_GUARDRAILS) {
    if (!rule.enabled) continue;
    const testNode: TraceNodeData = {
      nodeId: "audit",
      stepIndex: stepCounter,
      type: "THINKING",
      label: "Proxy Guardrail Audit",
      content: auditTargetText,
      rawInput: messages,
      rawOutput: responseText,
      status: "SUCCESS",
      isGhost: false,
    };
    const check = rule.check(testNode);
    if (check.violated) {
      await appendNode({
        type: "GHOST_REJECTED",
        label: `Ghost: Critic Veto (${rule.name})`,
        role: "critic",
        content: `Safety Policy Intercept: ${check.reason}`,
        isGhost: true,
        ghostReason: check.reason,
        tokens: 350,
        latencyMs: 120,
        posY: 520,
      });
      break;
    }
  }

  // Step 5: Tool Calls (if function calling triggered)
  if (opts.toolCalls && opts.toolCalls.length > 0) {
    for (const tool of opts.toolCalls) {
      const funcName = tool.function?.name || tool.name || "invoked_tool";
      const funcArgs = tool.function?.arguments || tool.arguments || "{}";
      await appendNode({
        type: "TOOL_CALL",
        label: `Tool: ${funcName}`,
        role: "assistant",
        content: typeof funcArgs === "string" ? funcArgs : JSON.stringify(funcArgs, null, 2),
        rawInput: tool,
        tokens: Math.round(JSON.stringify(tool).length / 4),
        latencyMs: Math.round(durationMs * 0.25),
        posY: 340,
      });
    }
  }

  // Step 6: Final LLM Response or Error
  if (errorMessage) {
    await appendNode({
      type: "ERROR",
      label: "Upstream Execution Error",
      role: "assistant",
      content: errorMessage,
      tokens: 40,
      latencyMs: durationMs,
      posY: 240,
    });
  } else if (responseText) {
    await appendNode({
      type: "LLM_RESPONSE",
      label: "Synthesized Completion",
      role: "assistant",
      content: responseText,
      rawOutput: { content: responseText, usage: opts.usage },
      tokens: completionTokens,
      latencyMs: Math.round(durationMs * 0.5),
      posY: 200,
    });
  }

  // Finalize TraceRun stats
  await prisma.traceRun.update({
    where: { id: trace.id },
    data: {
      ghostBranchCount: ghostCount,
      status: errorMessage ? "FAILED" : "COMPLETED",
    },
  });

  traceEventBus.emit("trace_update", {
    event: "TRACE_END",
    traceId: trace.id,
    status: errorMessage ? "FAILED" : "COMPLETED",
  });

  return trace;
}
