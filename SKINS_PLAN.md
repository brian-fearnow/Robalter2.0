# Skins Game Mode — Implementation Plan

**App:** Robalter 2.0 (React 19 + TypeScript + Vite, no router, no backend)
**Feature:** Real-time multi-device Skins game across multiple foursomes via Firebase Realtime Database

---

## Summary Table — All New Files

| File | Phase | Purpose |
|------|-------|---------|
| `.env` | 0/1 | Firebase credentials (gitignored) |
| `.env.example` | 11 | Template for env vars |
| `src/firebase/config.ts` | 1 | Firebase app init |
| `src/firebase/skinsService.ts` | 3 | All Firebase read/write operations |
| `src/types/skins.ts` | 2 | Skins-specific TypeScript interfaces |
| `src/utils/skins.ts` | 4 | Pure skins calculation logic |
| `src/hooks/useSkinsRound.ts` | 5 | Firebase-connected React hook |
| `src/components/skins/SkinsApp.tsx` | 9 | Top-level skins wrapper/router |
| `src/components/skins/SkinsLobby.tsx` | 6 | Create/Join round UI + waiting room |
| `src/components/skins/SkinsScorecard.tsx` | 7 | Per-foursome score entry |
| `src/components/skins/SkinsResults.tsx` | 8 | Live skins standings + hole table |
| `tests/skins.test.ts` | 4 | Unit tests for skins calculation |
| `firebase.rules.json` | 10 | Firebase Realtime Database security rules |

**Modified Files:**

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'skins'` to `GameMode` union |
| `src/components/AppHeader.tsx` | Add Skins entry point button |
| `src/App.tsx` | Render `<SkinsApp />` when skins mode is active |
| `package.json` | `npm install firebase` |

---

## Phase 0: Firebase Project Setup (Manual Steps)

> **USER ACTION REQUIRED — Firebase Console**
>
> 1. Go to https://console.firebase.google.com
> 2. Click **Add project** — name it `robalter-skins` (or similar)
> 3. Disable Google Analytics (not needed)
> 4. In the left sidebar: **Build > Realtime Database**
> 5. Click **Create Database** — choose your closest region (e.g. `us-central1`)
> 6. Start in **Test mode** (allows all reads/writes for 30 days — lock down in Phase 10)
> 7. In the left sidebar: **Project Overview > Web** (the `</>` icon)
> 8. Register the app (nickname: `robalter-web`), skip Firebase Hosting
> 9. Copy the `firebaseConfig` object shown — you will need these values in Phase 1
>
> The config object looks like:
> ```js
> {
>   apiKey: "AIza...",
>   authDomain: "robalter-skins.firebaseapp.com",
>   databaseURL: "https://robalter-skins-default-rtdb.firebaseio.com",
>   projectId: "robalter-skins",
>   storageBucket: "robalter-skins.appspot.com",
>   messagingSenderId: "123456789",
>   appId: "1:123456789:web:abc123"
> }
> ```

**Complexity: Low** (no code, just console clicks)

---

## Phase 1: Install Firebase and Config

**Complexity: Low**

### Step 1 — Install

```bash
npm install firebase
```

### Step 2 — Create `.env`

Create `.env` in the project root (already gitignored):

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=robalter-skins.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://robalter-skins-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=robalter-skins
VITE_FIREBASE_STORAGE_BUCKET=robalter-skins.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 3 — Create `src/firebase/config.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
```

---

## Phase 2: TypeScript Types

**Complexity: Low**

### New file: `src/types/skins.ts`

```typescript
import type { Player, Score } from './index';

// --- Firebase-persisted structures ---

export interface SkinsRoundMetadata {
  code: string;          // 6-char join code, e.g. "GRN42X"
  courseId: string;
  courseName: string;
  skinsStake: number;    // $ per skin
  createdAt: number;     // Unix timestamp (ms)
  status: 'waiting' | 'active' | 'completed';
}

export interface SkinsFoursome {
  id: string;            // foursomeId (Firebase push key)
  label: string;         // "Foursome 1", "Foursome 2", etc.
  players: Player[];
  scores: Score;         // { [playerId]: { [hole]: grossScore } }
  lastUpdated: number;
}

export interface SkinsRound {
  id: string;            // roundId (Firebase push key)
  metadata: SkinsRoundMetadata;
  foursomes: Record<string, SkinsFoursome>;
}

// --- Calculation result structures ---

export interface SkinsHoleResult {
  holeNumber: number;
  par: number;
  handicap: number;
  allNetScores: Record<string, number>;   // playerId → net score
  lowNet: number | null;
  winners: string[];                       // playerIds tied for low net
  skinAwarded: boolean;                    // false on a tie
  carryoverIn: number;                     // skins carried into this hole
  carryoverOut: number;                    // skins carried to next hole
  skinsValue: number;                      // total skins this hole is worth
  payoutPerSkin: number;                   // skinsValue × stake
}

export interface SkinsPlayerResult {
  playerId: string;
  name: string;
  foursomeLabel: string;
  skinsWon: number;
  grossSkins: number;       // sum of skinsValue for won holes
  totalPayout: number;      // grossSkins × stake
}

export interface SkinsResult {
  holes: SkinsHoleResult[];
  players: SkinsPlayerResult[];
  totalSkinsInPlay: number;
  totalCarryover: number;
  isComplete: boolean;
}

export type SkinsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
```

### Modify `src/types/index.ts`

Add `'skins'` to the `GameMode` union:

```typescript
// Before:
export type GameMode = 'sixes' | 'wheel' | 'four-ball' | 'baseball' | 'independent' | 'book-it' | 'wolf';

// After:
export type GameMode = 'sixes' | 'wheel' | 'four-ball' | 'baseball' | 'independent' | 'book-it' | 'wolf' | 'skins';
```

> **Note:** `'skins'` is in the union for type safety, but Skins bypasses `handleGameModeChange` entirely — it's activated via a separate button, not the game mode dropdown.

---

## Phase 3: Firebase Service Layer

**Complexity: Medium**

### New file: `src/firebase/skinsService.ts`

All Firebase SDK calls live here. Components and hooks never import from `firebase/database` directly.

```typescript
import { ref, push, set, get, update, onValue, off } from 'firebase/database';
import { db } from './config';
import type { Player, Score } from '../types';
import type { SkinsRound, SkinsFoursome, SkinsRoundMetadata } from '../types/skins';

// --- Code generation ---

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous O/0, I/1

export function generateRoomCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

// --- Round creation ---

export interface CreateRoundParams {
  courseId: string;
  courseName: string;
  skinsStake: number;
  hostPlayers: Player[];
}

export async function createRound(
  params: CreateRoundParams
): Promise<{ roundId: string; foursomeId: string; code: string }> {
  const code = generateRoomCode();
  const roundsRef = ref(db, 'rounds');
  const newRoundRef = push(roundsRef);
  const roundId = newRoundRef.key!;

  const foursomesRef = ref(db, `rounds/${roundId}/foursomes`);
  const newFoursomeRef = push(foursomesRef);
  const foursomeId = newFoursomeRef.key!;

  const metadata: SkinsRoundMetadata = {
    code,
    courseId: params.courseId,
    courseName: params.courseName,
    skinsStake: params.skinsStake,
    createdAt: Date.now(),
    status: 'waiting',
  };

  const foursome: Omit<SkinsFoursome, 'id'> = {
    label: 'Foursome 1',
    players: params.hostPlayers,
    scores: {},
    lastUpdated: Date.now(),
  };

  await set(newRoundRef, {
    metadata,
    foursomes: { [foursomeId]: foursome },
  });

  return { roundId, foursomeId, code };
}

// --- Code lookup ---

export async function getRoundByCode(code: string): Promise<SkinsRound | null> {
  // Scans all rounds — acceptable for small datasets.
  // For production scale, maintain a separate codes/{code}: roundId index.
  const roundsRef = ref(db, 'rounds');
  const snapshot = await get(roundsRef);
  if (!snapshot.exists()) return null;

  const allRounds = snapshot.val() as Record<string, Omit<SkinsRound, 'id'>>;
  for (const [id, round] of Object.entries(allRounds)) {
    if (round.metadata?.code === code.toUpperCase()) {
      return { id, ...round, foursomes: round.foursomes ?? {} };
    }
  }
  return null;
}

// --- Joining a round ---

export async function joinRound(
  roundId: string,
  players: Player[]
): Promise<string> {
  const foursomesRef = ref(db, `rounds/${roundId}/foursomes`);
  const snap = await get(foursomesRef);
  const existingCount = snap.exists() ? Object.keys(snap.val()).length : 0;
  const label = `Foursome ${existingCount + 1}`;

  const newFoursomeRef = push(foursomesRef);
  const foursomeId = newFoursomeRef.key!;

  const foursome: Omit<SkinsFoursome, 'id'> = {
    label,
    players,
    scores: {},
    lastUpdated: Date.now(),
  };

  await set(newFoursomeRef, foursome);
  return foursomeId;
}

// --- Updates ---

export async function updateFoursomePlayers(
  roundId: string,
  foursomeId: string,
  players: Player[]
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/foursomes/${foursomeId}`), {
    players,
    lastUpdated: Date.now(),
  });
}

export async function updateFoursomeScores(
  roundId: string,
  foursomeId: string,
  scores: Score
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/foursomes/${foursomeId}`), {
    scores,
    lastUpdated: Date.now(),
  });
}

export async function setRoundStatus(
  roundId: string,
  status: SkinsRoundMetadata['status']
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/metadata`), { status });
}

// --- Real-time subscription ---

export function subscribeToRound(
  roundId: string,
  callback: (round: SkinsRound | null) => void
): () => void {
  const roundRef = ref(db, `rounds/${roundId}`);
  const handler = onValue(roundRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.val() as Omit<SkinsRound, 'id'>;
    callback({ id: roundId, ...data, foursomes: data.foursomes ?? {} });
  });
  return () => off(roundRef, 'value', handler);
}
```

---

## Phase 4: Skins Calculation Utility

**Complexity: Medium**

Follows the same pattern as `src/utils/wolf.ts` — pure function, no React or Firebase dependencies.

### New file: `src/utils/skins.ts`

```typescript
/**
 * Pure scoring utilities for Skins game mode.
 *
 * Net score: full course handicap (baseline = 0), standard handicap ranking.
 * Carryover: when 2+ players tie for low net, the skin carries forward.
 * Carryover accumulates: a skin on hole N is worth (1 + carryovers from prior holes).
 */

import type { Hole, Player, Score, GameSettings } from '../types';
import type { SkinsFoursome, SkinsHoleResult, SkinsPlayerResult, SkinsResult } from '../types/skins';
import { getStrokesForHole } from './handicap';

// Skins always uses full course handicap (baseline = 0), standard allocation
const SKINS_SETTINGS: GameSettings = {
  strokeAllocation: 'handicap',
  remainderLogic: 'standard',
  useSecondBallTieBreaker: false,
  useAutoPress: false,
  autoPressTrigger: '2-down',
  useBaseballBirdieRule: false,
  baseballBirdieRuleType: 'gross',
  useBaseballDoubleBackNine: false,
  useManualStrokes: false,
  bookItHolesRequired: 11,
  useBookItSegmented: false,
  bookItSegmentRequired: 4,
  wolfLastPlaceWolf: false,
};

function getSkinsNetScore(
  playerId: string,
  holeNumber: number,
  allPlayersInFoursome: Player[],
  courseHoles: Hole[],
  scores: Score,
): number | null {
  const gross = scores[playerId]?.[holeNumber];
  if (!gross) return null;
  const strokes = getStrokesForHole(
    playerId, holeNumber, allPlayersInFoursome,
    courseHoles, SKINS_SETTINGS, 'skins', 0
  );
  return gross - strokes;
}

export function calculateSkinsResults(
  foursomes: SkinsFoursome[],
  courseHoles: Hole[],
  skinsStake: number,
): SkinsResult {
  // Flatten all named players across foursomes
  const flatPlayers = foursomes.flatMap(fs =>
    fs.players
      .filter(p => p.name)
      .map(p => ({
        player: p,
        foursomeId: fs.id,
        foursomeLabel: fs.label,
        scores: fs.scores,
        allPlayersInFoursome: fs.players,
      }))
  );

  const skinCounts: Record<string, number> = {};
  const skinValues: Record<string, number> = {};
  for (const fp of flatPlayers) {
    skinCounts[fp.player.id] = 0;
    skinValues[fp.player.id] = 0;
  }

  const holeResults: SkinsHoleResult[] = [];
  let carryover = 0;

  for (const hole of courseHoles) {
    const netScores: Record<string, number> = {};
    for (const fp of flatPlayers) {
      const net = getSkinsNetScore(
        fp.player.id, hole.number, fp.allPlayersInFoursome, courseHoles, fp.scores
      );
      if (net !== null) netScores[fp.player.id] = net;
    }

    const scoredPlayerIds = Object.keys(netScores);
    const skinsValue = 1 + carryover;

    if (scoredPlayerIds.length === 0) {
      holeResults.push({
        holeNumber: hole.number, par: hole.par, handicap: hole.handicap,
        allNetScores: {}, lowNet: null, winners: [],
        skinAwarded: false,
        carryoverIn: carryover, carryoverOut: carryover,
        skinsValue, payoutPerSkin: skinsValue * skinsStake,
      });
      continue;
    }

    const lowNet = Math.min(...scoredPlayerIds.map(id => netScores[id]));
    const winners = scoredPlayerIds.filter(id => netScores[id] === lowNet);
    const skinAwarded = winners.length === 1;

    if (skinAwarded) {
      skinCounts[winners[0]] += 1;
      skinValues[winners[0]] += skinsValue;
    }

    holeResults.push({
      holeNumber: hole.number, par: hole.par, handicap: hole.handicap,
      allNetScores: netScores,
      lowNet, winners, skinAwarded,
      carryoverIn: carryover,
      carryoverOut: skinAwarded ? 0 : skinsValue,
      skinsValue,
      payoutPerSkin: skinsValue * skinsStake,
    });

    carryover = skinAwarded ? 0 : skinsValue;
  }

  const players: SkinsPlayerResult[] = flatPlayers.map(fp => ({
    playerId: fp.player.id,
    name: fp.player.name,
    foursomeLabel: fp.foursomeLabel,
    skinsWon: skinCounts[fp.player.id] ?? 0,
    grossSkins: skinValues[fp.player.id] ?? 0,
    totalPayout: (skinValues[fp.player.id] ?? 0) * skinsStake,
  }));

  return {
    holes: holeResults,
    players,
    totalSkinsInPlay: holeResults.filter(h => h.skinAwarded).length,
    totalCarryover: carryover,
    isComplete: holeResults.every(h => Object.keys(h.allNetScores).length > 0),
  };
}
```

**Carryover logic:** If holes 1 and 2 both tie, hole 3 is worth 3 skins (value=1 + 2 carried). `carryover` tracks the accumulated value; it resets to 0 when a skin is awarded.

### New file: `tests/skins.test.ts`

Write tests for:
- Outright low net winner gets the skin
- Tie → no skin awarded, carries over (next hole worth 2)
- Multiple consecutive carryovers accumulate
- Pending holes (no scores entered) don't break calculation
- Correct payout at a given stake
- Players across two foursomes compete correctly

---

## Phase 5: useSkinsRound Hook

**Complexity: High**

### New file: `src/hooks/useSkinsRound.ts`

```typescript
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Player, Score, Course } from '../types';
import type { SkinsRound, SkinsFoursome, SkinsResult, SkinsConnectionStatus } from '../types/skins';
import {
  createRound as fbCreateRound,
  getRoundByCode,
  joinRound as fbJoinRound,
  updateFoursomeScores,
  updateFoursomePlayers,
  subscribeToRound,
  setRoundStatus,
} from '../firebase/skinsService';
import { calculateSkinsResults } from '../utils/skins';

const LS_ROUND_ID    = 'robalter_skins_roundId';
const LS_FOURSOME_ID = 'robalter_skins_foursomeId';

export function useSkinsRound(course: Course) {
  const [roundId,    setRoundId]    = useState<string | null>(() => localStorage.getItem(LS_ROUND_ID));
  const [foursomeId, setFoursomeId] = useState<string | null>(() => localStorage.getItem(LS_FOURSOME_ID));
  const [round,      setRound]      = useState<SkinsRound | null>(null);
  const [myPlayers,  setMyPlayers]  = useState<Player[]>([]);
  const [myScores,   setMyScores]   = useState<Score>({});
  const [status,     setStatus]     = useState<SkinsConnectionStatus>('idle');
  const [error,      setError]      = useState<string | null>(null);

  const scoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist roundId/foursomeId to localStorage
  useEffect(() => {
    if (roundId) localStorage.setItem(LS_ROUND_ID, roundId);
    else localStorage.removeItem(LS_ROUND_ID);
  }, [roundId]);

  useEffect(() => {
    if (foursomeId) localStorage.setItem(LS_FOURSOME_ID, foursomeId);
    else localStorage.removeItem(LS_FOURSOME_ID);
  }, [foursomeId]);

  // Subscribe to Firebase when roundId is set
  useEffect(() => {
    if (!roundId) return;
    setStatus('connecting');
    const unsubscribe = subscribeToRound(roundId, (updatedRound) => {
      if (!updatedRound) {
        setStatus('error');
        setError('Round not found or was deleted.');
        return;
      }
      setRound(updatedRound);
      setStatus('connected');
    });
    return unsubscribe;
  }, [roundId]);

  const createRound = useCallback(async (skinsStake: number, players: Player[]): Promise<string> => {
    setStatus('connecting');
    setError(null);
    const result = await fbCreateRound({
      courseId: course.id,
      courseName: course.name,
      skinsStake,
      hostPlayers: players,
    });
    setRoundId(result.roundId);
    setFoursomeId(result.foursomeId);
    setMyPlayers(players);
    return result.code;
  }, [course]);

  const joinRound = useCallback(async (code: string, players: Player[]): Promise<void> => {
    setStatus('connecting');
    setError(null);
    const existingRound = await getRoundByCode(code);
    if (!existingRound) {
      setError(`No round found with code "${code.toUpperCase()}".`);
      setStatus('idle');
      return;
    }
    const newFoursomeId = await fbJoinRound(existingRound.id, players);
    setRoundId(existingRound.id);
    setFoursomeId(newFoursomeId);
    setMyPlayers(players);
  }, []);

  const updateMyScores = useCallback((scores: Score) => {
    setMyScores(scores);
    if (!roundId || !foursomeId) return;
    if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current);
    scoreDebounceRef.current = setTimeout(() => {
      updateFoursomeScores(roundId, foursomeId, scores).catch(console.error);
    }, 300);
  }, [roundId, foursomeId]);

  const updateMyPlayers = useCallback((players: Player[]) => {
    setMyPlayers(players);
    if (!roundId || !foursomeId) return;
    updateFoursomePlayers(roundId, foursomeId, players).catch(console.error);
  }, [roundId, foursomeId]);

  const startRound   = useCallback(() => roundId ? setRoundStatus(roundId, 'active')    : Promise.resolve(), [roundId]);
  const completeRound = useCallback(() => roundId ? setRoundStatus(roundId, 'completed') : Promise.resolve(), [roundId]);

  const leaveRound = useCallback(() => {
    setRoundId(null); setFoursomeId(null); setRound(null);
    setMyPlayers([]); setMyScores({}); setStatus('idle'); setError(null);
  }, []);

  const foursomes: SkinsFoursome[] = useMemo(() => {
    if (!round?.foursomes) return [];
    return Object.entries(round.foursomes).map(([id, fs]) => ({ ...fs, id }));
  }, [round]);

  const skinsResults: SkinsResult | null = useMemo(() => {
    if (foursomes.length === 0) return null;
    return calculateSkinsResults(foursomes, course.holes, round?.metadata.skinsStake ?? 0);
  }, [foursomes, course.holes, round?.metadata.skinsStake]);

  const isHost = useMemo(() => (
    foursomes.length > 0 && !!foursomeId && foursomes[0].id === foursomeId
  ), [foursomes, foursomeId]);

  return {
    roundId, foursomeId, round, foursomes, myPlayers, myScores, status, error, isHost,
    skinsResults,
    roundStatus: round?.metadata.status ?? null,
    roomCode: round?.metadata.code ?? null,
    skinsStake: round?.metadata.skinsStake ?? 0,
    createRound, joinRound, updateMyScores, updateMyPlayers,
    startRound, completeRound, leaveRound,
  };
}

export type SkinsRoundState = ReturnType<typeof useSkinsRound>;
```

**Key behaviors:**
- Reads `roundId`/`foursomeId` from localStorage on mount → reconnects automatically after page refresh
- Scores debounced 300ms before Firebase write (matches existing 200ms localStorage debounce pattern)
- `skinsResults` recomputes via `useMemo` whenever any foursome updates — no manual refresh needed

---

## Phase 6: Skins Setup UI — SkinsLobby

**Complexity: Medium**

### New file: `src/components/skins/SkinsLobby.tsx`

Three visual states:

1. **Select** — two panels: "Create Round" / "Join Round"
2. **Configure** — player entry (reuse existing `PlayerEntry` component) + stake + course picker
3. **Waiting room** — connected foursomes list + room code + "Start Round" (host only)

Key UI elements:

```tsx
// Room code display with copy button
<div className="skins-room-code">
  <span className="code-label">Room Code</span>
  <span className="code-value">{roomCode}</span>
  <button onClick={() => navigator.clipboard.writeText(roomCode ?? '')}>Copy</button>
</div>

// Waiting room foursome list
{foursomes.map(fs => (
  <div key={fs.id} className="skins-foursome-row">
    <strong>{fs.label}</strong>
    <span>{fs.players.filter(p => p.name).map(p => p.name).join(', ')}</span>
  </div>
))}

// Host-only start button
{isHost && roundStatus === 'waiting' && (
  <button onClick={startRound}>
    Start Round ({foursomes.length} foursome{foursomes.length !== 1 ? 's' : ''})
  </button>
)}
```

---

## Phase 7: Skins Scorecard

**Complexity: Medium**

### New file: `src/components/skins/SkinsScorecard.tsx`

Mirrors the layout of `src/components/scores/ScoreCard.tsx`. Key differences:
- Shows only MY foursome's players for score entry
- Score changes call `skinsState.updateMyScores()` (debounced Firebase write)
- Header shows room code + connection status dot (🟢 connected / 🟡 connecting / 🔴 error)
- Optional collapsible live standings panel at the bottom

```typescript
interface SkinsScorecardProps {
  skinsState: SkinsRoundState;
  course: Course;
}

export function SkinsScorecard({ skinsState, course }: SkinsScorecardProps) {
  const { myPlayers, myScores, updateMyScores, roomCode, status } = skinsState;

  const handleScoreChange = (playerId: string, holeNumber: number, value: string) => {
    const gross = parseInt(value) || 0;
    updateMyScores({
      ...myScores,
      [playerId]: { ...myScores[playerId], [holeNumber]: gross },
    });
  };

  // Render: same grid as ScoreCard.tsx
  // Rows: holes 1–18 with <input type="number" inputMode="numeric"> per player
  // Net score display using getSkinsNetScore (baseline=0)
}
```

---

## Phase 8: Skins Results

**Complexity: High**

### New file: `src/components/skins/SkinsResults.tsx`

Two sections that update live as Firebase data changes:

**Section 1: Hole-by-hole table**

```
Hole | Par | Player A | Player B | Player C | Player D | Winner | Skins
  1  |  4  |    3*    |    4     |    4     |    5     | Doe    |   1
  2  |  3  |    2     |    2     |    3     |    4     | CARRY↓ |   –
  3  |  5  |    4     |    3*    |    5     |    4     | Smith  |   2
```

(*) = skin winner cell (green highlight)

**Section 2: Player summary**

```
Player    | Foursome    | Skins | Payout
Smith, J  | Foursome 2  |   2   | +$10
Doe, B    | Foursome 1  |   1   |  +$5
Jones, M  | Foursome 1  |   0   |   $0
```

**Carryover badge:**
```tsx
{results.totalCarryover > 0 && (
  <div className="carryover-badge">
    {results.totalCarryover} skin{results.totalCarryover !== 1 ? 's' : ''} in carryover
    (worth ${results.totalCarryover * skinsStake})
  </div>
)}
```

---

## Phase 9: App Integration

**Complexity: Medium**

### Strategy

Skins is a parallel mode — when active, it replaces the entire tab UI. The integration adds a `skinsOpen` boolean to `App.tsx` that gates rendering.

### Modify `src/App.tsx`

```tsx
const [skinsOpen, setSkinsOpen] = useState(
  () => !!localStorage.getItem('robalter_skins_roundId')
);

if (skinsOpen) {
  return (
    <SkinsApp
      course={selectedCourse}
      courses={courses}
      onCourseChange={setSelectedCourseId}
      onExit={() => setSkinsOpen(false)}
    />
  );
}
// ... existing tab-based render unchanged ...
```

### Modify `src/components/AppHeader.tsx`

Add a "Skins (Multi)" button alongside the game mode `<select>`:

```tsx
<button
  className="skins-entry-btn"
  onClick={onOpenSkins}
  title="Multi-device Skins game"
>
  Skins (Multi)
</button>
```

Pass `onOpenSkins` as a new prop to `AppHeader`.

### New file: `src/components/skins/SkinsApp.tsx`

Top-level wrapper that routes between Lobby and in-round views:

```typescript
export function SkinsApp({ course, courses, onCourseChange, onExit }: SkinsAppProps) {
  const skinsState = useSkinsRound(course);
  const [activeTab, setActiveTab] = useState<'scorecard' | 'results'>('scorecard');
  const inRound = skinsState.roundStatus === 'active' || skinsState.roundStatus === 'completed';

  if (!inRound) {
    return <SkinsLobby skinsState={skinsState} courses={courses} ... />;
  }

  return (
    // Header with room code + Scorecard/Results tab switcher
    // activeTab === 'scorecard' → <SkinsScorecard />
    // activeTab === 'results'   → <SkinsResults />
  );
}
```

**Reconnection on refresh:** `useSkinsRound` reads `roundId` from localStorage on mount and subscribes to Firebase immediately. `skinsOpen` in `App.tsx` also initializes from localStorage. So page refresh mid-round reconnects automatically.

**No impact on existing modes:** Everything inside `if (skinsOpen)` is isolated. All existing game modes are unaffected.

---

## Phase 10: Firebase Security Rules

**Complexity: Low**

### New file: `firebase.rules.json`

Deploy via Firebase CLI: `npm install -g firebase-tools && firebase deploy --only database`

```json
{
  "rules": {
    "rounds": {
      "$roundId": {
        ".read": true,
        ".write": true,
        "metadata": {
          ".validate": "newData.hasChildren(['code', 'courseId', 'courseName', 'skinsStake', 'createdAt', 'status'])",
          "code":       { ".validate": "newData.isString() && newData.val().length === 6" },
          "skinsStake": { ".validate": "newData.isNumber() && newData.val() >= 0" },
          "status":     { ".validate": "newData.val() === 'waiting' || newData.val() === 'active' || newData.val() === 'completed'" }
        },
        "foursomes": {
          "$foursomeId": {
            ".read": true,
            ".write": true,
            "lastUpdated": { ".validate": "newData.isNumber()" }
          }
        }
      }
    }
  }
}
```

> **Security note:** The 6-character code provides "security through obscurity" — sufficient for a friendly golf app. If stronger security is needed, enable Firebase Anonymous Authentication and add `.write: "auth !== null"` rules.

> **Test Mode expiry:** Firebase's initial test mode rules expire after 30 days. Deploy these rules before expiry.

---

## Phase 11: Environment and Deployment

**Complexity: Low**

### New file: `.env.example`

```
# Firebase Realtime Database configuration
# Copy to .env and fill in values from Firebase Console > Project Settings > Your Apps

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Netlify Deployment

> **USER ACTION REQUIRED**
>
> 1. Netlify Dashboard → Site settings → **Environment variables**
> 2. Add each `VITE_FIREBASE_*` variable from your `.env`
> 3. Trigger a redeploy

### Vercel Deployment

> **USER ACTION REQUIRED**
>
> 1. Vercel Dashboard → Project → **Settings > Environment Variables**
> 2. Add each `VITE_FIREBASE_*` variable
> 3. Redeploy

### Firebase Free Tier (Spark Plan) Limits

| Resource | Free Limit | Typical Skins Round Usage |
|----------|-----------|--------------------------|
| Storage | 1 GB | ~10–50 KB per round |
| Simultaneous connections | 100 | ~20 (5 foursomes × 4 players) |
| Downloads | 10 GB/month | Negligible |
| Writes/day | 100,000 | ~500–2,000 per round |

No credit card required. You could run hundreds of rounds per day before approaching limits.

---

## Implementation Sequencing

```
Phase 0 (manual) → Phase 1 → Phase 2 → Phase 3 → Phase 4
                                                       ↓
                                                  Phase 5 (hook)
                                                       ↓
                                   Phase 6, 7, 8 (UI — parallel)
                                                       ↓
                                               Phase 9 (integration)
                                                       ↓
                                           Phase 10, 11 (deployment)
```

**Recommended order for a single developer:**

| Step | Phase | Task | Est. Time |
|------|-------|------|-----------|
| 1 | 0 | Firebase Console setup | 15 min |
| 2 | 1 | Install + config | 10 min |
| 3 | 2 | Types | 15 min |
| 4 | 4 | Skins calc utility + tests | 45 min |
| 5 | 3 | Firebase service | 30 min |
| 6 | 5 | useSkinsRound hook | 60 min |
| 7 | 6 | SkinsLobby UI | 60 min |
| 8 | 7 | SkinsScorecard UI | 45 min |
| 9 | 8 | SkinsResults UI | 90 min |
| 10 | 9 | App integration | 30 min |
| 11 | 10 | Security rules | 10 min |
| 12 | 11 | Deployment docs | 10 min |
| | | **Total** | **~7 hours** |

---

## Key Technical Decisions

### Why Firebase Realtime Database (not Firestore)?
- Simpler data model — a round is a single nested object
- `onValue` gives instant updates with one subscription call
- Better latency for live score updates
- Spark plan is more than sufficient at no cost

### Why a separate `useSkinsRound` hook (not extending `useAppState`)?
- `useAppState` is 900+ lines handling 7 game modes — keeping it clean is important
- Skins requires Firebase imports; isolating them prevents contaminating other modes
- Cleaner separation of concerns and easier to test independently

### Why `calculateSkinsResults` is a pure function?
- Follows the established pattern of `wolf.ts`, `bookIt.ts`, `scoring.ts`
- Unit testable without Firebase mocking
- `useMemo` in the hook recomputes efficiently on any change

### Why Skins is a separate entry point (not in the game mode dropdown)?
- Skins requires Firebase setup and is a fundamentally different experience
- A dedicated button makes the distinction clear
- Avoids `handleGameModeChange` which resets all scores/teams (inappropriate for skins)

### Why debounce score writes at 300ms?
- Score inputs fire `onChange` on every keystroke
- Writing to Firebase on every keystroke would hammer the database and cause flicker
- 300ms matches the intent of the existing 200ms localStorage debounce in `useAppState`
