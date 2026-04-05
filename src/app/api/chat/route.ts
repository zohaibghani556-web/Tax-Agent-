/**
 * TaxAgent.ai — Chat API Route
 *
 * POST /api/chat
 * Accepts { messages, taxProfile } from an authenticated user.
 * Streams Claude's response back using the Vercel AI SDK streaming format.
 *
 * Security:
 *   - Requires valid Supabase JWT (Authorization: Bearer <token>)
 *   - Rate limited: 10 messages per user per minute (shared in-process token bucket)
 *   - Total conversation history capped at 50 KB / 100 messages to control costs
 *   - Message role validated to prevent prompt injection via role spoofing
 */

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { TAX_AGENT_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import type { TaxProfile } from '@/lib/tax-engine/types';

// ============================================================
// ANTHROPIC CLIENT
// ============================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// REQUEST TYPES
// ============================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  taxProfile?: Partial<TaxProfile>;
}

// ============================================================
// ROUTE HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  // --- Auth ---
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Rate limit ---
  if (!checkRateLimit(`chat:${user.id}`, 10, 60_000)) {
    return new Response(
      JSON.stringify({ error: 'Too many messages. Please wait a minute.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    );
  }

  // --- Parse body ---
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, taxProfile } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate message structure — prevent prompt injection via role spoofing
  for (const msg of messages) {
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return new Response(
        JSON.stringify({ error: 'Invalid message role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (typeof msg.content !== 'string' || msg.content.length > 8000) {
      return new Response(
        JSON.stringify({ error: 'Invalid message content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // --- Guard total conversation size (cost control) ---
  // Per-message limit is 8 KB; total history is capped at 50 KB / 100 messages.
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars > 50_000) {
    return new Response(
      JSON.stringify({ error: 'Conversation history too large. Please start a new session.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (messages.length > 100) {
    return new Response(
      JSON.stringify({ error: 'Too many messages. Please start a new session.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Build context injection ---
  // Append current tax profile state as a system-level context block
  const profileContext = taxProfile
    ? `\n\n---\nCURRENT TAX PROFILE STATE:\n${JSON.stringify(taxProfile, null, 2)}\n---`
    : '';

  // --- Stream from Claude ---
  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: TAX_AGENT_SYSTEM_PROMPT + profileContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return a ReadableStream so the client can consume text/event-stream
    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            // SSE format: data: <payload>\n\n
            const payload = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[chat] Claude API error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI service' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
