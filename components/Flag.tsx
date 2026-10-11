import { nationalitiesById } from "@/lib/content";

const SIZES = { sm: [16, 12], md: [24, 18], lg: [64, 48] } as const;

export function Flag({ origin, size = "sm", className = "" }: { origin: string; size?: keyof typeof SIZES; className?: string }) {
  const nation = nationalitiesById[origin];
  if (!nation) return null;
  const [width, height] = SIZES[size];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w80/${nation.iso}.png`}
      alt={nation.flag}
      title={nation.label}
      width={width}
      height={height}
      className={`inline-block rounded-[2px] object-cover align-[-2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${className}`}
      style={{ width, height }}
      draggable={false}
    />
  );
}
