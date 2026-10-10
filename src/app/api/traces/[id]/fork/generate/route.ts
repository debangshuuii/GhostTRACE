import { NextResponse } from "next/server";

interface GenerateForkRequest {
  parentNode: {
    nodeId: string;
    label: string;
    content: string;
    type: string;
    stepIndex: number;
  };
  mode?: "speculative_ghost" | "optimal_alternative";
  criticStrictness?: number; // 0 to 1
  agentName?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params;
    const body = (await req.json()) as GenerateForkRequest;
    const { parentNode, mode = "speculative_ghost", criticStrictness = 0.85 } = body;

    if (!parentNode) {
      return NextResponse.json({ error: "parentNode is required" }, { status: 400 });
    }

    const contentLower = parentNode.content.toLowerCase();
    const labelLower = parentNode.label.toLowerCase();

    // Domain inference
    let domain = "general";
    if (contentLower.includes("sql") || contentLower.includes("index") || contentLower.includes("query") || contentLower.includes("database")) {
      domain = "database";
    } else if (contentLower.includes("crypto") || contentLower.includes("timing") || contentLower.includes("signature") || contentLower.includes("xor") || contentLower.includes("hash")) {
      domain = "cryptography";
    } else if (contentLower.includes("pod") || contentLower.includes("k8s") || contentLower.includes("kubectl") || contentLower.includes("drain") || contentLower.includes("restart")) {
      domain = "devops";
    } else if (contentLower.includes("margin") || contentLower.includes("finance") || contentLower.includes("stock") || contentLower.includes("sec") || contentLower.includes("filing")) {
      domain = "finance";
    } else if (contentLower.includes("auth") || contentLower.includes("token") || contentLower.includes("jwt") || contentLower.includes("secret") || contentLower.includes("vulnerability")) {
      domain = "security";
    }

    let generatedTitle = "";
    let generatedContent = "";
    let isGhost = mode === "speculative_ghost";
    let criticFeedback = "";
    let confidenceScore = 0.95;

    if (mode === "speculative_ghost") {
      confidenceScore = 0.32;
      switch (domain) {
        case "database":
          generatedTitle = "Ghost: Truncate Table & Bulk Reload";
          generatedContent =
            "Speculative hypothesis: Rather than waiting on concurrent index build, truncate the active staging table, rebuild indexes synchronously in memory, and re-pull state via replication dump.";
          criticFeedback =
            "Critic Policy Veto: Destructive table truncation destroys in-flight transactions and risks unrecoverable data loss in high-throughput production environment.";
          break;
        case "cryptography":
          generatedTitle = "Ghost: In-Memory XOR Lookup Table";
          generatedContent =
            "Speculative hypothesis: Pre-calculate static 256-byte XOR lookup table in global scope to eliminate arithmetic operations during string comparison.";
          criticFeedback =
            "Critic Policy Veto: Cache-timing attack risk. Table lookups on secret-derived indices leak memory cache line access timings on multi-tenant hardware.";
          break;
        case "devops":
          generatedTitle = "Ghost: Force Kill Worker Node (SIGKILL 9)";
          generatedContent =
            "Speculative hypothesis: Pod is unresponsive. Directly issue SSH `kill -9 $(pgrep kubelet)` to force master controller to trigger instantaneous node reallocation.";
          criticFeedback =
            "Critic Blast Radius Veto: Killing kubelet abruptly breaks graceful shutdown hooks, orphan persistent volume claims, and causes cascading cluster split-brain.";
          break;
        case "finance":
          generatedTitle = "Ghost: Unverified Social Sentiment Extrapolation";
          generatedContent =
            "Speculative hypothesis: Incorporate anonymous investor forum sentiment predicting 18% gross margin expansion ahead of the official earnings filing.";
          criticFeedback =
            "Zero-Trust Fact-Checking Veto: Reliance on unverified secondary social hearsay violates strict compliance policy. Discarded in favor of audited 10-Q SEC metrics.";
          break;
        case "security":
          generatedTitle = "Ghost: Wildcard Permissive IAM Override";
          generatedContent =
            "Speculative hypothesis: Grant temporary `*.*` admin policy to service account to bypass authentication gate during debugging.";
          criticFeedback =
            "Security Policy Veto: Privilege escalation hazard. Wildcard administrative access violates principle of least privilege (PoLP) and fails automated compliance audit.";
          break;
        default:
          generatedTitle = "Ghost: Unconstrained Heuristic Shortcut";
          generatedContent =
            `Speculative hypothesis: Skip intermediate validation and directly execute speculative heuristic based on initial hypothesis from Step #${parentNode.stepIndex}.`;
          criticFeedback =
            "Critic Evaluation Veto: Skipping validation protocol violates runtime verification policy and introduces hallucination regression.";
      }
    } else {
      // Optimal verified alternative
      confidenceScore = 0.98;
      switch (domain) {
        case "database":
          generatedTitle = "Alternative: Partial Hash Index with Stored Columns";
          generatedContent =
            "Verified strategy: Deploy non-blocking concurrent partial index covering only active transaction states (`status = 'ACTIVE'`) with INCLUDE clause to satisfy queries purely via index-only scans.";
          criticFeedback = "Critic Evaluation: PASSED. Zero locks acquired, 98% space savings over full index.";
          break;
        case "cryptography":
          generatedTitle = "Alternative: Dual-Digest Constant-Time Equalization";
          generatedContent =
            "Verified strategy: Compute SHA-256 HMAC digest of both inputs using server ephemeral key, then compare normalized 32-byte Buffers via native `crypto.timingSafeEqual`.";
          criticFeedback = "Critic Evaluation: PASSED. Guaranteed identical buffer length and zero cache-timing leak.";
          break;
        case "devops":
          generatedTitle = "Alternative: Canary Rolling Update with Automated Rollback";
          generatedContent =
            "Verified strategy: Increment pod memory allocation by 50% on a single canary replica, stream live Prometheus cAdvisor metrics for 120 seconds, and promote to remaining deployment upon clean health checks.";
          criticFeedback = "Critic Evaluation: PASSED. Blast radius contained strictly to 1 isolated replica.";
          break;
        default:
          generatedTitle = "Alternative: Isolated Sandbox Verification";
          generatedContent =
            `Verified strategy: Execute verification in a scratch ephemeral container first, compare outputs against baseline golden tests, and commit only after zero regression confirmation.`;
          criticFeedback = "Critic Evaluation: PASSED. Safe verification protocol satisfied.";
      }
    }

    return NextResponse.json({
      success: true,
      traceId,
      parentStepId: parentNode.nodeId,
      generated: {
        branchTitle: generatedTitle,
        alternativeContent: generatedContent,
        isGhost,
        criticFeedback,
        confidenceScore,
        domain,
      },
    });
  } catch (error: any) {
    console.error("Generate fork error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate counterfactual branch" },
      { status: 500 }
    );
  }
}
