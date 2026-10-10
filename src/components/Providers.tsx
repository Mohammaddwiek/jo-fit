'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '../context/LanguageContext';
import { ToastProvider } from './ui/Toast';

/** Client-side app providers: theme (class on <html>), language/RTL, and toasts. */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="jofit:theme">
      <LanguageProvider>
        <ToastProvider>{children}</ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
