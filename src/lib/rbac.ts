export type WorkspaceRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";

export type PermissionAction =
  | "TRACES_VIEW"
  | "TRACES_WRITE"
  | "NODES_INTERVENE"
  | "RED_GHOST_ATTACK"
  | "DPO_EXPORT"
  | "MCP_EXECUTE"
  | "API_KEYS_MANAGE"
  | "ALERTS_MANAGE"
  | "GUARDRAILS_MANAGE"
  | "STORAGE_MANAGE"
  | "MEMBERS_MANAGE"
  | "WORKSPACE_DELETE";

export interface RoleDefinition {
  role: WorkspaceRole;
  label: string;
  description: string;
  badgeColor: string;
  permissions: PermissionAction[];
}

export const ROLE_DEFINITIONS: Record<WorkspaceRole, RoleDefinition> = {
  OWNER: {
    role: "OWNER",
    label: "Workspace Owner",
    description: "Full control over cloud workspace, members, billing, security, and deletion.",
    badgeColor: "bg-purple-950 text-purple-300 border-purple-500",
    permissions: [
      "TRACES_VIEW",
      "TRACES_WRITE",
      "NODES_INTERVENE",
      "RED_GHOST_ATTACK",
      "DPO_EXPORT",
      "MCP_EXECUTE",
      "API_KEYS_MANAGE",
      "ALERTS_MANAGE",
      "GUARDRAILS_MANAGE",
      "STORAGE_MANAGE",
      "MEMBERS_MANAGE",
      "WORKSPACE_DELETE",
    ],
  },
  ADMIN: {
    role: "ADMIN",
    label: "Security & Admin",
    description: "Manage security guardrails, API keys, webhooks, storage clusters, and team members.",
    badgeColor: "bg-amber-950 text-amber-300 border-amber-500",
    permissions: [
      "TRACES_VIEW",
      "TRACES_WRITE",
      "NODES_INTERVENE",
      "RED_GHOST_ATTACK",
      "DPO_EXPORT",
      "MCP_EXECUTE",
      "API_KEYS_MANAGE",
      "ALERTS_MANAGE",
      "GUARDRAILS_MANAGE",
      "STORAGE_MANAGE",
      "MEMBERS_MANAGE",
    ],
  },
  DEVELOPER: {
    role: "DEVELOPER",
    label: "AI Engineer / Agent Dev",
    description: "Run Live Studio, re-execute nodes, fork speculative branches, test MCP tools, and export DPO.",
    badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-500",
    permissions: [
      "TRACES_VIEW",
      "TRACES_WRITE",
      "NODES_INTERVENE",
      "RED_GHOST_ATTACK",
      "DPO_EXPORT",
      "MCP_EXECUTE",
    ],
  },
  VIEWER: {
    role: "VIEWER",
    label: "Read-Only Observer",
    description: "Inspect live DAGs, audit ghost vetoes, view telemetry, and review Diff comparisons.",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-600",
    permissions: ["TRACES_VIEW"],
  },
};

export function hasPermission(
  userRole: WorkspaceRole | string,
  action: PermissionAction
): boolean {
  const normalized = (userRole || "VIEWER").toUpperCase() as WorkspaceRole;
  const def = ROLE_DEFINITIONS[normalized] || ROLE_DEFINITIONS.VIEWER;
  return def.permissions.includes(action);
}

export interface UserSessionData {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    provider: "github" | "google" | "local";
  };
  currentWorkspace: {
    id: string;
    name: string;
    slug: string;
    environment: string;
    userRole: WorkspaceRole;
  };
  permissions: PermissionAction[];
}
