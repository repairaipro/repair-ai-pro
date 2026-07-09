/**
 * ChatBubbleIcon — the Messages icon for headers/navs.
 *
 * A filled, Messenger-style rounded bubble with the brand lightning bolt,
 * replacing the thin lucide MessageSquare outline that read as cheap.
 * Filled + gradient matches the ⚡ RepairAI logo treatment.
 */
export default function ChatBubbleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chatBubbleGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {/* Rounded bubble with a tail anchored bottom-left, like Messenger */}
      <path
        d="M12 2.5c-5.52 0-10 4.02-10 8.98 0 2.82 1.45 5.33 3.72 6.98v3.3c0 .55.6.9 1.08.62l3.13-1.82c.67.13 1.36.2 2.07.2 5.52 0 10-4.02 10-8.98S17.52 2.5 12 2.5z"
        fill="url(#chatBubbleGrad)"
      />
      {/* Brand lightning bolt */}
      <path
        d="M13.1 6.8l-4.2 5.4c-.18.23-.02.57.27.57h2.33l-.98 3.9c-.09.36.37.59.6.3l4.2-5.4c.18-.23.02-.57-.27-.57h-2.33l.98-3.9c.09-.36-.37-.59-.6-.3z"
        fill="#fff"
      />
    </svg>
  );
}
