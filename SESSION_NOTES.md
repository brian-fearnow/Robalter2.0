# Robalter 2.0 — Session Notes
Last updated: March 20, 2026

---

## Overview
Robalter 2.0 is a golf scoring and match tracking web app built with React 19 + TypeScript + Vite.
It is deployed on Vercel and wrapped in a Capacitor iOS shell for App Store distribution.

---

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite
- **Backend/Realtime:** Firebase Realtime Database
- **Deployment:** Vercel (auto-deploys on push to GitHub main branch)
- **iOS Wrapper:** Capacitor (loads live from Vercel URL — no rebuild needed for app updates)
- **Repo:** https://github.com/brian-fearnow/Robalter2.0.git

---

## Local Development Setup (Mac)
- Node/npm installed via Homebrew
- Working directory: `/Users/brian/Robalter2.0`
- Start dev server: `npm run dev` → opens at http://localhost:5173
- Build: `npm run build`
- Firebase credentials stored in `/Users/brian/Robalter2.0/.env` (not in git)
- To push changes: `git add <files> && git commit -m "message" && git push origin main`
- Vercel auto-deploys on push — live at https://robalter.vercel.app

---

## iOS / App Store Status
- **Capacitor** configured in `capacitor.config.ts` — points to https://robalter.vercel.app
- **Xcode project** located at `/Users/brian/Robalter2.0/ios/`
- **App ID:** com.brianfearnow.robalter
- **Apple Developer account:** enrolled and paid ($99/year) — may still be under review
- **App Store Connect:** app listing created (name: Robalter, SKU: robalter2)
- **Archive:** built in Xcode Organizer (version 1.0)
- **Safe area fix:** deployed — app respects iPhone notch/camera area
- **App icon:** 1024x1024 PNG set in Xcode Assets

### App Store Submission Checklist
- [x] App running on iPhone via Xcode
- [x] Safe area fix deployed
- [x] Privacy policy live at https://robalter.vercel.app/privacy-policy.html
- [x] App Store description written (see APP_STORE.md)
- [x] App icon set in Xcode
- [x] App listing created in App Store Connect
- [ ] Screenshots uploaded — **IN PROGRESS**
  - 6.9" screenshots taken (iPhone 17 Pro Max simulator) ✓
  - 6.5" screenshots needed — iPhone 12 Pro Max simulator being added in Xcode
  - Go to Window → Devices and Simulators → Simulators tab → + to add iPhone 12 Pro Max
  - Run app in that simulator, take screenshots with Cmd+S (saves to Desktop)
  - Upload to App Store Connect 6.5" slot
- [ ] Age rating questionnaire completed (should be 4+)
- [ ] Submit build from Xcode Organizer → Distribute App → App Store Connect

---

## App Store Listing Details
See `APP_STORE.md` for full description and details.

- **Privacy Policy URL:** https://robalter.vercel.app/privacy-policy.html
- **Age Rating:** 4+
- **Price:** Free
- **Bundle ID:** com.brianfearnow.robalter

---

## Features Built in This Session

### Capacitor iOS Wrapper
- Wraps the Vercel web app in a native iOS shell
- Updates to Vercel are instantly live in the app — no App Store resubmission needed for content changes
- Only need to resubmit if changing app icon, name, or Capacitor config

### Safe Area Fix
- Added `viewport-fit=cover` to index.html
- Added `padding-top/bottom: env(safe-area-inset-top/bottom)` to `.app-container` in App.css
- Prevents content from being obscured by iPhone notch/camera area

### Junk / Dots Tracking
Full junk tracking system added. See Rules tab to configure, Scores tab to enter, Results tab to view.

**Junk types:**
- Greenie — GIR resulting in par or better
- Sandie — up and down from greenside bunker for par or better
- Chippie — hole out from off the green (no putters)
- Barkie — par or better after ball hits tree trunk
- Poley — putt longer than flagstick for par or better
- Birdie/Eagle — auto-calculated (1 dot for birdie, 3 for eagle)

**How it works:**
- Enable on Rules tab, set dollar value per dot, choose which types to track
- On Scores tab, tap a hole number to open junk entry grid
- Results tab shows dot totals, pairwise payouts, and collapsible hole-by-hole audit
- Payout logic: each player nets the difference in dots vs each opponent × dot value
- Junk payouts rolled into overall Total Winnings

**Key files:**
- `src/utils/junk.ts` — calculation logic
- `src/components/scores/JunkModal.tsx` — hole entry popup
- `src/components/results/JunkResults.tsx` — results display
- `src/types/index.ts` — JunkType, JunkDots types added to GameSettings

---

## Things to Come Back To
- **Scotch game mode** — Brian is still learning the rules, will add later
- **Stableford, Vegas, Round Robin, Rabbit, Snake** — potential future game modes
- **Arnies** — making par without hitting the fairway; could be added as a junk type
- **App Store screenshots** — need 6.5" screenshots from iPhone 12 Pro Max simulator

---

## Notes
- `.env` file is gitignored — never commit it. Firebase credentials must be set up manually on each new machine.
- The existing `.gitignore` already excludes `.env`, `node_modules`, and `dist`.
- Git was initialized fresh on Mac and connected to existing GitHub repo.
- Brian is new to Mac development (coming from PC/Windows background).
