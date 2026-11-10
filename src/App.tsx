import React, { useState, useEffect } from 'react';
import {
  MasterProfile,
  DigitalCard,
  CRMContact,
  AppNavTab,
  AppearanceMode,
  SubscriptionState,
  SubscriptionTier,
  AiUsageType,
} from './types';
import { PERSONA_PRESETS, DEFAULT_DIGITAL_CARDS, INITIAL_CRM_CONTACTS } from './data/presets';
import {
  getInitialSubscriptionState,
  normalizeSubscriptionState,
  consumeAiQuota,
  purchaseAiBoosterPack,
} from './utils/subscription';
import { Navbar } from './components/Navbar';
import { CardStudio } from './components/CardStudio';
import { RadarView } from './components/RadarView';
import { RubricaView } from './components/RubricaView';
import { CRMView } from './components/CRMView';
import { SettingsView } from './components/SettingsView';
import { ShareModal } from './components/ShareModal';
import { CreatePersonaModal } from './components/CreatePersonaModal';
import { PublicCardView } from './components/PublicCardView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { apiFetch } from './utils/apiConfig';
import {
  AuthenticatedUser,
  subscribeToAuthChanges,
  registerWithFirebaseEmail,
  signInWithFirebaseEmail,
  sendFirebasePasswordReset,
  fetchUserSnapshotFromFirestore,
  signInWithAppleFirebase,
  signInWithGoogleFirebase,
  signOutFirebase,
  syncUserSnapshotToFirestore,
  deleteFirebaseAccountAndCloudData,
  isFirebaseConfigured,
} from './services/firebase';
import { initializeRevenueCat } from './services/revenuecat';

const LEGACY_STORAGE_KEYS = [
  'youconnect_personas',
  'youconnect_personas_v1',
  'youconnect_personas_v2',
  'youconnect_cards',
  'youconnect_cards_v1',
  'youconnect_cards_v2',
  'youconnect_cards_v3',
  'youconnect_active_persona_id',
  'youconnect_active_persona_id_v2',
  'youconnect_active_card_id',
  'youconnect_active_card_id_v2',
];

function pruneLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

function safeSetLocalStorage(key: string, value: string, fallbackValueProducer?: () => string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    // 1. Evict any legacy keys first and retry
    pruneLegacyLocalStorage();
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // 2. If still over quota and a lighter fallback payload is available, persist that
      if (fallbackValueProducer) {
        try {
          localStorage.setItem(key, fallbackValueProducer());
          return;
        } catch {
          // 3. Last resort: remove largest sibling cache key to make room or fail silently without crashing UI
          try {
            if (key === 'youconnect_cards_v4') {
              localStorage.removeItem('youconnect_personas_v3');
            }
            localStorage.setItem(key, fallbackValueProducer());
          } catch (finalErr) {
            console.warn(`LocalStorage quota full; keeping ${key} in memory for this session.`, finalErr);
          }
        }
      }
    }
  }
}

const MAX_INLINE_DATA_URL_LENGTH = 180_000;

function trimOversizedDataUrl(url: string | undefined, fallback = ''): string | undefined {
  if (!url) return url;
  if (url.startsWith('data:') && url.length > MAX_INLINE_DATA_URL_LENGTH) {
    return fallback || undefined;
  }
  return url;
}

function compactPersonasForStorage(personas: MasterProfile[]): string {
  const compacted = personas.map((p) => ({
    ...p,
    avatarUrl: trimOversizedDataUrl(p.avatarUrl, '') ?? '',
    storedPictures: (p.storedPictures || [])
      .filter((pic) => !pic.url.startsWith('data:') || pic.url.length <= MAX_INLINE_DATA_URL_LENGTH)
      .slice(-8),
    storedBanners: (p.storedBanners || [])
      .filter((b) => !b.url.startsWith('data:') || b.url.length <= MAX_INLINE_DATA_URL_LENGTH)
      .slice(-6),
  }));
  return JSON.stringify(compacted);
}

function compactCardsForStorage(cards: DigitalCard[]): string {
  const compacted = cards.map((c) => ({
    ...c,
    coverBannerUrl: trimOversizedDataUrl(c.coverBannerUrl),
    customLogoUrl: trimOversizedDataUrl(c.customLogoUrl),
    videoIntroUrl: trimOversizedDataUrl(c.videoIntroUrl),
  }));
  return JSON.stringify(compacted);
}

function createScratchStarterPersona(reg?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): MasterProfile {
  const fName = (reg?.firstName || '').trim();
  const lName = (reg?.lastName || '').trim();
  const fullName = [fName, lName].filter(Boolean).join(' ').trim();
  const em = (reg?.email || '').trim();
  const ph = (reg?.phone || '').trim();

  return {
    id: 'persona-founder',
    name: fullName,
    firstName: fName,
    lastName: lName,
    nickname: '',
    gender: '',
    pronouns: '',
    role: '',
    company: '',
    headline: '',
    email: em,
    phone: ph,
    website: '',
    location: '',
    bio: '',
    avatarUrl: '',
    previousAvatarUrl: undefined,
    companyLogoUrl: undefined,
    videoIntroUrl: undefined,
    artistDiscipline: '',
    category: 'business',
    tag: '',
    circleName: 'My Primary Identity',
    isVerified: false,
    kycVerification: undefined,
    ccpaDoNotSell: false,
    aiCredits: 25,
    socials: {},
    socialAccounts: [],
    personalData: {
      firstName: fName,
      lastName: lName,
      fullName,
      nickname: '',
      gender: '',
      pronouns: '',
      phone: ph,
      email: em,
      bio: '',
      birthday: '',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      emergencyContacts: [],
      socials: {},
    },
    workData: {
      role: '',
      company: '',
      department: '',
      headline: '',
      bio: '',
      email: '',
      phone: '',
      website: '',
      taxIdOrVat: '',
      companyLogoUrl: undefined,
      officeAddress: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
      },
      socials: {},
    },
    rubricaFields: [],
    passions: [],
    education: [],
    portfolio: [],
    storedPictures: [],
    storedBanners: [],
  };
}

function createScratchStarterCard(reg?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}): DigitalCard {
  const fName = (reg?.firstName || '').trim();
  const lName = (reg?.lastName || '').trim();
  const fullName = [fName, lName].filter(Boolean).join(' ').trim();
  const em = (reg?.email || '').trim();
  const ph = (reg?.phone || '').trim();
  const slugBase = fullName
    ? fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : `card-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: 'card-executive',
    name: 'My Primary Card',
    category: 'business',
    tag: '',
    theme: 'executive',
    materialFinish: 'matte',
    fontPairing: 'modern_sans',
    contentLayout: 'executive_left',
    preferredLayout: 'card_3d',
    accentColor: '#6366F1',
    customTagline: '',
    coverBannerUrl: undefined,
    companyLogoUrl: undefined,
    customLogoUrl: undefined,
    videoIntroUrl: undefined,
    storySpotlight: undefined,
    vanitySlug: slugBase || 'my-card',
    qrMode: 'weblink',
    holderFirstName: fName,
    holderLastName: lName,
    holderFullName: fullName,
    holderEmail: em,
    holderPhone: ph,
    livePresence: {
      enabled: false,
      statusText: '',
      availability: 'available',
      timezone: 'America/Los_Angeles',
    },
    visibleFields: {
      role: true,
      company: true,
      department: true,
      headline: true,
      email: true,
      phone: true,
      website: true,
      location: true,
      bio: true,
      companyLogo: false,
      officeAddress: false,
      taxIdOrVat: false,
      personalPhone: true,
      personalEmail: true,
      homeAddress: false,
      birthday: false,
      emergencyContact: false,
      personalBio: false,
      nickname: false,
      gender: false,
      pronouns: false,
      passions: false,
      education: false,
      portfolio: false,
      socials: true,
    },
  };
}

export default function App() {
  // Sign-In & Sign-On (Registration) Initial Page / Clean-Slate Mode (?beta=scratch, ?fresh=1, ?auth=1, or manual open)
  const [isBetaScratchOnboardingOpen, setIsBetaScratchOnboardingOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isScratch =
        params.get('beta') === 'scratch' ||
        params.get('beta') === '1' ||
        params.get('fresh') === '1' ||
        params.get('onboarding') === '1' ||
        params.get('auth') === '1';
      if (isScratch) {
        if (params.get('beta') === 'scratch' || params.get('fresh') === '1') {
          try {
            localStorage.removeItem('youconnect_personas_v3');
            localStorage.removeItem('youconnect_cards_v4');
            localStorage.removeItem('youconnect_contacts');
            localStorage.removeItem('youconnect_active_persona_id_v3');
            localStorage.removeItem('youconnect_active_card_id_v3');
          } catch {
            // ignore
          }
        }
        return true;
      }
    }
    return false;
  });

  const [authTabMode, setAuthTabMode] = useState<'signon' | 'signin'>('signon');
  const [signInEmailInput, setSignInEmailInput] = useState('');
  const [signInPhoneInput, setSignInPhoneInput] = useState('');
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authConfirmPasswordInput, setAuthConfirmPasswordInput] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);

  const [betaForm, setBetaForm] = useState({
    firstName: '',
    lastName: '',
    personalEmail: '',
    personalPhone: '',
  });
  const [betaFormError, setBetaFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setAuthUser(user);
      initializeRevenueCat(user?.uid).catch(() => {});
    });
    return () => unsubscribe();
  }, []);

  // Navigation State (supports ?tab=radar, ?tab=rubrica, ?tab=crm, ?tab=settings from links)
  const [activeTab, setActiveTab] = useState<AppNavTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'radar' || tab === 'rubrica' || tab === 'crm' || tab === 'settings' || tab === 'studio') {
        return tab;
      }
      if (tab === 'compliance' || tab === 'privacy') {
        return 'settings';
      }
    }
    return 'studio';
  });

  // Master Profiles & Active Persona (Single Person across Social Circles: Work, Family, Golf, Soccer)
  const [personas, setPersonas] = useState<MasterProfile[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('beta') === 'scratch' ||
        params.get('beta') === '1' ||
        params.get('fresh') === '1' ||
        params.get('onboarding') === '1'
      ) {
        return [createScratchStarterPersona()];
      }
      // If user registered as a new user via Sign-On, ensure their profile only has the 4 registration fields if not yet migrated
      const rawReg = localStorage.getItem('youconnect_registered_account_v1');
      const isMigrated = localStorage.getItem('youconnect_clean_reg_migrated_v3') === 'true';
      if (rawReg && !isMigrated) {
        try {
          const parsedReg = JSON.parse(rawReg);
          localStorage.setItem('youconnect_clean_reg_migrated_v3', 'true');
          return [
            createScratchStarterPersona({
              firstName: parsedReg.firstName,
              lastName: parsedReg.lastName,
              email: parsedReg.email,
              phone: parsedReg.phone,
            }),
          ];
        } catch {
          // ignore
        }
      }
      const peerParam = params.get('peer');
      if (peerParam && peerParam.startsWith('guest')) {
        // Create dedicated guest peer persona for side-by-side testing
        const guestPersona: MasterProfile = {
          id: `persona-guest-${peerParam}`,
          name: 'Alex Vance',
          role: 'VP of Partnerships',
          company: 'Apex Frontier Labs',
          email: 'alex.vance@apexfrontier.io',
          phone: '+1 (415) 880-9941',
          website: 'https://apexfrontier.io',
          location: 'San Francisco, CA',
          headline: 'Scaling decentralized physical infrastructure & edge AI networks',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
          category: 'business',
          tag: 'Frontier Tech',
          bio: 'Partnering with frontier tech founders and enterprise research teams.',
          isVerified: true,
          ccpaDoNotSell: false,
          aiCredits: 15,
          socials: {
            linkedin: 'https://linkedin.com/in/alex-vance-frontier',
            twitter: '@alexvance_ai',
            calendly: 'https://calendly.com/alex-vance/intro',
          },
        };
        return [guestPersona, ...PERSONA_PRESETS];
      }
    }

    const saved = localStorage.getItem('youconnect_personas_v3');
    if (saved) {
      try {
        const parsed: MasterProfile[] = JSON.parse(saved);
        return parsed.map((p) => {
          const hasValidKycTraceability = Boolean(
            p.kycVerification?.isCompleted && p.kycVerification?.traceabilityId
          );
          const uniquePics = (p.storedPictures || []).filter(
            (pic, idx, arr) => pic?.url && arr.findIndex((x) => x?.url?.trim() === pic.url.trim()) === idx
          );
          const uniqueBanners = (p.storedBanners || []).filter(
            (b, idx, arr) => b?.url && arr.findIndex((x) => x?.url?.trim() === b.url.trim()) === idx
          );
          return {
            ...p,
            storedPictures: uniquePics,
            storedBanners: uniqueBanners,
            isVerified: hasValidKycTraceability ? true : false,
            kycVerification: hasValidKycTraceability ? p.kycVerification : undefined,
          };
        });
      } catch {
        return PERSONA_PRESETS;
      }
    }
    return PERSONA_PRESETS;
  });

  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const peerParam = params.get('peer');
      if (peerParam && peerParam.startsWith('guest')) {
        return `persona-guest-${peerParam}`;
      }
    }
    return localStorage.getItem('youconnect_active_persona_id_v3') || PERSONA_PRESETS[0].id;
  });

  // Current active profile
  const currentProfile = personas.find((p) => p.id === activePersonaId) || personas[0];

  // Digital Cards (sanitized so user's own cards never retain visitor CTA / icebreaker strings)
  const [cards, setCards] = useState<DigitalCard[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('beta') === 'scratch' ||
        params.get('beta') === '1' ||
        params.get('fresh') === '1' ||
        params.get('onboarding') === '1'
      ) {
        return [createScratchStarterCard()];
      }
      const rawReg = localStorage.getItem('youconnect_registered_account_v1');
      const isCardMigrated = localStorage.getItem('youconnect_clean_card_migrated_v3') === 'true';
      if (rawReg && !isCardMigrated) {
        try {
          const parsedReg = JSON.parse(rawReg);
          localStorage.setItem('youconnect_clean_card_migrated_v3', 'true');
          return [
            createScratchStarterCard({
              firstName: parsedReg.firstName,
              lastName: parsedReg.lastName,
              email: parsedReg.email,
              phone: parsedReg.phone,
            }),
          ];
        } catch {
          // ignore
        }
      }
    }
    const saved = localStorage.getItem('youconnect_cards_v4') || localStorage.getItem('youconnect_cards_v3');
    pruneLegacyLocalStorage();
    if (saved) {
      try {
        const parsed: DigitalCard[] = JSON.parse(saved);
        return parsed.map((c) => ({
          ...c,
          primaryCta: undefined,
          videoIntroUrl: c.videoIntroUrl?.includes('dQw4w9WgXcQ') ? '' : c.videoIntroUrl,
          livePresence: c.livePresence
            ? {
                ...c.livePresence,
                icebreakerPrompt: undefined,
                statusText:
                  c.livePresence.statusText &&
                  !c.livePresence.statusText.toLowerCase().includes('available for direct connection') &&
                  !c.livePresence.statusText.toLowerCase().includes('open for')
                    ? c.livePresence.statusText
                    : `Verified Identity · ${c.name}`,
              }
            : undefined,
          storySpotlight: c.storySpotlight
            ? {
                ...c.storySpotlight,
                ctaLabel: undefined,
                ctaUrl: undefined,
              }
            : undefined,
        }));
      } catch {
        return DEFAULT_DIGITAL_CARDS;
      }
    }
    return DEFAULT_DIGITAL_CARDS;
  });

  const [activeCardId, setActiveCardId] = useState<string>(() => {
    return localStorage.getItem('youconnect_active_card_id_v3') || DEFAULT_DIGITAL_CARDS[0].id;
  });

  const currentCard = cards.find((c) => c.id === activeCardId) || cards[0];

  // CRM Contacts
  const [contacts, setContacts] = useState<CRMContact[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('beta') === 'scratch' ||
        params.get('beta') === '1' ||
        params.get('fresh') === '1' ||
        params.get('onboarding') === '1'
      ) {
        return [];
      }
    }
    const saved = localStorage.getItem('youconnect_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CRM_CONTACTS;
      }
    }
    return INITIAL_CRM_CONTACTS;
  });

  // Subscription & AI Quota Coin State (Free / Basic / Business + 50-Coin AI Booster Pack)
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    const saved = localStorage.getItem('youconnect_subscription_v1');
    if (saved) {
      try {
        return normalizeSubscriptionState(JSON.parse(saved));
      } catch {
        return getInitialSubscriptionState('free');
      }
    }
    return getInitialSubscriptionState('free');
  });

  const subscriptionRef = React.useRef<SubscriptionState>(subscription);
  useEffect(() => {
    subscriptionRef.current = subscription;
  }, [subscription]);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Create Persona Modal State (accessible from top navbar profile switcher)
  const [isCreatePersonaModalOpen, setIsCreatePersonaModalOpen] = useState(false);

  // Settings Menu Open State (controlled by clicking Settings in the top header)
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(true);

  // App Appearance State: Day, Night, or Automatic (System)
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('youconnect_appearance_mode');
      if (saved === 'day' || saved === 'night' || saved === 'auto') {
        return saved;
      }
    }
    return 'night';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    safeSetLocalStorage('youconnect_appearance_mode', appearanceMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = () => {
      const resolvedDay =
        appearanceMode === 'day' || (appearanceMode === 'auto' && mediaQuery.matches);
      document.documentElement.classList.toggle('theme-day', resolvedDay);
      document.documentElement.classList.toggle('theme-night', !resolvedDay);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [appearanceMode]);

  // Public Shared Card Route (when opening from QR scan or mobile link e.g. /p/elena-exec or ?p=elena-exec)
  const [publicCardSlug, setPublicCardSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const pathname = window.location.pathname;
    if (pathname.startsWith('/p/')) {
      const slug = pathname.replace(/^\/p\//, '').trim();
      if (slug) return decodeURIComponent(slug);
    }
    const params = new URLSearchParams(window.location.search);
    const pParam = params.get('p') || params.get('card');
    if (pParam) return decodeURIComponent(pParam.trim());
    return null;
  });

  const [remotePublicCard, setRemotePublicCard] = useState<{ card: DigitalCard; profile: MasterProfile } | null>(null);

  useEffect(() => {
    if (!publicCardSlug) return;
    let isCancelled = false;

    async function loadRemoteCard() {
      try {
        const res = await apiFetch(`/api/cards/${encodeURIComponent(publicCardSlug!)}`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.card && data.profile) {
            setRemotePublicCard({ card: data.card, profile: data.profile });
          }
        }
      } catch (err) {
        console.warn('Could not load remote card:', err);
      }
    }

    loadRemoteCard();
    return () => {
      isCancelled = true;
    };
  }, [publicCardSlug]);

  // Sync state to LocalStorage safely without throwing QuotaExceededError
  useEffect(() => {
    safeSetLocalStorage('youconnect_personas_v3', JSON.stringify(personas), () =>
      compactPersonasForStorage(personas)
    );
  }, [personas]);

  useEffect(() => {
    safeSetLocalStorage('youconnect_active_persona_id_v3', activePersonaId);
  }, [activePersonaId]);

  useEffect(() => {
    safeSetLocalStorage('youconnect_cards_v4', JSON.stringify(cards), () =>
      compactCardsForStorage(cards)
    );
  }, [cards]);

  useEffect(() => {
    safeSetLocalStorage('youconnect_active_card_id_v3', activeCardId);
  }, [activeCardId]);

  useEffect(() => {
    safeSetLocalStorage('youconnect_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    safeSetLocalStorage('youconnect_subscription_v1', JSON.stringify(subscription));
  }, [subscription]);

  // Debounced Cloud Firestore Synchronization when user is authenticated
  useEffect(() => {
    if (!authUser?.uid) return;
    const timer = setTimeout(() => {
      syncUserSnapshotToFirestore({
        personas,
        cards,
        contacts,
        subscription,
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [authUser?.uid, personas, cards, contacts, subscription]);

  // Subscription & AI Quota Coin Handlers (Synchronously serialized against subscriptionRef + persisted to disk before network call)
  const handleConsumeAiCoin = (usageType: AiUsageType, label: string): boolean => {
    const current = normalizeSubscriptionState(subscriptionRef.current);
    const result = consumeAiQuota(current, usageType, label);
    if (!result.allowed) {
      return false;
    }
    subscriptionRef.current = result.updated;
    safeSetLocalStorage('youconnect_subscription_v1', JSON.stringify(result.updated));
    setSubscription(result.updated);
    return true;
  };

  const handleChangeTier = (newTier: SubscriptionTier) => {
    setSubscription((prev) => {
      const next = normalizeSubscriptionState({
        ...prev,
        tier: newTier,
      });
      subscriptionRef.current = next;
      safeSetLocalStorage('youconnect_subscription_v1', JSON.stringify(next));
      return next;
    });
  };

  const handleBuyBoosterPack = (coinsToAdd?: number) => {
    setSubscription((prev) => {
      const next = purchaseAiBoosterPack(prev, coinsToAdd);
      subscriptionRef.current = next;
      safeSetLocalStorage('youconnect_subscription_v1', JSON.stringify(next));
      return next;
    });
  };

  // Handlers
  const handleSelectPersona = (id: string) => {
    setActivePersonaId(id);
    // Automatically align with corresponding circle digital card
    const personaCardMap: Record<string, string> = {
      'persona-founder': 'card-executive',
      'persona-family': 'card-family',
      'persona-golf': 'card-golf',
      'persona-soccer': 'card-soccer',
    };
    if (personaCardMap[id] && cards.some((c) => c.id === personaCardMap[id])) {
      setActiveCardId(personaCardMap[id]);
    }
  };

  const handleSelectCard = (card: DigitalCard) => {
    setActiveCardId(card.id);
    const cardPersonaMap: Record<string, string> = {
      'card-executive': 'persona-founder',
      'card-family': 'persona-family',
      'card-golf': 'persona-golf',
      'card-soccer': 'persona-soccer',
    };
    const mappedPersonaId = cardPersonaMap[card.id];
    if (mappedPersonaId && personas.some((p) => p.id === mappedPersonaId)) {
      setActivePersonaId(mappedPersonaId);
      return;
    }
    const matchingPersona = personas.find(
      (p) => p.id === card.id || p.circleName === card.name || p.profileTitle === card.name
    );
    if (matchingPersona) {
      setActivePersonaId(matchingPersona.id);
    }
  };

  const handleUpdateProfile = (updated: MasterProfile) => {
    const dedupedUpdated: MasterProfile = {
      ...updated,
      storedPictures: (updated.storedPictures || []).filter(
        (pic, idx, arr) => pic?.url && arr.findIndex((x) => x?.url?.trim() === pic.url.trim()) === idx
      ),
      storedBanners: (updated.storedBanners || []).filter(
        (b, idx, arr) => b?.url && arr.findIndex((x) => x?.url?.trim() === b.url.trim()) === idx
      ),
    };
    const hasKycTrace = Boolean(
      dedupedUpdated.isVerified &&
        dedupedUpdated.kycVerification?.isCompleted &&
        dedupedUpdated.kycVerification?.traceabilityId
    );
    setPersonas((prev) =>
      prev.map((p) => {
        if (p.id === dedupedUpdated.id) return dedupedUpdated;
        // Propagate KYC registration & green verified tick across all of the user's identity circles
        if (hasKycTrace) {
          return {
            ...p,
            isVerified: true,
            verifiedAt: updated.verifiedAt,
            kycVerification: updated.kycVerification,
          };
        }
        if (!updated.isVerified && !updated.kycVerification) {
          return {
            ...p,
            isVerified: false,
            verifiedAt: undefined,
            kycVerification: undefined,
          };
        }
        return p;
      })
    );
  };

  const handleUpdateCard = (updated: DigitalCard) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleAddContact = (newContact: CRMContact) => {
    setContacts((prev) => {
      const incomingEmail = (newContact.email || newContact.personalEmail || '').trim().toLowerCase();
      const incomingPhone = (newContact.phone || newContact.personalPhone || '').replace(/\D/g, '');
      const incomingName = (newContact.name || '').trim().toLowerCase();

      const existingIdx = prev.findIndex((c) => {
        if (incomingEmail && c.email && c.email.trim().toLowerCase() === incomingEmail) return true;
        if (incomingEmail && c.personalEmail && c.personalEmail.trim().toLowerCase() === incomingEmail) return true;
        if (incomingPhone && c.phone && c.phone.replace(/\D/g, '') === incomingPhone) return true;
        if (incomingPhone && c.personalPhone && c.personalPhone.replace(/\D/g, '') === incomingPhone) return true;
        if (incomingName && c.name.trim().toLowerCase() === incomingName) return true;
        return false;
      });

      if (existingIdx >= 0) {
        // Update data as received in accordance with selective sharing
        const existing = prev[existingIdx];
        const updatedContact: CRMContact = {
          ...existing,
          ...newContact,
          // Preserve local notes if newContact only has default placeholder notes
          notes: existing.notes || newContact.notes,
          tags: Array.from(new Set([...(existing.tags || []), ...(newContact.tags || [])])),
          updatedAt: new Date().toISOString(),
          selectiveSyncInfo: newContact.selectiveSyncInfo || {
            isSynced: true,
            lastSyncedAt: new Date().toISOString(),
            senderCircle: newContact.company || 'YouConnect Card Exchange',
            sharedFieldsList: ['Profile Card Data', 'Contact Details'],
            version: (existing.selectiveSyncInfo?.version || 0) + 1,
          },
        };
        const next = [...prev];
        next[existingIdx] = updatedContact;
        return next;
      }

      return [newContact, ...prev];
    });
  };

  // Persona / Circle Lifecycle Handlers
  const handleCreatePersona = (newPersona: MasterProfile, matchingCard?: DigitalCard) => {
    setPersonas((prev) => [...prev, newPersona]);
    setActivePersonaId(newPersona.id);
    if (matchingCard) {
      setCards((prev) => [...prev, matchingCard]);
      setActiveCardId(matchingCard.id);
    }
  };

  const handleDeletePersona = (personaId: string) => {
    if (personas.length <= 1) return;
    setPersonas((prev) => {
      const remaining = prev.filter((p) => p.id !== personaId);
      if (activePersonaId === personaId && remaining.length > 0) {
        setActivePersonaId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Card Profile Lifecycle Handlers
  const handleCreateCard = (newCard: DigitalCard) => {
    const parts = (currentProfile.name || '').trim().split(/\s+/);
    const defaultFirst =
      currentProfile.personalData?.firstName || currentProfile.firstName || parts[0] || '';
    const defaultLast =
      currentProfile.personalData?.lastName ||
      currentProfile.lastName ||
      parts.slice(1).join(' ') ||
      '';
    const defaultFull =
      [newCard.holderFirstName || defaultFirst, newCard.holderLastName || defaultLast]
        .filter(Boolean)
        .join(' ') || currentProfile.name;
    const defaultEmail =
      currentProfile.email ||
      currentProfile.personalData?.email ||
      currentProfile.workData?.email ||
      '';
    const defaultPhone =
      currentProfile.phone ||
      currentProfile.personalData?.phone ||
      currentProfile.workData?.phone ||
      '';

    const populatedCard: DigitalCard = {
      ...newCard,
      holderFirstName: newCard.holderFirstName || defaultFirst || undefined,
      holderLastName: newCard.holderLastName || defaultLast || undefined,
      holderFullName: newCard.holderFullName || defaultFull || undefined,
      holderEmail: newCard.holderEmail || defaultEmail || undefined,
      holderPhone: newCard.holderPhone || defaultPhone || undefined,
    };

    setCards((prev) => [...prev, populatedCard]);
    setActiveCardId(populatedCard.id);
  };

  const handleDeleteCard = (cardId: string) => {
    if (cards.length <= 1) return;
    setCards((prev) => {
      const remaining = prev.filter((c) => c.id !== cardId);
      if (activeCardId === cardId && remaining.length > 0) {
        setActiveCardId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleDuplicateCard = (cardId: string) => {
    const cardToDup = cards.find((c) => c.id === cardId);
    if (!cardToDup) return;
    const newCard: DigitalCard = {
      ...cardToDup,
      id: `card-${Date.now()}`,
      name: `${cardToDup.name} (Copy)`,
      vanitySlug: `${cardToDup.vanitySlug}-copy-${Math.floor(Math.random() * 1000)}`,
    };
    setCards((prev) => [...prev, newCard]);
    setActiveCardId(newCard.id);
  };

  // Full Recursive Purge (GDPR Right to Erasure & Apple Guideline 5.1.1(v) — Local + Firebase Cloud + Server Registry & KYC Purge)
  const handleRecursivePurge = () => {
    const personaIds = personas.map((p) => p.id);
    const cardIds = cards.map((c) => c.id);
    const vanitySlugs = cards.map((c) => c.vanitySlug).filter(Boolean) as string[];
    const traceabilityIds = personas
      .map((p) => p.kycVerification?.traceabilityId)
      .filter(Boolean) as string[];

    deleteFirebaseAccountAndCloudData({
      personaIds,
      cardIds,
      vanitySlugs,
      traceabilityIds,
    }).catch(() => {
      // Non-blocking if offline
    });

    localStorage.clear();
    setPersonas(PERSONA_PRESETS);
    setActivePersonaId(PERSONA_PRESETS[0].id);
    setCards(DEFAULT_DIGITAL_CARDS);
    setActiveCardId(DEFAULT_DIGITAL_CARDS[0].id);
    setContacts([]);
  };

  // Restore System Backup
  const handleRestoreBackup = (backupData: {
    personas?: MasterProfile[];
    cards?: DigitalCard[];
    contacts?: CRMContact[];
  }) => {
    if (backupData.personas && backupData.personas.length > 0) {
      setPersonas(backupData.personas);
      setActivePersonaId(backupData.personas[0].id);
    }
    if (backupData.cards && backupData.cards.length > 0) {
      setCards(backupData.cards);
      setActiveCardId(backupData.cards[0].id);
    }
    if (backupData.contacts) {
      setContacts(backupData.contacts);
    }
  };

  // If visitor is viewing a public card via QR scan or direct link
  if (publicCardSlug) {
    let resolvedCard: DigitalCard | null = null;
    let resolvedProfile: MasterProfile | null = null;

    if (remotePublicCard) {
      resolvedCard = remotePublicCard.card;
      resolvedProfile = remotePublicCard.profile;
    } else {
      const slugLower = publicCardSlug.toLowerCase();
      resolvedCard =
        cards.find((c) => (c.vanitySlug && c.vanitySlug.toLowerCase() === slugLower) || c.id.toLowerCase() === slugLower) ||
        DEFAULT_DIGITAL_CARDS.find((c) => (c.vanitySlug && c.vanitySlug.toLowerCase() === slugLower) || c.id.toLowerCase() === slugLower) ||
        cards[0];

      const categoryMap: Record<string, string> = {
        business: 'persona-founder',
        personal: 'persona-family',
        hobby_sport: 'persona-golf',
      };
      const personaId = resolvedCard ? categoryMap[resolvedCard.category] : null;
      resolvedProfile =
        personas.find((p) => p.id === personaId) ||
        PERSONA_PRESETS.find((p) => p.id === personaId) ||
        currentProfile;
    }

    if (resolvedCard && resolvedProfile) {
      return (
        <PublicCardView
          card={resolvedCard}
          profile={resolvedProfile}
          onExitToStudio={() => {
            setPublicCardSlug(null);
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/');
            }
          }}
          onAddReciprocalContact={handleAddContact}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 selection:bg-indigo-500/30 selection:text-white">
      {/* Top Bar Header with responsive profile switcher & live AI Quota Coin counter */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'settings') {
            if (activeTab === 'settings') {
              setIsSettingsMenuOpen((prev) => !prev);
            } else {
              setActiveTab('settings');
              setIsSettingsMenuOpen(true);
            }
          } else {
            setActiveTab(tab);
          }
        }}
        profile={currentProfile}
        activeCard={currentCard}
        onShareClick={() => setIsShareModalOpen(true)}
        onSelectPersona={handleSelectPersona}
        allPersonas={personas}
        onCreatePersonaClick={() => setIsCreatePersonaModalOpen(true)}
        subscription={subscription}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
        authUser={authUser}
        onOpenAuthModal={(mode) => {
          if (mode) {
            setAuthTabMode(mode);
          }
          if (authUser) {
            const parts = (authUser.displayName || '').trim().split(/\s+/);
            setBetaForm({
              firstName: authUser.firstName || parts[0] || '',
              lastName: authUser.lastName || parts.slice(1).join(' ') || '',
              personalEmail: authUser.email || '',
              personalPhone: authUser.phoneNumber || '',
            });
            setSignInEmailInput(authUser.email || '');
          }
          setAuthPasswordInput('');
          setAuthConfirmPasswordInput('');
          setBetaFormError(null);
          setAuthSuccessMessage(null);
          setIsBetaScratchOnboardingOpen(true);
        }}
      />

      {/* Main View Port based on Tab */}
      <main className="pb-24 md:pb-16">
        {activeTab === 'studio' && (
          <CardStudio
            profile={currentProfile}
            cards={cards}
            activeCard={currentCard}
            onSelectCard={handleSelectCard}
            onUpdateProfile={handleUpdateProfile}
            onUpdateCard={handleUpdateCard}
            onSelectPersona={handleSelectPersona}
            allPersonas={personas}
            onAddContactToCRM={handleAddContact}
            onCreatePersona={handleCreatePersona}
            onDeletePersona={handleDeletePersona}
            onCreateCard={handleCreateCard}
            onDeleteCard={handleDeleteCard}
            onDuplicateCard={handleDuplicateCard}
            subscription={subscription}
            onConsumeAiCoin={handleConsumeAiCoin}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {activeTab === 'radar' && (
          <RadarView
            profile={currentProfile}
            cards={cards}
            activeCard={currentCard}
            onSelectCard={handleSelectCard}
            allPersonas={personas}
            onSelectPersona={handleSelectPersona}
            onAddContactToCRM={handleAddContact}
            subscription={subscription}
            onUpdateSubscription={setSubscription}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {activeTab === 'rubrica' && (
          <RubricaView
            contacts={contacts}
            onUpdateContacts={setContacts}
            onAddContact={handleAddContact}
            onNavigateToCRM={() => setActiveTab('crm')}
          />
        )}

        {activeTab === 'crm' && (
          <CRMView
            contacts={contacts}
            onUpdateContacts={setContacts}
            onAddContact={handleAddContact}
            onNavigateToRubrica={() => setActiveTab('rubrica')}
            subscription={subscription}
            onConsumeAiCoin={handleConsumeAiCoin}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            onUpgradeToBusiness={() => setIsSubscriptionModalOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={currentProfile}
            cards={cards}
            contacts={contacts}
            allPersonas={personas}
            onUpdateProfile={handleUpdateProfile}
            onRecursivePurge={handleRecursivePurge}
            onRestoreBackup={handleRestoreBackup}
            initialSubMenu={
              typeof window !== 'undefined' &&
              (new URLSearchParams(window.location.search).get('tab') === 'compliance' ||
                new URLSearchParams(window.location.search).get('tab') === 'privacy')
                ? 'privacy'
                : 'account'
            }
            onNavigateToStudio={() => setActiveTab('studio')}
            subscription={subscription}
            onChangeTier={handleChangeTier}
            onBuyBoosterPack={handleBuyBoosterPack}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            appearanceMode={appearanceMode}
            onChangeAppearanceMode={setAppearanceMode}
            isSettingsMenuOpen={isSettingsMenuOpen}
            onToggleSettingsMenu={setIsSettingsMenuOpen}
            onOpenAuthModal={() => {
              const parts = (currentProfile.name || '').trim().split(/\s+/);
              setBetaForm({
                firstName:
                  currentProfile.personalData?.firstName ||
                  currentProfile.firstName ||
                  parts[0] ||
                  '',
                lastName:
                  currentProfile.personalData?.lastName ||
                  currentProfile.lastName ||
                  parts.slice(1).join(' ') ||
                  '',
                personalEmail:
                  currentProfile.email || currentProfile.personalData?.email || '',
                personalPhone:
                  currentProfile.phone || currentProfile.personalData?.phone || '',
              });
              setSignInEmailInput(
                currentProfile.email || currentProfile.personalData?.email || ''
              );
              setSignInPhoneInput(
                currentProfile.phone || currentProfile.personalData?.phone || ''
              );
              setBetaFormError(null);
              setIsBetaScratchOnboardingOpen(true);
            }}
          />
        )}
      </main>

      {/* Share Virtual Business Card Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profile={currentProfile}
        card={currentCard}
      />

      {/* Global Create Persona / Identity Circle Modal */}
      <CreatePersonaModal
        isOpen={isCreatePersonaModalOpen}
        onClose={() => setIsCreatePersonaModalOpen(false)}
        currentProfile={currentProfile}
        onCreatePersona={handleCreatePersona}
      />

      {/* Subscription Strategy & AI Quota Coin Center Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        subscription={subscription}
        onChangeTier={handleChangeTier}
        onBuyBoosterPack={handleBuyBoosterPack}
        currentCardCount={cards.length}
      />

      {/* Sign-In & Sign-Up (Registration) Modal integrated with Firebase Auth & Sign in with Apple (Guideline 4.8) */}
      {isBetaScratchOnboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">YouConnect Account</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create a new account or log in with Apple, Google, or your Email & Password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBetaScratchOnboardingOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {authUser && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-emerald-300 truncate">
                    Signed in as {authUser.displayName || authUser.email}
                  </div>
                  {authUser.displayName && authUser.email && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {authUser.email}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutFirebase();
                  }}
                  className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Apple Guideline 4.8 Mandatory "Sign in with Apple" & Google OAuth Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                disabled={isAuthSubmitting}
                onClick={async () => {
                  setBetaFormError(null);
                  setIsAuthSubmitting(true);
                  try {
                    const fbUser = await signInWithAppleFirebase();
                    const fName = fbUser.firstName || 'Apple';
                    const lName = fbUser.lastName || 'User';
                    const cleanPersona = createScratchStarterPersona({
                      firstName: fName,
                      lastName: lName,
                      email: fbUser.email,
                      phone: fbUser.phoneNumber || '',
                    });
                    const cleanCard = createScratchStarterCard({
                      firstName: fName,
                      lastName: lName,
                      email: fbUser.email,
                      phone: fbUser.phoneNumber || '',
                    });
                    setPersonas([cleanPersona]);
                    setActivePersonaId(cleanPersona.id);
                    setCards([cleanCard]);
                    setActiveCardId(cleanCard.id);
                    setIsBetaScratchOnboardingOpen(false);
                  } catch (err: any) {
                    setBetaFormError(err?.message || 'Sign in with Apple failed.');
                  } finally {
                    setIsAuthSubmitting(false);
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 py-2.5 px-3 font-bold shadow transition disabled:opacity-50"
              >
                <span></span>
                <span>Sign in with Apple</span>
              </button>

              <button
                type="button"
                disabled={isAuthSubmitting}
                onClick={async () => {
                  setBetaFormError(null);
                  setIsAuthSubmitting(true);
                  try {
                    const fbUser = await signInWithGoogleFirebase();
                    const fName = fbUser.firstName || 'Google';
                    const lName = fbUser.lastName || 'User';
                    const cleanPersona = createScratchStarterPersona({
                      firstName: fName,
                      lastName: lName,
                      email: fbUser.email,
                      phone: fbUser.phoneNumber || '',
                    });
                    const cleanCard = createScratchStarterCard({
                      firstName: fName,
                      lastName: lName,
                      email: fbUser.email,
                      phone: fbUser.phoneNumber || '',
                    });
                    setPersonas([cleanPersona]);
                    setActivePersonaId(cleanPersona.id);
                    setCards([cleanCard]);
                    setActiveCardId(cleanCard.id);
                    setIsBetaScratchOnboardingOpen(false);
                  } catch (err: any) {
                    setBetaFormError(err?.message || 'Google Sign-In failed.');
                  } finally {
                    setIsAuthSubmitting(false);
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 text-white hover:bg-slate-800 py-2.5 px-3 font-bold transition disabled:opacity-50"
              >
                <span className="font-serif font-extrabold text-cyan-400">G</span>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Sign Up (Register) vs Log In Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthTabMode('signon');
                  setBetaFormError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-lg font-bold transition ${
                  authTabMode === 'signon'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up (New User)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTabMode('signin');
                  setBetaFormError(null);
                  setAuthSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-lg font-bold transition ${
                  authTabMode === 'signin'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Log In (Existing User)
              </button>
            </div>

            {betaFormError && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
                {betaFormError}
              </div>
            )}

            {authSuccessMessage && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs text-emerald-200">
                {authSuccessMessage}
              </div>
            )}

            {authTabMode === 'signon' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      First Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={betaForm.firstName}
                      onChange={(e) => setBetaForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="e.g. Marco"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Last Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="family-name"
                      value={betaForm.lastName}
                      onChange={(e) => setBetaForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="e.g. Rossi"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={betaForm.personalEmail}
                      onChange={(e) =>
                        setBetaForm((prev) => ({ ...prev, personalEmail: e.target.value }))
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={betaForm.personalPhone}
                      onChange={(e) =>
                        setBetaForm((prev) => ({ ...prev, personalPhone: e.target.value }))
                      }
                      placeholder="+1 555 019 2831"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-300">
                        Password (6+ chars) <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword((prev) => !prev)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        {showAuthPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={authPasswordInput}
                      onChange={(e) => setAuthPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={authConfirmPasswordInput}
                      onChange={(e) => setAuthConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBetaScratchOnboardingOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', window.location.pathname);
                      }
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isAuthSubmitting}
                    onClick={async () => {
                      const fName = betaForm.firstName.trim();
                      const lName = betaForm.lastName.trim();
                      const pEmail = betaForm.personalEmail.trim();
                      const pPhone = betaForm.personalPhone.trim();
                      const pwd = authPasswordInput;
                      const confirmPwd = authConfirmPasswordInput;

                      if (!fName || !lName || !pEmail || !pwd) {
                        setBetaFormError(
                          'Please enter your First Name, Last Name, Email Address, and Password to create your account.'
                        );
                        return;
                      }
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail)) {
                        setBetaFormError('Please enter a valid email address.');
                        return;
                      }
                      if (pwd.length < 6) {
                        setBetaFormError('Your password must be at least 6 characters long.');
                        return;
                      }
                      if (pwd !== confirmPwd) {
                        setBetaFormError('Passwords do not match. Please verify your password confirmation.');
                        return;
                      }

                      setBetaFormError(null);
                      setAuthSuccessMessage(null);
                      setIsAuthSubmitting(true);
                      try {
                        const fbUser = await registerWithFirebaseEmail({
                          email: pEmail,
                          password: pwd,
                          firstName: fName,
                          lastName: lName,
                          phone: pPhone || undefined,
                        });
                        const fullName = `${fName} ${lName}`.trim();

                        safeSetLocalStorage(
                          'youconnect_registered_account_v1',
                          JSON.stringify({
                            uid: fbUser.uid,
                            firstName: fName,
                            lastName: lName,
                            fullName,
                            email: pEmail,
                            phone: pPhone,
                            registeredAt: new Date().toISOString(),
                          })
                        );
                        safeSetLocalStorage('youconnect_clean_reg_migrated_v3', 'true');
                        safeSetLocalStorage('youconnect_clean_card_migrated_v3', 'true');

                        const cleanPersona = createScratchStarterPersona({
                          firstName: fName,
                          lastName: lName,
                          email: pEmail,
                          phone: pPhone,
                        });
                        const cleanCard = createScratchStarterCard({
                          firstName: fName,
                          lastName: lName,
                          email: pEmail,
                          phone: pPhone,
                        });

                        setPersonas([cleanPersona]);
                        setActivePersonaId(cleanPersona.id);
                        setCards([cleanCard]);
                        setActiveCardId(cleanCard.id);
                        setContacts([]);
                        setAuthPasswordInput('');
                        setAuthConfirmPasswordInput('');

                        setIsBetaScratchOnboardingOpen(false);
                        if (typeof window !== 'undefined') {
                          window.history.replaceState(null, '', window.location.pathname);
                        }
                      } catch (err: any) {
                        setBetaFormError(err?.message || 'Registration failed.');
                      } finally {
                        setIsAuthSubmitting(false);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {isAuthSubmitting ? 'Creating Account...' : 'Create Account with Email & Password'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={signInEmailInput}
                      onChange={(e) => setSignInEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-300">
                        Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowAuthPassword((prev) => !prev)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-white"
                        >
                          {showAuthPassword ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const em = signInEmailInput.trim();
                            if (!em) {
                              setBetaFormError('Please enter your Email Address above first, then tap Forgot Password.');
                              return;
                            }
                            setBetaFormError(null);
                            setAuthSuccessMessage(null);
                            try {
                              const res = await sendFirebasePasswordReset(em);
                              setAuthSuccessMessage(res.message);
                            } catch (err: any) {
                              setBetaFormError(err?.message || 'Could not send password reset email.');
                            }
                          }}
                          className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={authPasswordInput}
                      onChange={(e) => setAuthPasswordInput(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsBetaScratchOnboardingOpen(false)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isAuthSubmitting}
                    onClick={async () => {
                      const em = signInEmailInput.trim();
                      const pwd = authPasswordInput;
                      if (!em || !pwd) {
                        setBetaFormError('Please enter both your Email Address and Password to Log In.');
                        return;
                      }
                      setBetaFormError(null);
                      setAuthSuccessMessage(null);
                      setIsAuthSubmitting(true);
                      try {
                        const fbUser = await signInWithFirebaseEmail({
                          email: em,
                          password: pwd,
                          phone: signInPhoneInput.trim() || undefined,
                        });

                        // Try restoring cloud snapshot from Firestore first
                        const cloudSnapshot = await fetchUserSnapshotFromFirestore(fbUser.uid);
                        if (cloudSnapshot?.personas?.length && cloudSnapshot?.cards?.length) {
                          setPersonas(cloudSnapshot.personas);
                          setActivePersonaId(cloudSnapshot.personas[0].id);
                          setCards(cloudSnapshot.cards);
                          setActiveCardId(cloudSnapshot.cards[0].id);
                          if (Array.isArray(cloudSnapshot.contacts)) {
                            setContacts(cloudSnapshot.contacts);
                          }
                          if (cloudSnapshot.subscription) {
                            const localSub = normalizeSubscriptionState(subscriptionRef.current);
                            const cloudSub = normalizeSubscriptionState(cloudSnapshot.subscription);
                            const mergedSub = normalizeSubscriptionState({
                              ...cloudSub,
                              dailyCoinsUsed:
                                cloudSub.dailyQuotaDate === localSub.dailyQuotaDate
                                  ? Math.max(localSub.dailyCoinsUsed, cloudSub.dailyCoinsUsed)
                                  : cloudSub.dailyCoinsUsed,
                              weeklyRadarSessionsUsed:
                                cloudSub.radarWeekStartDate === localSub.radarWeekStartDate
                                  ? Math.max(
                                      localSub.weeklyRadarSessionsUsed,
                                      cloudSub.weeklyRadarSessionsUsed
                                    )
                                  : cloudSub.weeklyRadarSessionsUsed,
                              totalCoinsConsumedLifetime: Math.max(
                                localSub.totalCoinsConsumedLifetime || 0,
                                cloudSub.totalCoinsConsumedLifetime || 0
                              ),
                            });
                            subscriptionRef.current = mergedSub;
                            safeSetLocalStorage(
                              'youconnect_subscription_v1',
                              JSON.stringify(mergedSub)
                            );
                            setSubscription(mergedSub);
                          }
                        } else {
                          let savedAcc: any = null;
                          try {
                            const raw = localStorage.getItem('youconnect_registered_account_v1');
                            if (raw) savedAcc = JSON.parse(raw);
                          } catch {
                            // ignore
                          }
                          const fName =
                            fbUser.firstName ||
                            savedAcc?.firstName ||
                            currentProfile.personalData?.firstName ||
                            currentProfile.firstName ||
                            currentProfile.name.split(' ')[0] ||
                            'Verified';
                          const lName =
                            fbUser.lastName ||
                            savedAcc?.lastName ||
                            currentProfile.personalData?.lastName ||
                            currentProfile.lastName ||
                            currentProfile.name.split(' ').slice(1).join(' ') ||
                            'User';
                          const ph =
                            fbUser.phoneNumber ||
                            savedAcc?.phone ||
                            currentProfile.personalData?.phone ||
                            currentProfile.phone ||
                            '';
                          const fullName = `${fName} ${lName}`.trim();

                          setPersonas((prev) =>
                            prev.map((p) => ({
                              ...p,
                              name: fullName,
                              firstName: fName,
                              lastName: lName,
                              email: em,
                              phone: ph,
                              personalData: {
                                ...(p.personalData || { phone: ph, email: em, socials: {} }),
                                firstName: fName,
                                lastName: lName,
                                fullName,
                                email: em,
                                phone: ph,
                              },
                            }))
                          );
                        }

                        setAuthPasswordInput('');
                        setIsBetaScratchOnboardingOpen(false);
                      } catch (err: any) {
                        setBetaFormError(err?.message || 'Log-In failed.');
                      } finally {
                        setIsAuthSubmitting(false);
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {isAuthSubmitting ? 'Logging In...' : 'Log In with Email & Password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
