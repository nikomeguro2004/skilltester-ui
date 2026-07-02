import type { AnsweredQuestion, AssessmentLength, Difficulty, KnowledgeMap } from "./types";

const LEVELS: Difficulty[] = ["beginner", "intermediate", "advanced", "expert"];
const PASS_THRESHOLD = 70;
const MAX_POSITION = LEVELS.length - 1;

// How far a single answer can move the difficulty position, scaled by how
// far the score sat from the pass line. nextLevelIndex is the *nearest*
// tier to this position (round, not floor) — so a narrow result stays
// safely inside the current tier's rounding zone and only a decisive
// result actually crosses into the next one. Up and down use different
// scales: a near-perfect score should be able to cross a full tier in one
// step (reward mastery fast), while a narrow miss should NOT immediately
// cross down a tier the way a clear failure should.
const STEP_SCALE_UP = 1.8;
const STEP_SCALE_DOWN = 3.0;

// How much a brand-new area's starting position borrows from the user's
// demonstrated ability in areas already probed, vs. the assessment's flat
// baseline difficulty. 0 = always start at baseline; 1 = start exactly at
// their average position elsewhere.
const ABILITY_PRIOR_WEIGHT = 0.35;

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
  /** Continuous difficulty position (0 = beginner floor .. ~3.999 = deep expert). */
  position: number;
  /** Level the engine will probe next for this area — floor(position), clamped. */
  nextLevelIndex: number;
  lastScore: number | null;
  /** Highest level index the candidate has demonstrably passed (>= PASS_THRESHOLD). -1 if none. */
  confirmedLevelIndex: number;
  /** Confirmed knowledge ceiling — only locked in after a second, nearby fail. null if none yet. */
  ceilingLevelIndex: number | null;
  /** True right after a first fail at/above the confirmed level, awaiting one more probe at essentially the same level before the ceiling is locked in — guards against a single noisy grade capping the area forever. */
  ceilingPending: boolean;
}

/**
 * Replays the full answer history through a per-area staircase to derive
 * each area's current probing position, confirmed mastery level, and
 * knowledge ceiling. Three behaviors beyond a plain pass→up/fail→down step:
 *
 * 1. Proportional step size — the move is scaled by how far the score sat
 *    from the pass line, so a narrow win/loss makes a small adjustment and a
 *    lopsided one makes a bigger one, instead of every result being worth an
 *    identical full-tier jump.
 * 2. Ceiling confirmation — the first fail at/above the confirmed level
 *    doesn't lock the ceiling immediately; it re-probes nearby once, and
 *    only locks in if that second attempt also fails.
 * 3. Ability prior — a freshly-probed area doesn't always start at the flat
 *    assessment baseline; it's nudged toward the user's demonstrated
 *    position in areas already tested.
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
      position: startIndex,
      nextLevelIndex: startIndex,
      lastScore: null,
      confirmedLevelIndex: -1,
      ceilingLevelIndex: null,
      ceilingPending: false,
    });
  }

  for (const { question, evaluation } of history) {
    const state = states.get(question.area);
    if (!state) continue; // defensive: model drifted from a known area name

    const qLevel = levelIndex(question.difficulty);
    const score = evaluation.score;
    const passed = score >= PASS_THRESHOLD;

    state.attempts += 1;
    state.lastScore = score;

    if (passed && qLevel > state.confirmedLevelIndex) {
      state.confirmedLevelIndex = qLevel;
    }

    if (
      !passed &&
      state.ceilingLevelIndex === null &&
      state.confirmedLevelIndex >= 0 &&
      qLevel >= state.confirmedLevelIndex
    ) {
      if (state.ceilingPending) {
        state.ceilingLevelIndex = qLevel; // second fail nearby — ceiling confirmed
        state.ceilingPending = false;
      } else {
        state.ceilingPending = true; // first fail here — verify before locking it in
      }
    } else if (passed && state.ceilingPending) {
      state.ceilingPending = false; // the earlier fail looks like noise, they just passed here
    }

    const scale = score >= PASS_THRESHOLD ? STEP_SCALE_UP : STEP_SCALE_DOWN;
    const delta = ((score - PASS_THRESHOLD) / 100) * scale;
    state.position =
      state.ceilingPending && !passed
        ? qLevel // hold at the same level for the confirmation probe
        : Math.max(0, Math.min(MAX_POSITION, qLevel + delta));
    state.nextLevelIndex = Math.round(state.position);
  }

  const tested = [...states.values()].filter((s) => s.attempts > 0);
  if (tested.length > 0) {
    const avgPosition = tested.reduce((sum, s) => sum + s.position, 0) / tested.length;
    const priorPosition = startIndex * (1 - ABILITY_PRIOR_WEIGHT) + avgPosition * ABILITY_PRIOR_WEIGHT;
    for (const state of states.values()) {
      if (state.attempts === 0) {
        state.position = Math.max(0, Math.min(MAX_POSITION, priorPosition));
        state.nextLevelIndex = Math.round(state.position);
      }
    }
  }

  return [...states.values()];
}

/**
 * Restricts probing to the highest-weight areas when the question budget
 * can't afford at least two questions in every area. A single shallow
 * question per area never gives the staircase a real second data point to
 * adapt with, so short assessments deliberately go deep on fewer, more
 * central areas instead of shallow on all of them — areas left out simply
 * stay unprobed and are reported as "not assessed" rather than guessed at.
 */
function restrictToActivePool(states: AreaState[], length: AssessmentLength): AreaState[] {
  const idealSlotsPerArea = 2;
  const affordableAreaCount = Math.max(1, Math.floor(length / idealSlotsPerArea));
  if (affordableAreaCount >= states.length) return states;

  const byWeightDesc = [...states].sort((a, b) => b.weight - a.weight);
  const activeNames = new Set(byWeightDesc.slice(0, affordableAreaCount).map((s) => s.area));

  for (const s of states) {
    if (s.attempts > 0) activeNames.add(s.area); // never abandon an area already started
  }

  return states.filter((s) => activeNames.has(s.area));
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
  length: AssessmentLength,
): { area: string; difficulty: Difficulty; areaState: AreaState } {
  const states = computeAreaStates(map, startingDifficulty, history);
  const activeStates = restrictToActivePool(states, length);

  const openAreas = activeStates.filter((s) => s.ceilingLevelIndex === null);
  const pool = openAreas.length > 0 ? openAreas : activeStates;

  pool.sort((a, b) => a.attempts / a.weight - b.attempts / b.weight);

  const chosen = pool[0];
  return { area: chosen.area, difficulty: levelFromIndex(chosen.nextLevelIndex), areaState: chosen };
}
