'use client';
import { Suspense } from "react";
import UnifiedChatPage from "./UnifiedChatPage";

function ChatFallback() {
  return (
    <div className="h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 text-sm animate-pulse">Loading chat…</div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <UnifiedChatPage />
    </Suspense>
  );
}
