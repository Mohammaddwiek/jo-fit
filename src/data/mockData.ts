export interface LeaderboardEntry {
  rank: number;
  name: string;
  /** Working weight in kg. */
  weight: number;
  /** Form accuracy as a percentage (0–100). */
  formAccuracy: number;
  totalPoints: number;
}

export interface Leaderboard {
  hub: string;
  entries: LeaderboardEntry[];
}

export interface PartnerVoucher {
  id: string;
  title: string;
  sponsor: string;
  costPoints: number;
}

export const ammanCentralLeaderboard: Leaderboard = {
  hub: 'Amman Central Hub',
  entries: [
    { rank: 1, name: 'Omar Haddad', weight: 120, formAccuracy: 96, totalPoints: 4850 },
    { rank: 2, name: 'Lina Khoury', weight: 85, formAccuracy: 98, totalPoints: 4320 },
    { rank: 3, name: 'Yazan Al-Masri', weight: 110, formAccuracy: 91, totalPoints: 3970 },
    { rank: 4, name: 'Rania Saleh', weight: 70, formAccuracy: 94, totalPoints: 3410 },
    { rank: 5, name: 'Faris Nasser', weight: 95, formAccuracy: 88, totalPoints: 2980 },
  ],
};

export const arabBankVouchers: PartnerVoucher[] = [
  {
    id: 'heroes-gym-1-month',
    title: '1-Month Gym Pass (Heroes Gym)',
    sponsor: 'Arab Bank',
    costPoints: 2500,
  },
  {
    id: 'primal-amman-meal-25',
    title: '25% Off Meal Plan (Primal Amman)',
    sponsor: 'Arab Bank',
    costPoints: 1200,
  },
  {
    id: 'jordan-nutrition-lab',
    title: 'Jordan Nutrition Lab Voucher',
    sponsor: 'Arab Bank',
    costPoints: 3000,
  },
];
