"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Lock,
  Globe,
  Terminal,
  RefreshCw,
} from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPreview: string;
  environment: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyManagementModal({ isOpen, onClose }: ApiKeyManagementModalProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // New key form
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"production" | "staging" | "development">("production");

  // One-time reveal key
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.keys) {
        setKeys(data.keys);
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setRevealedKey(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName || `${newKeyEnv.toUpperCase()} Agent Ingestion Key`,
          environment: newKeyEnv,
        }),
      });

      const data = await res.json();
      if (data.fullKey) {
        setRevealedKey(data.fullKey);
        setNewKeyName("");
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to generate key:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const handleCopyRevealed = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[780px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              API Keys &amp; Workspace Access Management
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                Multi-Tenant
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Manage cryptographic ingestion tokens (<code className="text-cyan-300">gt_live_...</code>) for autonomous agent pipelines.
            </p>
          </div>
        </div>

        {/* One-Time Reveal Banner if key just created */}
        {revealedKey && (
          <div className="mb-4 p-4 rounded-xl bg-amber-950/40 border border-amber-600/70 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                New Secret API Key Generated:
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono">
                Copy now — will never be shown again!
              </span>
            </div>

            <div className="flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-amber-800/60 font-mono text-xs text-amber-200">
              <span className="flex-1 truncate">{revealedKey}</span>
              <button
                onClick={handleCopyRevealed}
                className="flex items-center gap-1 px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shrink-0"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? "Copied!" : "Copy Key"}</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Create New Key Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Generate New API Ingestion Key
            </h4>

            <form onSubmit={handleCreateKey} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-6">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Key Name / Purpose
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production LangGraph Swarm"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Environment
                </label>
                <select
                  value={newKeyEnv}
                  onChange={(e) => setNewKeyEnv(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="production">production (gt_live)</option>
                  <option value="staging">staging (gt_test)</option>
                  <option value="development">development (gt_test)</option>
                </select>
              </div>

              <div className="col-span-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  <span>Generate Key</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Keys Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Active Access Credentials ({keys.length})
              </h4>
              <button
                onClick={fetchKeys}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-24 gap-2 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading credentials...</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No API keys generated yet. Generate a key above to authenticate live agent telemetry.
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-900/40">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{k.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                            k.environment === "production"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800/80"
                              : "bg-amber-950 text-amber-300 border-amber-800/80"
                          }`}
                        >
                          {k.environment}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {k.status}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-cyan-400/90">
                        {k.keyPreview}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title="Revoke and delete this key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Usage Guide */}
          <div className="p-3.5 rounded-xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-300 space-y-1.5">
            <span className="text-[10px] text-cyan-400/80 uppercase font-bold tracking-wider block">
              Authorization Header Usage
            </span>
            <div className="text-[11px] text-slate-400 space-y-1">
              <p>Include in all HTTP streaming or OpenTelemetry headers:</p>
              <pre className="p-2 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-[10px] overflow-x-auto">
{`curl -X POST http://localhost:3000/api/traces/stream \\
  -H "Authorization: Bearer gt_live_..." \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
