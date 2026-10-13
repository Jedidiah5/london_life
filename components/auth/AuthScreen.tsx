"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Roundel } from "@/components/marketing/Roundel";
import { logIn, signUp } from "@/lib/net/auth";
import { validatePassword, validateUsername } from "@/lib/net/authRules";

export type AuthMode = "signup" | "login";

const inputClass =
  "w-full rounded-full border border-transparent bg-[#f1ede6] px-4 py-3.5 text-[15px] text-[#1b2838] outline-none transition placeholder:text-[#9aa5b1] focus:border-[#c8102e]/40 focus:bg-white focus:ring-4 focus:ring-[#c8102e]/10 aria-[invalid=true]:border-[#c8102e]";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signup = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const problem = validateUsername(username) ?? (signup ? validatePassword(password) : password ? null : "Enter your password");
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const result = signup ? await signUp(username, password) : await logIn(username, password);
    if (result.ok) {
      router.push("/play");
      return;
    }
    setBusy(false);
    setError(result.message);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-gradient-to-b from-[#b9c9da] via-[#dfe5ea] to-[#f4efe6] px-5 pb-10 pt-6 text-[#1b2838]">
      <Roundel
        ring="#fff"
        bar="#fff"
        className="pointer-events-none absolute -right-24 top-24 h-80 w-80 opacity-30"
      />

      <div className="relative flex w-full max-w-md flex-1 flex-col">
        <Link href="/" className="w-fit text-sm font-semibold text-[#2b5d9b] hover:underline">
          ← Back to London
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <Roundel className="h-16 w-16 drop-shadow-md" />
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">London Life</h1>
          <p className="mt-1 text-[15px] text-[#4a5b6c]">Live your London story with real people.</p>
        </div>

        <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(27,40,56,0.45)]">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#f1ede6] p-1 text-sm font-bold" role="tablist">
            <Link
              href="/signup"
              role="tab"
              aria-selected={signup}
              className={`rounded-full py-2.5 text-center transition ${signup ? "bg-white shadow-sm" : "text-[#5c6b7a] hover:text-[#1b2838]"}`}
            >
              Create account
            </Link>
            <Link
              href="/login"
              role="tab"
              aria-selected={!signup}
              className={`rounded-full py-2.5 text-center transition ${!signup ? "bg-white shadow-sm" : "text-[#5c6b7a] hover:text-[#1b2838]"}`}
            >
              Log in
            </Link>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="text-[13px] font-semibold text-[#3d4c5c]">
                Username
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#5c6b7a]">@</span>
                <input
                  id="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={21}
                  placeholder="mindthegap"
                  aria-invalid={error !== null && validateUsername(username) !== null}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {signup ? <p className="mt-1.5 px-1 text-xs text-[#6b7a89]">This is your Sim&apos;s name in London Life.</p> : null}
            </div>

            <div>
              <label htmlFor="password" className="text-[13px] font-semibold text-[#3d4c5c]">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={signup ? "new-password" : "current-password"}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#5c6b7a] hover:bg-black/5"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              {signup ? (
                <p className="mt-1.5 px-1 text-xs text-[#6b7a89]">At least 8 characters. Not &ldquo;password1&rdquo; either 😅</p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="rounded-2xl bg-[#c8102e]/10 px-4 py-2.5 text-sm font-semibold text-[#a10d25]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#c8102e] py-3.5 text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(200,16,46,0.75)] transition hover:bg-[#a90d26] disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? (signup ? "Creating your account…" : "Logging in…") : signup ? "Sign up · it's free" : "Log in"}
            </button>

            <p className="text-center text-xs text-[#6b7a89]">
              {signup
                ? "Your Sim will live in the same London as everyone else who signs up."
                : "Welcome back to London. Your flat is exactly as you left it."}
            </p>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-[#4a5b6c]">
          {signup ? "Already have an account? " : "New here? "}
          <Link href={signup ? "/login" : "/signup"} className="font-bold text-[#2b5d9b] hover:underline">
            {signup ? "Log in" : "Create one"}
          </Link>
          <span className="mx-2 text-[#9aa5b1]">·</span>
          <Link href="/play" className="font-bold text-[#2b5d9b] hover:underline">
            Play as guest
          </Link>
        </div>
      </div>
    </main>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
