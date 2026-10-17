"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { TraceRunData, TraceNodeData } from "@/lib/types";
import {
  PhantomMessage,
  generatePhantomResponse,
  generateProjectWelcomeAndQuestions,
} from "@/lib/phantom-ai-engine";
import {
  Ghost,
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  ChevronRight,
  Code2,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  Terminal,
  RotateCw,
} from "lucide-react";

interface PhantomAiPanelProps {
  trace: TraceRunData | null;
  selectedNode: TraceNodeData | null;
  onClearSelectedNode?: () => void;
  isOpen: boolean;
  onClose: () => void;
  onSelectNodeById?: (nodeId: string) => void;
}

export function PhantomAiPanel({
  trace,
  selectedNode,
  onClearSelectedNode,
  isOpen,
  onClose,
  onSelectNodeById,
}: PhantomAiPanelProps) {
  // Initialize with project analysis and 5 questions
  const [messages, setMessages] = useState<PhantomMessage[]>(() => [
    generateProjectWelcomeAndQuestions(trace),
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Automatically refresh AI chatbox whenever a new project or trace is opened
  useEffect(() => {
    const welcome = generateProjectWelcomeAndQuestions(trace);
    setMessages([welcome]);
    setInputQuery("");
  }, [trace?.id]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (queryText?: string) => {
      const textToSend = (queryText || inputQuery).trim();
      if (!textToSend || isLoading) return;

      const userMsg: PhantomMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: textToSend,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputQuery("");
      setIsLoading(true);

      try {
        // Call backend API with local fallback
        const res = await fetch("/api/ai/phantom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: textToSend,
            trace,
            selectedNode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Silent catch, fallback below
      }

      // High-fidelity fallback response
      setTimeout(() => {
        const fallbackResponse = generatePhantomResponse(textToSend, trace, selectedNode);
        setMessages((prev) => [...prev, fallbackResponse]);
        setIsLoading(false);
      }, 450);
    },
    [inputQuery, isLoading, trace, selectedNode]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyCode = (snippetId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(snippetId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "cleared-msg",
        role: "assistant",
        timestamp: "Just now",
        content: "Conversation history cleared. Ask me any question!",
        suggestedActions: [
          "Why was the ghost branch pruned?",
          "Give me a simple code fix",
        ],
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`h-full border-l border-purple-500/40 bg-[#060a14]/95 backdrop-blur-2xl flex flex-col z-30 transition-all duration-300 shadow-2xl ${
        isWide ? "w-[560px]" : "w-[430px]"
      } shrink-0 relative`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-purple-900/40 bg-gradient-to-r from-purple-950/40 via-slate-900/50 to-[#060a14]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.35)]">
            <Ghost className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                <span>PhantomAI</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono font-semibold">
                COPILOT
              </span>
            </div>
            <p className="text-[11px] text-purple-200/70 truncate max-w-[220px]">
              {selectedNode
                ? `Attached: Step #${selectedNode.stepIndex} (${selectedNode.label})`
                : trace
                ? `Attached: ${trace.title}`
                : "Ask any question"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsWide(!isWide)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={isWide ? "Narrow panel" : "Expand panel"}
          >
            {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              const welcome = generateProjectWelcomeAndQuestions(trace);
              setMessages([welcome]);
              setInputQuery("");
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Refresh & Re-scan Active Project"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Close Copilot Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Context Banner */}
      {selectedNode && (
        <div className="px-3.5 py-1.5 bg-purple-950/30 border-b border-purple-900/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-purple-300 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="truncate">
              Step #{selectedNode.stepIndex}: {selectedNode.label}
            </span>
          </div>
          {onClearSelectedNode && (
            <button
              onClick={onClearSelectedNode}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline ml-2 shrink-0"
              title="Detach node to ask general questions"
            >
              Detach
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex flex-col gap-1.5 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              {msg.role === "user" ? (
                <>
                  <span>You</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </>
              ) : (
                <>
                  <span className="text-purple-400 font-semibold flex items-center gap-1">
                    <Ghost className="w-3 h-3" />
                    <span>PhantomAI</span>
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[95%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-cyan-950/70 border border-cyan-600/50 text-cyan-100 shadow-md"
                  : "bg-slate-900/80 border border-purple-900/40 text-slate-200 shadow-lg"
              }`}
            >
              {/* Content Formatting */}
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {msg.content}
              </div>

              {/* Code Snippets if any */}
              {msg.codeSnippets && msg.codeSnippets.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.codeSnippets.map((snippet, sIdx) => {
                    const snippetId = `${msg.id}-snip-${sIdx}`;
                    const isCopied = copiedCodeId === snippetId;
                    return (
                      <div
                        key={sIdx}
                        className="rounded-xl overflow-hidden border border-slate-700/80 bg-black/80 font-mono text-[11px]"
                      >
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
                          <span className="text-cyan-400 font-semibold">
                            {snippet.filename || snippet.language}
                          </span>
                          <button
                            onClick={() => handleCopyCode(snippetId, snippet.code)}
                            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 text-emerald-300 overflow-x-auto leading-relaxed">
                          {snippet.code}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 5 Smart Questions Tailored for This Project */}
              {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                <div className="mt-3.5 space-y-2 pt-3 border-t border-purple-900/40">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-purple-300 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>5 Questions Tailored for This Project:</span>
                    </span>
                    <span className="text-[9px] text-cyan-400/80 font-mono">Click to Ask</span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.suggestedQuestions.map((question, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => handleSendMessage(question)}
                        className="w-full text-left p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/60 hover:border-cyan-400 text-purple-200 hover:text-white transition-all flex items-start justify-between gap-2.5 group shadow-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-purple-900 border border-purple-700 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-cyan-950 group-hover:border-cyan-400 group-hover:text-cyan-300 transition-colors">
                            {qIdx + 1}
                          </span>
                          <span className="text-[11px] leading-relaxed font-sans">{question}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {msg.suggestedActions.map((action, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handleSendMessage(action)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-800/60 text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 font-mono"
                    >
                      <span>{action}</span>
                      <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 animate-pulse p-2">
            <Ghost className="w-4 h-4 animate-bounce" />
            <span>PhantomAI is analyzing trace &amp; formulating solution...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions Bar */}
      <div className="px-3 py-1.5 border-t border-purple-950/40 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <button
          onClick={() => handleSendMessage("Why was this ghost branch pruned?")}
          className="px-2 py-1 rounded-md bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/50 whitespace-nowrap shrink-0 transition-colors"
        >
          ⚡ Why pruned?
        </button>
        <button
          onClick={() => handleSendMessage("Give me a simple code fix for this.")}
          className="px-2 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 whitespace-nowrap shrink-0 transition-colors"
        >
          🛠️ Simple code fix
        </button>
        <button
          onClick={() => handleSendMessage("How can I optimize latency and tokens here?")}
          className="px-2 py-1 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/50 whitespace-nowrap shrink-0 transition-colors"
        >
          ⚡ Optimize speed
        </button>
        <button
          onClick={() => handleSendMessage("Write an automated regression test for this step.")}
          className="px-2 py-1 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-800/50 whitespace-nowrap shrink-0 transition-colors"
        >
          🧪 Unit test
        </button>
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-purple-900/40 bg-[#070b16]">
        <div className="relative rounded-xl border border-slate-700/80 bg-slate-900/90 focus-within:border-purple-500 transition-colors p-2 flex flex-col gap-1.5 shadow-inner">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedNode
                ? `Ask anything about Step #${selectedNode.stepIndex} or general coding...`
                : "Ask any question to PhantomAI (no limitations)..."
            }
            rows={2}
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none resize-none font-sans leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Shift+Enter for newline</span>
            </span>

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isLoading}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(168,85,247,0.35)]"
            >
              <span>Ask</span>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
