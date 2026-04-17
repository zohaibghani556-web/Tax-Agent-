'use client';

/**
 * AI Assessment — streaming CPA-style chat that interviews the user about
 * their 2025 tax situation. Uses /api/chat (Claude claude-sonnet-4-6).
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
import { createClient } from '@/lib/supabase/client';
import {
  getMessages,
  saveMessage,
  clearMessages,
  upsertDeductions,
  upsertTaxProfile,
} from '@/lib/supabase/tax-data';
import type { UserDeductions } from '@/lib/supabase/tax-data';
import { addCsrfHeader } from '@/lib/csrf-client';

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

interface TaxProfileComplete {
  legalName?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  residencyStatus?: string;
  residencyStartDate?: string;
  dependants?: unknown[];
  assessmentComplete?: boolean;
  estimatedEmploymentIncome: number;
  estimatedSelfEmploymentNetIncome: number;
  estimatedInterestIncome: number;
  estimatedEligibleDividends: number;
  estimatedIneligibleDividends: number;
  estimatedCapitalGains: number;
  estimatedRentalIncome: number;
  estimatedRentalExpenses: number;
  estimatedPensionIncome: number;
  estimatedOasPension: number;
  estimatedEiBenefits: number;
  estimatedOtherIncome: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse <tax-profile-complete> XML block emitted by Claude at assessment end.
 * Contains profile + income estimates for the preliminary tax calculation.
 */
function parseTaxProfileComplete(text: string): TaxProfileComplete | null {
  const match = text.match(/<tax-profile-complete>([\s\S]*?)<\/tax-profile-complete>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as TaxProfileComplete;
  } catch {
    return null;
  }
}

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
    .replace(/<tax-profile-complete>[\s\S]*?<\/tax-profile-complete>/g, '')
    .replace(/<slip-recommendations>[\s\S]*?<\/slip-recommendations>/g, '')
    .trim();
}

/** Parse <deductions-update> XML block, persist to localStorage + Supabase. */
function applyDeductionsUpdate(text: string, userId: string) {
  const match = text.match(/<deductions-update>([\s\S]*?)<\/deductions-update>/);
  if (!match) return;
  try {
    const update = JSON.parse(match[1]) as Record<string, number | boolean>;
    const existing = localStorage.getItem('taxagent_deductions');
    const current = existing ? (JSON.parse(existing) as Record<string, number | boolean>) : {};
    const merged = { ...current };
    for (const [k, v] of Object.entries(update)) {
      if (typeof v === 'boolean') {
        if (v === true) merged[k] = true;
      } else if (typeof v === 'number' && v > 0) {
        merged[k] = v;
      }
    }
    localStorage.setItem('taxagent_deductions', JSON.stringify(merged));
    // Sync to Supabase if we have a userId
    if (userId) {
      // Build a UserDeductions object from the merged data
      const deductions: UserDeductions = {
        rrspContributions: Number(merged.rrspContributions ?? 0),
        rrspContributionRoom: Number(merged.rrspContributionRoom ?? 0),
        rentPaid: Number(merged.rentPaid ?? 0),
        propertyTaxPaid: Number(merged.propertyTaxPaid ?? 0),
        childcareExpenses: Number(merged.childcareExpenses ?? 0),
        movingExpenses: Number(merged.movingExpenses ?? 0),
        supportPaymentsMade: Number(merged.supportPaymentsMade ?? 0),
        instalmentsPaid: Number(merged.instalmentsPaid ?? 0),
        medicalExpenses: Number(merged.medicalExpenses ?? 0),
        charitableDonations: Number(merged.charitableDonations ?? 0),
        studentLoanInterest: Number(merged.studentLoanInterest ?? 0),
        unionDues: Number(merged.unionDues ?? 0),
        tuitionCarryforward: Number(merged.tuitionCarryforward ?? 0),
        digitalNewsSubscription: Number(merged.digitalNewsSubscription ?? 0),
        homeAccessibilityExpenses: Number(merged.homeAccessibilityExpenses ?? 0),
        hasSpouseOrCL: merged.hasSpouseOrCL === true,
        spouseNetIncome: Number(merged.spouseNetIncome ?? 0),
        hasEligibleDependant: merged.hasEligibleDependant === true,
        eligibleDependantNetIncome: Number(merged.eligibleDependantNetIncome ?? 0),
        caregiverForDependant18Plus: merged.caregiverForDependant18Plus === true,
        caregiverDependantNetIncome: Number(merged.caregiverDependantNetIncome ?? 0),
        hasDisabilityCredit: merged.hasDisabilityCredit === true,
        homeBuyersEligible: merged.homeBuyersEligible === true,
        volunteerFirefighter: merged.volunteerFirefighter === true,
        searchAndRescue: merged.searchAndRescue === true,
        canadaTrainingCreditRoom: Number(merged.canadaTrainingCreditRoom ?? 0),
        trainingFeesForCTC: Number(merged.trainingFeesForCTC ?? 0),
      };
      upsertDeductions(userId, 2025, deductions).catch(() => { /* ignore */ });
    }
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
  const [calcRunning, setCalcRunning] = useState(false);
  const [calcDone, setCalcDone] = useState(false);
  const [userId, setUserId] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => { document.title = 'AI Assessment — TaxAgent.ai'; }, []);

  // Load user + restore conversation from Supabase (primary) + localStorage (fallback)
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? '';
      setUserId(uid);

      // Load messages from Supabase first
      let dbMessages: Message[] = [];
      if (uid) {
        dbMessages = await getMessages(uid);
      }

      if (dbMessages.length > 1) {
        // DB has real conversation — use it as source of truth
        setMessages(dbMessages);
        localStorage.setItem('taxagent_assessment_messages', JSON.stringify(dbMessages));
        setShowResumeModal(true); // returning user — show welcome back modal
      } else {
        // Fall back to localStorage
        const savedMessages = localStorage.getItem('taxagent_assessment_messages');
        if (savedMessages) {
          try {
            const parsed = JSON.parse(savedMessages) as Message[];
            if (parsed.length > 1) {
              setMessages(parsed);
              setShowResumeModal(true);
            }
          } catch { /* ignore */ }
        }
      }

      const savedComplete = localStorage.getItem('taxagent_assessment_done');
      if (savedComplete) setIsComplete(true);

      const savedRecs = localStorage.getItem('taxagent_slip_recs');
      if (savedRecs) {
        try { setSlipRecs(JSON.parse(savedRecs) as SlipRecommendation[]); } catch { /* ignore */ }
      }

      hydratedRef.current = true;
    }
    init().catch(() => { hydratedRef.current = true; });
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

  /**
   * Layer 3 auto-pipeline: builds a preliminary TaxInput from assessment data
   * and calls /api/calculate (flat mode). Stores result in localStorage so
   * /calculator can display it immediately on arrival.
   */
  async function runAutoCalculation(profile: TaxProfileComplete) {
    setCalcRunning(true);
    try {
      // Pull deductions accumulated during the chat
      const rawDed = localStorage.getItem('taxagent_deductions');
      const ded = rawDed ? (JSON.parse(rawDed) as Record<string, number | boolean>) : {};
      const n = (k: string) => Number(ded[k] ?? 0);
      const b = (k: string) => Boolean(ded[k] ?? false);

      // Calculate age on Dec 31 2025
      let age = 40; // fallback
      if (profile.dateOfBirth) {
        const dob = new Date(profile.dateOfBirth);
        const dec31 = new Date('2025-12-31');
        const raw = dec31.getFullYear() - dob.getFullYear();
        const hadBday = dec31.getMonth() > dob.getMonth() ||
          (dec31.getMonth() === dob.getMonth() && dec31.getDate() >= dob.getDate());
        age = hadBday ? raw : raw - 1;
      }

      const input = {
        // Income
        employmentIncome:         profile.estimatedEmploymentIncome,
        selfEmploymentNetIncome:  profile.estimatedSelfEmploymentNetIncome,
        otherEmploymentIncome:    0,
        pensionIncome:            profile.estimatedPensionIncome,
        annuityIncome:            0,
        rrspIncome:               0,
        otherIncome:              profile.estimatedOtherIncome,
        interestIncome:           profile.estimatedInterestIncome,
        eligibleDividends:        profile.estimatedEligibleDividends,
        ineligibleDividends:      profile.estimatedIneligibleDividends,
        capitalGains:             profile.estimatedCapitalGains,
        capitalLossesPriorYears:  n('capitalLossCarryforward'),
        rentalIncome:             profile.estimatedRentalIncome,
        rentalExpenses:           profile.estimatedRentalExpenses,
        foreignIncome:            0,
        foreignTaxPaid:           0,
        eiRegularBenefits:        profile.estimatedEiBenefits,
        socialAssistance:         0,
        workersComp:              0,
        disabilityPensionCPP:     0,
        oasPension:               profile.estimatedOasPension,
        netPartnershipIncome:     0,
        scholarshipFellowship:    0,
        researchGrants:           0,
        // Deductions
        rrspContribution:         n('rrspContributions'),
        rrspContributionRoom:     n('rrspContributionRoom') || 10000,
        prppContribution:         0,
        fhsaContribution:         n('fhsaContributions'),
        unionDues:                n('unionDues'),
        profDues:                 0,
        childcareExpenses:        n('childcareExpenses'),
        movingExpenses:           n('movingExpenses'),
        supportPayments:          n('supportPaymentsMade'),
        carryingCharges:          0,
        employmentExpenses:       0,
        otherDeductions:          0,
        // Credits
        age,
        isBlind:                  false,
        hasDisability:            b('hasDisabilityCredit'),
        hasDisabledSpouse:        false,
        hasDisabledDependent:     false,
        disabledDependentAge:     0,
        hasSpouse:                b('hasSpouseOrCL'),
        spouseNetIncome:          n('spouseNetIncome'),
        numberOfDependentsUnder18: 0,
        numberOfDependents18Plus:  0,
        isCaregiver:              b('caregiverForDependant18Plus'),
        tuitionFederal:           0,
        tuitionCarryforwardFed:   n('tuitionCarryforward'),
        studentLoanInterest:      n('studentLoanInterest'),
        medicalExpenses:          n('medicalExpenses'),
        charitableDonations:      n('charitableDonations'),
        politicalContributions:   0,
        ontarioPoliticalContributions: 0,
        firstTimeHomeBuyer:       b('homeBuyersEligible'),
        homeAccessibilityReno:    n('homeAccessibilityExpenses'),
        adoptionExpenses:         0,
        pensionIncomeSplitting:   0,
        isVolunteerFirefighter:   b('volunteerFirefighter'),
        isSearchAndRescue:        b('searchAndRescue'),
        digitalNewsSubscriptions: n('digitalNewsSubscription'),
        // Payroll — unknown before slip upload; set 0, balance owing will show gross tax
        taxWithheld:              0,
        cppContributedEmployee:   0,
        cpp2ContributedEmployee:  0,
        eiContributedEmployee:    0,
        // Ontario
        rentPaid:                 n('rentPaid'),
        propertyTaxPaid:          n('propertyTaxPaid'),
        isNorthernOntario:        false,
        ontarioSalesTaxCreditEligible: true,
        // Misc
        installmentsPaid:         n('instalmentsPaid'),
        fhsaWithdrawal:           0,
        hasPriorYearCapitalLosses: n('capitalLossCarryforward') > 0,
        numberOfChildren:         0,
        numberOfChildrenUnder6:   0,
        hasSpouseForBenefits:     b('hasSpouseOrCL'),
      };

      const res = await fetch('/api/calculate', addCsrfHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'flat', input }),
      }));

      if (res.ok) {
        const result = await res.json() as unknown;
        localStorage.setItem('taxagent_calc_result', JSON.stringify(result));
        localStorage.setItem('taxagent_is_preliminary', '1');
        setCalcDone(true);
      }
    } catch {
      // Non-fatal — user can still proceed to /slips and calculate from there
    } finally {
      setCalcRunning(false);
    }
  }

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

      const res = await fetch('/api/chat', addCsrfHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: nextMessages,
          currentPhase: Math.min(9, Math.ceil(nextMessages.length / 3)),
        }),
      }));

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
      applyDeductionsUpdate(fullText, userId);

      // Save both message turns to Supabase
      if (userId) {
        await saveMessage(userId, 'user', userText.trim()).catch(() => { /* ignore */ });
        await saveMessage(userId, 'assistant', fullText).catch(() => { /* ignore */ });
      }

      // Check for completion and parse slip recommendations
      const recs = parseSlipRecommendations(fullText);
      if (recs && recs.length > 0) {
        setSlipRecs(recs);
        setIsComplete(true);
      } else if (detectCompletion(fullText)) {
        setIsComplete(true);
      }

      // Layer 3 auto-pipeline: fire preliminary calculation when profile is complete
      const profileComplete = parseTaxProfileComplete(fullText);
      if (profileComplete?.assessmentComplete) {
        runAutoCalculation(profileComplete);
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

  function handleProceed() {
    if (slipRecs.length > 0) {
      localStorage.setItem('taxagent_slip_recs', JSON.stringify(slipRecs));
    }
    localStorage.setItem('taxagent_assessment_done', '1');
    // Mark assessment complete in Supabase
    if (userId) {
      upsertTaxProfile(userId, { taxYear: 2025, assessmentComplete: true }).catch(() => { /* ignore */ });
    }
    // If preliminary calc ran successfully, go straight to calculator; otherwise upload slips first
    router.push(calcDone ? '/calculator' : '/slips');
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
    localStorage.removeItem('taxagent_calc_result');
    localStorage.removeItem('taxagent_is_preliminary');
    setCalcDone(false);
    // Clear Supabase messages
    if (userId) {
      clearMessages(userId).catch(() => { /* ignore */ });
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] md:h-screen max-w-3xl mx-auto">

      {/* ── Welcome back modal ─────────────────────────────────────── */}
      {showResumeModal && !isComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div>
              <p className="text-lg font-bold text-white">Welcome back!</p>
              <p className="text-sm text-white/50 mt-1">
                You have an assessment in progress. Would you like to continue where you left off?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResumeModal(false)}
                className="flex-1 rounded-full bg-[#10B981] py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
              >
                Continue assessment
              </button>
              <button
                onClick={() => { handleRestart(); setShowResumeModal(false); }}
                className="flex-1 rounded-full py-2.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Start over
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={handleProceed}
              disabled={calcRunning}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#10B981] py-3.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              {calcRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating your estimate…
                </>
              ) : calcDone ? (
                <>
                  View my tax estimate
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Proceed to upload my slips
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
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
