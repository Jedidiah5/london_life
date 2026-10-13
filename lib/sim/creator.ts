/** Copy for the character creator. Traits and dreams are flavour for now; nothing here changes the sim. */

export type CreatorStep = "origin" | "look" | "personality" | "dream" | "moving";

export const CREATOR_STEPS: readonly { id: CreatorStep; title: string }[] = [
  { id: "origin", title: "Origin" },
  { id: "look", title: "Look" },
  { id: "personality", title: "Personality" },
  { id: "dream", title: "Dream" },
  { id: "moving", title: "Moving in" },
];

export const TRAIT_INFO: Record<string, { emoji: string; blurb: string }> = {
  "Night owl": { emoji: "🌙", blurb: "Still awake at 3am, just checking one thing." },
  "Early bird": { emoji: "🌅", blurb: "First at the bus stop, and smug about it." },
  Foodie: { emoji: "🍛", blurb: "Knows every good chippy within two zones." },
  Chatty: { emoji: "💬", blurb: "Talks to strangers on the Tube. Brave. Rare." },
  Frugal: { emoji: "🪙", blurb: "Owns a reusable everything and a Clubcard." },
  Dramatic: { emoji: "🎭", blurb: "Every delay is a personal betrayal." },
  Handy: { emoji: "🔧", blurb: "Can fix the boiler. The landlord must not know." },
  Bookish: { emoji: "📚", blurb: "Three books on the go. None on the shelf." },
};

export const ASPIRATION_INFO: Record<string, { emoji: string; blurb: string }> = {
  tech_founder: { emoji: "💻", blurb: "Three startup ideas, one oat flat white, zero revenue." },
  influencer: { emoji: "📸", blurb: "Make London look good. Mostly the lighting." },
  property_ladder: { emoji: "🏠", blurb: "Get out of the box room and onto the ladder." },
  party_animal: { emoji: "🎉", blurb: "Every night out is a story. Most are unprintable." },
  artist: { emoji: "🎨", blurb: "Paint it, play it, perform it. Rent permitting." },
};

export const STARTING_KIT = [
  ["💷", "£400 in your account"],
  ["🏠", "A box room in Zone 4"],
  ["🧾", "£180 rent, due every week"],
  ["🌧️", "Rain, included"],
] as const;
