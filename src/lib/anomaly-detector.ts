import { TraceRunData, TraceNodeData } from "@/lib/types";

export interface AnomalyItem {
  type: "LATENCY_SPIKE" | "TOKEN_SURGE" | "HIGH_GHOST_RATIO" | "LOOP_DETECTED";
  label: string;
  description: string;
  metric: string;
  threshold: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface AnomalyReport {
  hasAnomaly: boolean;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  anomalies: AnomalyItem[];
}

/**
 * Analyzes an execution trace for real-time drift, anomalous latency,
 * runaway token expenditures, and excessive hallucination pruning.
 */
export function detectTraceAnomalies(trace: TraceRunData | null): AnomalyReport {
  if (!trace || !Array.isArray(trace.nodes) || trace.nodes.length === 0) {
    return { hasAnomaly: false, severity: "NONE", anomalies: [] };
  }

  const anomalies: AnomalyItem[] = [];
  const nodes = trace.nodes;

  // 1. Latency Spike Check (> 3000ms total duration or individual node > 2000ms)
  const maxNodeLatency = Math.max(...nodes.map((n) => n.latencyMs || 0));
  if (trace.durationMs > 3500 || maxNodeLatency > 2000) {
    anomalies.push({
      type: "LATENCY_SPIKE",
      label: "Latency SLA Violation",
      description: `Execution duration (${trace.durationMs}ms) or single step latency (${maxNodeLatency}ms) exceeds SLA thresholds.`,
      metric: `${trace.durationMs}ms`,
      threshold: "> 3500ms",
      severity: trace.durationMs > 5000 ? "CRITICAL" : "HIGH",
    });
  }

  // 2. Token Surge Check (> 4000 total tokens or reasoning tokens > 60% of total)
  if (trace.totalTokens > 3800) {
    anomalies.push({
      type: "TOKEN_SURGE",
      label: "Runaway Token Consumption",
      description: `Token usage (${trace.totalTokens.toLocaleString()}) exceeds budget threshold. Potential recursive context inflation.`,
      metric: `${trace.totalTokens.toLocaleString()} tok`,
      threshold: "> 3,800 tok",
      severity: trace.totalTokens > 6000 ? "CRITICAL" : "MEDIUM",
    });
  }

  // 3. High Ghost Branch / Hallucination Rejection Ratio (> 30% of total nodes)
  const ghostNodes = nodes.filter((n) => n.isGhost || n.type === "GHOST_REJECTED");
  const ghostRatio = nodes.length > 0 ? (ghostNodes.length / nodes.length) * 100 : 0;
  if (ghostRatio >= 30) {
    anomalies.push({
      type: "HIGH_GHOST_RATIO",
      label: "High Adversarial Pruning Rate",
      description: `${ghostRatio.toFixed(0)}% of agent steps were pruned as hallucinated dead-ends or safety vetoes.`,
      metric: `${ghostRatio.toFixed(0)}% Pruned`,
      threshold: ">= 30%",
      severity: ghostRatio >= 50 ? "CRITICAL" : "HIGH",
    });
  }

  // 4. Determine overall maximum severity
  let overallSeverity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "NONE";
  if (anomalies.some((a) => a.severity === "CRITICAL")) {
    overallSeverity = "CRITICAL";
  } else if (anomalies.some((a) => a.severity === "HIGH")) {
    overallSeverity = "HIGH";
  } else if (anomalies.some((a) => a.severity === "MEDIUM")) {
    overallSeverity = "MEDIUM";
  } else if (anomalies.length > 0) {
    overallSeverity = "LOW";
  }

  return {
    hasAnomaly: anomalies.length > 0,
    severity: overallSeverity,
    anomalies,
  };
}
