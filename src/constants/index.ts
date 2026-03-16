import type { Course, Hole, Player, GameSettings, FourBallStakes, MatchSegment } from '../types';

// --- Numeric Constants ---
export const HOLES_PER_ROUND = 18;
export const HOLES_PER_SEGMENT = 6;
export const NUM_SEGMENTS = 3;
export const MAX_PLAYERS = 5;
export const MAX_BASEBALL_PLAYERS = 3;
export const STANDARD_SLOPE = 113;
export const STANDARD_PAR = 71;
export const BASEBALL_TOTAL_POINTS = 9;
export const BASEBALL_POINTS_WIN = 5;
export const BASEBALL_POINTS_MID = 3;
export const BASEBALL_POINTS_LOSE = 1;
export const BASEBALL_POINTS_TIE_FIRST = 4;
export const BASEBALL_POINTS_TIE_SECOND = 2;
export const BASEBALL_POINTS_THREE_WAY = 3;

// --- Default Holes ---
export const DEFAULT_HOLES: Hole[] = Array.from({ length: HOLES_PER_ROUND }, (_, i) => ({
  number: i + 1,
  par: 4,
  handicap: i + 1,
}));

// --- Course Data ---
export const MEADOW_CLUB: Course = {
  id: 'meadow-club',
  name: 'Meadow Club',
  holes: [
    { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 9 }, { number: 3, par: 4, handicap: 1 },
    { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 15 }, { number: 6, par: 4, handicap: 7 },
    { number: 7, par: 4, handicap: 5 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 3 },
    { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 16 },
    { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 4 }, { number: 15, par: 5, handicap: 10 },
    { number: 16, par: 4, handicap: 14 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 8 },
  ],
  tees: [
    { name: 'Black', rating: 72.8, slope: 136 },
    { name: 'Blue', rating: 72.0, slope: 135 },
    { name: 'White', rating: 70.6, slope: 132 },
    { name: 'Gold', rating: 69.5, slope: 128 },
  ],
};

export const MEADOW_CLUB_NEW: Course = {
  id: 'meadow-club-new',
  name: 'Meadow Club (new scorecard)',
  holes: [
    { number: 1, par: 5, handicap: 15 }, { number: 2, par: 4, handicap: 7 }, { number: 3, par: 4, handicap: 5 },
    { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 13 }, { number: 6, par: 4, handicap: 3 },
    { number: 7, par: 4, handicap: 1 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 9 },
    { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 14 },
    { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 8 }, { number: 15, par: 5, handicap: 4 },
    { number: 16, par: 4, handicap: 16 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 10 },
  ],
  tees: [
    { name: 'Black', rating: 72.3, slope: 132 },
    { name: 'Blue', rating: 71.6, slope: 129 },
    { name: 'Blue/White', rating: 70.8, slope: 127 },
    { name: 'White', rating: 70.2, slope: 125 },
  ],
};

export const OLYMPIC_LAKE: Course = {
  id: 'olympic-lake',
  name: 'Olympic Club (Lake)',
  holes: [
    { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 5 }, { number: 3, par: 3, handicap: 11 },
    { number: 4, par: 4, handicap: 7 }, { number: 5, par: 4, handicap: 1 }, { number: 6, par: 4, handicap: 3 },
    { number: 7, par: 4, handicap: 17 }, { number: 8, par: 3, handicap: 15 }, { number: 9, par: 4, handicap: 9 },
    { number: 10, par: 4, handicap: 10 }, { number: 11, par: 4, handicap: 4 }, { number: 12, par: 4, handicap: 8 },
    { number: 13, par: 3, handicap: 16 }, { number: 14, par: 4, handicap: 6 }, { number: 15, par: 3, handicap: 18 },
    { number: 16, par: 5, handicap: 2 }, { number: 17, par: 5, handicap: 14 }, { number: 18, par: 4, handicap: 12 },
  ],
  tees: [
    { name: 'Black', rating: 75.0, slope: 138 },
    { name: 'Blue/Black', rating: 74.0, slope: 136 },
    { name: 'Blue', rating: 73.2, slope: 134 },
    { name: 'Blue/White', rating: 72.4, slope: 132 },
    { name: 'White', rating: 71.8, slope: 130 },
  ],
};

// --- Easter Egg ---
export const CHAD_COMMENTS: string[] = [
  "Classic Chad... somehow that ball found the hole. Pure luck.",
  "Unbelievable. Another birdie for Chad. Does he ever miss a lucky break?",
  "Miracle at Meadow Club! Sarcastic applause ensues for Chad's lucky break.",
  "Did that hit a tree and kick in? Typical Chad luck.",
  "Chad with a birdie. Even Alister MacKenzie is shaking his head at that lucky bounce.",
  "The luckiest golfer in Fairfax strikes again. Unbelievable.",
  "How much did you pay the greenskeeper for that roll, Chad?",
];

// --- Storage Keys ---
export const STORAGE_KEYS = {
  GAME_MODE: 'robalter_gameMode',
  PLAYERS: 'robalter_players',
  SCORES: 'robalter_scores',
  MAIN_STAKE: 'robalter_mainStake',
  PRESS_STAKE: 'robalter_pressStake',
  BASEBALL_STAKE: 'robalter_baseballStake',
  FOUR_BALL_STAKES: 'robalter_fourBallStakes',
  SEGMENTS: 'robalter_segments',
  PARTNERS: 'robalter_partners',
  VISIBILITY: 'robalter_visibility',
  SETTINGS: 'robalter_gameSettings',
  COURSES: 'robalter_courses',
  SELECTED_COURSE: 'robalter_selectedCourseId',
  INDEPENDENT_MATCHES: 'robalter_independentMatches',
  MANUAL_PRESSES: 'robalter_manualPresses_v2',
  IND_MANUAL_PRESSES: 'robalter_indManualPresses',
} as const;

// --- Defaults ---
export const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '2', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '3', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '4', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '5', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
];

export const DEFAULT_SETTINGS: GameSettings = {
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

export const DEFAULT_FOUR_BALL_STAKES: FourBallStakes = {
  type: 'nassau',
  mainFront: 10,
  pressFront: 5,
  mainBack: 10,
  pressBack: 5,
  mainOverall: 10,
  pressOverall: 5,
};

export const DEFAULT_SEGMENTS: MatchSegment[] = [
  { segment: 1, team1: [], team2: [] },
  { segment: 2, team1: [], team2: [] },
  { segment: 3, team1: [], team2: [] },
];

export const DEFAULT_MANUAL_PRESSES: { [seg: number]: { [matchIdx: number]: number[] } } = {
  0: { 0: [] },
  1: { 0: [] },
  2: { 0: [] },
};

export const PERMANENT_COURSE_IDS = ['meadow-club', 'meadow-club-new', 'olympic-lake'] as const;
