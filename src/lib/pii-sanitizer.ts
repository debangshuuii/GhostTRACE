import { TraceRunData, TraceNodeData } from "./types";

export interface PiiRedactionReport {
  redactedCount: number;
  categoriesDetected: string[];
  tokensScrubbed: number;
}

const REDACTION_PATTERNS = [
  {
    name: "OPENAI_API_KEY",
    regex: /sk-[a-zA-Z0-9_-]{20,}/g,
    replacement: "sk-••••••••••••[REDACTED_API_KEY]",
  },
  {
    name: "ANTHROPIC_API_KEY",
    regex: /sk-ant-[a-zA-Z0-9_-]{20,}/g,
    replacement: "sk-ant-••••••••••••[REDACTED_KEY]",
  },
  {
    name: "GHOSTTRACE_KEY",
    regex: /gt_(live|test)_[a-zA-Z0-9_-]{16,}/g,
    replacement: "gt_$1_••••••••••••[REDACTED_TOKEN]",
  },
  {
    name: "GITHUB_TOKEN",
    regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g,
    replacement: "ghp_••••••••••••[REDACTED_PAT]",
  },
  {
    name: "JWT_BEARER_TOKEN",
    regex: /Bearer\s+ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/gi,
    replacement: "Bearer [REDACTED_JWT_TOKEN]",
  },
  {
    name: "AWS_ACCESS_KEY",
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    replacement: "[REDACTED_AWS_KEY_ID]",
  },
  {
    name: "PRIVATE_KEY_BLOCK",
    regex: /-----BEGIN\s+([A-Z\s]+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+([A-Z\s]+)?PRIVATE\s+KEY-----/g,
    replacement: "[REDACTED_RSA_OR_EC_PRIVATE_KEY_BLOCK]",
  },
  {
    name: "DATABASE_CONNECTION_URI",
    regex: /(postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@[^\s\/]+/gi,
    replacement: "$1://[USER]:[REDACTED_PASSWORD]@[HOST]",
  },
  {
    name: "EMAIL_ADDRESS",
    regex: /\b([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    replacement: "$1***@$2",
  },
  {
    name: "IPV4_ADDRESS",
    regex: /\b(?!127\.0\.0\.1|0\.0\.0\.0)(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: "[REDACTED_IP]",
  },
];

/**
 * Sanitizes arbitrary text string by masking API keys, credentials, JWTs, and PII.
 */
export function sanitizePiiText(text: string): { sanitized: string; report: PiiRedactionReport } {
  if (!text || typeof text !== "string") {
    return {
      sanitized: text || "",
      report: { redactedCount: 0, categoriesDetected: [], tokensScrubbed: 0 },
    };
  }

  let result = text;
  let totalRedacted = 0;
  const categories: Set<string> = new Set();

  for (const pattern of REDACTION_PATTERNS) {
    const matches = result.match(pattern.regex);
    if (matches && matches.length > 0) {
      totalRedacted += matches.length;
      categories.add(pattern.name);
      result = result.replace(pattern.regex, pattern.replacement);
    }
  }

  return {
    sanitized: result,
    report: {
      redactedCount: totalRedacted,
      categoriesDetected: Array.from(categories),
      tokensScrubbed: Math.round(totalRedacted * 8),
    },
  };
}

/**
 * Recursively sanitizes JSON objects or primitives.
 */
export function sanitizePiiPayload<T = any>(payload: T): T {
  if (payload === null || payload === undefined) return payload;

  if (typeof payload === "string") {
    return sanitizePiiText(payload).sanitized as unknown as T;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePiiPayload(item)) as unknown as T;
  }

  if (typeof payload === "object") {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload as Record<string, any>)) {
      copy[key] = sanitizePiiPayload(value);
    }
    return copy as T;
  }

  return payload;
}

/**
 * Sanitizes an individual TraceNodeData object.
 */
export function sanitizeTraceNode(node: TraceNodeData): TraceNodeData {
  return {
    ...node,
    content: sanitizePiiText(node.content || "").sanitized,
    rawInput: sanitizePiiPayload(node.rawInput),
    rawOutput: sanitizePiiPayload(node.rawOutput),
    ghostReason: node.ghostReason ? sanitizePiiText(node.ghostReason).sanitized : node.ghostReason,
    interventionInput: node.interventionInput
      ? sanitizePiiText(node.interventionInput).sanitized
      : node.interventionInput,
  };
}

/**
 * Fully sanitizes a complete TraceRunData object for safe public export,
 * compliance audits, or multi-tenant sharing.
 */
export function sanitizeTraceRun(trace: TraceRunData): {
  sanitizedTrace: TraceRunData;
  report: PiiRedactionReport;
} {
  let totalCount = 0;
  const allCategories: Set<string> = new Set();

  const titleRes = sanitizePiiText(trace.title);
  totalCount += titleRes.report.redactedCount;
  titleRes.report.categoriesDetected.forEach((c) => allCategories.add(c));

  const descRes = sanitizePiiText(trace.description || "");
  totalCount += descRes.report.redactedCount;
  descRes.report.categoriesDetected.forEach((c) => allCategories.add(c));

  const sanitizedNodes = (trace.nodes || []).map((node) => {
    const contentRes = sanitizePiiText(node.content || "");
    totalCount += contentRes.report.redactedCount;
    contentRes.report.categoriesDetected.forEach((c) => allCategories.add(c));

    return sanitizeTraceNode(node);
  });

  const sanitizedTrace: TraceRunData = {
    ...trace,
    title: titleRes.sanitized,
    description: descRes.sanitized,
    nodes: sanitizedNodes,
  };

  return {
    sanitizedTrace,
    report: {
      redactedCount: totalCount,
      categoriesDetected: Array.from(allCategories),
      tokensScrubbed: Math.round(totalCount * 8),
    },
  };
}
