'use client';

import { Fragment, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Minus, SendHorizontal } from 'lucide-react';
import { getOfflineHealthResponse } from '../lib/healthKnowledge';

type Role = 'user' | 'assistant';
type Source = 'gemini' | 'offline-fallback';

interface ChatMessage {
  id: number;
  role: Role;
  content: string;
}

const QUICK_ACTIONS = ['Squat Depth 90°', 'Knee Safety', 'How Overload Works', 'Arabi Rewards'];
const HISTORY_TURNS = 10;

const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  content:
    "Hi! I'm your **Jo-Fit Health Coach**.\n- Ask about squat depth, knee safety, overload or Arabi Fit Points\n- Or tap a quick question below",
};

/** Renders `**bold**`, `*italic*` and `- ` / `* ` bullet lines as React elements (no raw HTML). */
function renderRich(text: string): ReactNode {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={i} className="text-zinc-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return <Fragment key={i}>{part}</Fragment>;
    });

  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-4 list-disc space-y-0.5 marker:text-cyber-emerald">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

export default function HealthChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [source, setSource] = useState<Source>('gemini');
  const nextId = useRef(1);
  const streamRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    const userMessage: ChatMessage = { id: nextId.current++, role: 'user', content: message };
    const history = messages
      .filter((m) => m.id !== WELCOME.id)
      .slice(-HISTORY_TURNS)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    let reply: string;
    let replySource: Source;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as { reply?: string; source?: Source };
      if (!data.reply) throw new Error('Empty reply');
      reply = data.reply;
      replySource = data.source === 'gemini' ? 'gemini' : 'offline-fallback';
    } catch {
      // The API route itself is unreachable: answer locally so the coach never goes silent.
      reply = getOfflineHealthResponse(message);
      replySource = 'offline-fallback';
    }

    setSource(replySource);
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'assistant', content: reply }]);
    setSending(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const close = () => {
    setOpen(false);
    fabRef.current?.focus();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-44 right-4 z-50 flex h-[520px] max-h-[calc(100dvh-13rem)] w-96 max-w-[92vw] flex-col overflow-hidden rounded-3xl border border-[#262630] bg-[#111116] text-zinc-100 shadow-2xl sm:right-6"
          >
            <header className="flex items-center justify-between gap-3 border-b border-[#262630] px-4 py-3">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-sm font-bold">
                  Jo-Fit Health Coach
                </h2>
                <p className="text-[11px] font-medium text-zinc-400">Sponsored by Arab Bank</p>
              </div>
              <div className="flex items-center gap-2">
                {source === 'gemini' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyber-emerald/50 bg-cyber-emerald/10 px-2.5 py-1 text-[11px] font-bold text-cyber-emerald">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-emerald shadow-glow-emerald" aria-hidden />
                    AI Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyber-gold/50 bg-cyber-gold/10 px-2.5 py-1 text-[11px] font-bold text-cyber-gold">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyber-gold" aria-hidden />
                    Offline Coach
                  </span>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Minimize Health Coach"
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#16161C] hover:text-zinc-100"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            <div className="flex gap-2 overflow-x-auto border-b border-[#262630] px-4 py-2.5 [scrollbar-width:none]">
              {QUICK_ACTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void send(label)}
                  disabled={sending}
                  className="shrink-0 whitespace-nowrap rounded-full border border-cyber-cyan/40 bg-cyber-cyan/5 px-3 py-1.5 text-xs font-semibold text-cyber-cyan transition hover:bg-cyber-cyan/15 disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>

            <div ref={streamRef} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md border border-cyber-cyan/30 bg-cyber-cyan/15 px-3.5 py-2.5 text-cyan-50'
                      : 'max-w-[90%] self-start rounded-2xl rounded-bl-md border border-[#262630] bg-[#16161C] px-3.5 py-2.5 text-zinc-100'
                  }
                >
                  {m.role === 'assistant' ? renderRich(m.content) : m.content}
                </div>
              ))}
              {sending && (
                <div
                  className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md border border-[#262630] bg-[#16161C] px-4 py-3"
                  aria-label="Coach is typing"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-cyber-emerald"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#262630] p-3">
              <label htmlFor={`${titleId}-input`} className="sr-only">
                Ask the Health Coach
              </label>
              <input
                id={`${titleId}-input`}
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="Ask about form, overload, points…"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-[#262630] bg-[#16161C] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyber-emerald focus:outline-none focus:ring-2 focus:ring-cyber-emerald/30"
              />
              <button
                type="submit"
                disabled={sending || input.trim() === ''}
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyber-emerald text-zinc-950 shadow-glow-emerald transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Jo-Fit Health Coach' : 'Open Jo-Fit Health Coach'}
        aria-expanded={open}
        // Sits above the bottom navigation bar.
        className="fixed bottom-24 right-4 z-50 grid h-14 w-14 sm:right-6 place-items-center rounded-full border border-cyber-emerald/60 bg-[#16161C] text-cyber-cyan shadow-[0_0_22px_rgba(0,229,255,0.35)] transition hover:border-cyber-cyan hover:shadow-[0_0_28px_rgba(0,230,118,0.5)]"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        <span
          className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-[#16161C] bg-cyber-emerald shadow-glow-emerald"
          aria-hidden
        />
      </button>
    </>
  );
}
