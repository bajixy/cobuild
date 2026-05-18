# 🚀 SETUP — Get CoBuild Running in 30 Minutes

This guide is for you, boss. Follow it top-to-bottom and you'll have a real working app in 30 minutes.

---

## Before you start

You need:
- A computer (Mac or PC)
- A phone (for testing OTP login)
- A credit card (for free tiers — nothing will charge for the MVP, but verification needs it)
- An hour of focused time

---

## Step 1 — Install the basics (10 min)

### 1a. Install Node.js
Go to https://nodejs.org → download "LTS" version → install.
Open Terminal (Mac) or PowerShell (Windows). Test:
```
node --version
```
Should show v20.x.x or higher. ✓

### 1b. Install Git
Mac: probably already installed. Test: `git --version`
Windows: https://git-scm.com/download/win → install

### 1c. Open the project
```
cd ~/Downloads
unzip cobuild-mvp.zip
cd cobuild-mvp
npm install
```
Takes 2-3 minutes. Wait for it to finish.

---

## Step 2 — Set up Supabase database (10 min)

### 2a. Create a Supabase project
1. Go to https://supabase.com → Sign up (free)
2. Click "New project"
3. Name: **cobuild-mvp**
4. Database password: pick a strong one, save it somewhere safe
5. Region: **Southeast Asia (Singapore)** (closest to Brisbane)
6. Free tier
7. Wait ~2 min for project to provision

### 2b. Get your keys
In your Supabase dashboard → Settings (gear icon) → API:
- **Project URL** — copy this (looks like `https://xxxxx.supabase.co`)
- **anon public** key — copy this (long string starting with `eyJ`)
- **service_role** key — copy this too (different long string)

### 2c. Run the database schema
1. In Supabase dashboard → SQL Editor (left sidebar)
2. Click "New query"
3. Open the file `supabase/schema.sql` from the project
4. Copy ALL of it
5. Paste into the SQL editor
6. Click "Run" (bottom right)
7. Should say "Success" — your tables are created ✓

### 2d. Enable phone auth
1. In Supabase → Authentication → Providers
2. Find **Phone** → enable it
3. Provider: choose **Twilio** (you'll add Twilio details in step 3)
4. Save

**Skip step 2d for now if you don't want SMS yet** — you can use the "magic link in console" approach for testing.

---

## Step 3 — Get your Claude API key (2 min)

1. Go to https://console.anthropic.com
2. Sign in (you already have an account)
3. API Keys → Create key → name it "cobuild-mvp"
4. Copy the key (starts with `sk-ant-...`)
5. Save it somewhere safe

---

## Step 4 — Twilio for SMS (OPTIONAL for now — 5 min)

You can skip this and use mock SMS for testing. Real SMS dispatch when ready:

1. Go to https://www.twilio.com → sign up (free $20 credit)
2. Verify your phone number
3. Get a phone number:
   - Console → Phone Numbers → Manage → Buy a number
   - Pick an Australian number (~$5/month)
   - Make sure SMS capability is enabled
4. From your Twilio Console dashboard, copy:
   - **Account SID**
   - **Auth Token**
   - **The phone number you bought** (format: +614xxxxxxxx)

---

## Step 5 — Configure your environment (3 min)

In the project folder, create a new file called `.env.local` (note the dot at the start).

Paste this and fill in YOUR values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

ANTHROPIC_API_KEY=sk-ant-...your-claude-key

TWILIO_ACCOUNT_SID=AC...your-twilio-sid
TWILIO_AUTH_TOKEN=...your-twilio-token
TWILIO_PHONE_NUMBER=+614xxxxxxxx

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**If skipping Twilio for now**, leave those three lines empty — the app will use mock SMS (prints to console).

---

## Step 6 — Run it locally (1 min)

In your terminal, in the project folder:
```
npm run dev
```

You should see:
```
▲ Next.js 14.2.x
- Local:        http://localhost:3000
- Network:      ...
✓ Ready in 2.3s
```

Open http://localhost:3000 in your browser.

🎉 **You're live.**

---

## Step 7 — Test the flow end-to-end

### As a builder:
1. Click "I'm a builder"
2. Fill in name + company + phone
3. Get the OTP code (Supabase will send via SMS if Twilio is set up, or check Supabase logs)
4. Verify → you're in
5. Add a project
6. Click "Need a crew?"
7. Type something like: *"need 2 carpenters Thursday at 22 Logan Rd, lockup, $65/hr"*
8. Watch Claude parse it
9. Confirm → no matches yet (no crew leaders signed up)

### As a crew leader (in incognito tab):
1. Sign out from builder
2. Click "I'm a crew leader"
3. Sign up with a DIFFERENT phone number
4. Go to "My workers" → add 3-4 workers (any names + phones)
5. Now go back to your builder tab
6. Post the same request again
7. The crew leader should appear in matches!
8. Dispatch
9. Switch to crew leader tab → you'll see the offer
10. Open it, pick workers, accept
11. Builder sees "Crew booked" ✓

**Boom. That's the full loop working.**

---

## Step 8 — Deploy to Vercel so builders can use it (10 min)

When ready to put it in front of real builders:

### 8a. Push to GitHub
1. Create a GitHub repo: https://github.com/new
2. Name: cobuild-mvp · Private
3. In your project terminal:
```
git init
git add .
git commit -m "Initial MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cobuild-mvp.git
git push -u origin main
```

### 8b. Deploy on Vercel
1. Go to https://vercel.com → sign up with GitHub
2. New Project → import your cobuild-mvp repo
3. Framework preset: Next.js (auto-detected)
4. Environment variables — add EVERY variable from your `.env.local`
   - **Important**: change `NEXT_PUBLIC_APP_URL` to your eventual Vercel URL (you'll get it after deploy)
5. Click Deploy
6. Wait 1-2 minutes
7. You'll get a URL like `cobuild-mvp-xxx.vercel.app`

### 8c. Update the APP_URL
1. Once you have the Vercel URL, go to Settings → Environment Variables in Vercel
2. Update `NEXT_PUBLIC_APP_URL` to your real URL (with https://)
3. Redeploy (Deployments → ... → Redeploy)

🎉 **Your MVP is now live on the internet.** Send the URL to your design partners.

---

## What works in the MVP

✅ Builder signs up, adds project
✅ Builder posts labour request (voice/text → Claude parses to structured brief)
✅ AI-matched top 3 crew leaders
✅ SMS dispatch to top matches (real SMS if Twilio configured, otherwise mock)
✅ Crew leader sees offer, picks workers from network, accepts
✅ Builder sees "crew booked" confirmation
✅ Worker network management
✅ Phone OTP authentication
✅ Row-level security (each user sees only their own data)

## What's NOT in the MVP (intentional)

❌ Payment processing
❌ Labour hire compliance layer
❌ Worker progression tracking
❌ Schedule coordination
❌ Daily site check-ins
❌ Risk briefings

**Ship Workflow A first. Validate it. Then layer in the rest.**

---

## Troubleshooting

**"Cannot find module..."** → Run `npm install` again

**Login OTP not arriving** → Supabase free tier limits SMS. For testing, check Supabase Logs → see the code there. For production, configure Twilio in Supabase Auth settings.

**"No crews matched"** → That's expected with zero crew leaders. Sign up a test crew leader first, add workers, then post a request.

**Claude API errors** → Check your API key, check your billing is set up at console.anthropic.com.

**Vercel build fails** → Check your env vars are all set in Vercel dashboard.

---

## What to do this week

**Monday morning, when this is running:**
1. Get 1 builder to sign up and use it on a real labour need
2. Watch them use it (silent — don't help unless they're stuck)
3. Capture their feedback in the feedback tool from our chat
4. Ship 1 improvement based on what you saw
5. Repeat with builder #2 on Tuesday

By Friday: 5 builders have used it. You'll know more about your product than 90% of ConTech founders learn in 6 months.

---

## Need help?

The codebase is small (~15 files). Open it in Cursor — talk to Claude inside Cursor — ask it to explain any file or add any feature. It can navigate the codebase faster than I can describe it.

Now go ship it, boss. 🔨
