# London Life — Master Brief for Cursor (v2)

> **Cursor: this file supersedes `02-london-life-build-spec.md`. Read all of it before writing code. Build in the phase order in §9. Don't start a phase until the previous one runs and passes its checks. Ask before adding any dependency not listed in §6.**

This brief comes from a hands-on session playing **Lagos Life** (lagoslife.app, Oct 2026): ~1 hour of play covering onboarding, jobs, housing, cars, intercity flights, crime, court and companies, plus a technical inspection of the running app. Part A is what we saw. Part B is what we build. Part C is how we make it top notch.

---

# PART A — FINDINGS

## A1. Scale & context
- ~90–98k players online at once, ~35m visits, live less than two weeks.
- Browser game, installable PWA, mobile-first. No download.
- Already expanded to **Lagos, Abuja and Port Harcourt**, linked by flights.
- Early on, a **breach in the currency system** let hackers send players billions of in-game naira. Many of the economy systems below exist to drain that money back out. **Lesson #1 for us: the server must own the economy from day one.**

## A2. Tech stack (observed)
| Layer | What they use |
|---|---|
| App | Next.js (App Router, Turbopack), React, Tailwind |
| 3D | Three.js r186 through React Three Fiber, one full-screen WebGL2 canvas with HTML UI on top |
| Assets | Low-poly `.glb` models that look like Kenney.nl CC0 kits (city, suburban, nature, furniture), characters recoloured at runtime |
| State | One big game object persisted to `localStorage` (Zustand `persist` shape) and PUT to `/api/save` every few seconds |
| Multiplayer | **HTTP polling** (`POST /api/world` every few seconds), no WebSockets |
| Backend | Next.js `/api/*` routes behind Cloudflare |
| Other | Build-version polling forces reloads on deploy; sponsored apps and paid billboards for revenue |

**Weaknesses we will fix:** client-held save (cheatable, and the likely root of the breach), polling (laggy, expensive), cluttered phone menu.

## A3. The first five minutes (onboarding)
There's no tutorial screen. Instead, a **chain of goal cards**, each paying a small cash reward:

1. Eat something (tap the cooler) → +₦500
2. Freshen up (bucket bath) → reward
3. Get a job (Phone → Jobs) → +₦1,000
4. Buy something new (Buy mode, place an item)
5. Visit the buka (travel to a venue)
6. Make a new friend (tap a real player)
7. Work a shift

Each goal teaches exactly one system. By goal 6 the player has used needs, objects, jobs, buy mode, the map, travel, venues and multiplayer. **This is the single most important pattern to copy.**

## A4. Core sim
- **Six needs:** hunger, energy, hygiene, bladder, fun, social. Six small bars plus avatar in the bottom-left.
- **Mood** bands (Happy, Very Happy…) shown in the top bar; mood affects pay.
- **Objects have action menus.** Tap the cooler → "Soak Garri & Sugar (5s, free, +Hunger)", "Drink Zobo (+Hunger +Fun)". Every action shows **duration, cost and which needs it moves**.
- **Pantry** of local ingredients; cooking uses them; groceries via a delivery app.
- Action queue, free will, day/night, weather, power cuts (NEPA).
- Daily satirical headline, daily gem hunt with a global counter.

## A5. Home & Buy mode
- Isometric tile grid; items have footprints (1×1, 2×1, 3×1, wall, yard).
- Placement: ghost preview, 4-way nudge pad, rotate, Place/Cancel. Arrow keys, R and Enter also work.
- Catalogue tabs: Design, Sleep, Kitchen, Bath, Comfort, Fun, Skills, Light, Decor, Pets, **Luxury**.
- Price range is huge: ₦500 plastic chair → ₦250m Diamond-Studded Throne → ₦400m painting → ₦500m gold vault → ₦750m helicopter → ₦1.2bn–9bn jets (**with weekly running costs** of ₦15m–120m).

## A6. Housing
- Homes ladder: hall of residence (₦1,200/wk) → face-me-I-face-you → self-contain → mini-flat → terrace duplex → family duplex → Ikoyi duplex → **Banana Island mansion** (₦1.5m/wk or ₦91m to buy).
- Moving in costs **2 weeks' rent + agent fee**. Buying outright removes rent; resale pays 80%.
- **Furniture moves with you.** You can own an extra home in each city.
- Bigger homes = bigger grid (6×6 → 14×14) with real rooms and walls.

## A7. Jobs, skills, courses
- ~25 careers (Tech, Banking, Music, Nursing, Law, Medicine, Civil Service, Aviation…), each with a ladder ("Intern I" → CTO), pay per 1-hour shift, days per week, and a venue.
- **Mid-level careers are locked behind skill levels** (e.g. Medicine needs Fitness 3).
- City-specific jobs (Abuja: keke rider, Wuse Market trader, Federal Secretariat).
- **Skills only grow through doing**: side projects, gigs, or **Courses** (5 lessons, 3-question quiz each, **max 2 classes per in-game day**).
- **Money cannot buy skill.** This was the main barrier after the currency breach: rich players still had to grind.

## A8. Travel (the most shareable feature)
- **In-city:** choose trek (free), keke, danfo, okada, cab, or your own car. Each has a price and speed.
- **The ride is a 3D first-person street scene** (traffic, palm trees, a danfo painted "No food for lazy man"). Skippable.
- **Intercity:** flight (economy / premium / business / first), coach, night bus, or **drive your own car** (2½ hours, can't skip, 1-in-5 chance of breakdown/checkpoint fine unless you buy travel insurance).
- **Flights:** surge pricing ("Busy ×2.1"), gate scene with the airline plane, **first-person seat with a live seatback flight map**, "bring someone along".
- Private jets and choppers are owned items with fuel costs per trip.

## A9. Venues & multiplayer
- Each venue is a small 3D room with themed spots (e.g. Amala Shitta: buka counter, Mama's kitchen, wash bowl, Whot & Ludo bench).
- Each spot opens a menu of priced actions (food, activities, mini-jobs like "Help at the Buka", skill actions like "Learn Mama's Ewedu Secret").
- **Sharding:** a venue holds ~800 players but you see **~6 at a time** in your instance. It always feels alive, never overcrowded.
- A rotating status line gives flavour ("The queue is long but it's moving", "Somebody asked for plenty pepper").
- **Tap a player →** Chat, Add as family, View CV, Hire for a job, Rob (risky), Report to police, Block, Report, plus quick social actions (Say Hello, Gist, Crack Joke 73%, Throw Shade). Bae/romance unlocks at relationship 40.
- **DMs:** private chat with quick replies in pidgin ("How far?", "I dey o"), streaks, invite, visit, send money. Message requests from strangers.
- Room chat bar: "Say something to the 6 players here…".

## A10. Cars & the wealth tax
- Showroom with ~25 cars from ₦3.5m Bajaj Boxer to ₦1.2tn Bugatti, each with a funny nickname ("Daddy's Prado", "Odogwu Box", "Third Mainland Missile").
- **"Big Man prices ×10":** once net worth is ₦1bn+, every car costs 10× list. When spending dropped my net worth below ₦1bn, prices snapped back to normal.
- Resale pays 60% of **list**, not of what you paid.
- Cars appear in your yard, can be driven anywhere, cost fuel per km and give a "Big Boy Ride" mood boost.

## A11. Crime, police & court
- Risky actions exist ("Hack an ATM" at the tech hub, needs Coding 6; "Rob" another player). I attempted the hack under-skilled and was **arrested for bank fraud**.
- Options: pay a **₦20m fine**, **sit in the cell** (6 real minutes; bail available), or **hire a lawyer** (₦7m).
- Cell = a real venue (Eko Police Division) full of other arrested players.
- **Bail hearing** (₦410k, price falls over time) → sent to the High Court with a cause list, case number and an NPC lawyer. **Escape** option (20%).
- **Player lawyers:** players in the Law career can be hired as SANs (+11% win chance) for a fee they set.
- **Public gallery:** anyone can watch player-vs-player trials (30+ scheduled).
- **EFCC:** flags sudden wealth and big unexplained transfers, and can open a file or raid. This is their anti-breach/anti-laundering system.

## A12. Companies
- Register: ₦50k registration fee + setup cost by industry (food spot ₦90k → tech startup ₦6m+) and location tier (₦ Ikorodu → ₦₦₦₦ Banana Island).
- Earns from NPC customers every evening; bills weekly (staff wages, rent, 5% tax).
- Levers: staff count, manager hire, price tier (cheap/fair/premium), upgrade kiosk → shop, generator, marketing (+20% / +35% / +60% for 1–3 nights).
- Rankings, shareable company link, news feed, sell company.

## A13. Governance & monetisation
- Elected **governor** with a term, a policy that affects everyone (e.g. transport), and announcements.
- **Real paid billboards** around the map and in airports (₦250k / 7 days).
- **Sponsored phone apps** from real Nigerian brands, marked "NEW".
- A wallet top-up "+" button and real-money "Tables" (we did not test these).

## A14. Monetisation (deep dive)
- **Billboards are paid in real money** through Flutterwave (₦ or USD), not in-game cash. ~25 named boards across Lagos (Ikeja road, Third Mainland, Lekki Toll Gate…), "MEGA" boards on premium roads, and **airport boards (₦500k / 7 days)** seen by every player who flies.
- Each digital board **rotates ads 15 s each**; the busiest carried 43 ads at once (≈₦10.75m a week from one board). Advertisers book multiple weeks ahead (slots sold into January).
- Advertisers are **real local businesses** (salons, food banks, apps) with real phone numbers and WhatsApp/Instagram links. Players tap the board to visit the link.
- Self-serve flow: upload a 2:1 image + link + dates → pay → **live instantly**. Policy: no scams, adult content, crypto/tokens, account selling, or impersonating the game; **taken down without refund**. A public `/advertise` page lets businesses buy without an account.
- **"Sea Plots"** (₦500 per plot, 7 days): cheap user-generated image tiles on the lagoon.
- **Sponsored phone apps** from real brands, and a "Top up wallet" button (real money → in-game cash).

## A15. Economy depth (deep dive)
- **Bank:** savings 0.5% / week (interest only on the first ₦1bn), **bonds 2% locked for 7 real days**, max ₦500m in bonds.
- **Progressive income tax**, weekly: first ₦1m free, then 20% / 30% / 35%; job wages and business income taxed separately; gifts, sales and bets untaxed.
- **Receipts** for every venue visit and a **money history with a reason on every line** ("Bought Mansion −₦91m", "Lawyer's fee −₦400k", "Transfer from @j4didiah +₦1.0bn ✓").
- Starting money: ₦36k cash + a **₦60k LAPO microloan** (debt from minute one) + ₦1m welcome gift.
- **Invest:** land plots (₦2.5m–₦1.5bn) growing 1.9–5% a week; cheap land carries **"omo-onile" (land-grabber) risk**, titled land is safe. Passive businesses (₦1.5m data kiosk → ₦2.5bn club share) pay every evening; **resale is ~6% of the purchase price**. Haulage trucks earn daily but break down.
- The **VIP ×10 multiplier** applies to land and businesses as well as cars.
- **Big purchases happen in one tap, no confirmation** (₦40m land plot). Don't copy this.

## A16. Politics (deep dive)
- Offices: **Governor, Senator, President**. Governor appoints a cabinet of player commissioners (Finance, Works, Transport).
- Weekly election, 200+ candidates, ₦50k fee to run, ₦25k/day allowance, one city-wide policy (e.g. half-price danfo).
- Candidates openly **vote-buy** ("Free 50 billion to everyone who votes for me").
- **Anti-Sybil rules:** account must be **3 days old to vote**, 1 day old to run; votes are cast **in person at a Polling Unit venue** with accreditation and a live count.

## A17. Security observations (from a normal player's view)
- **Rich list shows the top 50+ all at exactly ₦5.0bn**: there is a hard wealth cap, almost certainly a post-breach clamp.
- **Obvious alt accounts** in the top ranks (three near-identical usernames), so multi-accounting is a live problem.
- ~9,000 of 30,600 ranked players hold over ₦1.6bn: the breach money is still circulating.
- Countermeasures they've added: ×10 wealth pricing, skills not purchasable, weekly tax, running costs, a pending/approval step on transfers (`/api/wallet/pending`, "In your wallet ✓"), an **EFCC system** that flags sudden wealth, account-age gates on voting.
- **Account security:** password change, log out all devices, "Someone stole my account → Lock it". **No 2FA.** Email optional and unchangeable.
- The client still holds the full save in `localStorage` and uploads it, which is the most likely root cause of the original breach.

## A18. What made it feel great
1. Every screen has a **joke only locals get**.
2. **Everything has a price, a duration and a visible effect.** You always know what a tap will do.
3. **Constant small rewards** (goal cash, mood bumps, toasts).
4. **Travel is a moment**, not a loading screen.
5. **Other people are always visible**, and every system has a social hook (lawyers, court gallery, governor, company rankings).
6. **Money sinks everywhere** keep the economy alive.

---

# PART B — WHAT WE BUILD: LONDON LIFE

## B1. Pitch
You arrive in London with £400 and a box room in a Zone 4 flatshare. Rent is weekly, the heating costs money, the Tube eats your Oyster balance, and it's always about to rain. Work shifts, level up, decorate, move postcodes, start a company, and meet real people at Camden, Brixton, Shoreditch and Canary Wharf.

**Pillars:** recognisably London · zero friction · real people everywhere · fair, server-owned economy · every action is a little moment.

## B2. Direct translation table
| Lagos Life | London Life |
|---|---|
| ₦ naira, rich numbers | **£ pounds**, stored as integer **pence** |
| NEPA power cuts | **Heating bill dread** + boiler breaks (landlord ignores you) |
| Danfo / keke / okada / cab | **Tube / bus / Santander-style hire bike / black cab / Uber-style ride** |
| Danfo ride scene | **Tube carriage scene** (doors, "Mind the gap", standing room), **night bus top deck** |
| Lagos ↔ Abuja ↔ PH flights | **London ↔ Manchester ↔ Edinburgh** (train with first class), later **Eurostar to Paris** |
| Drive intercity risk | **Rail replacement bus / strikes / delays**; driving has congestion charge + ULEZ |
| Amala Shitta | **Pie & mash shop / chicken shop / Borough Market** |
| Quilox | **A Shoreditch club** (parody name) |
| CcHub | **Old Street tech hub** (parody name) |
| Banana Island mansion | **Hampstead / Kensington townhouse**; penthouse at Canary Wharf |
| Face-me-I-face-you | **Box room in a 6-person HMO** |
| Big Man ×10 | **"Mayfair prices" ×10** above £10m net worth |
| EFCC | **HMRC + "the FCA"** parody: audits sudden wealth |
| Eko Police / Igbosere court | **Met station custody suite / Old Bailey-style crown court** |
| Governor | **Mayor of London**, policies like "Free Tube Fridays", "Rent cap" |
| Pidgin quick replies | London slang quick replies: "You good?", "Wagwan", "Innit", "Cheers mate" |
| Garri & zobo | **Meal deal, beans on toast, Greggs-style sausage roll** |

**Brand rule:** parody names for every real company, no real logos. Real places (Camden, Brixton) are fine.

## B3. Systems to build (with London numbers)

### Time
1 real second = 1 game minute (1 game day = 24 real minutes). Speeds 1×/2×/3× at home only. Weather per day from server; rain most days.

### Needs, mood, objects
Same six needs as A4. Every object has an **action menu** with `{label, durationSec, costPence, effects{need:+n}, skillXp?, requires?}`. Mood multiplies wages 0.7×–1.3×. Moodlets: "Got rained on" −10, "Meal deal win" +5, "Heating's off" −15, "Tube strike" −10, "Sunny day!" +20.

### Onboarding goal chain (copy A3 exactly)
Eat → Shower → Get a job → Buy & place an item → Travel to a venue → Say hello to a real player → Work a shift → Pay rent. Each pays £5–£20 and highlights the exact UI to tap.

### Money & housing
- Start **£400**, box room Zone 4 (£180/wk).
- Ladder: HMO box room → studio Z3 → 1-bed Z2 → 2-bed Z1 → Canary Wharf penthouse → Kensington townhouse (£12m to buy).
- Move-in: 4 weeks' deposit + 1 week rent. Buy outright → no rent, resale 80%.
- Weekly bills: rent, energy (heating toggle), council tax, phone.
- Overdraft to −£200 with daily interest; two missed rents → eviction warning.

### Jobs & skills
~15 careers (barista, delivery rider, retail, cleaner, junior dev, bartender, barber, nurse, teacher, estate agent, lawyer, doctor, civil servant, DJ, content creator). Ladders, per-shift pay, skill gates for mid-level. Skills: Coding, Cooking, Charisma, Fitness, Music, Comedy, Style, Hustle, Photography.
**Skills cannot be bought.** Courses: 5 lessons + quiz, **max 2/day**.

### Travel
- In-city: walk / bus (£1.75) / Tube (zone-based) / hire bike / cab / own car (fuel + congestion charge).
- **3D travel scenes**: Tube carriage (first-person), bus top deck, cab back seat. Skippable in-city.
- Intercity by train (standard / first class) with a seat view and live route map; random "delays" event; not skippable on long routes unless you pay more.
- Surge pricing at busy times. Insurance on risky routes.

### Venues (v1 = 8)
Your flat · Camden Market · Shoreditch coffee shop/tech hub · Brixton Village · Canary Wharf · Hyde Park · The local pub · Tube station.
Each: 3–5 spots, each spot 3–6 priced actions, a rotating flavour line, ~6 visible players per instance.

### Social
Tap player → Chat, Add friend, View CV, Hire, Report, Block, quick actions (Say hello, Banter, Tell joke [% success], Throw shade). DMs with quick replies, message requests, streaks, invite/visit, send money (rate-limited). Room chat. Relationship score unlocks dating at 40.

### Cars & luxury
Car showroom with ~20 cars (parody makes), nicknames ("The Uber Prius", "Chelsea Tractor", "Mayfair Missile"). Luxury tab with yacht, chopper, jets (weekly costs). **Wealth tax ×10 above £10m net worth.** Resale 60% of list.

### Companies (phase 7)
Register £100 + setup by industry and borough tier. Evening NPC revenue, weekly wages/bills/tax, price tier, marketing boosts, upgrade path, rankings.

### Crime & justice (phase 8, optional)
Risky skill-gated actions → chance of arrest → fine / custody (timed, bail falls over time) / lawyer → court venue with case number, player lawyers, public gallery. Keep it comedic, no violence.

### Governance (phase 8)
Weekly Mayor election, one city-wide policy per term.

## B4. Economy rules (anti-breach, non-negotiable)
1. **The server is the only thing that changes money, inventory, skills or jobs.** The client sends *intents* (`buyItem(id)`), never results.
2. Every money change is one row in `transactions` with a `kind` and a `ref`. Balance = sum of transactions (cached, reconciled nightly).
3. **Rate limits** on transfers between players; transfers above a threshold are held and flagged ("HMRC review").
4. **Sudden-wealth detector**: nightly job flags accounts whose net worth jumped abnormally; admin dashboard to claw back.
5. **Money sinks** at every tier: rent, bills, fuel, running costs on luxury items, company wages, wealth tax, fines.
6. **Skills and career levels can never be bought.**
7. All tunable numbers live in `/data/*.json` or a `config` table so we can rebalance without a deploy.

## B5. Security plan (learned from their breach)
| Threat | What happened to them | What we do |
|---|---|---|
| Forged money | Client-held save → billions minted | Server-only balances; RPC intents; ledger is the source of truth; nightly reconciliation job that alerts on any mismatch |
| Money laundering via transfers | Billions moved between players | Daily send limits scaled by account age and verified status; transfers over £X held for review (`pending` state); recipient sees "pending" until cleared |
| Alt accounts / Sybil | Near-identical usernames in the top 50 | Device + IP fingerprint heuristics, account-age gates on transfers, voting and leaderboard eligibility; email or phone verification to unlock trading |
| Vote buying / election farming | Alts and cash-for-votes | Vote only after 3 days + verified; in-person venue voting; cap transfers in election week |
| Inflation after an incident | Hard cap at ₦5bn, ×10 prices | Build an **incident kill switch** from day one: freeze transfers, snapshot balances, roll back by ledger id, admin clawback tool |
| Account theft | Password only, no 2FA | Passkeys or email magic link + optional TOTP 2FA; "lock my account"; new-device email alerts; session list |
| API abuse | — | Rate limits per user and IP on every RPC; idempotency keys on purchases; server-side cooldowns for actions |
| Ad abuse | Moderation after the fact | Ads go to a review queue (auto-scan + human approve) before going live; link allowlist checks; report button on every board |

Plus: weekly **economy health report** (money created vs destroyed, top 1% share, sudden-wealth flags) and an **admin dashboard** from phase 4.

## B6. Monetisation plan (London)
1. **Billboard ads** (real money via Stripe, £ only): named boards (Piccadilly-style circus board, Old Street roundabout, Westfield, Heathrow arrivals), 15-second rotation, self-serve booking page, review queue before live, 7-day slots, premium "MEGA" boards. This is how you sell to the same small London businesses your freelance outreach already targets.
2. **Sponsored venues / phone apps** for local brands (clearly labelled).
3. **Cosmetic-only purchases** (outfits, home styles, car paint). **Never sell in-game cash or skills**: selling cash is what makes a currency breach catastrophic and attracts gambling regulation.
4. No real-money gambling, no crypto.
5. Big in-game purchases need a confirm step showing the price and the new balance.

---

# PART C — HOW TO MAKE IT TOP NOTCH

## C1. Architecture
```
Browser (Next.js page, client component)
├── <GameCanvas> R3F: RoomScene · CityScene · TravelScene · Characters
├── <Hud> top bar · needs · goals · toasts · bottom nav (Home/Buy/Map/Phone)
├── <Phone> app grid → panels (keep it to ≤16 apps in v1)
├── lib/sim   pure TS, deterministic, unit-tested (no React, no network)
├── lib/store Zustand: game (server mirror), ui, presence
└── lib/net   Supabase client, RPC wrappers, realtime channels

Supabase
├── Auth: anonymous → upgrade to email/Google
├── Postgres + RLS; money changes ONLY via security-definer RPCs
├── Realtime: one channel per venue instance (Presence + Broadcast)
├── pg_cron: rent, bills, company payouts, daily headline, wealth checks
└── Storage: user-uploaded ad images (moderated)
```

### Multiplayer
- Instance id = `venue:{id}:{shard}`. Join the least-full shard with friends first; cap ~8 visible.
- Broadcast position at 5 Hz; interpolate with 100 ms buffer; idle players send nothing.
- Presence payload: `{simId, name, look, spot, action}`. Chat via Broadcast, persisted to `messages` for DMs only.

## C2. Data model (additions to v1)
```sql
-- core from v1: profiles, sims, catalogue_items, inventory, transactions, relationships, daily
create table homes_owned (sim_id uuid, home_id text, city text, owned boolean, weekly_rent_pence int, primary key (sim_id, home_id));
create table vehicles (id uuid primary key default gen_random_uuid(), sim_id uuid, model_id text, active boolean default false);
create table jobs (sim_id uuid primary key, career text, level int, shifts_done int, last_shift timestamptz);
create table skills (sim_id uuid, skill text, xp numeric, primary key (sim_id, skill));
create table course_progress (sim_id uuid, course text, lessons_done int, classes_today int, day date, primary key (sim_id, course));
create table companies (id uuid primary key default gen_random_uuid(), owner uuid, name text, industry text, borough text, tier int, staff int, price_tier text, upgrades jsonb, value_pence bigint);
create table messages (id bigserial primary key, from_sim uuid, to_sim uuid, body text check (char_length(body) <= 500), created_at timestamptz default now(), read boolean default false);
create table cases (id text primary key, sim_id uuid, charge text, status text, hearing_at timestamptz, lawyer_sim uuid, outcome text);
create table flags (id bigserial primary key, sim_id uuid, kind text, detail jsonb, created_at timestamptz default now(), resolved boolean default false);
create table config (key text primary key, value jsonb);   -- prices, rates, multipliers
```
RLS on every table. RPCs: `buy_item, place_item, sell_item, move_home, buy_home, buy_vehicle, start_shift, finish_shift, take_class, travel, send_message, send_money, register_company, company_action, attempt_risky_action, pay_bail, hire_lawyer`.

## C3. Quality bar ("top notch" checklist)

**Feel & polish**
- Every tap gets feedback within 100 ms (press state, sound, haptic on mobile).
- Every action shows duration, cost and effect *before* you tap.
- Toasts for every reward and every money change ("−£2.80 Tube fare").
- Characters animate for every action (eat, sleep, shower, type, dance, sit); no T-poses, no sliding.
- Travel scenes have sound, light and one visual joke each.
- Day/night lighting, rain particles, wet streets at night, warm interior lights.

**Performance budgets**
- First playable ≤ 30 s on a mid-range Android over 4G.
- Initial JS ≤ 400 KB gzipped; each scene's models lazy-loaded; total first load ≤ 5 MB.
- 60 fps desktop, ≥ 30 fps mid-range phone with 8 players in view.
- Models compressed (`gltf-transform` + Draco/Meshopt), textures ≤ 1024 px, instancing for repeated props.
- A "Saver mode" for slow networks (they have one).

**Reliability**
- Optimistic UI only for cosmetic changes; money waits for the server.
- Reconnect logic for realtime; offline banner; resume where you left off.
- Version check → soft "update ready" banner, never a hard reload mid-action.

**Safety & moderation**
- Profanity filter on names and chat, report/block on every player card, message requests from strangers, rate-limited DMs and transfers.
- Age gate and no real-money gambling.
- Admin dashboard: flags, clawback, ban, broadcast announcement.

**Testing**
- Unit tests for everything in `lib/sim` and every RPC (Vitest + pgTAP or SQL tests).
- An "economy simulator" script that runs 1,000 bot players for 30 game days and reports wealth distribution. Run it before every balance change.
- Playwright smoke test: new player → completes onboarding chain.
- Try to cheat it yourself: edit localStorage, replay requests, spam RPCs. Nothing should change money.

**Content & tone**
- Write every flavour line like a Londoner would say it. Aim for 3 rotating lines per venue and a daily headline pool of 100+.
- Every item, car and job gets a joke name or description.

## C4. Visual direction
- Isometric orthographic camera, 90° rotation steps, pinch zoom.
- London palette: brick red, slate grey, wet-asphalt blue, bus red, park green, warm window yellow.
- HUD layout copied from Lagos Life's proven structure: top bar (day · time · mood · online · £), goals top-left, needs bottom-left, nav bottom-centre.
- One rounded sans font; currency always `£1,234.56`.

---

## 9. Build phases

| # | Phase | Done when |
|---|---|---|
| 0 | Setup: Next.js + TS strict + Tailwind + R3F + drei + Zustand + Supabase, deploy to Vercel | Hello-world live |
| 1 | Room + character + click-to-walk (A*) + 8 furniture models | Sim walks around a 5×5 room on mobile at 30 fps |
| 2 | `lib/sim`: clock, needs, mood, object action menus, HUD | All six needs restorable; unit tests pass |
| 3 | Auth + character creator + server save + **onboarding goal chain** | New player completes goals 1–2 |
| 4 | Economy RPCs, Buy mode, catalogue (40 items), rent/bills cron, Bank app | Can't change money from devtools |
| 5 | Jobs, skills, courses (2/day cap) | Goals 3 and 7 complete; Medicine-style gate works |
| 6 | City map, 8 venues with spots/actions, in-city travel + Tube scene | Goal 5 complete; travel scene skippable |
| 7 | Multiplayer: sharded venue instances, presence, chat, player card, DMs, friends | Goal 6 complete with two real browsers |
| 8 | Housing ladder, cars, luxury, wealth tax, companies | Economy simulator shows healthy distribution |
| 9 | Intercity (Manchester), crime/court, Mayor election, billboards | — |
| 10 | Polish pass against §C3, PWA install, share buttons, launch | All budgets met |

## 10. Cursor working rules
1. TypeScript strict, no `any`. `lib/sim` has no React or network imports.
2. Constants live in `/data/*.json` or the `config` table, never inline.
3. Money is integer pence; format only at render.
4. Every table has RLS in its migration. Money moves only inside RPCs that also write `transactions`.
5. R3F components read from stores and render; no game logic in `useFrame` except animation/interpolation.
6. Lazy-load each scene; preload the next likely scene.
7. Small commits per step; tick the phase table above when a phase is done.
8. **Do not copy Lagos Life's code, art, text or names.** We copy patterns, not content.
