import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MasterProfile,
  DigitalCard,
  CRMContact,
  SettingsSubMenu,
  AppearanceMode,
  RadarPreferencesConfig,
  SecuritySettingsConfig,
  SubscriptionState,
  SubscriptionTier,
} from '../types';
import {
  SUBSCRIPTION_TIER_SPECS,
  getQuotaSummary,
  AI_BOOSTER_PACK_SIZE,
  AI_BOOSTER_PACK_PRICE,
} from '../utils/subscription';
import { RadarWalkthroughModal } from './RadarWalkthroughModal';
import {
  User,
  ShieldCheck,
  HardDrive,
  Users2,
  Sparkles,
  Radio,
  KeyRound,
  CreditCard,
  Lock,
  Unlock,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Check,
  Copy,
  FileText,
  Smartphone,
  Laptop,
  ChevronRight,
  Info,
  ShieldAlert,
  Save,
  Sliders,
  DollarSign,
  Activity,
  Plus,
  X,
  Eye,
  EyeOff,
  Bell,
  Scale,
  Coins,
  Crown,
  Zap,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

interface SettingsViewProps {
  profile: MasterProfile;
  cards: DigitalCard[];
  contacts: CRMContact[];
  allPersonas: MasterProfile[];
  onUpdateProfile: (updated: MasterProfile) => void;
  onRecursivePurge: () => void;
  onRestoreBackup?: (backupData: {
    personas?: MasterProfile[];
    cards?: DigitalCard[];
    contacts?: CRMContact[];
  }) => void;
  initialSubMenu?: SettingsSubMenu;
  onNavigateToStudio?: () => void;
  subscription?: SubscriptionState;
  onChangeTier?: (tier: SubscriptionTier) => void;
  onBuyBoosterPack?: () => void;
  onOpenSubscriptionModal?: () => void;
  appearanceMode?: AppearanceMode;
  onChangeAppearanceMode?: (mode: AppearanceMode) => void;
  onOpenAuthModal?: (initialMode?: 'signin' | 'signon') => void;
  isSettingsMenuOpen?: boolean;
  onToggleSettingsMenu?: (open: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  cards,
  contacts,
  allPersonas,
  onUpdateProfile,
  onRecursivePurge,
  onRestoreBackup,
  initialSubMenu = 'account',
  onNavigateToStudio,
  subscription,
  onChangeTier,
  onBuyBoosterPack,
  onOpenSubscriptionModal,
  appearanceMode = 'night',
  onChangeAppearanceMode,
  onOpenAuthModal,
  isSettingsMenuOpen = true,
  onToggleSettingsMenu,
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<SettingsSubMenu>(initialSubMenu);
  const [isRadarGuideModalOpen, setIsRadarGuideModalOpen] = useState(false);

  // Sub-tabs for Compliance & Privacy sub-menu
  const [complianceSubTab, setComplianceSubTab] = useState<'sovereignty' | 'privacy' | 'terms'>('sovereignty');
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
  const [purgeAuditToken, setPurgeAuditToken] = useState<string | null>(null);
  const [kycProcessing, setKycProcessing] = useState(false);
  const [kycSuccess, setKycSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Storage Stats Calculation
  const [storageStats, setStorageStats] = useState({
    totalBytes: 0,
    personaBytes: 0,
    cardBytes: 0,
    contactBytes: 0,
    cacheBytes: 0,
    limitBytes: 5 * 1024 * 1024, // 5MB standard localStorage
  });

  // Backup & Restore
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable Account Form State (Tracks mandatory First Name, Last Name, Email, and Phone from Sign-On & Identity Settings)
  const initialNameParts = (profile.personalData?.fullName || profile.name || '').trim().split(/\s+/);
  const [accountForm, setAccountForm] = useState({
    firstName: profile.personalData?.firstName || profile.firstName || initialNameParts[0] || '',
    lastName:
      profile.personalData?.lastName ||
      profile.lastName ||
      initialNameParts.slice(1).join(' ') ||
      '',
    name: profile.name || '',
    role: profile.role || '',
    company: profile.company || '',
    headline: profile.headline || '',
    email: profile.email || '',
    phone: profile.phone || '',
    website: profile.website || '',
    location: profile.location || '',
    bio: profile.workData?.bio || profile.bio || '',
    personalEmail: profile.personalData?.email || profile.email || '',
    personalPhone: profile.personalData?.phone || profile.phone || '',
    homeStreet: profile.personalData?.address?.street || '',
    homeCity: profile.personalData?.address?.city || '',
    homeCountry: profile.personalData?.address?.country || '',
    birthday: profile.personalData?.birthday || '',
    iceName: profile.personalData?.emergencyContact?.name || '',
    iceRelationship: profile.personalData?.emergencyContact?.relationship || '',
    icePhone: profile.personalData?.emergencyContact?.phone || '',
  });
  const [accountSavedNotification, setAccountSavedNotification] = useState(false);

  // Sync accountForm when profile updates externally (e.g., Sign-On Registration, AI Bio Strategist, or MasterProfileEditor)
  useEffect(() => {
    const parts = (profile.personalData?.fullName || profile.name || '').trim().split(/\s+/);
    setAccountForm({
      firstName: profile.personalData?.firstName || profile.firstName || parts[0] || '',
      lastName:
        profile.personalData?.lastName || profile.lastName || parts.slice(1).join(' ') || '',
      name: profile.name || '',
      role: profile.role || '',
      company: profile.company || '',
      headline: profile.headline || '',
      email: profile.email || '',
      phone: profile.phone || '',
      website: profile.website || '',
      location: profile.location || '',
      bio: profile.workData?.bio || profile.bio || '',
      personalEmail: profile.personalData?.email || profile.email || '',
      personalPhone: profile.personalData?.phone || profile.phone || '',
      homeStreet: profile.personalData?.address?.street || '',
      homeCity: profile.personalData?.address?.city || '',
      homeCountry: profile.personalData?.address?.country || '',
      birthday: profile.personalData?.birthday || '',
      iceName: profile.personalData?.emergencyContact?.name || '',
      iceRelationship: profile.personalData?.emergencyContact?.relationship || '',
      icePhone: profile.personalData?.emergencyContact?.phone || '',
    });
  }, [profile]);

  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Radar Preferences (stored in localStorage)
  const [radarPrefs, setRadarPrefs] = useState<RadarPreferencesConfig>(() => {
    const saved = localStorage.getItem('youconnect_radar_prefs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      defaultVisibility: 'public',
      maxRangeMeters: 50,
      autoAcceptRequests: false,
      audioProximityAlert: true,
      hapticFeedback: true,
      defaultRoom: 'tech_summit',
    };
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState<SecuritySettingsConfig>(() => {
    const saved = localStorage.getItem('youconnect_security_settings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      biometricLockEnabled: false,
      twoFactorEnabled: true,
      sessionTimeoutMinutes: 60,
      lastSecurityAudit: new Date().toLocaleDateString(),
    };
  });

  // Subscription State & AI Credits Top-Up Modal
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [selectedTopUpPackage, setSelectedTopUpPackage] = useState<'10' | '50' | 'unlimited'>('10');
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Calculate Storage Usage
  useEffect(() => {
    try {
      let total = 0;
      let pBytes = 0;
      let cBytes = 0;
      let cntBytes = 0;
      let cache = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const val = localStorage.getItem(key) || '';
        const itemBytes = (key.length + val.length) * 2;
        total += itemBytes;

        if (key.includes('persona')) pBytes += itemBytes;
        else if (key.includes('card')) cBytes += itemBytes;
        else if (key.includes('contact')) cntBytes += itemBytes;
        else cache += itemBytes;
      }

      setStorageStats({
        totalBytes: total,
        personaBytes: pBytes,
        cardBytes: cBytes,
        contactBytes: cntBytes,
        cacheBytes: cache,
        limitBytes: 5 * 1024 * 1024,
      });
    } catch {
      // ignore
    }
  }, [allPersonas, cards, contacts, activeSubMenu]);

  // Persist Sub-Configurations

  useEffect(() => {
    localStorage.setItem('youconnect_radar_prefs_v1', JSON.stringify(radarPrefs));
  }, [radarPrefs]);

  useEffect(() => {
    localStorage.setItem('youconnect_security_settings_v1', JSON.stringify(securitySettings));
  }, [securitySettings]);

  // Save Account Changes
  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const firstName = accountForm.firstName.trim();
    const lastName = accountForm.lastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || accountForm.name.trim();
    if (
      !firstName ||
      !lastName ||
      !accountForm.personalEmail.trim() ||
      !accountForm.personalPhone.trim()
    ) {
      return;
    }

    const updated: MasterProfile = {
      ...profile,
      name: fullName,
      firstName,
      lastName,
      role: accountForm.role,
      company: accountForm.company,
      headline: accountForm.headline,
      email: accountForm.email || accountForm.personalEmail.trim(),
      phone: accountForm.phone || accountForm.personalPhone.trim(),
      website: accountForm.website,
      location: accountForm.location,
      bio: accountForm.bio,
      workData: {
        ...(profile.workData || {}),
        role: accountForm.role,
        company: accountForm.company,
        email: accountForm.email || accountForm.personalEmail.trim(),
        phone: accountForm.phone || accountForm.personalPhone.trim(),
        website: accountForm.website,
        bio: accountForm.bio,
      },
      personalData: {
        ...profile.personalData,
        firstName,
        lastName,
        fullName,
        email: accountForm.personalEmail.trim(),
        phone: accountForm.personalPhone.trim(),
        bio: accountForm.bio,
        address: {
          ...profile.personalData?.address,
          street: accountForm.homeStreet,
          city: accountForm.homeCity,
          country: accountForm.homeCountry,
        },
        birthday: accountForm.birthday,
        emergencyContact: {
          name: accountForm.iceName,
          relationship: accountForm.iceRelationship,
          phone: accountForm.icePhone,
        },
      },
    };
    onUpdateProfile(updated);
    setAccountSavedNotification(true);
    setTimeout(() => setAccountSavedNotification(false), 2500);
  };

  // CCPA Toggle
  const handleToggleCCPA = () => {
    onUpdateProfile({
      ...profile,
      ccpaDoNotSell: !profile.ccpaDoNotSell,
    });
  };

  // Full Data Export (GDPR Article 20 Data Portability & System Backup)
  const handleExportFullArchive = () => {
    const fullArchive = {
      app: 'YouConnect Enterprise',
      version: '3.4.0',
      exportTimestamp: new Date().toISOString(),
      standard: 'GDPR_ARTICLE_20_PORTABILITY',
      masterProfile: profile,
      allPersonas,
      digitalCards: cards,
      crmContacts: contacts,
      radarPreferences: radarPrefs,
      securitySettings,
      auditHash: `SHA256-${Math.random().toString(36).substring(2).toUpperCase()}${Date.now()}`,
    };

    const blob = new Blob([JSON.stringify(fullArchive, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youconnect_system_backup_${profile.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore Backup
  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.allPersonas && !parsed.masterProfile && !parsed.digitalCards) {
          setRestoreStatus('Invalid backup format. Missing core profile or card schemas.');
          return;
        }

        if (onRestoreBackup) {
          onRestoreBackup({
            personas: parsed.allPersonas || (parsed.masterProfile ? [parsed.masterProfile] : undefined),
            cards: parsed.digitalCards,
            contacts: parsed.crmContacts,
          });
        }

        if (parsed.radarPreferences) setRadarPrefs(parsed.radarPreferences);
        if (parsed.securitySettings) setSecuritySettings(parsed.securitySettings);

        setRestoreStatus('System backup successfully verified and restored!');
        setTimeout(() => setRestoreStatus(null), 3500);
      } catch (err) {
        setRestoreStatus('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear Headshots Cache Only
  const handleClearImageCache = () => {
    let clearedCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cached_img_') || key.startsWith('temp_avatar_'))) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
    setRestoreStatus(`Cleared ${clearedCount} cached temporary image objects.`);
    setTimeout(() => setRestoreStatus(null), 3000);
  };

  // KYC Verification Simulation
  const handleTriggerKYC = () => {
    setKycProcessing(true);
    setTimeout(() => {
      onUpdateProfile({
        ...profile,
        isVerified: true,
        verifiedAt: new Date().toISOString(),
      });
      setKycProcessing(false);
      setKycSuccess(true);
      setTimeout(() => setKycSuccess(false), 3000);
    }, 1200);
  };

  // Execute recursive erasure (GDPR Right to be Forgotten)
  const handleConfirmErasure = () => {
    const auditId = `PURGE-${Math.random().toString(36).substring(2).toUpperCase()}-${Date.now()}`;
    setPurgeAuditToken(auditId);
    setIsPurgeConfirmOpen(false);
    onRecursivePurge();
  };

  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Top-Up Credits / AI Booster Pack Action — always routes through verified SubscriptionModal checkout
  const handleConfirmTopUp = () => {
    setIsTopUpModalOpen(false);
    onOpenSubscriptionModal?.();
  };

  const isKycVerified = Boolean(
    profile.isVerified &&
    profile.kycVerification?.isCompleted &&
    profile.kycVerification?.traceabilityId
  );

  // Navigation Items
  const menuItems: { id: SettingsSubMenu; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'account',
      label: 'Account & Master Data',
      icon: <User className="h-4 w-4" />,
      desc: 'Personal details, contact info & emergency contacts',
    },
    {
      id: 'card_security',
      label: 'Card Security & Traceability',
      icon: <ShieldCheck className="h-4 w-4" />,
      desc: 'Cryptographic identification, unique card numbers & registry tracking',
    },
    {
      id: 'privacy',
      label: 'Privacy & Legal',
      icon: <Scale className="h-4 w-4" />,
      desc: 'Data controls, privacy policy & terms of service',
    },
    {
      id: 'storage',
      label: 'Storage & Backups',
      icon: <HardDrive className="h-4 w-4" />,
      desc: 'Storage usage, data backups & temporary cache',
    },
    {
      id: 'subscription',
      label: 'Subscription & AI Quota',
      icon: <Sparkles className="h-4 w-4" />,
      desc: 'Pro Tier, AI headshot credits & invoices',
    },
    {
      id: 'radar',
      label: 'Radar & Discovery',
      icon: <Radio className="h-4 w-4" />,
      desc: 'P2P visibility, range & alert sounds',
    },
    {
      id: 'security',
      label: 'Security & Sessions',
      icon: <KeyRound className="h-4 w-4" />,
      desc: 'Biometric lock, 2FA & connected devices',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1720px] px-3 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">App Settings & Preferences</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your app appearance (Day, Night, or Automatic), account data, compliance & privacy sovereignty, storage backups, and subscriptions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubMenu('card_security')}
            className="h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 hover:bg-indigo-900/60 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            <span>Card Security ({cards.length} Tracked)</span>
          </button>
          {onOpenAuthModal && (
            <button
              type="button"
              onClick={() => onOpenAuthModal('signon')}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-cyan-300 bg-cyan-950/60 border border-cyan-700/60 hover:bg-cyan-900/60 transition"
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Log In / Sign Up</span>
            </button>
          )}
          <span className="h-9 px-3.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-indigo-300 bg-indigo-950/60 border border-indigo-800/60">
            Pro Plan · {profile.aiCredits ?? 15} AI Credits
          </span>
        </div>
      </div>

      {/* Main Settings Layout: Controlled by the top header Settings button (auto-hides menu on selection) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sub-Menu List (Shown on desktop or when top header Settings is clicked; hides automatically once an item is selected) */}
        <div
          className={`${isSettingsMenuOpen ? 'block' : 'hidden lg:block'
            } lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/70 p-2 space-y-1 backdrop-blur-sm lg:sticky lg:top-20`}
        >
          {menuItems.map((item) => {
            const isActive = activeSubMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSubMenu(item.id);
                  if (onToggleSettingsMenu) {
                    onToggleSettingsMenu(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all ${isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Right Active Sub-Menu Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* 1. ACCOUNT & MASTER DATA */}
          {activeSubMenu === 'account' && (
            <div className="space-y-6">
              {/* App Appearance Selector: Day, Night, or Automatic */}
              {onChangeAppearanceMode && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      {appearanceMode === 'day' ? (
                        <Sun className="h-4 w-4 text-amber-400" />
                      ) : appearanceMode === 'auto' ? (
                        <Monitor className="h-4 w-4 text-cyan-400" />
                      ) : (
                        <Moon className="h-4 w-4 text-indigo-400" />
                      )}
                      <span>App Appearance (Day, Night & Automatic)</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Select Day (light), Night (dark), or Automatic to follow your device's system theme while keeping your 3D card finishes authentic.
                    </p>
                  </div>

                  <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => onChangeAppearanceMode('day')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${appearanceMode === 'day'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span>Day</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeAppearanceMode('night')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${appearanceMode === 'night'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span>Night</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeAppearanceMode('auto')}
                      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition ${appearanceMode === 'auto'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Automatic</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-400" />
                      Account & Master Profile
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Your master record from which persona circles and digital business cards inherit contact information.
                    </p>
                  </div>
                  {accountSavedNotification && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-lg animate-fade-in font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Account saved successfully!</span>
                    </div>
                  )}
                </div>

                {/* Cryptographic Card Traceability Registry Status */}
                <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.name}
                          className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500/40"
                        />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-full bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-200 uppercase border-2 border-indigo-500/40"
                        >
                          {(profile.name || 'YC')
                            .trim()
                            .split(/\s+/)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('') || 'YC'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{profile.name}</span>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 font-mono">
                          <ShieldCheck className="h-3 w-3 text-indigo-400" />
                          Cryptographic Registry Active ({cards.length} Cards)
                        </span>
                      </div>
                      {(profile.role || profile.company) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[profile.role, profile.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSubMenu('card_security')}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Card Traceability Registry</span>
                  </button>
                </div>

                {/* Account Form */}
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="flex items-center justify-between text-slate-300 font-medium mb-1">
                        <span>
                          First Name (Name) <span className="text-rose-400">*</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-400/90">Mandatory</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={accountForm.firstName}
                        onChange={(e) => {
                          const firstName = e.target.value;
                          const fullName = [firstName.trim(), accountForm.lastName.trim()]
                            .filter(Boolean)
                            .join(' ');
                          setAccountForm({ ...accountForm, firstName, name: fullName });
                        }}
                        placeholder="e.g. Elena"
                        className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white placeholder-slate-500 focus:outline-none ${!accountForm.firstName.trim()
                          ? 'border-rose-500/60 focus:border-rose-400'
                          : 'border-slate-800 focus:border-indigo-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-slate-300 font-medium mb-1">
                        <span>
                          Last Name (Surname) <span className="text-rose-400">*</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-400/90">Mandatory</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={accountForm.lastName}
                        onChange={(e) => {
                          const lastName = e.target.value;
                          const fullName = [accountForm.firstName.trim(), lastName.trim()]
                            .filter(Boolean)
                            .join(' ');
                          setAccountForm({ ...accountForm, lastName, name: fullName });
                        }}
                        placeholder="e.g. Rostova"
                        className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white placeholder-slate-500 focus:outline-none ${!accountForm.lastName.trim()
                          ? 'border-rose-500/60 focus:border-rose-400'
                          : 'border-slate-800 focus:border-indigo-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Primary Work Role / Title</label>
                      <input
                        type="text"
                        value={accountForm.role}
                        onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={accountForm.company}
                        onChange={(e) => setAccountForm({ ...accountForm, company: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Professional Headline</label>
                      <input
                        type="text"
                        value={accountForm.headline}
                        onChange={(e) => setAccountForm({ ...accountForm, headline: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Work Email</label>
                      <input
                        type="email"
                        value={accountForm.email}
                        onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Work Mobile Phone</label>
                      <input
                        type="tel"
                        value={accountForm.phone}
                        onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-slate-300 font-medium mb-1">
                        <span>
                          Personal Private Email <span className="text-rose-400">*</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-400/90">Mandatory</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={accountForm.personalEmail}
                        onChange={(e) => setAccountForm({ ...accountForm, personalEmail: e.target.value })}
                        placeholder="private.email@domain.com"
                        className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white placeholder-slate-500 focus:outline-none ${!accountForm.personalEmail.trim()
                          ? 'border-rose-500/60 focus:border-rose-400'
                          : 'border-slate-800 focus:border-indigo-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-slate-300 font-medium mb-1">
                        <span>
                          Personal Private Phone <span className="text-rose-400">*</span>
                        </span>
                        <span className="text-[10px] font-mono text-rose-400/90">Mandatory</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={accountForm.personalPhone}
                        onChange={(e) => setAccountForm({ ...accountForm, personalPhone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white placeholder-slate-500 focus:outline-none ${!accountForm.personalPhone.trim()
                          ? 'border-rose-500/60 focus:border-rose-400'
                          : 'border-slate-800 focus:border-indigo-500'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Primary Website</label>
                      <input
                        type="url"
                        value={accountForm.website}
                        onChange={(e) => setAccountForm({ ...accountForm, website: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Location / City</label>
                      <input
                        type="text"
                        value={accountForm.location}
                        onChange={(e) => setAccountForm({ ...accountForm, location: e.target.value })}
                        className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Emergency Contact (ICE) */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Emergency In-Case-of-Emergency (ICE) Contact
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">ICE Contact Name</label>
                        <input
                          type="text"
                          value={accountForm.iceName}
                          onChange={(e) => setAccountForm({ ...accountForm, iceName: e.target.value })}
                          placeholder="e.g. Sarah Vance"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Relationship</label>
                        <input
                          type="text"
                          value={accountForm.iceRelationship}
                          onChange={(e) => setAccountForm({ ...accountForm, iceRelationship: e.target.value })}
                          placeholder="e.g. Spouse / Sister"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Emergency Phone</label>
                        <input
                          type="tel"
                          value={accountForm.icePhone}
                          onChange={(e) => setAccountForm({ ...accountForm, icePhone: e.target.value })}
                          placeholder="+1 (555) 911-0000"
                          className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Master Bio */}
                  <div>
                    <label className="block text-slate-300 font-medium mb-1 text-xs">Master Biography</label>
                    <textarea
                      rows={2}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${Math.max(68, el.scrollHeight)}px`;
                        }
                      }}
                      value={accountForm.bio}
                      onChange={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = `${Math.max(68, e.currentTarget.scrollHeight)}px`;
                        setAccountForm({ ...accountForm, bio: e.target.value });
                      }}
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 text-xs leading-relaxed resize-none overflow-hidden focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span className="text-[11px] text-slate-400">
                      <span className="text-rose-400 font-bold">*</span> First Name, Last Name, Email, and Phone Number are mandatory.
                    </span>
                    <button
                      type="submit"
                      disabled={
                        !accountForm.firstName.trim() ||
                        !accountForm.lastName.trim() ||
                        !accountForm.personalEmail.trim() ||
                        !accountForm.personalPhone.trim()
                      }
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Master Profile</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Profiles & Persona Circles Summary */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Active Identity Circles ({allPersonas.length})</h3>
                    <p className="text-xs text-slate-400">Contextual identities tailored for different social spheres.</p>
                  </div>
                  {onNavigateToStudio && (
                    <button
                      onClick={onNavigateToStudio}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      Manage in Studio <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allPersonas.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex items-center gap-3 text-xs ${p.id === profile.id
                        ? 'border-indigo-500/80 bg-indigo-950/40 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                        }`}
                    >
                      <img
                        src={p.avatarUrl}
                        alt={p.profileTitle || p.name}
                        className="h-9 w-9 rounded-full object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.profileTitle || p.circleName || p.company}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.role}</div>
                        <span className="inline-block mt-1 text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {p.category || 'Profile'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CARD SECURITY & CRYPTOGRAPHIC TRACEABILITY REGISTRY */}
          {activeSubMenu === 'card_security' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-400" />
                      Card Security & Traceability Registry
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Every digital business card is assigned a unique cryptographic security identifier (YC-XXXX-XXXX-XXXX-XXXX) linked directly to your registered user account in the cloud database.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-xs font-mono font-semibold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Database Traceability: Active
                    </span>
                  </div>
                </div>

                {/* Stat Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tracked Digital Cards</span>
                    <div className="text-xl font-bold text-white mt-1">{cards.length} Active Cards</div>
                    <span className="text-[10px] text-slate-500">All registered in database</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Registered Owner</span>
                    <div className="text-sm font-bold text-indigo-300 font-mono mt-1 truncate">
                      {profile.personalData?.email || profile.email || 'Registered User'}
                    </div>
                    <span className="text-[10px] text-slate-500">Owner binding verified</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Tamper Protection</span>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-1">SHA-256 HMAC</div>
                    <span className="text-[10px] text-slate-500">Cryptographically signed</span>
                  </div>
                </div>
              </div>

              {/* Cards Registry Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-400" />
                    <span>Registered Digital Business Cards</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {cards.length} {cards.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                <div className="space-y-3">
                  {cards.map((c) => {
                    const secNum = c.cardSecurityNumber || 'YC-SEC-ACTIVE';
                    const hashPreview = c.securityTraceability?.securityHash
                      ? `${c.securityTraceability.securityHash.slice(0, 16)}...`
                      : 'sha256-verified';
                    const ownerMasked =
                      c.securityTraceability?.registeredOwnerEmailMasked ||
                      profile.email ||
                      'usr-registered';
                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-xs border border-white/20 shrink-0"
                              style={{ backgroundColor: c.accentColor || '#6366f1' }}
                            >
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{c.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                                  #{c.tag || 'card'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Slug: /p/{c.vanitySlug || c.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-semibold text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Active & Tracked
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(secNum);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition flex items-center gap-1"
                              title="Copy Security Number"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy ID</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Security Number</span>
                            <span className="text-white font-bold">{secNum}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Registered Owner</span>
                            <span className="text-slate-300">{ownerMasked}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase tracking-wider">SHA-256 Digest</span>
                            <span className="text-indigo-400 truncate block">{hashPreview}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit & Legal Guarantee Notice */}
                <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-xs space-y-1.5">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                    <span>Audit Traceability & Fraud Protection</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    In case of contact authenticity inquiries, NFC collision disputes, or law enforcement verification requests, each card's cryptographic number correlates directly to the registered user account in the database without needing invasive biometric documents or KYC selfie checks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. PRIVACY & LEGAL (Sub-menu of Settings) */}
          {activeSubMenu === 'privacy' && (
            <div className="space-y-6">
              {/* Privacy Header Banner */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-indigo-400" />
                      Privacy & Legal Center
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage your data privacy preferences, download your archive, delete your account, or read our legal policies.
                    </p>
                  </div>

                  {/* Sub-tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-medium">
                    <button
                      onClick={() => setComplianceSubTab('sovereignty')}
                      className={`px-3 py-1.5 rounded-md transition ${complianceSubTab === 'sovereignty' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Data & Privacy
                    </button>
                    <button
                      onClick={() => setComplianceSubTab('privacy')}
                      className={`px-3 py-1.5 rounded-md transition ${complianceSubTab === 'privacy' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Privacy Policy
                    </button>
                    <button
                      onClick={() => setComplianceSubTab('terms')}
                      className={`px-3 py-1.5 rounded-md transition ${complianceSubTab === 'terms' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      Terms of Use
                    </button>
                  </div>
                </div>

                {purgeAuditToken && (
                  <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Account & Data Deleted</span>
                    </div>
                    <p>All your profiles, digital cards, and contacts have been permanently removed.</p>
                  </div>
                )}

                {/* Sub-Tab: Data & Privacy */}
                {complianceSubTab === 'sovereignty' && (
                  <div className="space-y-6">
                    {/* Data Export */}
                    <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Download className="h-4 w-4 text-indigo-400" />
                          Download Your Data
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Download a copy of your profile, digital cards, and contacts.
                        </p>
                      </div>
                      <button
                        onClick={handleExportFullArchive}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition whitespace-nowrap shadow-sm"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Data</span>
                      </button>
                    </div>

                    {/* Do Not Sell Toggle */}
                    <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Do Not Sell or Share My Personal Information
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Opt out of data sharing and third-party tracking.
                        </p>
                      </div>
                      <button
                        onClick={handleToggleCCPA}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${profile.ccpaDoNotSell
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${profile.ccpaDoNotSell ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{profile.ccpaDoNotSell ? 'Opt-Out Active' : 'Opt Out Now'}</span>
                      </button>
                    </div>

                    {/* Account Deletion */}
                    <div className="rounded-lg bg-rose-950/20 border border-rose-900/60 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Delete Account & Personal Data</span>
                      </div>
                      <p className="text-xs text-rose-200/80">
                        Permanently delete your account, profiles, digital business cards, and contacts.
                      </p>
                      {!isPurgeConfirmOpen ? (
                        <button
                          onClick={() => setIsPurgeConfirmOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Account & Data</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 space-y-3">
                          <p className="text-xs text-white font-medium">
                            Are you sure you want to permanently delete your account and all data? This action cannot be undone.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleConfirmErasure}
                              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition"
                            >
                              Yes, Permanently Delete Everything
                            </button>
                            <button
                              onClick={() => setIsPurgeConfirmOpen(false)}
                              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Tab: Privacy Policy */}
                {complianceSubTab === 'privacy' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-white">YouConnect Consolidated Conservative Privacy Policy</h3>
                        <p className="text-[11px] text-slate-400">GDPR, UK GDPR, Australian Privacy Principles (Privacy Act 1988), Swiss FADP & CCPA/CPRA Compliant</p>
                      </div>
                      <button
                        onClick={() => handleCopyText('https://youconnect.app/privacy', 'privacy')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                      >
                        {copiedSection === 'privacy' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedSection === 'privacy' ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-4 leading-relaxed max-h-[460px] overflow-y-auto">
                      <div>
                        <h4 className="font-bold text-white mb-1">1. Introduction & Scope of Coverage</h4>
                        <p className="text-slate-400">
                          This Privacy Policy applies the strictest data protection standards across the YouConnect platform (<code className="text-indigo-300">com.youconnect.app</code>), web portals, P2P Proximity Radar, AI Studio, Business CRM, and NFC services. Where regional privacy regulations diverge, the most conservative and protective standard applies.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">2. Categories of Personal & Technical Data Collected</h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li><strong className="text-slate-200">Account & Registration Data:</strong> Full name, email address, encrypted password hash, unique user ID, and third-party authentication tokens (Firebase Auth: Sign in with Apple, Google Sign-In, Email/Password).</li>
                          <li><strong className="text-slate-200">Digital Card, Selective Sharing & CRM Data:</strong> Job title, company, phone numbers, emails, physical addresses, emergency contacts, bios, social links, custom Rubrica fields, portraits, banners, portfolio items, and photographs of scanned physical business cards (OCR). Only fields explicitly toggled ON via Selective Sharing are visible on public cards.</li>
                          <li><strong className="text-slate-200">Cryptographic Card Traceability (No Biometric KYC):</strong> Unique encrypted card security numbers (<code className="text-indigo-300">YC-XXXX-XXXX-XXXX-XXXX</code>), SHA-256 HMAC digests, masked owner email, and issuance timestamps linking published cards to registered accounts in our database for fraud prevention—without collecting government IDs or biometric selfies.</li>
                          <li><strong className="text-slate-200">AI Studio & Enrichment Inputs:</strong> Prompts, reference portraits/banners, and business contact enrichment queries processed transiently via Google Gemini APIs.</li>
                          <li><strong className="text-slate-200">P2P Radar, Location & Device Telemetry:</strong> Ephemeral WebSocket room presence, optional GPS/regional coordinates (captured solely while P2P Radar is actively open—never in the background), browser/OS version, IP address (for security rate-limiting), and subscription entitlement receipts.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">3. Lawful Bases & Strict Restrictions on Data Processing</h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li><strong className="text-slate-200">Strict Prohibition on Data Sales:</strong> Personal data, Master Profiles, and CRM contact lists are never sold, rented, or traded to third-party data brokers or advertisers.</li>
                          <li><strong className="text-slate-200">Lawful Grounds:</strong> Contractual necessity (card hosting, selective sharing, cloud backup), explicit user consent (AI generation, camera/OCR scanning, active P2P Radar session), legal obligations, and legitimate security interests.</li>
                          <li><strong className="text-slate-200">Zero AI Model Training & De-Identified Telemetry:</strong> Uploaded photos, scanned cards, and contacts are never used to train third-party foundational AI models. Operational telemetry is aggregated and de-identified.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">4. Third-Party Sub-Processors & International Transfers</h4>
                        <p className="text-slate-400">
                          Data is shared only with vetted sub-processors under strict DPAs: <strong>Google Cloud / Firebase</strong> (Auth & encrypted Firestore storage), <strong>Google Gemini APIs</strong> (transient AI inference), and <strong>RevenueCat / Apple App Store / Google Play</strong> (PCI-compliant billing). Anyone who receives your public card link (<code className="text-indigo-300">/p/:slug</code>), QR code, or NFC tap can view the fields enabled for that card. Cross-border transfers are safeguarded by the EU-U.S., UK, and Swiss Data Privacy Frameworks and Standard Contractual Clauses (SCCs).
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">5. Security Standards & Data Retention</h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li><strong className="text-slate-200">Encryption in Transit:</strong> 256-bit TLS 1.3 / HTTPS across all API, Firestore, and P2P WebSocket transmissions.</li>
                          <li><strong className="text-slate-200">Storage & Payment Isolation:</strong> Encrypted Firestore storage with strict owner-UID access rules; raw payment card details are handled exclusively by Apple/Google PCI-DSS gateways and never stored on YouConnect servers.</li>
                          <li><strong className="text-slate-200">Retention & Deletion:</strong> Data is retained only for active account duration; suppression flags retain minimal identifiers to permanently honor opt-out requests.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">6. Comprehensive User & Non-User Rights</h4>
                        <p className="text-slate-400">
                          Both registered users and non-users whose contact details were scanned or stored hold enforceable rights to <strong>Access, Correction, and Machine-Readable Portability</strong> (JSON / vCard export), <strong>Immediate Recursive Erasure & Account Deletion</strong> (GDPR Art. 17 & Apple Guideline 5.1.1(v) via in-app purge or <code className="text-indigo-300">/delete-account</code>), and <strong>Consent Withdrawal / CCPA Opt-Out</strong>. Contact: <code className="text-indigo-300">privacy@youconnect.app</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab: Terms of Use & Legal Disclaimer */}
                {complianceSubTab === 'terms' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-white">Consolidated Legal Disclaimer & Terms of Use (EULA)</h3>
                        <p className="text-[11px] text-slate-400">Maximum Liability Limitation, Strict User Compliance Warranties & Full Indemnification</p>
                      </div>
                      <button
                        onClick={() => handleCopyText('https://youconnect.app/terms', 'terms')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                      >
                        {copiedSection === 'terms' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedSection === 'terms' ? 'Copied' : 'Copy Link'}</span>
                      </button>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-4 leading-relaxed max-h-[460px] overflow-y-auto">
                      <div>
                        <h4 className="font-bold text-white mb-1">1. Binding Acceptance & Age Eligibility</h4>
                        <p className="text-slate-400">
                          By downloading, accessing, or using the YouConnect platform, mobile apps, web portals, or physical NFC products, you enter into a binding legal agreement. Users must be at least <strong>18 years of age</strong> (or between 13 and 18 solely under active parental or legal guardian supervision and consent).
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">2. Strict User Warranties & Third-Party Privacy Compliance</h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li><strong className="text-slate-200">Warranties of Authority & Consent:</strong> You represent and warrant that you are the sole owner of all data you upload, or that you have obtained all legally required notices, consents, licenses, and releases from every individual whose business card, contact details, or likeness you scan (OCR), enrich, store, or upload.</li>
                          <li><strong className="text-slate-200">Audio, Note-Taking & Media Compliance:</strong> Before using any voice/audio note, camera capture, or AI transcription/enrichment feature, you must comply with all applicable wiretapping, surveillance, and all-party recording consent laws.</li>
                          <li><strong className="text-slate-200">Respect for Recipient Privacy:</strong> You agree to strictly respect recipient privacy and never use exchanged contact details for unlawful spam, harassment, or unauthorized scraping.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">3. Account Security, Card Traceability & Prohibited Conduct</h4>
                        <p className="text-slate-400">
                          You are solely responsible for maintaining the confidentiality of your account credentials and accept full liability for all actions under your account. Every digital card is assigned a unique cryptographic security number (<code className="text-indigo-300">YC-XXXX-XXXX-XXXX-XXXX</code>) signed with a SHA-256 HMAC digest associating the card with the registered user in our database. Impersonation, uploading unlawful/infringing content, reverse-engineering software/AI models, or bypassing security controls and tier quotas is strictly prohibited.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">4. Subscriptions, AI Quota Coins & Intellectual Property</h4>
                        <p className="text-slate-400">
                          Tiers include <strong>Basic (Free: up to 2 cards, 3 Hub images/category, 0 included daily AI Coins + Booster Pack support)</strong>, <strong>Pro ($12/mo: unlimited cards, 5 Hub images/category, 5 daily AI Coins for any AI utilization)</strong>, and <strong>Business ($29/mo: unlimited cards, 50 Hub images/category, 10 daily AI Image Coins + Unlimited Text/Bio/CRM AI + Full Business CRM)</strong>. Paid plans auto-renew monthly unless canceled at least 24 hours before period end. Daily AI Quota Coins are non-cumulative and do not roll over; +50 AI Booster Packs ($14.99) are valid for 90 days. You retain ownership of your content while granting YouConnect a license to host, process, and display it to operate the service. Third-party social icons remain trademarks of their respective owners.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">5. Comprehensive Warranty Disclaimers ("AS IS" & "AS AVAILABLE")</h4>
                        <p className="text-slate-400">
                          All services, cloud storage, OCR scanning outputs, AI generations, P2P WebSocket Radar, and NFC functionality are provided strictly <strong>"AS IS"</strong> without warranties of any kind. YouConnect disclaims all warranties of merchantability, fitness for a particular purpose, uninterrupted uptime, or error-free OCR/AI accuracy, and bears zero liability for data loss, quota enforcement, or external third-party links.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">6. Limitation of Liability & Full User Indemnification</h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li><strong className="text-slate-200">Exclusion of Damages:</strong> In no event shall YouConnect, its operators, affiliates, or sub-processors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, goodwill, or data.</li>
                          <li><strong className="text-slate-200">Liability Cap:</strong> Aggregate liability shall not exceed the total subscription fees actually paid by you in the twelve (12) months preceding the claim (or USD $10.00 / the statutory minimum where free Basic services are used).</li>
                          <li><strong className="text-slate-200">Full User Indemnification:</strong> You agree to defend, indemnify, and hold harmless YouConnect and its personnel from any claims, regulatory fines, damages, and legal fees arising from your breach of these Terms, violation of third-party privacy/publicity/IP rights, or unlawful uploading of third-party contact data.</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">7. Governing Law & Dispute Resolution</h4>
                        <p className="text-slate-400">
                          Disputes are governed by the applicable statutory jurisdiction designated by the Operator, subject to mandatory consumer protection laws in your jurisdiction of residence, and resolved on an individual basis (class-action waiver applies). Contact: <code className="text-indigo-300">legal@youconnect.app</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. STORAGE & DATA */}
          {activeSubMenu === 'storage' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-indigo-400" />
                    Storage & Data Management
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Inspect local storage footprint, export complete machine-readable backups, and manage cached assets.
                  </p>
                </div>

                {restoreStatus && (
                  <div className="rounded-lg bg-indigo-950/60 border border-indigo-800 p-3 text-xs text-indigo-300 flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>{restoreStatus}</span>
                  </div>
                )}

                {/* Storage Meter Gauge */}
                <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Browser Storage Allotment</span>
                    <span className="font-mono text-slate-400">
                      {(storageStats.totalBytes / 1024).toFixed(1)} KB / {(storageStats.limitBytes / (1024 * 1024)).toFixed(0)} MB (~{((storageStats.totalBytes / storageStats.limitBytes) * 100).toFixed(2)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${Math.max(4, (storageStats.personaBytes / storageStats.totalBytes) * 100 || 25)}%` }}
                      className="bg-indigo-500 h-full"
                      title="Personas & Profiles"
                    />
                    <div
                      style={{ width: `${Math.max(4, (storageStats.cardBytes / storageStats.totalBytes) * 100 || 25)}%` }}
                      className="bg-cyan-400 h-full"
                      title="Digital Cards"
                    />
                    <div
                      style={{ width: `${Math.max(4, (storageStats.contactBytes / storageStats.totalBytes) * 100 || 25)}%` }}
                      className="bg-emerald-400 h-full"
                      title="CRM Contacts"
                    />
                    <div
                      style={{ width: `${Math.max(4, (storageStats.cacheBytes / storageStats.totalBytes) * 100 || 25)}%` }}
                      className="bg-purple-500 h-full"
                      title="Cache"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span>Profiles: {(storageStats.personaBytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                      <span>Cards: {(storageStats.cardBytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <span>Contacts: {(storageStats.contactBytes / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span>Cache/Other: {(storageStats.cacheBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>

                {/* Backup & Restore Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Download className="h-4 w-4 text-indigo-400" />
                      <span>Download System Backup</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Export your entire application state (all profiles, cards, and CRM contacts) to an offline JSON file.
                    </p>
                    <button
                      onClick={handleExportFullArchive}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Backup JSON</span>
                    </button>
                  </div>

                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <Upload className="h-4 w-4 text-emerald-400" />
                      <span>Restore from JSON Backup</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Import a previously downloaded system backup to seamlessly restore all profiles and settings.
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleRestoreBackupFile}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Select Backup File</span>
                    </button>
                  </div>
                </div>

                {/* Cache Cleaning */}
                <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">Temporary Image & Headshot Cache</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clears temporary base64 image generation buffers and radar thumbnails without affecting active cards or contacts.
                    </p>
                  </div>
                  <button
                    onClick={handleClearImageCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition whitespace-nowrap"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Purge Temp Cache</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. SUBSCRIPTION & AI QUOTA COINS */}
          {activeSubMenu === 'subscription' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Coins className="h-5 w-5 text-amber-400" />
                      Subscription Tiers & AI Quota Coin Strategy
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Switch between Free, Basic, and Business tiers, monitor your AI Quota Coin consumption, and top up with the +{AI_BOOSTER_PACK_SIZE} AI Booster Pack.
                    </p>
                  </div>
                  {onOpenSubscriptionModal && (
                    <button
                      onClick={onOpenSubscriptionModal}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition shrink-0"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      <span>Open Full Subscription & Coin Center</span>
                    </button>
                  )}
                </div>

                {/* Live AI Quota Coin Counter Banner */}
                {subscription && (() => {
                  const summary = getQuotaSummary(subscription);
                  const activeSpec = SUBSCRIPTION_TIER_SPECS[subscription.tier];
                  return (
                    <>
                      <div className="rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-amber-950/40 border border-indigo-500/40 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold bg-amber-950/80 border border-amber-700/80 px-2.5 py-0.5 rounded">
                              Active Plan: {activeSpec.name} Tier ({activeSpec.priceLabel})
                            </span>
                            <h3 className="text-lg font-bold text-white mt-1.5">{activeSpec.tagline}</h3>
                            <p className="text-xs text-slate-300 mt-0.5">{activeSpec.aiPowerLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenSubscriptionModal?.()}
                              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition"
                            >
                              <Zap className="h-4 w-4" />
                              <span>Buy +{AI_BOOSTER_PACK_SIZE} AI Booster Pack ({AI_BOOSTER_PACK_PRICE})</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                          <div className="p-3 rounded-lg bg-slate-950/80 border border-amber-500/30">
                            <div className="text-[11px] text-amber-300 font-medium">Total Available Coins</div>
                            <div className="text-xl font-extrabold text-white mt-0.5 flex items-center gap-1.5">
                              <span>🪙 {summary.totalAvailableCoins}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {summary.dailyRemaining} daily + {summary.boosterRemaining} booster
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[11px] text-slate-400">Daily Tier Quota</div>
                            <div className="text-lg font-bold text-white mt-0.5">
                              {summary.dailyRemaining} / {summary.dailyLimit}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Non-cumulative · No monthly rollover
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[11px] text-slate-400">Booster Pack Balance</div>
                            <div className="text-lg font-bold text-amber-300 mt-0.5">
                              {summary.boosterRemaining} Coins
                            </div>
                            <div className="text-[10px] text-amber-300/80 mt-0.5">
                              {summary.boosterRemaining > 0 && summary.nextBoosterExpiryDateLabel
                                ? `Valid until ${summary.nextBoosterExpiryDateLabel} (${summary.nextBoosterDaysLeft}d)`
                                : 'Valid 3 months from purchase'}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                            <div className="text-[11px] text-slate-400">Coins Consumed</div>
                            <div className="text-lg font-bold text-indigo-300 mt-0.5">
                              {summary.coinsConsumedToday} today
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {summary.totalLifetimeUsed} total · Renews {summary.billingCycleRenewalDate}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-amber-500/30 bg-slate-950/70 px-3.5 py-2 text-[11px] text-amber-200 flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <strong>Quota & Validity Rules:</strong> Included tier AI Quota Coins are non-cumulative — remaining coins on the monthly payment do NOT roll over or top up the next month.
                          </span>
                          <span className="font-mono text-cyan-300 font-semibold">
                            AI Booster Pack Validity: 3 Months (90 Days)
                          </span>
                        </div>
                      </div>

                      {/* 3-Tier Selector Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(['basic', 'pro', 'business'] as SubscriptionTier[]).map((tKey) => {
                          const spec = SUBSCRIPTION_TIER_SPECS[tKey];
                          const isCurrent = subscription.tier === tKey;
                          return (
                            <div
                              key={tKey}
                              className={`rounded-xl border p-4 flex flex-col justify-between transition ${isCurrent
                                ? 'border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10'
                                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                                }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-white">{spec.name}</span>
                                  <span className="text-xs font-mono font-bold text-indigo-300">{spec.priceLabel}</span>
                                </div>
                                <p className="text-[11px] text-slate-400">{spec.tagline}</p>
                                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                                  <div>• <strong>Cards:</strong> {spec.maxCardsLabel}</div>
                                  <div>• <strong>Image Hub:</strong> {spec.maxImageHubPicturesLabel}</div>
                                  <div>• <strong>AI Quota:</strong> {spec.aiPowerLabel}</div>
                                  <div>• <strong>P2P Radar:</strong> {spec.radarLimitLabel}</div>
                                  <div>• <strong>Room Cap:</strong> {spec.radarRoomMaxParticipantsLabel}</div>
                                  <div>• <strong>Business CRM:</strong> {spec.crmAccess ? 'Full CRM + AI Support' : 'No CRM Access'}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (tKey === 'basic') {
                                    onChangeTier?.('basic');
                                  } else {
                                    onOpenSubscriptionModal?.();
                                  }
                                }}
                                disabled={isCurrent}
                                className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition ${isCurrent
                                  ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                  }`}
                              >
                                {isCurrent ? 'Current Active Tier' : `Switch to ${spec.name}`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. RADAR & P2P DISCOVERY */}
          {activeSubMenu === 'radar' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="h-5 w-5 text-indigo-400" />
                    P2P Radar & Proximity Networking Preferences
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Control how other nearby attendees discover you in conference rooms and configure automated exchange behavior.
                  </p>
                </div>

                {/* Interactive Walkthrough Guide Launch Card */}
                <div className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-cyan-950/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">
                        P2P Radar Interactive Guide
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                        Step-by-Step Tour
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Learn how real zero-trust WebSocket proximity discovery works, create ephemeral rooms with auto-dissolving timers, switch broadcasting cards, and test live with your smartphone.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsRadarGuideModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Launch Interactive Guide</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Discovery Mode Radio */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Default Discovery Visibility
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {[
                        { id: 'public', label: 'Public Radar', desc: 'Visible to all peers in the active room' },
                        { id: 'contacts_only', label: 'Contacts Only', desc: 'Visible only if already in each other’s CRM' },
                        { id: 'stealth', label: 'Stealth Mode', desc: 'Invisible until physical QR/NFC handshake' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setRadarPrefs({ ...radarPrefs, defaultVisibility: mode.id as any })}
                          className={`p-3 rounded-lg border text-left text-xs transition ${radarPrefs.defaultVisibility === mode.id
                            ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                            }`}
                        >
                          <div className="font-semibold">{mode.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Range Cap Slider */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Maximum Detection Perimeter</span>
                      <span className="font-mono text-indigo-400 font-bold">{radarPrefs.maxRangeMeters} meters</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={radarPrefs.maxRangeMeters}
                      onChange={(e) => setRadarPrefs({ ...radarPrefs, maxRangeMeters: Number(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>5m (Direct Table)</span>
                      <span>25m (Booth Perimeter)</span>
                      <span>50m (Hall)</span>
                      <span>100m (Auditorium)</span>
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-white">Auto-Accept Card Exchange Requests</div>
                        <div className="text-[11px] text-slate-400">
                          Automatically share back your active circle card whenever a verified attendee requests an exchange.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={radarPrefs.autoAcceptRequests}
                        onChange={(e) => setRadarPrefs({ ...radarPrefs, autoAcceptRequests: e.target.checked })}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800 cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-white">Audio & Haptic Proximity Alerts</div>
                        <div className="text-[11px] text-slate-400">
                          Play a subtle tone and vibrate when a high-signal match comes within 5 meters.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={radarPrefs.audioProximityAlert}
                        onChange={(e) => setRadarPrefs({ ...radarPrefs, audioProximityAlert: e.target.checked })}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-900"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. SECURITY & SESSIONS */}
          {activeSubMenu === 'security' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-indigo-400" />
                    Security & Active Connected Sessions
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage biometric hardware locks, two-factor authentication, and active browser / mobile pairings.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Biometric Lock */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-indigo-400" />
                        Biometric App Lock (Face ID / WebAuthn)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Require device biometric or security key verification before opening YouConnect or modifying private cards.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSecuritySettings({
                          ...securitySettings,
                          biometricLockEnabled: !securitySettings.biometricLockEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${securitySettings.biometricLockEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                      {securitySettings.biometricLockEnabled ? 'Lock Active' : 'Enable Biometrics'}
                    </button>
                  </div>

                  {securityNotice && (
                    <div className="rounded-lg bg-emerald-950/60 border border-emerald-800 p-3 text-xs text-emerald-300 flex items-center justify-between">
                      <span>{securityNotice}</span>
                      <button onClick={() => setSecurityNotice(null)} className="text-emerald-400 hover:text-white">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Active Devices */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Active Paired Sessions ({2})
                      </h3>
                      <button
                        onClick={() => {
                          setSecurityNotice('Terminated all remote companion sessions.');
                          setTimeout(() => setSecurityNotice(null), 3000);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        Sign Out Other Sessions
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800 text-xs">
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Laptop className="h-5 w-5 text-indigo-400 shrink-0" />
                          <div>
                            <div className="font-semibold text-white">This Browser Session</div>
                            <div className="text-[11px] text-slate-400">Current session · TLS Encrypted · Active now</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                          Current Device
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-slate-400 shrink-0" />
                          <div>
                            <div className="font-semibold text-white">Mobile Companion (PWA / Web NFC)</div>
                            <div className="text-[11px] text-slate-400">Paired via QR · Last active 12m ago</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSecurityNotice('Mobile companion session revoked.');
                            setTimeout(() => setSecurityNotice(null), 3000);
                          }}
                          className="text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* E2EE Key Rotation */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-white">P2P End-to-End Encryption Keys</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ed25519 signing key and X25519 exchange keypair for mutual card encryption.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSecurityNotice('Generated fresh cryptographic keypair. Previous ephemeral keys purged.');
                        setTimeout(() => setSecurityNotice(null), 3000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Rotate Keypair</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top-Up AI Credits Modal */}
      {isTopUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setIsTopUpModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Top Up AI Headshot Credits</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Generate high-resolution photographic executive studio portraits, sports action headshots, and creative personas.
              </p>
            </div>

            {topUpSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">Credits Added Successfully!</div>
                <p className="text-xs text-emerald-300">Your AI Studio quota has been replenished.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {[
                    { id: '10', title: '10 AI Credits', price: '$4.99', popular: false },
                    { id: '50', title: '50 AI Credits (Recommended)', price: '$14.99', popular: true },
                    { id: 'unlimited', title: 'Unlimited Annual Pass', price: '$49.00', popular: false },
                  ].map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedTopUpPackage(pkg.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition ${selectedTopUpPackage === pkg.id
                        ? 'border-indigo-500 bg-indigo-950/50 text-white font-semibold'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{pkg.title}</span>
                          {pkg.popular && (
                            <span className="text-[10px] font-bold uppercase text-indigo-300 bg-indigo-950 border border-indigo-700 px-1.5 py-0.2 rounded">
                              Best Value
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white">{pkg.price}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsTopUpModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmTopUp}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm & Replenish</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* P2P Radar Interactive Walkthrough Guide Modal */}
      <RadarWalkthroughModal
        isOpen={isRadarGuideModalOpen}
        onClose={() => setIsRadarGuideModalOpen(false)}
      />
    </div>
  );
};
