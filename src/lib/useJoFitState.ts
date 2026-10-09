'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  arabBankVouchers,
  FIT_TO_ARABI_RATE,
  heroesGymLeaderboard,
  userSeed,
  type PartnerVoucher,
} from '../data/mockData';
import { currentUserRank } from './leaderboard';
import { generatePlan, PLAN_VERSION, type SurveyInput, type WorkoutPlan } from './planGenerator';
import { calculateNextSession, type SessionStatus, type UserProfile } from './progressiveOverload';
import type { SquatSetResult, SquatWorkoutResult } from './workoutConfig';

const STORAGE_KEY = 'jofit:v1';
const MIN_SET_COMPLETION = 0.5;

export type SummaryStatus = SessionStatus | 'Set Discarded';

export interface SessionSummary {
  id: string;
  completedAt: string;
  exerciseName: string;
  status: SummaryStatus;
  sets: SquatSetResult[];
  setsPlanned: number;
  targetReps: number;
  validReps: number;
  badReps: number;
  formAccuracy: number;
  pointsEarned: number;
  isBodyweight: boolean;
  previousWeight: number;
  nextWeight: number;
  previousTargetReps: number;
  nextTargetReps: number;
  rankBefore: number;
  rankAfter: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface JoFitData {
  profile: UserProfile;
  arabiRewardPoints: number;
  monthlyPoints: number;
  lastFormAccuracy: number | null;
  lastSession: SessionSummary | null;
  emergencyContact: EmergencyContact | null;
  survey: SurveyInput | null;
  plan: WorkoutPlan | null;
}

export const SEED: JoFitData = {
  profile: userSeed.profile,
  arabiRewardPoints: userSeed.arabiRewardPoints,
  monthlyPoints: userSeed.monthlyPoints,
  lastFormAccuracy: userSeed.lastFormAccuracy,
  lastSession: null,
  emergencyContact: null,
  survey: null,
  plan: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const numberOr = (value: unknown, fallback: number) => (isNumber(value) ? value : fallback);

/** Merges stored data over the seed, keeping only fields with the expected shape. */
export function sanitize(raw: unknown): JoFitData {
  if (!isRecord(raw)) return SEED;
  const storedProfile = isRecord(raw.profile) ? raw.profile : {};
  const experience = storedProfile.experience;

  const profile: UserProfile = {
    name: typeof storedProfile.name === 'string' ? storedProfile.name : SEED.profile.name,
    age: numberOr(storedProfile.age, SEED.profile.age),
    experience:
      experience === 'Beginner' || experience === 'Intermediate' || experience === 'Advanced'
        ? experience
        : SEED.profile.experience,
    currentWeight: numberOr(storedProfile.currentWeight, SEED.profile.currentWeight),
    targetReps: numberOr(storedProfile.targetReps, SEED.profile.targetReps),
    fitPoints: numberOr(storedProfile.fitPoints, SEED.profile.fitPoints),
  };

  const contact = raw.emergencyContact;
  const plan = raw.plan;
  const survey = raw.survey;
  const validSurvey =
    isRecord(survey) && Array.isArray(survey.injuries) && isNumber(survey.age) && isNumber(survey.daysAvailable)
      ? (survey as unknown as SurveyInput)
      : null;
  // Plans saved before the 7-day schedule are regenerated from the saved survey (generation is deterministic).
  const storedPlanIsCurrent =
    isRecord(plan) &&
    plan.version === PLAN_VERSION &&
    isRecord(plan.planSummary) &&
    Array.isArray(plan.schedule) &&
    Array.isArray(plan.warnings);

  return {
    profile,
    arabiRewardPoints: numberOr(raw.arabiRewardPoints, SEED.arabiRewardPoints),
    monthlyPoints: numberOr(raw.monthlyPoints, SEED.monthlyPoints),
    lastFormAccuracy: isNumber(raw.lastFormAccuracy) ? raw.lastFormAccuracy : SEED.lastFormAccuracy,
    lastSession:
      isRecord(raw.lastSession) && typeof raw.lastSession.status === 'string' && Array.isArray(raw.lastSession.sets)
        ? (raw.lastSession as unknown as SessionSummary)
        : null,
    emergencyContact:
      isRecord(contact) && typeof contact.name === 'string' && typeof contact.phone === 'string'
        ? { name: contact.name, phone: contact.phone }
        : null,
    survey: validSurvey,
    plan: storedPlanIsCurrent ? (plan as unknown as WorkoutPlan) : validSurvey ? generatePlan(validSurvey) : null,
  };
}

function randomDigits(count: number): string {
  const values = new Uint32Array(count);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => String(v % 10)).join('');
}

function rankFor(points: number, weight: number, formAccuracy: number | null): number {
  return currentUserRank(heroesGymLeaderboard.athletes, {
    name: 'You',
    weight,
    formAccuracy: formAccuracy ?? 0,
    points,
  });
}

/**
 * Applies a finished workout: runs the overload rules, or discards the workout when
 * too few reps/sets were done so an aborted demo set can't deload the user.
 */
export function applyWorkoutResult(
  data: JoFitData,
  result: SquatWorkoutResult,
  now: Date = new Date(),
): { data: JoFitData; summary: SessionSummary } {
  const { profile } = data;
  const totalReps = result.validReps + result.badReps;
  const weakestSet = result.sets.length > 0 ? Math.min(...result.sets.map((set) => set.validReps)) : 0;
  const discarded =
    totalReps === 0 ||
    result.sets.length * 2 < result.setsPlanned ||
    weakestSet < Math.ceil(result.targetReps * MIN_SET_COMPLETION);

  const isBodyweight = profile.currentWeight <= 0;
  const rankBefore = rankFor(data.monthlyPoints, profile.currentWeight, data.lastFormAccuracy);
  const base = {
    id: `${now.getTime()}`,
    completedAt: now.toISOString(),
    exerciseName: result.exerciseName,
    sets: result.sets,
    setsPlanned: result.setsPlanned,
    targetReps: result.targetReps,
    validReps: result.validReps,
    badReps: result.badReps,
    formAccuracy: result.formAccuracy,
    isBodyweight,
    previousWeight: profile.currentWeight,
    previousTargetReps: profile.targetReps,
    rankBefore,
  };

  if (discarded) {
    const summary: SessionSummary = {
      ...base,
      status: 'Set Discarded',
      pointsEarned: 0,
      nextWeight: profile.currentWeight,
      nextTargetReps: profile.targetReps,
      rankAfter: rankBefore,
    };
    return { data: { ...data, lastSession: summary }, summary };
  }

  const next = calculateNextSession({ ...profile, targetReps: result.targetReps }, weakestSet, result.formAccuracy, result.validReps);
  // A plan session uses the plan's rep target; keep the standalone target unless bodyweight progression changed it.
  const nextProfile: UserProfile =
    result.source === 'plan' && !isBodyweight ? { ...next.nextProfile, targetReps: profile.targetReps } : next.nextProfile;
  const monthlyPoints = data.monthlyPoints + next.pointsEarned;

  const summary: SessionSummary = {
    ...base,
    status: next.status,
    pointsEarned: next.pointsEarned,
    nextWeight: nextProfile.currentWeight,
    nextTargetReps: isBodyweight ? next.nextProfile.targetReps : result.targetReps,
    rankAfter: rankFor(monthlyPoints, nextProfile.currentWeight, result.formAccuracy),
  };

  return {
    data: { ...data, profile: nextProfile, monthlyPoints, lastFormAccuracy: result.formAccuracy, lastSession: summary },
    summary,
  };
}

/**
 * App-wide state persisted to localStorage. The first render always uses the seed
 * (identical on server and client); stored data is loaded after mount.
 */
export function useJoFitState() {
  const [data, setData] = useState<JoFitData>(SEED);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setData(sanitize(JSON.parse(stored)));
    } catch {
      // Corrupt JSON or blocked storage: keep the seed.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked: the app keeps working from memory.
    }
  }, [data, hydrated]);

  const finishSet = useCallback(
    (result: SquatWorkoutResult): SessionSummary => {
      const applied = applyWorkoutResult(data, result);
      setData(applied.data);
      return applied.summary;
    },
    [data],
  );

  /** Converts Fit Points in multiples of the exchange rate. Returns the Arabi points credited. */
  const convert = useCallback(
    (fitAmount: number): number => {
      const units = Math.floor(fitAmount / FIT_TO_ARABI_RATE.fit);
      const cost = units * FIT_TO_ARABI_RATE.fit;
      if (units <= 0 || cost > data.profile.fitPoints) return 0;
      const credited = units * FIT_TO_ARABI_RATE.arabi;
      setData((prev) => ({
        ...prev,
        profile: { ...prev.profile, fitPoints: prev.profile.fitPoints - cost },
        arabiRewardPoints: prev.arabiRewardPoints + credited,
      }));
      return credited;
    },
    [data.profile.fitPoints],
  );

  /** Deducts the voucher cost and returns a reference code, or null if the balance is too low. */
  const redeem = useCallback(
    (voucher: PartnerVoucher): string | null => {
      if (!arabBankVouchers.some((v) => v.id === voucher.id) || voucher.costPoints > data.profile.fitPoints) return null;
      setData((prev) => ({
        ...prev,
        profile: { ...prev.profile, fitPoints: prev.profile.fitPoints - voucher.costPoints },
      }));
      return `ARAB-FIT-${randomDigits(4)}`;
    },
    [data.profile.fitPoints],
  );

  const saveEmergencyContact = useCallback((contact: EmergencyContact) => {
    setData((prev) => ({ ...prev, emergencyContact: contact }));
  }, []);

  const savePlan = useCallback((survey: SurveyInput, plan: WorkoutPlan) => {
    setData((prev) => ({
      ...prev,
      survey,
      plan,
      profile: { ...prev.profile, age: survey.age, experience: survey.experience },
    }));
  }, []);

  return { data, hydrated, finishSet, convert, redeem, saveEmergencyContact, savePlan };
}
