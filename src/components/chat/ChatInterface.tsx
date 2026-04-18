'use client';

/**
 * TaxAgent.ai — Chat Interface
 *
 * Mobile-first conversational UI for the tax assessment interview.
 * Streams responses from /api/chat and extracts TaxProfile updates
 * from the assistant's structured JSON blocks.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  extractProfileUpdate,
  mergeProfileUpdate,
  calculateAssessmentProgress,
} from '@/lib/ai/assessment';
import type { TaxProfile } from '@/lib/tax-engine/types';

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** True while the assistant is still streaming */
  streaming?: boolean;
}

interface ChatInterfaceProps {
  initialProfile?: Partial<TaxProfile>;
  onProfileUpdate?: (profile: Partial<TaxProfile>) => void;
  quickReplies?: string[];
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Strip the ```tax-profile-update ... ``` block from display text. */
function stripProfileBlock(text: string): string {
  return text.replace(/```tax-profile-update[\s\S]*?```/g, '').trim();
}

// ============================================================
// MESSAGE BUBBLE
// ============================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const displayText = isUser ? message.content : stripProfileBlock(message.content);

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
          isUser
            ? 'rounded-br-sm text-white'
            : 'rounded-bl-sm border'
        )}
        style={
          isUser
            ? { background: 'var(--emerald)' }
            : {
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.85)',
              }
        }
      >
        {displayText}
        {message.streaming && (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded-sm bg-current opacity-60" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const DEFAULT_QUICK_REPLIES = ['Yes', 'No', 'Not sure'];

export function ChatInterface({
  initialProfile,
  onProfileUpdate,
  quickReplies = DEFAULT_QUICK_REPLIES,
  className,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Partial<TaxProfile>>(initialProfile ?? {});

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const progress = calculateAssessmentProgress(profile);

  // Derive a friendly step label from progress percentage (14-question flow)
  const TOTAL_STEPS = 14;
  const stepNum = Math.max(1, Math.min(TOTAL_STEPS, Math.round((progress.percent / 100) * TOTAL_STEPS) + 1));
  const minsLeft = Math.max(1, Math.round(((100 - progress.percent) / 100) * 7));

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message and stream the response
  const sendMessage = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: text,
    };

    const assistantId = generateId();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    // Build conversation history for the API
    const history = [
      ...messages,
      userMessage,
    ].map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, taxProfile: profile }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data) as { text: string };
            accumulated += parsed.text;

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulated }
                  : m
              )
            );
          } catch {
            // Partial JSON — skip
          }
        }
      }

      // Finalise the message (stop streaming indicator)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );

      // Extract and apply any profile updates
      const update = extractProfileUpdate(accumulated);
      if (update) {
        const next = profile.id
          ? mergeProfileUpdate(profile as TaxProfile, update)
          : { ...profile, ...update };
        setProfile(next);
        onProfileUpdate?.(next);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      // Remove the empty assistant bubble
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [input, isLoading, messages, profile, onProfileUpdate]);

  // Submit on Enter (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const showQuickReplies = quickReplies.length > 0 && !isLoading && messages.length > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        className="h-16 flex-shrink-0 flex items-center gap-3 px-5 border-b"
        style={{
          background: 'rgba(10,16,32,0.80)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: 'var(--emerald)',
          }}
        >
          <MessageSquare className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-[14px]">AI assessment</div>
          <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Step {stepNum} of {TOTAL_STEPS} · about {minsLeft} min left
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--emerald)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* ── Message thread ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center pt-24">
              <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Starting your tax assessment…
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {error && (
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'rgba(239,68,68,0.90)',
              }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Composer area ───────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t px-4 py-4 md:px-6"
        style={{
          background: 'rgba(10,16,32,0.80)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-2xl mx-auto">

          {/* Quick-reply chips */}
          {showQuickReplies && (
            <div className="flex flex-wrap gap-2 mb-3">
              {quickReplies.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  className="text-[12px] rounded-full px-3.5 py-1.5 transition-colors"
                  style={{
                    color: 'rgba(255,255,255,0.70)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.70)'; }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Glass composer */}
          <div
            className="flex items-end gap-2 rounded-2xl p-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer…"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none resize-none max-h-32 text-[14px] px-3 py-2"
              style={{
                color: 'white',
                minHeight: '40px',
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-40"
              style={{ background: 'var(--emerald)' }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--emerald-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--emerald)'; }}
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
