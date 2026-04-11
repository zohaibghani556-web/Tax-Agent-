'use client';

/**
 * AI Assessment — streaming CPA-style chat that interviews the user about
 * their 2025 tax situation. Uses /api/chat (Claude claude-sonnet-4-20250514).
 *
 * Flow:
 *  1. AI greets the user and conducts a 9-phase assessment interview.
 *  2. The UI streams responses in real time.
 *  3. When the AI signals completion it shows which slips the user needs.
 *  4. "Proceed to slips" stores the recommendations and navigates to /slips.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, ArrowRight, FileText, RefreshCw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SlipRecommendation {
  type: string;
  description: string;
  where: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse <slip-recommendations> XML blocks that Claude may emit.
 * The tag contains a JSON array of { type, description, where } objects.
 */
function parseSlipRecommendations(text: string): SlipRecommendation[] | null {
  const match = text.match(/<slip-recommendations>([\s\S]*?)<\/slip-recommendations>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as SlipRecommendation[];
  } catch {
    return null;
  }
}

/** Strip hidden XML tags and markdown code blocks from display text. */
function stripHiddenTags(text: string): string {
  return text
    .replace(/```tax-profile-update[\s\S]*?```/g, '')
    .replace(/```slip-recommendations[\s\S]*?```/g, '')
    .replace(/<tax-profile-update>[\s\S]*?<\/tax-profile-update>/g, '')
    .replace(/<deductions-update>[\s\S]*?<\/deductions-update>/g, '')
    .replace(/<slip-recommendations>[\s\S]*?<\/slip-recommendations>/g, '')
    .trim();
}

/** Parse <deductions-update> XML block and persist to localStorage. */
function applyDeductionsUpdate(text: string) {
  const match = text.match(/<deductions-update>([\s\S]*?)<\/deductions-update>/);
  if (!match) return;
  try {
    const update = JSON.parse(match[1]) as Record<string, number | boolean>;
    const existing = localStorage.getItem('taxagent_deductions');
    const current = existing ? (JSON.parse(existing) as Record<string, number | boolean>) : {};
    const merged = { ...current };
    for (const [k, v] of Object.entries(update)) {
      if (typeof v === 'boolean') {
        // Only overwrite booleans if set to true (don't reset confirmed flags to false)
        if (v === true) merged[k] = true;
      } else if (typeof v === 'number' && v > 0) {
        merged[k] = v;
      }
    }
    localStorage.setItem('taxagent_deductions', JSON.stringify(merged));
  } catch { /* ignore malformed */ }
}

/** Detect whether the AI has signalled the assessment is complete. */
function detectCompletion(text: string): boolean {
  return (
    /<slip-recommendations>/.test(text) ||
    /assessment is (now )?complete/i.test(text) ||
    /here (are|is) (the|your) (slips?|documents?) (you'?ll? need|required)/i.test(text) ||
    /proceed to (upload|slips|your slips)/i.test(text)
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  const displayContent = isUser ? content : stripHiddenTags(content);
  if (!displayContent) return null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="mr-2.5 mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
          CPA
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'text-white rounded-br-sm'
            : 'text-white/85 rounded-bl-sm'
        }`}
        style={
          isUser
            ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
        }
      >
        {displayContent}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="mr-2.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
        CPA
      </div>
      <div
        className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/40"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Slip recommendation card ──────────────────────────────────────────────────

function SlipCard({ slip }: { slip: SlipRecommendation }) {
  return (
    <div
      className="rounded-xl p-4 flex items-start gap-3"
      style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}
    >
      <FileText className="h-5 w-5 text-[#10B981] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-white">{slip.type}</p>
        <p className="text-xs text-white/60 mt-0.5">{slip.description}</p>
        <p className="text-xs text-[#10B981]/80 mt-1">📍 {slip.where}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! I'm your AI CPA for the 2025 tax year. I'll walk you through a quick assessment to understand your situation — it usually takes about 5–10 minutes.\n\nLet's start with the basics: what's your legal name and date of birth?",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [slipRecs, setSlipRecs] = useState<SlipRecommendation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('taxagent_assessment_messages');
    const savedComplete = localStorage.getItem('taxagent_assessment_done');
    const savedRecs = localStorage.getItem('taxagent_slip_recs');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages) as Message[];
        if (parsed.length > 1) setMessages(parsed); // only restore if there's actual conversation
      } catch { /* ignore */ }
    }
    if (savedComplete) setIsComplete(true);
    if (savedRecs) {
      try { setSlipRecs(JSON.parse(savedRecs) as SlipRecommendation[]); } catch { /* ignore */ }
    }
    hydratedRef.current = true;
  }, []);

  // Persist messages to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem('taxagent_assessment_messages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || streaming) return;

    const userMsg: Message = { role: 'user', content: userText.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    // Add empty assistant message that we'll fill in as chunks arrive
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: nextMessages,
          currentPhase: Math.min(9, Math.ceil(nextMessages.length / 3)),
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: 'Sorry, something went wrong. Please try again.',
          };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload) as { text?: string };
            if (parsed.text) {
              fullText += parsed.text;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: fullText };
                return copy;
              });
            }
          } catch {
            // ignore malformed SSE frames
          }
        }
      }

      // Apply any deductions update emitted by the AI
      applyDeductionsUpdate(fullText);

      // Check for completion and parse slip recommendations
      const recs = parseSlipRecommendations(fullText);
      if (recs && recs.length > 0) {
        setSlipRecs(recs);
        setIsComplete(true);
      } else if (detectCompletion(fullText)) {
        setIsComplete(true);
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I lost connection. Please try again.',
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [messages, streaming]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleProceedToSlips() {
    // Persist slip recommendations so /slips page can display them
    if (slipRecs.length > 0) {
      localStorage.setItem('taxagent_slip_recs', JSON.stringify(slipRecs));
    }
    localStorage.setItem('taxagent_assessment_done', '1');
    router.push('/slips');
  }

  function handleRestart() {
    abortRef.current?.abort();
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setStreaming(false);
    setIsComplete(false);
    setSlipRecs([]);
    localStorage.removeItem('taxagent_assessment_messages');
    localStorage.removeItem('taxagent_assessment_done');
    localStorage.removeItem('taxagent_slip_recs');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen max-w-3xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="px-4 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Tax Assessment</h1>
          <p className="text-xs text-white/40">2025 tax year · Ontario · Powered by Claude</p>
        </div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restart
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-5" style={{ scrollBehavior: 'smooth' }}>
        {messages.map((msg, i) => (
          <Bubble key={i} role={msg.role} content={msg.content} />
        ))}
        {streaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
        <div ref={messagesEndRef} />

        {/* ── Assessment complete: slip recommendations ─────────── */}
        {isComplete && (
          <div className="mt-6 space-y-4">
            {slipRecs.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-sm font-semibold text-white mb-3">
                  Based on your assessment, here are the slips you&apos;ll need:
                </p>
                <div className="space-y-2">
                  {slipRecs.map((slip, i) => (
                    <SlipCard key={i} slip={slip} />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToSlips}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#10B981] py-3.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
            >
              Proceed to upload my slips
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Input ─────────────────────────────────────────────────── */}
      {!isComplete && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none focus:outline-none py-1.5 max-h-32 leading-relaxed"
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || streaming}
              className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ background: '#10B981' }}
              aria-label="Send"
            >
              {streaming
                ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-white/20 text-center mt-2">
            Press Enter to send · Shift+Enter for a new line
          </p>
        </div>
      )}

      {/* Bounce animation */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
