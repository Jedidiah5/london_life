# Lagos Life — Technical Teardown

*Studied live at lagoslife.app on 11 Oct 2026, signed in as a player. Everything marked **Observed** was seen directly in the running game (page source, network traffic, saved state, UI). Everything marked **Inferred** is a reasonable reading of that evidence, not confirmed.*

---

## 1. What the game is

A free, browser-based, Sims-style life simulator set in Lagos, installable as a PWA. You create a character, live in a small room, manage six needs, work jobs, buy furniture, travel to real Lagos landmarks, and meet other real players. It hit ~90k concurrent players and ~35m visits at the time of study.

The core loop:

1. Needs decay over time → you must eat, sleep, shower, use the toilet, have fun, socialise.
2. You work jobs / hustles to earn ₦.
3. You spend ₦ on furniture, food, clothes, houses, cars, transport.
4. Better stuff → better mood → better pay → bigger house. Repeat.
5. Layered on top: real players, a city-wide elected governor, billboards, gem hunts, daily headlines.

---

## 2. Tech stack

| Layer | Technology | Evidence |
|---|---|---|
| Framework | **Next.js (App Router)**, built with **Turbopack** | **Observed** — `/_next/static/chunks/turbopack-*.js`, `self.__next_f` RSC payloads, `next-route-announcer` |
| Language | **TypeScript / JavaScript** | **Inferred** — Next.js + modern build; `class A{static{}}` feature check for old browsers |
| UI | **React** + **Tailwind CSS** | **Observed** — Tailwind utility classes (`relative h-dvh w-full overflow-hidden bg-background`) |
| 3D engine | **Three.js r186** via **React Three Fiber** | **Observed** — `window.__THREE__ = "186"`, canvas tagged `data-engine="three.js r186"`, R3F-style canvas wrapper div |
| Rendering | **WebGL2**, one full-screen canvas, HTML UI layered over it | **Observed** |
| 3D assets | **`.glb` (glTF binary)** models, mostly low-poly kit-style | **Observed** — `/models/world/commercial/building-a.glb`, `/models/world/suburban/tree-small.glb`, `/models/world/nature/tree_palmTall.glb`, `/models/furniture/bedSingle.glb`, `/models/chars/f_casual.glb` |
| Asset source | Very likely **Kenney.nl CC0 kits** (City Kit Commercial / Suburban, Nature Kit, Furniture Kit, Pirate Kit) | **Inferred** — file and folder names match Kenney's kits exactly |
| Characters | A few base rigged bodies per style (`f_casual`, `f_smart`…), recoloured at runtime from hex values | **Observed** — character "look" stored as hex colours + style keys |
| Client state | One big game-state object, persisted to `localStorage` under `lagos-life-save` as `{state, version}` | **Observed** — that envelope shape is exactly what **Zustand's `persist` middleware** writes (**Inferred** Zustand) |
| Backend | **Next.js API route handlers** (`/api/*`), same origin | **Observed** |
| Hosting / CDN | Served through **Cloudflare** (`server: cloudflare`, `cf-ray`, LHR edge) | **Observed**. Whether origin is Vercel, Cloudflare Workers (OpenNext) or a VPS is not visible |
| Database | Unknown from the client. IDs are 20-char hex strings | **Inferred** — some server DB (Postgres/Redis/D1 are all plausible) |
| Auth | Username-based accounts, session cookie (`/api/auth/register`, `/api/auth/me`) | **Observed** |
| Real-time / multiplayer | **HTTP polling**, not WebSockets — client `POST /api/world` every few seconds | **Observed** — no WS connections; repeated `/api/world` calls returning `players`, `guests`, `inbox`, `online` |
| Version updates | Polls `/api/version` (`{build}`) and prompts reload when a new build ships | **Observed** |
| PWA | `manifest.webmanifest`, standalone display, icons, iOS fit script | **Observed** |
| Monetisation | Paid in-game **billboards** (₦250k / 7 days), **sponsored brand apps** on the in-game phone, in-game ad images | **Observed** |

**Key takeaway:** this is "just" a Next.js + React Three Fiber web app. The simulation runs in the browser; the server mostly saves state, syncs presence, and serves shared city data. No game engine, no WebSocket server, no native app.

---

## 3. Architecture (how it runs)

```
Browser (single Next.js page)
├── <Canvas>  React Three Fiber / Three.js r186
│     ├── Isometric room (tile floor, walls, placed furniture .glb)
│     ├── City map (Kenney-style buildings, roads, lagoon, billboards)
│     └── Characters (rigged .glb, recoloured)
├── HTML/Tailwind HUD overlaid on the canvas
│     ├── Top bar: day/time, mood, visits, online count, ₦ balance
│     ├── Goal cards ("Eat something"), daily gem hunt
│     ├── Needs panel (6 bars) + avatar
│     └── Bottom nav: Home · Buy · Map · Phone
└── Game store (Zustand-style, persisted to localStorage)
      └── Simulation tick: time, needs decay, rent, events, wishes

Server: Next.js /api/* route handlers behind Cloudflare
├── auth/register, auth/me        — accounts + session cookie
├── save (GET/PUT)                — cloud copy of the save, PUT every few seconds
├── world (POST, polled)          — presence: who's near you, guests, inbox, online count, economy flags
├── live, family, food-gift       — social features
├── homes                         — list of player homes (look, items, online/atHome)
├── gov, politics                 — elected governor, term, active policy, announcements
├── daily                         — daily weather + satirical headline + tip
├── hunt?at=…                     — daily gem hunt per location
├── sea, ads (+ /:id/image)       — user-uploaded sea plots / billboard ad images
├── wallet/pending, verified      — payments / verification
├── geo, origin                   — where the player is from
└── version                       — current build id
```

### Save model (Observed)
The full sim state lives client-side and is periodically `PUT` to `/api/save`. Top-level shape of `game`:

- **Character:** `sim { name, appearance { body, skin, hair, hairColor, outfit, style, top, bottom }, traits[2], aspiration }`
- **Needs:** `hunger, energy, hygiene, bladder, fun, social` + `warned` flags per need
- **Mood:** `moodlets[] { label, emoji, value, desc, expiresAt }`
- **Money:** `money`, `ledger[]` (transactions), `loan { owed, weekly, lastPaidDay }`, `rentOwed`, `lastRentDay`, `rentCut`
- **Home:** `home`, `objects[] { uid, type, x, y }` (grid placement), `layoutV`
- **Pantry:** `rice, garri, indomie, plantain, egg, bread, oil, maggi, gino, sugar, zobo`
- **Skills:** `charisma, coding, comedy, cooking, dance, fitness, hustle, music, photography` (+ `skillUsed`)
- **Work:** `job`, `work`
- **World:** `time`, `speed`, `weather`, `power` + `powerChangeAt` (NEPA cuts!), `location`, `travel`, `pos`, `path`, `queue` (action queue), `freeWill`
- **Social:** `relationships`, `romance`, `gifts`
- **Progress:** `wishes[] { title, reward, goal, progress }`, `goal`, `stats`, `tutorialStep`, `tour`
- **City:** `policy { gov, id, until }` (active governor policy affects you), `risk { carsAt, homeAt }` (theft/robbery timers)

---

## 4. Features (as seen in-game)

### Life sim core
- Six needs with decay, warnings and mood effects. Mood affects work pay.
- Action queue + "free will" (Sim acts on its own when idle).
- Day/night cycle, weather, **NEPA power cuts** that switch the room off.
- Rent due daily; loans with weekly repayments.
- Traits, aspiration, wishes with ₦ rewards, moodlets.
- Nine skills levelled through use.
- Pantry ingredients → cooking.

### Home & Buy mode
- Isometric room on a tile grid, furniture placed by footprint (1×1, 2×1, 2×2, 3×1, wall).
- Catalogue tabs: Design, Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Pets, Luxury.
- Items have star tiers, colour variants, and prices from ₦500 (plastic chair) to ₦1.5m (Lekki sectional sofa). Local flavour: rechargeable standing fan, split AC at ₦650k.

### City map
- Stylised 3D Lagos with Island/Mainland split, Lagos Lagoon, ~25 named landmarks: Afrika Shrine, Amala Shitta, CcHub, Freedom Park, Quilox, The Palms, Eko Hotels, UNILAG, Jibowu Park, Mako, Canopy Walk, High Court, etc.
- Map filters: Free road, Billboards, Neighbours, Sea, Gov, Walk Yaba.
- **City switcher: Lagos · Port Harcourt · Abuja** (other cities already live/coming).
- Billboards across the map are real paid ad slots.

### Phone (the main menu system)
~45 apps, each a feature panel: Jobs, Messages, Games, Contacts, Courses, Ride, Chowdeck (food), Bank, Boutique, Forbes (rich list), Houses, Cars, Health, Invest, Assurance, LagosBet, Family, Staff, Hustle, Bus Co., Company, Shops, Lagos Gist (news), Lagos Gov, Police, Court, My Ads, Settings, plus "NEW" sponsored apps from real brands.

### Multiplayer & social
- See and visit other players' homes; gifts, food gifts, family, romance, messages.
- Live online count in the HUD.
- **Elected governor**: players vote, the winner sets a city policy (e.g. transport) that affects everyone for a term.
- Player-run businesses: companies, stores, rentals, bus companies (economy flags in `/api/world`).
- Daily gem hunt with a shared counter and cash prizes.

### Retention
- Daily headline + tip, daily weather, daily gem hunt.
- Tutorial/tour, invite links, reload-on-new-build.

---

## 5. Why it went viral (product lessons)
1. **Zero friction** — browser, no download, works on phones, username sign-up.
2. **Hyper-local jokes** — NEPA, danfo, amala, Quilox, ₦ prices that feel real. People share screenshots because they recognise their own life.
3. **Real people in it** — governor elections, visible online count, visiting homes. It's a social network wearing a game costume.
4. **Cheap, readable art** — free low-poly kits, recoloured; looks cohesive and loads fast.
5. **Ships constantly** — build polling means fixes reach 90k players in minutes.

## 6. Weak spots worth beating
- Polling every few seconds is expensive at scale and feels laggy for real-time interaction.
- Client-authoritative save (state in `localStorage`, PUT to server) is easy to cheat.
- Phone menu is crowded; discovery is hard.
