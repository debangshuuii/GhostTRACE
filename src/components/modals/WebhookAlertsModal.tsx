"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Send,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Repeat,
  Zap,
  Server,
  Globe,
  Check,
} from "lucide-react";
import { WebhookAlertConfigData } from "@/lib/types";

interface WebhookAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export function WebhookAlertsModal({ isOpen, onClose, workspaceId }: WebhookAlertsModalProps) {
  const [configs, setConfigs] = useState<WebhookAlertConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"SLACK" | "DISCORD" | "GENERIC">("SLACK");
  const [minSeverity, setMinSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [alertOnGuardrail, setAlertOnGuardrail] = useState(true);
  const [alertOnSwarmLoop, setAlertOnSwarmLoop] = useState(true);
  const [alertOnTokenSpike, setAlertOnTokenSpike] = useState(true);
  const [alertOnError, setAlertOnError] = useState(true);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const url = workspaceId ? `/api/alerts?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/alerts";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch (err) {
      console.warn("Failed to load webhook alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setSaving(true);
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `${type} Webhook`,
          url: url.trim(),
          type,
          minSeverity,
          alertOnGuardrail,
          alertOnSwarmLoop,
          alertOnTokenSpike,
          alertOnError,
          workspaceId: workspaceId || null,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setName("");
        setUrl("");
        fetchConfigs();
      }
    } catch (err) {
      console.error("Failed to create webhook alert:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete alert config:", err);
    }
  };

  const handleTestWebhook = async (item: WebhookAlertConfigData) => {
    if (!item.id) return;
    try {
      setTestingId(item.id);
      setTestResult(null);

      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, type: item.type }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({ id: item.id, success: true, message: "Beacon sent! Check your channel." });
      } else {
        setTestResult({ id: item.id, success: false, message: data.error || "Failed sending alert" });
      }
    } catch (err: any) {
      setTestResult({ id: item.id, success: false, message: err.message || "Network error" });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-[680px] max-w-full bg-[#0a0f1d] border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Production Incident &amp; Webhook Alerts
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                Slack / Discord
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Notify on-call teams instantly when an agent violates safety guardrails, enters runaway loops, or spikes token costs.
            </p>
          </div>
        </div>

        {/* Webhook List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
              <span className="text-xs font-mono">Loading webhook alert configs...</span>
            </div>
          ) : configs.length === 0 && !showAddForm ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center bg-slate-900/30">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p className="text-sm text-slate-300 font-medium">No Webhooks Configured Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Connect your team's Slack or Discord channel to receive immediate alerts when agent execution fails or violates policies.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all"
              >
                <Plus className="w-4 h-4" /> Add Webhook Destination
              </button>
            </div>
          ) : (
            configs.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                        item.type === "SLACK"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : item.type === "DISCORD"
                          ? "bg-indigo-950 text-indigo-300 border-indigo-800"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                      Min: {item.minSeverity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestWebhook(item)}
                      disabled={testingId === item.id}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {testingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span>Test Beacon</span>
                    </button>
                    <button
                      onClick={() => item.id && handleDelete(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 truncate bg-black/40 px-3 py-1.5 rounded border border-slate-800/70">
                  {item.url}
                </div>

                {/* Event trigger badges */}
                <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                  {item.alertOnGuardrail && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/50 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Guardrail Vetoes
                    </span>
                  )}
                  {item.alertOnSwarmLoop && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-900/50 flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> Swarm Ping-Pong Loops
                    </span>
                  )}
                  {item.alertOnTokenSpike && (
                    <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-900/50 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Token Spikes
                    </span>
                  )}
                  {item.alertOnError && (
                    <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-900/50 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Agent Errors
                    </span>
                  )}
                </div>

                {testResult && testResult.id === item.id && (
                  <div
                    className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${
                      testResult.success
                        ? "bg-emerald-950/50 border-emerald-800/80 text-emerald-300"
                        : "bg-rose-950/50 border-rose-800/80 text-rose-300"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add Webhook Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateWebhook}
              className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">
                  New Alert Destination
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Destination Name</label>
                  <input
                    type="text"
                    placeholder="e.g. #agent-security-alerts"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Webhook Protocol</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  >
                    <option value="SLACK">Slack Incoming Webhook</option>
                    <option value="DISCORD">Discord Webhook</option>
                    <option value="GENERIC">Custom HTTP POST Webhook</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Webhook Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Minimum Alert Severity</label>
                  <select
                    value={minSeverity}
                    onChange={(e) => setMinSeverity(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  >
                    <option value="CRITICAL">CRITICAL (Destructive actions only)</option>
                    <option value="HIGH">HIGH (Guardrail vetoes & loops)</option>
                    <option value="MEDIUM">MEDIUM (Token spikes & warnings)</option>
                    <option value="LOW">LOW (All agent events)</option>
                  </select>
                </div>
              </div>

              {/* Event Triggers */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Notify On Events</label>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertOnGuardrail}
                      onChange={(e) => setAlertOnGuardrail(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span>Guardrail Safety Vetoes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertOnSwarmLoop}
                      onChange={(e) => setAlertOnSwarmLoop(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span>Swarm Ping-Pong Loops</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertOnTokenSpike}
                      onChange={(e) => setAlertOnTokenSpike(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span>Token Spikes (&gt; 5,000)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alertOnError}
                      onChange={(e) => setAlertOnError(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span>Agent Errors &amp; Crashes</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Webhook Destination</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-medium transition-all"
            >
              <Plus className="w-4 h-4" /> Add Webhook Destination
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
