import { describe, it, expect } from 'vitest';
import { calculateCourseHandicap, getStrokesPerSixHoles, getStrokesForHole } from '../src/utils/handicap';
import type { Tee, Player, GameSettings, Hole } from '../src/types';

// --- Fixtures ---
const blueTee: Tee = { name: 'Blue', rating: 72.0, slope: 135 };
const whiteTee: Tee = { name: 'White', rating: 70.6, slope: 132 };

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

const makePlayer = (id: string, name: string, handicapIndex: number, tee: Tee): Player => {
  const courseHandicap = calculateCourseHandicap(handicapIndex, tee);
  return { id, name, index: handicapIndex, indexInput: String(handicapIndex), selectedTeeIndex: 0, courseHandicap, manualRelativeStrokes: 0 };
};

// --- calculateCourseHandicap ---
describe('calculateCourseHandicap', () => {
  it('calculates course handicap correctly for 10.0 index on Blue tee', () => {
    // 10.0 * (135 / 113) + (72.0 - 71) = 10.0 * 1.1947... + 1 = 12.947... → rounds to 13
    const result = calculateCourseHandicap(10.0, blueTee);
    expect(result).toBe(13);
  });

  it('calculates course handicap for 0-index player', () => {
    // 0 * (135 / 113) + (72.0 - 71) = 1 → rounds to 1
    const result = calculateCourseHandicap(0, blueTee);
    expect(result).toBe(1);
  });

  it('handles plus handicaps (negative index)', () => {
    // Plus handicap: stored as -2.0
    // -2.0 * (135 / 113) + (72.0 - 71) = -2.0 * 1.1947... + 1 = -2.389... + 1 = -1.389... → rounds to -1
    const result = calculateCourseHandicap(-2.0, blueTee);
    expect(result).toBe(-1);
  });

  it('calculates correctly for different tee (White)', () => {
    // 15.0 * (132 / 113) + (70.6 - 71) = 15.0 * 1.1681... - 0.4 = 17.522... - 0.4 = 17.122... → rounds to 17
    const result = calculateCourseHandicap(15.0, whiteTee);
    expect(result).toBe(17);
  });

  it('calculates for high handicap index', () => {
    // 30.0 * (135 / 113) + (72.0 - 71) = 30.0 * 1.1947... + 1 = 35.84 + 1 = 36.84 → rounds to 37
    const result = calculateCourseHandicap(30.0, blueTee);
    expect(result).toBe(37);
  });
});

// --- getStrokesPerSixHoles ---
describe('getStrokesPerSixHoles', () => {
  it('returns 0 for baseline player (0 relative strokes)', () => {
    const player = makePlayer('1', 'Alice', 10.0, blueTee);
    // baselineCH = player's own CH
    const result = getStrokesPerSixHoles(player, player.courseHandicap, defaultSettings, 'sixes');
    expect(result).toBe(0);
  });

  it('returns 0 for unnamed player', () => {
    const player = makePlayer('1', '', 10.0, blueTee);
    const result = getStrokesPerSixHoles(player, 13, defaultSettings, 'sixes');
    expect(result).toBe(0);
  });

  it('allocates 1 stroke per six when relative total = 3', () => {
    // CH 16 vs baseline CH 13 → relativeTotal = 3 → rawPerSix = 1 → result = 1
    const player = makePlayer('2', 'Bob', 12.0, blueTee); // CH ~16
    const baselineCH = player.courseHandicap - 3;
    const result = getStrokesPerSixHoles(player, baselineCH, defaultSettings, 'sixes');
    expect(result).toBe(1);
  });

  it('handles alwaysHalf remainder logic', () => {
    const settings: GameSettings = { ...defaultSettings, remainderLogic: 'alwaysHalf' };
    // relativeTotal = 1 → rawPerSix = 1/3 = 0.333 → wholeStrokes = 0 → alwaysHalf: 0 < 0.333 → 0.5
    const player = makePlayer('2', 'Bob', 12.0, blueTee);
    const baselineCH = player.courseHandicap - 1;
    const result = getStrokesPerSixHoles(player, baselineCH, settings, 'sixes');
    expect(result).toBe(0.5);
  });

  it('standard logic: returns 0.5 when rawPerSix fraction >= 0.5', () => {
    // relativeTotal = 2 → rawPerSix = 2/3 = 0.666 → fraction = 0.666 >= 0.5 → result = 0.5
    const player = makePlayer('2', 'Bob', 12.0, blueTee);
    const baselineCH = player.courseHandicap - 2;
    const result = getStrokesPerSixHoles(player, baselineCH, defaultSettings, 'sixes');
    expect(result).toBe(0.5);
  });

  it('returns manual strokes when useManualStrokes is enabled in sixes divided mode', () => {
    const player: Player = { ...makePlayer('2', 'Bob', 12.0, blueTee), manualRelativeStrokes: 1.5 };
    const settings: GameSettings = { ...defaultSettings, useManualStrokes: true };
    const result = getStrokesPerSixHoles(player, player.courseHandicap - 5, settings, 'sixes');
    expect(result).toBe(1.5);
  });
});

// --- getStrokesForHole ---
const meadowHoles: Hole[] = [
  { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 9 }, { number: 3, par: 4, handicap: 1 },
  { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 15 }, { number: 6, par: 4, handicap: 7 },
  { number: 7, par: 4, handicap: 5 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 3 },
  { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 16 },
  { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 4 }, { number: 15, par: 5, handicap: 10 },
  { number: 16, par: 4, handicap: 14 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 8 },
];

describe('getStrokesForHole', () => {
  it('returns 0 for unnamed player', () => {
    const player = makePlayer('1', '', 10.0, blueTee);
    const result = getStrokesForHole('1', 3, [player], meadowHoles, defaultSettings, 'four-ball', 0);
    expect(result).toBe(0);
  });

  it('gives stroke on hardest hole (hdcp 1) with 1 relative stroke in handicap mode', () => {
    // relativeTotal = 1 → 0 per hole base, remainder = 1 → stroke on hole hdcp <= 1 (hole 3)
    const settings: GameSettings = { ...defaultSettings, strokeAllocation: 'handicap' };
    const player = makePlayer('1', 'Alice', 10.0, blueTee);
    const result = getStrokesForHole('1', 3, [player], meadowHoles, settings, 'sixes', player.courseHandicap - 1);
    expect(result).toBe(1);
  });

  it('gives no stroke on easy hole (hdcp 17) with only 1 relative stroke', () => {
    const settings: GameSettings = { ...defaultSettings, strokeAllocation: 'handicap' };
    const player = makePlayer('1', 'Alice', 10.0, blueTee);
    const result = getStrokesForHole('1', 8, [player], meadowHoles, settings, 'sixes', player.courseHandicap - 1);
    expect(result).toBe(0);
  });

  it('returns negative strokes for plus-handicap player (giving strokes)', () => {
    const settings: GameSettings = { ...defaultSettings, strokeAllocation: 'handicap' };
    // Player has CH -1 vs baseline 0 → relativeTotal = -1 → gives stroke on hdcp 1 hole
    const player = makePlayer('1', 'Pro', -2.0, blueTee); // CH = -1
    const baselineCH = 0;
    const result = getStrokesForHole('1', 3, [player], meadowHoles, settings, 'four-ball', baselineCH);
    expect(result).toBe(-1);
  });
});
