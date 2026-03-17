import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Course,
  Player,
  Partner,
  Score,
  GameSettings,
  IndependentMatch,
  IndependentManualPresses,
  FourBallStakes,
  MatchSegment,
  GameMode,
  ActiveTab,
  IndependentMatchResult,
  FourBallResult,
  SegmentFullResult,
  BaseballTotals,
  BookItResult,
  WolfResult,
  WolfDecision,
} from '../types';
import {
  STORAGE_KEYS,
  DEFAULT_PLAYERS,
  DEFAULT_SETTINGS,
  DEFAULT_FOUR_BALL_STAKES,
  DEFAULT_SEGMENTS,
  DEFAULT_MANUAL_PRESSES,
  DEFAULT_HOLES,
  MEADOW_CLUB,
  MEADOW_CLUB_NEW,
  OLYMPIC_LAKE,
  CHAD_COMMENTS,
  PERMANENT_COURSE_IDS,
} from '../constants';
import { calculateCourseHandicap, getStrokesForHole, getStrokesPerSixHoles } from '../utils/handicap';
import {
  calculateBaseballPoints,
  getBaseballTotals,
  calculateWheelMatch,
  calculateNassauSide,
  calculateFourBallFull,
  calculateSegmentFull,
  calculateIndependentMatchResult,
} from '../utils/scoring';
import { calculateBookItResults, getBookItNetForHole } from '../utils/bookIt';
import { calculateWolfResults, getWolfPlayerIdForHole, getLastPlaceHoleCount } from '../utils/wolf';

// Re-export calculation functions for component use
export {
  calculateBaseballPoints,
  getBaseballTotals,
  calculateWheelMatch,
  calculateNassauSide,
  calculateFourBallFull,
  calculateSegmentFull,
  calculateIndependentMatchResult,
  calculateBookItResults,
  getBookItNetForHole,
  calculateWolfResults,
  getWolfPlayerIdForHole,
  getLastPlaceHoleCount,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useAppState() {
  // --- Course State ---
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
      let list: Course[] = saved ? JSON.parse(saved) : [MEADOW_CLUB, MEADOW_CLUB_NEW, OLYMPIC_LAKE];
      const upsert = (c: Course, index: number) => {
        const idx = list.findIndex((x: Course) => x.id === c.id);
        if (idx >= 0) list[idx] = c;
        else list.splice(index, 0, c);
      };
      upsert(MEADOW_CLUB, 0);
      upsert(MEADOW_CLUB_NEW, 1);
      upsert(OLYMPIC_LAKE, 2);
      return list;
    } catch {
      return [MEADOW_CLUB, MEADOW_CLUB_NEW, OLYMPIC_LAKE];
    }
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() =>
    localStorage.getItem(STORAGE_KEYS.SELECTED_COURSE) || MEADOW_CLUB.id
  );
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const selectedCourse = useMemo(
    () => courses.find(c => c.id === selectedCourseId) || courses[0] || MEADOW_CLUB,
    [courses, selectedCourseId]
  );

  // --- GHIN ---
  const [ghinToken, setGhinToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.GHIN_TOKEN)
  );
  const [ghinLookupPlayerId, setGhinLookupPlayerId] = useState<string | null>(null);

  const saveGhinToken = useCallback((token: string) => {
    localStorage.setItem(STORAGE_KEYS.GHIN_TOKEN, token);
    setGhinToken(token);
  }, []);

  const clearGhinToken = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.GHIN_TOKEN);
    setGhinToken(null);
  }, []);

  // --- Game Mode ---
  const [gameMode, setGameMode] = useState<GameMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
    return (saved as GameMode) || 'sixes';
  });

  // --- Players ---
  const [players, setPlayers] = useState<Player[]>(() =>
    loadJson(STORAGE_KEYS.PLAYERS, JSON.parse(JSON.stringify(DEFAULT_PLAYERS)) as Player[])
  );

  const [partners, setPartners] = useState<Partner[]>(() =>
    loadJson(STORAGE_KEYS.PARTNERS, [] as Partner[])
  );

  // --- Settings ---
  const [settings, setSettings] = useState<GameSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJson(STORAGE_KEYS.SETTINGS, {} as Partial<GameSettings>),
  }));

  // --- Independent Matches ---
  const [independentMatches, setIndependentMatches] = useState<IndependentMatch[]>(() =>
    loadJson(STORAGE_KEYS.INDEPENDENT_MATCHES, [] as IndependentMatch[])
  );

  // --- Manual Presses ---
  const [manualPresses, setManualPresses] = useState<{ [seg: number]: { [matchIdx: number]: number[] } }>(() =>
    loadJson(STORAGE_KEYS.MANUAL_PRESSES, { ...DEFAULT_MANUAL_PRESSES })
  );

  const [indManualPresses, setIndManualPresses] = useState<IndependentManualPresses>(() =>
    loadJson(STORAGE_KEYS.IND_MANUAL_PRESSES, {} as IndependentManualPresses)
  );

  // --- Scores & Stakes ---
  const [scores, setScores] = useState<Score>(() =>
    loadJson(STORAGE_KEYS.SCORES, {} as Score)
  );

  const [mainStake, setMainStake] = useState<number>(10);
  const [pressStake, setPressStake] = useState<number>(5);

  const [baseballStake, setBaseballStake] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BASEBALL_STAKE);
      return saved ? parseInt(saved) : 5;
    } catch {
      return 5;
    }
  });

  const [fourBallStakes, setFourBallStakes] = useState<FourBallStakes>(() => ({
    ...DEFAULT_FOUR_BALL_STAKES,
    ...loadJson(STORAGE_KEYS.FOUR_BALL_STAKES, {} as Partial<FourBallStakes>),
  }));

  const [bookItStake, setBookItStake] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOK_IT_STAKE);
      return saved ? parseInt(saved) : 2;
    } catch {
      return 2;
    }
  });

  const [bookedHoles, setBookedHoles] = useState<Record<string, number[]>>(() =>
    loadJson(STORAGE_KEYS.BOOK_IT_BOOKED_HOLES, {} as Record<string, number[]>)
  );

  const [wolfStake, setWolfStake] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WOLF_STAKE);
      return saved ? parseInt(saved) : 5;
    } catch { return 5; }
  });

  const [wolfDecisions, setWolfDecisions] = useState<Record<number, WolfDecision>>(() =>
    loadJson(STORAGE_KEYS.WOLF_DECISIONS, {} as Record<number, WolfDecision>)
  );

  const [segments, setSegments] = useState<MatchSegment[]>(() =>
    loadJson(STORAGE_KEYS.SEGMENTS, JSON.parse(JSON.stringify(DEFAULT_SEGMENTS)) as MatchSegment[])
  );

  // --- UI State ---
  const [easterEgg, setEasterEgg] = useState<string | null>(null);
  const [pressInputs, setPressInputs] = useState<{ [key: string]: string }>({});
  const [visibleSections, setVisibleSections] = useState({
    partners: false,
    summary: true,
    stakes: true,
    courses: false,
    independent: true,
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('setup');
  const [showMatchDetails, setShowMatchDetails] = useState<{ [key: string]: boolean }>({});
  const [imStrokeInputs, setImStrokeInputs] = useState<{ [matchId: string]: string }>({});
  const [strokeSummaryInputs, setStrokeSummaryInputs] = useState<{ [playerId: string]: string }>({});

  // --- Immediate persistence for simple string values ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAME_MODE, gameMode);
  }, [gameMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_COURSE, selectedCourseId);
  }, [selectedCourseId]);

  // --- Batched/debounced localStorage saves ---
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
      localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
      localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
      localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
      localStorage.setItem(STORAGE_KEYS.INDEPENDENT_MATCHES, JSON.stringify(independentMatches));
      localStorage.setItem(STORAGE_KEYS.MANUAL_PRESSES, JSON.stringify(manualPresses));
      localStorage.setItem(STORAGE_KEYS.IND_MANUAL_PRESSES, JSON.stringify(indManualPresses));
      localStorage.setItem(STORAGE_KEYS.FOUR_BALL_STAKES, JSON.stringify(fourBallStakes));
      localStorage.setItem(STORAGE_KEYS.BASEBALL_STAKE, baseballStake.toString());
      localStorage.setItem(STORAGE_KEYS.BOOK_IT_STAKE, bookItStake.toString());
      localStorage.setItem(STORAGE_KEYS.BOOK_IT_BOOKED_HOLES, JSON.stringify(bookedHoles));
      localStorage.setItem(STORAGE_KEYS.WOLF_STAKE, wolfStake.toString());
      localStorage.setItem(STORAGE_KEYS.WOLF_DECISIONS, JSON.stringify(wolfDecisions));
    }, 200);
    return () => clearTimeout(timer);
  }, [players, scores, segments, partners, settings, courses, independentMatches, manualPresses, indManualPresses, fourBallStakes, baseballStake, bookItStake, bookedHoles, wolfStake, wolfDecisions]);

  // --- Derived / Memoized Values ---
  const activePlayers = useMemo(() =>
    players.filter(player =>
      player.name ||
      (gameMode === 'sixes' && players.indexOf(player) < 4) ||
      (gameMode === 'four-ball' && players.indexOf(player) < 4) ||
      (gameMode === 'baseball' && players.indexOf(player) < 3) ||
      (gameMode === 'wolf' && players.indexOf(player) < 4) ||
      (gameMode === 'independent') ||
      (gameMode === 'wheel') ||
      (gameMode === 'book-it')
    ),
    [players, gameMode]
  );

  const scorecardPlayers = useMemo(
    () => activePlayers.filter(player => player.name),
    [activePlayers]
  );

  const baselineCH = useMemo(() => {
    const namedPlayers = activePlayers.filter(p => p.name);
    return namedPlayers.length > 0
      ? Math.min(...namedPlayers.map(p => p.courseHandicap))
      : 0;
  }, [activePlayers]);

  const isLakeSelected = selectedCourse.id === 'olympic-lake';

  // --- Player Helpers ---
  const updatePlayer = useCallback((id: string, field: 'name' | 'index' | 'tee', value: string) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== id) return player;
      const updated = { ...player };
      if (field === 'name') updated.name = value;
      if (field === 'index') {
        updated.indexInput = value;
        const isPlusHandicap = value.startsWith('+');
        const numValue = parseFloat(value.replace('+', '')) || 0;
        updated.index = isPlusHandicap ? -numValue : numValue;
      }
      if (field === 'tee') updated.selectedTeeIndex = parseInt(value);

      const selectedTee = selectedCourse.tees[updated.selectedTeeIndex] || selectedCourse.tees[0];
      updated.courseHandicap = calculateCourseHandicap(updated.index, selectedTee);
      return updated;
    }));
  }, [selectedCourse]);

  const clearPlayer = useCallback((id: string) => {
    setPlayers(prev => prev.map(player =>
      player.id !== id ? player : { ...player, name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 }
    ));
  }, []);

  // --- Section Visibility ---
  const toggleSection = useCallback((section: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // --- Course Management ---
  const saveCourse = useCallback(() => {
    if (!editingCourse || !editingCourse.name) return;
    setCourses(prev => {
      const index = prev.findIndex(c => c.id === editingCourse.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = editingCourse;
        return updated;
      }
      return [...prev, editingCourse];
    });
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  }, [editingCourse]);

  const editCourse = useCallback((course: Course) => {
    setEditingCourse(JSON.parse(JSON.stringify(course)));
    setIsCourseModalOpen(true);
  }, []);

  const importCourse = useCallback((courseData: Omit<Course, 'id'>) => {
    const newCourse: Course = { id: Date.now().toString(), ...courseData };
    setCourses(prev => [...prev, newCourse]);
    setSelectedCourseId(newCourse.id);
  }, []);

  const startNewCourse = useCallback(() => {
    setEditingCourse({
      id: Date.now().toString(),
      name: '',
      holes: DEFAULT_HOLES.map(h => ({ ...h })),
      tees: [{ name: 'Default', rating: 72.0, slope: 113 }],
    });
    setIsCourseModalOpen(true);
  }, []);

  const deleteCourse = useCallback((id: string) => {
    if (PERMANENT_COURSE_IDS.includes(id as typeof PERMANENT_COURSE_IDS[number])) return;
    const courseToDelete = courses.find(c => c.id === id);
    if (courseToDelete && window.confirm(`Are you sure you want to delete ${courseToDelete.name}?`)) {
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourseId === id) setSelectedCourseId(MEADOW_CLUB.id);
    }
  }, [courses, selectedCourseId]);

  // --- Game Mode ---
  const handleGameModeChange = useCallback((newMode: GameMode) => {
    if (newMode === gameMode) return;
    const modeLabel =
      newMode === 'four-ball' ? 'Four Ball' :
      newMode === 'sixes' ? 'Sixes' :
      newMode === 'baseball' ? 'Baseball' :
      newMode === 'independent' ? 'Independent Matches Only' :
      newMode === 'book-it' ? 'Book-It' :
      newMode === 'wolf' ? 'Wolf' :
      'The Wheel';
    const confirmed = window.confirm(
      `Switching to ${modeLabel} will reset all team pairings for this round. Scores and players will be kept. Continue?`
    );
    if (confirmed) {
      setGameMode(newMode);
      if (newMode === 'baseball') {
        setPlayers(prev => prev.map((player, index) =>
          index >= 3 ? { ...player, name: '', index: 0, indexInput: '', courseHandicap: 0 } : player
        ));
      }
      if (newMode === 'book-it') {
        setBookedHoles({});
      }
      if (newMode === 'wolf') {
        setWolfDecisions({});
      }
      setSegments([
        { segment: 1, team1: [], team2: [] },
        { segment: 2, team1: [], team2: [] },
        { segment: 3, team1: [], team2: [] },
      ]);
      setManualPresses({ 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } });
    }
  }, [gameMode]);

  // --- Independent Matches ---
  const addIndependentMatch = useCallback(() => {
    const playersWithNames = activePlayers.filter(p => p.name);
    if (playersWithNames.length < 2) return;
    const newMatch: IndependentMatch = {
      id: Date.now().toString(),
      player1Id: playersWithNames[0].id,
      player2Id: playersWithNames[1].id,
      type: '18-hole',
      stake: 10,
      stake9: 5,
      stake18: 10,
      pressStake: 5,
      pressStake9: 2,
      pressStake18: 5,
      useAutoPress: false,
      autoPressTrigger: '2-down',
    };
    setIndependentMatches(prev => [...prev, newMatch]);
    setIndManualPresses(prev => ({ ...prev, [newMatch.id]: { overall: [], front: [], back: [] } }));
  }, [activePlayers]);

  const updateIndependentMatch = useCallback((id: string, field: keyof IndependentMatch, value: IndependentMatch[keyof IndependentMatch]) => {
    setIndependentMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }, []);

  const deleteIndependentMatch = useCallback((id: string) => {
    setIndependentMatches(prev => prev.filter(m => m.id !== id));
    setIndManualPresses(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // --- Partners ---
  const updatePartnerIndex = useCallback((name: string, value: string) => {
    const isPlusHandicap = value.startsWith('+');
    const numValue = parseFloat(value.replace('+', '')) || 0;
    const newIndex = isPlusHandicap ? -numValue : numValue;
    setPartners(prev => prev.map(pt => pt.name === name ? { ...pt, indexInput: value, index: newIndex } : pt));
    setPlayers(prev => prev.map(player => {
      if (player.name !== name) return player;
      const selectedTee = selectedCourse.tees[player.selectedTeeIndex] || selectedCourse.tees[0];
      return { ...player, indexInput: value, index: newIndex, courseHandicap: calculateCourseHandicap(newIndex, selectedTee) };
    }));
  }, [selectedCourse]);

  const addPartner = useCallback((player: Player, ghin?: string) => {
    if (!player.name) return;
    const newPartner: Partner = { name: player.name, index: player.index, indexInput: player.indexInput, selectedTeeIndex: player.selectedTeeIndex, ghin };
    setPartners(prev => {
      if (prev.some(pt => pt.name === player.name)) {
        return prev.map(pt => pt.name === player.name ? newPartner : pt);
      }
      return [...prev, newPartner];
    });
  }, []);

  const [partnerRefreshing, setPartnerRefreshing] = useState<Set<string>>(new Set());

  const refreshPartnerIndex = useCallback(async (partner: Partner) => {
    if (!partner.ghin || !ghinToken) return;
    setPartnerRefreshing(prev => new Set(prev).add(partner.name));
    try {
      const nameParts = partner.name.trim().split(' ');
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      const firstName = nameParts.length > 1 ? nameParts[0] : '';
      const qs = new URLSearchParams({ token: ghinToken, lastName });
      if (firstName) qs.set('firstName', firstName);
      const res = await fetch(`/api/ghin-search?${qs.toString()}`);
      const data = await res.json() as { golfers?: Array<{ ghin: string; handicap_index: string }>; error?: string };
      if (res.status === 401 || data.error === 'token_expired') {
        clearGhinToken();
        return;
      }
      const match = (data.golfers ?? []).find(g => g.ghin === partner.ghin);
      if (!match) return;
      const isPlusHandicap = match.handicap_index.startsWith('+');
      const numValue = parseFloat(match.handicap_index.replace('+', '')) || 0;
      const newIndex = isPlusHandicap ? -numValue : numValue;
      setPartners(prev => prev.map(pt =>
        pt.name === partner.name ? { ...pt, index: newIndex, indexInput: match.handicap_index } : pt
      ));
      setPlayers(prev => prev.map(pl =>
        pl.name === partner.name ? { ...pl, index: newIndex, indexInput: match.handicap_index } : pl
      ));
    } catch {
      // silently fail
    } finally {
      setPartnerRefreshing(prev => { const s = new Set(prev); s.delete(partner.name); return s; });
    }
  }, [ghinToken, clearGhinToken]);

  const deletePartner = useCallback((name: string) => {
    setPartners(prev => prev.filter(pt => pt.name !== name));
  }, []);

  const loadPartner = useCallback((playerId: string, partner: Partner) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const teeIndex = partner.selectedTeeIndex < selectedCourse.tees.length ? partner.selectedTeeIndex : 0;
      return {
        ...player,
        name: partner.name,
        index: partner.index,
        indexInput: partner.indexInput,
        selectedTeeIndex: teeIndex,
        courseHandicap: calculateCourseHandicap(partner.index, selectedCourse.tees[teeIndex]),
      };
    }));
  }, [selectedCourse]);

  // --- Scores ---
  const setScore = useCallback((pId: string, hNum: number, val: string) => {
    const g = parseInt(val) || 0;
    setScores(prev => ({ ...prev, [pId]: { ...prev[pId], [hNum]: g } }));
    const p = activePlayers.find(pl => pl.id === pId);
    if (p?.name.trim().toLowerCase() === 'chad solter' && g > 0 && selectedCourse.holes[hNum - 1]?.par > g) {
      setEasterEgg(CHAD_COMMENTS[Math.floor(Math.random() * CHAD_COMMENTS.length)]);
      setTimeout(() => setEasterEgg(null), 5000);
    }
  }, [activePlayers, selectedCourse]);

  // --- Press Management ---
  const addSegmentManualPress = useCallback((segId: number, matchIdx: number) => {
    const inputKey = `seg-${segId}-${matchIdx}`;
    const hole = parseInt(pressInputs[inputKey] || '');
    if (!hole) return;
    const start = segId * 6 + 1;
    const end = start + 5;
    if (gameMode !== 'four-ball' && (hole < start || hole > end)) return;
    if (gameMode === 'four-ball') {
      if (matchIdx === 0 && (hole < 1 || hole > 9)) return;
      if (matchIdx === 1 && (hole < 10 || hole > 18)) return;
      if (matchIdx === 2 && (hole < 1 || hole > 18)) return;
    }
    setManualPresses(prev => {
      const next = { ...prev };
      const seg = next[segId] || {};
      const match = [...(seg[matchIdx] || [])];
      if (!match.includes(hole)) {
        match.push(hole);
        match.sort((a, b) => a - b);
      }
      next[segId] = { ...seg, [matchIdx]: match };
      return next;
    });
    setPressInputs(prev => ({ ...prev, [inputKey]: '' }));
  }, [pressInputs, gameMode]);

  const addIndManualPress = useCallback((matchId: string, type: 'overall' | 'front' | 'back') => {
    const inputKey = `ind-${matchId}`;
    const hole = parseInt(pressInputs[inputKey] || '');
    if (!hole) return;
    if (type === 'front' && (hole < 1 || hole > 9)) return;
    if (type === 'back' && (hole < 10 || hole > 18)) return;
    if (type === 'overall' && (hole < 1 || hole > 18)) return;
    setIndManualPresses(prev => {
      const match = prev[matchId] || { overall: [], front: [], back: [] };
      return { ...prev, [matchId]: { ...match, [type]: [...match[type], hole].sort((a, b) => a - b) } };
    });
    setPressInputs(prev => ({ ...prev, [inputKey]: '' }));
  }, [pressInputs]);

  const removeManualPress = useCallback((type: 'segment' | 'ind', id: string, hNum: number, matchIdxOrType: number | 'overall' | 'front' | 'back') => {
    if (type === 'segment') {
      const segId = parseInt(id);
      const mi = matchIdxOrType as number;
      setManualPresses(prev => {
        const seg = prev[segId] || {};
        const updatedMatch = (seg[mi] || []).filter(h => h !== hNum);
        return { ...prev, [segId]: { ...seg, [mi]: updatedMatch } };
      });
    } else {
      const matchId = id;
      const typeKey = matchIdxOrType as 'overall' | 'front' | 'back';
      setIndManualPresses(prev => {
        const match = prev[matchId] || { overall: [], front: [], back: [] };
        return { ...prev, [matchId]: { ...match, [typeKey]: (match[typeKey] || []).filter(h => h !== hNum) } };
      });
    }
  }, []);

  // --- Stroke Input Helpers ---
  const handleImStrokeChange = useCallback((id: string, value: string) => {
    setImStrokeInputs(prev => ({ ...prev, [id]: value }));
    if (value === '' || value === '-' || value === '.' || value === '-.' || value.endsWith('.')) {
      updateIndependentMatch(id, 'manualStrokes', 0);
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateIndependentMatch(id, 'manualStrokes', num);
    }
  }, [updateIndependentMatch]);

  const handleStrokeSummaryInputChange = useCallback((pId: string, value: string) => {
    setStrokeSummaryInputs(prev => ({ ...prev, [pId]: value }));
    if (value === '' || value === '-' || value === '.' || value === '-.') {
      setPlayers(prev => prev.map(p => p.id === pId ? { ...p, manualRelativeStrokes: 0 } : p));
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setPlayers(prev => prev.map(p => p.id === pId ? { ...p, manualRelativeStrokes: num } : p));
    }
  }, []);

  const finalizeDecimalEntry = useCallback((id: string, isSummary: boolean = false) => {
    const inputs = isSummary ? strokeSummaryInputs : imStrokeInputs;
    const value = inputs[id];

    if (value === '' || value === '-' || value === '.' || value === '-.' || value === undefined) {
      if (isSummary) {
        setStrokeSummaryInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, manualRelativeStrokes: 0 } : p));
      } else {
        setImStrokeInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
        updateIndependentMatch(id, 'manualStrokes', 0);
      }
      return;
    }

    const num = parseFloat(value);
    if (isNaN(num)) return;

    if (value.includes('.')) {
      const isNegative = num < 0 || value.startsWith('-');
      const absNum = Math.abs(num);
      const decimalPart = absNum % 1;
      let targetNum = Math.floor(absNum);
      if (decimalPart > 0) targetNum += 0.5;
      if (isNegative) targetNum = -targetNum;

      if (isSummary) {
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, manualRelativeStrokes: targetNum } : p));
      } else {
        updateIndependentMatch(id, 'manualStrokes', targetNum);
      }
    }
  }, [strokeSummaryInputs, imStrokeInputs, updateIndependentMatch]);

  // --- Manual Strokes Toggle ---
  const handleManualStrokesToggle = useCallback(() => {
    const isEnabling = !settings.useManualStrokes;
    if (isEnabling) {
      setStrokeSummaryInputs({});
      setPlayers(prev => prev.map(player => ({
        ...player,
        manualRelativeStrokes: ((gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided')
          ? getStrokesPerSixHoles(player, baselineCH, settings, gameMode)
          : (player.courseHandicap - baselineCH),
      })));
    }
    setSettings(prev => ({ ...prev, useManualStrokes: isEnabling }));
  }, [settings, gameMode, baselineCH]);

  // --- Team Management ---
  const handleTeamSelection = useCallback((segmentIndex: number, player1Id: string, player2Id: string) => {
    setSegments(prev => {
      const next = [...prev];
      next[segmentIndex] = { ...next[segmentIndex], team1: [player1Id, player2Id].filter(id => id) };
      const others = activePlayers.filter(p => !next[segmentIndex].team1.includes(p.id)).map(p => p.id);
      next[segmentIndex] = { ...next[segmentIndex], team2: others };
      return next;
    });
  }, [activePlayers]);

  const getPlayerWheelCount = useCallback((playerId: string, currentSegmentIndex: number) =>
    segments.reduce((count, segment, index) =>
      index === currentSegmentIndex ? count : count + (segment.team1.includes(playerId) ? 1 : 0), 0),
    [segments]
  );

  const isPairingDuplicate = useCallback((player1Id: string, player2Id: string, currentSegmentIndex: number) => {
    if (!player1Id || !player2Id) return false;
    const pairingKey = [player1Id, player2Id].sort().join(',');
    return segments.some((segment, index) =>
      index !== currentSegmentIndex &&
      segment.team1.length === 2 &&
      [...segment.team1].sort().join(',') === pairingKey
    );
  }, [segments]);

  // --- Wolf Handlers ---
  const setWolfDecision = useCallback((hole: number, value: string) => {
    setWolfDecisions(prev => {
      if (!value) {
        const next = { ...prev };
        delete next[hole];
        return next;
      }
      const decision: WolfDecision =
        value === 'lone' ? { partnerId: null, blindWolf: false } :
        value === 'blind' ? { partnerId: null, blindWolf: true } :
        { partnerId: value, blindWolf: false };
      return { ...prev, [hole]: decision };
    });
  }, []);

  // --- Book-It Handlers ---
  const toggleBookHole = useCallback((playerId: string, holeNumber: number) => {
    setBookedHoles(prev => {
      const playerBooked = prev[playerId] || [];
      if (playerBooked.includes(holeNumber)) {
        return { ...prev, [playerId]: playerBooked.filter(h => h !== holeNumber) };
      }
      return { ...prev, [playerId]: [...playerBooked, holeNumber].sort((a, b) => a - b) };
    });
  }, []);

  // --- Score Helpers ---
  const getNetScore = useCallback((pId: string, hNum: number): number | null => {
    const g = scores[pId]?.[hNum];
    if (!g) return null;
    if (gameMode === 'book-it') {
      return getBookItNetForHole(pId, hNum, activePlayers, selectedCourse.holes, scores);
    }
    // Wolf uses full course handicap (baseline = 0)
    const baseline = gameMode === 'wolf' ? 0 : baselineCH;
    return g - getStrokesForHole(pId, hNum, activePlayers, selectedCourse.holes, settings, gameMode, baseline);
  }, [scores, activePlayers, selectedCourse.holes, settings, gameMode, baselineCH]);

  const getPlayerScoreTotal = useCallback((playerId: string) =>
    scores[playerId] ? Object.values(scores[playerId]).reduce((sum, s) => sum + (s || 0), 0) : 0,
    [scores]
  );

  const getPlayerHoleListTotal = useCallback((playerId: string, holeNumbers: number[]) =>
    scores[playerId] ? holeNumbers.reduce((sum, holeNum) => sum + (scores[playerId][holeNum] || 0), 0) : 0,
    [scores]
  );

  const getTeamNamesByIds = useCallback((playerIds: string[], isFullName: boolean = false) =>
    playerIds.map(id => {
      const player = players.find(p => p.id === id);
      return player ? (isFullName ? player.name : player.name.split(' ')[0]) : '?';
    }).join(' & '),
    [players]
  );

  // --- Calculation Wrappers (bound to current state) ---
  const computeStrokesForHole = useCallback((playerId: string, holeNumber: number) =>
    getStrokesForHole(playerId, holeNumber, activePlayers, selectedCourse.holes, settings, gameMode,
      (gameMode === 'book-it' || gameMode === 'wolf') ? 0 : baselineCH),
    [activePlayers, selectedCourse.holes, settings, gameMode, baselineCH]
  );

  const computeStrokesPerSixHoles = useCallback((player: Player) =>
    getStrokesPerSixHoles(player, baselineCH, settings, gameMode),
    [baselineCH, settings, gameMode]
  );

  const computeBaseballPoints = useCallback((holeNumber: number): [number, number, number] => {
    const playerIds = activePlayers.slice(0, 3).map(p => p.id) as [string, string, string];
    return calculateBaseballPoints(holeNumber, playerIds, scores, selectedCourse.holes, settings, activePlayers, baselineCH);
  }, [activePlayers, scores, selectedCourse.holes, settings, baselineCH]);

  const computeBaseballTotals = useCallback((): BaseballTotals => {
    const playerIds = activePlayers.slice(0, 3).map(p => p.id) as [string, string, string];
    return getBaseballTotals(playerIds, scores, selectedCourse.holes, settings, activePlayers, baselineCH, baseballStake);
  }, [activePlayers, scores, selectedCourse.holes, settings, baselineCH, baseballStake]);

  const computeSegmentFull = useCallback((segmentIndex: number): SegmentFullResult => {
    const gm = gameMode === 'sixes' || gameMode === 'wheel' ? gameMode : 'sixes';
    return calculateSegmentFull(segmentIndex, segments, activePlayers, scores, selectedCourse.holes, settings, baselineCH, mainStake, pressStake, manualPresses, gm);
  }, [segments, activePlayers, scores, selectedCourse.holes, settings, baselineCH, mainStake, pressStake, manualPresses, gameMode]);

  const computeFourBallFull = useCallback((): FourBallResult =>
    calculateFourBallFull(segments, activePlayers, scores, selectedCourse.holes, settings, baselineCH, fourBallStakes, manualPresses),
    [segments, activePlayers, scores, selectedCourse.holes, settings, baselineCH, fourBallStakes, manualPresses]
  );

  const computeIndependentMatchResult = useCallback((match: IndependentMatch): IndependentMatchResult =>
    calculateIndependentMatchResult(match, activePlayers, scores, selectedCourse.holes, settings, baselineCH, indManualPresses),
    [activePlayers, scores, selectedCourse.holes, settings, baselineCH, indManualPresses]
  );

  const computeBookItResults = useCallback((): BookItResult =>
    calculateBookItResults(activePlayers, scores, bookedHoles, selectedCourse.holes, bookItStake),
    [activePlayers, scores, bookedHoles, selectedCourse.holes, bookItStake]
  );

  const computeWolfResults = useCallback((): WolfResult =>
    calculateWolfResults(activePlayers, scores, wolfDecisions, selectedCourse.holes, wolfStake, settings.wolfLastPlaceWolf),
    [activePlayers, scores, wolfDecisions, selectedCourse.holes, wolfStake, settings.wolfLastPlaceWolf]
  );

  const getPlayerTotals = useCallback((): Record<string, number> => {
    const totals: Record<string, number> = {};
    activePlayers.forEach(player => { totals[player.id] = 0; });

    if (gameMode === 'four-ball') {
      const results = computeFourBallFull();
      Object.keys(results.winnings).forEach(id => {
        if (totals[id] !== undefined) totals[id] += results.winnings[id];
      });
    } else if (gameMode === 'baseball') {
      const results = computeBaseballTotals();
      players.slice(0, 3).forEach((player, idx) => {
        if (totals[player.id] !== undefined) totals[player.id] = results.payouts[idx];
      });
    } else if (gameMode === 'book-it') {
      const results = computeBookItResults();
      Object.keys(results.payouts).forEach(id => {
        if (totals[id] !== undefined) totals[id] += results.payouts[id];
      });
    } else if (gameMode === 'wolf') {
      const results = computeWolfResults();
      Object.keys(results.payouts).forEach(id => {
        if (totals[id] !== undefined) totals[id] += results.payouts[id];
      });
    } else if (gameMode === 'wheel' || gameMode === 'sixes') {
      [0, 1, 2].forEach(segIdx => {
        const results = computeSegmentFull(segIdx);
        Object.keys(results.winnings).forEach(id => {
          if (totals[id] !== undefined) totals[id] += results.winnings[id];
        });
      });
    }

    independentMatches.forEach(match => {
      const results = computeIndependentMatchResult(match);
      if (totals[match.player1Id] !== undefined) totals[match.player1Id] += results.payout;
      if (totals[match.player2Id] !== undefined) totals[match.player2Id] -= results.payout;
    });

    return totals;
  }, [gameMode, activePlayers, players, computeFourBallFull, computeBaseballTotals, computeBookItResults, computeWolfResults, computeSegmentFull, independentMatches, computeIndependentMatchResult]);

  const toggleMatchDetail = useCallback((id: string) => {
    setShowMatchDetails(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const resetData = useCallback(() => {
    if (window.confirm('WARNING: This will delete ALL scores, players, pairings and independent matches for this round. Continue?')) {
      setScores({});
      setPlayers(JSON.parse(JSON.stringify(DEFAULT_PLAYERS)));
      setIndependentMatches([]);
      setManualPresses({ 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } });
      setIndManualPresses({});
      setBookedHoles({});
      setWolfDecisions({});
      setSegments([
        { segment: 1, team1: [], team2: [] },
        { segment: 2, team1: [], team2: [] },
        { segment: 3, team1: [], team2: [] },
      ]);
    }
  }, []);

  return {
    // GHIN
    ghinToken, ghinLookupPlayerId, setGhinLookupPlayerId, saveGhinToken, clearGhinToken,
    // State
    courses, setCourses,
    selectedCourseId, setSelectedCourseId,
    isCourseModalOpen, setIsCourseModalOpen,
    editingCourse, setEditingCourse,
    selectedCourse,
    gameMode,
    players, setPlayers,
    partners,
    settings, setSettings,
    independentMatches, setIndependentMatches,
    manualPresses, setManualPresses,
    indManualPresses, setIndManualPresses,
    scores,
    mainStake, setMainStake,
    pressStake, setPressStake,
    baseballStake, setBaseballStake,
    fourBallStakes, setFourBallStakes,
    bookItStake, setBookItStake,
    bookedHoles,
    toggleBookHole,
    wolfStake, setWolfStake,
    wolfDecisions,
    setWolfDecision,
    segments, setSegments,
    easterEgg,
    pressInputs, setPressInputs,
    visibleSections,
    activeTab, setActiveTab,
    showMatchDetails,
    imStrokeInputs, setImStrokeInputs,
    strokeSummaryInputs,
    // Derived
    activePlayers,
    scorecardPlayers,
    baselineCH,
    isLakeSelected,
    // Handlers
    updatePlayer,
    clearPlayer,
    toggleSection,
    saveCourse,
    editCourse,
    startNewCourse,
    importCourse,
    deleteCourse,
    handleGameModeChange,
    addIndependentMatch,
    updateIndependentMatch,
    deleteIndependentMatch,
    updatePartnerIndex,
    addPartner,
    deletePartner,
    loadPartner,
    refreshPartnerIndex,
    partnerRefreshing,
    setScore,
    addSegmentManualPress,
    addIndManualPress,
    removeManualPress,
    handleImStrokeChange,
    handleStrokeSummaryInputChange,
    finalizeDecimalEntry,
    handleManualStrokesToggle,
    handleTeamSelection,
    getPlayerWheelCount,
    isPairingDuplicate,
    getNetScore,
    getPlayerScoreTotal,
    getPlayerHoleListTotal,
    getTeamNamesByIds,
    toggleMatchDetail,
    resetData,
    // Computation wrappers
    computeStrokesForHole,
    computeStrokesPerSixHoles,
    computeBaseballPoints,
    computeBaseballTotals,
    computeSegmentFull,
    computeFourBallFull,
    computeIndependentMatchResult,
    computeBookItResults,
    computeWolfResults,
    getPlayerTotals,
  };
}

export type AppState = ReturnType<typeof useAppState>;
