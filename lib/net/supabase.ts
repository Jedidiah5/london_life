import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export async function ensureSession(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local";
  const existing = await supabase.auth.getSession();
  if (existing.data.session) return null;
  const signed = await supabase.auth.signInAnonymously();
  if (signed.error || !signed.data.session) {
    return signed.error?.message ?? "Turn on anonymous sign-ins in the Supabase Auth dashboard";
  }
  return null;
}
