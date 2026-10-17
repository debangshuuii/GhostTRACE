import { TraceNodeData } from "./types";

/**
 * Distills raw, verbose step data into natural, human-like voice narration.
 */
export function distillNodeNarration(node: TraceNodeData): string {
  const label = node.label || "Step";
  const content = (node.content || "").replace(/```[\s\S]*?```/g, "code block").trim();
  const summarySnippet = content.length > 140 ? content.slice(0, 137) + "..." : content;

  if (node.isGhost) {
    const reason = node.ghostReason ? `Reason: ${node.ghostReason}.` : "Pruned by speculative critic policy.";
    return `Step ${node.stepIndex}. Phantom branch vetoed. ${reason}`;
  }

  switch (node.type) {
    case "USER_PROMPT":
      return `Step ${node.stepIndex}. Initial user directive received. Objective: ${summarySnippet}`;

    case "THINKING":
      const tokens = node.tokens ? `consuming ${node.tokens} reasoning tokens.` : "";
      return `Step ${node.stepIndex}. Chain of thought active, ${tokens} Formulating hypothesis: ${summarySnippet}`;

    case "TOOL_CALL":
    case "TOOL_RESULT":
      const toolName = node.label.replace(/^Tool Call:\s*/i, "");
      return `Step ${node.stepIndex}. Executing tool operation: ${toolName}. Latency: ${node.latencyMs || 0} milliseconds.`;

    case "SUBAGENT_SPAWN":
      return `Step ${node.stepIndex}. Spawning autonomous subagent worker for parallel task delegation.`;

    case "LLM_RESPONSE":
      return `Step ${node.stepIndex}. Solution verified. Synthesizing final delivered response.`;

    default:
      return `Step ${node.stepIndex}. Processing ${label}.`;
  }
}

/**
 * Procedural Web Audio API sound synthesizer for subtle sci-fi feedback.
 * Does not require external audio files or network requests.
 */
class SciFiSoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playStepChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  }

  playVetoChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.16); // A3

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Silent catch
    }
  }

  playSuccessChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18); // C6

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Silent catch
    }
  }

  playRadarBlip() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Silent catch
    }
  }

  playKlaxon() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(450, now + 0.2);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Silent catch
    }
  }

  playCyberClick() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Silent catch
    }
  }
}

export const sciFiAudio = new SciFiSoundEngine();

/**
 * Ghost Voice Player Controller using Web SpeechSynthesis API.
 */
export class GhostVoiceController {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private speed: number = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices().filter((v) => v.lang.startsWith("en"));
  }

  public setVoice(voice: SpeechSynthesisVoice | null) {
    this.selectedVoice = voice;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    if (this.currentUtterance && this.synth?.speaking) {
      // Will take effect on next step
    }
  }

  public speak(
    text: string,
    isGhost: boolean,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    if (!this.synth) {
      if (onStart) onStart();
      setTimeout(() => {
        if (onEnd) onEnd();
      }, 1500);
      return;
    }

    this.stop();

    // Play auditory sound effect chime
    if (isGhost) {
      sciFiAudio.playVetoChime();
    } else {
      sciFiAudio.playStepChime();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    utterance.rate = this.speed;
    utterance.pitch = isGhost ? 0.9 : 1.05;

    // Default to natural voice if available
    const voices = this.getAvailableVoices();
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    } else if (voices.length > 0) {
      const preferred =
        voices.find((v) => v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")) ||
        voices[0];
      utterance.voice = preferred;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public isActive(): boolean {
    return Boolean(this.synth?.speaking);
  }
}

export const ghostVoice = new GhostVoiceController();
