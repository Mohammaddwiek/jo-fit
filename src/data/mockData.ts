import type { UserProfile } from '../lib/progressiveOverload';

export interface LeaderboardAthlete {
  name: string;
  /** Working squat weight in kg. */
  weight: number;
  /** Form accuracy as a percentage (0–100). */
  formAccuracy: number;
  /** Points earned this month. */
  points: number;
}

export interface Leaderboard {
  hub: string;
  period: 'This Month';
  athletes: LeaderboardAthlete[];
}

export interface PartnerVoucher {
  id: string;
  title: string;
  partner: string;
  sponsor: string;
  costPoints: number;
}

export interface UserSeed {
  profile: UserProfile;
  /** Starting bicep curl working weight (kg). */
  curlWeight: number;
  arabiRewardPoints: number;
  /** This month's points, used for the leaderboard. */
  monthlyPoints: number;
  lastFormAccuracy: number;
}

export const heroesGymLeaderboard: Leaderboard = {
  hub: 'Heroes Gym Hub',
  period: 'This Month',
  athletes: [
    { name: 'Omar Haddad', weight: 120, formAccuracy: 96, points: 3450 },
    { name: 'Yazan Al-Masri', weight: 110, formAccuracy: 92, points: 3120 },
    { name: 'Lina Khoury', weight: 105, formAccuracy: 90, points: 2890 },
    { name: 'Rania Saleh', weight: 95, formAccuracy: 94, points: 2410 },
    { name: 'Faris Nasser', weight: 100, formAccuracy: 88, points: 2150 },
    { name: 'Dana Qasem', weight: 80, formAccuracy: 95, points: 1980 },
  ],
};

export const arabBankVouchers: PartnerVoucher[] = [
  {
    id: 'heroes-gym-1-month',
    title: '1-Month Gym Pass (Heroes Gym)',
    partner: 'Heroes Gym',
    sponsor: 'Arab Bank',
    costPoints: 2500,
  },
  {
    id: 'primal-amman-meal-25',
    title: '25% Off Meal Plan (Primal Amman)',
    partner: 'Primal Amman',
    sponsor: 'Arab Bank',
    costPoints: 1200,
  },
  {
    id: 'jordan-nutrition-lab',
    title: 'Jordan Nutrition Lab Voucher',
    partner: 'Jordan Nutrition Lab',
    sponsor: 'Arab Bank',
    costPoints: 3000,
  },
];

export const FIT_TO_ARABI_RATE = { fit: 1000, arabi: 100 } as const;

export const userSeed: UserSeed = {
  profile: {
    name: 'You',
    age: 25,
    experience: 'Intermediate',
    currentWeight: 85,
    targetReps: 10,
    fitPoints: 4850,
  },
  curlWeight: 10,
  arabiRewardPoints: 0,
  monthlyPoints: 1760,
  lastFormAccuracy: 91,
};
