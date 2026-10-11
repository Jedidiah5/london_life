import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-between bg-[#f4efe6] px-5 py-8 text-[#1b2838]">
      <header className="flex items-center justify-between text-sm">
        <span className="font-semibold tracking-[0.16em]">LONDON LIFE</span>
        <span>Zone 4 · raining</span>
      </header>
      <section className="py-10">
        <p className="text-sm font-semibold text-[#c8102e]">A week in the city, in the browser.</p>
        <h1 className="mt-3 max-w-xl text-5xl font-semibold leading-none sm:text-6xl">
          £400, a box room, and the Northern line.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-[#3d4c5c]">
          Eat a meal deal, miss the last Tube, turn the heating off, and see who else is still awake in Camden.
        </p>
        <Link
          href="/play"
          className="mt-8 inline-flex rounded-full bg-[#c8102e] px-6 py-3 text-sm font-semibold text-white"
        >
          Play free
        </Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["£3.85", "Meal deal. The only balanced meal in Zone 1."],
          ["Sunday", "Rent leaves your account whether the boiler works or not."],
          ["Minor delays", "The Central line is sorry. It is always sorry."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-2xl bg-white p-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-[#5c6b7a]">{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
