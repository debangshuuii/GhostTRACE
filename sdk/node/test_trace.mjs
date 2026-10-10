import { GhostTraceClient } from "./ghosttrace.ts";

async function main() {
  console.log("🚀 Initializing GhostTraceClient (Node.js SDK)...");
  const client = new GhostTraceClient("http://localhost:3000");

  const session = await client.startTrace({
    title: "Node.js Autonomous Kubernetes Auto-Healer",
    agentName: "K8s-Remediation-Bot",
    model: "claude-3-7-sonnet",
    tags: ["node-sdk", "k8s", "devops", "ghost-pruning"],
    description: "Ingested via GhostTRACE Node.js SDK"
  });

  console.log("✓ Trace session started:", session.traceId);

  const step1 = await session.addStep({
    type: "USER_PROMPT",
    label: "Alert: OOMKilled Pod",
    content: "Pod `payment-service-8f49b` in namespace `prod` crashed with exit code 137 (OOMKilled). Investigate and recover.",
    tokens: 45,
    latencyMs: 12
  });

  const step2 = await step1.addNextStep({
    type: "THINKING",
    label: "Analyze Metrics & JVM Heap",
    content: "Checking Prometheus heap memory usage. Spike observed during bulk refund batch processing. Need to mitigate without causing cache thrashing.",
    tokens: 680,
    latencyMs: 820
  });

  // Ghost Branch
  await step2.addGhostBranch({
    label: "Speculative Rollback to v1.2",
    content: "Immediately rollback deployment to previous revision v1.2 without investigating heap settings.",
    ghostReason: "Critic Veto: Rollback breaks database schema compatibility with active migrations. Blast radius high.",
    tokens: 510,
    latencyMs: 420,
    confidenceScore: 0.32
  });
  console.log("✓ Recorded Ghost Branch");

  // Chosen Next Step
  const step3 = await step2.addNextStep({
    type: "TOOL_CALL",
    label: "tool: kubectl patch deployment",
    content: "kubectl patch deployment payment-service -n prod -p '{\"spec\":{\"template\":{\"spec\":{\"containers\":[{\"name\":\"app\",\"resources\":{\"limits\":{\"memory\":\"2Gi\"},\"requests\":{\"memory\":\"1Gi\"}}}]}}}}'",
    tokens: 420,
    latencyMs: 650,
    rawInput: { command: "kubectl patch deployment payment-service" },
    rawOutput: { patched: true, replicasReady: 3 }
  });

  await step3.addNextStep({
    type: "LLM_RESPONSE",
    label: "Recovery Verified",
    content: "Scaled container memory limits from 1Gi to 2Gi. Pod restarted successfully with zero error rate on health checks. Pruned speculative deployment rollback.",
    tokens: 480,
    latencyMs: 720
  });

  await session.finish("COMPLETED");
  console.log("🎉 Trace finished and saved to database!");
}

main().catch(console.error);
