import type { Player, Score } from './index';

// --- Firebase-persisted structures ---

export interface SkinsRoundMetadata {
  code: string;
  courseId: string;
  courseName: string;
  buyIn: number;                   // flat entry fee per participating player
  useHalfStrokes: boolean;         // when true, each stroke is worth 0.5
  useManualSkinsStrokes: boolean;  // when true, use player.manualRelativeStrokes instead of courseHandicap
  createdAt: number;          // Unix timestamp (ms)
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
  allNetScores: Record<string, number>;   // playerId → net score (only players with scores)
  lowNet: number | null;                   // null if no scores entered yet
  winners: string[];                       // playerIds with low net (>1 = tie)
  skinAwarded: boolean;                    // false on a tie
}

export interface SkinsPlayerResult {
  uniqueId: string;         // compound key: "${foursomeId}:${playerId}" — globally unique across foursomes
  playerId: string;         // local player ID (e.g. '1', '2') — used to match the main app's totals
  foursomeId: string;       // Firebase push key for the player's foursome
  name: string;
  foursomeLabel: string;
  skinsWon: number;
  totalPayout: number;      // skinsWon × payoutPerSkin
}

export interface SkinsResult {
  holes: SkinsHoleResult[];
  players: SkinsPlayerResult[];
  totalSkinsAwarded: number;
  totalPot: number;           // buyIn × total participants
  payoutPerSkin: number;      // totalPot / totalSkinsAwarded (0 if none awarded yet)
  isComplete: boolean;        // all 18 holes have at least one score
}

// --- Hook / connection state ---

export type SkinsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
