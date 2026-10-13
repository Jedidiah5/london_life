/**
 * Players sign in with a username + password, like Lagos Life. Supabase Auth wants an email,
 * so each username maps to a private, deterministic address that never receives mail.
 */
export const AUTH_EMAIL_DOMAIN = "players.londonlife.app";

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "letmein1",
  "london123",
  "londonlife",
]);

export function normaliseUsername(username: string): string {
  return username.trim().replace(/^@/, "");
}

export function usernameToEmail(username: string): string {
  return `${normaliseUsername(username).toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function validateUsername(username: string): string | null {
  const clean = normaliseUsername(username);
  if (!clean) return "Pick a username";
  if (!USERNAME_PATTERN.test(clean)) return "Username must be 3-20 letters, numbers, or _";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "That password is far too common. Try another";
  return null;
}

/** Turns raw Supabase Auth messages into something a player can act on. */
export function friendlyAuthError(message: string, mode: "signup" | "login"): string {
  const text = message.toLowerCase();
  if (text.includes("already been registered") || text.includes("already registered") || text.includes("already exists")) {
    return "That username is taken. Try another";
  }
  if (text.includes("invalid login")) return "Wrong username or password";
  if (text.includes("rate limit") || text.includes("too many")) return "Too many tries. Give it a minute";
  if (text.includes("password") && text.includes("weak")) return "That password is too weak. Try a longer one";
  if (text.includes("failed to fetch") || text.includes("network")) return "Can't reach London right now. Check your connection";
  return mode === "signup" ? message || "Could not create your account" : message || "Could not log you in";
}
