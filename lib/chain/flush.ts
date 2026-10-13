import { supabaseConfigured } from "@/lib/net/supabase";

const DEBOUNCE_MS = 2000;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Ask the server to settle any new ledger rows on Monad. Sends no amounts; the route reads the database. */
export function scheduleFlush(): void {
  if (typeof window === "undefined" || !supabaseConfigured()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void fetch("/api/chain/flush", { method: "POST" }).catch(() => undefined);
  }, DEBOUNCE_MS);
}
