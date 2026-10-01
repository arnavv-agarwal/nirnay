// Nirnay's mark: one incoming path that splits two ways (send it, or hand it to a person).
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#5a4bda" />
      <path d="M8 16 H15 M15 16 L23 9.5 M15 16 L23 22.5" fill="none" stroke="#fff" strokeWidth="2.6"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.5" cy="9.5" r="2.2" fill="#fff" />
      <circle cx="23.5" cy="22.5" r="2.2" fill="#b2a9ff" />
    </svg>
  );
}
