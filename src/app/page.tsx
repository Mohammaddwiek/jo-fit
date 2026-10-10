'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import ArabiWallet from '../components/ArabiWallet';
import BottomNav, { TABS, type TabId } from '../components/BottomNav';
import EmergencyModal from '../components/EmergencyModal';
import GymLeaderboard from '../components/GymLeaderboard';
import HomeDashboard from '../components/HomeDashboard';
import PostWorkoutModal from '../components/PostWorkoutModal';
import SideDrawer from '../components/SideDrawer';
import WorkoutPlanTab from '../components/WorkoutPlanTab';
import WorkoutSurveyModal from '../components/WorkoutSurveyModal';
import { useToast } from '../components/ui/Toast';
import { useLanguage } from '../context/LanguageContext';
import { unlockAudio } from '../lib/audioFeedback';
import { findExercise, type PlanExercise } from '../lib/planGenerator';
import { applyWorkoutResult, useJoFitState, type SessionSummary } from '../lib/useJoFitState';
import { buildPlanConfig, buildStandaloneConfig, type SquatWorkoutResult } from '../lib/workoutConfig';

// MediaPipe, the camera and the canvas are browser-only, so the tracker never renders on the server.
const SquatTracker = dynamic(() => import('../components/SquatTracker'), {
  ssr: false,
  loading: () => (
    <div className="dark grid aspect-[4/3] w-full place-items-center rounded-2xl border border-cyber-cyan/30 bg-[#050C14] font-mono text-sm text-accent-cyan">
      Loading tracker…
    </div>
  ),
});

const BicepTracker = dynamic(() => import('../components/BicepTracker'), {
  ssr: false,
  loading: () => (
    <div className="dark grid aspect-[4/3] w-full place-items-center rounded-2xl border border-cyber-cyan/30 bg-[#050C14] font-mono text-sm text-accent-cyan">
      Loading tracker…
    </div>
  ),
});

const TAB_STORAGE_KEY = 'jofit:tab';
const EXERCISE_STORAGE_KEY = 'jofit:selectedExercise';
/** Tabs from before the navigation refactor. */
const LEGACY_TABS: Record<string, TabId> = { tracker: 'plan' };

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
  const [tab, setTab] = useState<TabId>('home');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [trackerRun, setTrackerRun] = useState(0);
  const [started, setStarted] = useState(false);
  // The curl tracker reports when its camera stops (end of set); squat sets are live while open.
  const [curlCameraLive, setCurlCameraLive] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [todayIndex, setTodayIndex] = useState<number | null>(null);
  const showToast = useToast();
  const { t } = useLanguage();

  // Browser-only values are read after mount so the server and first client render match.
  useEffect(() => {
    const storedTab = readSession(TAB_STORAGE_KEY);
    const restored = storedTab && (LEGACY_TABS[storedTab] ?? (TABS.some((t) => t.id === storedTab) ? (storedTab as TabId) : null));
    if (restored) setTab(restored);
    setSelectedExerciseId(readSession(EXERCISE_STORAGE_KEY));
    // Day 1 of the plan week is Sunday, matching the Jordanian work week.
    setTodayIndex(new Date().getDay());
  }, []);

  const kneeSafe = data.survey?.injuries.includes('Knee') ?? false;
  const selectedExercise = useMemo<PlanExercise | null>(() => {
    if (!selectedExerciseId || !data.plan) return null;
    const match = findExercise(data.plan, selectedExerciseId);
    return match?.kind === 'squat' || match?.kind === 'curl' ? match : null;
  }, [data.plan, selectedExerciseId]);

  const config = useMemo(
    () =>
      selectedExercise
        ? buildPlanConfig(selectedExercise, kneeSafe)
        : buildStandaloneConfig(data.profile.targetReps, kneeSafe),
    [selectedExercise, kneeSafe, data.profile.targetReps],
  );
  const cameraLive = config.exercise !== 'curl' || curlCameraLive;

  const selectTab = (next: TabId) => {
    if (next !== tab) window.scrollTo({ top: 0 });
    setTab(next);
    writeSession(TAB_STORAGE_KEY, next);
    // Leaving the studio turns the camera off and discards the set in progress.
    if (next !== 'plan') setStarted(false);
  };

  const startTracker = (exerciseId: string | null) => {
    // This click is the user gesture that lets later rep tones play.
    unlockAudio();
    setSelectedExerciseId(exerciseId);
    writeSession(EXERCISE_STORAGE_KEY, exerciseId);
    selectTab('plan');
    setTrackerRun((n) => n + 1);
    setStarted(true);
  };

  const handleFinish = useCallback(
    (result: SquatWorkoutResult) => {
      setStarted(false);
      setSummary(finishSet(result));
    },
    [finishSet],
  );

  /** Curl sets end in their own Set Results screen, so saving goes straight back to the plan. */
  const handleCurlSave = (result: SquatWorkoutResult) => {
    const saved = finishSet(result);
    setStarted(false);
    selectTab('plan');
    showToast(
      saved.pointsEarned > 0
        ? `Saved · +${saved.pointsEarned} pts · next curl weight ${saved.nextWeight} kg`
        : `Saved · ${saved.status} · curl weight ${saved.nextWeight} kg`,
    );
  };

  const openSos = () => {
    setStarted(false);
    setDrawerOpen(false);
    setSosOpen(true);
  };

  return (
    <>
      <div className="min-h-screen pb-28">
        <AppHeader
          points={data.profile.fitPoints}
          hydrated={hydrated}
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenSos={openSos}
        />

        <main className="mx-auto max-w-3xl px-4 py-5">
          <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'home' && (
              <HomeDashboard
                data={data}
                hydrated={hydrated}
                todayIndex={todayIndex}
                onStartExercise={(exercise) => startTracker(exercise.id)}
                onStartFreeSet={() => startTracker(null)}
                onOpenSurvey={() => setSurveyOpen(true)}
                onOpenSos={openSos}
                onViewLeaderboard={() => selectTab('leaderboard')}
              />
            )}

            {tab === 'plan' &&
              (started ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setStarted(false)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-soft hover:bg-surface hover:text-ink"
                    >
                      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t('studio.back')}
                    </button>
                    {cameraLive ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-cyber-emerald/60 px-3 py-1 font-mono text-[11px] font-bold tracking-[0.15em] text-accent-emerald">
                        <span className="h-2 w-2 animate-pulse-slow rounded-full bg-cyber-emerald shadow-glow-emerald" aria-hidden />
                        {t('studio.live')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-[11px] font-bold tracking-[0.15em] text-muted">
                        <span className="h-2 w-2 rounded-full bg-zinc-500" aria-hidden />
                        {t('studio.cameraOff')}
                      </span>
                    )}
                  </div>
                  {config.exercise === 'curl' ? (
                    <>
                      <h1 className="text-2xl font-bold text-ink">{t('studio.curlTitle')}</h1>
                      <p className="text-xs font-medium text-muted">
                        {t('studio.curlTip')}
                      </p>
                      <BicepTracker
                        key={trackerRun}
                        config={config}
                        preview={(result) => applyWorkoutResult(data, result).summary}
                        onSave={handleCurlSave}
                        onRetry={() => setTrackerRun((n) => n + 1)}
                        onLiveChange={setCurlCameraLive}
                      />
                    </>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-ink">{t('studio.title')}</h1>
                      <p className="text-xs font-medium text-muted">
                        {t('studio.squatTip')}
                      </p>
                      <SquatTracker key={trackerRun} config={config} onFinish={handleFinish} />
                    </>
                  )}
                </div>
              ) : (
                <WorkoutPlanTab
                  plan={data.plan}
                  survey={data.survey}
                  profile={data.profile}
                  curlWeight={data.curlWeight}
                  lastSession={data.lastSession}
                  hydrated={hydrated}
                  todayIndex={todayIndex}
                  onOpenSurvey={() => setSurveyOpen(true)}
                  onSelectExercise={(exercise) => startTracker(exercise.id)}
                />
              ))}

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

        <BottomNav active={tab} onSelect={selectTab} />

        <SideDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeTab={tab}
          points={data.profile.fitPoints}
          experience={data.profile.experience}
          hydrated={hydrated}
          onNavigate={selectTab}
          onOpenSurvey={() => setSurveyOpen(true)}
          onOpenSos={openSos}
        />

        <WorkoutSurveyModal
          open={surveyOpen}
          onClose={() => setSurveyOpen(false)}
          initial={data.survey}
          onPlanGenerated={(plan, survey) => {
            savePlan(survey, plan);
            setSelectedExerciseId(null);
            writeSession(EXERCISE_STORAGE_KEY, null);
            selectTab('plan');
          }}
        />
        <PostWorkoutModal
          summary={summary}
          onClose={() => setSummary(null)}
          onViewLeaderboard={() => {
            setSummary(null);
            selectTab('leaderboard');
          }}
        />
        <EmergencyModal
          open={sosOpen}
          onClose={() => setSosOpen(false)}
          contact={data.emergencyContact}
          onSaveContact={saveEmergencyContact}
        />
      </div>
    </>
  );
}
