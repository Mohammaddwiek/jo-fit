'use client';

import { useState, type FormEvent } from 'react';
import { Phone, Siren, UserRound } from 'lucide-react';
import Modal from './Modal';
import type { EmergencyContact } from '../lib/useJoFitState';

interface EmergencyModalProps {
  open: boolean;
  onClose: () => void;
  contact: EmergencyContact | null;
  onSaveContact: (contact: EmergencyContact) => void;
}

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

function validate(name: string, phone: string): string | null {
  if (!name.trim()) return 'Enter a contact name.';
  if (name.trim().length > 60) return 'Name is too long.';
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s()-]+$/.test(phone.trim()) || digits.length < 7 || digits.length > 15) {
    return 'Enter a valid phone number (7–15 digits).';
  }
  return null;
}

export default function EmergencyModal({ open, onClose, contact, onSaveContact }: EmergencyModalProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showForm = !contact || editing;

  const startEditing = () => {
    setName(contact?.name ?? '');
    setPhone(contact?.phone ?? '');
    setError(null);
    setEditing(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate(name, phone);
    setError(problem);
    if (problem) return;
    onSaveContact({ name: name.trim(), phone: phone.trim() });
    setEditing(false);
  };

  const handleClose = () => {
    setEditing(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2 text-alert">
          <Siren className="h-5 w-5" aria-hidden /> Emergency SOS
        </span>
      }
      size="max-w-md"
      panelClassName="border-alert/70 shadow-[0_0_40px_rgba(239,68,68,0.35)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-2 pt-1 text-center">
          <span className="relative grid h-16 w-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-alert/30" aria-hidden />
            <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-alert bg-alert/15">
              <Siren className="h-7 w-7 text-alert" aria-hidden />
            </span>
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">Workout stopped · camera off</p>
        </div>
        <a
          href="tel:911"
          className="flex items-center justify-center gap-3 rounded-xl bg-alert py-4 text-xl font-extrabold text-white shadow-glow-red hover:brightness-110"
        >
          <Phone className="h-6 w-6" aria-hidden /> Call 911 Now
        </a>
        <p className="-mt-2 text-center text-xs text-zinc-400">
          911 is Jordan&apos;s unified emergency number (police, ambulance, civil defense).
        </p>

        <ol className="list-decimal space-y-1.5 rounded-xl border border-line bg-surface-2 py-3 pl-8 pr-4 text-sm text-zinc-200">
          <li>Stop exercising immediately.</li>
          <li>Sit or lie down somewhere safe and breathe slowly.</li>
          <li>Call for help if you have chest pain, dizziness, fainting, or an injury.</li>
        </ol>

        <section aria-labelledby="sos-contact-heading" className="rounded-xl border border-line bg-surface-2 p-4">
          <h3 id="sos-contact-heading" className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <UserRound className="h-4 w-4 text-cyber-emerald" aria-hidden /> Personal emergency contact
          </h3>

          {showForm ? (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-zinc-100 focus:border-cyber-emerald focus:outline-none focus:ring-2 focus:ring-cyber-emerald/40"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+962 7X XXX XXXX"
                  aria-invalid={error ? true : undefined}
                  className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-zinc-100 focus:border-cyber-emerald focus:outline-none focus:ring-2 focus:ring-cyber-emerald/40"
                />
              </label>
              <p role="alert" className="min-h-[1rem] text-xs text-rose-400">
                {error}
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-cyber-emerald py-2 text-sm font-bold text-zinc-950 hover:brightness-110"
                >
                  Save contact
                </button>
                {contact && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-line px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={telHref(contact.phone)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-500/60 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/10"
              >
                <Phone className="h-4 w-4" aria-hidden /> Call {contact.name}
              </a>
              <span className="font-mono text-xs text-zinc-400">{contact.phone}</span>
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-cyber-emerald hover:bg-cyber-emerald/10"
              >
                Edit
              </button>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
