import { TraceRunData, TraceNodeData } from "./types";

export interface DpoPair {
  id: string;
  traceId: string;
  traceTitle: string;
  prompt: string;
  chosen: {
    nodeId: string;
    stepIndex: number;
    type: string;
    content: string;
    tokens?: number;
    latencyMs?: number;
  };
  rejected: {
    nodeId: string;
    stepIndex: number;
    type: string;
    content: string;
    ghostReason?: string;
    confidenceScore?: number;
    tokens?: number;
  };
  metadata: {
    model: string;
    agentName: string;
    timestamp: string;
  };
}

export function extractDpoPairsFromTrace(trace: TraceRunData): DpoPair[] {
  if (!trace || !Array.isArray(trace.nodes) || trace.nodes.length === 0) {
    return [];
  }

  const promptNode = trace.nodes.find((n) => n.type === "USER_PROMPT");
  const promptText = promptNode ? promptNode.content : (trace.title || "User Prompt");

  const ghostNodes = trace.nodes.filter((n) => n.isGhost);
  const chosenNodes = trace.nodes.filter(
    (n) => !n.isGhost && (n.type === "LLM_RESPONSE" || n.type === "THINKING" || n.type === "TOOL_CALL")
  );

  const pairs: DpoPair[] = [];

  ghostNodes.forEach((ghost, index) => {
    // Find closest winning candidate or final response
    const chosen =
      chosenNodes.find((c) => Math.abs(c.stepIndex - ghost.stepIndex) <= 2 && c.type !== "USER_PROMPT") ||
      chosenNodes[chosenNodes.length - 1] ||
      chosenNodes[0];

    if (chosen) {
      pairs.push({
        id: `dpo_${trace.id}_${index + 1}`,
        traceId: trace.id,
        traceTitle: trace.title,
        prompt: promptText,
        chosen: {
          nodeId: chosen.nodeId,
          stepIndex: chosen.stepIndex,
          type: chosen.type,
          content: chosen.content,
          tokens: chosen.tokens,
          latencyMs: chosen.latencyMs,
        },
        rejected: {
          nodeId: ghost.nodeId,
          stepIndex: ghost.stepIndex,
          type: ghost.type,
          content: ghost.content,
          ghostReason: ghost.ghostReason || "Critic policy rejected hypothesis",
          confidenceScore: ghost.confidenceScore,
          tokens: ghost.tokens,
        },
        metadata: {
          model: trace.model,
          agentName: trace.agentName,
          timestamp: String(trace.createdAt),
        },
      });
    }
  });

  return pairs;
}

export function formatPairsAsJsonl(pairs: DpoPair[]): string {
  return pairs
    .map((pair) =>
      JSON.stringify({
        prompt: pair.prompt,
        chosen: pair.chosen.content,
        rejected: pair.rejected.content,
        critic_rejection_reason: pair.rejected.ghostReason,
        model: pair.metadata.model,
      })
    )
    .join("\n");
}

/**
 * Formats pairs for Hugging Face TRL (DPOTrainer / ORPOTrainer)
 */
export function formatPairsAsHuggingFaceTrl(pairs: DpoPair[]): string {
  return pairs
    .map((pair) =>
      JSON.stringify({
        prompt: [{ role: "user", content: pair.prompt }],
        chosen: [{ role: "assistant", content: pair.chosen.content }],
        rejected: [{ role: "assistant", content: pair.rejected.content }],
        metadata: {
          critic_reason: pair.rejected.ghostReason,
          tokens_chosen: pair.chosen.tokens,
          tokens_rejected: pair.rejected.tokens,
          model: pair.metadata.model,
        },
      })
    )
    .join("\n");
}

/**
 * Formats pairs for OpenAI Preference Fine-Tuning
 */
export function formatPairsAsOpenAi(pairs: DpoPair[]): string {
  return pairs
    .map((pair) =>
      JSON.stringify({
        input: {
          messages: [{ role: "user", content: pair.prompt }],
        },
        preferred_output: [{ role: "assistant", content: pair.chosen.content }],
        non_preferred_output: [{ role: "assistant", content: pair.rejected.content }],
      })
    )
    .join("\n");
}

/**
 * Formats pairs into CSV format for Pandas, Excel or Google Sheets
 */
export function formatPairsAsCsv(pairs: DpoPair[]): string {
  const escapeCsv = (str: string = "") => {
    return `"${str.replace(/"/g, '""').replace(/\n/g, " ")}"`;
  };

  const header = "id,prompt,chosen_content,rejected_ghost_content,critic_veto_reason,model,trace_id\n";
  const rows = pairs.map((p) =>
    [
      p.id,
      escapeCsv(p.prompt),
      escapeCsv(p.chosen.content),
      escapeCsv(p.rejected.content),
      escapeCsv(p.rejected.ghostReason || "Pruned branch"),
      p.metadata.model,
      p.traceId,
    ].join(",")
  );

  return header + rows.join("\n");
}

