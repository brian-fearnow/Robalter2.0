import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Player, Score, Course } from '../types';
import type { SkinsRound, SkinsFoursome, SkinsResult, SkinsConnectionStatus } from '../types/skins';
import {
  createRound as fbCreateRound,
  getRoundByCode,
  joinRound as fbJoinRound,
  updateFoursomeScores,
  updateFoursomePlayers,
  subscribeToRound,
  setRoundStatus,
  deleteRound as fbDeleteRound,
  updateRoundMetadata,
  removeFoursome as fbRemoveFoursome,
} from '../firebase/skinsService';
import { calculateSkinsResults } from '../utils/skins';

const LS_ROUND_ID    = 'robalter_skins_roundId';
const LS_FOURSOME_ID = 'robalter_skins_foursomeId';
const LS_RECENT      = 'robalter_skins_recent';
const MAX_RECENT     = 3;

export interface RecentRoom {
  code: string;
  courseName: string;
  foursomeId: string;
  roundId: string;
  lastJoined: number; // Unix ms
}

function loadRecentRooms(): RecentRoom[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_RECENT) ?? '[]') as unknown[];
    return raw.filter((r): r is RecentRoom =>
      !!r && typeof (r as RecentRoom).code === 'string'
    );
  } catch {
    return [];
  }
}

function saveRecentRoom(code: string, courseName: string, foursomeId: string, roundId: string) {
  const rooms = loadRecentRooms().filter(r => r.code !== code); // dedupe
  rooms.unshift({ code, courseName, foursomeId, roundId, lastJoined: Date.now() });
  localStorage.setItem(LS_RECENT, JSON.stringify(rooms.slice(0, MAX_RECENT)));
}

export function useSkinsRound(course: Course) {
  const [roundId,     setRoundId]    = useState<string | null>(() => localStorage.getItem(LS_ROUND_ID));
  const [foursomeId,  setFoursomeId] = useState<string | null>(() => localStorage.getItem(LS_FOURSOME_ID));
  const [round,       setRound]      = useState<SkinsRound | null>(null);
  const [myPlayers,   setMyPlayers]  = useState<Player[]>([]);
  const [status,      setStatus]     = useState<SkinsConnectionStatus>('idle');
  const [error,       setError]      = useState<string | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(loadRecentRooms);

  const scoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the current room code so the subscription callback can read it
  // even though the callback is a closure that can't capture reactive state.
  const roomCodeRef = useRef<string | null>(null);
  // Tracks current myPlayers without being a useCallback dependency,
  // so updateMyPlayers can preserve skins-specific manualRelativeStrokes
  // without creating a dependency loop.
  const myPlayersRef = useRef<Player[]>([]);

  // Persist roundId / foursomeId to localStorage for reconnect on page refresh
  useEffect(() => {
    if (roundId) localStorage.setItem(LS_ROUND_ID, roundId);
    else localStorage.removeItem(LS_ROUND_ID);
  }, [roundId]);

  useEffect(() => {
    if (foursomeId) localStorage.setItem(LS_FOURSOME_ID, foursomeId);
    else localStorage.removeItem(LS_FOURSOME_ID);
  }, [foursomeId]);

  // On mount: delete any skins rounds that were last joined more than 30 days ago.
  useEffect(() => {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const rooms = loadRecentRooms();
    const old = rooms.filter(r => now - r.lastJoined > THIRTY_DAYS);
    if (old.length === 0) return;
    old.forEach(r => {
      fbDeleteRound(r.roundId, r.code).catch(() => {});
    });
    const updated = rooms.filter(r => now - r.lastJoined <= THIRTY_DAYS);
    localStorage.setItem(LS_RECENT, JSON.stringify(updated));
    setRecentRooms(updated);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Removes a room code from the recent rooms list (localStorage + state).
  // Called on server deletion — not on manual leave, so the user can still rejoin.
  const removeFromRecent = useCallback((code: string) => {
    const updated = loadRecentRooms().filter(r => r.code !== code);
    localStorage.setItem(LS_RECENT, JSON.stringify(updated));
    setRecentRooms(updated);
  }, []);

  // leaveRound is defined early so the Firebase subscription can call it directly.
  const leaveRound = useCallback(() => {
    if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current);
    localStorage.removeItem(LS_ROUND_ID);
    localStorage.removeItem(LS_FOURSOME_ID);
    setRoundId(null);
    setFoursomeId(null);
    setRound(null);
    setMyPlayers([]);
    setStatus('idle');
    setError(null);
  }, []);

  // Subscribe to Firebase when roundId is set.
  // If the round is deleted (e.g. by the host), remove from recent and auto-leave.
  useEffect(() => {
    if (!roundId) return;
    setStatus('connecting');
    const unsubscribe = subscribeToRound(roundId, (updatedRound) => {
      if (!updatedRound) {
        const code = roomCodeRef.current;
        if (code) removeFromRecent(code);
        leaveRound();
        return;
      }
      setRound(updatedRound);
      setStatus('connected');
    });
    return unsubscribe;
  }, [roundId, leaveRound, removeFromRecent]);

  // Pre-compute roomCode as a stable string so async callbacks don't need to
  // reach into round.metadata mid-execution (round can become null after deletion).
  const roomCode = round?.metadata.code ?? null;
  roomCodeRef.current = roomCode;   // keep ref in sync for subscription callback
  myPlayersRef.current = myPlayers; // keep ref in sync so updateMyPlayers can read it without a dep

  // --- Actions ---

  const createRound = useCallback(async (buyIn: number, useHalfStrokes: boolean, useManualSkinsStrokes: boolean, players: Player[]): Promise<string> => {
    setStatus('connecting');
    setError(null);
    try {
      const result = await fbCreateRound({
        courseId: course.id,
        courseName: course.name,
        courseData: course,
        buyIn,
        useHalfStrokes,
        useManualSkinsStrokes,
        hostPlayers: players,
      });
      setRoundId(result.roundId);
      setFoursomeId(result.foursomeId);
      setMyPlayers(players);
      saveRecentRoom(result.code, course.name, result.foursomeId, result.roundId);
      setRecentRooms(loadRecentRooms());
      return result.code;
    } catch (e) {
      setStatus('error');
      setError('Failed to create round. Check your connection.');
      throw e;
    }
  }, [course]);

  // Returns the server's course if it differs from the current course, otherwise null.
  // Pass skipCourseCheck=true on a re-attempt after the caller has already switched courses.
  const joinRound = useCallback(async (code: string, players: Player[], skipCourseCheck = false): Promise<Course | null> => {
    setStatus('connecting');
    setError(null);
    try {
      const existingRound = await getRoundByCode(code);
      if (!existingRound) {
        setError(`No round found with code "${code.toUpperCase()}".`);
        setStatus('idle');
        return null;
      }
      // If the host's course differs from this group's current course, surface it
      // so the caller can confirm and switch before we finalise the join.
      const serverCourse = existingRound.metadata.courseData ?? null;
      if (!skipCourseCheck && serverCourse && serverCourse.id !== course.id) {
        setStatus('idle');
        return serverCourse;
      }
      // If we previously joined this round, try to restore our original foursome
      // rather than creating a new one (handles leave → rejoin flow).
      const upperCode = code.toUpperCase();
      const stored = loadRecentRooms().find(r => r.code === upperCode);
      const storedFoursomeId = stored?.foursomeId;
      const alreadyMember = !!storedFoursomeId && !!existingRound.foursomes?.[storedFoursomeId];
      const resolvedFoursomeId = alreadyMember
        ? storedFoursomeId!
        : await fbJoinRound(existingRound.id, players);
      setRoundId(existingRound.id);
      setFoursomeId(resolvedFoursomeId);
      setMyPlayers(players);
      saveRecentRoom(upperCode, existingRound.metadata.courseName, resolvedFoursomeId, existingRound.id);
      setRecentRooms(loadRecentRooms());
      return null;
    } catch (e) {
      setStatus('error');
      setError('Failed to join round. Check your connection.');
      throw e;
    }
  }, [course]);

  // Sync scores from the main app to Firebase whenever they change.
  // Called by SkinsApp via a useEffect watching appState.scores.
  const syncScores = useCallback((scores: Score) => {
    if (!roundId || !foursomeId) return;
    if (scoreDebounceRef.current) clearTimeout(scoreDebounceRef.current);
    scoreDebounceRef.current = setTimeout(() => {
      updateFoursomeScores(roundId, foursomeId, scores).catch(console.error);
    }, 300);
  }, [roundId, foursomeId]);

  const updateMyPlayers = useCallback((players: Player[]) => {
    // Only update players already in the skins game — never add new ones.
    // This prevents the App.tsx activePlayers sync from undoing deliberate
    // deselections made during create/join. Also preserve skins-specific
    // manualRelativeStrokes so the main stroke summary can't overwrite them.
    const currentIds = new Set(myPlayersRef.current.map(p => p.id));
    const merged = players
      .filter(p => currentIds.has(p.id))
      .map(p => {
        const existing = myPlayersRef.current.find(mp => mp.id === p.id);
        return existing ? { ...p, manualRelativeStrokes: existing.manualRelativeStrokes } : p;
      });
    setMyPlayers(merged);
    if (!roundId || !foursomeId) return;
    updateFoursomePlayers(roundId, foursomeId, merged).catch(console.error);
  }, [roundId, foursomeId]);

  // Host-only: updates buy-in, stroke mode, and the host's own player list.
  const updateSettings = useCallback(async (buyIn: number, useHalfStrokes: boolean, useManualSkinsStrokes: boolean, players: Player[]) => {
    if (!roundId) return;
    await updateRoundMetadata(roundId, { buyIn, useHalfStrokes, useManualSkinsStrokes });
    if (foursomeId) {
      setMyPlayers(players);
      await updateFoursomePlayers(roundId, foursomeId, players);
    }
  }, [roundId, foursomeId]);

  // Any group member: updates only their own participating player list.
  const updateMyGroupPlayers = useCallback(async (players: Player[]) => {
    if (!roundId || !foursomeId) return;
    setMyPlayers(players);
    await updateFoursomePlayers(roundId, foursomeId, players);
  }, [roundId, foursomeId]);

  const removeGroup = useCallback(async (targetFoursomeId: string) => {
    if (!roundId) return;
    await fbRemoveFoursome(roundId, targetFoursomeId);
  }, [roundId]);

  const completeRound = useCallback(async () => {
    if (roundId) await setRoundStatus(roundId, 'completed');
  }, [roundId]);

  const deleteRound = useCallback(async () => {
    if (!roundId || !roomCode) return;
    await fbDeleteRound(roundId, roomCode);
    removeFromRecent(roomCode);
    leaveRound();
  }, [roundId, roomCode, leaveRound, removeFromRecent]);

  // --- Derived state ---

  const foursomes: SkinsFoursome[] = useMemo(() => {
    if (!round?.foursomes) return [];
    return Object.entries(round.foursomes).map(([id, fs]) => ({ ...fs, id }));
  }, [round]);

  const skinsResults: SkinsResult | null = useMemo(() => {
    if (foursomes.length === 0) return null;
    return calculateSkinsResults(
      foursomes,
      course.holes,
      round?.metadata.buyIn ?? 0,
      round?.metadata.useHalfStrokes ?? false,
    );
  }, [foursomes, course.holes, round?.metadata.buyIn, round?.metadata.useHalfStrokes]);

  const isHost = useMemo(
    () => foursomes.length > 0 && !!foursomeId && foursomes[0].id === foursomeId,
    [foursomes, foursomeId]
  );

  return {
    // State
    roundId,
    foursomeId,
    round,
    foursomes,
    myPlayers,
    status,
    error,
    isHost,
    recentRooms,
    // Derived
    skinsResults,
    roundStatus: round?.metadata.status ?? null,
    roomCode,
    buyIn: round?.metadata.buyIn ?? 0,
    useHalfStrokes: round?.metadata.useHalfStrokes ?? false,
    useManualSkinsStrokes: round?.metadata.useManualSkinsStrokes ?? false,
    // Actions
    createRound,
    joinRound,
    syncScores,
    updateMyPlayers,
    updateSettings,
    updateMyGroupPlayers,
    removeGroup,
    completeRound,
    leaveRound,
    deleteRound,
  };
}

export type SkinsRoundState = ReturnType<typeof useSkinsRound>;
