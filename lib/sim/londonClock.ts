const LONDON = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LONG_WEEKDAYS: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export interface LondonTime {
  weekday: string;
  longWeekday: string;
  date: string;
  hour: number;
  minute: number;
  time: string;
  /** Days since 1970 for the London calendar date, for comparing dates. */
  dayKey: number;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Real wall-clock time in London (handles GMT/BST). */
export function londonTime(epochMs: number): LondonTime {
  const parts = Object.fromEntries(LONDON.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value]));
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const weekday = parts.weekday ?? "Mon";
  const month = Number(parts.month) - 1;
  const day = Number(parts.day);
  const year = Number(parts.year);
  return {
    weekday,
    longWeekday: LONG_WEEKDAYS[weekday] ?? weekday,
    date: `${day} ${MONTHS[month] ?? ""}`,
    hour,
    minute,
    time: `${pad(hour)}:${pad(minute)}`,
    dayKey: Date.UTC(year, month, day) / 86_400_000,
  };
}

/** Real time somewhere at a fixed UTC offset, and whether it is a different day from London. */
export function timeAtOffset(epochMs: number, utcOffset: number): { label: string; hour: number; dayDelta: number } {
  const shifted = new Date(epochMs + utcOffset * 3_600_000);
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const homeKey = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) / 86_400_000;
  const london = londonTime(epochMs);
  return {
    label: `${WEEKDAYS[shifted.getUTCDay()] ?? "Mon"} ${pad(hour)}:${pad(minute)}`,
    hour,
    dayDelta: homeKey - london.dayKey,
  };
}

/** "45s", "12m" or "1h 05m" for a span of real seconds. */
export function formatSpan(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}
