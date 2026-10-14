# London Life

A browser life sim set in London. Make a Londoner, move into a box room in Zone 4, find a job, keep your needs up, pay the rent, and work your way up the property ladder. Everything runs in the browser: an isometric home and city in three.js, a phone for your bank, jobs and friends, and Tube, bus and cab rides across town.

Built with Next.js 15 (App Router), react-three-fiber, Zustand and Supabase.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase keys the game runs offline and keeps its save in `localStorage`.

To set up the database, link the Supabase CLI to your project and push the migrations in `supabase/migrations`:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

In the Supabase dashboard, turn on **Anonymous sign-ins** (guests play without an account) and turn off **Confirm email** (usernames sign in with a synthetic email).

```bash
npm test     # unit tests for the sim, content, sandbox and chain batching
npm run lint
```

## How it works

- **The server is the authority.** Every action that costs or pays money is a Postgres function (`security definer`, RLS on every table). The client asks; the database charges, pays and writes a row to `transactions`.
- **The client is a view.** Zustand holds the state the server sent back, plus the needs and clock that tick locally between checkpoints.
- **Players message the people they meet.** Sharing a venue with another real player makes you contacts (`meet` checks you are both really there). Contacts and friends can message each other from the phone's Chat app, from anywhere. Messages go through `send_message` / `get_thread`, and Supabase Realtime pushes each new one to its recipient (`supabase/migrations/011_messages.sql`, `lib/net/messages.ts`).

## Monad

Every payment in the game settles on **Monad testnet** as a public receipt. Players never see a wallet, a seed phrase or a token. The database stays the source of truth; the chain is the receipt.

How a payment gets onchain:

1. A game action writes a row to `transactions` (wage, rent, purchase, gift…). The row starts as `chain_status = 'pending'`.
2. When the balance changes, the client calls `POST /api/chain/flush` after a 2-second debounce. It sends no amounts.
3. The route (Node runtime, service role) claims up to 50 pending rows, then sends them in one `settleBatch` call to the `LondonLedger` contract from an operator key that only the server holds.
4. Once the receipt lands, the rows are marked `settled` with the transaction hash. If anything fails, they go back to `pending` and the next flush retries them. The contract skips any row id it has already settled, so a retry can't double-count.
5. The Bank app shows each row as **⏳ settling** or **On Monad ✓**, linked to the transaction on [MonadVision](https://testnet.monadvision.com).

Sims are identified onchain only by `keccak256(sim id)`: no usernames, nothing personal.

| Piece | Where |
| --- | --- |
| Contract | `contracts/LondonLedger.sol` |
| Chain config and ABI | `lib/chain/monad.ts` |
| Batch building | `lib/chain/batch.ts` (tested in `batch.test.ts`) |
| Flush route | `app/api/chain/flush/route.ts` |
| Client trigger | `lib/chain/flush.ts` |
| Database | `supabase/migrations/007_monad.sql` |

### Monad House

Monad House is a venue in East · Zone 1 where players can see the receipts. You get there like any other venue, and visiting it counts toward an optional bonus goal that comes after the 8 onboarding goals. It has three spots:

- **Departures board**: the last 20 settled payments across all players, with first names only. It refreshes every 3 seconds, and each row links to its transaction on MonadVision.
- **Receipt printer**: your last 10 settled payments.
- **Audit desk**: compares `balancePence(simKey)` on the contract with your game balance minus the payments still pending. It shows **✓ matches**, or **settling…** while payments are on their way.

Everything here only reads from the chain. Only the flush route writes.

| Piece | Where |
| --- | --- |
| Venue, regulars, bonus goal | `data/venues.json`, `data/locals.json`, `data/goals.json`, `supabase/migrations/008_monad_house.sql` |
| Departures and audit queries | `supabase/migrations/009_monad_spots.sql` |
| Audit route | `app/api/chain/audit/route.ts` |
| Audit comparison | `lib/chain/audit.ts` (tested in `audit.test.ts`) |
| Spot panels | `components/venue/SpotPanel.tsx` |

### Deploying the ledger

1. Put a fresh private key in `.env.local` as `MONAD_OPERATOR_KEY`, plus `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard.
2. Fund the operator address with testnet MON from [faucet.monad.xyz](https://faucet.monad.xyz).
3. Run `npm run deploy:ledger`. It compiles the contract, deploys it and writes `MONAD_LEDGER_ADDRESS` into `.env.local`.
4. On Vercel, set `MONAD_OPERATOR_KEY`, `MONAD_LEDGER_ADDRESS` and `SUPABASE_SERVICE_ROLE_KEY` as server environment variables (never `NEXT_PUBLIC_`), then deploy.

Network: Monad testnet, chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`.
