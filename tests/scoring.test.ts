import { describe, it, expect } from 'vitest';
import { calculateBaseballPoints } from '../src/utils/scoring';
import type { Player, Score, Hole, GameSettings } from '../src/types';
import { calculateCourseHandicap } from '../src/utils/handicap';

// --- Fixtures ---
const blueTee = { name: 'Blue', rating: 72.0, slope: 135 };

const meadowHoles: Hole[] = [
  { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 9 }, { number: 3, par: 4, handicap: 1 },
  { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 15 }, { number: 6, par: 4, handicap: 7 },
  { number: 7, par: 4, handicap: 5 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 3 },
  { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 16 },
  { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 4 }, { number: 15, par: 5, handicap: 10 },
  { number: 16, par: 4, handicap: 14 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 8 },
];

const defaultSettings: GameSettings = {
  strokeAllocation: 'divided',
  remainderLogic: 'standard',
  useSecondBallTieBreaker: true,
  useAutoPress: true,
  autoPressTrigger: '2-down',
  useBaseballBirdieRule: false,
  baseballBirdieRuleType: 'gross',
  useBaseballDoubleBackNine: false,
  useManualStrokes: false,
};

const makePlayer = (id: string, name: string, handicapIndex: number): Player => {
  const courseHandicap = calculateCourseHandicap(handicapIndex, blueTee);
  return { id, name, index: handicapIndex, indexInput: String(handicapIndex), selectedTeeIndex: 0, courseHandicap, manualRelativeStrokes: 0 };
};

// All equal CH — baseline = min(CH), all relative = 0 — strokes = 0 for everyone
const p1 = makePlayer('1', 'Alice', 10);
const p2 = makePlayer('2', 'Bob', 10);
const p3 = makePlayer('3', 'Carol', 10);
const playerIds: [string, string, string] = ['1', '2', '3'];
const activePlayers = [p1, p2, p3];
const baselineCH = Math.min(p1.courseHandicap, p2.courseHandicap, p3.courseHandicap);

// Helper: score on hole 3 (par 4, hdcp 1)
const scoreFor = (s1: number, s2: number, s3: number): Score => ({
  '1': { 3: s1 },
  '2': { 3: s2 },
  '3': { 3: s3 },
});

// --- Tests ---
describe('calculateBaseballPoints - distinct scores', () => {
  it('distributes 5-3-1 for distinct net scores', () => {
    // All equal CH, no strokes. Net = Gross.
    const scores = scoreFor(3, 4, 5); // Alice best, Bob mid, Carol worst
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([5, 3, 1]);
  });

  it('assigns 5-3-1 when player order is different', () => {
    const scores = scoreFor(5, 3, 4); // Bob best (3), Carol mid (4), Alice worst (5)
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([1, 5, 3]);
  });
});

describe('calculateBaseballPoints - tie for first', () => {
  it('distributes 4-4-1 when two players tie for first', () => {
    const scores = scoreFor(3, 3, 5); // Alice and Bob tie best (3), Carol worst (5)
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([4, 4, 1]);
  });
});

describe('calculateBaseballPoints - tie for second', () => {
  it('distributes 5-2-2 when two players tie for second', () => {
    const scores = scoreFor(3, 5, 5); // Alice best (3), Bob and Carol tie for 2nd (5)
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([5, 2, 2]);
  });
});

describe('calculateBaseballPoints - three-way tie', () => {
  it('distributes 3-3-3 for a three-way tie', () => {
    const scores = scoreFor(4, 4, 4); // All tie
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([3, 3, 3]);
  });
});

describe('calculateBaseballPoints - birdie rule', () => {
  it('gives all 9 points to birdie winner when others have bogey+', () => {
    const birdieSettings: GameSettings = {
      ...defaultSettings,
      useBaseballBirdieRule: true,
      baseballBirdieRuleType: 'gross',
    };
    // Hole 3: par 4. Birdie = 3. Bogey = 5.
    // Alice: 3 (birdie), Bob: 5 (bogey), Carol: 5 (bogey)
    const scores = scoreFor(3, 5, 5);
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, birdieSettings, activePlayers, baselineCH);
    expect(result).toEqual([9, 0, 0]);
  });

  it('does NOT trigger birdie rule when winner only has par (not birdie)', () => {
    const birdieSettings: GameSettings = {
      ...defaultSettings,
      useBaseballBirdieRule: true,
      baseballBirdieRuleType: 'gross',
    };
    // Hole 3: par 4. Winner has par (4), not birdie. Birdie rule should not fire.
    const scores = scoreFor(4, 5, 6);
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, birdieSettings, activePlayers, baselineCH);
    // Falls back to 5-3-1
    expect(result).toEqual([5, 3, 1]);
  });

  it('does NOT trigger birdie rule when another player also made par (not bogey)', () => {
    const birdieSettings: GameSettings = {
      ...defaultSettings,
      useBaseballBirdieRule: true,
      baseballBirdieRuleType: 'gross',
    };
    // Hole 3: par 4. Alice: 3 (birdie), Bob: 4 (par - not bogey+), Carol: 5 (bogey)
    // Birdie rule requires ALL others to be bogey or worse
    const scores = scoreFor(3, 4, 5);
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, birdieSettings, activePlayers, baselineCH);
    // Falls back to 5-3-1 since Bob has par (not bogey)
    expect(result).toEqual([5, 3, 1]);
  });

  it('returns [0,0,0] when no scores entered', () => {
    const scores: Score = {};
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([0, 0, 0]);
  });
});

describe('calculateBaseballPoints - press logic edge cases', () => {
  it('handles players in different scoring positions correctly', () => {
    // Carol best (3), Alice mid (4), Bob worst (6)
    const scores = scoreFor(4, 6, 3);
    const result = calculateBaseballPoints(3, playerIds, scores, meadowHoles, defaultSettings, activePlayers, baselineCH);
    expect(result).toEqual([3, 1, 5]);
  });
});
