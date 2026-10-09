'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Dumbbell, Gem, Play, Siren, X } from 'lucide-react';
import ArabiWallet from '../components/ArabiWallet';
import EmergencyModal from '../components/EmergencyModal';
import GymLeaderboard from '../components/GymLeaderboard';
import PostWorkoutModal from '../components/PostWorkoutModal';
import WorkoutPlanTab from '../components/WorkoutPlanTab';
import { unlockAudio } from '../lib/audioFeedback';
import type { PlanExercise } from '../lib/planGenerator';
import { useJoFitState, type SessionSummary } from '../lib/useJoFitState';
import { buildPlanConfig, buildStandaloneConfig, type SquatWorkoutResult } from '../lib/workoutConfig';

// MediaPipe, the camera and the canvas are browser-only, so the tracker never renders on the server.
const SquatTracker = dynamic(() => import('../components/SquatTracker'), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-[4/3] w-full max-w-[640px] place-items-center rounded-2xl border border-cyber-cyan/30 bg-[#050C14] font-mono text-sm text-cyber-cyan">
      Loading tracker…
    </div>
  ),
});

const TABS = [
  { id: 'tracker', label: 'AI Tracker' },
  { id: 'plan', label: 'Workout Plan' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'wallet', label: 'Arabi Wallet' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const TAB_STORAGE_KEY = 'jofit:tab';
const EXERCISE_STORAGE_KEY = 'jofit:selectedExercise';

const fmt = (n: number) => n.toLocaleString('en-US');

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Blocked storage only loses the remembered tab.
  }
}

export default function Home() {
  const { data, hydrated, finishSet, convert, redeem, saveEmergencyContact, savePlan } = useJoFitState();
  const [tab, setTab] = useState<TabId>('tracker');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [trackerRun, setTrackerRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Restore tab and selected plan exercise after mount (sessionStorage is browser-only).
  useEffect(() => {
    const storedTab = readSession(TAB_STORAGE_KEY);
    if (TABS.some((t) => t.id === storedTab)) setTab(storedTab as TabId);
    setSelectedExerciseId(readSession(EXERCISE_STORAGE_KEY));
  }, []);

  const kneeSafe = data.survey?.injuries.includes('Knee') ?? false;
  const selectedExercise = useMemo<PlanExercise | null>(() => {
    if (!selectedExerciseId || !data.plan) return null;
    for (const day of data.plan.schedule) {
      const match = day.exercises.find((e) => e.id === selectedExerciseId && e.aiSupported);
      if (match) return match;
    }
    return null;
  }, [data.plan, selectedExerciseId]);

  const config = useMemo(
    () =>
      selectedExercise
        ? buildPlanConfig(selectedExercise, kneeSafe)
        : buildStandaloneConfig(data.profile.targetReps, kneeSafe),
    [selectedExercise, kneeSafe, data.profile.targetReps],
  );

  const selectTab = (next: TabId) => {
    setTab(next);
    writeSession(TAB_STORAGE_KEY, next);
    // Leaving the tracker turns the camera off and discards the set in progress.
    if (next !== 'tracker') setStarted(false);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const target =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    selectTab(TABS[target].id);
    tabRefs.current[target]?.focus();
  };

  const startWorkout = () => {
    // This click is the user gesture that lets later rep tones play.
    unlockAudio();
    setTrackerRun((n) => n + 1);
    setStarted(true);
  };

  const handleSelectExercise = (exercise: PlanExercise) => {
    setSelectedExerciseId(exercise.id);
    writeSession(EXERCISE_STORAGE_KEY, exercise.id);
    selectTab('tracker');
    startWorkout();
  };

  const clearSelectedExercise = () => {
    setSelectedExerciseId(null);
    writeSession(EXERCISE_STORAGE_KEY, null);
  };

  const handleFinish = useCallback(
    (result: SquatWorkoutResult) => {
      setStarted(false);
      setSummary(finishSet(result));
    },
    [finishSet],
  );

  const openSos = () => {
    setStarted(false);
    setSosOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyber-cyan/60 bg-cyber-cyan/10 shadow-glow-cyan">
              <Activity className="h-5 w-5 text-cyber-cyan" aria-hidden />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-zinc-50">
              Jo-<span className="text-cyber-cyan [text-shadow:0_0_14px_rgba(0,229,255,0.6)]">Fit</span>
            </span>
          </div>

          <span className="hidden rounded-full border border-sky-900 bg-bank-navy px-3 py-1 text-xs text-sky-100/80 md:inline-block">
            Official Health Partner: <strong className="font-semibold text-white">Arab Bank</strong>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-full border border-cyber-gold/50 bg-cyber-gold/10 px-3 py-1.5"
              aria-label={hydrated ? `${fmt(data.profile.fitPoints)} Arabi Fit Points` : 'Loading points'}
            >
              <Gem className="h-4 w-4 text-cyber-gold" aria-hidden />
              {hydrated ? (
                <span className="font-mono text-sm font-bold tabular-nums text-cyber-gold">{fmt(data.profile.fitPoints)}</span>
              ) : (
                <span className="h-4 w-12 animate-pulse rounded bg-cyber-gold/20" aria-hidden />
              )}
              <span className="hidden text-xs text-cyber-gold/80 sm:inline">Arabi Pts</span>
            </div>
            <button
              type="button"
              onClick={openSos}
              aria-label="Emergency SOS"
              className="grid h-9 w-9 place-items-center rounded-full border-2 border-rose-500 text-rose-500 transition hover:bg-rose-500/15 hover:shadow-glow-red"
            >
              <Siren className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <span className="w-full rounded-full border border-sky-900 bg-bank-navy px-3 py-1 text-center text-xs text-sky-100/80 md:hidden">
            Official Health Partner: <strong className="font-semibold text-white">Arab Bank</strong>
          </span>
        </div>

        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3">
          <div role="tablist" aria-label="Jo-Fit sections" className="flex w-max gap-2">
            {TABS.map((t, index) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? 'border-cyber-cyan bg-cyber-cyan text-zinc-950 shadow-glow-cyan'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={-1}>
          {tab === 'tracker' && (
            <div className="flex flex-col items-center gap-5">
              <div className="flex w-full max-w-[640px] flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-zinc-50">AI Workout Studio</h1>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-[0.15em] ${
                    started ? 'border-cyber-emerald/60 text-cyber-emerald' : 'border-cyber-gold/50 text-cyber-gold'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${started ? 'animate-pulse-slow bg-cyber-emerald shadow-glow-emerald' : 'bg-cyber-gold'}`}
                    aria-hidden
                  />
                  {started ? 'LIVE · AI TRACKING' : 'READY'}
                </span>
              </div>

              {started ? (
                <SquatTracker key={trackerRun} config={config} onFinish={handleFinish} />
              ) : (
                <div className="w-full max-w-[640px] rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center sm:p-8">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyber-cyan/50 bg-cyber-cyan/10 shadow-glow-cyan">
                    <Dumbbell className="h-7 w-7 text-cyber-cyan" aria-hidden />
                  </span>

                  {selectedExercise ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Up next from your plan</p>
                      <p className="mt-1 text-lg font-bold text-zinc-100">{selectedExercise.name}</p>
                      <p className="mt-1 font-mono text-sm text-zinc-400">
                        {config.sets} × {config.targetReps} reps · {selectedExercise.rest} rest
                        {kneeSafe ? ' · knee-safe depth' : ''}
                      </p>
                      <button
                        type="button"
                        onClick={clearSelectedExercise}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                      >
                        <X className="h-3 w-3" aria-hidden /> Switch to a free set instead
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-lg font-bold text-zinc-100">Free squat set</p>
                      <p className="mt-1 font-mono text-sm text-zinc-400">
                        1 × {hydrated ? config.targetReps : '—'} reps{kneeSafe ? ' · knee-safe depth' : ''}
                      </p>
                    </div>
                  )}

                  <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm text-zinc-300">
                    <li>• Stand 2–3 m from the camera with your full body visible.</li>
                    <li>• Side-on is most accurate; facing the camera also works.</li>
                    <li>
                      {kneeSafe
                        ? `• Knee-safe: squat to box depth (${config.depth.validAngle}° knee angle), not below ${config.depth.tooDeepAngle}°.`
                        : `• Squat until your thigh is parallel (${config.depth.validAngle}° knee angle), then stand fully up.`}
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={startWorkout}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyber-cyan px-6 py-3.5 text-base font-extrabold text-zinc-950 shadow-glow-cyan transition hover:brightness-110"
                  >
                    <Play className="h-5 w-5" aria-hidden /> Start AI Workout
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'plan' && (
            <WorkoutPlanTab
              plan={data.plan}
              survey={data.survey}
              profile={data.profile}
              lastSession={data.lastSession}
              hydrated={hydrated}
              onPlanGenerated={(plan, survey) => {
                savePlan(survey, plan);
                clearSelectedExercise();
              }}
              onSelectExercise={handleSelectExercise}
            />
          )}

          {tab === 'leaderboard' && (
            <GymLeaderboard
              hydrated={hydrated}
              currentUser={{
                name: data.profile.name,
                weight: data.profile.currentWeight,
                formAccuracy: data.lastFormAccuracy ?? 0,
                points: data.monthlyPoints,
              }}
            />
          )}

          {tab === 'wallet' && (
            <ArabiWallet
              fitPoints={data.profile.fitPoints}
              arabiRewardPoints={data.arabiRewardPoints}
              hydrated={hydrated}
              onConvert={convert}
              onRedeem={redeem}
            />
          )}
        </section>
      </main>

      <PostWorkoutModal summary={summary} onClose={() => setSummary(null)} />
      <EmergencyModal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        contact={data.emergencyContact}
        onSaveContact={saveEmergencyContact}
      />
    </div>
  );
}
