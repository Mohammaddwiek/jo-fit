import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** The shared card used across every screen: white with a soft shadow in light mode, charcoal in dark. */
export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Theme tokens (not dark: pairs) so a caller's custom border/background still overrides cleanly.
      className={cn('rounded-2xl border border-line bg-surface p-4 shadow-md dark:shadow-sm', className)}
      {...props}
    />
  );
}
