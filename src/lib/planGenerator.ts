/**
 * Deterministic, rule-based workout plan generator. The same survey always produces
 * the same plan, so every recommendation can be traced back to a rule.
 */

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Injury = 'None' | 'Knee' | 'Lower Back' | 'Shoulder';
export type Goal = 'Strength' | 'Hypertrophy' | 'Mobility & Joint Health';
export type Difficulty = 'Low' | 'Moderate' | 'High';

export interface SurveyInput {
  age: number;
  /** cm */
  height: number;
  /** kg (body weight) */
  weight: number;
  experience: ExperienceLevel;
  /** 2 to 5 */
  daysAvailable: number;
  injuries: Injury[];
  goal: Goal;
}

export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  difficulty: Difficulty;
  aiSupported: boolean;
  targetMetric?: string;
  /** Rest length used by the tracker's countdown between sets. */
  restSeconds: number;
  kind: 'squat' | 'other';
}

export interface TrainingDay {
  type: 'training';
  dayTitle: string;
  exercises: PlanExercise[];
}

export interface RecoveryDay {
  type: 'recovery';
  dayTitle: string;
  recovery: {
    kind: 'active' | 'full';
    title: string;
    items: string[];
  };
}

export type PlanDay = TrainingDay | RecoveryDay;

export const PLAN_VERSION = 2;
export const DAYS_IN_WEEK = 7;

export interface PlanSummary {
  splitName: string;
  daysPerWeek: number;
  overallDifficulty: Difficulty;
  injuryProtocol: string;
}

export type PlanWarningKind = 'knee' | 'lowerBack' | 'shoulder' | 'age';

export interface PlanWarning {
  kind: PlanWarningKind;
  title: string;
  message: string;
}

export interface WorkoutPlan {
  version: typeof PLAN_VERSION;
  planSummary: PlanSummary;
  /** Rule 1 intensity label, e.g. "Moderate-High". */
  intensity: string;
  /** Target rate of perceived exertion, e.g. "7-8". */
  rpe: string;
  schedule: PlanDay[];
  warnings: PlanWarning[];
}

export const INJURY_OPTIONS: Injury[] = ['None', 'Knee', 'Lower Back', 'Shoulder'];
export const GOAL_OPTIONS: Goal[] = ['Strength', 'Hypertrophy', 'Mobility & Joint Health'];
export const EXPERIENCE_OPTIONS: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
export const MIN_DAYS = 2;
export const MAX_DAYS = 5;

const MEDICAL_DISCLAIMER = 'Not medical advice — consult a physiotherapist.';
const AGE_GUARDRAIL_MIN = 18;
const AGE_GUARDRAIL_MAX = 50;

// ---------------------------------------------------------------------------
// Rule tables
// ---------------------------------------------------------------------------

const DIFFICULTY_ORDER: Difficulty[] = ['Low', 'Moderate', 'High'];
const capDifficulty = (value: Difficulty, cap: Difficulty): Difficulty =>
  DIFFICULTY_ORDER.indexOf(value) > DIFFICULTY_ORDER.indexOf(cap) ? cap : value;
const lowerDifficulty = (value: Difficulty): Difficulty => DIFFICULTY_ORDER[Math.max(0, DIFFICULTY_ORDER.indexOf(value) - 1)];
const maxDifficulty = (values: Difficulty[]): Difficulty =>
  values.reduce<Difficulty>((max, v) => (DIFFICULTY_ORDER.indexOf(v) > DIFFICULTY_ORDER.indexOf(max) ? v : max), 'Low');

/** Rule 1: experience sets intensity, RPE, base difficulty and working sets. */
const EXPERIENCE_RULES: Record<ExperienceLevel, { intensity: string; rpe: string; difficulty: Difficulty; sets: number }> = {
  Beginner: { intensity: 'Low-Moderate', rpe: '6-7', difficulty: 'Low', sets: 3 },
  Intermediate: { intensity: 'Moderate-High', rpe: '7-8', difficulty: 'Moderate', sets: 4 },
  Advanced: { intensity: 'High Intensity', rpe: '8-9', difficulty: 'High', sets: 4 },
};

const BEGINNER_REPS = '10-12';

type Rest = { label: string; seconds: number };

/** The goal sets rep ranges and rest for compound lifts. */
const GOAL_RULES: Record<Goal, { reps: string; rest: Rest }> = {
  Strength: { reps: '4-6', rest: { label: '120-180s', seconds: 150 } },
  Hypertrophy: { reps: '8-12', rest: { label: '60-90s', seconds: 75 } },
  'Mobility & Joint Health': { reps: '12-15', rest: { label: '45-60s', seconds: 60 } },
};

/** Rule 2: rest for under-18 / over-50 users. */
const GUARDRAIL_REST: Rest = { label: '90-120s', seconds: 120 };
const ACCESSORY_REST: Rest = { label: '60s', seconds: 60 };
const SHORT_REST: Rest = { label: '30s', seconds: 30 };

// ---------------------------------------------------------------------------
// Exercise templates
// ---------------------------------------------------------------------------

type Region = 'lower' | 'upper' | 'core';
type Role = 'main' | 'compound' | 'isolation' | 'core';

interface ExerciseTemplate {
  key: string;
  name: string;
  region: Region;
  role: Role;
  /** Rule 3 substitutions, checked in priority order Knee → Lower Back → Shoulder. */
  swaps?: Partial<Record<Exclude<Injury, 'None'>, string>>;
}

const SQUAT: ExerciseTemplate = {
  key: 'squat',
  name: 'Barbell / Bodyweight Squats',
  region: 'lower',
  role: 'main',
  swaps: { Knee: 'Rehab Box Squats / Bodyweight Tempo Squats', 'Lower Back': 'Goblet / Bodyweight Squats' },
};

const ex = (
  key: string,
  name: string,
  region: Region,
  role: Role,
  swaps?: ExerciseTemplate['swaps'],
): ExerciseTemplate => ({ key, name, region, role, swaps });

type DayTemplate = { title: string; exercises: ExerciseTemplate[] };

const LOWER_A: DayTemplate = {
  title: 'Lower Body Biomechanics',
  exercises: [
    SQUAT,
    ex('rdl', 'Romanian Deadlift', 'lower', 'compound', { 'Lower Back': 'Hip Thrust' }),
    ex('lunge', 'Walking Lunges', 'lower', 'compound', { Knee: 'Glute Bridge' }),
    ex('calf', 'Standing Calf Raises', 'lower', 'isolation'),
    ex('plank', 'Front Plank', 'core', 'core'),
  ],
};

const LOWER_B: DayTemplate = {
  title: 'Lower Body Power & Posterior Chain',
  exercises: [
    SQUAT,
    ex('deadlift', 'Conventional Deadlift', 'lower', 'compound', { 'Lower Back': 'Hip Thrust' }),
    ex('box-jump', 'Box Jumps', 'lower', 'compound', { Knee: 'Hamstring Curl' }),
    ex('ham-curl', 'Hamstring Curl', 'lower', 'isolation', { Knee: 'Glute Bridge' }),
    ex('dead-bug', 'Dead Bug', 'core', 'core'),
  ],
};

const UPPER_A: DayTemplate = {
  title: 'Upper Body Push / Pull',
  exercises: [
    ex('bench', 'Barbell Bench Press', 'upper', 'compound', { Shoulder: 'Neutral-Grip DB Press' }),
    ex('row', 'Barbell Row', 'upper', 'compound', { 'Lower Back': 'Chest-Supported Row' }),
    ex('ohp', 'Standing Overhead Press', 'upper', 'compound', {
      Shoulder: 'Landmine Press',
      'Lower Back': 'Seated Back-Supported DB Press',
    }),
    ex('pullup', 'Pull-ups', 'upper', 'compound', { Shoulder: 'Neutral-Grip Lat Pulldown' }),
    ex('face-pull', 'Face Pulls', 'upper', 'isolation'),
  ],
};

const UPPER_B: DayTemplate = {
  title: 'Upper Body Hypertrophy & Shoulder Health',
  exercises: [
    ex('incline', 'Incline DB Press', 'upper', 'compound', { Shoulder: 'Neutral-Grip DB Press' }),
    ex('pulldown', 'Lat Pulldown', 'upper', 'compound', { Shoulder: 'Neutral-Grip Lat Pulldown' }),
    ex('cable-row', 'Seated Cable Row', 'upper', 'compound'),
    ex('lateral', 'Lateral Raises', 'upper', 'isolation', { Shoulder: 'Band External Rotations' }),
    ex('side-plank', 'Side Plank', 'core', 'core'),
  ],
};

const FULL_A: DayTemplate = {
  title: 'Full Body Integration',
  exercises: [
    SQUAT,
    ex('db-bench', 'DB Bench Press', 'upper', 'compound', { Shoulder: 'Neutral-Grip DB Press' }),
    ex('rdl', 'Romanian Deadlift', 'lower', 'compound', { 'Lower Back': 'Hip Thrust' }),
    ex('pulldown', 'Lat Pulldown', 'upper', 'compound', { Shoulder: 'Neutral-Grip Lat Pulldown' }),
    ex('plank', 'Front Plank', 'core', 'core'),
  ],
};

const FULL_B: DayTemplate = {
  title: 'Full Body Strength Circuit',
  exercises: [
    SQUAT,
    ex('pushup', 'Push-ups', 'upper', 'compound', { Shoulder: 'Incline Push-ups (pain-free range)' }),
    ex('row', 'Barbell Row', 'upper', 'compound', { 'Lower Back': 'Chest-Supported Row' }),
    ex('lunge', 'Walking Lunges', 'lower', 'compound', { Knee: 'Glute Bridge' }),
    ex('dead-bug', 'Dead Bug', 'core', 'core'),
  ],
};

const SPLITS: Record<number, { name: string; days: DayTemplate[] }> = {
  2: { name: 'Full Body A/B', days: [FULL_A, FULL_B] },
  3: { name: 'Lower / Upper / Full Body', days: [LOWER_A, UPPER_A, FULL_A] },
  4: { name: 'Upper / Lower ×2', days: [LOWER_A, UPPER_A, LOWER_B, UPPER_B] },
  5: { name: '5-Day Hybrid (Lower / Upper / Full Body)', days: [LOWER_A, UPPER_A, LOWER_B, UPPER_B, FULL_A] },
};

/** Training (T) / recovery (R) placement across Day 1 (Sunday) → Day 7 (Saturday). */
const WEEK_PATTERNS: Record<number, string> = {
  2: 'TRRTRRR',
  3: 'TRTRTRR',
  4: 'TTRTTRR',
  5: 'TTTRTTR',
};

const ACTIVE_RECOVERY = {
  kind: 'active' as const,
  title: 'Active Recovery & Mobility',
  items: [
    '20-min light walk (conversational pace)',
    'Hip & hamstring mobility: 90/90 hip switches, hamstring floss, couch stretch — 2 rounds',
    'Hydration: 2.5 L water across the day',
    'Arab Bank Wellness Goal: protect your streak — rest is part of training',
  ],
};

const FULL_REST = {
  kind: 'full' as const,
  title: 'Full Rest & Muscle Synthesis',
  items: [
    'No structured training — let muscle protein synthesis do its work',
    'Optional 20-min easy walk',
    'Sleep 7–9 hours and drink 2.5 L water',
    'Arab Bank Wellness Goal: recharge for your next verified session',
  ],
};

const INJURY_PRIORITY: Exclude<Injury, 'None'>[] = ['Knee', 'Lower Back', 'Shoulder'];

export const isTrainingDay = (day: PlanDay): day is TrainingDay => day.type === 'training';

/** Finds an exercise anywhere in the week by id. */
export function findExercise(plan: WorkoutPlan, id: string): PlanExercise | null {
  for (const day of plan.schedule) {
    if (!isTrainingDay(day)) continue;
    const match = day.exercises.find((exercise) => exercise.id === id);
    if (match) return match;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/** "None" is exclusive: it's dropped as soon as any real injury is selected. */
export function normalizeInjuries(injuries: Injury[]): Exclude<Injury, 'None'>[] {
  return INJURY_PRIORITY.filter((injury) => injuries.includes(injury));
}

export function generatePlan(input: SurveyInput): WorkoutPlan {
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(input.daysAvailable)));
  const injuries = normalizeInjuries(input.injuries);
  const has = (injury: Exclude<Injury, 'None'>) => injuries.includes(injury);

  const experience = EXPERIENCE_RULES[input.experience];
  const goal = GOAL_RULES[input.goal];
  const ageGuardrail = input.age < AGE_GUARDRAIL_MIN || input.age > AGE_GUARDRAIL_MAX;

  // Rule 1 (+ Rule 2 cap on intensity).
  const baseDifficulty = ageGuardrail ? capDifficulty(experience.difficulty, 'Moderate') : experience.difficulty;
  const intensity = ageGuardrail && experience.difficulty !== 'Low' ? 'Moderate (age guardrail)' : experience.intensity;
  const rpe = ageGuardrail && experience.difficulty !== 'Low' ? '6-7' : experience.rpe;
  const compoundReps = input.experience === 'Beginner' ? BEGINNER_REPS : goal.reps;

  // Rule 2: longer rest for under-18 / over-50.
  const compoundRest = ageGuardrail && goal.rest.seconds < GUARDRAIL_REST.seconds ? GUARDRAIL_REST : goal.rest;
  const accessoryRest = ageGuardrail ? GUARDRAIL_REST : ACCESSORY_REST;

  const regionCap = (region: Region): Difficulty => {
    if (region === 'lower' && has('Knee')) return 'Moderate';
    if (region === 'upper' && has('Shoulder')) return 'Moderate';
    return 'High';
  };

  const buildExercise = (template: ExerciseTemplate, dayNumber: number): PlanExercise => {
    const swapInjury = INJURY_PRIORITY.find((injury) => has(injury) && template.swaps?.[injury]);
    const name = swapInjury ? template.swaps![swapInjury]! : template.name;

    let difficulty: Difficulty;
    let sets: number;
    let reps: string;
    let rest: Rest;
    switch (template.role) {
      case 'main':
        difficulty = baseDifficulty;
        sets = experience.sets;
        reps = compoundReps;
        rest = compoundRest;
        break;
      case 'compound':
        // Accessory compounds sit one notch below the main lift, but never drop to Low.
        difficulty = capDifficulty(baseDifficulty, 'Moderate');
        sets = 3;
        reps = compoundReps;
        rest = compoundRest;
        break;
      case 'isolation':
        difficulty = lowerDifficulty(baseDifficulty);
        sets = 3;
        reps = '12-15';
        rest = accessoryRest;
        break;
      case 'core':
        difficulty = 'Low';
        sets = 3;
        reps = '30-45s hold';
        rest = SHORT_REST;
        break;
    }
    difficulty = capDifficulty(difficulty, regionCap(template.region));

    const isSquat = template.key === 'squat';
    return {
      id: `d${dayNumber}-${template.key}`,
      name,
      sets,
      reps,
      rest: rest.label,
      restSeconds: rest.seconds,
      difficulty,
      aiSupported: isSquat,
      kind: isSquat ? 'squat' : 'other',
      targetMetric: isSquat
        ? has('Knee')
          ? 'Knee angle 90–100° (box depth)'
          : 'Knee angle ≤ 90° (parallel)'
        : undefined,
    };
  };

  const warmup = (dayNumber: number): PlanExercise => ({
    id: `d${dayNumber}-warmup`,
    name: 'Dynamic Warm-up & Joint Mobility',
    sets: 2,
    reps: '8-10 per drill',
    rest: SHORT_REST.label,
    restSeconds: SHORT_REST.seconds,
    difficulty: 'Low',
    aiSupported: false,
    kind: 'other',
  });

  const mobilityFlow = (dayNumber: number): PlanExercise => ({
    id: `d${dayNumber}-mobility`,
    name: 'Hip, Ankle & T-Spine Mobility Flow',
    sets: 2,
    reps: '6-8 per drill',
    rest: SHORT_REST.label,
    restSeconds: SHORT_REST.seconds,
    difficulty: 'Low',
    aiSupported: false,
    kind: 'other',
  });

  const isMobilityGoal = input.goal === 'Mobility & Joint Health';
  const split = SPLITS[days];

  // Fill the week: training templates go into the T slots in order; R slots become recovery days.
  // A rest day right after training is active recovery; a second rest day in a row (or Day 7) is full rest.
  const templates = [...split.days];
  const pattern = WEEK_PATTERNS[days];
  const schedule: PlanDay[] = Array.from(pattern, (slot, index): PlanDay => {
    const dayNumber = index + 1;
    if (slot === 'T') {
      const day = templates.shift()!;
      const exercises = day.exercises.map((template) => buildExercise(template, dayNumber));
      if (ageGuardrail) exercises.unshift(warmup(dayNumber));
      if (isMobilityGoal) exercises.push(mobilityFlow(dayNumber));
      return { type: 'training', dayTitle: `Day ${dayNumber}: ${day.title}`, exercises };
    }
    const afterTraining = index > 0 && pattern[index - 1] === 'T';
    const recovery = afterTraining && dayNumber !== DAYS_IN_WEEK ? ACTIVE_RECOVERY : FULL_REST;
    return {
      type: 'recovery',
      dayTitle: `Day ${dayNumber}: ${recovery.title}`,
      recovery: { ...recovery, items: [...recovery.items] },
    };
  });

  const warnings: PlanWarning[] = [];
  if (has('Knee')) {
    warnings.push({
      kind: 'knee',
      title: 'Knee safeguard active',
      message: `Knee loading reduced: squats switched to box / tempo squats with depth capped near 90° (reps count from 100°, going below 80° triggers a warning), lunges and jumps replaced, lower body capped at Moderate. ${MEDICAL_DISCLAIMER}`,
    });
  }
  if (has('Lower Back')) {
    warnings.push({
      kind: 'lowerBack',
      title: 'Lower-back safeguard active',
      message: `Heavy spinal (axial) loading replaced with supported alternatives: goblet squats, hip thrusts, chest-supported rows and seated presses. ${MEDICAL_DISCLAIMER}`,
    });
  }
  if (has('Shoulder')) {
    warnings.push({
      kind: 'shoulder',
      title: 'Shoulder safeguard active',
      message: `Overhead and barbell pressing replaced with landmine and neutral-grip work, upper body capped at Moderate. For squats, hold the bar with a comfortable wide grip or use a goblet hold. ${MEDICAL_DISCLAIMER}`,
    });
  }
  if (ageGuardrail) {
    warnings.push({
      kind: 'age',
      title: 'Age guardrail active',
      message: `For athletes under ${AGE_GUARDRAIL_MIN} or over ${AGE_GUARDRAIL_MAX}: intensity capped at Moderate (RPE ≤ 7), rest extended to 90-120s, and a warm-up mobility block added to every session.`,
    });
  }

  const injuryProtocol =
    injuries.length === 0 ? 'No injuries reported — standard progression' : `${injuries.join(' + ')} safeguards active`;

  return {
    version: PLAN_VERSION,
    planSummary: {
      splitName: isMobilityGoal ? `${split.name} + Mobility` : split.name,
      daysPerWeek: days,
      overallDifficulty: maxDifficulty(
        schedule.filter(isTrainingDay).flatMap((day) => day.exercises.map((e) => e.difficulty)),
      ),
      injuryProtocol,
    },
    intensity,
    rpe,
    schedule,
    warnings,
  };
}
