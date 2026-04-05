'use client';

/**
 * TaxAgent.ai — Chat Interface
 *
 * Mobile-first conversational UI for the tax assessment interview.
 * Streams responses from /api/chat and extracts TaxProfile updates
 * from the assistant's structured JSON blocks.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
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
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="mr-2 mt-1 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            T
          </div>
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground'
        )}
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

export function ChatInterface({
  initialProfile,
  onProfileUpdate,
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

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message and stream the response
  const sendMessage = useCallback(async () => {
    const text = input.trim();
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

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Tax Assessment</h1>
            <p className="text-xs text-muted-foreground">2025 tax year · Ontario</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{progress.percent}%</span>
          </div>
        </div>
        <Progress value={progress.percent} className="mt-2 h-1.5" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              Starting your tax assessment…
            </p>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t bg-background px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer…"
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none py-2.5 text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="mb-0.5 flex-shrink-0"
            aria-label="Send message"
          >
            <SendIcon />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ICONS
// ============================================================

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9l20-7z" />
    </svg>
  );
}
