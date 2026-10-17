"use client";

import React, { useState, useEffect } from "react";
import { TraceNodeData } from "@/lib/types";
import {
  ghostVoice,
  sciFiAudio,
  distillNodeNarration,
} from "@/lib/ghost-voice-engine";
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Ghost,
  Radio,
  Sliders,
} from "lucide-react";

interface GhostVoiceHudProps {
  currentNode: TraceNodeData | null;
  allNodes?: TraceNodeData[];
  onSelectNode?: (node: TraceNodeData) => void;
}

export function GhostVoiceHud({
  currentNode,
  allNodes = [],
  onSelectNode,
}: GhostVoiceHudProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [soundFxEnabled, setSoundFxEnabled] = useState(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [currentText, setCurrentText] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  // Load available browser voices on mount
  useEffect(() => {
    const updateVoices = () => {
      const available = ghostVoice.getAvailableVoices();
      setVoices(available);
      if (available.length > 0 && !selectedVoiceName) {
        const preferred =
          available.find(
            (v) =>
              v.name.includes("Natural") ||
              v.name.includes("Google") ||
              v.name.includes("Samantha")
          ) || available[0];
        setSelectedVoiceName(preferred.name);
        ghostVoice.setVoice(preferred);
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceName]);

  // Handle Voice selection
  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    const chosen = voices.find((v) => v.name === voiceName) || null;
    ghostVoice.setVoice(chosen);
  };

  // Handle Speed change
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    ghostVoice.setSpeed(newSpeed);
  };

  // Narrate current node
  const narrateNode = (node: TraceNodeData | null) => {
    if (!node) return;
    const text = distillNodeNarration(node);
    setCurrentText(text);

    if (soundFxEnabled) {
      if (node.isGhost) {
        sciFiAudio.playVetoChime();
      } else {
        sciFiAudio.playStepChime();
      }
    }

    setIsPlaying(true);
    ghostVoice.speak(
      text,
      Boolean(node.isGhost),
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  };

  // Trigger auto-narration when selected node changes
  useEffect(() => {
    if (autoNarrate && currentNode) {
      narrateNode(currentNode);
    } else if (currentNode) {
      setCurrentText(distillNodeNarration(currentNode));
    }
  }, [currentNode?.id, currentNode?.nodeId, autoNarrate]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      ghostVoice.stop();
      setIsPlaying(false);
    } else {
      if (currentNode) {
        narrateNode(currentNode);
      }
    }
  };

  const handleNextStep = () => {
    if (!currentNode || allNodes.length === 0 || !onSelectNode) return;
    const idx = allNodes.findIndex(
      (n) => n.nodeId === currentNode.nodeId || n.id === currentNode.id
    );
    if (idx !== -1 && idx < allNodes.length - 1) {
      onSelectNode(allNodes[idx + 1]);
    }
  };

  const handlePrevStep = () => {
    if (!currentNode || allNodes.length === 0 || !onSelectNode) return;
    const idx = allNodes.findIndex(
      (n) => n.nodeId === currentNode.nodeId || n.id === currentNode.id
    );
    if (idx > 0) {
      onSelectNode(allNodes[idx - 1]);
    }
  };

  if (!currentNode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      <div className="relative bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.18)] text-slate-100 transition-all duration-300">
        {/* Minimized Bar */}
        {!isExpanded ? (
          <div className="flex items-center gap-3 px-3.5 py-2">
            {/* Pulsing Voice Indicator */}
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 group cursor-pointer"
              title="Expand Voice Synthesizer HUD"
            >
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-full border transition-all ${
                  isPlaying
                    ? "border-cyan-400 bg-cyan-950/80 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                {currentNode.isGhost ? (
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Radio
                    className={`w-3.5 h-3.5 ${
                      isPlaying
                        ? "text-cyan-400 animate-pulse"
                        : "text-slate-400"
                    }`}
                  />
                )}
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>

              {/* Animated Mini Waves */}
              <div className="flex items-center gap-0.5 h-4">
                {[40, 90, 60, 100, 50, 75].map((height, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full transition-all duration-150 ${
                      isPlaying
                        ? "bg-cyan-400 animate-pulse"
                        : "bg-slate-600 h-1"
                    }`}
                    style={{
                      height: isPlaying ? `${height}%` : "3px",
                      animationDelay: `${i * 90}ms`,
                    }}
                  />
                ))}
              </div>
            </button>

            {/* Current Step Label */}
            <div
              onClick={() => setIsExpanded(true)}
              className="max-w-[210px] truncate cursor-pointer text-xs"
            >
              <span className="text-cyan-400 font-semibold font-mono mr-1.5">
                Step #{currentNode.stepIndex}:
              </span>
              <span className="text-slate-300">{currentNode.label}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 border-l border-slate-700/80 pl-2">
              <button
                onClick={handleTogglePlay}
                className={`p-1.5 rounded-lg border transition-all ${
                  isPlaying
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700"
                }`}
                title={isPlaying ? "Pause Narration" : "Play Step Narration"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800/80 transition-all"
                title="Expand Voice HUD"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Full HUD Card */
          <div className="w-[360px] p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    isPlaying
                      ? "border-cyan-400 bg-cyan-950 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-wide uppercase text-cyan-300 flex items-center gap-1.5">
                    Ghost Voice Narrator
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                      AI TTS
                    </span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    showSettings
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-200"
                  }`}
                  title="Voice Settings"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                  title="Minimize"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-1 h-12 overflow-hidden px-4">
              {[
                30, 65, 45, 95, 80, 50, 100, 70, 40, 85, 60, 100, 90, 45, 75,
                35, 90, 60, 40, 80, 55, 95,
              ].map((val, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    isPlaying
                      ? currentNode.isGhost
                        ? "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"
                        : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                      : "bg-slate-800 h-1.5"
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, val)}%` : "4px",
                    animationDuration: "400ms",
                  }}
                />
              ))}
            </div>

            {/* Live Narration Text Stream */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs leading-relaxed max-h-24 overflow-y-auto font-sans text-slate-300">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-cyan-400 mb-1">
                <span>Step #{currentNode.stepIndex}</span>
                <span>•</span>
                <span>{currentNode.type}</span>
                {currentNode.isGhost && (
                  <span className="text-purple-400 font-bold ml-auto flex items-center gap-1">
                    <Ghost className="w-3 h-3" /> Ghost Pruned
                  </span>
                )}
              </div>
              <p className="italic">
                "{currentText || distillNodeNarration(currentNode)}"
              </p>
            </div>

            {/* Settings Tray */}
            {showSettings && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
                {/* Voice Selector */}
                {voices.length > 0 && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                      Voice Persona
                    </label>
                    <select
                      value={selectedVoiceName}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      {voices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Speed Selector */}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase mb-1">
                    <span>Playback Speed</span>
                    <span className="text-cyan-400">{speed}x</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.8, 1.0, 1.25, 1.5].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedChange(s)}
                        className={`py-1 rounded text-center font-mono text-xs border transition-all ${
                          speed === s
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <span className="text-slate-300">Auto-Narrate Steps</span>
                  <input
                    type="checkbox"
                    checked={autoNarrate}
                    onChange={(e) => setAutoNarrate(e.target.checked)}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Sci-Fi Sound FX</span>
                  <input
                    type="checkbox"
                    checked={soundFxEnabled}
                    onChange={(e) => setSoundFxEnabled(e.target.checked)}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Playback Transport Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handlePrevStep}
                disabled={!allNodes.length}
                className="flex-1 py-1.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-700/80 transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                title="Previous Step"
              >
                ◀ Prev
              </button>

              <button
                onClick={handleTogglePlay}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shadow-md ${
                  isPlaying
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Narrate
                  </>
                )}
              </button>

              <button
                onClick={() => narrateNode(currentNode)}
                className="p-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700/80 transition-all"
                title="Replay Current Step"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleNextStep}
                disabled={!allNodes.length}
                className="flex-1 py-1.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-700/80 transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                title="Next Step"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
