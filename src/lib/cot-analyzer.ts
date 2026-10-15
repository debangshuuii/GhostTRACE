export type ReasoningPhase = "HYPOTHESIS" | "VERIFICATION" | "HESITATION" | "SYNTHESIS";

export interface CoTPhaseSegment {
  phase: ReasoningPhase;
  label: string;
  snippet: string;
  tokenCount: number;
  percentage: number;
  color: string;
}

export interface CoTAnalysisReport {
  isCoT: boolean;
  totalTokens: number;
  efficiencyScore: number; // 0 to 100
  hesitationRatePct: number;
  circularLoopDetected: boolean;
  loopSeverity: "NONE" | "LOW" | "HIGH";
  phases: CoTPhaseSegment[];
  anomalies: string[];
  recommendations: string[];
  cognitiveVelocityScore: number; // 0 to 100
}

/**
 * Analyzes reasoning text (e.g. from <think> tags or THINKING nodes) to extract
 * semantic phases, hesitation drift, circular reasoning, and cognitive efficiency.
 */
export function analyzeChainOfThought(
  content: string,
  toolContext?: string[]
): CoTAnalysisReport {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return {
      isCoT: false,
      totalTokens: 0,
      efficiencyScore: 100,
      hesitationRatePct: 0,
      circularLoopDetected: false,
      loopSeverity: "NONE",
      phases: [],
      anomalies: [],
      recommendations: [],
      cognitiveVelocityScore: 100,
    };
  }

  // Token estimate roughly 4 chars per token
  const totalTokens = Math.max(1, Math.round(content.length / 4));

  // Split content by sentences or structural paragraphs
  const sentences = content
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const phaseKeywords: Record<ReasoningPhase, RegExp> = {
    HYPOTHESIS: /\b(analyz|consider|hypothesi|maybe|first|goal|let's|objective|plan|assume|explore|initial|break down|deconstruct)\b/i,
    VERIFICATION: /\b(verify|verif|check|ensure|constraint|invariant|test|confirm|validate|inspection|measure|benchmark|rfc|policy)\b/i,
    HESITATION: /\b(wait|however|alternatively|on second thought|could fail|dead end|rethinking|mistake|issue|problem|doubt|revert|rollback|flaw|drawback|contradiction)\b/i,
    SYNTHESIS: /\b(therefore|conclude|optimal|final|proceed with|solution|patch|implementing|commit|resolved|deliverable|verdict)\b/i,
  };

  const phaseBuckets: Record<ReasoningPhase, string[]> = {
    HYPOTHESIS: [],
    VERIFICATION: [],
    HESITATION: [],
    SYNTHESIS: [],
  };

  sentences.forEach((sentence) => {
    let matchedPhase: ReasoningPhase = "HYPOTHESIS";

    if (phaseKeywords.HESITATION.test(sentence)) {
      matchedPhase = "HESITATION";
    } else if (phaseKeywords.SYNTHESIS.test(sentence)) {
      matchedPhase = "SYNTHESIS";
    } else if (phaseKeywords.VERIFICATION.test(sentence)) {
      matchedPhase = "VERIFICATION";
    } else if (phaseKeywords.HYPOTHESIS.test(sentence)) {
      matchedPhase = "HYPOTHESIS";
    } else {
      // Default based on positional progression
      const indexRatio = sentences.indexOf(sentence) / Math.max(1, sentences.length);
      if (indexRatio > 0.75) matchedPhase = "SYNTHESIS";
      else if (indexRatio > 0.4) matchedPhase = "VERIFICATION";
      else matchedPhase = "HYPOTHESIS";
    }

    phaseBuckets[matchedPhase].push(sentence);
  });

  // Calculate token distributions and percentages
  const phaseMetadata: Record<ReasoningPhase, { label: string; color: string }> = {
    HYPOTHESIS: { label: "Hypothesis & Goal", color: "#38bdf8" }, // Sky
    VERIFICATION: { label: "Constraint Verification", color: "#818cf8" }, // Indigo
    HESITATION: { label: "Hesitation & Rollback", color: "#f43f5e" }, // Rose / Amber
    SYNTHESIS: { label: "Decisive Synthesis", color: "#34d399" }, // Emerald
  };

  const phases: CoTPhaseSegment[] = (Object.keys(phaseBuckets) as ReasoningPhase[]).map((pKey) => {
    const textJoined = phaseBuckets[pKey].join(" ");
    const tokens = Math.max(0, Math.round(textJoined.length / 4));
    return {
      phase: pKey,
      label: phaseMetadata[pKey].label,
      snippet: textJoined.slice(0, 180) + (textJoined.length > 180 ? "..." : ""),
      tokenCount: tokens,
      percentage: Math.round((tokens / totalTokens) * 100),
      color: phaseMetadata[pKey].color,
    };
  });

  const hesitationTokens = phases.find((p) => p.phase === "HESITATION")?.tokenCount || 0;
  const hesitationRatePct = Math.min(100, Math.round((hesitationTokens / totalTokens) * 100));

  // Detect circular reasoning (detecting near-duplicate sentences or repeated phrases)
  const lowerSentences = sentences.map((s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ""));
  let duplicateCount = 0;
  for (let i = 0; i < lowerSentences.length; i++) {
    for (let j = i + 1; j < lowerSentences.length; j++) {
      const wordsA = new Set(lowerSentences[i].split(" "));
      const wordsB = new Set(lowerSentences[j].split(" "));
      const intersection = [...wordsA].filter((w) => wordsB.has(w) && w.length > 3);
      if (intersection.length >= 4 && wordsA.size > 0 && intersection.length / wordsA.size > 0.65) {
        duplicateCount++;
      }
    }
  }

  const circularLoopDetected = duplicateCount >= 2;
  const loopSeverity: "NONE" | "LOW" | "HIGH" =
    duplicateCount >= 4 ? "HIGH" : duplicateCount >= 2 ? "LOW" : "NONE";

  // Calculate efficiency score
  let penalty = hesitationRatePct * 0.6;
  if (loopSeverity === "HIGH") penalty += 25;
  else if (loopSeverity === "LOW") penalty += 12;

  const efficiencyScore = Math.max(20, Math.min(100, Math.round(100 - penalty)));
  const cognitiveVelocityScore = Math.max(
    15,
    Math.round(100 - hesitationRatePct * 0.8 - (circularLoopDetected ? 20 : 0))
  );

  const anomalies: string[] = [];
  const recommendations: string[] = [];

  if (loopSeverity === "HIGH") {
    anomalies.push("High circular reasoning loop detected in thinking trace (repeated premise verification).");
    recommendations.push("Inject explicit CoT pruning or lower temperature (0.1) to reduce reasoning churn.");
  } else if (loopSeverity === "LOW") {
    anomalies.push("Minor proposition cycling observed during constraint validation.");
  }

  if (hesitationRatePct > 40) {
    anomalies.push(`High hesitation rate (${hesitationRatePct}%): agent doubted hypotheses multiple times.`);
    recommendations.push("Provide clearer domain constraints in system prompt to eliminate exploratory wavering.");
  }

  if (phases.find((p) => p.phase === "SYNTHESIS")?.tokenCount === 0) {
    anomalies.push("No explicit synthesis conclusion detected inside this thinking step.");
    recommendations.push("Ensure model uses a closing 'Therefore, we proceed with...' statement.");
  }

  return {
    isCoT: true,
    totalTokens,
    efficiencyScore,
    hesitationRatePct,
    circularLoopDetected,
    loopSeverity,
    phases,
    anomalies,
    recommendations,
    cognitiveVelocityScore,
  };
}
