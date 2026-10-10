import { TraceRunData } from "./types";

export interface OptimizationInsight {
  totalGhostTokens: number;
  wastedPercentage: number;
  wastedCostUsd: number;
  recommendations: {
    category: string;
    issue: string;
    suggestedConstraint: string;
    estimatedTokensSaved: number;
  }[];
  optimizedSystemPrompt: string;
}

export function generatePromptOptimization(trace: TraceRunData): OptimizationInsight {
  const nodes = Array.isArray(trace?.nodes) ? trace.nodes : [];
  const ghostNodes = nodes.filter((n) => n.isGhost);
  const totalGhostTokens = ghostNodes.reduce((acc, n) => acc + (n.tokens || 800), 0);
  const wastedPercentage = Math.round((totalGhostTokens / (trace?.totalTokens || 1)) * 100);
  const wastedCostUsd = ghostNodes.reduce((acc, n) => acc + (n.cost || 0.003), 0);

  const recommendations = ghostNodes.map((ghost, idx) => {
    let constraint = "Explicitly forbid exploring unverified speculative methods without pre-validation.";
    let category = "Logic Guardrail";

    if (ghost.content.toLowerCase().includes("xor") || ghost.content.toLowerCase().includes("loop")) {
      category = "Cryptographic Primitives";
      constraint = "CRITICAL: Do NOT attempt manual bitwise XOR loops for constant-time comparisons. Always use native runtime crypto.timingSafeEqual on normalized Buffer hashes.";
    } else if (ghost.content.toLowerCase().includes("margin") || ghost.content.toLowerCase().includes("blog") || ghost.ghostReason?.toLowerCase().includes("hallucination")) {
      category = "Fact-Checking & Citations";
      constraint = "ZERO-TRUST CITATIONS: Do NOT cite forward-looking margin guidance or financial metrics from secondary blogs. Discard rumors not present in official 10-Q/10-K SEC filings.";
    } else if (ghost.content.toLowerCase().includes("drain") || ghost.content.toLowerCase().includes("kubectl") || ghost.ghostReason?.toLowerCase().includes("blast")) {
      category = "Blast Radius Containment";
      constraint = "CONTAINMENT POLICY: Automated destructive actions (kubectl drain, cluster restart) are prohibited. Default strictly to network isolation (NetworkPolicy) and live memory dumps.";
    }

    return {
      category,
      issue: ghost.ghostReason || `Branch #${idx + 1} rejected during execution.`,
      suggestedConstraint: constraint,
      estimatedTokensSaved: ghost.tokens || 850,
    };
  });

  const basePrompt = `You are an expert autonomous reasoning agent specialized in ${trace.agentName || "complex workflows"}.
Your goal is to solve the user's objective with minimal token waste and zero safety violations.`;

  const negativeConstraintsList = recommendations
    .map((r, i) => `${i + 1}. [${r.category.toUpperCase()}]: ${r.suggestedConstraint}`)
    .join("\n");

  const optimizedSystemPrompt = `${basePrompt}

### NEGATIVE CONSTRAINTS (GHOST-PRUNING RULES):
These rules prevent wandering into known hallucinated or rejected reasoning dead-ends:
${negativeConstraintsList}

### VERIFICATION PROTOCOL:
- Prioritize native platform primitives over speculative custom re-implementations.
- Check guardrail blast radius before proposing infrastructure modifications.
- Prune unverified hypotheses internally before submitting final answers.`;

  return {
    totalGhostTokens,
    wastedPercentage,
    wastedCostUsd,
    recommendations,
    optimizedSystemPrompt,
  };
}
