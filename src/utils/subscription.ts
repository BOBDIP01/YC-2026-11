import {
  SubscriptionState,
  SubscriptionTier,
  AiUsageType,
  AiCoinTransaction,
  AiBoosterPackBatch,
} from '../types';

export interface TierSpec {
  id: SubscriptionTier;
  name: string;
  badge: string;
  priceLabel: string;
  billingPeriod: string;
  tagline: string;
  maxCards: number; // 2 for Free, Infinity for Basic & Business
  maxCardsLabel: string;
  dailyIncludedCoins: number; // 0 for Free, 5 (any AI) for Basic, 10 (Image AI) for Business
  aiPowerLabel: string;
  unlimitedTextAndCrmAi: boolean; // true for Business (reasoning, text writing & CRM AI included)
  hasCrmAccess: boolean; // false for Free & Basic, true for Business
  crmAccess: boolean; // alias for SettingsView
  weeklyRadarLimit: number; // 1 for Free, Infinity for Basic & Business
  radarLimitLabel: string;
  maxRoomParticipants: number; // 5 for Free, 0 (Unlimited) for Basic & Business
  radarRoomMaxParticipantsLabel: string;
  features: string[];
}

export const AI_BOOSTER_PACK_SIZE = 50;
export const AI_BOOSTER_PACK_PRICE = '$14.99';
export const AI_BOOSTER_VALIDITY_MONTHS = 3;
export const AI_BOOSTER_VALIDITY_DAYS = 90;

export const SUBSCRIPTION_TIER_SPECS: Record<SubscriptionTier, TierSpec> = {
  free: {
    id: 'free',
    name: 'Free',
    badge: 'Starter',
    priceLabel: '$0',
    billingPeriod: 'Free Forever',
    tagline: 'Essential digital identity & local networking starter.',
    maxCards: 2,
    maxCardsLabel: '2 Cards Maximum',
    dailyIncludedCoins: 0,
    aiPowerLabel: '0 Included (Supports 50-Coin Booster · Valid 3 Months)',
    unlimitedTextAndCrmAi: false,
    hasCrmAccess: false,
    crmAccess: false,
    weeklyRadarLimit: 1,
    radarLimitLabel: '1 Session / Week',
    maxRoomParticipants: 5,
    radarRoomMaxParticipantsLabel: 'Max 5 Connected Persons',
    features: [
      'Up to 2 Digital Business Cards maximum',
      '0 Included AI Quota (can buy 50-Coin AI Booster Pack · valid 3 months)',
      'P2P Radar: 1 session per week',
      'Create Radar Rooms for up to 5 connected persons max',
      'Contacts (Rubrica) address book & QR/NFC card sharing',
      'No access to Business CRM',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    badge: 'Most Popular',
    priceLabel: '$12',
    billingPeriod: '/ month',
    tagline: 'Daily non-cumulative AI quota & unlimited P2P conference networking.',
    maxCards: Number.POSITIVE_INFINITY,
    maxCardsLabel: 'Unlimited Digital Cards',
    dailyIncludedCoins: 5,
    aiPowerLabel: '5 AI Coins / Day (Non-cumulative · No monthly rollover)',
    unlimitedTextAndCrmAi: false,
    hasCrmAccess: false,
    crmAccess: false,
    weeklyRadarLimit: Number.POSITIVE_INFINITY,
    radarLimitLabel: 'Unlimited P2P Radar',
    maxRoomParticipants: 0, // 0 = Unlimited
    radarRoomMaxParticipantsLabel: 'Unlimited Room Participants',
    features: [
      'All Free tier features + Unlimited Digital Cards',
      '5 AI Quota Coins / day included (for any AI utilization)',
      'Non-cumulative quota: remaining monthly coins do NOT roll over to next month',
      'Supports 50-Coin AI Booster Pack (valid 3 months from purchase)',
      'Unlimited P2P Radar sessions & Unlimited room participants',
      'No access to Business CRM',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    badge: 'Executive & CRM',
    priceLabel: '$29',
    billingPeriod: '/ month',
    tagline: 'Full Business CRM, After-Sales Hub, 10 Daily AI Images & Unlimited CRM AI.',
    maxCards: Number.POSITIVE_INFINITY,
    maxCardsLabel: 'Unlimited Digital Cards',
    dailyIncludedCoins: 10,
    aiPowerLabel: '10 AI Images/Day (Non-cumulative) + Unlimited Text/CRM AI',
    unlimitedTextAndCrmAi: true,
    hasCrmAccess: true,
    crmAccess: true,
    weeklyRadarLimit: Number.POSITIVE_INFINITY,
    radarLimitLabel: 'Unlimited P2P Radar',
    maxRoomParticipants: 0, // 0 = Unlimited
    radarRoomMaxParticipantsLabel: 'Unlimited Room Participants',
    features: [
      'Everything in Basic + Full Business CRM & After-Sales Hub',
      '10 AI Image Generations / day included (non-cumulative · no monthly rollover)',
      'Full AI Power for CRM Support, Social Scanning, Reasoning & Text Writing (Unlimited up to Google service limits)',
      'Supports 50-Coin AI Booster Pack (valid 3 months) for extra AI image generations',
      'Unlimited Digital Cards, P2P Radar & Room Participants',
    ],
  },
};

export function getTodayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsToDateStr(dateStr: string, monthsToAdd: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setUTCMonth(fallback.getUTCMonth() + monthsToAdd);
    return fallback.toISOString().slice(0, 10);
  }
  d.setUTCMonth(d.getUTCMonth() + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

export function computeBoosterExpiryIso(fromDate = new Date()): string {
  const expiry = new Date(fromDate);
  expiry.setMonth(expiry.getMonth() + AI_BOOSTER_VALIDITY_MONTHS);
  return expiry.toISOString();
}

export function getDaysRemainingUntil(isoOrDateStr?: string): number {
  if (!isoOrDateStr) return 0;
  const target = new Date(isoOrDateStr).getTime();
  if (Number.isNaN(target)) return 0;
  const diffMs = target - Date.now();
  return Math.max(0, Math.ceil(diffMs / 86400000));
}

export function getCurrentWeekMondayStr(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

export function getInitialSubscriptionState(
  initialTier: SubscriptionTier = 'business'
): SubscriptionState {
  const today = getTodayDateStr();
  const monday = getCurrentWeekMondayStr();
  const nextMonthRenewal = addMonthsToDateStr(today, 1);

  return {
    tier: initialTier,
    billingCycleStartDate: today,
    billingCycleRenewalDate: nextMonthRenewal,
    dailyQuotaDate: today,
    dailyCoinsUsed: 0,
    boosterCoinsBalance: 0,
    boosterPacksPurchasedCount: 0,
    boosterPacks: [],
    boosterExpiresAt: undefined,
    totalCoinsConsumedLifetime: 0,
    radarWeekStartDate: monday,
    weeklyRadarSessionsUsed: 0,
    coinHistory: [],
  };
}

export function normalizeSubscriptionState(state: SubscriptionState): SubscriptionState {
  const today = getTodayDateStr();
  const monday = getCurrentWeekMondayStr();
  const nowMs = Date.now();
  let updated: SubscriptionState = { ...state };

  // 1. Ensure monthly billing cycle dates exist; if monthly cycle renewed, reset without any cumulative rollover
  if (!updated.billingCycleStartDate || !updated.billingCycleRenewalDate) {
    updated.billingCycleStartDate = today;
    updated.billingCycleRenewalDate = addMonthsToDateStr(today, 1);
  } else if (today >= updated.billingCycleRenewalDate) {
    // Monthly renewal: remaining included coins on the monthly payment do NOT top up the next month
    updated.billingCycleStartDate = today;
    updated.billingCycleRenewalDate = addMonthsToDateStr(today, 1);
    updated.dailyQuotaDate = today;
    updated.dailyCoinsUsed = 0;
  }

  // 2. Daily quota is strictly non-cumulative (resets each day, never rolls over)
  if (updated.dailyQuotaDate !== today) {
    updated.dailyQuotaDate = today;
    updated.dailyCoinsUsed = 0;
  }

  // 3. Weekly P2P Radar counter reset (Monday)
  if (updated.radarWeekStartDate !== monday) {
    updated.radarWeekStartDate = monday;
    updated.weeklyRadarSessionsUsed = 0;
    updated.activeRadarSessionDate = undefined;
  }

  // 4. Enforce 3-Month Validity on AI Booster Packs
  let activePacks: AiBoosterPackBatch[] = Array.isArray(updated.boosterPacks)
    ? updated.boosterPacks
    : [];

  // Migrate legacy balance if boosterCoinsBalance > 0 without boosterPacks array
  if (activePacks.length === 0 && (updated.boosterCoinsBalance || 0) > 0) {
    const fallbackExpiry = updated.boosterExpiresAt || computeBoosterExpiryIso();
    activePacks = [
      {
        id: `booster-legacy-${Date.now()}`,
        purchasedAt: new Date().toISOString(),
        expiresAt: fallbackExpiry,
        initialCoins: updated.boosterCoinsBalance,
        remainingCoins: updated.boosterCoinsBalance,
      },
    ];
  }

  // Filter out expired booster packs (older than 3 months) or depleted packs
  activePacks = activePacks
    .filter((pack) => {
      const expMs = new Date(pack.expiresAt).getTime();
      return !Number.isNaN(expMs) && expMs > nowMs && pack.remainingCoins > 0;
    })
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());

  const validBoosterBalance = activePacks.reduce(
    (sum, pack) => sum + Math.max(0, pack.remainingCoins),
    0
  );

  updated.boosterPacks = activePacks;
  updated.boosterCoinsBalance = validBoosterBalance;
  updated.boosterExpiresAt =
    activePacks.length > 0 ? activePacks[0].expiresAt : undefined;

  return updated;
}

export function isImageAiUsage(usageType: AiUsageType): boolean {
  return (
    usageType === 'image_headshot' ||
    usageType === 'image_3d_avatar' ||
    usageType === 'image_banner' ||
    usageType === 'image_logo'
  );
}

export function getQuotaSummary(rawState: SubscriptionState) {
  const state = normalizeSubscriptionState(rawState);
  const spec = SUBSCRIPTION_TIER_SPECS[state.tier];
  const dailyIncludedMax = spec.dailyIncludedCoins;
  const dailyUsed = Math.min(dailyIncludedMax, state.dailyCoinsUsed);
  const dailyRemaining = Math.max(0, dailyIncludedMax - dailyUsed);
  const boosterRemaining = Math.max(0, state.boosterCoinsBalance);
  const totalAvailableCoins = dailyRemaining + boosterRemaining;

  const todayTransactions = (state.coinHistory || []).filter((tx) =>
    tx.timestamp.startsWith(state.dailyQuotaDate)
  );
  const coinsConsumedToday = todayTransactions.reduce(
    (sum, tx) => sum + tx.coinsDeducted,
    0
  );

  const activeBoosterBatches = state.boosterPacks || [];
  const nextBoosterExpiryIso = state.boosterExpiresAt;
  const nextBoosterExpiryDateLabel = nextBoosterExpiryIso
    ? new Date(nextBoosterExpiryIso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;
  const nextBoosterDaysLeft = getDaysRemainingUntil(nextBoosterExpiryIso);

  return {
    tier: state.tier,
    spec,
    dailyIncludedMax,
    dailyLimit: dailyIncludedMax, // alias
    dailyUsed,
    dailyRemaining,
    boosterRemaining,
    totalAvailableCoins,
    coinsConsumedToday,
    totalCoinsConsumedLifetime: state.totalCoinsConsumedLifetime || 0,
    totalLifetimeUsed: state.totalCoinsConsumedLifetime || 0, // alias
    unlimitedTextAndCrmAi: spec.unlimitedTextAndCrmAi,
    billingCycleStartDate: state.billingCycleStartDate || getTodayDateStr(),
    billingCycleRenewalDate:
      state.billingCycleRenewalDate || addMonthsToDateStr(getTodayDateStr(), 1),
    isMonthlyQuotaNonCumulative: true,
    boosterValidityMonths: AI_BOOSTER_VALIDITY_MONTHS,
    activeBoosterBatches,
    nextBoosterExpiryIso,
    nextBoosterExpiryDateLabel,
    nextBoosterDaysLeft,
  };
}

export function canConsumeAiQuota(
  rawState: SubscriptionState,
  usageType: AiUsageType
): {
  allowed: boolean;
  costCoins: number;
  sourcePool?: 'daily_quota' | 'booster_pack' | 'business_unlimited_text';
  reason?: string;
} {
  const state = normalizeSubscriptionState(rawState);
  const summary = getQuotaSummary(state);

  // On Business tier, AI reasoning, text writing (Bio/Headline), and CRM support are included without spending image coins
  if (state.tier === 'business' && !isImageAiUsage(usageType)) {
    return {
      allowed: true,
      costCoins: 0,
      sourcePool: 'business_unlimited_text',
    };
  }

  // Otherwise (all AI on Free/Basic, or Image AI on Business), requires 1 AI Quota Coin
  // First consume from today's non-cumulative included daily quota before touching 3-month Booster Pack coins
  if (summary.dailyRemaining > 0) {
    return {
      allowed: true,
      costCoins: 1,
      sourcePool: 'daily_quota',
    };
  }

  if (summary.boosterRemaining > 0) {
    return {
      allowed: true,
      costCoins: 1,
      sourcePool: 'booster_pack',
    };
  }

  if (state.tier === 'free') {
    return {
      allowed: false,
      costCoins: 1,
      reason:
        'Free Tier includes 0 daily AI Quota Coins. Upgrade to Basic (5 coins/day) or Business (10 image coins/day + unlimited CRM/Text AI), or purchase a 50-Coin AI Booster Pack (valid 3 months) to use AI features.',
    };
  }

  if (state.tier === 'basic') {
    return {
      allowed: false,
      costCoins: 1,
      reason:
        'You have consumed all 5 non-cumulative Daily AI Quota Coins on your Basic plan today. Purchase a 50-Coin AI Booster Pack (valid 3 months) or upgrade to Business (10 daily image generations + unlimited text/CRM AI).',
    };
  }

  return {
    allowed: false,
    costCoins: 1,
    reason:
      'You have consumed all 10 non-cumulative Daily AI Image Generations on your Business plan today. Purchase a 50-Coin AI Booster Pack (valid 3 months) to continue generating AI images.',
  };
}

export function consumeAiQuota(
  rawState: SubscriptionState,
  usageType: AiUsageType,
  actionLabel: string
): {
  allowed: boolean;
  updated: SubscriptionState;
  updatedState: SubscriptionState;
  transaction?: AiCoinTransaction;
  reason?: string;
} {
  const state = normalizeSubscriptionState(rawState);
  const check = canConsumeAiQuota(state, usageType);

  if (!check.allowed || !check.sourcePool) {
    return {
      allowed: false,
      updated: state,
      updatedState: state,
      reason: check.reason,
    };
  }

  const tx: AiCoinTransaction = {
    id: `coin-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actionLabel,
    usageType,
    coinsDeducted: check.costCoins,
    sourcePool: check.sourcePool,
  };

  let updatedBoosterPacks = [...(state.boosterPacks || [])];
  if (check.sourcePool === 'booster_pack' && updatedBoosterPacks.length > 0) {
    // Deduct 1 coin from the earliest-expiring active 3-month booster pack (FIFO)
    updatedBoosterPacks = updatedBoosterPacks
      .map((pack, index) =>
        index === 0
          ? { ...pack, remainingCoins: Math.max(0, pack.remainingCoins - 1) }
          : pack
      )
      .filter((pack) => pack.remainingCoins > 0);
  }

  const nextBoosterBalance =
    check.sourcePool === 'booster_pack'
      ? updatedBoosterPacks.reduce((sum, p) => sum + p.remainingCoins, 0)
      : state.boosterCoinsBalance;

  const rawNextState: SubscriptionState = {
    ...state,
    dailyCoinsUsed:
      check.sourcePool === 'daily_quota'
        ? state.dailyCoinsUsed + 1
        : state.dailyCoinsUsed,
    boosterCoinsBalance: nextBoosterBalance,
    boosterPacks: updatedBoosterPacks,
    boosterExpiresAt:
      updatedBoosterPacks.length > 0 ? updatedBoosterPacks[0].expiresAt : undefined,
    totalCoinsConsumedLifetime:
      (state.totalCoinsConsumedLifetime || 0) + check.costCoins,
    coinHistory: [tx, ...(state.coinHistory || [])].slice(0, 50),
  };

  const nextState = normalizeSubscriptionState(rawNextState);

  return {
    allowed: true,
    updated: nextState,
    updatedState: nextState,
    transaction: tx,
  };
}

export function purchaseAiBoosterPack(
  rawState: SubscriptionState,
  coinsToAdd = AI_BOOSTER_PACK_SIZE
): SubscriptionState {
  const state = normalizeSubscriptionState(rawState);
  const now = new Date();
  const expiresAt = computeBoosterExpiryIso(now);

  const newBatch: AiBoosterPackBatch = {
    id: `booster-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    purchasedAt: now.toISOString(),
    expiresAt,
    initialCoins: coinsToAdd,
    remainingCoins: coinsToAdd,
  };

  const nextPacks = [...(state.boosterPacks || []), newBatch];

  return normalizeSubscriptionState({
    ...state,
    boosterPacks: nextPacks,
    boosterCoinsBalance: (state.boosterCoinsBalance || 0) + coinsToAdd,
    boosterPacksPurchasedCount: (state.boosterPacksPurchasedCount || 0) + 1,
    boosterExpiresAt: nextPacks[0].expiresAt,
  });
}
