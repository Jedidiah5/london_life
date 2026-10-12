import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let offlineReason: string | null = null;

function hasKeys(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function supabaseConfigured(): boolean {
  return hasKeys() && offlineReason === null;
}

export function offlineBecause(): string | null {
  return offlineReason;
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export async function ensureSession(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || offlineReason) return;
  try {
    const existing = await supabase.auth.getSession();
    if (existing.data.session) return;
    const signed = await supabase.auth.signInAnonymously();
    if (signed.error || !signed.data.session) {
      offlineReason = signed.error?.message ?? "Anonymous sign-in failed";
    }
  } catch (error) {
    offlineReason =
      error instanceof Error ? error.message : "Could not reach Supabase";
  }
}
