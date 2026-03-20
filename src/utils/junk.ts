import type { JunkType, JunkDots, GameSettings, Player, Score, Hole } from '../types';

export const JUNK_LABELS: Record<JunkType | 'birdieEagle', string> = {
  greenie: 'Greenie',
  sandie: 'Sandie',
  birdieEagle: 'Birdie/Eagle',
  chippie: 'Chippie',
  barkie: 'Barkie',
  poley: 'Poley',
};

export const MANUAL_JUNK_TYPES: JunkType[] = ['greenie', 'sandie', 'chippie', 'barkie', 'poley'];

export function getBirdieEagleDots(playerId: string, holeNumber: number, scores: Score, holes: Hole[]): number {
  const gross = scores[playerId]?.[holeNumber];
  if (!gross) return 0;
  const hole = holes.find(h => h.number === holeNumber);
  if (!hole) return 0;
  const toPar = gross - hole.par;
  if (toPar <= -2) return 3; // eagle or better
  if (toPar === -1) return 1; // birdie
  return 0;
}

export interface JunkPlayerResult {
  playerId: string;
  totalDots: number;
  dotBreakdown: Partial<Record<JunkType | 'birdieEagle', number>>;
  netPayout: number;
}

export function calculateJunkResults(
  activePlayers: Player[],
  scores: Score,
  junkDots: JunkDots,
  holes: Hole[],
  settings: GameSettings,
): { playerResults: JunkPlayerResult[]; dotValue: number } {
  const { junkDotValue, junkTypes } = settings;
  const namedPlayers = activePlayers.filter(p => p.name);

  const breakdown: Record<string, Partial<Record<JunkType | 'birdieEagle', number>>> = {};
  namedPlayers.forEach(p => { breakdown[p.id] = {}; });

  // Count manual dots per hole
  for (let hole = 1; hole <= 18; hole++) {
    const holeJunk = junkDots[hole] || {};
    namedPlayers.forEach(p => {
      const types: JunkType[] = holeJunk[p.id] || [];
      types.forEach(type => {
        if (junkTypes[type]) {
          breakdown[p.id][type] = (breakdown[p.id][type] || 0) + 1;
        }
      });
    });
  }

  // Count auto birdie/eagle dots
  if (junkTypes.birdieEagle) {
    for (let hole = 1; hole <= 18; hole++) {
      namedPlayers.forEach(p => {
        const dots = getBirdieEagleDots(p.id, hole, scores, holes);
        if (dots > 0) {
          breakdown[p.id]['birdieEagle'] = (breakdown[p.id]['birdieEagle'] || 0) + dots;
        }
      });
    }
  }

  const playerResults: JunkPlayerResult[] = namedPlayers.map(p => ({
    playerId: p.id,
    totalDots: Object.values(breakdown[p.id]).reduce((s, n) => s + (n || 0), 0),
    dotBreakdown: breakdown[p.id],
    netPayout: 0,
  }));

  // Pairwise payouts
  for (let i = 0; i < playerResults.length; i++) {
    for (let j = i + 1; j < playerResults.length; j++) {
      const diff = playerResults[i].totalDots - playerResults[j].totalDots;
      playerResults[i].netPayout += diff * junkDotValue;
      playerResults[j].netPayout -= diff * junkDotValue;
    }
  }

  return { playerResults, dotValue: junkDotValue };
}
