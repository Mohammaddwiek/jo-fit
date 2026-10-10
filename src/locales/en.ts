/** English strings. Keys are the source of truth: ar.ts must provide every one. */
export const en = {
  // Navigation
  'nav.sections': 'Jo-Fit sections',
  'nav.home': 'Home',
  'nav.plan': 'Plan & AI Studio',
  'nav.leaderboard': 'Leaderboard',
  'nav.rewards': 'Rewards',
  'nav.sos': 'SOS',

  // Header
  'header.openMenu': 'Open menu',
  'header.points': 'Pts',
  'header.pointsAria': '{points} Arabi Fit Points',
  'header.loadingPoints': 'Loading points',
  'header.sos': 'Emergency SOS',
  'header.toLight': 'Switch to light mode',
  'header.toDark': 'Switch to dark mode',
  'header.switchLanguage': 'Switch to Arabic',
  'header.languageButton': 'AR',

  // Drawer
  'drawer.menu': 'Menu',
  'drawer.close': 'Close menu',
  'drawer.athlete': 'Jo-Fit Athlete',
  'drawer.member': '{level} member',
  'drawer.fitPts': 'Fit Pts',
  'drawer.home': 'Home',
  'drawer.plan': 'Workout Plan & AI Studio',
  'drawer.leaderboard': 'Gym Leaderboard',
  'drawer.rewards': 'Rewards & Redemptions',
  'drawer.survey': 'Retake Plan Survey',
  'drawer.sos': 'Emergency Assist (SOS)',
  'drawer.partner': 'Official Health Partner',
  'drawer.bank': 'Arab Bank',
  'drawer.settings': 'Settings',
  'drawer.theme': 'Theme',
  'drawer.language': 'Language',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'language.en': 'English',
  'language.ar': 'العربية',

  // Experience levels
  'level.Beginner': 'Beginner',
  'level.Intermediate': 'Intermediate',
  'level.Advanced': 'Advanced',

  // Home dashboard
  'home.greeting': 'Welcome back! 👋',
  'home.tagline': 'Verified movement. Real rewards.',
  'home.sponsor': 'Official Health Sponsor',
  'home.fitPoints': 'Fit Points',
  'home.gymRank': 'Gym Rank',
  'home.lastForm': 'Last Form',
  'home.getPlan': 'Get your AI training plan',
  'home.getPlanBody': '3 quick questions → a safe 7-day plan with AI-tracked squats and curls.',
  'home.takeSurvey': 'Take the Survey',
  'home.quickFreeSet': 'Quick free squat set',
  'home.recoveryDay': 'Recovery Day',
  'home.optionalFreeSet': 'Optional free squat set',
  'home.startWorkout': 'Start AI Workout',
  'home.todayRoutine': "Today's routine:",
  'home.startFreeSet': 'Start free squat set',
  'home.emergency': 'Emergency Assist',
  'home.emergencyBody': 'Call 911 and your saved emergency contact',
  'home.leaderboardPreview': 'Leaderboard Preview',
  'home.you': 'You',

  // Generic buttons
  'button.start': 'Start',
  'button.startNow': 'Start Now',
  'button.viewAll': 'View all',
  'button.saveContinue': 'Save & Continue',
  'button.retrySet': 'Retry Set',

  // AI studio header
  'studio.back': 'Back to plan',
  'studio.live': 'LIVE · AI TRACKING',
  'studio.cameraOff': 'CAMERA OFF',
  'studio.title': 'AI Skeleton Tracking',
  'studio.curlTitle': 'AI Skeleton Tracking · Bicep Curls',
  'studio.squatTip': 'Stand 2–3 m back with your full body visible. Side-on is most accurate; facing the camera also works.',
  'studio.curlTip': 'Face the camera with your head and torso in frame. Keep elbows pinned and use the full range.',
} as const;

export type TranslationKey = keyof typeof en;
