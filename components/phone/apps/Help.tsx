"use client";

const TIPS = [
  [
    "🕰️",
    "The clock is live London time, so day and night match the real city. Actions are quick: a 15-minute fry-up takes 15 seconds.",
  ],
  [
    "👆",
    "Tap anything with a menu: bed, fridge, telly, venue spots. Each action shows time, price and which needs it moves.",
  ],
  ["🏆", "Follow the goal cards top-left. Each pays a little cash."],
  ["💼", "Phone → Jobs → Apply. Then go to the venue and start a shift. Mood changes your pay."],
  [
    "🏠",
    "Rent and bills come out about every three hours of play. The Bank app counts down. Miss two and you're sofa surfing.",
  ],
  ["🚇", "Tube uses your Oyster. Buses and cabs come out of your account. Walking is free but tiring."],
  [
    "🌍",
    "Your roots matter: cook food from home, say your greeting, call home, and look out for people from your country.",
  ],
  ["💤", "Sleeping fast-forwards ten times quicker, so a night in bed takes under a minute."],
];

export function Help() {
  return (
    <div className="space-y-1.5 text-xs">
      {TIPS.map(([emoji, text]) => (
        <div key={text} className="flex gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <span className="text-base">{emoji}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
