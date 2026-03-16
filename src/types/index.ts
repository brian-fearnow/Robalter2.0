// --- GHIN Lookup ---

export interface GhinGolfer {
  first_name: string;
  last_name: string;
  ghin: string;
  handicap_index: string;
  club_name: string;
  state: string;
  association_name?: string;
}

// --- Core Domain Interfaces ---

export interface Tee {
  name: string;
  rating: number;
  slope: number;
}

export interface Hole {
  number: number;
  par: number;
  handicap: number;
}

export interface Course {
  id: string;
  name: string;
  holes: Hole[];
  tees: Tee[];
}

export interface Player {
  id: string;
  name: string;
  index: number;
  indexInput: string;
  selectedTeeIndex: number;
  courseHandicap: number;
  manualRelativeStrokes: number;
}

export interface Partner {
  name: string;
  index: number;
  indexInput: string;
  selectedTeeIndex: number;
  ghin?: string;
}

export interface Score {
  [playerId: string]: { [holeNumber: number]: number };
}

export interface Press {
  id: number;
  startHole: number;
  score: number;
  holeByHole?: HoleAuditEntry[];
}

export interface MatchSegment {
  segment: number;
  team1: string[];
  team2: string[];
}

export interface IndependentMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  type: '18-hole' | 'nassau';
  stake: number;
  stake9?: number;
  stake18?: number;
  pressStake?: number;
  pressStake9?: number;
  pressStake18?: number;
  useAutoPress: boolean;
  autoPressTrigger?: '2-down' | 'closed-out';
  manualStrokes?: number;
}

export interface IndependentManualPresses {
  [matchId: string]: {
    overall: number[];
    front: number[];
    back: number[];
  };
}

export interface FourBallStakes {
  type: '18-hole' | 'nassau';
  mainFront: number;
  pressFront: number;
  mainBack: number;
  pressBack: number;
  mainOverall: number;
  pressOverall: number;
}

export interface GameSettings {
  strokeAllocation: 'divided' | 'handicap';
  remainderLogic: 'standard' | 'alwaysHalf';
  useSecondBallTieBreaker: boolean;
  useAutoPress: boolean;
  autoPressTrigger: '2-down' | 'closed-out';
  useBaseballBirdieRule: boolean;
  baseballBirdieRuleType: 'gross' | 'net';
  useBaseballDoubleBackNine: boolean;
  useManualStrokes: boolean;
}

// --- Audit / Result Interfaces ---

export interface HoleAuditEntry {
  hole: number;
  t1Net: number;
  t2Net: number;
  t1Gross?: number;
  t2Gross?: number;
  running: number;
  isTieBreaker?: boolean;
}

export interface IndHoleAuditEntry {
  hole: number;
  p1Net: number;
  p2Net: number;
  p1Gross?: number;
  p2Gross?: number;
  running: number;
}

export interface PressResult {
  startHole: number;
  score: number;
  payout: number;
  display: string;
  label?: string;
  holeByHole?: HoleAuditEntry[] | IndHoleAuditEntry[];
}

export interface MatchResult {
  main: number;
  presses: Press[];
  holeByHole: HoleAuditEntry[];
}

export interface IndMatchSideResult {
  score: number;
  payout: number;
  presses: IndPressResult[];
  holeByHole: IndHoleAuditEntry[];
}

export interface IndPressResult {
  startHole: number;
  score: number;
  payout: number;
  display: string;
  label?: string;
  holeByHole: IndHoleAuditEntry[];
}

export interface IndependentMatchResult {
  payout: number;
  display: string;
  overall: IndMatchSideResult;
  front?: IndMatchSideResult;
  back?: IndMatchSideResult;
  pressDetail: Array<IndPressResult & { label: string }>;
}

export interface FourBallSideResult {
  score: number;
  payout: number;
  presses: Press[];
  holeByHole: HoleAuditEntry[];
}

export interface FourBallResult {
  winnings: Record<string, number>;
  front: FourBallSideResult | null;
  back: FourBallSideResult | null;
  overall: FourBallSideResult | null;
}

export interface BaseballTotals {
  points: [number, number, number];
  frontPoints: [number, number, number];
  backPoints: [number, number, number];
  payouts: [number, number, number];
}

export interface SegmentFullResult {
  main: number;
  presses: Press[];
  winnings: Record<string, number>;
  matches: Array<{ opponent: string[]; result: MatchResult }>;
}

export type GameMode = 'sixes' | 'wheel' | 'four-ball' | 'baseball' | 'independent';
export type ActiveTab = 'setup' | 'scores' | 'results' | 'rules';
