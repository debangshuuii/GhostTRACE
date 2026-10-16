"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
  Key,
  Lock,
  Unlock,
  Check,
  CheckCircle2,
  Trash2,
  Mail,
  Building2,
  Globe,
  Sparkles,
  RotateCw,
  ExternalLink,
} from "lucide-react";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}
import {
  WorkspaceRole,
  PermissionAction,
  ROLE_DEFINITIONS,
  UserSessionData,
} from "@/lib/rbac";

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  image?: string;
  role: WorkspaceRole;
  createdAt: string;
}

interface AuthRbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export function AuthRbacModal({ isOpen, onClose, workspaceId }: AuthRbacModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "members" | "matrix" | "oauth">("profile");
  const [session, setSession] = useState<UserSessionData | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Invite member form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("DEVELOPER");
  const [inviting, setInviting] = useState(false);

  // Fetch session & members
  useEffect(() => {
    if (!isOpen) return;
    fetchSession();
    fetchMembers();
  }, [isOpen, workspaceId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const url = workspaceId ? `/api/auth/session?workspaceId=${workspaceId}` : `/api/auth/session`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const url = workspaceId ? `/api/auth/members?workspaceId=${workspaceId}` : `/api/auth/members`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  };

  const handleSwitchRole = async (targetRole: WorkspaceRole) => {
    try {
      setStatusMessage(null);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "switch_role",
          role: targetRole,
          workspaceId: session?.currentWorkspace.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message);
        fetchSession();
        fetchMembers();
      } else {
        setStatusMessage(data.error || "Failed to switch role");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to switch role");
    }
  };

  const handleMockOAuth = async (provider: "github" | "google") => {
    try {
      setStatusMessage(null);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mock_oauth_login",
          provider,
          name: provider === "github" ? "GitHub Operator" : "Google Cloud Lead",
          email: `${provider}-operator@ghosttrace.io`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Authenticated successfully via ${provider.toUpperCase()} OAuth.`);
        fetchSession();
        fetchMembers();
      }
    } catch (err: any) {
      setStatusMessage(err.message || "OAuth login notice");
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      setInviting(true);
      setStatusMessage(null);
      const res = await fetch("/api/auth/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: session?.currentWorkspace.id,
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(data.message);
        setInviteEmail("");
        setInviteName("");
        fetchMembers();
      } else {
        setStatusMessage(data.error || "Failed to invite member");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/auth/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStatusMessage("Member removed successfully.");
        fetchMembers();
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to remove member");
    }
  };

  if (!isOpen) return null;

  const currentRole = session?.currentWorkspace?.userRole || "OWNER";
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.OWNER;

  const allActions: Array<{ action: PermissionAction; label: string }> = [
    { action: "TRACES_VIEW", label: "Inspect Execution Traces & Canvas DAG" },
    { action: "TRACES_WRITE", label: "Ingest Live Spans & Upload Traces" },
    { action: "NODES_INTERVENE", label: "Breakpoint Pause, Override & Re-Execute" },
    { action: "RED_GHOST_ATTACK", label: "Trigger Red-Ghost Adversarial Attack" },
    { action: "DPO_EXPORT", label: "Export DPO & Fine-Tuning Datasets" },
    { action: "MCP_EXECUTE", label: "Execute Model Context Protocol (MCP) Tools" },
    { action: "API_KEYS_MANAGE", label: "Issue & Revoke SHA-256 API Keys" },
    { action: "ALERTS_MANAGE", label: "Configure Slack & Discord Incident Webhooks" },
    { action: "GUARDRAILS_MANAGE", label: "Update Guardrail Policies & Veto Thresholds" },
    { action: "STORAGE_MANAGE", label: "Switch Storage Engines & Execute ClickHouse DDL" },
    { action: "MEMBERS_MANAGE", label: "Invite, Remove & Manage Team Roles" },
    { action: "WORKSPACE_DELETE", label: "Delete / Archive Cloud Workspace" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-[#090d19] border border-purple-900/60 shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#060a14] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Hosted Cloud Multi-Tenant Auth &amp; RBAC
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700 uppercase">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                GitHub &amp; Google OAuth with Granular Role-Based Access Control (Owner, Admin, Developer, Viewer).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-[#080c18] flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "profile"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>My Identity &amp; Role</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "members"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members ({members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "matrix"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>RBAC Permission Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("oauth")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "oauth"
                ? "border-purple-400 text-purple-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>OAuth &amp; SSO Setup</span>
          </button>
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div className="px-6 py-2.5 bg-purple-950/40 border-b border-purple-800/60 text-xs text-purple-200 flex items-center justify-between font-mono animate-in fade-in">
            <span>&bull; {statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-purple-400 hover:text-purple-200 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Profile & Active Role */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-5 rounded-2xl bg-[#0b101f] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg">
                <div className="flex items-center gap-4">
                  <img
                    src={session?.user.image || "https://avatars.githubusercontent.com/u/1024025?v=4"}
                    alt={session?.user.name}
                    className="w-14 h-14 rounded-2xl border-2 border-purple-500/70 shadow-md object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">{session?.user.name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${roleDef.badgeColor}`}>
                        {roleDef.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                      <span>{session?.user.email}</span>
                      <span>•</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> OAuth Verified
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Workspace: <b className="text-slate-300">{session?.currentWorkspace.name}</b> (/{session?.currentWorkspace.slug})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleMockOAuth("github")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <GithubIcon className="w-4 h-4 text-purple-400" />
                    <span>GitHub OAuth</span>
                  </button>

                  <button
                    onClick={() => handleMockOAuth("google")}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Google Cloud</span>
                  </button>
                </div>
              </div>

              {/* Interactive Role Switcher */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Quick Role Switcher (Simulate Access Control)
                  </h4>
                  <span className="text-[11px] text-slate-500">Test how the UI enforces permissions</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"] as WorkspaceRole[]).map((role) => {
                    const def = ROLE_DEFINITIONS[role];
                    const isSelected = currentRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => handleSwitchRole(role)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)] ring-1 ring-purple-500"
                            : "bg-[#0b101f] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-100">{role}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{def.description}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                          {def.permissions.length} Permitted Actions
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Team Members & Access Control */}
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Invite Member Box */}
              <form
                onSubmit={handleInviteMember}
                className="p-4 rounded-xl bg-[#0b101f] border border-slate-800 flex flex-col md:flex-row items-center gap-3"
              >
                <div className="flex-1 w-full">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="w-full md:w-44">
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Full Name (optional)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>

                <div className="w-full md:w-36">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 outline-none focus:border-purple-500"
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full md:w-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{inviting ? "Inviting..." : "Invite Member"}</span>
                </button>
              </form>

              {/* Members Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0b101f]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070c17] text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.image || "https://api.dicebear.com/7.x/identicon/svg?seed=" + member.email}
                              alt={member.name}
                              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                            />
                            <div>
                              <div className="font-semibold text-slate-200">{member.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              ROLE_DEFINITIONS[member.role]?.badgeColor || "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {member.role}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {member.role !== "OWNER" && (
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Remove member from workspace"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RBAC Matrix */}
          {activeTab === "matrix" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0b101f]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#070c17] text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Permission Action</th>
                      <th className="px-3 py-3 text-center">Owner</th>
                      <th className="px-3 py-3 text-center">Admin</th>
                      <th className="px-3 py-3 text-center">Developer</th>
                      <th className="px-3 py-3 text-center">Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {allActions.map((row) => (
                      <tr key={row.action} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-300">
                          <div>{row.label}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{row.action}</div>
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex p-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <Check className="w-3 h-3" />
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {ROLE_DEFINITIONS.ADMIN.permissions.includes(row.action) ? (
                            <span className="inline-flex p-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {ROLE_DEFINITIONS.DEVELOPER.permissions.includes(row.action) ? (
                            <span className="inline-flex p-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {ROLE_DEFINITIONS.VIEWER.permissions.includes(row.action) ? (
                            <span className="inline-flex p-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="inline-flex p-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: OAuth & SSO Setup */}
          {activeTab === "oauth" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0b101f] border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <GithubIcon className="w-4 h-4 text-purple-400" />
                  GitHub OAuth App Configuration
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To enable GitHub Single Sign-On for your organization, register a new OAuth application in GitHub Developer Settings.
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Homepage URL:</span>
                    <span className="text-cyan-300">http://localhost:3000</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Authorization Callback URL:</span>
                    <span className="text-purple-300">http://localhost:3000/api/auth/callback/github</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0b101f] border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Google Cloud Console OAuth 2.0 Client
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In Google Cloud Console under <b>APIs &amp; Services &gt; Credentials</b>, create an OAuth Client ID for Web Applications.
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Authorized JavaScript Origins:</span>
                    <span className="text-cyan-300">http://localhost:3000</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Authorized Redirect URI:</span>
                    <span className="text-indigo-300">http://localhost:3000/api/auth/callback/google</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#060a14] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Identity: <b className="text-slate-200">{session?.user.name}</b> ({currentRole})</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
