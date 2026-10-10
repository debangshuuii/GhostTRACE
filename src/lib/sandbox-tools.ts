export interface SandboxToolResult {
  toolName: string;
  output: any;
  durationMs: number;
  success: boolean;
  error?: string;
}

export const MOCK_FILE_SYSTEM: Record<string, string> = {
  "src/auth/auth_handler.ts": `export function verifyToken(token: string): boolean {\n  return token === process.env.API_SECRET;\n}`,
  "src/database/client.ts": `import { PrismaClient } from '@prisma/client';\nexport const db = new PrismaClient();`,
  "package.json": `{\n  "name": "target-app",\n  "version": "1.0.0"\n}`,
};

export const SANDBOX_TOOLS = {
  readFile: (path: string): SandboxToolResult => {
    const file = MOCK_FILE_SYSTEM[path];
    if (file) {
      return { toolName: "read_file", output: file, durationMs: 45, success: true };
    }
    return {
      toolName: "read_file",
      output: null,
      durationMs: 30,
      success: false,
      error: `File not found: ${path}`,
    };
  },

  webSearch: (query: string): SandboxToolResult => {
    return {
      toolName: "web_search",
      output: [
        {
          title: `Documentation search for "${query}"`,
          url: "https://nodejs.org/api/crypto.html",
          snippet: "crypto.timingSafeEqual(a, b) returns true if a and b buffers are equal in constant time.",
        },
      ],
      durationMs: 210,
      success: true,
    };
  },

  criticEvaluator: (
    action: string,
    proposal: string
  ): { passed: boolean; rejectionReason?: string; confidenceScore: number } => {
    const lower = proposal.toLowerCase();
    if (lower.includes("xor") || lower.includes("charcode")) {
      return {
        passed: false,
        rejectionReason: "Critic Veto: JIT compiler branch optimization eliminates constant-time property on bitwise loop.",
        confidenceScore: 0.32,
      };
    }
    if (lower.includes("rm -rf") || lower.includes("drain")) {
      return {
        passed: false,
        rejectionReason: "Policy Veto: Command exceeds safe blast-radius limits.",
        confidenceScore: 0.15,
      };
    }
    return { passed: true, confidenceScore: 0.96 };
  },
};
