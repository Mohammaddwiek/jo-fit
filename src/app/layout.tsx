import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import HealthChatbot from '../components/HealthChatbot';
import { ToastProvider } from '../components/ui/Toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Jo-Fit',
  description: 'AI-verified squat tracking, progressive overload plans and Arab Bank wellness rewards.',
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <ToastProvider>
          {children}
          <HealthChatbot />
        </ToastProvider>
      </body>
    </html>
  );
}
