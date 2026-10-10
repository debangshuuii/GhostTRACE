import { TraceNodeData } from "./types";

export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  enabled: boolean;
  check: (node: TraceNodeData) => { violated: boolean; reason?: string };
}

export const DEFAULT_GUARDRAILS: GuardrailRule[] = [
  {
    id: "dangerous_shell_commands",
    name: "Destructive Shell & Infrastructure Commands",
    description: "Detects dangerous system commands such as rm -rf, drop table, kubectl drain, and mkfs.",
    severity: "CRITICAL",
    enabled: true,
    check: (node) => {
      const dangerousPatterns = [
        /rm\s+-rf\s+\//i,
        /drop\s+database/i,
        /drop\s+table/i,
        /kubectl\s+drain/i,
        /mkfs\./i,
        /chmod\s+-R\s+777/i,
      ];
      const text = `${node.label} ${node.content} ${JSON.stringify(node.rawInput || "")}`;
      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          return {
            violated: true,
            reason: `Detected prohibited command pattern: "${pattern.source}"`,
          };
        }
      }
      return { violated: false };
    },
  },
  {
    id: "secret_credential_leak",
    name: "Secret & PII Credential Leak Detector",
    description: "Scans for hardcoded AWS keys, GitHub tokens, JWTs, and private keys in thoughts or tool arguments.",
    severity: "HIGH",
    enabled: true,
    check: (node) => {
      const secretPatterns = [
        /AKIA[0-9A-Z]{16}/,
        /ghp_[a-zA-Z0-9]{36}/,
        /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
        /-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
      ];
      const text = `${node.content} ${JSON.stringify(node.rawInput || "")} ${JSON.stringify(node.rawOutput || "")}`;
      for (const pattern of secretPatterns) {
        if (pattern.test(text)) {
          return {
            violated: true,
            reason: "Detected potential API token, JWT, or private key in node payload.",
          };
        }
      }
      return { violated: false };
    },
  },
  {
    id: "excessive_token_blast_radius",
    name: "Single-Step Blast Radius & Token Spike",
    description: "Flags any single reasoning step that consumes over 5,000 tokens or exhibits runaway looping.",
    severity: "MEDIUM",
    enabled: true,
    check: (node) => {
      if ((node.tokens || 0) > 5000) {
        return {
          violated: true,
          reason: `Step token count (${node.tokens}) exceeds safe policy threshold of 5,000 tokens.`,
        };
      }
      return { violated: false };
    },
  },
  {
    id: "unverified_citation_hallucination",
    name: "Unverified Secondary Citation Check",
    description: "Detects unverified secondary hearsay claims in finance/medical contexts without supporting tool results.",
    severity: "HIGH",
    enabled: true,
    check: (node) => {
      if (node.isGhost && node.ghostReason?.toLowerCase().includes("hallucination")) {
        return {
          violated: true,
          reason: `Critic flagged hallucinated branch: ${node.ghostReason}`,
        };
      }
      return { violated: false };
    },
  },
];

export function auditTraceNodes(nodes: TraceNodeData[], rules: GuardrailRule[]) {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const violations: {
    nodeId: string;
    stepIndex: number;
    nodeLabel: string;
    ruleId: string;
    ruleName: string;
    severity: string;
    reason: string;
  }[] = [];

  const activeRules = rules.filter((r) => r.enabled);

  for (const node of nodes) {
    for (const rule of activeRules) {
      const res = rule.check(node);
      if (res.violated) {
        violations.push({
          nodeId: node.nodeId,
          stepIndex: node.stepIndex,
          nodeLabel: node.label,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          reason: res.reason || "Policy violation detected",
        });
      }
    }
  }

  return violations;
}
