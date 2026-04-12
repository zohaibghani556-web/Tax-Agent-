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
import { validateCsrfToken } from '@/lib/csrf';
import { log } from '@/lib/logger';
import { TAX_AGENT_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import {
  TAX_KNOWLEDGE_2025,
  getRelevantCreditKeys,
  getRelevantMistakes,
} from '@/lib/ai/canadian-tax-knowledge';
import { retrieveRelevantKnowledge } from '@/lib/rag/embed';
import type { TaxProfile } from '@/lib/tax-engine/types';
import type { TaxBreakdown } from '@/lib/taxEngine';

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
  // Pre-computed breakdown from /api/calculate — injected verbatim so Claude
  // explains numbers rather than recalculating them.
  taxBreakdown?: TaxBreakdown;
  // Assessment phase (1–9). Used to inject phase-specific knowledge.
  // If omitted, the engine infers context from the taxProfile.
  currentPhase?: number;
}

// ============================================================
// VALIDATION RESULT
// ============================================================

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

// ============================================================
// KNOWLEDGE INJECTION
// ============================================================

/**
 * Builds a context-enriched system prompt by appending relevant knowledge
 * sections from TAX_KNOWLEDGE_2025 based on the user's profile and phase.
 *
 * Injects:
 * - Credits relevant to the user's profile (age, marital status, dependants)
 * - Common mistakes filtered to the user's situation
 * - Full credit eligibility rules during the credits phase (phase 7)
 * - Ontario-specific rules always (Ontario-only product)
 */
function buildContextualSystemPrompt(
  basePrompt: string,
  profile: Partial<TaxProfile>,
  currentPhase: number,
): string {
  let context = basePrompt;

  // Always inject relevant credits (concise — just names and amounts)
  const relevantKeys = getRelevantCreditKeys(profile);
  const relevantCredits = relevantKeys.map(k => {
    const rule = TAX_KNOWLEDGE_2025.CREDITS_AND_ELIGIBILITY[k];
    return rule ? `${rule.name} (${rule.craLine}): ${rule.amount2025}` : null;
  }).filter(Boolean);

  if (relevantCredits.length > 0) {
    context += '\n\n---\nCREDITS RELEVANT TO THIS USER:\n';
    context += relevantCredits.join('\n');
  }

  // In credits phase, inject full eligibility rules to improve accuracy
  if (currentPhase === 7) {
    context += '\n\nFULL CREDIT ELIGIBILITY RULES:\n';
    context += JSON.stringify(TAX_KNOWLEDGE_2025.CREDITS_AND_ELIGIBILITY, null, 2);
  }

  // Always inject Ontario-specific rules
  context += '\n\nONTARIO-SPECIFIC RULES:\n';
  const ontarioSummary = Object.entries(TAX_KNOWLEDGE_2025.ONTARIO_SPECIFIC)
    .map(([, rule]) => `${rule.description}: ${rule.amount2025}`)
    .join('\n');
  context += ontarioSummary;

  // Always inject filtered common mistakes
  const relevantMistakes = getRelevantMistakes(profile);
  if (relevantMistakes.length > 0) {
    context += '\n\nCOMMON MISTAKES TO WATCH FOR IN THIS CONVERSATION:\n';
    context += relevantMistakes
      .map(m => `- SITUATION: ${m.situation}\n  CORRECTION: ${m.correction}`)
      .join('\n');
  }

  return context;
}

// ============================================================
// RESPONSE VALIDATION
// ============================================================

/**
 * Post-processing guard for assessment responses.
 * Checks for content that violates the assessment model's boundaries.
 *
 * Returns valid=false if any hard rule is violated. Max 2 regeneration attempts
 * are made in the route handler; after that the response is returned with a warning.
 */
function validateAssessmentResponse(response: string): ValidationResult {
  const issues: string[] = [];

  // 1. Tax amount leak: Claude should never state dollar refund/owing amounts
  const taxAmountPattern = /\$[\d,]+(\.\d{2})?\s*(refund|owing|payable|tax|back|owe)/i;
  if (taxAmountPattern.test(response)) {
    issues.push('TAX_AMOUNT_LEAK: Response contains a specific tax dollar amount');
  }

  // 2. Multiple questions: allow up to 4 (completion messages have more context)
  const questionCount = (response.match(/\?/g) ?? []).length;
  if (questionCount > 4) {
    issues.push(`MULTIPLE_QUESTIONS: Response contains ${questionCount} question marks`);
  }

  // 3. US jurisdiction error: wrong country references
  const usTerms = /\b(IRS|Form 1040|W-2|W2|1099|Schedule [A-Z]|federal return|U\.S\. tax|American tax)\b/i;
  if (usTerms.test(response)) {
    issues.push('JURISDICTION_ERROR: Response references US tax forms or the IRS');
  }

  // 4. Wrong tax year: only 2025 tax year is in scope
  const wrongYearPattern = /\b(202[0-4])\s*tax\s*year\b/i;
  if (wrongYearPattern.test(response)) {
    issues.push('WRONG_TAX_YEAR: Response mentions an incorrect tax year');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
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

  // --- CSRF validation ---
  if (!validateCsrfToken(req)) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
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

  const { messages, taxProfile, taxBreakdown, currentPhase = 1 } = body;

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

  // Validate phase is in range
  if (typeof currentPhase !== 'number' || currentPhase < 1 || currentPhase > 9) {
    return new Response(
      JSON.stringify({ error: 'currentPhase must be a number between 1 and 9' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
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

  // --- RAG: retrieve authoritative CRA knowledge chunks for the latest user message ---
  // Non-fatal: if retrieval fails for any reason, chat continues without RAG.
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  let ragContext = '';
  try {
    const chunks = await retrieveRelevantKnowledge(lastUserMessage, supabase);
    if (chunks.length > 0) {
      ragContext =
        'AUTHORITATIVE CRA SOURCES (cite these where relevant):\n\n' +
        chunks.map(c => `[Source: ${c.source}]\n${c.content}`).join('\n---\n') +
        '\n---\n';
    }
  } catch (ragErr) {
    log('warn', 'chat.rag_retrieval_error', { message: (ragErr as Error).message });
  }

  // Instruction injected into the base prompt to enforce citation discipline.
  const citationInstruction =
    '\n\nCITATION RULE: Always cite the CRA source when referencing tax rules or amounts. ' +
    'Never state amounts from memory — use only the retrieved sources provided above. ' +
    'If a topic has no retrieved source, say so and recommend the user verify with CRA directly.';

  // --- Build enriched system prompt ---
  const enrichedSystemPrompt = buildContextualSystemPrompt(
    TAX_AGENT_SYSTEM_PROMPT + citationInstruction,
    taxProfile ?? {},
    currentPhase,
  );

  // Append current tax profile state as a system-level context block
  const profileContext = taxProfile
    ? `\n\n---\nCURRENT TAX PROFILE STATE:\n${JSON.stringify(taxProfile, null, 2)}\n---`
    : '';

  // Inject pre-computed tax breakdown so Claude explains numbers rather than recalculating.
  // Architecture rule: AI explains deterministic engine output — never recalculates.
  const breakdownContext = taxBreakdown
    ? `\n\n---\nCOMPUTED TAX BREAKDOWN (authoritative — do NOT recalculate, only explain):\n${JSON.stringify(taxBreakdown, null, 2)}\n---`
    : '';

  const systemPrompt = enrichedSystemPrompt + (ragContext ? `\n\n---\n${ragContext}` : '') + profileContext + breakdownContext;

  // --- Call Claude with response validation (up to 2 regeneration attempts) ---
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    let finalResponse: string | null = null;
    let validationWarning: string | null = null;

    // Attempt generation with post-validation, max 2 retries
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: attempt === 0
          ? systemPrompt
          : systemPrompt + '\n\nIMPORTANT REMINDER: Ask only ONE question per response. Do NOT state specific tax dollar amounts. Do NOT reference IRS or US tax forms.',
        messages: anthropicMessages,
      });

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      const validation = validateAssessmentResponse(text);
      if (validation.valid) {
        finalResponse = text;
        break;
      }

      // On last attempt, use the response anyway but log and warn
      if (attempt === 2) {
        log('warn', 'chat.validation_failed', { issues: validation.issues.join('; ') });
        finalResponse = text;
        validationWarning = validation.issues.join('; ');
      }
    }

    // Stream the final response as SSE
    const readable = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        if (finalResponse) {
          // Chunk the response to simulate streaming for client compatibility
          const chunkSize = 50;
          for (let i = 0; i < finalResponse.length; i += chunkSize) {
            const chunk = finalResponse.slice(i, i + chunkSize);
            const payload = JSON.stringify({ text: chunk });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }

        if (validationWarning) {
          const warnPayload = JSON.stringify({ validationWarning });
          controller.enqueue(encoder.encode(`data: ${warnPayload}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
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
    log('error', 'chat.claude_api_error', { message: (err as Error).message });
    return new Response(
      JSON.stringify({ error: 'Failed to connect to AI service' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
