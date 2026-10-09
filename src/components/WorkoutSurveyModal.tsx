'use client';

import { useEffect, useId, useState } from 'react';
import Modal from './Modal';
import {
  EXPERIENCE_OPTIONS,
  generatePlan,
  GOAL_OPTIONS,
  INJURY_OPTIONS,
  MAX_DAYS,
  MIN_DAYS,
  type ExperienceLevel,
  type Goal,
  type Injury,
  type SurveyInput,
  type WorkoutPlan,
} from '../lib/planGenerator';

interface WorkoutSurveyModalProps {
  open: boolean;
  onClose: () => void;
  initial: SurveyInput | null;
  onPlanGenerated: (plan: WorkoutPlan, survey: SurveyInput) => void;
}

interface FormState {
  age: string;
  height: string;
  weight: string;
  experience: ExperienceLevel | null;
  daysAvailable: number | null;
  injuries: Injury[];
  goal: Goal | null;
}

type Errors = Partial<Record<keyof FormState, string>>;

const NUMBER_FIELDS = [
  { key: 'age', label: 'Age', unit: 'years', min: 13, max: 90 },
  { key: 'height', label: 'Height', unit: 'cm', min: 120, max: 230 },
  { key: 'weight', label: 'Weight', unit: 'kg', min: 30, max: 250 },
] as const;

const STEP_TITLES = ['Physical stats', 'Experience & schedule', 'Injuries & goal'];

const EXPERIENCE_HINTS: Record<ExperienceLevel, string> = {
  Beginner: 'Under 6 months of regular lifting',
  Intermediate: '6 months – 3 years',
  Advanced: '3+ years, comfortable near max effort',
};

const toForm = (survey: SurveyInput | null): FormState => ({
  age: survey ? String(survey.age) : '',
  height: survey ? String(survey.height) : '',
  weight: survey ? String(survey.weight) : '',
  experience: survey?.experience ?? null,
  daysAvailable: survey?.daysAvailable ?? null,
  injuries: survey?.injuries ?? [],
  goal: survey?.goal ?? null,
});

function validateStep(step: number, form: FormState): Errors {
  const errors: Errors = {};
  if (step === 0) {
    for (const field of NUMBER_FIELDS) {
      const value = Number(form[field.key]);
      if (form[field.key].trim() === '' || !Number.isFinite(value)) {
        errors[field.key] = `Enter your ${field.label.toLowerCase()}.`;
      } else if (value < field.min || value > field.max) {
        errors[field.key] = `${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`;
      }
    }
  } else if (step === 1) {
    if (!form.experience) errors.experience = 'Choose your experience level.';
    if (form.daysAvailable === null) errors.daysAvailable = 'Choose how many days you can train.';
  } else {
    if (form.injuries.length === 0) errors.injuries = 'Select at least one option (choose "None" if no injuries).';
    if (!form.goal) errors.goal = 'Choose your primary goal.';
  }
  return errors;
}

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900';

export default function WorkoutSurveyModal({ open, onClose, initial, onPlanGenerated }: WorkoutSurveyModalProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [errors, setErrors] = useState<Errors>({});
  const baseId = useId();

  // Each time the survey opens, start at step 1 prefilled with the previous answers.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(toForm(initial));
    setErrors({});
  }, [open, initial]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleInjury = (injury: Injury) => {
    const has = form.injuries.includes(injury);
    let next: Injury[];
    if (injury === 'None') next = has ? [] : ['None'];
    else next = has ? form.injuries.filter((i) => i !== injury) : [...form.injuries.filter((i) => i !== 'None'), injury];
    update('injuries', next);
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (step < STEP_TITLES.length - 1) {
      setStep(step + 1);
      return;
    }
    const survey: SurveyInput = {
      age: Number(form.age),
      height: Number(form.height),
      weight: Number(form.weight),
      experience: form.experience!,
      daysAvailable: form.daysAvailable!,
      injuries: form.injuries,
      goal: form.goal!,
    };
    onPlanGenerated(generatePlan(survey), survey);
    onClose();
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title="Build Your Training Plan" size="max-w-xl">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleNext();
        }}
        className="flex flex-col gap-5"
      >
        <ol className="flex gap-2" aria-label="Survey progress">
          {STEP_TITLES.map((title, index) => (
            <li key={title} className="flex-1" aria-current={index === step ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${index <= step ? 'bg-cyber-cyan shadow-glow-cyan' : 'bg-zinc-800'}`} />
              <span className={`mt-1.5 block text-[11px] ${index === step ? 'text-cyber-cyan' : 'text-zinc-500'}`}>
                {index + 1}. {title}
              </span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {NUMBER_FIELDS.map((field) => {
              const errorId = `${baseId}-${field.key}-error`;
              return (
                <label key={field.key} className="flex flex-col gap-1.5 text-sm text-zinc-300">
                  {field.label} <span className="sr-only">in {field.unit}</span>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={field.min}
                      max={field.max}
                      value={form[field.key]}
                      onChange={(e) => update(field.key, e.target.value)}
                      aria-invalid={errors[field.key] ? true : undefined}
                      aria-describedby={errors[field.key] ? errorId : undefined}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2.5 pr-14 font-mono text-zinc-100 ${focusRing} ${
                        errors[field.key] ? 'border-rose-500' : 'border-zinc-700'
                      }`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                      {field.unit}
                    </span>
                  </div>
                  {errors[field.key] && (
                    <span id={errorId} className="text-xs text-rose-400">
                      {errors[field.key]}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-sm text-zinc-300">Training experience</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {EXPERIENCE_OPTIONS.map((level) => (
                  <ChoiceCard
                    key={level}
                    name="experience"
                    checked={form.experience === level}
                    onChange={() => update('experience', level)}
                    title={level}
                    hint={EXPERIENCE_HINTS[level]}
                  />
                ))}
              </div>
              {errors.experience && <p className="mt-1.5 text-xs text-rose-400">{errors.experience}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm text-zinc-300">Days available per week</legend>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, i) => MIN_DAYS + i).map((days) => (
                  <ChoiceCard
                    key={days}
                    name="days"
                    checked={form.daysAvailable === days}
                    onChange={() => update('daysAvailable', days)}
                    title={String(days)}
                    centered
                  />
                ))}
              </div>
              {errors.daysAvailable && <p className="mt-1.5 text-xs text-rose-400">{errors.daysAvailable}</p>}
            </fieldset>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-sm text-zinc-300">Any current injuries?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {INJURY_OPTIONS.map((injury) => (
                  <ChoiceCard
                    key={injury}
                    type="checkbox"
                    name="injuries"
                    checked={form.injuries.includes(injury)}
                    onChange={() => toggleInjury(injury)}
                    title={injury}
                    centered
                  />
                ))}
              </div>
              {errors.injuries && <p className="mt-1.5 text-xs text-rose-400">{errors.injuries}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm text-zinc-300">Primary goal</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {GOAL_OPTIONS.map((goal) => (
                  <ChoiceCard key={goal} name="goal" checked={form.goal === goal} onChange={() => update('goal', goal)} title={goal} />
                ))}
              </div>
              {errors.goal && <p className="mt-1.5 text-xs text-rose-400">{errors.goal}</p>}
            </fieldset>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {errorList.length > 0 ? `${errorList.length} error${errorList.length === 1 ? '' : 's'}: ${errorList.join(' ')}` : ''}
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className={`rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-500 ${focusRing}`}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="submit"
            className={`rounded-xl bg-cyber-cyan px-5 py-2.5 text-sm font-extrabold text-zinc-950 shadow-glow-cyan hover:brightness-110 ${focusRing}`}
          >
            {step === STEP_TITLES.length - 1 ? 'Generate Plan' : 'Next'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ChoiceCardProps {
  name: string;
  type?: 'radio' | 'checkbox';
  checked: boolean;
  onChange: () => void;
  title: string;
  hint?: string;
  centered?: boolean;
}

function ChoiceCard({ name, type = 'radio', checked, onChange, title, hint, centered }: ChoiceCardProps) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyber-cyan ${
        centered ? 'items-center text-center' : ''
      } ${checked ? 'border-cyber-cyan bg-cyber-cyan/10 text-cyber-cyan' : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500'}`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-sm font-semibold">{title}</span>
      {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}
