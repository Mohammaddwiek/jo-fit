'use client';

import { useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Gem, Ticket } from 'lucide-react';
import ArabBankLogo from './ArabBankLogo';
import Modal from './Modal';
import { arabBankVouchers, FIT_TO_ARABI_RATE, type PartnerVoucher } from '../data/mockData';

interface ArabiWalletProps {
  fitPoints: number;
  arabiRewardPoints: number;
  hydrated: boolean;
  /** Returns the Arabi points credited (0 if nothing was converted). */
  onConvert: (fitAmount: number) => number;
  /** Returns a voucher reference code, or null if the balance is too low. */
  onRedeem: (voucher: PartnerVoucher) => string | null;
}

const fmt = (n: number) => n.toLocaleString('en-US');

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

export default function ArabiWallet({ fitPoints, arabiRewardPoints, hydrated, onConvert, onRedeem }: ArabiWalletProps) {
  const [convertAmount, setConvertAmount] = useState(0);
  const [convertMessage, setConvertMessage] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<{ voucher: PartnerVoucher; code: string } | null>(null);

  const maxConvertible = Math.floor(fitPoints / FIT_TO_ARABI_RATE.fit) * FIT_TO_ARABI_RATE.fit;
  const amount = Math.min(convertAmount, maxConvertible);
  const preview = (amount / FIT_TO_ARABI_RATE.fit) * FIT_TO_ARABI_RATE.arabi;

  const handleConvert = () => {
    const credited = onConvert(amount);
    if (credited > 0) {
      setConvertMessage(`Converted ${fmt(amount)} Fit Pts → ${fmt(credited)} Arabi Points`);
      setConvertAmount(0);
    }
  };

  const handleRedeem = (voucher: PartnerVoucher) => {
    const code = onRedeem(voucher);
    if (code) setRedeemed({ voucher, code });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-zinc-100">Rewards &amp; Redemptions</h1>

      <section className="rounded-2xl border border-cyber-gold/30 bg-gradient-to-br from-bank-navy to-surface p-5 shadow-glow-gold">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyber-gold/50 bg-cyber-gold/10">
              <Gem className="h-5 w-5 text-cyber-gold" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-medium text-sky-100/70">Arab Bank</p>
              <h2 className="text-lg font-bold text-white">Arabi Wellness Wallet</h2>
            </div>
          </div>
          <ArabBankLogo size="lg" />
        </div>

        <div className="mt-5">
          {hydrated ? (
            <p className="font-mono text-4xl font-black tabular-nums text-cyber-gold sm:text-5xl">
              {fmt(fitPoints)} <span className="text-base font-bold text-white sm:text-lg">Arabi Fit Points</span>
            </p>
          ) : (
            <span className="block h-12 w-64 max-w-full animate-pulse rounded bg-white/10" aria-hidden />
          )}
          <p className="mt-1 text-xs font-medium text-sky-100/70">Earned via verified biomechanics</p>
        </div>
      </section>

      <section aria-labelledby="convert-heading" className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ArabBankLogo size="sm" className="mt-0.5" />
            <div>
              <h3 id="convert-heading" className="flex items-center gap-2 font-bold text-zinc-100">
                <ArrowRightLeft className="h-4 w-4 text-cyber-emerald" aria-hidden /> Convert to Arab Bank Points
              </h3>
              <p className="mt-0.5 text-xs font-medium text-zinc-400">
                {fmt(FIT_TO_ARABI_RATE.fit)} Fit Pts = {fmt(FIT_TO_ARABI_RATE.arabi)} Bank Pts
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">Bank balance</p>
            <p className="font-mono text-lg font-black tabular-nums text-cyber-gold">
              {hydrated ? fmt(arabiRewardPoints) : '—'} <span className="text-xs font-medium text-zinc-400">pts</span>
            </p>
          </div>
        </div>

        <label htmlFor="convert-slider" className="mt-4 block text-sm text-zinc-300">
          Amount to convert
        </label>
        <input
          id="convert-slider"
          type="range"
          min={0}
          max={Math.max(maxConvertible, FIT_TO_ARABI_RATE.fit)}
          step={FIT_TO_ARABI_RATE.fit}
          value={amount}
          disabled={maxConvertible === 0}
          onChange={(e) => {
            setConvertAmount(Number(e.target.value));
            setConvertMessage(null);
          }}
          aria-valuetext={`${fmt(amount)} Fit Points`}
          className="mt-2 w-full accent-cyber-emerald disabled:opacity-40"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm tabular-nums text-zinc-200">
            {fmt(amount)} Fit Pts → <span className="font-bold text-cyber-gold">{fmt(preview)} Arabi Points</span>
          </p>
          <button
            type="button"
            onClick={handleConvert}
            disabled={amount === 0}
            className="rounded-xl bg-cyber-emerald px-5 py-2.5 text-sm font-extrabold text-zinc-950 shadow-glow-emerald hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Convert Now
          </button>
        </div>
        <p role="status" className="mt-2 min-h-[1.25rem] text-sm text-cyber-emerald">
          {convertMessage && (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> {convertMessage}
            </span>
          )}
        </p>
      </section>

      <section aria-labelledby="vouchers-heading">
        <h3 id="vouchers-heading" className="mb-3 flex items-center gap-2 text-lg font-bold text-zinc-100">
          <Ticket className="h-5 w-5 text-cyber-gold" aria-hidden /> Local Deals
        </h3>
        <ul className="flex flex-col gap-2">
          {arabBankVouchers.map((voucher) => {
            const shortfall = voucher.costPoints - fitPoints;
            const affordable = hydrated && shortfall <= 0;
            return (
              <li key={voucher.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 font-black text-cyber-emerald"
                >
                  {initials(voucher.partner)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-100">{voucher.partner}</p>
                  <p className="truncate text-xs font-medium text-zinc-400">{voucher.title}</p>
                  <p className="font-mono text-sm font-black tabular-nums text-cyber-gold">{fmt(voucher.costPoints)} pts</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRedeem(voucher)}
                  disabled={!affordable}
                  className="shrink-0 rounded-xl border border-cyber-gold/60 px-3 py-2 text-xs font-bold text-cyber-gold hover:bg-cyber-gold/10 disabled:cursor-not-allowed disabled:border-line disabled:text-zinc-500 disabled:hover:bg-transparent"
                >
                  {!hydrated || affordable ? 'Redeem' : `Need ${fmt(shortfall)}`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Modal open={redeemed !== null} onClose={() => setRedeemed(null)} title="Voucher Redeemed" size="max-w-sm">
        {redeemed && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-zinc-300">{redeemed.voucher.title}</p>
            <div className="rounded-xl bg-white p-3">
              <MockQr value={redeemed.code} />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Demo QR · not scannable</p>
            <p className="font-mono text-2xl font-black tracking-wider text-cyber-emerald">{redeemed.code}</p>
            <p className="text-xs text-zinc-400">
              {fmt(redeemed.voucher.costPoints)} pts deducted · show this code at {redeemed.voucher.partner}
            </p>
            <button
              type="button"
              onClick={() => setRedeemed(null)}
              className="mt-1 w-full rounded-xl bg-cyber-emerald py-2.5 text-sm font-extrabold text-zinc-950 hover:brightness-110"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

const QR_SIZE = 25;

/** Deterministic QR-looking pattern (three finder squares + seeded noise). Decorative only. */
function MockQr({ value }: { value: string }) {
  const cells = useMemo(() => {
    let seed = 0;
    for (const char of value) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) | 0;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const finders = [
      [0, 0],
      [QR_SIZE - 7, 0],
      [0, QR_SIZE - 7],
    ];
    const inFinderZone = (x: number, y: number) =>
      finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
    const finderCell = (x: number, y: number) => {
      for (const [fx, fy] of finders) {
        const dx = x - fx;
        const dy = y - fy;
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) continue;
        const ring = Math.min(dx, dy, 6 - dx, 6 - dy);
        return ring !== 1;
      }
      return false;
    };

    const filled: Array<[number, number]> = [];
    for (let y = 0; y < QR_SIZE; y++) {
      for (let x = 0; x < QR_SIZE; x++) {
        const on = inFinderZone(x, y) ? finderCell(x, y) : random() < 0.5;
        if (on) filled.push([x, y]);
      }
    }
    return filled;
  }, [value]);

  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} className="h-44 w-44" role="img" aria-label={`Demo QR code for ${value}`} shapeRendering="crispEdges">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#09090b" />
      ))}
    </svg>
  );
}
