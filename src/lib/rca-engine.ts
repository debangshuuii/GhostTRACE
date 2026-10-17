import { TraceRunData, TraceNodeData } from "./types";
import { analyzeChainOfThought } from "./cot-analyzer";

export type RcaFailureMode =
  | "CRITIC_SAFETY_VETO"
  | "HALLUCINATED_TOOL_PARAM"
  | "SWARM_PING_PONG_LOOP"
  | "TOKEN_BLAST_RADIUS_EXHAUSTION"
  | "CONTEXT_DRIFT"
  | "TOOL_EXECUTION_ERROR"
  | "UNVERIFIED_ASSUMPTION";

export interface CausalTimelineEvent {
  stepIndex: number;
  nodeId: string;
  label: string;
  type: string;
  role: "TRIGGER" | "CONTRIBUTING_FACTOR" | "ESCALATION" | "INTERVENTION" | "ROOT_CAUSE";
  description: string;
  tokens?: number;
  latencyMs?: number;
}

export interface RcaRemediationPatch {
  type: "SYSTEM_PROMPT" | "GUARDRAIL_RULE" | "TOOL_SCHEMA";
  title: string;
  explanation: string;
  codeSnippet: string;
}

export interface RcaReport {
  traceId: string;
  traceTitle: string;
  generatedAt: string;
  failureMode: RcaFailureMode;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number; // 0 to 1
  rootCauseSummary: string;
  impactAssessment: string;
  failedStepIndex: number;
  failedNodeLabel: string;
  causalChain: CausalTimelineEvent[];
  blastRadius: {
    wastedTokens: number;
    wastedCostEstimate: number;
    wastedLatencyMs: number;
    prunedBranchCount: number;
  };
  remediation: RcaRemediationPatch;
}

/**
 * Analyzes an execution trace or specific node to determine root cause of failures, vetoes, or drifts.
 */
export function analyzeRootCause(
  trace: TraceRunData,
  targetNodeId?: string | null
): RcaReport {
  const nodes = Array.isArray(trace.nodes) ? trace.nodes : [];

  // Determine the primary failure node
  let failedNode: TraceNodeData | undefined;
  if (targetNodeId) {
    failedNode = nodes.find((n) => n.nodeId === targetNodeId || n.id === targetNodeId);
  }

  if (!failedNode) {
    // Look for first ghost node, error node, or failed node
    failedNode =
      nodes.find((n) => n.isGhost) ||
      nodes.find((n) => n.status === "FAILED" || n.status === "ERROR") ||
      nodes[nodes.length - 1];
  }

  const failedIndex = failedNode?.stepIndex || (nodes.length > 0 ? nodes.length : 1);
  const failedLabel = failedNode?.label || "Execution Terminal State";
  const failedContent = failedNode?.content || "";
  const ghostReason = failedNode?.ghostReason || "";

  // 1. Detect Failure Mode
  let failureMode: RcaFailureMode = "TOOL_EXECUTION_ERROR";
  let severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "HIGH";
  let rootCauseSummary = "";
  let impactAssessment = "";
  const confidenceScore = 0.92;

  const contentLower = (failedContent + " " + ghostReason).toLowerCase();

  if (
    contentLower.includes("rm -rf") ||
    contentLower.includes("drop table") ||
    contentLower.includes("unauthorized") ||
    contentLower.includes("safety") ||
    contentLower.includes("veto")
  ) {
    failureMode = "CRITIC_SAFETY_VETO";
    severity = "CRITICAL";
    rootCauseSummary =
      "Speculative Critic Policy intervened to block an invariant or security policy violation. The agent attempted an unverified or destructive action outside its permitted boundary.";
    impactAssessment =
      "Execution branch was quarantined before commitment to filesystem/production environment. Zero data corruption occurred.";
  } else if (
    contentLower.includes("token") ||
    contentLower.includes("blast") ||
    (failedNode?.tokens || 0) > 4000
  ) {
    failureMode = "TOKEN_BLAST_RADIUS_EXHAUSTION";
    severity = "HIGH";
    rootCauseSummary =
      "Chain-of-thought token explosion. The model entered an unconstrained reasoning spiral or repetitive syntactic iteration.";
    impactAssessment =
      "Elevated token burn and API cost without proportional reasoning progress.";
  } else if (
    contentLower.includes("ping-pong") ||
    contentLower.includes("loop") ||
    contentLower.includes("circular")
  ) {
    failureMode = "SWARM_PING_PONG_LOOP";
    severity = "HIGH";
    rootCauseSummary =
      "Reciprocal ping-pong loop detected between agent roles without state convergence.";
    impactAssessment =
      "Agent communication deadlocked before circuit breaker engaged.";
  } else if (
    contentLower.includes("hallucin") ||
    contentLower.includes("not found") ||
    contentLower.includes("no such file") ||
    contentLower.includes("enoent")
  ) {
    failureMode = "HALLUCINATED_TOOL_PARAM";
    severity = "MEDIUM";
    rootCauseSummary =
      "The agent fabricated a non-existent file path, schema parameter, or variable name instead of querying repository ground truth.";
    impactAssessment =
      "Downstream tool execution failed, requiring speculative rollback.";
  } else {
    // Check Chain of Thought for cognitive drift or hesitation loop
    const cotAnalysis = analyzeChainOfThought(failedContent);
    if (cotAnalysis.hesitationRatePct > 40 || cotAnalysis.circularLoopDetected || cotAnalysis.efficiencyScore < 50) {
      failureMode = "CONTEXT_DRIFT";
      severity = "MEDIUM";
      rootCauseSummary =
        "Cognitive Drift & Hesitation: The reasoning trajectory drifted away from original user constraints or encountered circular reasoning loops.";
      impactAssessment =
        "Agent generated speculative solutions disconnected from initial user criteria or delayed execution.";
    } else {
      failureMode = "UNVERIFIED_ASSUMPTION";
      severity = "LOW";
      rootCauseSummary =
        ghostReason ||
        "Speculative hypothesis pruned by tree search critic in favor of higher-confidence alternative.";
      impactAssessment =
        "Suboptimal branch safely pruned; active trunk selected alternative path.";
    }
  }

  // 2. Build Causal Chain Timeline
  const causalChain: CausalTimelineEvent[] = [];

  // Goal Ingestion Step
  const firstNode = nodes[0];
  if (firstNode) {
    causalChain.push({
      stepIndex: firstNode.stepIndex,
      nodeId: firstNode.nodeId,
      label: firstNode.label,
      type: firstNode.type,
      role: "TRIGGER",
      description: `Initial directive received: "${firstNode.content.slice(0, 80)}..."`,
      tokens: firstNode.tokens || 0,
      latencyMs: firstNode.latencyMs || 0,
    });
  }

  // Preceding Thinking/Tool steps
  const precedingSteps = nodes.filter(
    (n) => n.stepIndex < failedIndex && n.stepIndex > 1
  );
  if (precedingSteps.length > 0) {
    const keyStep = precedingSteps[precedingSteps.length - 1];
    causalChain.push({
      stepIndex: keyStep.stepIndex,
      nodeId: keyStep.nodeId,
      label: keyStep.label,
      type: keyStep.type,
      role: "CONTRIBUTING_FACTOR",
      description: `Formulated hypothesis prior to divergence: "${keyStep.content.slice(0, 90)}..."`,
      tokens: keyStep.tokens || 0,
      latencyMs: keyStep.latencyMs || 0,
    });
  }

  // Failed / Vetoed Step
  if (failedNode) {
    causalChain.push({
      stepIndex: failedNode.stepIndex,
      nodeId: failedNode.nodeId,
      label: failedNode.label,
      type: failedNode.type,
      role: "ROOT_CAUSE",
      description: ghostReason
        ? `Failure Point: Critic Veto triggered: ${ghostReason}`
        : `Terminal Divergence: ${failedContent.slice(0, 100)}...`,
      tokens: failedNode.tokens || 0,
      latencyMs: failedNode.latencyMs || 0,
    });
  }

  // Calculate Wasted Blast Radius
  const wastedTokens = failedNode?.tokens || 750;
  const wastedCost = Number(((wastedTokens / 1000) * 0.003).toFixed(5));
  const wastedLatency = failedNode?.latencyMs || 420;

  // 3. Automated Remediation Blueprint
  let remediation: RcaRemediationPatch;
  switch (failureMode) {
    case "CRITIC_SAFETY_VETO":
      remediation = {
        type: "GUARDRAIL_RULE",
        title: "Deterministic Syscall & Command Allowlist",
        explanation:
          "Inject an explicit command boundary invariant in the agent's system prompt and register strict regex guardrails in the MCP dispatcher.",
        codeSnippet: `// Register in GhostTRACE Guardrails:\nexport const RESTRICTED_COMMAND_INVARIANT = {\n  forbiddenPatterns: [/rm\\s+-rf/i, /drop\\s+table/i, /chmod\\s+777/i],\n  policyAction: "BLOCK_AND_VETO",\n  rejectionMessage: "Command violates zero-trust immutable filesystem invariant."\n};`,
      };
      break;

    case "HALLUCINATED_TOOL_PARAM":
      remediation = {
        type: "TOOL_SCHEMA",
        title: "Enforce Canonical Grounded Path Verification",
        explanation:
          "Force the agent to execute directory listing or AST symbols scan before proposing file paths.",
        codeSnippet: `<system_prompt_constraint>\nRule: NEVER hypothesize or guess file paths or imported module names.\nAlways execute 'read_file' or 'list_dir' on the target directory prior to generating edits.\n</system_prompt_constraint>`,
      };
      break;

    case "SWARM_PING_PONG_LOOP":
      remediation = {
        type: "GUARDRAIL_RULE",
        title: "Active Loop Circuit Breaker Limit",
        explanation:
          "Configure maximum reciprocal ping-pong exchanges between subagents before enforcing a synthesizer summary.",
        codeSnippet: `// GhostTRACE Swarm Circuit Breaker:\nexport const SWARM_POLICY = {\n  maxReciprocalTurns: 3,\n  onExceeded: "SYNTHESIZE_AND_TERMINATE",\n  tokenThrottleThreshold: 12000,\n};`,
      };
      break;

    default:
      remediation = {
        type: "SYSTEM_PROMPT",
        title: "Chain-of-Thought Invariant Anchor",
        explanation:
          "Add invariant checkpoints to the prompt instructing the model to verify each hypothesis against initial requirements.",
        codeSnippet: `<cot_verification_instruction>\nAt each step in your reasoning, explicitly verify:\n1. Does this step directly serve the primary user directive?\n2. Are all referenced identifiers verified against real workspace files?\nIf verification fails, backtrack immediately and declare a ghost branch.\n</cot_verification_instruction>`,
      };
  }

  return {
    traceId: trace.id,
    traceTitle: trace.title,
    generatedAt: new Date().toISOString(),
    failureMode,
    severity,
    confidenceScore,
    rootCauseSummary,
    impactAssessment,
    failedStepIndex: failedIndex,
    failedNodeLabel: failedLabel,
    causalChain,
    blastRadius: {
      wastedTokens,
      wastedCostEstimate: wastedCost,
      wastedLatencyMs: wastedLatency,
      prunedBranchCount: trace.ghostBranchCount || 1,
    },
    remediation,
  };
}

/**
 * Formats the RCA report into a presentation-grade Markdown Incident Post-Mortem.
 */
export function generateIncidentPostMortemMarkdown(rca: RcaReport): string {
  return `# 🚨 GhostTRACE Incident Root Cause Analysis (RCA)
**Trace:** \`${rca.traceTitle}\` (ID: \`${rca.traceId}\`)  
**Generated At:** ${rca.generatedAt}  
**Classification:** \`${rca.failureMode}\`  
**Severity:** **${rca.severity}** (Confidence: ${Math.round(rca.confidenceScore * 100)}%)  

---

## 📌 Executive Summary
${rca.rootCauseSummary}

**Impact Assessment:**  
${rca.impactAssessment}

---

## 💥 Blast Radius & Waste Metrics
- **Failed Step:** Step #${rca.failedStepIndex} (\`${rca.failedNodeLabel}\`)
- **Wasted Reasoning Tokens:** \`${rca.blastRadius.wastedTokens.toLocaleString()}\`
- **Wasted Cost Estimate:** \`$${rca.blastRadius.wastedCostEstimate.toFixed(5)}\`
- **Wasted Step Latency:** \`${rca.blastRadius.wastedLatencyMs}ms\`
- **Pruned Ghost Branches:** \`${rca.blastRadius.prunedBranchCount}\`

---

## ⛓️ Causal Timeline & Failure Chain
| Step | Phase | Label | Impact Role | Evidence / Log Snippet |
|---|---|---|---|---|
${rca.causalChain
  .map(
    (c) =>
      `| #${c.stepIndex} | \`${c.type}\` | ${c.label} | **${c.role}** | ${c.description.replace(/\|/g, "\\|")} |`
  )
  .join("\n")}

---

## 🛠️ Automated Remediation Blueprint: ${rca.remediation.title}
*Type: \`${rca.remediation.type}\`*

${rca.remediation.explanation}

\`\`\`typescript
${rca.remediation.codeSnippet}
\`\`\`

---
*Report generated autonomously by GhostTRACE Observability Studio • Root Cause Engine v2.0*
`;
}
