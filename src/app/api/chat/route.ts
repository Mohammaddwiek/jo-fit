import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';
import { getOfflineHealthResponse } from '../../../lib/healthKnowledge';

export const dynamic = 'force-dynamic';

// gemini-2.5-flash is no longer available to new API keys.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const TIMEOUT_MS = 8000;
const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_CHARS = 2000;

const SYSTEM_INSTRUCTION = [
  'You are the Jo-Fit Biomechanics & Preventive Health Assistant, sponsored by Arab Bank.',
  'You advise users on exercise biomechanics (focusing on safe squat depth at 90°, spine alignment, and knee stability), progressive overload principles, and Arabi Fit Points.',
  'Keep responses concise (under 75 words), encouraging, scientifically rigorous, and formatted with clean bullet points or bold text.',
  'This is general fitness information, not medical advice; for pain or injury recommend a physiotherapist, and for emergencies tell the user to call 911 (Jordan).',
].join(' ');

type ChatRole = 'user' | 'assistant';
interface ChatTurn {
  role: ChatRole;
  content: string;
}

function parseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (turn): turn is ChatTurn =>
        typeof turn === 'object' &&
        turn !== null &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' &&
        turn.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, MAX_HISTORY_CHARS) }));
}

function fallback(message: string) {
  return NextResponse.json({ reply: getOfflineHealthResponse(message), source: 'offline-fallback' as const });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const rawMessage = (body as { message?: unknown } | null)?.message;
  if (typeof rawMessage !== 'string' || rawMessage.trim() === '') {
    return NextResponse.json({ error: '`message` must be a non-empty string.' }, { status: 400 });
  }
  const message = rawMessage.trim().slice(0, MAX_MESSAGE_CHARS);
  const history = parseHistory((body as { history?: unknown }).history);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback(message);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents: [
        ...history.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Thinking tokens count against this limit, so leave room for the visible reply.
        maxOutputTokens: 1000,
        // Gemini 3 models use thinkingLevel (gemini-3.8-flash rejects MINIMAL); LOW keeps short replies fast and untruncated.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      },
    });

    const reply = response.text?.trim();
    if (!reply) return fallback(message);
    return NextResponse.json({ reply, source: 'gemini' as const });
  } catch (error) {
    // Offline, timeout, quota, bad key: answer from the local knowledge base instead of failing.
    const detail = (error instanceof Error ? error.message : String(error)).split(apiKey).join('[redacted]');
    console.warn('[api/chat] Gemini unavailable, using offline fallback:', detail);
    return fallback(message);
  }
}
