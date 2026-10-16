"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import { sciFiAudio } from "@/lib/ghost-voice-engine";
import {
  X,
  Radio,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Terminal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Ghost,
  Cpu,
  Clock,
  Layers,
  Flame,
  Gauge,
  Sliders,
  Sparkles,
  Download,
  Crosshair,
  Filter,
} from "lucide-react";

interface MissionControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: TraceRunData[];
  selectedTrace: TraceRunData | null;
  onSelectTrace: (traceId: string) => void;
  onSelectNode?: (node: TraceNodeData | null) => void;
}

interface TelemetryLogItem {
  id: string;
  timestamp: string;
  type: "VETO" | "TOOL" | "COT" | "SURGE" | "SWARM" | "ANOMALY" | "SYSTEM";
  message: string;
  source: string;
  severity: "info" | "warn" | "danger" | "success";
}

export function MissionControlModal({
  isOpen,
  onClose,
  traces,
  selectedTrace,
  onSelectTrace,
  onSelectNode,
}: MissionControlModalProps) {
  // Local audio feedback toggle
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [streamPaused, setStreamPaused] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [simulatedLoad, setSimulatedLoad] = useState(64);
  const [packetCount, setPacketCount] = useState(14820);
  const [currentTime, setCurrentTime] = useState("");
  const [utcTime, setUtcTime] = useState("");
  const [defconLevel, setDefconLevel] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [waveSeed, setWaveSeed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Canvas ref for animated brainwave / EEG seismograph
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Dynamic telemetry event stream
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryLogItem[]>([]);

  // Calculate live mission metrics based on active trace
  const activeMetrics = useMemo(() => {
    if (!selectedTrace) {
      return {
        totalTokens: 12450,
        reasoningTokens: 7800,
        ghostBranchCount: 3,
        latencyAvg: 480,
        tokenBurnRate: 1840,
        threatDeflection: 97.4,
        cotRatio: 62.6,
        model: "deepseek-r1",
        nodes: [],
        ghostNodes: [],
      };
    }

    const nodes = selectedTrace.nodes || [];
    const ghostNodes = nodes.filter((n) => n.isGhost || n.type === "GHOST_REJECTED");
    const totalTokens = selectedTrace.totalTokens || 1;
    const reasoningTokens = selectedTrace.reasoningTokens || 0;
    const cotRatio = Math.round((reasoningTokens / (totalTokens || 1)) * 100);
    const durationSec = Math.max((selectedTrace.durationMs || 1000) / 1000, 0.5);
    const tokenBurnRate = Math.round(totalTokens / durationSec);
    const threatDeflection = nodes.length > 0
      ? Number(((ghostNodes.length / Math.max(nodes.length, 1)) * 100 + 75).toFixed(1))
      : 96.5;

    return {
      totalTokens,
      reasoningTokens,
      ghostBranchCount: selectedTrace.ghostBranchCount || ghostNodes.length,
      latencyAvg: Math.round((selectedTrace.durationMs || 1200) / Math.max(nodes.length, 1)),
      tokenBurnRate,
      threatDeflection: Math.min(threatDeflection, 99.8),
      cotRatio,
      model: selectedTrace.model || "deepseek-r1",
      nodes,
      ghostNodes,
    };
  }, [selectedTrace]);

  // Adjust DEFCON based on threat & ghost pruning count
  useEffect(() => {
    if (!selectedTrace) return;
    if (selectedTrace.status === "FAILED") {
      setDefconLevel(1);
    } else if (activeMetrics.ghostBranchCount >= 3) {
      setDefconLevel(2);
    } else if (activeMetrics.ghostBranchCount >= 1) {
      setDefconLevel(3);
    } else {
      setDefconLevel(4);
    }
  }, [selectedTrace, activeMetrics.ghostBranchCount]);

  // Synchronized Military & UTC Atomic Clock
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0").slice(0, 2)
      );
      setUtcTime(now.toUTCString().slice(17, 25) + " Z");
      setPacketCount((prev) => prev + Math.floor(Math.random() * 4) + 1);
    }, 120);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Seed initial telemetry feed based on trace steps
  useEffect(() => {
    if (!isOpen) return;
    const logs: TelemetryLogItem[] = [];
    const baseDate = new Date();

    if (selectedTrace?.nodes && selectedTrace.nodes.length > 0) {
      selectedTrace.nodes.forEach((n, idx) => {
        const timeStr = new Date(baseDate.getTime() - (selectedTrace.nodes.length - idx) * 1200)
          .toISOString()
          .slice(11, 23);

        if (n.isGhost || n.type === "GHOST_REJECTED") {
          logs.push({
            id: `seed-ghost-${n.id}`,
            timestamp: timeStr,
            type: "VETO",
            source: "CriticPolicy::Guardrail",
            message: `[PRUNED GHOST] Step #${n.stepIndex}: ${n.ghostReason || "Pruned counterfactual path"}`,
            severity: "danger",
          });
        } else if (n.type === "THINKING") {
          logs.push({
            id: `seed-cot-${n.id}`,
            timestamp: timeStr,
            type: "COT",
            source: selectedTrace.model,
            message: `[REASONING COT] Step #${n.stepIndex}: ${n.tokens} tokens expended in hypothesis formulation`,
            severity: "info",
          });
        } else if (n.type === "TOOL_CALL" || n.type === "TOOL_RESULT") {
          logs.push({
            id: `seed-tool-${n.id}`,
            timestamp: timeStr,
            type: "TOOL",
            source: "SandboxTool::Worker",
            message: `[TOOL DISPATCH] ${n.label} executed in ${n.latencyMs || 45}ms`,
            severity: "success",
          });
        }
      });
    }

    if (logs.length === 0) {
      logs.push({
        id: "sys-boot",
        timestamp: new Date().toISOString().slice(11, 23),
        type: "SYSTEM",
        source: "GhostKernel",
        message: "SOC Mission Control initial handshake verified. Telemetry feed active.",
        severity: "info",
      });
    }

    setTelemetryLogs(logs);
  }, [isOpen, selectedTrace]);

  // Live streaming ticker heartbeat (adds real-time packets periodically if not paused)
  useEffect(() => {
    if (!isOpen || streamPaused) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toISOString().slice(11, 23);
      const rand = Math.random();

      let newLog: TelemetryLogItem;
      if (rand < 0.25) {
        newLog = {
          id: `live-${Date.now()}-${Math.random()}`,
          timestamp: timeStr,
          type: "SWARM",
          source: "SwarmCoordinator",
          message: `Worker synchronization heartbeat OK. Concurrency at ${(Math.random() * 3 + 1).toFixed(0)} subagents.`,
          severity: "info",
        };
      } else if (rand < 0.5) {
        newLog = {
          id: `live-${Date.now()}-${Math.random()}`,
          timestamp: timeStr,
          type: "SURGE",
          source: "TelemetryIngest",
          message: `Inbound OTEL span ingestion: ${Math.floor(Math.random() * 450 + 100)} tok/s rate maintained.`,
          severity: "success",
        };
      } else if (rand < 0.75) {
        newLog = {
          id: `live-${Date.now()}-${Math.random()}`,
          timestamp: timeStr,
          type: "VETO",
          source: "SafetyCritic",
          message: `Hypothesis validation scan clean. 0 policy violations in latest cognitive buffer.`,
          severity: "info",
        };
      } else {
        newLog = {
          id: `live-${Date.now()}-${Math.random()}`,
          timestamp: timeStr,
          type: "COT",
          source: activeMetrics.model,
          message: `Cognitive stability metric: ${(97 + Math.random() * 2.5).toFixed(1)}%. Invariant integrity locked.`,
          severity: "info",
        };
      }

      setTelemetryLogs((prev) => [...prev.slice(-90), newLog]);
      setSimulatedLoad(Math.floor(45 + Math.random() * 35));

      // Play soft radar click if audio is active
      if (soundEnabled && Math.random() > 0.65) {
        sciFiAudio.playCyberClick();
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isOpen, streamPaused, soundEnabled, activeMetrics.model]);

  // Animated Seismograph / Cognitive Waveform
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const renderWave = () => {
      setWaveSeed((s) => s + 0.08);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          // Grid lines
          ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
          ctx.lineWidth = 1;
          for (let x = 0; x < width; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          for (let y = 0; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Sine oscillation wave #1 (Cyan: Reasoning CoT)
          ctx.beginPath();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(56, 189, 248, 0.6)";

          for (let x = 0; x < width; x++) {
            const y =
              height / 2 +
              Math.sin(x * 0.03 + waveSeed) * 22 +
              Math.sin(x * 0.08 - waveSeed * 1.5) * 8;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Sine oscillation wave #2 (Purple: Ghost Branch Entropy)
          ctx.beginPath();
          ctx.strokeStyle = "#c084fc";
          ctx.lineWidth = 1.6;
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(192, 132, 252, 0.5)";

          for (let x = 0; x < width; x++) {
            const y =
              height / 2 +
              Math.cos(x * 0.04 - waveSeed * 0.8) * 16 +
              Math.sin(x * 0.12 + waveSeed) * 6;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.shadowBlur = 0;
        }
      }
      animId = requestAnimationFrame(renderWave);
    };

    animId = requestAnimationFrame(renderWave);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, waveSeed]);

  // Keybindings (Esc to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trigger test alarm beacon
  const handleTriggerAlarmBeacon = () => {
    if (soundEnabled) {
      sciFiAudio.playKlaxon();
    }
    setDefconLevel(1);
    setTelemetryLogs((prev) => [
      ...prev,
      {
        id: `beacon-${Date.now()}`,
        timestamp: new Date().toISOString().slice(11, 23),
        type: "ANOMALY",
        source: "ManualIntervention",
        message: "DEFCON 1 TEST ALARM TRIGGERED BY OPERATOR. ALL SECURITY PROTOCOLS ENGAGED.",
        severity: "danger",
      },
    ]);
  };

  // Emergency Halt Kill-switch
  const handleEmergencyHalt = () => {
    if (soundEnabled) {
      sciFiAudio.playVetoChime();
    }
    setDefconLevel(1);
    setStreamPaused(true);
    setTelemetryLogs((prev) => [
      ...prev,
      {
        id: `halt-${Date.now()}`,
        timestamp: new Date().toISOString().slice(11, 23),
        type: "SYSTEM",
        source: "CIRCUIT_BREAKER",
        message: "EMERGENCY HALT EXECUTED. SWARM PIPELINES FROZEN. DISPATCHING VETO BEACON.",
        severity: "danger",
      },
    ]);
  };

  // Filtered telemetry logs
  const filteredLogs = telemetryLogs.filter((log) => {
    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "VETO") return log.type === "VETO";
    if (selectedFilter === "COT") return log.type === "COT";
    if (selectedFilter === "TOOL") return log.type === "TOOL";
    if (selectedFilter === "ANOMALY") return log.type === "ANOMALY" || log.severity === "danger";
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050811] text-slate-100 flex flex-col font-mono select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Cyberpunk Telemetry Status Bar */}
      <div className="h-14 border-b border-cyan-900/50 bg-[#080d1a]/95 px-5 flex items-center justify-between shrink-0 shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {/* Left: Branding & DEFCON Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-300 to-indigo-400">
                  GHOSTTRACE // SOC MISSION CONTROL
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold">
                  LIVE TELEMETRY
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>PAC-STREAM: #{packetCount}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  INGEST STABLE
                </span>
              </div>
            </div>
          </div>

          {/* DEFCON Status Pill */}
          <div
            className={`px-3 py-1 rounded-md border flex items-center gap-2 text-xs font-bold tracking-wider transition-all shadow-md ${
              defconLevel === 1
                ? "bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse"
                : defconLevel === 2
                ? "bg-amber-950/90 text-amber-300 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : defconLevel === 3
                ? "bg-purple-950/90 text-purple-300 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-500/60"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                defconLevel === 1 ? "bg-rose-400 animate-ping" : "bg-emerald-400"
              }`}
            />
            <span>DEFCON {defconLevel}: {defconLevel === 1 ? "POLICY BREACH" : defconLevel === 2 ? "HEAVY PRUNING" : defconLevel === 3 ? "GUARDRAIL ACTIVE" : "ALL NOMINAL"}</span>
          </div>
        </div>

        {/* Center: Trace Selector & Military Clock */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Target:</span>
            <select
              value={selectedTrace?.id || ""}
              onChange={(e) => onSelectTrace(e.target.value)}
              className="bg-transparent text-xs text-cyan-300 font-mono outline-none border-none cursor-pointer max-w-[200px] truncate"
            >
              {traces.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#0b101e] text-slate-200">
                  {t.title} ({t.model})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-slate-400">
              <span className="text-[10px] uppercase text-slate-500 mr-1.5">LOCAL:</span>
              <span className="text-cyan-300 font-bold">{currentTime || "--:--:--"}</span>
            </div>
            <div className="text-slate-400">
              <span className="text-[10px] uppercase text-slate-500 mr-1.5">ZULU:</span>
              <span className="text-indigo-300 font-bold">{utcTime || "--:--:--"}</span>
            </div>
          </div>
        </div>

        {/* Right Action Tools: Audio, Emergency Halt, Close */}
        <div className="flex items-center gap-2">
          {/* Audio Comms Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) sciFiAudio.playStepChime();
            }}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? "bg-purple-950/80 text-purple-300 border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                : "bg-slate-900/80 text-slate-400 border-slate-700"
            }`}
            title={soundEnabled ? "Mute Sci-Fi Audio FX" : "Enable Sci-Fi Audio FX"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-bold">{soundEnabled ? "AUDIO ON" : "MUTED"}</span>
          </button>

          {/* Test Alarm Beacon */}
          <button
            onClick={handleTriggerAlarmBeacon}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/80 text-xs font-bold flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)]"
            title="Trigger DEFCON 1 Audio Alarm & Incident Beacon"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] hidden sm:inline">ALARM BEACON</span>
          </button>

          {/* Emergency Killswitch */}
          <button
            onClick={handleEmergencyHalt}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] flex items-center gap-1"
            title="Emergency Swarm Kill-Switch: Halt all pending executions"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[10px]">HALT ALL</span>
          </button>

          {/* Close Fullscreen Modal */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-colors ml-1"
            title="Exit SOC Wall (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Command Deck: 4 Analog-Digital Speedometers & Radial Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#070b16] border-b border-cyan-900/40 shrink-0">
        {/* Speedometer #1: TOKEN BURN SPEEDOMETER */}
        <div className="bg-[#0b1122]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-lg group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px] uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              Token Burn Tachometer
            </span>
            <span className="text-[10px] font-mono text-slate-500">PEAK: 3.4k/s</span>
          </div>

          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-slate-100 font-mono tracking-tight flex items-baseline gap-1">
                {activeMetrics.tokenBurnRate.toLocaleString()}
                <span className="text-xs font-normal text-cyan-400">tok/s</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total Budget: <span className="text-slate-200 font-semibold">{activeMetrics.totalTokens.toLocaleString()}</span>
              </div>
            </div>

            {/* Circular Gauge Representation */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400"
                  strokeDasharray={`${Math.min((activeMetrics.tokenBurnRate / 3500) * 100, 100)}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-[10px] font-bold text-cyan-300 font-mono">
                {Math.round((activeMetrics.tokenBurnRate / 3500) * 100)}%
              </div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((activeMetrics.tokenBurnRate / 3500) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Speedometer #2: CRITIC VETO ODOMETER & THREAT DEFLECTION */}
        <div className="bg-[#0b1122]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-lg group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px] uppercase tracking-wider">
              <Ghost className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              Critic Veto Odometer
            </span>
            <span className="text-[10px] font-mono text-purple-400">SHIELD ACTIVE</span>
          </div>

          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-purple-300 font-mono tracking-tight flex items-baseline gap-1">
                {activeMetrics.ghostBranchCount}
                <span className="text-xs font-normal text-slate-400">Vetoed Paths</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Deflection Efficiency: <span className="text-emerald-400 font-bold">{activeMetrics.threatDeflection}%</span>
              </div>
            </div>

            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-400"
                  strokeDasharray={`${Math.min(activeMetrics.threatDeflection, 100)}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-[10px] font-bold text-purple-300 font-mono">
                {activeMetrics.ghostBranchCount}x
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-rose-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(activeMetrics.ghostBranchCount * 25, 100)}%` }}
            />
          </div>
        </div>

        {/* Speedometer #3: LATENCY & COGNITIVE PULSE */}
        <div className="bg-[#0b1122]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-lg group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Step Latency & P95
            </span>
            <span className="text-[10px] font-mono text-slate-500">JITTER: &plusmn;12ms</span>
          </div>

          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-slate-100 font-mono tracking-tight flex items-baseline gap-1">
                {activeMetrics.latencyAvg}
                <span className="text-xs font-normal text-indigo-400">ms/step</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Duration: <span className="text-slate-200 font-semibold">{((selectedTrace?.durationMs || 1000) / 1000).toFixed(2)}s</span>
              </div>
            </div>

            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-400"
                  strokeDasharray={`${Math.min((activeMetrics.latencyAvg / 1500) * 100, 100)}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-[10px] font-bold text-indigo-300 font-mono">
                {Math.round((activeMetrics.latencyAvg / 1500) * 100)}%
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((activeMetrics.latencyAvg / 1500) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Speedometer #4: CHAIN-OF-THOUGHT & REASONING DENSITY */}
        <div className="bg-[#0b1122]/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-lg group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Reasoning CoT Density
            </span>
            <span className="text-[10px] font-mono text-emerald-400">OPTIMAL</span>
          </div>

          <div className="my-2 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-emerald-300 font-mono tracking-tight flex items-baseline gap-1">
                {activeMetrics.cotRatio}%
                <span className="text-xs font-normal text-slate-400">CoT Ratio</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Reasoning Toks: <span className="text-emerald-400 font-semibold">{activeMetrics.reasoningTokens.toLocaleString()}</span>
              </div>
            </div>

            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.2"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray={`${activeMetrics.cotRatio}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-[10px] font-bold text-emerald-300 font-mono">
                {activeMetrics.cotRatio}%
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${activeMetrics.cotRatio}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center Tactical View: 3 Columns (Fleet Status | Seismograph & Ghost Pods | High-Speed Terminal) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 overflow-hidden min-h-0 bg-[#060a14]">
        {/* Left Column: Swarm Fleet Radar & Subagents (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
          <div className="bg-[#0b101f] border border-slate-800 rounded-xl p-3 flex-1 flex flex-col min-h-0 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                SWARM FLEET RADAR
              </span>
              <span className="text-[10px] text-slate-500 font-mono">4 ACTIVE AGENTS</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pr-1 mt-2 space-y-2">
              {/* Agent 1: DeepSeek-R1 Planner */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">DeepSeek-R1</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    PLANNER
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>CoT Synthesis Load</span>
                  <span className="text-cyan-300 font-mono">{simulatedLoad}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${simulatedLoad}%` }}
                  />
                </div>
              </div>

              {/* Agent 2: Claude 3.7 Critic */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Claude 3.7 Sonnet</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    CRITIC
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Ghost Veto Adherence</span>
                  <span className="text-purple-300 font-mono">98.2%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: "98%" }} />
                </div>
              </div>

              {/* Agent 3: Sandbox Tool Workers */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Sandbox Worker</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    TOOLS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>IO Execution Latency</span>
                  <span className="text-emerald-300 font-mono">42ms</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: "42%" }} />
                </div>
              </div>

              {/* Agent 4: Red-Ghost Adversary Sim */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">Red-Ghost Sim</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    ADVERSARY
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Jailbreak Shield Level</span>
                  <span className="text-rose-300 font-mono">100% BLOCKED</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Cognitive Seismograph & Ghost Containment Pods (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          {/* Animated Brainwave / Cognitive Seismograph Canvas */}
          <div className="bg-[#0b101f] border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                COGNITIVE DRIFT SEISMOGRAPH (EEG)
              </span>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-0.5 bg-sky-400 inline-block" /> CoT Stability
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <span className="w-2 h-0.5 bg-purple-400 inline-block" /> Ghost Entropy
                </span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={540}
              height={95}
              className="w-full h-24 rounded-lg bg-[#050812] border border-slate-800/80"
            />
          </div>

          {/* Quarantined Ghost Branch Containment Pod */}
          <div className="bg-[#0b101f] border border-slate-800 rounded-xl p-3 flex-1 flex flex-col min-h-0 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Ghost className="w-3.5 h-3.5 text-purple-400" />
                QUARANTINED GHOST CONTAINMENT PODS
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/60 font-bold">
                {activeMetrics.ghostNodes.length} CONTAINED
              </span>
            </div>

            <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1">
              {activeMetrics.ghostNodes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                  <ShieldCheck className="w-8 h-8 text-emerald-500/50 mb-2" />
                  <div className="text-xs font-medium text-slate-400">No Counterfactual Vetoes In Current Run</div>
                  <div className="text-[10px] text-slate-500 mt-1">All agent reasoning trunk steps adhered to guardrail invariants.</div>
                </div>
              ) : (
                activeMetrics.ghostNodes.map((gn) => (
                  <div
                    key={gn.id}
                    className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-800/50 hover:border-purple-500 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300">
                        Step #{gn.stepIndex}: {gn.label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                        VETOED
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 line-clamp-2 italic">
                      "{gn.content}"
                    </div>

                    {gn.ghostReason && (
                      <div className="text-[10px] text-rose-300/90 bg-rose-950/40 p-1.5 rounded border border-rose-900/60">
                        <b>Critic Veto:</b> {gn.ghostReason}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                      <span>Tokens Saved: ~{gn.tokens || 120}</span>
                      <button
                        onClick={() => {
                          if (soundEnabled) sciFiAudio.playStepChime();
                          onSelectNode?.(gn);
                          onClose();
                        }}
                        className="text-purple-400 hover:text-purple-200 underline"
                      >
                        Locate in DAG &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: High-Speed Live Telemetry Terminal Feed (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="bg-[#080d1a] border border-cyan-900/50 rounded-xl p-3 flex-1 flex flex-col min-h-0 shadow-xl overflow-hidden">
            {/* Terminal Header & Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-cyan-900/40">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                LIVE STREAM TERMINAL
              </span>

              <div className="flex items-center gap-1.5">
                {/* Stream Pause/Resume Toggle */}
                <button
                  onClick={() => setStreamPaused(!streamPaused)}
                  className={`p-1 rounded text-xs transition-colors ${
                    streamPaused
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                  title={streamPaused ? "Resume Live Stream" : "Pause Stream"}
                >
                  {streamPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                </button>

                {/* Clear Terminal */}
                <button
                  onClick={() => setTelemetryLogs([])}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                  title="Clear Terminal Feed"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 my-2 overflow-x-auto pb-1 text-[10px]">
              {["ALL", "VETO", "COT", "TOOL", "ANOMALY"].map((flt) => (
                <button
                  key={flt}
                  onClick={() => setSelectedFilter(flt)}
                  className={`px-2 py-0.5 rounded font-mono font-bold transition-all ${
                    selectedFilter === flt
                      ? "bg-cyan-950 text-cyan-300 border border-cyan-600 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {flt}
                </button>
              ))}
            </div>

            {/* Terminal Lines View */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] leading-relaxed">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-1.5 rounded transition-all flex flex-col gap-0.5 border-l-2 ${
                    log.severity === "danger"
                      ? "bg-rose-950/25 border-rose-500 text-rose-200"
                      : log.severity === "warn"
                      ? "bg-amber-950/25 border-amber-500 text-amber-200"
                      : log.severity === "success"
                      ? "bg-emerald-950/25 border-emerald-500 text-emerald-200"
                      : "bg-slate-900/40 border-cyan-500 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-cyan-400">{log.source}</span>
                    <span className="text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="break-words">{log.message}</div>
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Ticker & Tactical Footer */}
      <div className="h-10 border-t border-cyan-900/50 bg-[#070b16] px-5 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            SOCKET /v1/traces CONNECTED
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">
            Active Model: <b className="text-slate-200">{activeMetrics.model}</b>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">
            Est. Cost: <b className="text-emerald-400">${(selectedTrace?.costEstimate || 0.0042).toFixed(4)}</b>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-500">Press ESC or click close to return to canvas</span>
          <button
            onClick={() => {
              if (soundEnabled) sciFiAudio.playSuccessChime();
              onClose();
            }}
            className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-semibold"
          >
            RETURN TO DAG
          </button>
        </div>
      </div>
    </div>
  );
}
