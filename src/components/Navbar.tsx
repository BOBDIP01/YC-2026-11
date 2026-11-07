import React from 'react';
import { MasterProfile, DigitalCard, AppNavTab, SubscriptionState } from '../types';
import { getQuotaSummary } from '../utils/subscription';
import {
  QrCode,
  ShieldCheck,
  CreditCard,
  Radio,
  BookOpen,
  Briefcase,
  Settings,
  Coins,
  Lock,
  UserPlus,
} from 'lucide-react';

interface NavbarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  profile: MasterProfile;
  activeCard: DigitalCard;
  onShareClick: () => void;
  onSelectPersona: (id: string) => void;
  allPersonas: MasterProfile[];
  onCreatePersonaClick?: () => void;
  subscription: SubscriptionState;
  onOpenSubscriptionModal: (reason?: string) => void;
  onOpenAuthModal?: (mode?: 'signin' | 'signon') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onShareClick,
  subscription,
  onOpenSubscriptionModal,
  onOpenAuthModal,
}) => {
  const isKycVerified = Boolean(
    profile.isVerified &&
      profile.kycVerification?.isCompleted &&
      profile.kycVerification?.traceabilityId
  );

  const summary = getQuotaSummary(subscription);

  const navItems: {
    id: AppNavTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    title: string;
    locked?: boolean;
  }[] = [
    {
      id: 'studio',
      label: 'Card Hub',
      shortLabel: 'Card Hub',
      icon: <CreditCard className="h-4 w-4 md:h-3.5 md:w-3.5" />,
      title: 'Manage your own identity and digital business cards',
    },
    {
      id: 'radar',
      label: 'P2P Radar',
      shortLabel: 'Radar',
      icon: <Radio className="h-4 w-4 md:h-3.5 md:w-3.5 text-cyan-400" />,
      title:
        summary.tier === 'free'
          ? 'P2P Radar (Free tier: 1 session/week, max 5 participants per room)'
          : 'Discover and exchange cards with nearby peers (Unlimited)',
    },
    {
      id: 'rubrica',
      label: 'Contacts',
      shortLabel: 'Contacts',
      icon: <BookOpen className="h-4 w-4 md:h-3.5 md:w-3.5 text-indigo-400" />,
      title: 'Personal, family, and club contacts address book',
    },
    {
      id: 'crm',
      label: 'Business CRM',
      shortLabel: 'CRM',
      icon: <Briefcase className="h-4 w-4 md:h-3.5 md:w-3.5 text-emerald-400" />,
      title: summary.spec.hasCrmAccess
        ? 'Business leads, deal pipeline, and contextual outreach'
        : 'Requires Business Tier Subscription',
      locked: !summary.spec.hasCrmAccess,
    },
    {
      id: 'settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: <Settings className="h-4 w-4 md:h-3.5 md:w-3.5" />,
      title: 'Privacy, KYC verification, subscription & system settings',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl pt-safe">
        <div className="mx-auto flex h-13 sm:h-15 w-full max-w-[1720px] items-center justify-between px-3 sm:px-6 lg:px-8 xl:px-10 gap-2">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md shadow-indigo-500/20">
              <span className="font-bold tracking-tight text-sm sm:text-lg">Y</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-lg font-bold tracking-tight text-white">
                YouConnect
              </span>
              {isKycVerified && (
                <span
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-400"
                  title={`KYC Verified Identity · ${profile.kycVerification?.traceabilityId}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Verified</span>
                </span>
              )}
            </div>
          </div>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap rounded-lg ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-inner font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title={item.title}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.locked && (
                    <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: New User / Sign On + AI Quota Coin Counter + Share Card Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => onOpenAuthModal('signon')}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/60 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition shadow-sm"
                title="Sign On (New User Registration) or Sign In"
              >
                <UserPlus className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Sign On</span>
              </button>
            )}

            {/* Interactive AI Quota Coin Counter & Tier Badge */}
            <button
              type="button"
              onClick={() => onOpenSubscriptionModal()}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-500/40 bg-slate-900/95 hover:bg-slate-800 px-2 sm:px-3 py-1.5 text-xs transition shadow-sm group"
              title="Click to open Subscription Tiers, AI Booster Pack (+50 Coins) & Coin Consumption Ledger"
            >
              <span
                className={`hidden xs:inline-block rounded px-1.5 py-0.5 text-[9px] font-mono font-extrabold uppercase tracking-wider ${
                  summary.tier === 'business'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : summary.tier === 'basic'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {summary.spec.name}
              </span>

              <div className="flex items-center gap-1 text-amber-300 font-mono font-bold">
                <Coins className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>{summary.totalAvailableCoins}</span>
                <span className="hidden lg:inline text-[10px] font-normal text-slate-300">
                  Coins
                </span>
              </div>

              {summary.boosterRemaining > 0 && (
                <span className="hidden xl:inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-mono text-amber-300">
                  +{summary.boosterRemaining} Boost
                </span>
              )}

              <span
                className="hidden sm:inline-flex items-center rounded bg-slate-950 border border-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400"
                title="AI Quota Coins consumed today"
              >
                Used: {summary.coinsConsumedToday}
              </span>
            </button>

            <button
              onClick={onShareClick}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-95 whitespace-nowrap"
              title="Share Active Digital Card"
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Share Card</span>
            </button>
          </div>
        </div>
      </header>

      {/* Native Mobile / Portable Device Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 gap-1 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)] border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-xl shadow-[0_-10px_28px_rgba(0,0,0,0.65)]"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-[10px] font-medium transition-all min-w-0 min-h-[48px] active:scale-95 ${
                isActive
                  ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={item.title}
            >
              {isActive && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-indigo-400" />
              )}
              <div className="relative flex items-center">
                {item.icon}
                {item.locked && (
                  <Lock className="h-2.5 w-2.5 text-amber-400 ml-0.5" />
                )}
              </div>
              <span className="truncate w-full text-center leading-none">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

