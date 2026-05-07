'use client';
import { Suspense } from "react";
import UnifiedChatPage from "./UnifiedChatPage";

function ChatFallback() {
  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }} />
        <div className="text-sm animate-pulse" style={{ color: 'var(--color-text-4)' }}>Loading chat…</div>
      </div>
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
