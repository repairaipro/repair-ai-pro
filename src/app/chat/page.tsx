import { Suspense } from "react";
import UnifiedChatPage from "./UnifiedChatPage";

/**
 * /chat — the unified Messages inbox (job list sidebar + live conversation).
 *
 * This page previously redirected to /my-jobs, which made the header's
 * Messages icon (and its unread badge) a dead end: clicking "Messages"
 * landed on a jobs list with no conversation in sight, while the fully
 * built inbox below sat orphaned. Suspense is required because the inner
 * component reads useSearchParams (?job= deep links from notifications).
 */
export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <UnifiedChatPage />
    </Suspense>
  );
}
