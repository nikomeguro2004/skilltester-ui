import type { AnsweredQuestion, Difficulty, KnowledgeMap } from "./types";

const LEVELS: Difficulty[] = ["beginner", "intermediate", "advanced", "expert"];
const PASS_THRESHOLD = 70;

function levelIndex(d: Difficulty): number {
  return LEVELS.indexOf(d);
}

function levelFromIndex(i: number): Difficulty {
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))];
}

export interface AreaState {
  area: string;
  weight: number;
  attempts: number;
  /** Level the engine will probe next for this area. */
  nextLevelIndex: number;
  lastScore: number | null;
  /** Highest level index the candidate has demonstrably passed (>= PASS_THRESHOLD). -1 if none. */
  confirmedLevelIndex: number;
  /** Level index of the first fail at-or-above the confirmed level — the observed knowledge ceiling. */
  ceilingLevelIndex: number | null;
}

/**
 * Replays the full answer history through a per-area staircase (pass -> level up,
 * fail -> level down) to derive each area's current probing level, confirmed
 * mastery level, and — the moment a fail lands at or above the last confirmed
 * level — its knowledge ceiling. This is the deterministic engine driving
 * "find the ceiling, don't just count correct answers."
 */
export function computeAreaStates(
  map: KnowledgeMap,
  startingDifficulty: Difficulty,
  history: AnsweredQuestion[],
): AreaState[] {
  const startIndex = levelIndex(startingDifficulty);
  const states = new Map<string, AreaState>();

  for (const area of map.areas) {
    states.set(area.name, {
      area: area.name,
      weight: area.weight,
      attempts: 0,
      nextLevelIndex: startIndex,
      lastScore: null,
      confirmedLevelIndex: -1,
      ceilingLevelIndex: null,
    });
  }

  for (const { question, evaluation } of history) {
    const state = states.get(question.area);
    if (!state) continue; // defensive: model drifted from a known area name

    const qLevel = levelIndex(question.difficulty);
    const passed = evaluation.score >= PASS_THRESHOLD;

    state.attempts += 1;
    state.lastScore = evaluation.score;

    if (passed && qLevel > state.confirmedLevelIndex) {
      state.confirmedLevelIndex = qLevel;
    }
    if (!passed && state.ceilingLevelIndex === null && qLevel >= state.confirmedLevelIndex) {
      state.ceilingLevelIndex = qLevel;
    }

    state.nextLevelIndex = passed ? Math.min(3, qLevel + 1) : Math.max(0, qLevel - 1);
  }

  return [...states.values()];
}

/**
 * Picks the next (area, difficulty) to probe: prioritizes areas whose ceiling
 * hasn't been found yet, weighted toward under-covered high-importance areas,
 * at the level the staircase says to probe next.
 */
export function computeNextProbe(
  map: KnowledgeMap,
  startingDifficulty: Difficulty,
  history: AnsweredQuestion[],
): { area: string; difficulty: Difficulty; areaState: AreaState } {
  const states = computeAreaStates(map, startingDifficulty, history);
  const openAreas = states.filter((s) => s.ceilingLevelIndex === null);
  const pool = openAreas.length > 0 ? openAreas : states;

  pool.sort((a, b) => a.attempts / a.weight - b.attempts / b.weight);

  const chosen = pool[0];
  return { area: chosen.area, difficulty: levelFromIndex(chosen.nextLevelIndex), areaState: chosen };
}

export function levelLabel(index: number): Difficulty {
  return levelFromIndex(index);
}
