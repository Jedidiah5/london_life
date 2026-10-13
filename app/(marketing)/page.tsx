import Link from "next/link";
import { LiveClock } from "@/components/marketing/LiveClock";
import { Roundel } from "@/components/marketing/Roundel";

const TICKER = [
  "Northern line: minor delays",
  "Central line: sorry for the wait",
  "Meal deal now £3.85",
  "Rent due Sunday",
  "Heating: off, probably",
  "Piccadilly line: good service (suspicious)",
  "Boiler: under investigation",
  "Last Tube: 00:14, you will miss it",
];

const FEATURES = [
  {
    emoji: "🍞",
    title: "Needs that actually nag",
    copy: "Hunger, energy, hygiene and fun drain in real time. Ignore them and your mood tells everyone.",
  },
  {
    emoji: "💷",
    title: "Money is tight",
    copy: "Start with £400. Earn it as a barista, rider or night cleaner, then watch rent take it back.",
  },
  {
    emoji: "🛋️",
    title: "Make the box room yours",
    copy: "Buy furniture, place it on the grid, pick the finishes. It is still a box room, but it is yours.",
  },
  {
    emoji: "🚇",
    title: "Get around the city",
    copy: "Hop on the bus, the Tube or a cab between Camden, Brixton, Canary Wharf and Hyde Park.",
  },
  {
    emoji: "🧑‍🤝‍🧑",
    title: "Other real people",
    copy: "See who else is out in Camden right now. Say hello, swap messages, make a friend or two.",
  },
  {
    emoji: "🌧️",
    title: "It is always London",
    copy: "The game runs on London time. Same clock, same night, and it is already raining.",
  },
];

const STEPS = [
  ["Mon", "Sort a job", "Open your phone, apply to the first thing that answers. Rent will not wait."],
  ["Wed", "Meet the neighbours", "Camden Market, a coffee in Shoreditch, a very long queue for noodles."],
  ["Fri", "Spend it all", "The Mucky Duck is open. Your balance has opinions."],
  ["Sun", "Rent day", "It leaves your account whether the boiler works or not."],
] as const;

const PLACES = [
  ["🛍️", "Camden Market"],
  ["☕", "Shoreditch coffee"],
  ["🍛", "Brixton Village"],
  ["🏢", "Canary Wharf"],
  ["🌳", "Hyde Park"],
  ["🍺", "The Mucky Duck"],
  ["🚇", "Oval station"],
  ["🏠", "Your flat"],
];

function PlayButton({ className = "", children = "Play free" }: { className?: string; children?: React.ReactNode }) {
  return (
    <Link
      href="/play"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#c8102e] px-7 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(200,16,46,0.7)] transition hover:-translate-y-0.5 hover:bg-[#a90d26] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8102e] ${className}`}
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function Need({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] font-semibold text-[#5c6b7a]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e8e2d6]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[270px] text-[#1b2838] sm:w-[300px]">
      <div className="ll-float absolute -left-10 top-14 z-10 hidden rounded-2xl bg-white px-3 py-2 text-xs font-semibold shadow-xl sm:block" style={{ "--r": "-6deg" } as React.CSSProperties}>
        🧾 Rent due <span className="text-[#c8102e]">Sunday</span>
      </div>
      <div className="ll-float absolute -right-12 bottom-6 z-10 hidden rounded-2xl bg-white px-3 py-2 text-xs font-semibold shadow-xl [animation-delay:-3s] sm:block" style={{ "--r": "5deg" } as React.CSSProperties}>
        🚇 Minor delays
      </div>

      <div className="rounded-[2.6rem] bg-[#0f1824] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[2.1rem] bg-[#f4efe6]">
          {/* Scene */}
          <div className="relative h-44 overflow-hidden bg-gradient-to-b from-[#34475c] to-[#5b7087]">
            <div className="ll-rain absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1.5 px-4">
              {[44, 70, 52, 88, 60, 76, 48].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-[#1b2838]"
                  style={{ height: h, opacity: 0.55 + (i % 3) * 0.15 }}
                />
              ))}
            </div>
            <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#1b2838]">
              🌧️ <LiveClock />
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#1b2838]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" /> Live
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-[#5c6b7a]">Balance</p>
                <p className="text-2xl font-extrabold leading-none">£400.00</p>
              </div>
              <span className="rounded-full bg-[#fff1c9] px-3 py-1 text-xs font-bold">🙂 Fine</span>
            </div>
            <div className="space-y-2.5">
              <Need label="🍞 Hunger" value={62} color="#f59e0b" />
              <Need label="⚡ Energy" value={41} color="#3b82f6" />
              <Need label="🚿 Hygiene" value={78} color="#14b8a6" />
              <Need label="🎉 Fun" value={30} color="#ec4899" />
            </div>
            <div className="rounded-2xl bg-white p-3 text-xs shadow-sm">
              <p className="font-bold">💼 Get a job</p>
              <p className="mt-0.5 text-[#5c6b7a]">Phone → Jobs → Apply</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#f4efe6] text-[#1b2838]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[#1b2838]/10 bg-[#f4efe6]/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-[0.14em]">
            <Roundel className="h-8 w-8" />
            <span className="text-sm">LONDON LIFE</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-[#3d4c5c] md:flex">
            <a href="#features" className="hover:text-[#c8102e]">Features</a>
            <a href="#week" className="hover:text-[#c8102e]">A week in London</a>
            <a href="#places" className="hover:text-[#c8102e]">Places</a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-[#5c6b7a] sm:inline">
              Zone 4 · <LiveClock />
            </span>
            <Link href="/login" className="rounded-full px-3 py-2 text-sm font-bold transition hover:bg-black/5">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#1b2838] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#c8102e]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#1b2838] text-[#f4efe6]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] opacity-[0.07]">
            <Roundel className="h-full w-full" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_40%,rgba(200,16,46,0.28),transparent)]" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-[1.15fr_1fr] md:pb-28 md:pt-20">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#3ccf6e]" />
                A life sim in your browser · free to play
              </p>
              <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                £400, a box room, and the{" "}
                <span className="text-[#ff5a73]">Northern line.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#f4efe6]/75">
                Eat a meal deal, miss the last Tube, turn the heating off, and see who else is still
                awake in Camden. One week of London, with real people.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <PlayButton className="text-lg" />
                <Link href="/signup" className="px-2 py-3 text-sm font-bold text-[#f4efe6]/80 underline-offset-4 hover:underline">
                  Create an account
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[#f4efe6]/60">
                <li>✓ No download</li>
                <li>✓ Works on your phone</li>
                <li>✓ Try it as a guest</li>
              </ul>
            </div>
            <PhoneMock />
          </div>
        </section>

        {/* Ticker */}
        <div className="overflow-hidden border-y-4 border-[#c8102e] bg-white py-3" aria-hidden="true">
          <div className="ll-marquee flex w-max gap-10 whitespace-nowrap text-sm font-bold">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className="flex items-center gap-10">
                {item}
                <Roundel className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 md:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c8102e]">What you do</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Survive London. Maybe even enjoy it.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="group rounded-3xl border border-[#1b2838]/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(27,40,56,0.35)]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f4efe6] text-2xl transition group-hover:bg-[#c8102e]/10">
                  {f.emoji}
                </div>
                <h3 className="mt-5 text-xl font-bold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-[#5c6b7a]">{f.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Week */}
        <section id="week" className="scroll-mt-20 bg-[#1b2838] py-20 text-[#f4efe6] md:py-28">
          <div className="mx-auto w-full max-w-6xl px-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ff5a73]">The week</p>
            <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Seven days. One rent payment.
            </h2>
            <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
              <div className="absolute left-[1.35rem] top-2 hidden h-[calc(100%-1rem)] w-1 rounded bg-[#c8102e] max-md:block" aria-hidden="true" />
              <div className="absolute left-0 right-0 top-[1.35rem] hidden h-1 rounded bg-[#c8102e] md:block" aria-hidden="true" />
              {STEPS.map(([day, title, copy]) => (
                <li key={day} className="relative pl-16 md:pl-0 md:pt-16">
                  <span className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border-4 border-[#c8102e] bg-[#1b2838] text-xs font-extrabold uppercase">
                    {day}
                  </span>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-[#f4efe6]/65">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Places */}
        <section id="places" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-20 md:py-28">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#c8102e]">Where you go</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Eight places, all one Tube ride away.
          </h2>
          <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLACES.map(([emoji, name]) => (
              <li
                key={name}
                className="flex items-center gap-3 rounded-2xl border border-[#1b2838]/10 bg-white px-4 py-4 text-sm font-bold"
              >
                <span className="text-2xl">{emoji}</span>
                {name}
              </li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-20 md:pb-28">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-[#c8102e] px-6 py-16 text-center text-white md:py-20">
            <Roundel ring="#fff" bar="#fff" className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 opacity-[0.12]" />
            <Roundel ring="#fff" bar="#fff" className="pointer-events-none absolute -bottom-20 -right-12 h-72 w-72 opacity-[0.12]" />
            <h2 className="relative mx-auto max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Mind the gap between payday and rent day.
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-lg text-white/85">
              Your box room is waiting. The boiler, less so.
            </p>
            <Link
              href="/play"
              className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-extrabold text-[#c8102e] transition hover:-translate-y-0.5 hover:bg-[#f4efe6]"
            >
              Play free <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1b2838]/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-[#5c6b7a] sm:flex-row">
          <span className="flex items-center gap-2 font-bold text-[#1b2838]">
            <Roundel className="h-6 w-6" /> London Life
          </span>
          <span>A browser life sim. Not affiliated with TfL, though we wish the trains ran like this.</span>
        </div>
      </footer>
    </div>
  );
}
