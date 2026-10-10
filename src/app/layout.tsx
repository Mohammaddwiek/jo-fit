import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import HealthChatbot from '../components/HealthChatbot';
import Providers from '../components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic', display: 'swap' });

export const metadata: Metadata = {
  title: 'Jo-Fit',
  description: 'AI-verified squat tracking, progressive overload plans and Arab Bank wellness rewards.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0E' },
  ],
};

/** Applies the saved language direction before first paint so Arabic doesn't flash left-to-right. */
const languageScript = `try{var l=localStorage.getItem('jofit:lang');if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration, hence suppressHydrationWarning.
    <html lang="en" dir="ltr" className={`${inter.variable} ${notoArabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: languageScript }} />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-[#0B0B0E] dark:text-zinc-100">
        <Providers>
          {children}
          <HealthChatbot />
        </Providers>
      </body>
    </html>
  );
}
