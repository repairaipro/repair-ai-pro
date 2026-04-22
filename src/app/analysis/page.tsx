'use client';

import React, { useState } from "react";

export default function AnalysisPage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    if (!prompt && !imageUrl) return;

    // Add user message to history
    setMessages((prev) => [
      ...prev,
      { role: "user", text: prompt || "(uploaded image)" },
    ]);

    setLoading(true);

    const res = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, imageUrl }),
    });
    const data = await res.json();
    const response = data.reply || data.error || "No response";

    setMessages((prev) => [...prev, { role: "assistant", text: response }]);
    setPrompt("");
    setLoading(false);
  }

  async function handleImageUpload(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white p-6">
      <h1 className="text-2xl font-bold text-indigo-400 mb-4">AI Analysis Assistant</h1>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-4 rounded-lg space-y-4 border border-gray-800">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl max-w-[80%] ${m.role === "user" ? "ml-auto bg-indigo-600" : "bg-gray-800"}`}>
            <p className="text-sm whitespace-pre-wrap">{m.text}</p>
          </div>
        ))}

        {loading && (
          <div className="text-gray-400 text-sm">AI is analyzing...</div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-3">

        {/* Prompt */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-gray-800 p-3 rounded-lg text-sm"
          placeholder="Describe what you want the AI to analyze…"
        />

        {/* File Upload */}
        <label className="block cursor-pointer bg-gray-800 hover:bg-gray-700 p-3 rounded-md text-sm text-center">
          📎 Upload Image (optional)
          <input type="file" className="hidden" onChange={handleImageUpload} />
        </label>

        {/* Show selected image */}
        {imageUrl && (
          <img src={imageUrl} className="w-40 h-40 object-cover rounded-md border border-gray-700" />
        )}

        {/* Submit */}
        <button
          onClick={handleAnalyze}
          className="w-full bg-indigo-600 hover:bg-indigo-700 p-3 rounded-md font-semibold"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}
