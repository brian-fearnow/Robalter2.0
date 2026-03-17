/**
 * Pure scoring utilities for Wolf game mode.
 * Uses full course handicap (baseline = 0) for all net score calculations.
 * Rotation: Wolf = player[(hole - 1) % numPlayers], tees off last each hole.
 *
 * Points per hole:
 *   2v2 win:        Wolf +1, Partner +1, Others -1 each
 *   Lone Wolf win:  Wolf +2, Others -1 each
 *   Blind Wolf win: Wolf +4, Others -2 each
 *   All losses are the mirror of the above.
 *   Tie: no points change.
 * Payout = total points × stake ($/pt).
 */

import type { Player, Score, Hole, WolfDecision, WolfHoleResult, WolfResult, GameSettings } from '../types';
import { getStrokesForHole } from './handicap';

const WOLF_SETTINGS: GameSettings = {
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

function getWolfNetScore(
  playerId: string,
  holeNumber: number,
  activePlayers: Player[],
  courseHoles: Hole[],
  scores: Score,
): number | null {
  const gross = scores[playerId]?.[holeNumber];
  if (!gross) return null;
  // baselineCH = 0: use full course handicap
  const strokes = getStrokesForHole(playerId, holeNumber, activePlayers, courseHoles, WOLF_SETTINGS, 'wolf', 0);
  return gross - strokes;
}

/** Returns the wolf player ID for a given hole number (1-based, cycles through playerIds). */
export function getWolfPlayerIdForHole(holeNumber: number, playerIds: string[]): string {
  return playerIds[(holeNumber - 1) % playerIds.length];
}

/**
 * Returns how many trailing holes use last-place-wolf rotation.
 * 4 players: 18 % 4 = 2 → holes 17–18
 * 3 players: 18 % 3 = 0 → falls back to n → holes 16–18
 */
export function getLastPlaceHoleCount(numPlayers: number): number {
  return (18 % numPlayers) || numPlayers;
}

/** Returns the player ID with the lowest running points (first in order on tie). */
function getLastPlacePlayerId(playerIds: string[], points: Record<string, number>): string {
  let minPts = Infinity;
  let lastId = playerIds[0];
  for (const pid of playerIds) {
    if ((points[pid] ?? 0) < minPts) {
      minPts = points[pid] ?? 0;
      lastId = pid;
    }
  }
  return lastId;
}

export function calculateWolfResults(
  activePlayers: Player[],
  scores: Score,
  wolfDecisions: Record<number, WolfDecision>,
  courseHoles: Hole[],
  stake: number,
  useLastPlaceWolf: boolean = false,
): WolfResult {
  const namedPlayers = activePlayers.filter(p => p.name);
  const playerIds = namedPlayers.map(p => p.id);
  const n = playerIds.length;

  // Determine which holes use last-place rotation
  const lastPlaceHoleCount = useLastPlaceWolf && n >= 3 ? getLastPlaceHoleCount(n) : 0;
  const firstLastPlaceHole = 19 - lastPlaceHoleCount;

  const totalPoints: Record<string, number> = {};
  for (const p of namedPlayers) totalPoints[p.id] = 0;

  const holeResults: WolfHoleResult[] = [];

  for (const hole of courseHoles) {
    // Determine wolf: last-place rule overrides rotation on qualifying holes
    const wolfId = useLastPlaceWolf && hole.number >= firstLastPlaceHole
      ? getLastPlacePlayerId(playerIds, totalPoints)
      : getWolfPlayerIdForHole(hole.number, playerIds);
    const decision = wolfDecisions[hole.number] ?? null;

    if (!decision) {
      holeResults.push({ holeNumber: hole.number, wolfPlayerId: wolfId, decision: null, wolfTeamWon: null, pointDeltas: {} });
      continue;
    }

    const nets: Record<string, number | null> = {};
    for (const pid of playerIds) {
      nets[pid] = getWolfNetScore(pid, hole.number, activePlayers, courseHoles, scores);
    }

    const isLoneWolf = decision.partnerId === null;
    const wolfTeam = isLoneWolf ? [wolfId] : [wolfId, decision.partnerId!];
    const oppTeam = playerIds.filter(id => !wolfTeam.includes(id));

    const wolfNets = wolfTeam.map(id => nets[id]).filter((n): n is number => n !== null);
    const oppNets = oppTeam.map(id => nets[id]).filter((n): n is number => n !== null);

    if (wolfNets.length === 0 || oppNets.length === 0) {
      holeResults.push({ holeNumber: hole.number, wolfPlayerId: wolfId, decision, wolfTeamWon: null, pointDeltas: {} });
      continue;
    }

    const wolfBest = Math.min(...wolfNets);
    const oppBest = Math.min(...oppNets);
    const wolfTeamWon = wolfBest < oppBest ? true : wolfBest > oppBest ? false : null;

    const deltas: Record<string, number> = {};
    for (const p of namedPlayers) deltas[p.id] = 0;

    if (wolfTeamWon !== null) {
      if (isLoneWolf) {
        const mult = decision.blindWolf ? 2 : 1;
        const wolfPts = mult * 2;  // lone wolf = 2 pts, blind wolf = 4 pts
        const oppPts = mult;       // lone wolf others = 1 pt, blind wolf others = 2 pts
        if (wolfTeamWon) {
          deltas[wolfId] = wolfPts;
          for (const id of oppTeam) deltas[id] = -oppPts;
        } else {
          deltas[wolfId] = -wolfPts;
          for (const id of oppTeam) deltas[id] = oppPts;
        }
      } else {
        const sign = wolfTeamWon ? 1 : -1;
        for (const id of wolfTeam) deltas[id] = sign;
        for (const id of oppTeam) deltas[id] = -sign;
      }
    }

    for (const [id, delta] of Object.entries(deltas)) {
      totalPoints[id] = (totalPoints[id] || 0) + delta;
    }

    holeResults.push({ holeNumber: hole.number, wolfPlayerId: wolfId, decision, wolfTeamWon, pointDeltas: deltas });
  }

  const payouts: Record<string, number> = {};
  for (const p of namedPlayers) {
    payouts[p.id] = (totalPoints[p.id] || 0) * stake;
  }

  return { holeResults, totalPoints, payouts };
}
