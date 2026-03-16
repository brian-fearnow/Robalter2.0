/**
 * Pure scoring calculation utilities.
 * No React hooks or state access — all parameters are passed explicitly.
 */

import type {
  Player,
  Score,
  Hole,
  GameSettings,
  GameMode,
  IndependentMatch,
  IndependentManualPresses,
  FourBallStakes,
  MatchSegment,
  Press,
  HoleAuditEntry,
  IndHoleAuditEntry,
  IndPressResult,
  IndMatchSideResult,
  IndependentMatchResult,
  FourBallSideResult,
  FourBallResult,
  MatchResult,
  SegmentFullResult,
  BaseballTotals,
} from '../types';
import {
  BASEBALL_POINTS_WIN,
  BASEBALL_POINTS_MID,
  BASEBALL_POINTS_LOSE,
  BASEBALL_POINTS_TIE_FIRST,
  BASEBALL_POINTS_TIE_SECOND,
  BASEBALL_POINTS_THREE_WAY,
  BASEBALL_TOTAL_POINTS,
} from '../constants';
import { getStrokesForHole, getIndependentStrokesForHole } from './handicap';

/** Helper: get net score for a player on a hole */
const getNetScore = (
  pId: string,
  hNum: number,
  scores: Score,
  activePlayers: Player[],
  courseHoles: Hole[],
  settings: GameSettings,
  gameMode: GameMode,
  baselineCH: number,
): number | null => {
  const g = scores[pId]?.[hNum];
  if (!g) return null;
  return g - getStrokesForHole(pId, hNum, activePlayers, courseHoles, settings, gameMode, baselineCH);
};

/**
 * Calculates point distribution for a single 3-player Baseball hole.
 * Returns [p1Points, p2Points, p3Points].
 */
export const calculateBaseballPoints = (
  holeNumber: number,
  playerIds: [string, string, string],
  scores: Score,
  courseHoles: Hole[],
  settings: GameSettings,
  activePlayers: Player[],
  baselineCH: number,
): [number, number, number] => {
  const hole = courseHoles.find(h => h.number === holeNumber);
  if (!hole) return [0, 0, 0];

  const playerGrossScores = playerIds.map(id => scores[id]?.[holeNumber]);
  const playerNetScores = playerIds.map(id =>
    getNetScore(id, holeNumber, scores, activePlayers, courseHoles, settings, 'baseball', baselineCH)
  );

  if (playerNetScores.some(s => s === null)) return [0, 0, 0];
  const nets = playerNetScores as number[];

  // Birdie Rule: one player wins all 9 pts if birdie/better and others bogey/worse
  if (settings.useBaseballBirdieRule) {
    const scoresToEvaluate = settings.baseballBirdieRuleType === 'gross' ? playerGrossScores : nets;
    const winnerIndex = scoresToEvaluate.findIndex((score, playerIdx) => {
      if (score === undefined || score === null) return false;
      if (score > (hole.par - 1)) return false;
      return nets.every((netScore, otherIdx) => playerIdx === otherIdx || netScore >= (hole.par + 1));
    });
    if (winnerIndex !== -1) {
      const dist: [number, number, number] = [0, 0, 0];
      dist[winnerIndex] = BASEBALL_TOTAL_POINTS;
      return dist;
    }
  }

  const sortedNets = [...nets].sort((a, b) => a - b);
  const [bestNet, middleNet, worstNet] = sortedNets;

  if (bestNet === middleNet && middleNet === worstNet) {
    return [BASEBALL_POINTS_THREE_WAY, BASEBALL_POINTS_THREE_WAY, BASEBALL_POINTS_THREE_WAY];
  }

  if (bestNet === middleNet) {
    return nets.map(s => s === bestNet ? BASEBALL_POINTS_TIE_FIRST : BASEBALL_POINTS_LOSE) as [number, number, number];
  }

  if (middleNet === worstNet) {
    return nets.map(s => s === middleNet ? BASEBALL_POINTS_TIE_SECOND : BASEBALL_POINTS_WIN) as [number, number, number];
  }

  return nets.map(s => s === bestNet ? BASEBALL_POINTS_WIN : s === middleNet ? BASEBALL_POINTS_MID : BASEBALL_POINTS_LOSE) as [number, number, number];
};

/**
 * Aggregates baseball points and payouts across all 18 holes.
 */
export const getBaseballTotals = (
  playerIds: [string, string, string],
  scores: Score,
  courseHoles: Hole[],
  settings: GameSettings,
  activePlayers: Player[],
  baselineCH: number,
  baseballStake: number,
): BaseballTotals => {
  const totalPoints: [number, number, number] = [0, 0, 0];
  const frontNinePoints: [number, number, number] = [0, 0, 0];
  const backNinePoints: [number, number, number] = [0, 0, 0];

  for (let holeNum = 1; holeNum <= 18; holeNum++) {
    let holePoints = calculateBaseballPoints(holeNum, playerIds, scores, courseHoles, settings, activePlayers, baselineCH);

    if (holeNum <= 9) {
      holePoints.forEach((pts, idx) => { frontNinePoints[idx] += pts; });
    }

    if (holeNum >= 10 && settings.useBaseballDoubleBackNine) {
      holePoints = holePoints.map(pts => pts * 2) as [number, number, number];
    }

    if (holeNum >= 10) {
      holePoints.forEach((pts, idx) => { backNinePoints[idx] += pts; });
    }

    holePoints.forEach((pts, idx) => { totalPoints[idx] += pts; });
  }

  const [pts1, pts2, pts3] = totalPoints;
  const payouts: [number, number, number] = [
    (pts1 - pts2) * baseballStake + (pts1 - pts3) * baseballStake,
    (pts2 - pts1) * baseballStake + (pts2 - pts3) * baseballStake,
    (pts3 - pts1) * baseballStake + (pts3 - pts2) * baseballStake,
  ];

  return { points: totalPoints, frontPoints: frontNinePoints, backPoints: backNinePoints, payouts };
};

/**
 * Calculates a single 2-on-2 match (Sixes or Wheel segment).
 */
export const calculateWheelMatch = (
  wheelTeamIds: string[],
  opponentTeamIds: string[],
  holeList: number[],
  segmentIndex: number,
  matchIdx: number,
  scores: Score,
  activePlayers: Player[],
  courseHoles: Hole[],
  settings: GameSettings,
  baselineCH: number,
  manualPresses: { [seg: number]: { [matchIdx: number]: number[] } },
  gameMode: GameMode,
): MatchResult => {
  let matchScore = 0;
  let presses: Press[] = [];
  const holeByHoleAudit: HoleAuditEntry[] = [];

  const getNet = (pId: string, hNum: number) =>
    getNetScore(pId, hNum, scores, activePlayers, courseHoles, settings, gameMode, baselineCH);

  // Initialize with manual presses
  (manualPresses[segmentIndex]?.[matchIdx] || []).forEach(h => {
    presses.push({ id: Date.now() + h, startHole: h, score: 0, holeByHole: [] });
  });

  holeList.forEach((holeNumber, indexInList) => {
    const teamNet1 = getNet(wheelTeamIds[0], holeNumber);
    const teamNet2 = getNet(wheelTeamIds[1], holeNumber);
    const oppNet1 = getNet(opponentTeamIds[0], holeNumber);
    const oppNet2 = getNet(opponentTeamIds[1], holeNumber);

    if (teamNet1 === null || oppNet1 === null) return;

    const wheelBestBall = Math.min(teamNet1, teamNet2 ?? 999);
    const opponentBestBall = Math.min(oppNet1, oppNet2 ?? 999);

    const teamGross1 = scores[wheelTeamIds[0]]?.[holeNumber];
    const teamGross2 = scores[wheelTeamIds[1]]?.[holeNumber];
    const oppGross1 = scores[opponentTeamIds[0]]?.[holeNumber];
    const oppGross2 = scores[opponentTeamIds[1]]?.[holeNumber];
    const wheelBestGross = teamNet1 === wheelBestBall ? teamGross1 : teamGross2;
    const opponentBestGross = oppNet1 === opponentBestBall ? oppGross1 : oppGross2;

    const updateScore = (current: number) =>
      wheelBestBall < opponentBestBall ? current + 1 : opponentBestBall < wheelBestBall ? current - 1 : current;

    matchScore = updateScore(matchScore);

    presses = presses.map(press => {
      if (holeNumber < press.startHole) return press;
      const newPressScore = updateScore(press.score);
      const pressAudit: HoleAuditEntry[] = [
        ...(press.holeByHole as HoleAuditEntry[] || []),
        { hole: holeNumber, t1Net: wheelBestBall, t2Net: opponentBestBall, t1Gross: wheelBestGross, t2Gross: opponentBestGross, running: newPressScore },
      ];
      return { ...press, score: newPressScore, holeByHole: pressAudit };
    });

    holeByHoleAudit.push({
      hole: holeNumber,
      t1Net: wheelBestBall,
      t2Net: opponentBestBall,
      t1Gross: wheelBestGross,
      t2Gross: opponentBestGross,
      running: matchScore,
    });

    const holesRemaining = holeList.length - (indexInList + 1);
    const lastPressScore = presses.length > 0 ? presses[presses.length - 1].score : matchScore;
    const isClosedOut = Math.abs(lastPressScore) > holesRemaining;
    const isTwoDown = Math.abs(lastPressScore) >= 2;
    const autoTriggered = settings.autoPressTrigger === 'closed-out' ? isClosedOut : isTwoDown;

    if (settings.useAutoPress && autoTriggered && holesRemaining > 0) {
      if (!presses.some(p => p.startHole === holeNumber + 1)) {
        presses.push({ id: Date.now() + indexInList, startHole: holeNumber + 1, score: 0, holeByHole: [] });
      }
    }

    // Tie-breaker on the final hole of the segment
    if (indexInList === 5 && matchScore === 0 && wheelBestBall === opponentBestBall && settings.useSecondBallTieBreaker) {
      const teamSecondBall = Math.max(teamNet1, teamNet2 ?? 999);
      const opponentSecondBall = Math.max(oppNet1, oppNet2 ?? 999);
      if (teamSecondBall < opponentSecondBall) matchScore++;
      else if (opponentSecondBall < teamSecondBall) matchScore--;

      if (holeByHoleAudit.length > 0) {
        holeByHoleAudit[holeByHoleAudit.length - 1].running = matchScore;
        holeByHoleAudit[holeByHoleAudit.length - 1].isTieBreaker = true;
      }
    }
  });

  return { main: matchScore, presses, holeByHole: holeByHoleAudit };
};

/**
 * Calculates a single Nassau side for Four Ball.
 */
export const calculateNassauSide = (
  holeList: number[],
  sideMainStake: number,
  sidePressStake: number,
  legIndex: number,
  team1Ids: string[],
  team2Ids: string[],
  scores: Score,
  activePlayers: Player[],
  courseHoles: Hole[],
  settings: GameSettings,
  baselineCH: number,
  manualPresses: { [seg: number]: { [matchIdx: number]: number[] } },
  gameMode: GameMode,
): FourBallSideResult => {
  let matchScore = 0;
  let presses: Press[] = [];
  const holeByHoleAudit: HoleAuditEntry[] = [];

  const getNet = (pId: string, hNum: number) =>
    getNetScore(pId, hNum, scores, activePlayers, courseHoles, settings, gameMode, baselineCH);

  // Initialize with manual presses
  (manualPresses[0]?.[legIndex] || []).forEach(h =>
    presses.push({ id: Date.now() + h, startHole: h, score: 0, holeByHole: [] })
  );

  holeList.forEach((holeNumber, indexInList) => {
    const playerNetScores = activePlayers.map(p => getNet(p.id, holeNumber));
    const team1NetScores = team1Ids.map(id => playerNetScores[activePlayers.findIndex(p => p.id === id)]);
    const team2NetScores = team2Ids.map(id => playerNetScores[activePlayers.findIndex(p => p.id === id)]);

    if (team1NetScores.some(s => s === null) || team2NetScores.some(s => s === null)) return;

    const team1BestBall = Math.min(...(team1NetScores.filter(s => s !== null) as number[]));
    const team2BestBall = Math.min(...(team2NetScores.filter(s => s !== null) as number[]));

    const team1BestIdx = team1NetScores.indexOf(team1BestBall);
    const team2BestIdx = team2NetScores.indexOf(team2BestBall);
    const team1Gross = scores[team1Ids[team1BestIdx]]?.[holeNumber];
    const team2Gross = scores[team2Ids[team2BestIdx]]?.[holeNumber];

    const updateScore = (current: number) =>
      team1BestBall < team2BestBall ? current + 1 : team2BestBall < team1BestBall ? current - 1 : current;

    matchScore = updateScore(matchScore);

    presses = presses.map(press => {
      if (holeNumber < press.startHole) return press;
      const newPressScore = updateScore(press.score);
      const pressAudit: HoleAuditEntry[] = [
        ...(press.holeByHole as HoleAuditEntry[] || []),
        { hole: holeNumber, t1Net: team1BestBall, t2Net: team2BestBall, t1Gross: team1Gross, t2Gross: team2Gross, running: newPressScore },
      ];
      return { ...press, score: newPressScore, holeByHole: pressAudit };
    });

    holeByHoleAudit.push({
      hole: holeNumber,
      t1Net: team1BestBall,
      t2Net: team2BestBall,
      t1Gross: team1Gross,
      t2Gross: team2Gross,
      running: matchScore,
    });

    // Tie-breaker on the final hole of the leg
    if (indexInList === holeList.length - 1 && matchScore === 0 && team1BestBall === team2BestBall && settings.useSecondBallTieBreaker) {
      const team1SecondBall = Math.max(...(team1NetScores.filter(s => s !== null) as number[]));
      const team2SecondBall = Math.max(...(team2NetScores.filter(s => s !== null) as number[]));
      if (team1SecondBall < team2SecondBall) matchScore++;
      else if (team2SecondBall < team1SecondBall) matchScore--;

      if (holeByHoleAudit.length > 0) {
        holeByHoleAudit[holeByHoleAudit.length - 1].running = matchScore;
        holeByHoleAudit[holeByHoleAudit.length - 1].isTieBreaker = true;
      }
    }

    const holesRemaining = holeList.length - (indexInList + 1);
    const lastPressScore = presses.length > 0 ? presses[presses.length - 1].score : matchScore;
    const isClosedOut = Math.abs(lastPressScore) > holesRemaining;
    const isTwoDown = Math.abs(lastPressScore) >= 2;
    const shouldAutoPress = settings.autoPressTrigger === 'closed-out' ? isClosedOut : isTwoDown;

    if (settings.useAutoPress && shouldAutoPress && holesRemaining > 0) {
      if (!presses.some(p => p.startHole === holeNumber + 1)) {
        presses.push({ id: Date.now() + indexInList, startHole: holeNumber + 1, score: 0, holeByHole: [] });
      }
    }
  });

  const sidePayout =
    (matchScore > 0 ? sideMainStake : matchScore < 0 ? -sideMainStake : 0) +
    presses.reduce((sum, press) => sum + (press.score > 0 ? sidePressStake : press.score < 0 ? -sidePressStake : 0), 0);

  return { score: matchScore, payout: sidePayout, presses, holeByHole: holeByHoleAudit };
};

/**
 * Calculates Four Ball full results (Nassau or 18-hole).
 */
export const calculateFourBallFull = (
  segments: MatchSegment[],
  activePlayers: Player[],
  scores: Score,
  courseHoles: Hole[],
  settings: GameSettings,
  baselineCH: number,
  fourBallStakes: FourBallStakes,
  manualPresses: { [seg: number]: { [matchIdx: number]: number[] } },
): FourBallResult => {
  const team1Ids = segments[0].team1;
  const team2Ids = segments[0].team2;
  const roundWinnings: Record<string, number> = {};
  activePlayers.forEach(player => { roundWinnings[player.id] = 0; });

  if (team1Ids.length < 2 || team2Ids.length < 2) {
    return { winnings: roundWinnings, front: null, back: null, overall: null };
  }

  const calcSide = (holeList: number[], main: number, press: number, legIdx: number) =>
    calculateNassauSide(holeList, main, press, legIdx, team1Ids, team2Ids, scores, activePlayers, courseHoles, settings, baselineCH, manualPresses, 'four-ball');

  if (fourBallStakes.type === '18-hole') {
    const overall = calcSide(Array.from({ length: 18 }, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);
    team1Ids.forEach(id => { roundWinnings[id] = overall.payout; });
    team2Ids.forEach(id => { roundWinnings[id] = -overall.payout; });
    return { winnings: roundWinnings, front: null, back: null, overall };
  } else {
    const front = calcSide(Array.from({ length: 9 }, (_, i) => i + 1), fourBallStakes.mainFront, fourBallStakes.pressFront, 0);
    const back = calcSide(Array.from({ length: 9 }, (_, i) => i + 10), fourBallStakes.mainBack, fourBallStakes.pressBack, 1);
    const overall = calcSide(Array.from({ length: 18 }, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);

    const totalWinnings = front.payout + back.payout + overall.payout;
    team1Ids.forEach(id => { roundWinnings[id] = totalWinnings; });
    team2Ids.forEach(id => { roundWinnings[id] = -totalWinnings; });

    return { winnings: roundWinnings, front, back, overall };
  }
};

/**
 * Calculates all matches and payouts for a 6-hole segment in Sixes or The Wheel.
 */
export const calculateSegmentFull = (
  segmentIndex: number,
  segments: MatchSegment[],
  activePlayers: Player[],
  scores: Score,
  courseHoles: Hole[],
  settings: GameSettings,
  baselineCH: number,
  mainStake: number,
  pressStake: number,
  manualPresses: { [seg: number]: { [matchIdx: number]: number[] } },
  gameMode: 'sixes' | 'wheel',
): SegmentFullResult => {
  const segment = segments[segmentIndex];
  const holesInSegment = Array.from({ length: 6 }, (_, i) => segmentIndex * 6 + 1 + i);
  const segmentWinnings: Record<string, number> = {};
  activePlayers.forEach(player => { segmentWinnings[player.id] = 0; });

  if (segment.team1.length < 2) {
    return { main: 0, presses: [], winnings: segmentWinnings, matches: [] };
  }

  if (gameMode === 'sixes') {
    const matchResult = calculateWheelMatch(
      segment.team1, segment.team2, holesInSegment, segmentIndex, 0,
      scores, activePlayers, courseHoles, settings, baselineCH, manualPresses, gameMode
    );
    const totalPayout =
      (matchResult.main > 0 ? mainStake : matchResult.main < 0 ? -mainStake : 0) +
      matchResult.presses.reduce((sum, press) => sum + (press.score > 0 ? pressStake : press.score < 0 ? -pressStake : 0), 0);

    activePlayers.forEach(player => {
      if (segment.team1.includes(player.id)) segmentWinnings[player.id] = totalPayout;
      else if (segment.team2.includes(player.id)) segmentWinnings[player.id] = -totalPayout;
    });

    return { ...matchResult, winnings: segmentWinnings, matches: [{ opponent: segment.team2, result: matchResult }] };
  } else {
    // The Wheel: 2-man team plays 3 matches against all pairs from 3-man pool
    const wheelOpponents = segment.team2;
    const opponentPairings = [
      [wheelOpponents[0], wheelOpponents[1]],
      [wheelOpponents[1], wheelOpponents[2]],
      [wheelOpponents[0], wheelOpponents[2]],
    ];

    const matchResultsList = opponentPairings.map((oppTeam, matchIdx) => ({
      opponent: oppTeam,
      result: calculateWheelMatch(
        segment.team1, oppTeam, holesInSegment, segmentIndex, matchIdx,
        scores, activePlayers, courseHoles, settings, baselineCH, manualPresses, gameMode
      ),
    }));

    matchResultsList.forEach(matchData => {
      const payout =
        (matchData.result.main > 0 ? mainStake : matchData.result.main < 0 ? -mainStake : 0) +
        matchData.result.presses.reduce((sum, press) => sum + (press.score > 0 ? pressStake : press.score < 0 ? -pressStake : 0), 0);

      segment.team1.forEach(id => { segmentWinnings[id] += payout; });
      matchData.opponent.forEach(id => { segmentWinnings[id] -= payout; });
    });

    return { main: 0, presses: [], winnings: segmentWinnings, matches: matchResultsList };
  }
};

/**
 * Calculates an independent head-to-head match result (18-hole or Nassau).
 */
export const calculateIndependentMatchResult = (
  match: IndependentMatch,
  activePlayers: Player[],
  scores: Score,
  courseHoles: Hole[],
  settings: GameSettings,
  _baselineCH: number,
  indManualPresses: IndependentManualPresses,
): IndependentMatchResult => {
  const allHoles = Array.from({ length: 18 }, (_, i) => i + 1);
  const matchManualPresses = indManualPresses[match.id] || { overall: [], front: [], back: [] };

  const p1N = activePlayers.find(pl => pl.id === match.player1Id)?.name?.split(' ')[0] || 'P1';
  const p2N = activePlayers.find(pl => pl.id === match.player2Id)?.name?.split(' ')[0] || 'P2';
  const formatUP = (score: number) => score === 0 ? 'AS' : `${score > 0 ? p1N : p2N} ${Math.abs(score)} UP`;
  const trigger = match.autoPressTrigger || settings.autoPressTrigger;

  const calculateSide = (
    hList: number[],
    sideMain: number,
    sidePress: number,
    manualHoles: number[],
  ): IndMatchSideResult => {
    let score = 0;
    let presses: IndPressResult[] = [];
    const holeByHole: IndHoleAuditEntry[] = [];

    (manualHoles || []).forEach(h =>
      presses.push({ startHole: h, score: 0, payout: 0, display: '', holeByHole: [] })
    );

    hList.forEach((h, i) => {
      const g1 = scores[match.player1Id]?.[h];
      const g2 = scores[match.player2Id]?.[h];
      if (g1 === undefined || g2 === undefined) return;

      const hs = getIndependentStrokesForHole(
        match.player1Id, match.player2Id, h, courseHoles, activePlayers, match.manualStrokes
      );
      const n1 = g1 - (hs > 0 ? hs : 0);
      const n2 = g2 - (hs < 0 ? Math.abs(hs) : 0);
      const diff = n1 - n2;
      const updateInd = (curr: number) => (diff < 0 ? curr + 1 : diff > 0 ? curr - 1 : curr);

      score = updateInd(score);
      presses = presses.map(p => {
        if (h < p.startHole) return p;
        const newScore = updateInd(p.score);
        const hbh: IndHoleAuditEntry[] = [
          ...(p.holeByHole || []),
          { hole: h, p1Net: n1, p2Net: n2, p1Gross: g1, p2Gross: g2, running: newScore },
        ];
        return { ...p, score: newScore, holeByHole: hbh };
      });
      holeByHole.push({ hole: h, p1Net: n1, p2Net: n2, p1Gross: g1, p2Gross: g2, running: score });

      const holesLeft = hList.length - (i + 1);
      const lastPressScore = presses.length > 0 ? presses[presses.length - 1].score : score;
      const isClosed = Math.abs(lastPressScore) > holesLeft;
      const isTwoDown = Math.abs(lastPressScore) >= 2;
      const autoTriggered = trigger === 'closed-out' ? isClosed : isTwoDown;

      if (match.useAutoPress && autoTriggered && holesLeft > 0) {
        if (trigger === '2-down' || isClosed) {
          if (!presses.some(p => p.startHole === h + 1)) {
            presses.push({ startHole: h + 1, score: 0, payout: 0, display: '', holeByHole: [] });
          }
        }
      }
    });

    presses = presses.map(p => ({
      ...p,
      payout: p.score > 0 ? sidePress : p.score < 0 ? -sidePress : 0,
      display: p.score === 0 ? 'AS' : `${p.score > 0 ? p1N : p2N} ${Math.abs(p.score)} UP`,
    }));

    const totalPresses = presses.reduce((sum, p) => sum + p.payout, 0);
    return {
      score,
      payout: (score > 0 ? sideMain : score < 0 ? -sideMain : 0) + totalPresses,
      presses,
      holeByHole,
    };
  };

  if (match.type === '18-hole') {
    const resO = calculateSide(allHoles, match.stake, match.pressStake ?? 5, matchManualPresses.overall);
    return {
      payout: resO.payout,
      overall: resO,
      display: formatUP(resO.score),
      pressDetail: resO.presses.map(p => ({ ...p, label: 'Overall' })),
    };
  } else {
    const front = calculateSide(allHoles.slice(0, 9), match.stake9 ?? 5, match.pressStake9 ?? 2, matchManualPresses.front);
    const back = calculateSide(allHoles.slice(9, 18), match.stake9 ?? 5, match.pressStake9 ?? 2, matchManualPresses.back);
    const overall = calculateSide(allHoles, match.stake18 ?? 10, match.pressStake18 ?? 5, matchManualPresses.overall);
    return {
      payout: front.payout + back.payout + overall.payout,
      front,
      back,
      overall,
      display: `Front 9: ${formatUP(front.score)} | Back 9: ${formatUP(back.score)} | Full 18: ${formatUP(overall.score)}`,
      pressDetail: [
        ...front.presses.map(p => ({ ...p, label: 'Front 9' })),
        ...back.presses.map(p => ({ ...p, label: 'Back 9' })),
        ...overall.presses.map(p => ({ ...p, label: 'Full 18' })),
      ],
    };
  }
};
