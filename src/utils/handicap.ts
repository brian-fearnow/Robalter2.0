/**
 * Pure handicap calculation utilities.
 * No React hooks or state access — all parameters are passed explicitly.
 */

import type { Tee, Hole, Player, GameSettings, GameMode } from '../types';
import { STANDARD_SLOPE, STANDARD_PAR } from '../constants';

/**
 * Calculates the Course Handicap based on Handicap Index, Tee Slope, and Tee Rating.
 * Formula: HI * (Slope / 113) + (Rating - 71)
 */
export const calculateCourseHandicap = (handicapIndex: number, tee: Tee): number =>
  Math.round(handicapIndex * (tee.slope / STANDARD_SLOPE) + (tee.rating - STANDARD_PAR));

/**
 * Calculates how many handicap strokes a player gets per 6-hole segment (Sixes/Wheel Divided allocation).
 */
export const getStrokesPerSixHoles = (
  player: Player,
  baselineCH: number,
  settings: GameSettings,
  gameMode: GameMode,
): number => {
  if (!player.name) return 0;

  const isTeamMode = gameMode === 'sixes' || gameMode === 'wheel';
  const isDividedAllocation = settings.strokeAllocation === 'divided';

  // Manual strokes enabled AND Sixes/Wheel AND Divided allocation: use manual entry directly
  if (settings.useManualStrokes && isTeamMode && isDividedAllocation) {
    return player.manualRelativeStrokes;
  }

  const relativeTotal = player.courseHandicap - baselineCH;
  const rawPerSix = relativeTotal / 3;
  const wholeStrokes = Math.floor(rawPerSix);

  if (settings.remainderLogic === 'standard') {
    return (rawPerSix - wholeStrokes) >= 0.5 ? wholeStrokes + 0.5 : wholeStrokes;
  }
  return (rawPerSix > wholeStrokes) ? wholeStrokes + 0.5 : wholeStrokes;
};

/**
 * Determines how many handicap strokes (full or half) a player gets on a specific hole.
 * Handles both 'divided' (Sixes/Wheel per-segment) and 'handicap' (standard ranking) allocations.
 */
export const getStrokesForHole = (
  playerId: string,
  holeNumber: number,
  activePlayers: Player[],
  courseHoles: Hole[],
  settings: GameSettings,
  gameMode: GameMode,
  baselineCH: number,
): number => {
  const player = activePlayers.find(p => p.id === playerId);
  if (!player || !player.name) return 0;

  const useManualOverride = settings.useManualStrokes;
  const isDividedAllocation = settings.strokeAllocation === 'divided';
  const isTeamMode = gameMode === 'sixes' || gameMode === 'wheel';

  // Determine total relative strokes
  const relativeTotal = (useManualOverride && (!isTeamMode || !isDividedAllocation))
    ? player.manualRelativeStrokes
    : player.courseHandicap - baselineCH;

  if (gameMode === 'four-ball' || gameMode === 'baseball' || !isDividedAllocation) {
    // Option A: Standard Handicap Ranking (strokes applied to hardest holes)
    const hole = courseHoles.find(h => h.number === holeNumber);
    if (!hole) return 0;

    const absoluteTotal = Math.abs(relativeTotal);
    const baseStrokesPerHole = Math.floor(absoluteTotal / 18);
    const remainderStrokes = absoluteTotal % 18;

    let strokes = baseStrokesPerHole;
    if (hole.handicap <= Math.floor(remainderStrokes)) {
      strokes += 1;
    } else if (hole.handicap === Math.floor(remainderStrokes) + 1 && (remainderStrokes % 1 !== 0)) {
      strokes += 0.5;
    }

    return relativeTotal >= 0 ? strokes : -strokes;
  } else {
    // Option B: Spread Evenly (divided per 6 holes)
    const strokesPerSix = getStrokesPerSixHoles(player, baselineCH, settings, gameMode);
    const segmentIndex = Math.floor((holeNumber - 1) / 6);
    const segmentHoles = courseHoles
      .slice(segmentIndex * 6, segmentIndex * 6 + 6)
      .sort((a, b) => a.handicap - b.handicap);
    const holeRankInSegment = segmentHoles.findIndex(h => h.number === holeNumber);

    const absoluteS6 = Math.abs(strokesPerSix);
    const baseStrokesPerHole = Math.floor(absoluteS6 / 6);
    const remainderStrokes = absoluteS6 % 6;

    let strokes = baseStrokesPerHole;
    if (holeRankInSegment < Math.floor(remainderStrokes)) {
      strokes += 1;
    } else if (holeRankInSegment === Math.floor(remainderStrokes) && remainderStrokes % 1 !== 0) {
      strokes += 0.5;
    }

    return strokesPerSix >= 0 ? strokes : -strokes;
  }
};

/**
 * Calculates handicap strokes given to Player 1 relative to Player 2 for a specific hole.
 * Positive = P1 receives strokes, Negative = P2 receives strokes.
 */
export const getIndependentStrokesForHole = (
  player1Id: string,
  player2Id: string,
  holeNumber: number,
  courseHoles: Hole[],
  activePlayers: Player[],
  manualStrokes?: number,
): number => {
  const player1 = activePlayers.find(p => p.id === player1Id);
  const player2 = activePlayers.find(p => p.id === player2Id);
  if (!player1 || !player2) return 0;

  const p1CH = player1.courseHandicap;
  const p2CH = player2.courseHandicap;
  const isP1HigherHandicap = p1CH > p2CH;
  const isEvenCH = p1CH === p2CH;

  let totalDifference = 0;
  let manualReverseRecipient = false;
  if (manualStrokes !== undefined) {
    totalDifference = Math.abs(manualStrokes);
    if (manualStrokes < 0) manualReverseRecipient = true;
  } else {
    totalDifference = Math.abs(p1CH - p2CH);
  }

  const hole = courseHoles.find(h => h.number === holeNumber);
  if (!hole) return 0;

  const basePerHole = Math.floor(totalDifference / 18);
  const remainderCount = totalDifference % 18;

  let strokes = basePerHole;
  if (hole.handicap <= Math.floor(remainderCount)) {
    strokes += 1;
  } else if (hole.handicap === Math.floor(remainderCount) + 1 && (remainderCount % 1 !== 0)) {
    strokes += 0.5;
  }

  let p1Receives = false;
  if (isEvenCH) {
    p1Receives = !(manualStrokes !== undefined && manualStrokes < 0);
  } else {
    p1Receives = manualReverseRecipient ? !isP1HigherHandicap : isP1HigherHandicap;
  }

  return p1Receives ? strokes : -strokes;
};
