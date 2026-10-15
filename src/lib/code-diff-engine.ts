import { TraceNodeData } from "./types";

export interface DiffLine {
  type: "added" | "deleted" | "unchanged" | "header";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface FileDiff {
  filename: string;
  language: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  isGhostDiff?: boolean;
  ghostVerdict?: string;
}

export interface MemoryDelta {
  key: string;
  type: "ADDED" | "MODIFIED" | "REMOVED" | "UNCHANGED";
  previousValue?: string;
  currentValue: string;
  category: "INVARIANT" | "HYPOTHESIS" | "ARTIFACT" | "SCRATCHPAD";
}

export interface VirtualFile {
  path: string;
  size: string;
  status: "MODIFIED" | "READ_ONLY" | "CREATED" | "GHOST_REJECTED";
  lastTouchedStep: number;
}

export interface NodeStateDiffReport {
  hasDiff: boolean;
  fileDiffs: FileDiff[];
  memoryDeltas: MemoryDelta[];
  virtualFiles: VirtualFile[];
  activeEnvironment: {
    cwd: string;
    runtime: string;
    sandboxContainer: string;
    exitCode: number;
    envVars: Record<string, string>;
  };
}

/**
 * Extracts structured code diffs, scratchpad memory deltas, and virtual filesystem state
 * for any given trace step.
 */
export function extractNodeDiffAndMemory(node: TraceNodeData | null): NodeStateDiffReport {
  if (!node) {
    return {
      hasDiff: false,
      fileDiffs: [],
      memoryDeltas: [],
      virtualFiles: [],
      activeEnvironment: {
        cwd: "/workspace",
        runtime: "node:20-alpine",
        sandboxContainer: "gt-sandbox-01",
        exitCode: 0,
        envVars: {},
      },
    };
  }

  const labelLower = (node.label || "").toLowerCase();
  const contentLower = (node.content || "").toLowerCase();

  // 1. Generate Context-Aware File Diffs
  const fileDiffs: FileDiff[] = [];

  if (node.isGhost) {
    // Ghost Branch: Speculative Rejected Diff
    fileDiffs.push({
      filename: "src/auth_handler.ts",
      language: "typescript",
      additions: 2,
      deletions: 2,
      isGhostDiff: true,
      ghostVerdict: node.ghostReason || "Pruned by Security Critic",
      lines: [
        { type: "header", content: "@@ -14,6 +14,6 @@ export function verifyToken(inputToken: string): boolean" },
        { type: "unchanged", oldLineNumber: 14, newLineNumber: 14, content: "  const expectedDigest = getExpectedHMAC();" },
        { type: "deleted", oldLineNumber: 15, content: "-  // Speculative candidate: early-exit string check" },
        { type: "deleted", oldLineNumber: 16, content: "-  return inputToken === expectedDigest;" },
        { type: "added", newLineNumber: 15, content: "+  // VETOED SPECULATION: Blind in-place rewrite without sandbox isolation" },
        { type: "added", newLineNumber: 16, content: "+  eval(`check(${JSON.stringify(inputToken)})`); // CRITIC VETO" },
        { type: "unchanged", oldLineNumber: 17, newLineNumber: 17, content: "}" },
      ],
    });
  } else if (labelLower.includes("patch") || labelLower.includes("constant") || labelLower.includes("crypto") || contentLower.includes("constant-time")) {
    // Verified Constant-Time Patch Diff
    fileDiffs.push({
      filename: "src/auth_handler.ts",
      language: "typescript",
      additions: 8,
      deletions: 3,
      isGhostDiff: false,
      lines: [
        { type: "header", content: "@@ -12,8 +12,13 @@ import crypto from 'crypto';" },
        { type: "unchanged", oldLineNumber: 12, newLineNumber: 12, content: "export function verifySignature(signature: string, secret: string): boolean {" },
        { type: "unchanged", oldLineNumber: 13, newLineNumber: 13, content: "  const expected = computeHmacDigest(secret);" },
        { type: "deleted", oldLineNumber: 14, content: "-  // Early-exit comparison leaks byte-length timing variance" },
        { type: "deleted", oldLineNumber: 15, content: "-  if (signature.length !== expected.length) return false;" },
        { type: "deleted", oldLineNumber: 16, content: "-  return signature === expected;" },
        { type: "added", newLineNumber: 14, content: "+  // Constant-time byte-level comparison using crypto primitive" },
        { type: "added", newLineNumber: 15, content: "+  const bufA = Buffer.from(signature);" },
        { type: "added", newLineNumber: 16, content: "+  const bufB = Buffer.from(expected);" },
        { type: "added", newLineNumber: 17, content: "+  if (bufA.length !== bufB.length) return false;" },
        { type: "added", newLineNumber: 18, content: "+  return crypto.timingSafeEqual(bufA, bufB);" },
        { type: "unchanged", oldLineNumber: 17, newLineNumber: 19, content: "}" },
      ],
    });

    fileDiffs.push({
      filename: "test/auth_timing.test.ts",
      language: "typescript",
      additions: 14,
      deletions: 0,
      isGhostDiff: false,
      lines: [
        { type: "header", content: "@@ -0,0 +1,14 @@" },
        { type: "added", newLineNumber: 1, content: "+import { describe, it, expect } from 'vitest';" },
        { type: "added", newLineNumber: 2, content: "+import { verifySignature } from '../src/auth_handler';" },
        { type: "added", newLineNumber: 3, content: "+" },
        { type: "added", newLineNumber: 4, content: "+describe('Timing Invariant Suite', () => {" },
        { type: "added", newLineNumber: 5, content: "+  it('should maintain sub-1.5ns variance across 10,000 iterations', () => {" },
        { type: "added", newLineNumber: 6, content: "+    const result = verifySignature('valid_sig_123', 'secret_key');" },
        { type: "added", newLineNumber: 7, content: "+    expect(result).toBe(true);" },
        { type: "added", newLineNumber: 8, content: "+  });" },
        { type: "added", newLineNumber: 9, content: "+});" },
      ],
    });
  } else {
    // Default Workspace Config / Agent Directive Diff
    fileDiffs.push({
      filename: "config/agent_runtime.json",
      language: "json",
      additions: 5,
      deletions: 2,
      isGhostDiff: false,
      lines: [
        { type: "header", content: "@@ -4,6 +4,9 @@" },
        { type: "unchanged", oldLineNumber: 4, newLineNumber: 4, content: '  "agent": "GhostTRACE-Coordinator",' },
        { type: "deleted", oldLineNumber: 5, content: '-  "mode": "speculative_unverified",' },
        { type: "deleted", oldLineNumber: 6, content: '-  "strictGuardrails": false,' },
        { type: "added", newLineNumber: 5, content: '+  "mode": "constant_time_verified",' },
        { type: "added", newLineNumber: 6, content: '+  "strictGuardrails": true,' },
        { type: "added", newLineNumber: 7, content: '+  "maxDownstreamBlastRadius": 5000' },
        { type: "unchanged", oldLineNumber: 7, newLineNumber: 8, content: '}' },
      ],
    });
  }

  // 2. Working Memory & Scratchpad State Deltas
  const memoryDeltas: MemoryDelta[] = [
    {
      key: "task.active_goal",
      type: "UNCHANGED",
      currentValue: `Step #${node.stepIndex}: ${node.label.slice(0, 32)}`,
      category: "SCRATCHPAD",
    },
    {
      key: "invariant.timing_safe",
      type: node.isGhost ? "REMOVED" : "ADDED",
      previousValue: node.isGhost ? "constant_time = true" : undefined,
      currentValue: node.isGhost ? "VETOED (timing leak risk)" : "constant_time_equal = verified (1.2ns)",
      category: "INVARIANT",
    },
    {
      key: "hypothesis.candidate_path",
      type: "MODIFIED",
      previousValue: node.isGhost ? "speculative_fast_check" : "naive_length_check",
      currentValue: node.isGhost ? "PRUNED_BY_CRITIC" : "crypto.timingSafeEqual",
      category: "HYPOTHESIS",
    },
    {
      key: "sandbox.last_exit_code",
      type: "ADDED",
      currentValue: node.isGhost ? "SIGKILL (Critic Veto)" : "0 (PASS)",
      category: "ARTIFACT",
    },
    {
      key: "memory.context_window_usage",
      type: "MODIFIED",
      previousValue: `${Math.max(100, (node.tokens || 200) - 150)} tokens`,
      currentValue: `${node.tokens || 450} tokens`,
      category: "SCRATCHPAD",
    },
  ];

  // 3. Virtual Workspace Filesystem Tree
  const virtualFiles: VirtualFile[] = [
    {
      path: "src/auth_handler.ts",
      size: "2.4 KB",
      status: node.isGhost ? "GHOST_REJECTED" : "MODIFIED",
      lastTouchedStep: node.stepIndex,
    },
    {
      path: "src/crypto_primitives.ts",
      size: "4.1 KB",
      status: "READ_ONLY",
      lastTouchedStep: Math.max(1, node.stepIndex - 1),
    },
    {
      path: "test/auth_timing.test.ts",
      size: "1.1 KB",
      status: node.isGhost ? "READ_ONLY" : "CREATED",
      lastTouchedStep: node.stepIndex,
    },
    {
      path: "config/agent_runtime.json",
      size: "820 B",
      status: "MODIFIED",
      lastTouchedStep: 1,
    },
  ];

  return {
    hasDiff: true,
    fileDiffs,
    memoryDeltas,
    virtualFiles,
    activeEnvironment: {
      cwd: "/workspace/GhostTRACE",
      runtime: "Node.js v20.18 / Turbopack",
      sandboxContainer: "gt-sandbox-isolated-env",
      exitCode: node.isGhost ? 1 : 0,
      envVars: {
        NODE_ENV: "production",
        GHOSTTRACE_INSPECTOR: "active",
        CRITIC_SENSITIVITY: "Strict",
        SANDBOX_ISOLATION: "ephemeral-tmpfs",
      },
    },
  };
}
