/**
 * Offline answers for the Health Coach when Gemini is unavailable (no key, no network,
 * timeout). Numbers come from the app's own rule constants so they never drift.
 */
import { FIT_TO_ARABI_RATE } from '../data/mockData';
import {
  DELOAD_FACTOR,
  FORM_SCORE_THRESHOLD,
  POINTS_PER_VALID_REP,
  WEIGHT_INCREMENT_KG,
} from './progressiveOverload';
import { DEPTH_ANGLE, KNEE_SAFE_TOO_DEEP_ANGLE, KNEE_SAFE_VALID_ANGLE } from './squatThresholds';

const DELOAD_PERCENT = Math.round((1 - DELOAD_FACTOR) * 100);

interface Topic {
  keywords: string[];
  answer: string;
}

const TOPICS: Topic[] = [
  {
    keywords: ['depth', 'deep', 'parallel', 'angle', '90', 'how low', 'squat'],
    answer: [
      `**Squat depth — the ${DEPTH_ANGLE}° rule**`,
      `- Aim for thighs **parallel** to the floor (≈${DEPTH_ANGLE}° at the knee). Jo-Fit counts a rep at ≤ ${DEPTH_ANGLE}°.`,
      '- Going deeper is fine if it is pain-free and your back stays neutral.',
      `- Knee-safe mode counts reps from ~${KNEE_SAFE_VALID_ANGLE}° (box depth) and warns below ${KNEE_SAFE_TOO_DEEP_ANGLE}°.`,
      '- Patellofemoral (kneecap) load rises with depth — control the descent instead of dropping.',
    ].join('\n'),
  },
  {
    keywords: ['knee', 'valgus', 'cave', 'patella', 'kneecap', 'pain', 'hurt', 'injur'],
    answer: [
      '**Knee safety**',
      '- Keep knees tracking **over your toes** — actively push them out, don\'t let them cave in (valgus).',
      '- Descend under control (~2–3 s), weight balanced over mid-foot.',
      '- Brace your core so your spine stays neutral.',
      '- Sharp or lasting pain? **Stop** and see a physiotherapist. Not medical advice.',
    ].join('\n'),
  },
  {
    keywords: ['overload', 'progress', 'increase', 'heavier', 'weight', 'deload', 'plateau', 'next session'],
    answer: [
      '**How progressive overload works in Jo-Fit**',
      `- Hit your target reps on every set with form ≥ ${FORM_SCORE_THRESHOLD}% → **+${WEIGHT_INCREMENT_KG} kg** next session (+1 rep for bodyweight).`,
      `- Reps done but form < ${FORM_SCORE_THRESHOLD}% → **form gate**: same weight until form improves.`,
      `- Target missed → **−${DELOAD_PERCENT}% deload** to recover.`,
      '- Sets with too few reps are discarded, so an aborted set never lowers your progress.',
    ].join('\n'),
  },
  {
    keywords: ['point', 'arabi', 'reward', 'voucher', 'redeem', 'bank', 'wallet', 'convert'],
    answer: [
      '**Arabi Fit Points**',
      `- Earn **${POINTS_PER_VALID_REP} pts per valid rep** on sessions where you achieve overload.`,
      `- Convert ${FIT_TO_ARABI_RATE.fit.toLocaleString('en-US')} Fit Pts → ${FIT_TO_ARABI_RATE.arabi} Arab Bank Reward Points.`,
      '- Redeem for **gym passes** and **healthy meal-plan** discounts in the Arabi Wallet.',
    ].join('\n'),
  },
  {
    keywords: ['recover', 'rest', 'sleep', 'sore', 'doms', 'hydrat', 'water', 'tired', 'fatigue'],
    answer: [
      '**Recovery & hydration**',
      '- Take at least 1–2 rest days per week; muscles adapt while you recover.',
      '- Sleep **7–9 hours** and drink ~2.5 L of water a day (more in the Amman heat).',
      '- On rest days: a 20-min light walk plus hip and hamstring mobility.',
    ].join('\n'),
  },
];

const DEFAULT_ANSWER = [
  "I'm the **Jo-Fit Health Coach** (offline mode). Ask me about:",
  `- **Squat depth** and the ${DEPTH_ANGLE}° rule`,
  '- **Knee safety** and valgus prevention',
  '- **Progressive overload** and deloads',
  '- **Arabi Fit Points** and rewards',
  '- **Recovery** and hydration',
].join('\n');

/** Picks the topic with the most keyword hits; ties go to the earlier (more specific) topic. */
export function getOfflineHealthResponse(query: string): string {
  const text = query.toLowerCase();
  let best: Topic | null = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    const score = topic.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best ? best.answer : DEFAULT_ANSWER;
}
