import type { LeaderboardAthlete } from '../data/mockData';

export interface RankedEntry extends LeaderboardAthlete {
  rank: number;
  isCurrentUser: boolean;
}

/** Merges the current user into the athletes and ranks by points (ties go to the athlete). */
export function rankLeaderboard(athletes: LeaderboardAthlete[], currentUser: LeaderboardAthlete): RankedEntry[] {
  const entries = [
    ...athletes.map((athlete) => ({ ...athlete, isCurrentUser: false })),
    { ...currentUser, isCurrentUser: true },
  ];
  entries.sort((a, b) => b.points - a.points || Number(a.isCurrentUser) - Number(b.isCurrentUser));
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function currentUserRank(athletes: LeaderboardAthlete[], currentUser: LeaderboardAthlete): number {
  return rankLeaderboard(athletes, currentUser).find((entry) => entry.isCurrentUser)?.rank ?? athletes.length + 1;
}
