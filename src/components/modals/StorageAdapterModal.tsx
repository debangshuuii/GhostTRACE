"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Flame,
  Gauge,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  ArrowRight,
  HardDrive,
  Cpu,
} from "lucide-react";
import { StorageEngineType, StorageStatus, BenchmarkResult } from "@/lib/storage/storage-adapter.interface";

interface StorageAdapterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorageAdapterModal({ isOpen, onClose }: StorageAdapterModalProps) {
  const [activeEngine, setActiveEngine] = useState<StorageEngineType>("prisma");
  const [engines, setEngines] = useState<Record<string, StorageStatus>>({});
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkSpanCount, setBenchmarkSpanCount] = useState<number>(2500);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<"engines" | "benchmark" | "config">("engines");

  // Fetch status on open
  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/storage");
      if (res.ok) {
        const data = await res.json();
        setActiveEngine(data.activeEngine || "prisma");
        setEngines(data.engines || {});
      }
    } catch (err) {
      console.error("Failed to fetch storage status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchEngine = async (targetEngine: StorageEngineType) => {
    try {
      setSwitching(true);
      setStatusMessage(null);
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch_engine", engine: targetEngine }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveEngine(targetEngine);
        setStatusMessage(`Successfully activated [${targetEngine.toUpperCase()}] storage engine.`);
        if (data.diagnostics?.engines) {
          setEngines(data.diagnostics.engines);
        }
      } else {
        setStatusMessage(data.error || "Failed to switch engine");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to switch engine");
    } finally {
      setSwitching(false);
    }
  };

  const handleInitSchema = async (targetEngine: StorageEngineType) => {
    try {
      setSwitching(true);
      setStatusMessage(null);
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init_schema", engine: targetEngine }),
      });
      const data = await res.json();
      setStatusMessage(data.message || (data.success ? "Schema initialized successfully." : "Notice during schema init."));
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to init schema");
    } finally {
      setSwitching(false);
    }
  };

  const handleRunBenchmark = async (targetEngine: StorageEngineType) => {
    try {
      setBenchmarking(true);
      setBenchmarkResult(null);
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "benchmark",
          engine: targetEngine,
          spanCount: benchmarkSpanCount,
        }),
      });
      const data = await res.json();
      setBenchmarkResult(data);
    } catch (err: any) {
      setBenchmarkResult({
        engine: targetEngine,
        spansIngested: 0,
        durationMs: 0,
        throughputSpansPerSec: 0,
        batchLatencyMs: 0,
        success: false,
        notes: err.message || "Benchmark failed",
      });
    } finally {
      setBenchmarking(false);
    }
  };

  const dockerSnippet = `# ClickHouse & TimescaleDB Services for GhostTRACE
version: "3.8"

services:
  # ClickHouse Columnar High-Throughput Analytics Engine
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    container_name: ghosttrace-clickhouse
    ports:
      - "8123:8123" # HTTP API
      - "9000:9000" # Native client
    environment:
      - CLICKHOUSE_DB=ghosttrace
      - CLICKHOUSE_USER=default
      - CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    restart: unless-stopped

  # TimescaleDB PostgreSQL Time-Series Hypertable Engine
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    container_name: ghosttrace-timescaledb
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=ghosttrace
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - timescaledb-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  clickhouse-data:
  timescaledb-data:
`;

  const envSnippet = `# Storage Engine Configuration
STORAGE_ENGINE=clickhouse # Options: clickhouse | timescaledb | prisma | dual

# ClickHouse Cluster Settings
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_DATABASE=ghosttrace
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=

# TimescaleDB Settings
TIMESCALEDB_URL=postgres://postgres:password@localhost:5432/ghosttrace
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-5xl rounded-2xl bg-[#090d19] border border-cyan-900/60 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#060a14] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-tight">
                  Enterprise Storage Adapters &amp; Telemetry Fleet
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                  ACTIVE: {activeEngine.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Columnar analytics (ClickHouse) &amp; Time-Series hypertables (TimescaleDB) for 100M+ spans/day.
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
            onClick={() => setActiveTab("engines")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "engines"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Storage Engines ({Object.keys(engines).length || 3})</span>
          </button>

          <button
            onClick={() => setActiveTab("benchmark")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "benchmark"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Throughput Benchmark</span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "config"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Docker &amp; Environment Setup</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div className="px-6 py-2.5 bg-cyan-950/40 border-b border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between font-mono animate-in fade-in">
            <span>&bull; {statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-cyan-400 hover:text-cyan-200 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "engines" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Engine 1: ClickHouse */}
                <div
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    activeEngine === "clickhouse"
                      ? "bg-cyan-950/20 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/50"
                      : "bg-[#0b101e] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-orange-950/80 border border-orange-500/60 text-orange-400">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">ClickHouse</h3>
                          <span className="text-[10px] text-orange-400 font-mono">COLUMNAR MERGETREE</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          activeEngine === "clickhouse"
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-600"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {activeEngine === "clickhouse" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Ultra-high-throughput columnar engine built for 100M+ spans/day with native vector compression and instant P95 aggregations.
                    </p>

                    <div className="space-y-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mb-4">
                      <div className="flex justify-between">
                        <span>Engine Family:</span>
                        <span className="text-slate-200">MergeTree()</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P95 Vector Speed:</span>
                        <span className="text-emerald-400">&lt; 3ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Partitioning:</span>
                        <span className="text-slate-200">toYYYYMM(created_at)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSwitchEngine("clickhouse")}
                      disabled={switching}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        activeEngine === "clickhouse"
                          ? "bg-cyan-900/60 text-cyan-200 border border-cyan-500/70"
                          : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md"
                      }`}
                    >
                      {activeEngine === "clickhouse" ? "Engine Active" : "Activate ClickHouse"}
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleInitSchema("clickhouse")}
                        disabled={switching}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors"
                      >
                        Init DDL Schema
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("benchmark");
                          handleRunBenchmark("clickhouse");
                        }}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium transition-colors"
                      >
                        Benchmark
                      </button>
                    </div>
                  </div>
                </div>

                {/* Engine 2: TimescaleDB */}
                <div
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    activeEngine === "timescaledb"
                      ? "bg-indigo-950/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50"
                      : "bg-[#0b101e] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/60 text-indigo-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">TimescaleDB</h3>
                          <span className="text-[10px] text-indigo-400 font-mono">HYPERTABLE PG16</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          activeEngine === "timescaledb"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-600"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {activeEngine === "timescaledb" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      PostgreSQL time-series extension with automatic timestamp chunking, 7-day compression rollups, and time_bucket analytical SQL.
                    </p>

                    <div className="space-y-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mb-4">
                      <div className="flex justify-between">
                        <span>Storage Type:</span>
                        <span className="text-slate-200">Hypertable</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chunk Compression:</span>
                        <span className="text-indigo-400">Automatic (7d)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SQL Joins:</span>
                        <span className="text-emerald-400">Full PostgreSQL</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSwitchEngine("timescaledb")}
                      disabled={switching}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        activeEngine === "timescaledb"
                          ? "bg-indigo-900/60 text-indigo-200 border border-indigo-500/70"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                      }`}
                    >
                      {activeEngine === "timescaledb" ? "Engine Active" : "Activate TimescaleDB"}
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleInitSchema("timescaledb")}
                        disabled={switching}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-colors"
                      >
                        Init Hypertables
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("benchmark");
                          handleRunBenchmark("timescaledb");
                        }}
                        className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-medium transition-colors"
                      >
                        Benchmark
                      </button>
                    </div>
                  </div>
                </div>

                {/* Engine 3: SQLite / Prisma */}
                <div
                  className={`rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    activeEngine === "prisma"
                      ? "bg-emerald-950/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/50"
                      : "bg-[#0b101e] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-400">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">Prisma (SQLite)</h3>
                          <span className="text-[10px] text-emerald-400 font-mono">EMBEDDED DEFAULT</span>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          activeEngine === "prisma"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {activeEngine === "prisma" ? "ACTIVE" : "STANDBY"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Zero-config embedded relational database. Perfect for local prototyping, single-user debugging, and offline development.
                    </p>

                    <div className="space-y-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mb-4">
                      <div className="flex justify-between">
                        <span>Database File:</span>
                        <span className="text-slate-200">prisma/dev.db</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ACID Compliant:</span>
                        <span className="text-emerald-400">100%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Setup Requirement:</span>
                        <span className="text-slate-200">None (Bundled)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSwitchEngine("prisma")}
                      disabled={switching}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                        activeEngine === "prisma"
                          ? "bg-emerald-900/60 text-emerald-200 border border-emerald-500/70"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                      }`}
                    >
                      {activeEngine === "prisma" ? "Engine Active" : "Activate SQLite"}
                    </button>

                    <button
                      onClick={() => handleSwitchEngine("dual")}
                      disabled={switching}
                      className={`w-full py-1 px-2 rounded text-[10px] font-mono font-semibold transition-all border ${
                        activeEngine === "dual"
                          ? "bg-purple-950 text-purple-300 border-purple-500"
                          : "bg-slate-800 hover:bg-slate-700 text-purple-300 border-slate-700"
                      }`}
                    >
                      Enable Dual-Write (SQLite + ClickHouse)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "benchmark" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#0b101f] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    High-Throughput Ingestion Benchmark Runner
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generates synthetic reasoning spans and measures throughput (spans/second) &amp; batch insertion latency.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-mono">Spans:</span>
                    <select
                      value={benchmarkSpanCount}
                      onChange={(e) => setBenchmarkSpanCount(Number(e.target.value))}
                      className="bg-transparent text-cyan-300 font-mono font-bold outline-none cursor-pointer"
                    >
                      <option value={1000} className="bg-slate-900">1,000</option>
                      <option value={2500} className="bg-slate-900">2,500</option>
                      <option value={5000} className="bg-slate-900">5,000</option>
                      <option value={10000} className="bg-slate-900">10,000</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleRunBenchmark(activeEngine)}
                    disabled={benchmarking}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    {benchmarking ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Benchmarking...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run Test on {activeEngine.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Benchmark Result Card */}
              {benchmarkResult && (
                <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-800/80 animate-in fade-in space-y-4">
                  <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        BENCHMARK COMPLETED: [{benchmarkResult.engine.toUpperCase()}]
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Duration: <b className="text-slate-100">{benchmarkResult.durationMs}ms</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Throughput</div>
                      <div className="text-xl font-black text-cyan-300 font-mono mt-1">
                        {benchmarkResult.throughputSpansPerSec.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">spans/s</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Spans Ingested</div>
                      <div className="text-xl font-black text-slate-100 font-mono mt-1">
                        {benchmarkResult.spansIngested.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Batch Latency</div>
                      <div className="text-xl font-black text-indigo-300 font-mono mt-1">
                        {benchmarkResult.batchLatencyMs}ms
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Ingestion Status</div>
                      <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                        {benchmarkResult.success ? "100% OK" : "DEGRADED"}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
                    {benchmarkResult.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-semibold">
                  Docker Compose Configuration (`docker-compose.yml`):
                </span>
                <button
                  onClick={() => copyToClipboard(dockerSnippet)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  {copiedConfig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedConfig ? "Copied" : "Copy Dockerfile"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                {dockerSnippet}
              </pre>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300 font-semibold">Environment Variables (`.env`):</span>
                  <button
                    onClick={() => copyToClipboard(envSnippet)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy .env</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                  {envSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#060a14] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Active Storage Pipeline: <b className="text-slate-200">{activeEngine.toUpperCase()}</b></span>
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
