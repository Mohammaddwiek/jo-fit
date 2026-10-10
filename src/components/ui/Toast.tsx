'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';

const TOAST_MS = 3000;

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** One toast at a time, shown above the bottom nav. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    if (timeout.current) clearTimeout(timeout.current);
    setToast({ id: Date.now(), message });
    timeout.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center pe-20 ps-4 sm:px-20">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="flex max-w-md items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-2xl"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" aria-hidden />
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
