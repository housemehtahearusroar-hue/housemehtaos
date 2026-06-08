# Aura — Agentic Family Mirror

Smart mirror dashboard for the Mehta family. Left panel shows live family data; right panel is Aura, your voice co-pilot.

## Stack

- **Next.js 16** (App Router) on Vercel
- **Supabase** — Postgres, Realtime (`postgres_changes` → browser), pgvector memory graph
- **Gemini** — intent routing, tool calling, embeddings (server-only)
- **Google Calendar / Maps** — server-only credentials via ToolExecutors
- **Bland.ai** — outbound voice booking (server-only)
- **Web Speech API** — "Hey Aura" hotword + STT (Porcupine optional)

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase + Google AI keys (minimum for local dev)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase env vars, the app runs with seeded mock data.

## Supabase setup

1. Create a Supabase project
2. Run migrations in order via SQL editor:
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_memory_rpc.sql`
3. Enable Realtime on dashboard tables (done in migration)
4. Copy URL + anon key + service role key to `.env.local`

## Environment variables

See [`.env.example`](.env.example). Sensitive keys (`GOOGLE_CALENDAR_*`, `BLAND_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are **server-only** — never exposed to the browser.

## Google Calendar OAuth

```bash
GOOGLE_CALENDAR_CLIENT_ID=... GOOGLE_CALENDAR_CLIENT_SECRET=... npx tsx scripts/google-oauth.ts
```

## Porcupine wake word (optional)

1. Train "Hey Aura" at [Picovoice Console](https://console.picovoice.ai/)
2. Download `.ppn` → `public/wake-word/hey-aura.ppn`
3. Set `NEXT_PUBLIC_PICOVOICE_ACCESS_KEY`

Falls back to Web Speech API hotword detection without Porcupine.

## Kiosk mode (Chromium)

```bash
chromium --kiosk --autoplay-policy=no-user-gesture-required http://localhost:3000
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel
3. Add all env vars from `.env.example`
4. Cron job syncs Google Calendar once daily at 6:00 UTC (`vercel.json`). Hobby plan allows max one run per day; upgrade to Pro for more frequent sync.

## Architecture

```
Browser → /api/aura → MemoryRetrieval (pgvector) → Gemini → ToolExecutors
                                                          ├─ Supabase CRUD
                                                          ├─ Google Calendar
                                                          └─ Bland.ai
Supabase Realtime → postgres_changes → browser widgets
```
