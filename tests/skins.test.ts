import { describe, it, expect } from 'vitest';
import { calculateSkinsResults } from '../src/utils/skins';
import { calculateCourseHandicap } from '../src/utils/handicap';
import type { SkinsFoursome } from '../src/types/skins';
import type { Hole, Player, Tee } from '../src/types';

// --- Fixtures ---

const tee: Tee = { name: 'Blue', rating: 71.0, slope: 113 }; // slope=113, rating=71 → CH = HI exactly

const makePlayer = (id: string, name: string, hi: number): Player => ({
  id,
  name,
  index: hi,
  indexInput: String(hi),
  selectedTeeIndex: 0,
  courseHandicap: calculateCourseHandicap(hi, tee),
  manualRelativeStrokes: 0,
});

// 3-hole course for brevity; holes ranked by difficulty
const holes: Hole[] = [
  { number: 1, par: 4, handicap: 1 },
  { number: 2, par: 3, handicap: 3 },
  { number: 3, par: 5, handicap: 2 },
];

const allHoles: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: i + 1,
  par: 4,
  handicap: i + 1,
}));

// Helper: build a minimal SkinsFoursome
function makeFoursome(
  id: string,
  label: string,
  players: Player[],
  scores: Record<string, Record<number, number>>,
): SkinsFoursome {
  return { id, label, players, scores, lastUpdated: Date.now() };
}

// --- Tests ---

describe('calculateSkinsResults — basic', () => {
  it('awards skin to outright low net scorer', () => {
    // slope=113, so CH = HI; all even CH → baseline 0 → each player gets CH strokes
    // p1 CH=0, p2 CH=0, p3 CH=0: no strokes, pure gross comparison
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);
    const p3 = makePlayer('p3', 'Carol', 0);
    const players = [p1, p2, p3];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 3 }, // net 3 → wins hole 1
      p2: { 1: 4 },
      p3: { 1: 5 },
    });

    const result = calculateSkinsResults([fs], holes, 5);

    expect(result.holes[0].skinAwarded).toBe(true);
    expect(result.holes[0].winners).toEqual(['p1']);
    expect(result.holes[0].skinsValue).toBe(1);
    expect(result.players.find(p => p.playerId === 'p1')!.skinsWon).toBe(1);
    expect(result.players.find(p => p.playerId === 'p1')!.totalPayout).toBe(5);
  });

  it('does NOT award skin on a tie', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);
    const players = [p1, p2];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 4 }, // tied
      p2: { 1: 4 }, // tied
    });

    const result = calculateSkinsResults([fs], holes, 5);

    expect(result.holes[0].skinAwarded).toBe(false);
    expect(result.holes[0].winners).toEqual(['p1', 'p2']);
    expect(result.totalCarryover).toBeGreaterThan(0);
  });
});

describe('calculateSkinsResults — carryover', () => {
  it('carries over one skin after a tie, next hole worth 2', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);
    const players = [p1, p2];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 4, 2: 3 }, // hole 1 tie, hole 2 p1 wins
      p2: { 1: 4, 2: 4 }, // hole 1 tie, hole 2 p2 loses
    });

    const result = calculateSkinsResults([fs], holes, 5);

    // Hole 1: tie → carryover
    expect(result.holes[0].skinAwarded).toBe(false);
    expect(result.holes[0].skinsValue).toBe(1);
    expect(result.holes[0].carryoverOut).toBe(1);

    // Hole 2: p1 wins, worth 2 skins
    expect(result.holes[1].skinAwarded).toBe(true);
    expect(result.holes[1].skinsValue).toBe(2);
    expect(result.holes[1].winners).toEqual(['p1']);
    expect(result.players.find(p => p.playerId === 'p1')!.skinsWon).toBe(1);
    expect(result.players.find(p => p.playerId === 'p1')!.totalPayout).toBe(10); // 2 skins × $5
  });

  it('accumulates carryover across two consecutive ties', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);
    const players = [p1, p2];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 4, 2: 3, 3: 4 }, // hole 1 tie, hole 2 tie, hole 3 p1 wins
      p2: { 1: 4, 2: 3, 3: 5 },
    });

    const result = calculateSkinsResults([fs], holes, 5);

    expect(result.holes[0].skinAwarded).toBe(false); // tie
    expect(result.holes[1].skinAwarded).toBe(false); // tie
    expect(result.holes[2].skinsValue).toBe(3);       // hole 3 worth 3 skins
    expect(result.holes[2].skinAwarded).toBe(true);
    expect(result.players.find(p => p.playerId === 'p1')!.totalPayout).toBe(15); // 3 × $5
    expect(result.totalCarryover).toBe(0);
  });

  it('resets carryover to 0 after skin is awarded', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);
    const players = [p1, p2];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 4, 2: 3, 3: 4 }, // hole 1 tie, hole 2 p1 wins, hole 3 p1 wins
      p2: { 1: 4, 2: 4, 3: 5 },
    });

    const result = calculateSkinsResults([fs], holes, 5);

    expect(result.holes[1].skinsValue).toBe(2); // carried 1 in
    expect(result.holes[2].skinsValue).toBe(1); // fresh hole after win
    expect(result.totalCarryover).toBe(0);
  });
});

describe('calculateSkinsResults — pending holes', () => {
  it('marks holes with no scores as pending (no skin awarded, carryover unchanged)', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const players = [p1];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {}); // no scores

    const result = calculateSkinsResults([fs], holes, 5);

    for (const hole of result.holes) {
      expect(hole.skinAwarded).toBe(false);
      expect(hole.lowNet).toBeNull();
    }
    expect(result.isComplete).toBe(false);
  });

  it('marks isComplete true when all 18 holes have scores', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const players = [p1];
    const scores: Record<number, number> = {};
    for (let h = 1; h <= 18; h++) scores[h] = 4;

    const fs = makeFoursome('fs1', 'Foursome 1', players, { p1: scores });

    const result = calculateSkinsResults([fs], allHoles, 5);

    expect(result.isComplete).toBe(true);
  });
});

describe('calculateSkinsResults — multi-foursome', () => {
  it('players from different foursomes compete against each other', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);

    const fs1 = makeFoursome('fs1', 'Foursome 1', [p1], { p1: { 1: 3 } }); // net 3
    const fs2 = makeFoursome('fs2', 'Foursome 2', [p2], { p2: { 1: 4 } }); // net 4

    const result = calculateSkinsResults([fs1, fs2], holes, 10);

    expect(result.holes[0].skinAwarded).toBe(true);
    expect(result.holes[0].winners).toEqual(['p1']);
    expect(result.players.find(p => p.playerId === 'p1')!.totalPayout).toBe(10);
    expect(result.players.find(p => p.playerId === 'p2')!.totalPayout).toBe(0);
  });

  it('ties across foursomes carry over correctly', () => {
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 0);

    // hole 1 tied across foursomes, hole 2 p1 wins
    const fs1 = makeFoursome('fs1', 'Foursome 1', [p1], { p1: { 1: 4, 2: 3 } });
    const fs2 = makeFoursome('fs2', 'Foursome 2', [p2], { p2: { 1: 4, 2: 4 } });

    const result = calculateSkinsResults([fs1, fs2], holes, 5);

    expect(result.holes[0].skinAwarded).toBe(false);
    expect(result.holes[1].skinsValue).toBe(2);
    expect(result.holes[1].skinAwarded).toBe(true);
    expect(result.players.find(p => p.playerId === 'p1')!.totalPayout).toBe(10);
  });
});

describe('calculateSkinsResults — handicap strokes', () => {
  it('applies strokes correctly: higher handicap player wins on stroke hole', () => {
    // slope=113 → CH = HI
    // p1 CH=0: no strokes. p2 CH=18: gets 1 stroke on every hole
    // Hole 1 (hardest): p2 gets 1 stroke. p1 gross=4 net=4. p2 gross=5 net=4. → tie
    const p1 = makePlayer('p1', 'Alice', 0);
    const p2 = makePlayer('p2', 'Bob', 18);
    const players = [p1, p2];

    const fs = makeFoursome('fs1', 'Foursome 1', players, {
      p1: { 1: 4 },
      p2: { 1: 5 }, // gross 5 - 1 stroke = net 4 → tie with p1
    });

    const result = calculateSkinsResults([fs], holes, 5);
    expect(result.holes[0].skinAwarded).toBe(false); // net tie
    expect(result.holes[0].allNetScores['p1']).toBe(4);
    expect(result.holes[0].allNetScores['p2']).toBe(4);
  });
});
