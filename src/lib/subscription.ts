/**
 * Subscription tier utilities.
 *
 * TaxAgent.ai has two tiers:
 *   'free' — instant estimator, assessment, slips, core calculator
 *   'pro'  — WhatIfEngine, CreditFinder, TaxOptimizer, filing guide AI, history export
 *
 * During the MVP, all features are enabled for all users (pro = true for everyone).
 * This module provides the gating hooks so that paid gating can be wired in later
 * by reading from Supabase user_metadata.subscription_tier without UI changes.
 */

export type SubscriptionTier = 'free' | 'pro';

export const PRO_FEATURES = [
  'what-if-engine',
  'credit-finder',
  'tax-optimizer',
  'filing-guide-ai',
  'history-export',
] as const;

export type ProFeature = typeof PRO_FEATURES[number];

/**
 * Reads the tier from Supabase user_metadata (passed in as a parameter
 * to avoid async in the component layer — caller reads once from Supabase).
 * Falls back to 'free' if unknown.
 */
export function parseTier(metadata: Record<string, unknown> | undefined): SubscriptionTier {
  const raw = metadata?.subscription_tier;
  if (raw === 'pro') return 'pro';
  return 'free';
}

/**
 * During MVP, all features are available to all users.
 * Replace the `return true` with a tier check when billing is live.
 */
export function hasAccess(_feature: ProFeature, _tier: SubscriptionTier): boolean {
  return true; // MVP: all users get full access
}
