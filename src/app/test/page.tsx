'use client';

import { useState } from "react";
import { analyzeAttachment } from "@/lib/analyzeAttachment";

export default function VisionTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const TEST_IMAGE_URL =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Mechanical_room_pumps.jpg/640px-Mechanical_room_pumps.jpg";

  async function runVisionTest() {
    setLoading(true);
    setResult(null);

    try {
      const r = await analyzeAttachment(TEST_IMAGE_URL);
      setResult(r);
    } catch (err: any) {
      setResult("❌ Error: " + err.message);
    }

    setLoading(false);
  }

  return (
    <div className="p-10 text-white space-y-6">
      <h1 className="text-2xl font-bold">Vision Test</h1>

      <button
        onClick={runVisionTest}
        className="bg-indigo-600 px-4 py-2 rounded text-white"
      >
        {loading ? "Analyzing..." : "Run Vision Test"}
      </button>

      {result && (
        <div className="p-4 bg-gray-800 rounded mt-4 whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
