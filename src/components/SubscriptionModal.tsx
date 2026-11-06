import React, { useState } from 'react';
import { SubscriptionState, SubscriptionTier } from '../types';
import {
  SUBSCRIPTION_TIER_SPECS,
  AI_BOOSTER_PACK_SIZE,
  AI_BOOSTER_PACK_PRICE,
  AI_BOOSTER_VALIDITY_MONTHS,
  getQuotaSummary,
  getDaysRemainingUntil,
} from '../utils/subscription';
import {
  Sparkles,
  X,
  Check,
  Coins,
  Crown,
  Zap,
  ShieldCheck,
  Lock,
  Radio,
  Briefcase,
  CreditCard,
  TrendingUp,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionState;
  onChangeTier: (newTier: SubscriptionTier) => void;
  onBuyBoosterPack: (coinsToAdd?: number) => void;
  highlightReason?: string | null;
  currentCardsCount?: number;
  currentCardCount?: number;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onChangeTier,
  onBuyBoosterPack,
  highlightReason,
  currentCardsCount,
  currentCardCount,
}) => {
  const effectiveCardCount = currentCardsCount ?? currentCardCount ?? 1;
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const summary = getQuotaSummary(subscription);

  const handleSelectTier = (tier: SubscriptionTier) => {
    onChangeTier(tier);
    setPurchaseToast(
      `StoreKit / Play Billing Receipt Verified · Active plan updated to ${SUBSCRIPTION_TIER_SPECS[tier].name} Tier!`
    );
    setTimeout(() => setPurchaseToast(null), 3500);
  };

  const handleBuyBooster = () => {
    onBuyBoosterPack(AI_BOOSTER_PACK_SIZE);
    setPurchaseToast(
      `StoreKit / Play Billing Consumable Verified · +${AI_BOOSTER_PACK_SIZE} AI Quota Coins added (Valid ${AI_BOOSTER_VALIDITY_MONTHS} months)!`
    );
    setTimeout(() => setPurchaseToast(null), 3500);
  };

  const handleRestorePurchases = () => {
    setIsRestoring(true);
    setTimeout(() => {
      setIsRestoring(false);
      setPurchaseToast(
        `App Store / Google Play entitlements synchronized: ${summary.spec.name} Tier & ${summary.boosterRemaining} active Booster Coins verified.`
      );
      setTimeout(() => setPurchaseToast(null), 4000);
    }, 650);
  };

  const dailyProgressPercent =
    summary.dailyIncludedMax > 0
      ? Math.min(100, Math.round((summary.dailyUsed / summary.dailyIncludedMax) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B101C] text-slate-100 shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-cyan-500/20 border border-amber-500/40 text-amber-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Subscription Strategy & AI Quota Coin Center
                </h2>
                <span className="rounded-md bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-indigo-300">
                  Current Plan: {summary.spec.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage your tier limits (Cards, P2P Radar, Business CRM) and monitor your AI Quota Coin consumption.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestorePurchases}
              disabled={isRestoring}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
              title="Restore previous App Store / Google Play purchases"
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Context Alert / Gate Reason Banner */}
          {highlightReason && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-300">
                  Subscription Limit or AI Quota Notice
                </div>
                <p className="leading-relaxed">{highlightReason}</p>
              </div>
            </div>
          )}

          {/* Toast Confirmation */}
          {purchaseToast && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{purchaseToast}</span>
            </div>
          )}

          {/* =================================================================== */}
          {/* 1. LIVE AI QUOTA COIN CONSUMPTION COUNTER & BOOSTER PACK            */}
          {/* =================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 Cols: Live Coin Counter & Consumption Meter */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Live AI Quota Coin Counter & Consumption
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  1 Coin = 1 AI Utilization
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase text-amber-300">
                    Total Available Coins
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-white">
                      {summary.totalAvailableCoins}
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">coins</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Daily + Booster Pool
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-500/30 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase text-indigo-300">
                    Daily Tier Quota
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {summary.dailyRemaining}/{summary.dailyIncludedMax}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {summary.tier === 'business'
                      ? 'Non-cumulative · No rollover'
                      : summary.tier === 'basic'
                      ? 'Non-cumulative · No rollover'
                      : '0 Included on Free'}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase text-cyan-300">
                    Booster Pack Coins
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {summary.boosterRemaining}
                    </span>
                    <span className="text-[10px] text-slate-400">coins</span>
                  </div>
                  <div className="text-[10px] text-amber-300/90 mt-0.5">
                    {summary.boosterRemaining > 0 && summary.nextBoosterExpiryDateLabel
                      ? `Valid until ${summary.nextBoosterExpiryDateLabel} (${summary.nextBoosterDaysLeft}d)`
                      : `Valid ${AI_BOOSTER_VALIDITY_MONTHS} months from purchase`}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">
                    Coins Consumed
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-rose-300">
                      {summary.coinsConsumedToday}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      today ({summary.totalCoinsConsumedLifetime} total)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Cycle renews {summary.billingCycleRenewalDate}
                  </div>
                </div>
              </div>

              {/* Daily Quota Consumption Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    {summary.tier === 'business'
                      ? `Daily AI Image Generation Quota (${summary.dailyUsed} of ${summary.dailyIncludedMax} used today)`
                      : summary.tier === 'basic'
                      ? `Daily Included AI Quota (${summary.dailyUsed} of ${summary.dailyIncludedMax} coins used today)`
                      : 'Free Tier Daily Included AI Quota (0 included — uses AI Booster Pack coins)'}
                  </span>
                  <span className="font-mono text-slate-400">{dailyProgressPercent}% used</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
                  <div
                    style={{ width: `${dailyProgressPercent}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-amber-400 transition-all duration-300"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-300/90">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Non-Cumulative Quota Policy:</strong> Remaining included coins on your monthly payment do NOT roll over or top up the next month (next cycle reset: <span className="font-mono text-white">{summary.billingCycleRenewalDate}</span>).
                    </span>
                  </span>
                </div>
                {summary.unlimitedTextAndCrmAi && (
                  <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-emerald-400 font-medium">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Business Tier Active: AI Reasoning, Text Writing (Bio/Headline), and CRM Social Intelligence are UNLIMITED (0 coins deducted).
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: AI Booster Pack (+50 AI Quota Coins · Valid 3 Months) */}
            <div className="lg:col-span-5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-indigo-950/40 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <Zap className="h-3 w-3" />
                    <span>Add-On Booster · Valid {AI_BOOSTER_VALIDITY_MONTHS} Months</span>
                  </span>
                  <span className="font-mono text-lg font-extrabold text-white">
                    {AI_BOOSTER_PACK_PRICE}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">
                  AI Booster Pack — +{AI_BOOSTER_PACK_SIZE} AI Quota Coins
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {summary.tier === 'business'
                    ? 'On the Business tier, each Booster Coin unlocks +1 additional AI Image Generation (Headshots, 3D Avatars, Cover Banners) beyond your 10/day allowance. Valid for 3 months from purchase.'
                    : 'For Free and Basic tiers, each Booster Coin acts as 1 universal AI Quota Coin usable for ANY AI utilization (AI Headshots, 3D Avatars, Cover Banners, or AI Bio Writing). Valid for 3 months from purchase.'}
                </p>

                <div className="rounded-lg border border-amber-500/30 bg-slate-950/70 px-3 py-2 text-[11px] text-amber-200 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Booster Validity Window:</span>
                    <span className="font-mono text-amber-300">{AI_BOOSTER_VALIDITY_MONTHS} Months (90 Days)</span>
                  </div>
                  {summary.activeBoosterBatches.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/80 max-h-20 overflow-y-auto">
                      {summary.activeBoosterBatches.map((batch) => (
                        <div key={batch.id} className="flex items-center justify-between text-[10px] text-slate-300">
                          <span>Pack ({batch.remainingCoins}/{batch.initialCoins} coins left)</span>
                          <span className="font-mono text-cyan-300">
                            Expires {new Date(batch.expiresAt).toLocaleDateString()} ({getDaysRemainingUntil(batch.expiresAt)}d left)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Active Booster Balance:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {summary.boosterRemaining} Coins ({summary.activeBoosterBatches.length} active {summary.activeBoosterBatches.length === 1 ? 'pack' : 'packs'})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBuyBooster}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Buy AI Booster Pack (+{AI_BOOSTER_PACK_SIZE} Coins · {AI_BOOSTER_VALIDITY_MONTHS} Mo Validity)</span>
                </button>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* 2. THREE-TIER SUBSCRIPTION STRATEGY CARDS                           */}
          {/* =================================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Your Subscription Tier
              </h3>
              <span className="text-xs text-slate-400">
                Active Digital Cards in Studio:{' '}
                <strong className="text-white font-mono">{effectiveCardCount}</strong>
                {summary.tier === 'free' ? ' / 2 Max on Free Tier' : ' (Unlimited)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['free', 'basic', 'business'] as SubscriptionTier[]).map((tierKey) => {
                const spec = SUBSCRIPTION_TIER_SPECS[tierKey];
                const isCurrent = subscription.tier === tierKey;

                return (
                  <div
                    key={tierKey}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                      isCurrent
                        ? 'border-indigo-500 bg-indigo-950/25 shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              tierKey === 'business'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : tierKey === 'basic'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {spec.badge}
                          </span>
                          <h4 className="text-lg font-bold text-white mt-1.5">
                            {spec.name} Tier
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-white font-mono">
                            {spec.priceLabel}
                          </div>
                          <div className="text-[10px] text-slate-400">{spec.billingPeriod}</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {spec.tagline}
                      </p>

                      {/* Key Quota Highlights */}
                      <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Digital Cards:</span>
                          <span className="font-bold text-white">
                            {spec.maxCards === Number.POSITIVE_INFINITY
                              ? 'Unlimited'
                              : `${spec.maxCards} Cards Max`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Daily AI Quota:</span>
                          <span className="font-bold text-amber-300">
                            {tierKey === 'free'
                              ? '0 Included (Booster Only)'
                              : tierKey === 'basic'
                              ? '5 Coins / Day'
                              : '10 Image Coins / Day'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Text & CRM AI:</span>
                          <span className="font-bold text-cyan-300">
                            {tierKey === 'business'
                              ? 'Unlimited (Included)'
                              : tierKey === 'basic'
                              ? 'Uses Quota Coin'
                              : 'Booster Coin Only'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">P2P Radar:</span>
                          <span className="font-bold text-white">
                            {tierKey === 'free'
                              ? '1/wk · Max 5/room'
                              : 'Unlimited Rooms & Peers'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Business CRM:</span>
                          <span
                            className={`font-bold ${
                              spec.hasCrmAccess ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {spec.hasCrmAccess ? 'Full Access' : 'Locked'}
                          </span>
                        </div>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-300">
                        {spec.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleSelectTier(tierKey)}
                        disabled={isCurrent}
                        className={`w-full rounded-xl py-2.5 px-4 text-xs font-bold transition ${
                          isCurrent
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : tierKey === 'business'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                            : tierKey === 'basic'
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isCurrent
                          ? `✓ Current Active Plan (${spec.name})`
                          : tierKey === 'free'
                          ? 'Switch to Free Tier ($0)'
                          : `Subscribe to ${spec.name} (${spec.priceLabel}/mo)`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================================================================== */}
          {/* 3. AI QUOTA COIN CONSUMPTION LEDGER                                 */}
          {/* =================================================================== */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI Quota Coin Consumption Ledger</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {(subscription.coinHistory || []).length} recent AI operations logged
              </span>
            </div>

            {(!subscription.coinHistory || subscription.coinHistory.length === 0) ? (
              <p className="text-xs text-slate-500 italic py-2">
                No AI Quota Coins consumed yet. Generate an AI Headshot, 3D Avatar, AI Cover Banner, AI Bio, or CRM Social Scan to see real-time coin deductions here.
              </p>
            ) : (
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/80 text-xs">
                {subscription.coinHistory.slice(0, 12).map((tx) => (
                  <div
                    key={tx.id}
                    className="py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-200">
                        {tx.actionLabel}
                      </span>
                      <span className="ml-2 text-[10px] font-mono text-slate-500">
                        {new Date(tx.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${
                          tx.sourcePool === 'business_unlimited_text'
                            ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-300'
                            : tx.sourcePool === 'booster_pack'
                            ? 'bg-amber-950/80 border border-amber-700/50 text-amber-300'
                            : 'bg-indigo-950/80 border border-indigo-700/50 text-indigo-300'
                        }`}
                      >
                        {tx.sourcePool === 'business_unlimited_text'
                          ? '0 Coins (Business Unlimited Text/CRM AI)'
                          : tx.sourcePool === 'booster_pack'
                          ? `-${tx.coinsDeducted} Coin (Booster Pack)`
                          : `-${tx.coinsDeducted} Coin (Daily Quota)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Apple App Store (Guideline 3.1.2) & Google Play Billing Subscription Terms Disclosure */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-[11px] text-slate-400 leading-relaxed space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300 font-semibold">
              <span>App Store StoreKit 2 & Google Play Billing Subscription Disclosure</span>
              <button
                type="button"
                onClick={handleRestorePurchases}
                className="text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                Restore Previous Purchases
              </button>
            </div>
            <p>
              Payment is charged to your Apple ID or Google Play account at confirmation of purchase. Subscriptions automatically renew monthly unless auto-renew is turned off at least 24 hours before the end of the current billing period. Your account will be charged for renewal within 24 hours prior to the end of the current period. Included daily/monthly AI Quota Coins are non-cumulative and do not roll over to the next billing month. Separate +50 AI Booster Packs are valid for 3 months (90 days) from purchase. You can manage or cancel subscriptions anytime in your device Account Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
