/**
 * Pure scoring utilities for Book-It game mode.
 * Each player uses their full course handicap (not relative).
 */

import type { Player, Score, Hole, BookItResult, GameSettings } from '../types';
import { getStrokesForHole } from './handicap';

// Minimal settings: no manual overrides, handicap allocation (used for book-it stroke calc)
const BOOK_IT_SETTINGS: GameSettings = {
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

/**
 * Calculates the net score for a player on a specific hole in Book-It mode.
 * Uses the player's full course handicap (baseline = 0).
 */
export function getBookItNetForHole(
  playerId: string,
  holeNumber: number,
  activePlayers: Player[],
  courseHoles: Hole[],
  scores: Score,
): number | null {
  const gross = scores[playerId]?.[holeNumber];
  if (!gross) return null;
  // baselineCH = 0 so full course handicap is used (not relative)
  const strokes = getStrokesForHole(playerId, holeNumber, activePlayers, courseHoles, BOOK_IT_SETTINGS, 'book-it', 0);
  return gross - strokes;
}

/**
 * Calculates Book-It results: aggregate net scores over booked holes
 * and pairwise payouts.
 */
export function calculateBookItResults(
  activePlayers: Player[],
  scores: Score,
  bookedHoles: Record<string, number[]>,
  courseHoles: Hole[],
  stake: number,
): BookItResult {
  const netScores: Record<string, number> = {};
  const netToPar: Record<string, number> = {};

  for (const player of activePlayers) {
    if (!player.name) continue;
    const booked = bookedHoles[player.id] || [];
    let totalNet = 0;
    let totalPar = 0;
    for (const hNum of booked) {
      const net = getBookItNetForHole(player.id, hNum, activePlayers, courseHoles, scores);
      const hole = courseHoles.find(h => h.number === hNum);
      if (net !== null && hole) {
        totalNet += net;
        totalPar += hole.par;
      }
    }
    netScores[player.id] = totalNet;
    netToPar[player.id] = totalNet - totalPar;
  }

  // Pairwise payouts: for each pair, lower net-to-par wins the difference × stake
  const payouts: Record<string, number> = {};
  const namedPlayers = activePlayers.filter(p => p.name);
  for (const p of namedPlayers) payouts[p.id] = 0;

  for (let i = 0; i < namedPlayers.length; i++) {
    for (let j = i + 1; j < namedPlayers.length; j++) {
      const pi = namedPlayers[i];
      const pj = namedPlayers[j];
      const diff = netToPar[pj.id] - netToPar[pi.id];
      // diff > 0 means pi has a better (lower) score → pi wins
      const amount = Math.abs(diff) * stake;
      if (diff > 0) {
        payouts[pi.id] += amount;
        payouts[pj.id] -= amount;
      } else if (diff < 0) {
        payouts[pi.id] -= amount;
        payouts[pj.id] += amount;
      }
    }
  }

  return { netScores, netToPar, payouts };
}
