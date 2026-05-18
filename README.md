# CoBuild MVP v1

The operating system for construction labour coordination.

## What this is

A **real, runnable MVP** you can deploy in 30 minutes and put in front of builders and crew leaders this week.

It includes:
- Builder side: post labour requests by voice or text → AI structures it → matches top 3 crews → SMS dispatch
- Crew leader side: see live demand → bid on jobs → place workers from your network → track margin
- Worker side: receive job offers by SMS → one-tap accept → automatic notifications

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **Supabase** — Postgres database, auth, realtime, RLS
- **Anthropic Claude** — scope parsing + crew matching
- **Twilio** — SMS dispatch (optional for MVP, can use in-app initially)
- **Tailwind CSS** — styling
- **Vercel** — hosting (free tier works)

## Setup — 30 minutes

### 1. Get accounts (10 min)
- [Supabase](https://supabase.com) — free, create new project
- [Anthropic](https://console.anthropic.com) — you already have this
- [Twilio](https://www.twilio.com) — $20 free credit, get a phone number (optional for v1)
- [Vercel](https://vercel.com) — free, connect GitHub
- [GitHub](https://github.com) — push your code here

### 2. Clone & install (5 min)
```bash
git clone <your-repo>
cd cobuild-mvp
npm install
```

### 3. Database setup (5 min)
- Go to your Supabase project → SQL Editor
- Run the contents of `supabase/schema.sql`
- This creates all tables with row-level security

### 4. Environment variables (5 min)
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...   # optional
TWILIO_AUTH_TOKEN=...      # optional
TWILIO_PHONE_NUMBER=+61... # optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run locally (5 min)
```bash
npm run dev
```
Open http://localhost:3000

### 6. Deploy (5 min)
```bash
vercel
```
Add the same env vars to Vercel dashboard.

## How real users use it

### Builder flow
1. Sign up with phone number → OTP
2. Add their first project (address, stage)
3. Tap "New labour request" → voice note or type
4. Claude generates structured brief in ~3 seconds
5. Review, edit, confirm
6. System matches top 3 crews + dispatches SMS
7. First crew to tap accept wins → assignment locked
8. Builder gets push notification

### Crew leader flow
1. Sign up with phone number → choose "Crew leader" role
2. Add workers to network (name + phone)
3. See morning dispatch — live demand from builders
4. Tap "Bid on this" → compose crew → submit
5. Win the bid → workers get SMS with job details
6. Workers tap accept → all confirmed
7. End of week → settlement view shows margin earned

### Worker flow
- No app, no signup
- Receives SMS with magic link
- Taps link → sees job details → Accept or Pass
- That's it

## File structure

```
cobuild-mvp/
├── app/
│   ├── (auth)/                    # Login, signup flows
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (builder)/                 # Builder pages
│   │   ├── dashboard/page.tsx
│   │   ├── projects/[id]/page.tsx
│   │   └── requests/new/page.tsx
│   ├── (crew-leader)/             # Crew leader pages
│   │   ├── dashboard/page.tsx
│   │   ├── bid/[id]/page.tsx
│   │   └── workers/page.tsx
│   ├── m/[token]/                 # Worker magic links (no auth)
│   │   └── page.tsx
│   ├── api/                       # Backend routes
│   │   ├── scope/route.ts         # Claude scope parser
│   │   ├── match/route.ts         # Crew matcher
│   │   ├── dispatch/route.ts      # SMS dispatcher
│   │   └── accept/[token]/route.ts # Acceptance handler
│   ├── layout.tsx
│   └── page.tsx                   # Landing
├── components/                    # Shared components
├── lib/
│   ├── supabase/                  # Supabase clients
│   ├── claude.ts                  # Anthropic SDK wrapper
│   ├── twilio.ts                  # SMS wrapper
│   └── types.ts                   # TypeScript types
├── supabase/
│   └── schema.sql                 # Database schema
├── package.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

## What to demo on day 1

Even without Twilio, you can demo the full flow using in-app notifications. Builders post a request, AI generates the brief, matches show up, and you simulate the SMS by showing the worker view in a second browser tab.

Real SMS goes live once you add Twilio credentials.

## What's intentionally NOT in v1

- Payment processing (add when crew leaders are real)
- Labour hire compliance layer (add at month 6)
- Worker progression tracking (add at month 4)
- Schedule coordination (add at month 6)
- End-of-day reports (add at month 5)

This MVP is **only Workflow A**. By design. Everything else is feature creep until A is working.

## Cost to run (first 3 months)

- Supabase: $0 (free tier covers up to 50K users)
- Vercel: $0 (free tier)
- Anthropic Claude: ~$20/month (cheap given low volume)
- Twilio: ~$0.05 per SMS in AU + $5/mo for the number = ~$30-50/month for 10 builders

**Total: under $100/month to run the MVP for 10 design partners.**

## Next steps after running it

1. Get 3 builder design partners using it (Week 1-2)
2. Capture feedback after every demo (use the feedback tool you already have)
3. Ship one improvement per weekday based on what they say
4. By week 4, decide what to layer in next (probably daily check-ins)
