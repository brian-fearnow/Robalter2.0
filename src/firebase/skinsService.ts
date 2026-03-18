import { ref, push, set, get, update, remove, onValue, off } from 'firebase/database';
import { db } from './config';
import type { Player, Score, Course } from '../types';
import type { SkinsRound, SkinsFoursome, SkinsRoundMetadata } from '../types/skins';

// --- Room code generation ---
// Combines a color + animal name for memorable, easy-to-share codes.
// e.g. "REDEAGLE", "BLUEWOLF", "GOLDMOOSE" — 15 colors × 51 animals = 765 combinations.
const COLORS = [
  'RED', 'BLUE', 'GREEN', 'GOLD', 'BLACK',
  'WHITE', 'GREY', 'PINK', 'TEAL', 'NAVY',
  'LIME', 'PLUM', 'ROSE', 'SAGE', 'TAN',
];
const ANIMALS = [
  'BEAR', 'WOLF', 'HAWK', 'DEER', 'FOX', 'LYNX', 'MOOSE', 'BISON',
  'CRANE', 'EAGLE', 'FALCON', 'GOOSE', 'HERON', 'IBIS', 'JAGUAR',
  'KOALA', 'LLAMA', 'MINK', 'NEWT', 'OTTER', 'PANDA', 'QUAIL',
  'RAVEN', 'SWIFT', 'TIGER', 'VIPER', 'WALRUS', 'YETI', 'ZEBRA',
  'BADGER', 'COBRA', 'DINGO', 'ELK', 'FINCH', 'GECKO', 'HYENA',
  'IGUANA', 'JACKAL', 'KITE', 'LEMUR', 'MAMBA', 'NARWHAL', 'OSPREY',
  'PARROT', 'ROBIN', 'SKUNK', 'THRUSH', 'VOLE', 'WEASEL', 'BISON',
];

export function generateRoomCode(): string {
  const color  = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num    = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${color}${animal}${num}`;
}

// --- Round creation ---

export interface CreateRoundParams {
  courseId: string;
  courseName: string;
  courseData: Course;
  buyIn: number;
  useHalfStrokes: boolean;
  useManualSkinsStrokes: boolean;
  hostPlayers: Player[];
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const snap = await get(ref(db, `codes/${code}`));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate a unique room code. Try again.');
}

export async function createRound(
  params: CreateRoundParams
): Promise<{ roundId: string; foursomeId: string; code: string }> {
  const code = await generateUniqueRoomCode();

  // Push a new round key
  const newRoundRef = push(ref(db, 'rounds'));
  const roundId = newRoundRef.key!;

  // Push a new foursome key within the round
  const newFoursomeRef = push(ref(db, `rounds/${roundId}/foursomes`));
  const foursomeId = newFoursomeRef.key!;

  const metadata: SkinsRoundMetadata = {
    code,
    courseId: params.courseId,
    courseName: params.courseName,
    courseData: params.courseData,
    buyIn: params.buyIn,
    useHalfStrokes: params.useHalfStrokes,
    useManualSkinsStrokes: params.useManualSkinsStrokes,
    createdAt: Date.now(),
    status: 'active',
  };

  const foursome: Omit<SkinsFoursome, 'id'> = {
    label: 'Foursome 1',
    players: params.hostPlayers,
    scores: {},
    lastUpdated: Date.now(),
  };

  await set(newRoundRef, {
    metadata,
    foursomes: { [foursomeId]: foursome },
  });

  // Write a reverse-lookup index: codes/{code} → roundId
  await set(ref(db, `codes/${code}`), roundId);

  return { roundId, foursomeId, code };
}

// --- Code lookup ---

export async function getRoundByCode(code: string): Promise<SkinsRound | null> {
  const upperCode = code.toUpperCase();

  // Use the codes/ index for an O(1) lookup
  const codeSnap = await get(ref(db, `codes/${upperCode}`));
  if (!codeSnap.exists()) return null;

  const roundId = codeSnap.val() as string;
  const roundSnap = await get(ref(db, `rounds/${roundId}`));
  if (!roundSnap.exists()) return null;

  const data = roundSnap.val() as Omit<SkinsRound, 'id'>;
  return { id: roundId, ...data, foursomes: data.foursomes ?? {} };
}

// --- Joining a round ---

export async function joinRound(
  roundId: string,
  players: Player[]
): Promise<string> {
  const foursomesRef = ref(db, `rounds/${roundId}/foursomes`);
  const snap = await get(foursomesRef);
  const existingCount = snap.exists() ? Object.keys(snap.val()).length : 0;
  const label = `Foursome ${existingCount + 1}`;

  const newFoursomeRef = push(foursomesRef);
  const foursomeId = newFoursomeRef.key!;

  const foursome: Omit<SkinsFoursome, 'id'> = {
    label,
    players,
    scores: {},
    lastUpdated: Date.now(),
  };

  await set(newFoursomeRef, foursome);
  return foursomeId;
}

// --- Score and player updates ---

export async function updateFoursomePlayers(
  roundId: string,
  foursomeId: string,
  players: Player[],
  useManualStrokes?: boolean,
): Promise<void> {
  const updates: Record<string, unknown> = { players, lastUpdated: Date.now() };
  if (useManualStrokes !== undefined) updates.useManualStrokes = useManualStrokes;
  await update(ref(db, `rounds/${roundId}/foursomes/${foursomeId}`), updates);
}

export async function updateFoursomeScores(
  roundId: string,
  foursomeId: string,
  scores: Score
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/foursomes/${foursomeId}`), {
    scores,
    lastUpdated: Date.now(),
  });
}

export async function setRoundStatus(
  roundId: string,
  status: SkinsRoundMetadata['status']
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/metadata`), { status });
}

export async function updateRoundMetadata(
  roundId: string,
  updates: Partial<Pick<SkinsRoundMetadata, 'buyIn' | 'useHalfStrokes' | 'useManualSkinsStrokes'>>
): Promise<void> {
  await update(ref(db, `rounds/${roundId}/metadata`), updates);
}

export async function removeFoursome(roundId: string, foursomeId: string): Promise<void> {
  await remove(ref(db, `rounds/${roundId}/foursomes/${foursomeId}`));
}

// --- Delete round ---

/**
 * Permanently removes a round and its room code index from Firebase.
 * Should only be called by the host.
 */
export async function deleteRound(roundId: string, code: string): Promise<void> {
  await remove(ref(db, `rounds/${roundId}`));
  await remove(ref(db, `codes/${code}`));
}

// --- Real-time subscription ---

/**
 * Subscribes to all changes on a round (metadata + all foursomes).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToRound(
  roundId: string,
  callback: (round: SkinsRound | null) => void
): () => void {
  const roundRef = ref(db, `rounds/${roundId}`);

  const handler = onValue(roundRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.val() as Omit<SkinsRound, 'id'>;
    callback({ id: roundId, ...data, foursomes: data.foursomes ?? {} });
  });

  return () => off(roundRef, 'value', handler);
}
