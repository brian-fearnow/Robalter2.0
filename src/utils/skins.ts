/**
 * Pure scoring utilities for Skins game mode.
 *
 * Rules:
 *  - Net score = gross − strokes, using full course handicap (baseline = 0).
 *  - A skin is awarded when exactly ONE player has the lowest net score on a hole.
 *  - Ties: no skin awarded on that hole. No carryover — each hole is worth exactly 1 skin.
 *  - Total pot = buyIn × number of participating players.
 *  - Payout per skin = totalPot / totalSkinsAwarded (equal share of pot per skin).
 */

import type { Hole, Player, Score, GameSettings } from '../types';
import type { SkinsFoursome, SkinsHoleResult, SkinsPlayerResult, SkinsResult } from '../types/skins';
import { getStrokesForHole } from './handicap';

// Skins always uses standard (non-divided) handicap allocation, baseline = 0.
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
  scores: Score | undefined,
  useHalfStrokes: boolean,
): number | null {
  if (!scores) return null;
  const gross = scores[playerId]?.[holeNumber];
  if (!gross) return null;
  const rawStrokes = getStrokesForHole(
    playerId,
    holeNumber,
    allPlayersInFoursome,
    courseHoles,
    SKINS_SETTINGS,
    'skins',
    0,
  );
  const strokes = useHalfStrokes ? rawStrokes * 0.5 : rawStrokes;
  return gross - strokes;
}

/** Returns the handicap strokes a player receives on a hole under skins rules (baseline = 0). */
export function getSkinsStrokesForHole(
  playerId: string,
  holeNumber: number,
  players: Player[],
  courseHoles: Hole[],
  useHalfStrokes: boolean,
): number {
  const rawStrokes = getStrokesForHole(playerId, holeNumber, players, courseHoles, SKINS_SETTINGS, 'skins', 0);
  return useHalfStrokes ? rawStrokes * 0.5 : rawStrokes;
}

export function calculateSkinsResults(
  foursomes: SkinsFoursome[],
  courseHoles: Hole[],
  buyIn: number,
  useHalfStrokes = false,
): SkinsResult {
  // Each entry carries a globally unique compound key to prevent collisions when
  // multiple foursomes share the same local player IDs ('1', '2', '3', etc.).
  const flatPlayers = foursomes.flatMap(fs =>
    fs.players
      .filter(p => p.name)
      .map(p => ({
        uniqueId: `${fs.id}:${p.id}`,   // compound key — unique across all foursomes
        player: p,
        foursomeId: fs.id,
        foursomeLabel: fs.label,
        scores: fs.scores ?? {},
        allPlayersInFoursome: fs.players,
      }))
  );

  const totalPot = buyIn * flatPlayers.length;

  // skinCounts and all per-hole maps are keyed by uniqueId.
  const skinCounts: Record<string, number> = {};
  for (const { uniqueId } of flatPlayers) {
    skinCounts[uniqueId] = 0;
  }

  const holeResults: SkinsHoleResult[] = [];

  for (const hole of courseHoles) {
    // Net scores compared across ALL foursomes — winner is lowest net among all participants.
    const netScores: Record<string, number> = {};
    for (const { uniqueId, player, allPlayersInFoursome, scores } of flatPlayers) {
      const net = getSkinsNetScore(player.id, hole.number, allPlayersInFoursome, courseHoles, scores, useHalfStrokes);
      if (net !== null) netScores[uniqueId] = net;
    }

    const scoredIds = Object.keys(netScores);

    if (scoredIds.length === 0) {
      holeResults.push({
        holeNumber: hole.number,
        par: hole.par,
        handicap: hole.handicap,
        allNetScores: {},
        lowNet: null,
        winners: [],
        skinAwarded: false,
      });
      continue;
    }

    const lowNet = Math.min(...scoredIds.map(id => netScores[id]));
    const winners = scoredIds.filter(id => netScores[id] === lowNet);
    const skinAwarded = winners.length === 1;

    if (skinAwarded) {
      skinCounts[winners[0]] += 1;
    }

    holeResults.push({
      holeNumber: hole.number,
      par: hole.par,
      handicap: hole.handicap,
      allNetScores: netScores,   // keyed by uniqueId
      lowNet,
      winners,                   // uniqueIds
      skinAwarded,
    });
  }

  const totalSkinsAwarded = Object.values(skinCounts).reduce((a, b) => a + b, 0);
  const payoutPerSkin = totalSkinsAwarded > 0 ? totalPot / totalSkinsAwarded : 0;

  const players: SkinsPlayerResult[] = flatPlayers.map(({ uniqueId, player, foursomeId, foursomeLabel }) => ({
    uniqueId,
    playerId: player.id,
    foursomeId,
    name: player.name,
    foursomeLabel,
    skinsWon: skinCounts[uniqueId] ?? 0,
    totalPayout: (skinCounts[uniqueId] ?? 0) * payoutPerSkin,
  }));

  return {
    holes: holeResults,
    players,
    totalSkinsAwarded,
    totalPot,
    payoutPerSkin,
    isComplete: holeResults.every(h => Object.keys(h.allNetScores).length > 0),
  };
}
