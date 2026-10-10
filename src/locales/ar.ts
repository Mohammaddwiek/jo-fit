import type { TranslationKey } from './en';

/** Arabic strings. Typed against the English keys, so a missing translation fails the type-check. */
export const ar: Record<TranslationKey, string> = {
  // Navigation
  'nav.sections': 'أقسام جو-فت',
  'nav.home': 'الرئيسية',
  'nav.plan': 'الخطة والاستوديو',
  'nav.leaderboard': 'المتصدرون',
  'nav.rewards': 'المكافآت',
  'nav.sos': 'طوارئ',

  // Header
  'header.openMenu': 'فتح القائمة',
  'header.points': 'نقطة',
  'header.pointsAria': '{points} نقطة لياقة من العربي',
  'header.loadingPoints': 'جارٍ تحميل النقاط',
  'header.sos': 'طوارئ SOS',
  'header.toLight': 'التبديل إلى الوضع الفاتح',
  'header.toDark': 'التبديل إلى الوضع الداكن',
  'header.switchLanguage': 'التبديل إلى الإنجليزية',
  'header.languageButton': 'EN',

  // Drawer
  'drawer.menu': 'القائمة',
  'drawer.close': 'إغلاق القائمة',
  'drawer.athlete': 'رياضي جو-فت',
  'drawer.member': 'عضو {level}',
  'drawer.fitPts': 'نقطة لياقة',
  'drawer.home': 'الرئيسية',
  'drawer.plan': 'خطة التمرين واستوديو الذكاء الاصطناعي',
  'drawer.leaderboard': 'متصدرو النادي',
  'drawer.rewards': 'المكافآت والاستبدال',
  'drawer.survey': 'إعادة استبيان الخطة',
  'drawer.sos': 'مساعدة الطوارئ (SOS)',
  'drawer.partner': 'الشريك الصحي الرسمي',
  'drawer.bank': 'البنك العربي',
  'drawer.settings': 'الإعدادات',
  'drawer.theme': 'المظهر',
  'drawer.language': 'اللغة',
  'theme.light': 'فاتح',
  'theme.dark': 'داكن',
  'language.en': 'English',
  'language.ar': 'العربية',

  // Experience levels
  'level.Beginner': 'مبتدئ',
  'level.Intermediate': 'متوسط',
  'level.Advanced': 'متقدم',

  // Home dashboard
  'home.greeting': 'مرحباً بعودتك! 👋',
  'home.tagline': 'حركة موثّقة. مكافآت حقيقية.',
  'home.sponsor': 'الراعي الصحي الرسمي',
  'home.fitPoints': 'نقاط اللياقة',
  'home.gymRank': 'ترتيبك في النادي',
  'home.lastForm': 'آخر أداء',
  'home.getPlan': 'احصل على خطتك التدريبية الذكية',
  'home.getPlanBody': '٣ أسئلة سريعة ← خطة آمنة لمدة ٧ أيام مع تتبع السكوات والبايسبس بالذكاء الاصطناعي.',
  'home.takeSurvey': 'ابدأ الاستبيان',
  'home.quickFreeSet': 'مجموعة سكوات حرة سريعة',
  'home.recoveryDay': 'يوم الاستشفاء',
  'home.optionalFreeSet': 'مجموعة سكوات حرة اختيارية',
  'home.startWorkout': 'ابدأ تمرين الذكاء الاصطناعي',
  'home.todayRoutine': 'تمرين اليوم:',
  'home.startFreeSet': 'ابدأ مجموعة سكوات حرة',
  'home.emergency': 'مساعدة الطوارئ',
  'home.emergencyBody': 'اتصل بـ 911 وبجهة الاتصال المحفوظة للطوارئ',
  'home.leaderboardPreview': 'لمحة عن المتصدرين',
  'home.you': 'أنت',

  // Generic buttons
  'button.start': 'ابدأ',
  'button.startNow': 'ابدأ الآن',
  'button.viewAll': 'عرض الكل',
  'button.saveContinue': 'حفظ ومتابعة',
  'button.retrySet': 'إعادة المجموعة',

  // AI studio header
  'studio.back': 'العودة إلى الخطة',
  'studio.live': 'مباشر · تتبع بالذكاء الاصطناعي',
  'studio.cameraOff': 'الكاميرا متوقفة',
  'studio.title': 'تتبع الهيكل بالذكاء الاصطناعي',
  'studio.curlTitle': 'تتبع الهيكل بالذكاء الاصطناعي · تمرين البايسبس',
  'studio.squatTip': 'قف على بعد ٢–٣ م مع ظهور جسمك بالكامل. الوقوف جانبياً هو الأدق، ومواجهة الكاميرا تعمل أيضاً.',
  'studio.curlTip': 'واجه الكاميرا مع ظهور رأسك وجذعك. أبقِ المرفقين ملتصقين بجسمك واستخدم المدى الكامل.',
};
