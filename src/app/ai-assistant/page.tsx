'use client';

import { Suspense } from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function AIAssistantInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job") || "";
  const imageUrl = searchParams.get("image") || null;

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(customImageUrl?: string) {
    if (!input.trim() && !customImageUrl) return;

    setLoading(true);

    const userMessage = {
      role: "user",
      content: input || "(image analysis)",
      image: customImageUrl || null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        imageUrl: customImageUrl,
        jobId,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.reply },
    ]);

    setLoading(false);
  }

  // Auto-analyze if imageUrl passed
  useEffect(() => {
    if (imageUrl) {
      sendMessage(imageUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <div className="flex flex-col flex-1">
        <header className="px-6 py-4 border-b border-gray-800 bg-gray-900">
          <h1 className="text-xl font-bold text-indigo-400">🧠 AI Assistant</h1>
          {jobId && <p className="text-xs text-gray-500 mt-0.5">Job: {jobId}</p>}
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-prose ${m.role === "user" ? "text-blue-300" : "text-gray-200"}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {loading && <p className="text-indigo-300 text-sm animate-pulse">AI is thinking…</p>}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2 p-4 bg-gray-900 border-t border-gray-800"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-gray-800 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Ask the AI anything…"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 px-4 py-2 rounded-lg text-sm transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading…</div>
      </div>
    }>
      <AIAssistantInner />
    </Suspense>
  );
}
