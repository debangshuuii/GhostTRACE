import { TraceRunData, TraceNodeData } from "./types";

export interface SwarmLoopAnalysis {
  hasLoop: boolean;
  loopSeverity: "CRITICAL" | "HIGH" | "NONE";
  loopWarning: string | null;
  pingPongPairs: Array<{ agentA: string; agentB: string; count: number; wastedTokens: number }>;
  uniqueAgents: string[];
  communicationMatrix: Record<string, Record<string, number>>;
  totalHandoffs: number;
}

/**
 * Analyzes multi-agent communication topology for recursive ping-pong loops and bottlenecks.
 */
export function analyzeSwarmTopology(trace: TraceRunData | null): SwarmLoopAnalysis {
  if (!trace || !Array.isArray(trace.nodes) || trace.nodes.length === 0) {
    return {
      hasLoop: false,
      loopSeverity: "NONE",
      loopWarning: null,
      pingPongPairs: [],
      uniqueAgents: [],
      communicationMatrix: {},
      totalHandoffs: 0,
    };
  }

  const nodes = [...trace.nodes].sort((a, b) => a.stepIndex - b.stepIndex);

  // Extract agent identities
  const agentSequence: Array<{ agent: string; node: TraceNodeData }> = [];
  const uniqueAgentsSet = new Set<string>();

  nodes.forEach((n) => {
    let agent = "Autonomous Agent";
    if (n.role && n.role !== "user" && n.role !== "assistant") {
      agent = n.role;
    } else if (n.type === "TOOL_CALL" || n.type === "TOOL_RESULT") {
      agent = "Tool Executor";
    } else if (n.isGhost || n.type === "GHOST_REJECTED") {
      agent = "Security Critic";
    } else if (n.type === "USER_PROMPT") {
      agent = "User / Gateway";
    } else if (n.type === "LLM_RESPONSE") {
      agent = "Synthesizer";
    } else {
      agent = trace.agentName || "Coordinator";
    }

    uniqueAgentsSet.add(agent);
    agentSequence.push({ agent, node: n });
  });

  const uniqueAgents = Array.from(uniqueAgentsSet);
  const communicationMatrix: Record<string, Record<string, number>> = {};

  uniqueAgents.forEach((a) => {
    communicationMatrix[a] = {};
    uniqueAgents.forEach((b) => {
      communicationMatrix[a][b] = 0;
    });
  });

  // Track handoffs
  let totalHandoffs = 0;
  const pairCounts: Record<string, { count: number; wastedTokens: number; a: string; b: string }> = {};

  for (let i = 0; i < agentSequence.length - 1; i++) {
    const from = agentSequence[i].agent;
    const to = agentSequence[i + 1].agent;

    if (from !== to) {
      totalHandoffs++;
      communicationMatrix[from][to] = (communicationMatrix[from][to] || 0) + 1;

      // Track bidirectional ping-pong
      const pairKey = [from, to].sort().join(" <-> ");
      if (!pairCounts[pairKey]) {
        pairCounts[pairKey] = { count: 0, wastedTokens: 0, a: from, b: to };
      }
      pairCounts[pairKey].count += 1;
      pairCounts[pairKey].wastedTokens += agentSequence[i + 1].node.tokens || 100;
    }
  }

  // Detect loop thresholds: if any pair exchanges messages >= 4 times
  const pingPongPairs: SwarmLoopAnalysis["pingPongPairs"] = [];
  let hasLoop = false;
  let loopSeverity: SwarmLoopAnalysis["loopSeverity"] = "NONE";
  let loopWarning: string | null = null;

  Object.values(pairCounts).forEach(({ a, b, count, wastedTokens }) => {
    if (count >= 3) {
      hasLoop = true;
      loopSeverity = count >= 5 ? "CRITICAL" : "HIGH";
      pingPongPairs.push({ agentA: a, agentB: b, count, wastedTokens });
    }
  });

  if (hasLoop && pingPongPairs.length > 0) {
    const worst = pingPongPairs[0];
    loopWarning = `Detected runaway ping-pong loop: ${worst.agentA} and ${worst.agentB} exchanged ${worst.count} messages (${worst.wastedTokens} tokens burned).`;
  }

  return {
    hasLoop,
    loopSeverity,
    loopWarning,
    pingPongPairs,
    uniqueAgents,
    communicationMatrix,
    totalHandoffs,
  };
}
