export function Roundel({
  className = "",
  ring = "#c8102e",
  bar = "#1b2838",
}: {
  className?: string;
  ring?: string;
  bar?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="34" fill="none" stroke={ring} strokeWidth="14" />
      <rect x="4" y="40" width="92" height="20" rx="2" fill={bar} />
    </svg>
  );
}
