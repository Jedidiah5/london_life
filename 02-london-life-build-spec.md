# London Life — Build Spec for Cursor

> **Cursor: read this whole file before writing code. Build in the phase order in §9. Do not start a phase until the previous one runs. Ask before adding any dependency not listed in §2.**

Working title: **London Life** (change freely). A free, browser-based, Sims-style life sim set in London, with real players. Inspired by Lagos Life (see `01-lagos-life-teardown.md`), but rebuilt from scratch with our own code, our own content and fixes for its weak spots.

---

## 1. Product in one paragraph
You arrive in London with £400 and a box room in a shared flat in Zone 4. Rent is due every week, the heating costs money, the Tube eats your Oyster balance, and it's always about to rain. Work shifts and side hustles, level up skills, decorate your room, move to a better postcode, and meet real players at Camden, Brixton, Shoreditch and Canary Wharf. It runs in the browser on any phone, with no download.

**Design pillars**
1. **Instantly recognisable London** — the jokes are the marketing (meal deals, rent, the Northern line, "sorry").
2. **Zero friction** — open link → name your character → playing in under 30 seconds.
3. **Real people** — you can always see who's online and where.
4. **Fair economy** — the server owns money, so no cheating.

---

## 2. Tech stack (fixed)

Matches what Lagos Life proved works, plus upgrades where it's weak.

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** | Same as Lagos Life; one deployable for site + game + API |
| 3D | **three + @react-three/fiber + @react-three/drei** | Isometric 3D like Lagos Life; R3F keeps it in React |
| UI | **Tailwind CSS** + small headless components | HUD overlays the canvas |
| Client state | **Zustand** (+ `persist` for UI prefs and offline cache only) | Same pattern as Lagos Life |
| Backend | **Supabase**: Auth, Postgres, Realtime, Storage, Edge/RPC functions | Replaces their custom API + polling |
| Multiplayer | **Supabase Realtime** — Presence for "who's here", Broadcast for movement/chat | Fixes their HTTP polling (cheaper, instant) |
| Economy authority | **Postgres functions (RPC)** with row-level security | Fixes their client-authoritative save |
| Assets | **Kenney.nl CC0 kits** (City Kit Commercial, City Kit Suburban, Furniture Kit, Nature Kit) as `.glb`, compressed with `gltf-transform` | Free, cohesive, fast |
| Characters | 2–4 rigged low-poly base bodies (e.g. Kenney "Mini Characters" or Quaternius CC0), recoloured at runtime | Same approach as Lagos Life |
| Hosting | **Vercel** | Existing workflow |
| PWA | `app/manifest.ts` + icons | Installable on phones |
| Analytics | Vercel Analytics or PostHog | Know where players drop off |

**Do NOT use:** Phaser, Babylon, Unity/WebGL builds, Socket.io servers, Redux, Firebase.

---

## 3. Architecture

```
Browser
├── app/(game)/play/page.tsx
│   ├── <GameCanvas>  (R3F Canvas, orthographic iso camera)
│   │   ├── <RoomScene>   tile grid, walls, furniture, your Sim
│   │   ├── <CityScene>   districts, landmarks, Tube stops, other players
│   │   └── <Characters>  recoloured rigged glb, simple walk/idle/sit/sleep anims
│   ├── <Hud>  top bar · needs panel · goals · bottom nav (Home/Buy/Map/Phone)
│   └── <PhoneOverlay> app grid → feature panels
├── lib/sim/      pure TS simulation (no React) — tick, needs, mood, actions
├── lib/store/    Zustand stores (game, ui, presence)
└── lib/net/      Supabase client, realtime channels, RPC wrappers

Supabase
├── auth            anonymous sign-in first, upgrade to email/Google later
├── postgres        profiles, sims, inventory, placed_objects, transactions, jobs, venues…
├── rpc functions   buy_item, pay_rent, finish_shift, travel, gift, vote … (all money moves here)
├── realtime        channel per venue: presence + broadcast (pos, emote, chat)
├── storage         billboard/ad images (moderated)
└── cron (pg_cron)  weekly rent, daily headline, election cycle
```

### Authority rules (important)
- **Client owns:** camera, animation, needs decay *display*, action queue, furniture *preview*.
- **Server owns:** money, inventory, rent, wages, skill levels, relationships, votes.
- Needs are simulated client-side but **checkpointed** to the server every 30s and on key actions; the server clamps impossible jumps.
- Every money change is one RPC call writing to `transactions` (double-entry style: never edit balance directly).

---

## 4. Game systems

### 4.1 Time
- 1 real second = 1 game minute at speed 1 (so 1 game day = 24 real minutes). Speeds: 1×, 2×, 3× when alone at home; forced 1× in public venues.
- Day/night lighting from game time. Weather per day from server (`rain` most days — it's London).

### 4.2 Needs (0–100, decay per game hour)
| Need | Decay/hr | Restored by |
|---|---|---|
| Hunger | 4 | Cook, microwave meal, meal deal, takeaway |
| Energy | 3 (×2 when working) | Sleep in bed, nap on sofa, coffee (temporary) |
| Hygiene | 2.5 | Shower, wash hands |
| Bladder | 5 | Toilet (shared bathroom queue in flatshare!) |
| Fun | 3 | TV, games, pub, gigs, parks |
| Social | 2 | Chat with players/NPCs, pub, calls |

Below 25 → warning toast; at 0 → negative moodlet and action penalties (falls asleep, etc.).

### 4.3 Mood
`mood = weighted average of needs + sum(moodlets)`. Bands: Miserable / Low / Fine / Happy / Buzzing. Mood multiplies wages (0.7× → 1.3×). Moodlets: `"Got rained on" -10 (2h)`, `"Meal deal win" +5`, `"Heating's off" -15`, `"Tube strike" -10`, `"Sunny day!" +20`.

### 4.4 Money (£, stored as integer pence)
- Start: **£400**, box room in Zone 4 flatshare.
- **Rent weekly** (Sunday 00:00 game time), plus **bills**: energy (heating on/off toggle — our version of NEPA), council tax, phone.
- Miss rent twice → eviction warning → moved to sofa-surfing.
- Overdraft up to £200 with daily interest instead of loans.

### 4.5 Jobs & hustles
Phone → **Jobs** app. Each job: hours, location, pay/hr, required skill, energy cost.
| Job | Venue | Pay/hr | Skill |
|---|---|---|---|
| Barista | Coffee shop, Shoreditch | £11.50 | — |
| Delivery rider | Anywhere (moves you) | £10–16 per drop | Fitness |
| Retail assistant | Oxford Street | £11.50 | Charisma |
| Cleaner | Canary Wharf offices | £12.60 | — |
| Junior developer | Old Street startup | £18 | Coding 3 |
| Bartender | Camden pub | £12 + tips | Charisma 2 |
| Barber | Peckham | £14 | Style 2 |
| Busker | Tube station | random tips | Music |

Hustles (one-off): sell on resale app, tutor, DJ a party, content creation (followers → £).

### 4.6 Skills (0–10, XP through use)
Coding, Cooking, Charisma, Fitness, Music, Comedy, Style, Hustle, Photography.

### 4.7 Home & Buy mode
- Isometric tile grid (box room 5×5, studio 7×7, 1-bed 9×9, Zone 1 penthouse 12×12).
- Items: `{ id, name, category, footprint:[w,h] | "wall", price, tier 1–4, colours[], effects }`. Effects restore needs faster (better bed = faster energy).
- Place / rotate / sell back at 50%.
- Categories: Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Plants, Tech, Luxury.
- London price curve: IKEA-style chair £15 → Chesterfield sofa £1,800 → smart heating £450.

### 4.8 Moving up
Houses app: box room Zone 4 (£180/wk) → studio Zone 3 (£320/wk) → 1-bed Zone 2 (£450/wk) → Zone 1 penthouse (£1,500/wk) → Hampstead house (buy, £2m). Housing is the long-term goal and status symbol.

### 4.9 Travel
Map → tap a venue → choose: **Tube** (Oyster balance, by zone, 1–3 game min per stop, random "minor delays"), **Bus** (cheaper, slower), **Walk** (free, slow), **Uber-style ride** (expensive, fast). Travel deducts energy/time; short travel animation, not a full drive.

### 4.10 Wishes & aspirations
3 rotating wishes (e.g. "Get a meal deal", "Visit Camden", "Earn £100 today") with £ rewards. Aspirations at creation: Tech founder, Influencer, Property ladder, Party animal, Artist.

### 4.11 Social & multiplayer
- **Presence:** each venue = one Realtime channel (sharded `venue:camden:1`, `:2` … at 50 players). You see other players walking, their name tag and outfit.
- **Interactions:** wave, chat (bubbles + chat log), compliment, gift (server RPC), add friend, invite to home.
- **Visit homes:** read-only view of another player's room layout.
- **Rich list** (Phone → "The Times Rich List" parody): top net worth.
- **Mayor of London election** (later phase): weekly vote; winner picks one city policy (e.g. "Free Tube Fridays", "Rent cap", "Pub hours extended").

### 4.12 Daily loop
Server cron publishes daily: weather, satirical headline ("Northern line shuts for 3rd weekend running"), tip. Daily hidden-item hunt in one venue, shared counter.

---

## 5. London content

### Districts (map)
Zone 1: Soho, Covent Garden, Oxford Street, The City, South Bank · East: Shoreditch, Hackney, Canary Wharf, Stratford · North: Camden, Kentish Town, Mill Hill · South: Brixton, Peckham, Clapham · West: Notting Hill, Shepherd's Bush. River Thames splits north/south (like the lagoon does in Lagos Life).

### Landmark venues (v1 = first 8)
1. **Your flat** (home)
2. **Camden Market** — food stalls, buying clothes, live music
3. **Shoreditch coffee shop** — barista job, freelancers, socialise
4. **Brixton Village** — food, nightlife
5. **Canary Wharf** — office jobs, cleaner job
6. **Hyde Park** — fun, fitness, sunbathing when sunny
7. **The local pub** — social, bartender job, pub quiz
8. **Tube station** — travel hub, busking
Later: Peckham barbershop, British Library, O2 Arena gig, Notting Hill Carnival event, Wembley, Borough Market, a gym, a uni campus.

### Local flavour (the jokes)
Meal deal (£3.85), Oyster card top-ups, "minor delays on the Central line", rain moodlet, heating bill dread, a landlord who never fixes the boiler, flatmates who steal your milk, Sunday roast, chicken shop after the pub, queuing, Pret-style coffee subscription, council tax letter.

> **Brand rule:** use **parody names** for real companies (e.g. "Tesko", "Prêt-à-Manger" → "Pret-a-Go", "Nandoz", "TfL" → "TFL" style unbranded roundels with no logo). Never use real logos. Real *places* (Camden, Brixton) are fine.

---

## 6. Data model (Supabase / Postgres)

```sql
-- profiles: 1 per auth user
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  created_at timestamptz default now()
);

create table sims (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles(id) on delete cascade,
  name text not null,
  appearance jsonb not null,          -- {body, skin, hair, hairColor, top, bottom, shoes, style}
  traits text[] not null default '{}',
  aspiration text not null,
  balance_pence bigint not null default 40000,   -- ONLY changed by rpc functions
  home_id text not null default 'boxroom_z4',
  needs jsonb not null,               -- last checkpoint {hunger, energy, hygiene, bladder, fun, social}
  skills jsonb not null default '{}',
  location text not null default 'home',
  game_time bigint not null default 0,
  updated_at timestamptz default now()
);

create table catalogue_items (           -- seeded from /data/catalogue.json
  id text primary key, name text, category text,
  footprint int[] , wall boolean default false,
  price_pence int, tier int, effects jsonb
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  sim_id uuid references sims(id) on delete cascade,
  item_id text references catalogue_items(id),
  placed boolean default false, x int, y int, rotation int default 0, colour text
);

create table transactions (
  id bigserial primary key,
  sim_id uuid references sims(id) on delete cascade,
  amount_pence bigint not null,        -- +income / -spend
  kind text not null,                  -- wage | rent | purchase | sale | gift | travel | bill | reward
  ref text, created_at timestamptz default now()
);

create table relationships (
  a uuid references sims(id), b uuid references sims(id),
  score int default 0, kind text default 'acquaintance',
  primary key (a, b)
);

create table daily (
  day date primary key, weather text, headline text, tip text
);
```

**RLS:** users can `select` their own sims/inventory/transactions; *no* direct `update` on `balance_pence`. All writes go through `security definer` RPCs: `buy_item`, `sell_item`, `place_item`, `finish_shift`, `pay_bills`, `travel`, `send_gift`, `checkpoint_needs`. Each RPC validates (enough money? shift length plausible? cooldowns?) and writes a `transactions` row in the same statement.

---

## 7. Folder structure

```
/app
  /(marketing)/page.tsx          landing + "Play free" button
  /(game)/play/page.tsx          game shell (client component)
  /api/                          only if an RPC can't do it
  manifest.ts
/components
  /canvas  GameCanvas, RoomScene, CityScene, Character, Furniture, GridHelper
  /hud     TopBar, NeedsPanel, GoalCards, BottomNav, Toasts
  /phone   PhoneOverlay, apps/{Jobs,Houses,Map,Bank,Messages,Friends,RichList,Settings}.tsx
  /buy     BuyMode, CatalogueGrid, PlacementGhost
  /create  CharacterCreator
/lib
  /sim     clock.ts, needs.ts, mood.ts, actions.ts, wishes.ts, constants.ts  (pure TS, unit-tested)
  /store   useGame.ts, useUi.ts, usePresence.ts
  /net     supabase.ts, rpc.ts, realtime.ts
/data      catalogue.json, jobs.json, venues.json, homes.json, headlines.json
/public/models  furniture/*.glb, city/*.glb, chars/*.glb
/supabase  migrations/*.sql, seed.sql
```

---

## 8. Visual & UX direction
- Isometric orthographic camera, ~35° tilt, drag to rotate 90° steps, pinch/scroll zoom.
- Soft, warm lighting; grey-blue London sky; rain particles on rainy days; wet-road sheen at night.
- HUD mirrors Lagos Life's proven layout: **top bar** (day · time · mood · online count · £ balance), **needs panel** bottom-left with avatar, **bottom nav** Home · Buy · Map · Phone.
- Mobile-first: design at 390×844, then scale up. Everything thumb-reachable.
- Font: one rounded sans (e.g. Inter or Plus Jakarta Sans). Currency always `£1,234.56`.

---

## 9. Build phases (do in order)

**Phase 0 — Setup (½ day)**
Next.js + TS strict + Tailwind + R3F + drei + Zustand + Supabase client. ESLint/Prettier. Env vars. Deploy hello-world to Vercel.

**Phase 1 — Room & character (2 days)**
Iso camera, 5×5 tile room with walls, one recoloured character that walks to a clicked tile (grid A* pathfinding), idle/walk animations. Load 6 furniture glbs.

**Phase 2 — Simulation core (2 days)**
`lib/sim`: clock, needs decay, mood, action queue. Interact with furniture → action (sleep/eat/shower/toilet/TV) restores needs over time. HUD top bar + needs panel. Unit tests for `lib/sim`.

**Phase 3 — Accounts & persistence (1 day)**
Supabase anonymous auth, character creator, `sims` row, checkpoint needs every 30s, reload restores state.

**Phase 4 — Economy (2 days)**
Catalogue + Buy mode (place/rotate/sell), RPCs for money, weekly rent + bills cron, transactions ledger, Bank app.

**Phase 5 — Jobs & skills (1–2 days)**
Jobs app, go-to-work (Sim leaves, timer, returns with wages via `finish_shift`), skill XP.

**Phase 6 — City map & travel (2–3 days)**
City scene with Thames + 8 venues, Map nav, Tube/bus/walk travel with costs, venue scenes (reuse room renderer with different layouts).

**Phase 7 — Multiplayer (2–3 days)**
Realtime channel per venue: presence list, broadcast position at 5–10 Hz with interpolation, name tags, chat bubbles, wave/compliment, add friend, gifts via RPC, online counter.

**Phase 8 — Retention & polish (ongoing)**
Wishes, moodlets, daily headline/weather/hunt, houses/moving, rich list, PWA install prompt, sound, onboarding tour, share-to-TikTok screenshot button.

**Phase 9 — Later**
Mayor election, player businesses, billboards/ads, more cities.

---

## 10. Definition of done for v1 (public launch)
- New player playing within 30s on a mid-range Android phone.
- 60fps on desktop, ≥30fps on mid-range phone in the city with 30 players visible.
- All six needs, 4 jobs, 40 catalogue items, 8 venues, weekly rent.
- Multiplayer presence + chat working in every venue.
- No way to change balance from the client (verified by trying in devtools).
- Initial JS < 400KB gzipped; models lazy-loaded per scene; total first load < 5MB.

---

## 11. Cursor working rules
1. TypeScript strict, no `any`. Pure simulation logic lives in `lib/sim` with no React imports.
2. Game constants (decay rates, prices, wages) live in `lib/sim/constants.ts` or `/data/*.json`, never inline.
3. Money is always integer pence. Format only at render.
4. Every Supabase table gets RLS in its migration. Money changes only inside RPCs.
5. Keep R3F components dumb: read from Zustand, render. No game logic inside `useFrame` except animation/interpolation.
6. Lazy-load each scene's models with `useGLTF.preload` on hover/approach.
7. Small commits per phase step; update this file's checklist when a phase is done.
8. Don't copy Lagos Life's code, art, text or names — this is an original game.
