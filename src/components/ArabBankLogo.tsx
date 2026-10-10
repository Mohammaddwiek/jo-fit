'use client';

import { useEffect, useRef, useState } from 'react';
import { Landmark } from 'lucide-react';
import { cn } from '../lib/cn';

const LOGO_SRC = '/images/arab-bank-logo.jpg';

const SIZES = {
  sm: { box: 'h-7', icon: 'h-3.5 w-3.5', text: 'text-[10px]' },
  md: { box: 'h-9', icon: 'h-4 w-4', text: 'text-xs' },
  lg: { box: 'h-12', icon: 'h-5 w-5', text: 'text-sm' },
} as const;

interface ArabBankLogoProps {
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * The official logo, unmodified, in a white chip so it stays legible on dark cards.
 * The source JPEG has wide white margins, so the chip crops only that blank clear space.
 * While loading, or if the file is missing, a generic badge is shown instead.
 */
export default function ArabBankLogo({ size = 'md', className }: ArabBankLogoProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);
  const s = SIZES[size];

  // The image can finish loading before hydration, which skips onLoad/onError.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) setStatus(img.naturalWidth > 0 ? 'loaded' : 'error');
  }, []);

  return (
    <span className={cn('relative inline-flex shrink-0 items-center', s.box, className)}>
      {status !== 'loaded' && (
        <span
          role="img"
          aria-label="Arab Bank"
          className={cn('inline-flex h-full items-center gap-1.5 rounded-lg border border-sky-800 bg-bank-navy px-2 font-semibold text-white', s.text)}
        >
          <Landmark className={cn(s.icon, 'text-cyber-gold')} aria-hidden />
          Arab Bank
        </span>
      )}
      {status !== 'error' && (
        <span
          className={cn(
            'inline-block aspect-[6/5] h-full overflow-hidden rounded-lg bg-white p-0.5 ring-1 ring-white/10',
            status === 'loading' && 'absolute inset-y-0 start-0 opacity-0',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={LOGO_SRC}
            alt="Arab Bank"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            className="h-full w-full object-cover object-[50%_42%] [transform:scale(1.4)]"
          />
        </span>
      )}
    </span>
  );
}
