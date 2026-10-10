import { TraceUploadData, TraceNodeData, TraceEdgeData } from "./types";

interface OtelAttribute {
  key: string;
  value: {
    stringValue?: string;
    intValue?: number | string;
    doubleValue?: number;
    boolValue?: boolean;
    arrayValue?: any;
    kvlistValue?: any;
  } | string | number | boolean;
}

interface OtelSpan {
  traceId?: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano?: number | string;
  endTimeUnixNano?: number | string;
  attributes?: OtelAttribute[];
  status?: {
    code?: number;
    message?: string;
  };
}

interface OtelScopeSpan {
  scope?: { name?: string; version?: string };
  spans?: OtelSpan[];
}

interface OtelResourceSpan {
  resource?: {
    attributes?: OtelAttribute[];
  };
  scopeSpans?: OtelScopeSpan[];
}

export interface OtelPayload {
  resourceSpans?: OtelResourceSpan[];
}

function extractAttrValue(attr: OtelAttribute): any {
  if (typeof attr.value !== "object" || attr.value === null) {
    return attr.value;
  }
  const val = attr.value;
  if ("stringValue" in val) return val.stringValue;
  if ("intValue" in val) return Number(val.intValue);
  if ("doubleValue" in val) return val.doubleValue;
  if ("boolValue" in val) return val.boolValue;
  return JSON.stringify(val);
}

function getAttrMap(attrs: OtelAttribute[] = []): Record<string, any> {
  const map: Record<string, any> = {};
  for (const a of attrs) {
    map[a.key] = extractAttrValue(a);
  }
  return map;
}

/**
 * Parses standard OpenTelemetry JSON spans into GhostTRACE DAG format
 */
export function parseOtelPayload(payload: OtelPayload): TraceUploadData {
  const allSpans: { span: OtelSpan; resourceAttrs: Record<string, any> }[] = [];

  for (const rSpan of payload.resourceSpans || []) {
    const resourceAttrs = getAttrMap(rSpan.resource?.attributes || []);
    for (const sSpan of rSpan.scopeSpans || []) {
      for (const span of sSpan.spans || []) {
        allSpans.push({ span, resourceAttrs });
      }
    }
  }

  if (allSpans.length === 0) {
    throw new Error("No spans found in OpenTelemetry payload");
  }

  // Sort spans by start time if available
  allSpans.sort((a, b) => {
    const startA = Number(a.span.startTimeUnixNano || 0);
    const startB = Number(b.span.startTimeUnixNano || 0);
    return startA - startB;
  });

  const rootSpan = allSpans[0];
  const rootAttrs = getAttrMap(rootSpan.span.attributes || []);
  const serviceName =
    rootSpan.resourceAttrs["service.name"] ||
    rootAttrs["service.name"] ||
    rootAttrs["agent.name"] ||
    "Autonomous OTel Agent";

  const model =
    rootAttrs["gen_ai.request.model"] ||
    rootAttrs["gen_ai.response.model"] ||
    rootAttrs["llm.model"] ||
    rootAttrs["model"] ||
    "claude-3-7-sonnet";

  const traceTitle =
    rootAttrs["gen_ai.prompt"] ||
    rootAttrs["agent.objective"] ||
    rootSpan.span.name ||
    `OTel Agent Trace: ${serviceName}`;

  const nodes: TraceNodeData[] = [];
  const edges: TraceEdgeData[] = [];

  const spanIdToNodeId = new Map<string, string>();
  let totalTokens = 0;
  let totalLatency = 0;

  allSpans.forEach(({ span }, index) => {
    const attrs = getAttrMap(span.attributes || []);
    const nodeId = span.spanId || `span-${index + 1}`;
    spanIdToNodeId.set(span.spanId, nodeId);

    // Calculate latency
    let latencyMs = 0;
    if (span.startTimeUnixNano && span.endTimeUnixNano) {
      latencyMs = Math.max(
        10,
        Math.round((Number(span.endTimeUnixNano) - Number(span.startTimeUnixNano)) / 1_000_000)
      );
    } else {
      latencyMs = attrs["latency_ms"] || attrs["duration_ms"] || 250;
    }
    totalLatency += latencyMs;

    // Tokens & cost
    const tokens =
      attrs["gen_ai.usage.total_tokens"] ||
      attrs["llm.usage.total_tokens"] ||
      attrs["tokens"] ||
      Math.floor(Math.random() * 500) + 200;
    totalTokens += tokens;

    const isGhost =
      Boolean(attrs["ghost"] || attrs["is_ghost"] || attrs["pruned"] || attrs["rejected"]) ||
      span.name.toLowerCase().includes("ghost") ||
      span.name.toLowerCase().includes("pruned");

    const ghostReason =
      attrs["ghost.reason"] ||
      attrs["ghost_reason"] ||
      attrs["prune_reason"] ||
      attrs["rejection_reason"] ||
      (isGhost ? "Critic evaluation policy flagged and pruned this branch" : undefined);

    // Determine type
    let nodeType: TraceNodeData["type"] = "THINKING";
    const nameLower = span.name.toLowerCase();
    if (index === 0 && !isGhost) {
      nodeType = "USER_PROMPT";
    } else if (isGhost) {
      nodeType = "GHOST_REJECTED";
    } else if (nameLower.includes("tool") || attrs["gen_ai.tool.name"] || attrs["tool.name"]) {
      nodeType = "TOOL_CALL";
    } else if (nameLower.includes("response") || nameLower.includes("final") || index === allSpans.length - 1) {
      nodeType = "LLM_RESPONSE";
    }

    const content =
      attrs["gen_ai.content"] ||
      attrs["gen_ai.completion"] ||
      attrs["gen_ai.prompt"] ||
      attrs["llm.output"] ||
      attrs["content"] ||
      attrs["description"] ||
      `Step ${index + 1}: ${span.name}`;

    nodes.push({
      nodeId,
      stepIndex: index + 1,
      type: nodeType,
      label: span.name,
      role: isGhost ? "assistant" : index === 0 ? "user" : "assistant",
      content,
      rawInput: attrs["gen_ai.tool.input"] || attrs["tool.arguments"] || null,
      rawOutput: attrs["gen_ai.tool.output"] || attrs["tool.result"] || null,
      latencyMs,
      tokens,
      cost: tokens * 0.000003,
      status: isGhost ? "PRUNED" : span.status?.code === 2 ? "ERROR" : "SUCCESS",
      isGhost,
      ghostReason,
      confidenceScore: attrs["confidence"] || (isGhost ? 0.45 : 0.95),
      positionX: 50 + index * 280,
      positionY: isGhost ? 80 : 220,
    });

    // Create edge if parentSpanId exists
    if (span.parentSpanId && spanIdToNodeId.has(span.parentSpanId)) {
      edges.push({
        edgeId: `edge-${span.parentSpanId}-${nodeId}`,
        source: spanIdToNodeId.get(span.parentSpanId)!,
        target: nodeId,
        type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
        label: isGhost ? "Pruned Branch" : "Next",
        isGhost,
      });
    } else if (index > 0 && !edges.some((e) => e.target === nodeId)) {
      // Connect sequentially to preceding non-ghost node or parent
      const prevChosen = nodes.slice(0, index).reverse().find((n) => !n.isGhost);
      if (prevChosen) {
        edges.push({
          edgeId: `edge-${prevChosen.nodeId}-${nodeId}`,
          source: prevChosen.nodeId,
          target: nodeId,
          type: isGhost ? "GHOST_PRUNED" : "DEFAULT",
          label: isGhost ? "Pruned Alternative" : "Next",
          isGhost,
        });
      }
    }
  });

  return {
    title: traceTitle,
    agentName: serviceName,
    model,
    tags: ["otel", "opentelemetry", "live-ingestion"],
    description: `Ingested via OpenTelemetry Trace Exporter (${nodes.length} spans)`,
    nodes,
    edges,
  };
}
