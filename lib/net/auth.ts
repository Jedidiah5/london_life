import { friendlyAuthError, normaliseUsername, usernameToEmail, validatePassword, validateUsername } from "./authRules";
import { getSupabase } from "./supabase";

export type AuthResult = { ok: true } | { ok: false; message: string };

const fail = (message: string): AuthResult => ({ ok: false, message });

function supabaseFail(raw: string, mode: "signup" | "login"): AuthResult {
  const message = friendlyAuthError(raw, mode);
  if (message !== raw) console.warn(`[auth] ${mode} failed: ${raw}`);
  return fail(message);
}

/**
 * Creates an account. If the player already started as a guest, the guest session is upgraded
 * in place so their Sim, money and flat carry over.
 */
export async function signUp(rawUsername: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail("Accounts are offline right now. You can still play as a guest");

  const usernameError = validateUsername(rawUsername);
  if (usernameError) return fail(usernameError);
  const passwordError = validatePassword(password);
  if (passwordError) return fail(passwordError);

  const username = normaliseUsername(rawUsername);
  const email = usernameToEmail(username);

  try {
    const existing = await supabase.auth.getSession();
    const guest = existing.data.session?.user.is_anonymous === true;

    if (guest) {
      const { error } = await supabase.auth.updateUser({ email, password, data: { username } });
      if (error) return supabaseFail(error.message, "signup");
      const { data } = await supabase.auth.getUser();
      if (!data.user || data.user.is_anonymous || data.user.email !== email) {
        return supabaseFail("Email not confirmed", "signup");
      }
      return { ok: true };
    }

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) return supabaseFail(error.message, "signup");
    if (!data.session) {
      return supabaseFail("Email not confirmed", "signup");
    }
    return { ok: true };
  } catch (error) {
    return fail(friendlyAuthError(error instanceof Error ? error.message : "", "signup"));
  }
}

export async function logIn(rawUsername: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return fail("Accounts are offline right now. You can still play as a guest");

  const usernameError = validateUsername(rawUsername);
  if (usernameError) return fail(usernameError);
  if (!password) return fail("Enter your password");

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(rawUsername), password });
    if (error) return supabaseFail(error.message, "login");
    return { ok: true };
  } catch (error) {
    return fail(friendlyAuthError(error instanceof Error ? error.message : "", "login"));
  }
}

/** The username chosen at sign-up, if the current session has one. */
export async function sessionUsername(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const username = data.session?.user.user_metadata?.username;
  return typeof username === "string" ? username : null;
}
