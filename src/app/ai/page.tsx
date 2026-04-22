'use client';

import { useEffect, useState, useRef } from 'react';
type ExplainMode = "beginner" | "homeowner" | "pro";

// ⭐ Speech-to-Text
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

// ⭐ Text-to-Speech
import { speak, stopSpeaking } from "@/lib/useTTS";

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
  repairPlan?: any | null;
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [voiceRate, setVoiceRate] = useState(1);

  // ⭐ NEW — Explain mode (Phase 5)
  const [explainMode, setExplainMode] = useState<ExplainMode>('homeowner');

  const bottomRef = useRef<HTMLDivElement>(null);

  // ⭐ Speech-to-Text
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    if (transcript.trim().length > 0) setText(transcript);
  };

  // ⭐ Load voices
  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadVoices = () => {
        const v = speechSynthesis.getVoices();
        setAvailableVoices(v);
      };
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Load chat history
  useEffect(() => {
    const saved = localStorage.getItem('ai-chat');
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  // Save + Scroll
  useEffect(() => {
    localStorage.setItem('ai-chat', JSON.stringify(messages));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages]);

  // ⭐ Auto-speak AI messages (only normal replies, not big repairPlan objects)
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && !last.repairPlan) {
      speak(last.content, selectedVoice, voiceRate);
    }
  }, [messages, selectedVoice, voiceRate]);

  // ⭐ REPAIR PLAN — Phase 4
  async function runRepairPlan() {
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];

    const res = await fetch("/api/repair-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: last.content,
        image: last.image || null,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "❌ Error generating repair plan. Try again later.",
        }
      ]);
      return;
    }

    const repair = data.repair;

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Here is your detailed repair plan:",
        repairPlan: repair
      }
    ]);
  }

  // SEND
  async function sendMessage(e: any) {
    e.preventDefault();
    if (!text.trim() && !uploadImage) return;

    // USER MESSAGE
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim() || '(User sent only an image)',
      image: uploadImage || null,
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // AI REPLY — routed through server API to keep key server-side
    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text.trim() || "Analyze this image.",
        imageUrl: uploadImage,
        mode: explainMode,
      }),
    });
    const data = await res.json();
    const aiReply: string = data.reply || data.error || "No response";

    const aiMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: aiReply,
    };

    setMessages(prev => [...prev, aiMessage]);

    setText('');
    setUploadImage(null);
    resetTranscript();
    setLoading(false);
  }

  function resetChat() {
    stopSpeaking();
    localStorage.removeItem('ai-chat');
    setMessages([]);
  }

  // IMAGE UPLOAD
  function handleUpload(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setUploadImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">

      {/* HEADER */}
      <header className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">AI Repair Assistant</h1>
          <p className="text-xs text-gray-400 mt-1">
            Explain mode:{" "}
            <span className="font-semibold capitalize">{explainMode}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={runRepairPlan}
            className="text-sm bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800 transition"
          >
            Repair Plan
          </button>

          <button
            onClick={resetChat}
            className="text-sm bg-gray-800 px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Reset
          </button>
        </div>
      </header>

      {/* VOICE + EXPLAIN MODE CONTROLS */}
      <div className="p-3 bg-gray-900 border-b border-gray-800 flex flex-wrap gap-4 items-center text-sm">
        {/* Voices */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Voice:</span>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-gray-800 px-2 py-1 rounded"
          >
            <option value="">Default</option>
            {availableVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Speed</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={voiceRate}
            onChange={(e) => setVoiceRate(Number(e.target.value))}
          />
        </label>

        <button
          onClick={stopSpeaking}
          className="bg-red-600 px-2 py-1 rounded text-xs"
        >
          Stop Voice
        </button>

        {/* ⭐ Explain Modes */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-400">Explain for:</span>
          <button
            type="button"
            onClick={() => setExplainMode("beginner")}
            className={`px-2 py-1 rounded-full text-xs ${
              explainMode === "beginner"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            Beginner
          </button>
          <button
            type="button"
            onClick={() => setExplainMode("homeowner")}
            className={`px-2 py-1 rounded-full text-xs ${
              explainMode === "homeowner"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            Homeowner
          </button>
          <button
            type="button"
            onClick={() => setExplainMode("pro")}
            className={`px-2 py-1 rounded-full text-xs ${
              explainMode === "pro"
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
          >
            Pro Tech
          </button>
        </div>
      </div>

      {/* CHAT */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-xl shadow ${
                m.role === 'user' ? 'bg-indigo-600' : 'bg-gray-800'
              }`}
            >
              {m.image && (
                <img
                  src={m.image}
                  className="w-40 h-auto rounded-lg mb-2 border border-gray-700"
                />
              )}

              {/* Normal AI/User text */}
              {!m.repairPlan && (
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              )}

              {/* ⭐ REPAIR PLAN UI ⭐ */}
              {m.repairPlan && (
                <div className="space-y-2 text-sm">
                  <h3 className="text-indigo-300 font-semibold">Repair Summary</h3>
                  <p>{m.repairPlan.summary}</p>

                  {m.repairPlan.steps && (
                    <>
                      <h4 className="font-semibold mt-2 text-indigo-400">Steps</h4>
                      <ul className="list-decimal ml-5 space-y-1">
                        {m.repairPlan.steps.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {m.repairPlan.parts && (
                    <>
                      <h4 className="font-semibold mt-2 text-indigo-400">Parts Needed</h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {m.repairPlan.parts.map((p: string, i: number) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {m.repairPlan.warnings && (
                    <>
                      <h4 className="font-semibold mt-2 text-red-400">Safety Warnings</h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {m.repairPlan.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {m.repairPlan.cost_estimate && (
                    <p className="mt-2 text-xs text-gray-300">
                      <strong>Cost:</strong> DIY ${m.repairPlan.cost_estimate.diy} vs Pro $
                      {m.repairPlan.cost_estimate.pro}
                    </p>
                  )}

                  {m.repairPlan.time_required && (
                    <p className="text-xs text-gray-300">
                      ⏱ Time Required: {m.repairPlan.time_required}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <p className="text-center text-gray-400 text-sm animate-pulse">AI thinking…</p>
        )}

        <div ref={bottomRef} />
      </main>

      {/* INPUT */}
      <form
        onSubmit={sendMessage}
        className="p-4 border-t border-gray-800 flex gap-2 items-center bg-gray-900"
      >
        {uploadImage && (
          <img
            src={uploadImage}
            className="w-14 h-14 rounded-lg border border-gray-700 mr-2"
          />
        )}

        <label className="bg-gray-800 cursor-pointer px-3 py-2 rounded hover:bg-gray-700 text-sm">
          📎
          <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </label>

        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          className={`px-3 py-2 rounded-full text-lg ${
            listening ? "bg-red-600" : "bg-indigo-600"
          }`}
        >
          🎤
        </button>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-gray-800 px-4 py-2 rounded-full text-sm outline-none"
          placeholder="Speak or type your question…"
        />

        <button
          type="submit"
          className="bg-indigo-600 px-4 py-2 rounded-full text-sm hover:bg-indigo-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
