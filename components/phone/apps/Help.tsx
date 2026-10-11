"use client";

const TIPS = [
  ["⏱", "One real second is one minute in London. A day lasts 24 minutes."],
  ["👆", "Tap anything with a menu: bed, fridge, telly, venue spots. Each action shows time, price and which needs it moves."],
  ["🏆", "Follow the goal cards top-left. Each pays a little cash."],
  ["💼", "Phone → Jobs → Apply. Then go to the venue and start a shift. Mood changes your pay."],
  ["🏠", "Rent and bills come out on Sunday at midnight. Miss two weeks and you're sofa surfing."],
  ["🚇", "Tube uses your Oyster. Buses and cabs come out of your account. Walking is free but tiring."],
  ["🌍", "Your roots matter: cook food from home, say your greeting, call home, and look out for people from your country."],
  ["▶▶", "At home you can speed time up to 3×."],
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
