import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  MasterProfile,
  DigitalCard,
  CardTheme,
  CardLayoutMode,
  CardFontPairing,
  CardContentLayout,
  CardLogoPosition,
  CardLogoSize,
  CRMContact,
  PortfolioItem,
} from '../types';
import { generateVCardString, downloadVCard } from '../utils/vcard';
import { getCardPublicUrl, getCardDisplayUrl, publishCardToServer } from '../utils/urlHelper';
import {
  MAJOR_SOCIAL_PLATFORMS,
  getProfileSocialValue,
  getFullSocialUrl,
  getFilledSocialAccounts,
  getPlatformConfig,
  isSocialAccountVisible,
} from '../data/socialRegistry';
import {
  ShieldCheck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Download,
  Copy,
  Check,
  Calendar,
  Send,
  Sparkles,
  Radio,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Clock,
  Play,
  Video,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Zap,
  Award,
  Box,
  GraduationCap,
  Palette,
  Trophy,
  Heart,
  RotateCcw,
  User,
} from 'lucide-react';
import { getVideoEmbedUrl } from '../utils/mediaHelper';

interface DigitalCardRendererProps {
  profile: MasterProfile;
  card: DigitalCard;
  onUpdateCard?: (updated: DigitalCard) => void;
  onAddContactToCRM?: (contact: CRMContact) => void;
  interactive?: boolean;
  initialLayout?: CardLayoutMode;
  onSelectTheme?: (theme: CardTheme) => void;
  showRecipientActions?: boolean;
  recipientMode?: boolean;
  onOpenImageHub?: (section?: 'portrait' | 'background') => void;
}

export const DigitalCardRenderer: React.FC<DigitalCardRendererProps> = ({
  profile: baseProfile,
  card,
  onUpdateCard,
  onAddContactToCRM,
  interactive = true,
  initialLayout = 'card_3d',
  showRecipientActions = false,
  recipientMode = false,
  onOpenImageHub,
}) => {
  // Support card-level identity overrides (populated from Identity Settings on card creation, editable per card)
  const resolvedHolderName =
    card.holderFullName?.trim() ||
    [card.holderFirstName?.trim(), card.holderLastName?.trim()].filter(Boolean).join(' ').trim() ||
    baseProfile.name;
  const resolvedHolderEmail = card.holderEmail?.trim() || baseProfile.email;
  const resolvedHolderPhone = card.holderPhone?.trim() || baseProfile.phone;

  const profile: MasterProfile = useMemo(
    () => ({
      ...baseProfile,
      name: resolvedHolderName,
      firstName: card.holderFirstName?.trim() || baseProfile.firstName,
      lastName: card.holderLastName?.trim() || baseProfile.lastName,
      email: resolvedHolderEmail,
      phone: resolvedHolderPhone,
      personalData: baseProfile.personalData
        ? {
            ...baseProfile.personalData,
            fullName: resolvedHolderName,
            firstName: card.holderFirstName?.trim() || baseProfile.personalData.firstName,
            lastName: card.holderLastName?.trim() || baseProfile.personalData.lastName,
            email: card.holderEmail?.trim() || baseProfile.personalData.email,
            phone: card.holderPhone?.trim() || baseProfile.personalData.phone,
          }
        : undefined,
      workData: baseProfile.workData
        ? {
            ...baseProfile.workData,
            email: card.holderEmail?.trim() || baseProfile.workData.email,
            phone: card.holderPhone?.trim() || baseProfile.workData.phone,
          }
        : undefined,
    }),
    [
      baseProfile,
      resolvedHolderName,
      resolvedHolderEmail,
      resolvedHolderPhone,
      card.holderFirstName,
      card.holderLastName,
      card.holderEmail,
      card.holderPhone,
    ]
  );

  // Layout mode: 'card_3d' | 'story_deck' | 'wallet_pass' (recipients cannot access 'wallet_pass')
  const resolveValidLayout = (mode?: string): CardLayoutMode => {
    if (mode === 'story_deck') return 'story_deck';
    if (!recipientMode && mode === 'wallet_pass') return 'wallet_pass';
    return 'card_3d';
  };

  const [layoutMode, setLayoutMode] = useState<CardLayoutMode>(
    resolveValidLayout(card.preferredLayout || initialLayout)
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [walletNotice, setWalletNotice] = useState<string | null>(null);

  // Sync when preferredLayout or recipientMode changes
  useEffect(() => {
    setLayoutMode((prev) => {
      if (recipientMode && prev === 'wallet_pass') return 'card_3d';
      if (card.preferredLayout) return resolveValidLayout(card.preferredLayout);
      return prev;
    });
    if (recipientMode && isFlipped) {
      setIsFlipped(false);
    }
  }, [card.preferredLayout, recipientMode, isFlipped]);

  // Multi-Plane Field Depth disabled for full-card chassis, while 3D Silhouette Stage uses optical field depth
  const parallaxEnabled = false;

  // Effective card avatar: uses card-specific portrait if customized, falling back to master profile avatar
  const effectiveAvatarUrl = card.avatarUrl || profile.avatarUrl;

  // 3D Photorealistic Silhouette & Spatial Depth Stage State
  const [silhouetteCutoutUrl, setSilhouetteCutoutUrl] = useState<string>(card.silhouetteCutoutUrl || effectiveAvatarUrl);
  const [portrait3DStageUrl, setPortrait3DStageUrl] = useState<string>('');

  useEffect(() => {
    setSilhouetteCutoutUrl(card.silhouetteCutoutUrl || effectiveAvatarUrl);
  }, [card.silhouetteCutoutUrl, effectiveAvatarUrl]);

  // Story Deck Slide State (0 = Identity, 1 = Spotlight, 2 = Beyond & Portfolio)
  const [storySlide, setStorySlide] = useState<number>(0);
  const [slide3Tab, setSlide3Tab] = useState<'passions' | 'education' | 'portfolio'>('passions');
  const [activePortfolioItem, setActivePortfolioItem] = useState<PortfolioItem | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Live Time-Zone Clock State
  const [holderLocalTime, setHolderLocalTime] = useState<string>('');

  const isKycVerified = Boolean(
    profile.isVerified &&
      profile.kycVerification?.isCompleted &&
      profile.kycVerification?.traceabilityId
  );

  const livePresence = card.livePresence || {
    enabled: true,
    statusText: isKycVerified ? `Verified Identity · ${card.name}` : `Active Profile · ${card.name}`,
    availability: 'available' as const,
    timezone: 'America/Los_Angeles',
  };

  // Ensure legacy visitor-oriented strings ("Available for Direct Connection", "Ask me about...") never show on user's own profile
  const rawStatusText = livePresence.statusText || '';
  const ownerStatusText =
    !rawStatusText ||
    rawStatusText.toLowerCase().includes('available for direct connection') ||
    rawStatusText.toLowerCase().includes('ask me') ||
    (!isKycVerified && rawStatusText.toLowerCase().includes('verified identity'))
      ? isKycVerified
        ? `Verified Identity · ${card.name}`
        : `Active Profile · ${card.name}`
      : rawStatusText;

  const storySpotlight = card.storySpotlight || {
    title: `${profile.workData?.company || profile.company} — Profile Overview`,
    subtitle: profile.workData?.bio || profile.bio || card.customTagline || profile.headline,
    badge: 'PROFILE HIGHLIGHTS',
    metricLabel: isKycVerified ? 'KYC Registered Identity' : 'Profile Status',
    metricValue: isKycVerified ? 'KYC Verified' : 'Standard',
  };

  useEffect(() => {
    const updateClocks = () => {
      try {
        const now = new Date();
        const tz = livePresence.timezone || 'America/Los_Angeles';
        const formattedHolder = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(now);
        setHolderLocalTime(formattedHolder);
      } catch {
        setHolderLocalTime('Local Time Active');
      }
    };
    updateClocks();
    const timer = setInterval(updateClocks, 30000);
    return () => clearInterval(timer);
  }, [livePresence.timezone]);

  // Reciprocal Lead-Capture Exchange State
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  });
  const [exchangeSubmitted, setExchangeSubmitted] = useState(false);

  // Dynamic QR Code generation for Card Back and Barcodes
  useEffect(() => {
    let cancelled = false;
    async function makeQR() {
      try {
        const publicUrl = getCardPublicUrl(card);
        const textToEncode = card.qrMode === 'vcard' ? generateVCardString(profile, card) : publicUrl;

        const url = await QRCode.toDataURL(textToEncode, {
          width: 320,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) {
          setQrDataUrl((prev) => (prev === url ? prev : url));
          if (!recipientMode) {
            publishCardToServer(card, profile);
          }
        }
      } catch (err) {
        console.error('Failed to generate card QR:', err);
      }
    }
    makeQR();
    return () => {
      cancelled = true;
    };
  }, [profile, card, recipientMode]);

  // Trigger Icebreaker conversation
  const handleOpenIcebreaker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExchangeForm((prev) => ({
      ...prev,
      notes: livePresence.icebreakerPrompt
        ? `Re: "${livePresence.icebreakerPrompt}" — Let's connect!`
        : prev.notes,
    }));
    setIsExchangeOpen(true);
  };

  // Handle Reciprocal Submit
  const handleReciprocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeForm.name.trim() || !exchangeForm.email.trim()) return;

    if (onAddContactToCRM) {
      const newContact: CRMContact = {
        id: `c-reciprocal-${Date.now()}`,
        name: exchangeForm.name.trim(),
        role: 'Mutual Connection',
        company: exchangeForm.company.trim() || 'Networking Contact',
        email: exchangeForm.email.trim(),
        phone: exchangeForm.phone.trim(),
        notes: `Reciprocally shared details via digital card "${card.name}". ${exchangeForm.notes}`,
        source: 'qr',
        status: 'new',
        tags: ['Reciprocal Exchange', card.tag || 'Digital Card'],
        createdAt: new Date().toISOString(),
      };
      onAddContactToCRM(newContact);
    }

    setExchangeSubmitted(true);
    setTimeout(() => {
      setExchangeSubmitted(false);
      setIsExchangeOpen(false);
      setExchangeForm({ name: '', email: '', phone: '', company: '', notes: '' });
    }, 2000);
  };

  const handleCopyPublicLink = () => {
    const url = getCardPublicUrl(card);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadVCF = () => {
    const vcardStr = generateVCardString(profile, card);
    downloadVCard(`${profile.name}_${card.name}`, vcardStr);
  };

  // Modern & Young + Classy Business Theme Design Tokens
  const getThemeConfig = (theme: CardTheme) => {
    switch (theme) {
      case 'scuderia_corsa':
        return {
          containerClass:
            'bg-gradient-to-br from-[#881337] via-[#4C0519] to-[#1F030B] text-rose-50 border-[#F43F5E]/80 shadow-2xl shadow-rose-950/70 ring-1 ring-[#FB7185]/45',
          accentText: 'text-[#FDA4AF]',
          accentBg: 'bg-[#E11D48]/25 text-rose-100 border-[#FB7185]/50',
          chipColor: 'gold' as const,
          cardTexture: 'forged_carbon',
          subtleText: 'text-rose-100/80',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#E11D48]/35 via-[#881337]/30 to-[#F43F5E]/20',
          isLight: false,
        };
      case 'milano_saffiano':
        return {
          containerClass:
            'bg-gradient-to-br from-[#18181B] via-[#0F0F12] to-[#050507] text-zinc-100 border-zinc-400/75 shadow-2xl shadow-black ring-1 ring-white/25',
          accentText: 'text-zinc-100',
          accentBg: 'bg-zinc-900/90 text-zinc-100 border-zinc-400/50',
          chipColor: 'silver' as const,
          cardTexture: 'saffiano_leather',
          subtleText: 'text-zinc-400',
          fontFamily: 'font-serif',
          headerGradient: 'from-zinc-400/20 via-zinc-800/40 to-black/60',
          isLight: false,
        };
      case 'firenze_heritage':
        return {
          containerClass:
            'bg-gradient-to-br from-[#064E3B] via-[#043627] to-[#021E16] text-emerald-50 border-[#D4AF37]/85 shadow-2xl shadow-emerald-950/75 ring-1 ring-[#D4AF37]/45',
          accentText: 'text-[#FDE68A]',
          accentBg: 'bg-[#065F46]/50 text-[#FDE68A] border-[#D4AF37]/55',
          chipColor: 'gold' as const,
          cardTexture: 'equestrian_stripe',
          subtleText: 'text-emerald-100/80',
          fontFamily: 'font-serif',
          headerGradient: 'from-[#059669]/35 via-[#D4AF37]/15 to-[#064E3B]/50',
          isLight: false,
        };
      case 'tailored_boss':
        return {
          containerClass:
            'bg-gradient-to-br from-[#F5EFE6] via-[#E8DCCB] to-[#D6C3AC] text-[#1C1613] border-[#785A3C]/75 shadow-2xl shadow-stone-900/30 ring-1 ring-[#785A3C]/30',
          accentText: 'text-[#5C3A1D] font-bold',
          accentBg: 'bg-[#451A03]/12 text-[#2E1605] border-[#785A3C]/50',
          chipColor: 'bronze' as const,
          cardTexture: 'tailored_pinstripe',
          subtleText: 'text-[#4A3B30]',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#FAF6F0]/70 via-[#E8DCCB]/45 to-[#C7AF94]/50',
          isLight: true,
        };
      case 'paris_sellier':
        return {
          containerClass:
            'bg-gradient-to-br from-[#FB7185] via-[#E11D48] to-[#881337] text-white border-[#FDE047]/80 shadow-2xl shadow-rose-950/65 ring-1 ring-rose-300/50',
          accentText: 'text-[#FEF08A]',
          accentBg: 'bg-white/15 text-white border-rose-200/55',
          chipColor: 'gold' as const,
          cardTexture: 'sunset',
          subtleText: 'text-rose-100/90',
          fontFamily: 'font-sans',
          headerGradient: 'from-amber-300/35 via-rose-500/30 to-fuchsia-600/30',
          isLight: false,
        };
      case 'forged_carbon':
        return {
          containerClass:
            'bg-gradient-to-br from-[#14151a] via-[#0c0d10] to-[#050507] text-amber-50 border-[#D4AF37]/80 shadow-2xl shadow-amber-500/20 ring-1 ring-[#D4AF37]/40',
          accentText: 'text-[#D4AF37]',
          accentBg: 'bg-[#D4AF37]/15 text-amber-200 border-[#D4AF37]/50',
          chipColor: 'gold' as const,
          cardTexture: 'forged_carbon',
          subtleText: 'text-zinc-300',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#D4AF37]/30 to-zinc-800/40',
          isLight: false,
        };
      case 'brushed_titanium':
        return {
          containerClass:
            'bg-gradient-to-br from-[#475569] via-[#334155] to-[#1E293B] text-slate-50 border-slate-300/80 shadow-2xl shadow-slate-950/75 ring-1 ring-white/35',
          accentText: 'text-sky-200',
          accentBg: 'bg-slate-800/60 text-slate-100 border-slate-300/55',
          chipColor: 'silver' as const,
          cardTexture: 'anodized_titanium',
          subtleText: 'text-slate-200/90',
          fontFamily: 'font-sans',
          headerGradient: 'from-slate-200/30 to-sky-400/20',
          isLight: false,
        };
      case 'gold_bullion':
        return {
          containerClass:
            'bg-gradient-to-br from-[#FCF7E8] via-[#F3E5AB] to-[#DFC478] text-[#261905] border-[#B48327]/80 shadow-2xl shadow-amber-900/25 ring-1 ring-[#B48327]/40',
          accentText: 'text-[#78350F] font-bold',
          accentBg: 'bg-[#78350F]/12 text-[#451A03] border-[#B48327]/60',
          chipColor: 'gold' as const,
          cardTexture: 'gold_leaf',
          subtleText: 'text-[#573A12]',
          fontFamily: 'font-serif',
          headerGradient: 'from-[#FFFBEB]/65 to-[#D4AF37]/30',
          isLight: true,
        };
      case 'frosted_glass':
        return {
          containerClass:
            'bg-gradient-to-br from-[#FFFFFF] via-[#F1F5F9] to-[#E2E8F0] text-slate-900 border-sky-400/85 shadow-2xl shadow-sky-900/20 ring-1 ring-white',
          accentText: 'text-sky-700 font-bold',
          accentBg: 'bg-sky-500/12 text-sky-950 border-sky-500/45',
          chipColor: 'silver' as const,
          cardTexture: 'glassmorphism',
          subtleText: 'text-slate-600',
          fontFamily: 'font-sans',
          headerGradient: 'from-sky-300/40 via-indigo-200/30 to-white/75',
          isLight: true,
        };
      case 'swiss_editorial':
        return {
          containerClass:
            'bg-gradient-to-br from-[#FDFBF7] via-[#F5F0E6] to-[#E8E0D0] text-stone-900 border-[#B48327]/75 shadow-2xl shadow-stone-900/20 ring-1 ring-stone-900/10',
          accentText: 'text-[#78350F] font-bold',
          accentBg: 'bg-stone-900/10 text-stone-800 border-[#B48327]/50',
          chipColor: 'gold' as const,
          cardTexture: 'paper',
          subtleText: 'text-stone-600',
          fontFamily: 'font-serif',
          headerGradient: 'from-stone-200/50 to-amber-100/35',
          isLight: true,
        };
      case 'royal_navy':
        return {
          containerClass:
            'bg-gradient-to-br from-[#0F2952] via-[#0A1D3B] to-[#051024] text-white border-[#D4AF37]/85 shadow-2xl shadow-blue-950/75 ring-1 ring-[#D4AF37]/40',
          accentText: 'text-[#FDE68A]',
          accentBg: 'bg-[#D4AF37]/20 text-amber-100 border-[#D4AF37]/55',
          chipColor: 'gold' as const,
          cardTexture: 'brushed_metal',
          subtleText: 'text-blue-100/85',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#D4AF37]/25 via-blue-600/25 to-indigo-900/40',
          isLight: false,
        };
      case 'emerald_luxury':
        return {
          containerClass:
            'bg-gradient-to-br from-[#064E3B] via-[#0F2926] to-[#090D16] text-emerald-50 border-[#10B981]/85 shadow-2xl shadow-emerald-950/70 ring-1 ring-[#34D399]/50',
          accentText: 'text-[#6EE7B7]',
          accentBg: 'bg-[#10B981]/20 text-emerald-100 border-[#34D399]/55',
          chipColor: 'silver' as const,
          cardTexture: 'holographic',
          subtleText: 'text-emerald-100/80',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#34D399]/35 via-teal-500/25 to-cyan-500/20',
          isLight: false,
        };
      case 'bento_dark':
        return {
          containerClass:
            'bg-gradient-to-br from-[#18181B] via-[#101014] to-[#070709] text-white border-[#818CF8]/85 shadow-2xl shadow-indigo-950/70 ring-1 ring-[#6366F1]/50',
          accentText: 'text-[#A5B4FC]',
          accentBg: 'bg-[#6366F1]/20 text-indigo-100 border-[#818CF8]/55',
          chipColor: 'silver' as const,
          cardTexture: 'grid',
          subtleText: 'text-zinc-300',
          fontFamily: 'font-sans',
          headerGradient: 'from-indigo-500/35 via-violet-500/25 to-cyan-500/20',
          isLight: false,
        };
      case 'cyber':
        return {
          containerClass:
            'bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0F172A] text-cyan-50 border-[#22D3EE] shadow-2xl shadow-cyan-500/35 ring-1 ring-[#38BDF8]/65',
          accentText: 'text-[#67E8F9]',
          accentBg: 'bg-[#06B6D4]/25 text-cyan-100 border-[#22D3EE]/70',
          chipColor: 'silver' as const,
          cardTexture: 'holographic',
          subtleText: 'text-cyan-100/85',
          fontFamily: 'font-sans',
          headerGradient: 'from-cyan-400/40 via-sky-500/30 to-indigo-600/30',
          isLight: false,
        };
      case 'minimal':
        return {
          containerClass:
            'bg-zinc-950 text-zinc-100 border-zinc-600 shadow-2xl shadow-black ring-1 ring-zinc-700/50',
          accentText: 'text-zinc-200',
          accentBg: 'bg-zinc-800 text-zinc-300 border-zinc-600',
          chipColor: 'silver' as const,
          cardTexture: 'matte',
          subtleText: 'text-zinc-400',
          fontFamily: 'font-sans',
          headerGradient: 'from-zinc-800/40 to-zinc-900/40',
          isLight: false,
        };
      case 'creative':
        return {
          containerClass:
            'bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#1E1B4B] text-white border-[#E879F9]/85 shadow-2xl shadow-fuchsia-950/65 ring-1 ring-[#C084FC]/55',
          accentText: 'text-[#F5D0FE]',
          accentBg: 'bg-[#D946EF]/25 text-fuchsia-100 border-[#E879F9]/60',
          chipColor: 'silver' as const,
          cardTexture: 'holographic',
          subtleText: 'text-fuchsia-100/85',
          fontFamily: 'font-sans',
          headerGradient: 'from-fuchsia-500/40 via-violet-500/35 to-cyan-400/25',
          isLight: false,
        };
      case 'executive':
      default:
        return {
          containerClass:
            'bg-gradient-to-br from-[#18181B] via-[#111115] to-[#070709] text-amber-50 border-[#D4AF37]/90 shadow-2xl shadow-amber-500/20 ring-1 ring-[#D4AF37]/45',
          accentText: 'text-[#FDE68A]',
          accentBg: 'bg-[#D4AF37]/20 text-amber-100 border-[#D4AF37]/55',
          chipColor: 'gold' as const,
          cardTexture: 'brushed_titanium',
          subtleText: 'text-zinc-300',
          fontFamily: 'font-sans',
          headerGradient: 'from-[#D4AF37]/30 via-amber-500/15 to-zinc-900/40',
          isLight: false,
        };
    }
  };

  const baseThemeConfig = getThemeConfig(card.theme);
  const resolveFontClass = (pairing?: CardFontPairing, fallback?: string) => {
    switch (pairing) {
      case 'modern_sans':
        return 'font-card-sans';
      case 'editorial_serif':
        return 'font-card-serif';
      case 'architectural_grotesk':
        return 'font-card-grotesk';
      case 'couture_display':
        return 'font-card-couture';
      case 'technical_mono':
        return 'font-card-mono';
      case 'avant_syne':
        return 'font-card-syne';
      case 'classic_bodoni':
        return 'font-card-bodoni';
      case 'humanist_outfit':
        return 'font-card-outfit';
      case 'roman_cinzel':
        return 'font-card-cinzel';
      case 'cyber_sora':
        return 'font-card-sora';
      default:
        return fallback || 'font-card-sans';
    }
  };
  const cardFontClass = resolveFontClass(card.fontPairing, baseThemeConfig.fontFamily);
  const themeConfig = {
    ...baseThemeConfig,
    fontFamily: cardFontClass,
  };
  const pillSurfaceClass = themeConfig.isLight
    ? 'bg-white/80 hover:bg-white/95 border-stone-900/15 text-stone-900 shadow-xs'
    : 'bg-black/65 hover:bg-black/85 border-white/15 text-white';
  const boxSurfaceClass = themeConfig.isLight
    ? 'bg-white/75 border-stone-900/15 text-stone-900 shadow-xs'
    : 'bg-black/45 border-white/15 text-white';
  const darkPanelClass = themeConfig.isLight
    ? 'bg-white/85 border-stone-900/15 text-stone-900 shadow-sm'
    : 'bg-black/75 border-white/20 text-white';

  // Tactile Material Surface Texture Overlay (including Architectural & Luxury Maison finishes)
  const renderMaterialOverlay = (finish?: string) => {
    if (finish === 'none') return null;

    const activeFinish =
      finish ||
      (card.theme === 'forged_carbon' || card.theme === 'scuderia_corsa'
        ? 'forged_carbon'
        : card.theme === 'milano_saffiano' || card.theme === 'paris_sellier'
          ? 'saffiano_leather'
          : card.theme === 'firenze_heritage'
            ? 'equestrian_stripe'
            : card.theme === 'tailored_boss'
              ? 'tailored_pinstripe'
              : card.theme === 'brushed_titanium'
                ? 'anodized_titanium'
                : card.theme === 'gold_bullion'
                  ? 'gold_leaf'
                  : 'brushed_metal');

    switch (activeFinish) {
      case 'saffiano_leather':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            {/* Cross-Hatch Textured Leather Grain */}
            <div className="absolute inset-0 opacity-35 mix-blend-overlay bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(-45deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_5px)]" />
            <div
              className={`absolute inset-1.5 rounded-xl border border-dashed ${
                themeConfig.isLight ? 'border-stone-900/15' : 'border-white/15'
              }`}
            />
          </div>
        );
      case 'equestrian_stripe':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            {/* Heritage Ribbon Stripe (Emerald · White · Emerald) + Fine Grain */}
            <div className="absolute inset-y-0 right-7 w-7 opacity-45 flex shadow-sm">
              <div className="w-1/3 h-full bg-[#065F46]" />
              <div className="w-1/3 h-full bg-[#F8FAFC]" />
              <div className="w-1/3 h-full bg-[#065F46]" />
            </div>
            <div className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(#D4AF37_0.75px,transparent_0.75px)] [background-size:14px_14px]" />
            <div className="absolute inset-0 border border-[#D4AF37]/40 rounded-2xl" />
          </div>
        );
      case 'tailored_pinstripe':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            {/* Sartorial Pinstripe & Warm Camel Trim */}
            <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_18px,rgba(198,156,109,0.22)_18px,rgba(198,156,109,0.22)_19px)]" />
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-[#141416] via-[#F5F5F4] to-[#C69C6D] opacity-75" />
          </div>
        );
      case 'forged_carbon':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            <div className="absolute inset-0 opacity-45 mix-blend-overlay bg-[radial-gradient(ellipse_at_20%_30%,rgba(255,255,255,0.22)_0%,transparent_45%),radial-gradient(ellipse_at_80%_70%,rgba(212,175,55,0.2)_0%,transparent_50%),repeating-conic-gradient(from_45deg_at_50%_50%,rgba(255,255,255,0.05)_0deg_15deg,transparent_15deg_30deg)] [background-size:100%_100%,100%_100%,28px_28px]" />
            {card.theme === 'scuderia_corsa' && (
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#009246] via-[#FFFFFF] to-[#CE2B37] opacity-85" />
            )}
            <div className="absolute inset-0 border border-[#D4AF37]/30 rounded-2xl shadow-[inset_0_1px_1px_rgba(212,175,55,0.35)]" />
          </div>
        );
      case 'anodized_titanium':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            <div className="absolute inset-0 opacity-60 mix-blend-overlay bg-[linear-gradient(125deg,rgba(255,255,255,0.25)_0%,transparent_30%,rgba(255,255,255,0.3)_50%,transparent_70%,rgba(255,255,255,0.18)_100%)]" />
            <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_1px,rgba(255,255,255,0.05)_1px,rgba(255,255,255,0.05)_2px)]" />
          </div>
        );
      case 'gold_leaf':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0">
            <div className="absolute inset-0 opacity-35 mix-blend-color-dodge bg-[radial-gradient(#D4AF37_0.75px,transparent_0.75px),radial-gradient(#FDE68A_0.75px,transparent_0.75px)] [background-size:28px_28px] [background-position:0_0,14px_14px]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(212,175,55,0.18)_0%,transparent_45%,rgba(253,230,138,0.15)_100%)]" />
          </div>
        );
      case 'brushed_metal':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden opacity-45 mix-blend-overlay z-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_0%,transparent_25%,rgba(255,255,255,0.25)_50%,transparent_75%,rgba(255,255,255,0.18)_100%)]" />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.04)_2px,rgba(255,255,255,0.04)_4px)]" />
          </div>
        );
      case 'frosted_glass':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden backdrop-blur-md bg-white/[0.04] border-t border-white/30 z-0" />
        );
      case 'tactile_paper':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden opacity-[0.06] mix-blend-multiply bg-[radial-gradient(#44403c_0.75px,transparent_0.75px)] [background-size:12px_12px] z-0" />
        );
      case 'holographic':
        return (
          <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden opacity-40 mix-blend-color-dodge bg-[linear-gradient(115deg,transparent_15%,rgba(255,0,128,0.25)_35%,rgba(0,255,255,0.25)_55%,rgba(255,255,0,0.2)_75%,transparent_90%)] z-0" />
        );
      case 'matte':
      default:
        return (
          <div
            className={`absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-0 ${
              themeConfig.isLight
                ? 'opacity-25 shadow-[inset_0_0_40px_rgba(120,113,108,0.15)]'
                : 'opacity-30 shadow-[inset_0_0_80px_rgba(0,0,0,0.6)]'
            }`}
          />
        );
    }
  };

  // Multi-Plane 3D Chassis & Recessed Depth Well (replaces cursor glare with true Z-axis field depth)
  const render3DChassisPlanes = () => {
    if (!parallaxEnabled) return null;
    return (
      <>
        {/* Deep Ambient Floor Shadow Plane (-32px Z) */}
        <div
          className="absolute inset-2 rounded-3xl pointer-events-none transition-all duration-500"
          style={{
            transform: 'translateZ(-32px) translateX(14px) translateY(18px)',
            background: themeConfig.isLight ? 'rgba(28, 25, 23, 0.28)' : 'rgba(0, 0, 0, 0.72)',
            filter: 'blur(22px)',
          }}
        />
        {/* Extruded Rear Metallic Chassis Layer (-18px Z) */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none border transition-all duration-500"
          style={{
            transform: 'translateZ(-18px) translateX(7px) translateY(9px)',
            borderColor: `${card.accentColor}55`,
            background: themeConfig.isLight
              ? 'linear-gradient(135deg, rgba(214,211,209,0.95) 0%, rgba(168,162,158,0.98) 100%)'
              : 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(5,7,12,0.98) 100%)',
            boxShadow: themeConfig.isLight
              ? '0 12px 24px rgba(28,25,23,0.22)'
              : '0 14px 28px rgba(0,0,0,0.8)',
          }}
        />
        {/* Mid-Chassis Bevel Rim Layer (-9px Z) */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none border transition-all duration-500"
          style={{
            transform: 'translateZ(-9px) translateX(3.5px) translateY(4.5px)',
            borderColor: `${card.accentColor}88`,
            background: themeConfig.isLight
              ? 'linear-gradient(135deg, rgba(245,245,244,0.9) 0%, rgba(214,211,209,0.95) 100%)'
              : 'linear-gradient(135deg, rgba(30,41,59,0.75) 0%, rgba(10,14,23,0.9) 100%)',
          }}
        />
        {/* Recessed Inner Depth Well Frame (0px Z with subtle inset shadow) */}
        <div
          className={`absolute inset-2.5 rounded-xl pointer-events-none border ${
            themeConfig.isLight
              ? 'border-stone-900/10 shadow-[inset_0_4px_14px_rgba(28,25,23,0.07)]'
              : 'border-white/10 shadow-[inset_0_12px_28px_rgba(0,0,0,0.85)]'
          }`}
          style={{
            transform: 'translateZ(2px)',
          }}
        />
      </>
    );
  };

  // Availability Pulse Badge Color Helper
  const getPresenceBadgeStyle = () => {
    switch (livePresence.availability) {
      case 'deep_work':
        return {
          dot: 'bg-purple-400',
          pill: 'bg-purple-950/75 border-purple-500/40 text-purple-200',
          label: 'Deep Focus',
        };
      case 'event':
        return {
          dot: 'bg-amber-400',
          pill: 'bg-amber-950/75 border-amber-500/40 text-amber-200',
          label: 'Live Event',
        };
      case 'traveling':
        return {
          dot: 'bg-cyan-400',
          pill: 'bg-cyan-950/75 border-cyan-500/40 text-cyan-200',
          label: 'In Transit',
        };
      case 'do_not_disturb':
        return {
          dot: 'bg-rose-500',
          pill: 'bg-rose-950/80 border-rose-500/50 text-rose-200',
          label: 'Do Not Disturb',
        };
      case 'available':
      default:
        return {
          dot: 'bg-emerald-400',
          pill: 'bg-emerald-950/75 border-emerald-500/40 text-emerald-200',
          label: 'Available',
        };
    }
  };

  const presenceStyle = getPresenceBadgeStyle();
  const activeContentLayout: CardContentLayout = card.contentLayout || 'executive_left';

  const companyLogo = card.companyLogoUrl || profile.workData?.companyLogoUrl || profile.companyLogoUrl;
  const logoPlacement: CardLogoPosition = card.logoPlacement || 'top_right';
  const logoSize: CardLogoSize = card.logoSize || 'standard';
  const showLogoWatermark = card.logoWatermark !== false && Boolean(companyLogo) && card.visibleFields.companyLogo !== false;

  const getLogoSizeClasses = (size: CardLogoSize = 'standard') => {
    switch (size) {
      case 'prominent':
        return {
          img: 'max-h-11 sm:max-h-12 max-w-[130px]',
          container: 'px-3 py-1.5 min-h-[48px] min-w-[56px]',
        };
      case 'compact':
        return {
          img: 'max-h-6 max-w-[80px]',
          container: 'px-2 py-1 min-h-[32px] min-w-[36px]',
        };
      case 'standard':
      default:
        return {
          img: 'max-h-8 sm:max-h-9 max-w-[105px]',
          container: 'px-2.5 py-1 min-h-[38px] min-w-[44px]',
        };
    }
  };
  const logoSizeClasses = getLogoSizeClasses(logoSize);

  const coverBanner = card.coverBannerUrl;
  const is3DSilhouetteStage = false;
  const stageEnvironmentUrl = coverBanner;
  const videoIntro = card.videoIntroUrl || profile.videoIntroUrl;
  const videoInfo = getVideoEmbedUrl(videoIntro);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Portrait Cutout Framing & Interactive Drag-to-Position Engine (All Layouts)
  const avatarOffsetX = typeof card.avatarOffsetX === 'number' ? card.avatarOffsetX : 50;
  const avatarOffsetY = typeof card.avatarOffsetY === 'number' ? card.avatarOffsetY : 18;
  const avatarZoom = typeof card.avatarZoom === 'number' ? card.avatarZoom : 1;

  const renderFramedPortrait = (
    frameClassName: string,
    extraFrameStyle?: React.CSSProperties,
    badgeElement?: React.ReactNode
  ) => {
    return (
      <div
        className={`group/portrait relative overflow-hidden select-none ${frameClassName} ${
          onOpenImageHub && !recipientMode ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400/80 transition-all' : ''
        }`}
        style={extraFrameStyle}
        title={onOpenImageHub && !recipientMode ? `Click to open Photo Hub · ${profile.name}` : profile.name}
        onClick={(e) => {
          if (onOpenImageHub && !recipientMode) {
            e.stopPropagation();
            onOpenImageHub('portrait');
          }
        }}
      >
        {effectiveAvatarUrl ? (
          <img
            src={effectiveAvatarUrl}
            alt={profile.name}
            draggable={false}
            className="w-full h-full object-cover pointer-events-none transition-transform duration-75"
            style={{
              objectPosition: `${avatarOffsetX}% ${avatarOffsetY}%`,
              transform: avatarZoom !== 1 ? `scale(${avatarZoom})` : undefined,
              transformOrigin: `${avatarOffsetX}% ${avatarOffsetY}%`,
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-950/90 via-slate-900 to-slate-950 text-indigo-200 font-bold select-none pointer-events-none">
            <span className="text-lg sm:text-xl tracking-wider uppercase">
              {(profile.name || 'YC')
                .trim()
                .split(/\s+/)
                .map((p) => p[0])
                .slice(0, 2)
                .join('') || 'YC'}
            </span>
          </div>
        )}
        {badgeElement}
      </div>
    );
  };

  const primaryCta = card.primaryCta || {
    type: 'save_contact',
    label: 'Save Contact to Phone',
  };

  const handleExecutePrimaryCta = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    switch (primaryCta.type) {
      case 'book_meeting': {
        const targetUrl =
          primaryCta.url || profile.socials?.calendly || profile.workData?.socials?.calendly || 'https://calendly.com';
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'whatsapp': {
        const waNum = primaryCta.url || profile.socials?.whatsapp || profile.personalData?.phone || profile.phone;
        const cleanNum = waNum.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNum}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'send_email': {
        const targetEmail = primaryCta.url || profile.workData?.email || profile.email;
        window.location.href = `mailto:${targetEmail}`;
        break;
      }
      case 'call': {
        const targetPhone = primaryCta.url || profile.workData?.phone || profile.phone;
        window.location.href = `tel:${targetPhone}`;
        break;
      }
      case 'visit_website': {
        const targetUrl = primaryCta.url || profile.website || profile.workData?.website || 'https://youconnect.app';
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'watch_video': {
        if (videoIntro) {
          setIsVideoModalOpen(true);
        } else if (primaryCta.url) {
          window.open(primaryCta.url, '_blank', 'noopener,noreferrer');
        }
        break;
      }
      case 'custom': {
        if (primaryCta.url) {
          window.open(primaryCta.url, '_blank', 'noopener,noreferrer');
        }
        break;
      }
      case 'save_contact':
      default: {
        handleDownloadVCF();
        break;
      }
    }
  };

  // ============================================================================
  // SELECTIVE SHARING DATA ENGINE (Per-Card Dynamic Info & Touchable Social Icons)
  // ============================================================================
  const enabledSocialPlatforms = getFilledSocialAccounts(profile).filter((entry) =>
    isSocialAccountVisible(card, entry)
  );

  const workBioPart = card.visibleFields.bio
    ? (profile.workData?.bio || profile.bio || '').trim()
    : '';
  const personalBioPart = card.visibleFields.personalBio
    ? (profile.personalData?.bio || '').trim()
    : '';
  const sharedBioText =
    workBioPart && personalBioPart && workBioPart !== personalBioPart
      ? `${workBioPart} · ${personalBioPart}`
      : workBioPart || personalBioPart;

  const formatAddressLine = (addr?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }) => {
    if (!addr) return '';
    return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  };

  interface SharedCoordItem {
    key: string;
    label: string;
    value: string;
    href?: string;
    icon: React.ReactNode;
    mono?: boolean;
    fullWidth?: boolean;
  }

  const sharedCoordinateItems: SharedCoordItem[] = [];

  if (card.visibleFields.email && (profile.workData?.email || profile.email)) {
    const val = profile.workData?.email || profile.email;
    sharedCoordinateItems.push({
      key: 'email',
      label: 'Work Email',
      value: val,
      href: `mailto:${val}`,
      icon: (
        <Mail
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-amber-700' : 'text-amber-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.phone && (profile.workData?.phone || profile.phone)) {
    const val = profile.workData?.phone || profile.phone;
    sharedCoordinateItems.push({
      key: 'phone',
      label: 'Work Phone',
      value: val,
      href: `tel:${val}`,
      icon: (
        <Phone
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-emerald-700' : 'text-emerald-400'
          }`}
        />
      ),
      mono: true,
    });
  }

  if (card.visibleFields.personalPhone && profile.personalData?.phone) {
    const val = profile.personalData.phone;
    sharedCoordinateItems.push({
      key: 'personalPhone',
      label: 'Personal Mobile',
      value: val,
      href: `tel:${val}`,
      icon: (
        <Smartphone
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-rose-700' : 'text-rose-400'
          }`}
        />
      ),
      mono: true,
    });
  }

  if (card.visibleFields.personalEmail && profile.personalData?.email) {
    const val = profile.personalData.email;
    sharedCoordinateItems.push({
      key: 'personalEmail',
      label: 'Personal Email',
      value: val,
      href: `mailto:${val}`,
      icon: (
        <Mail
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-rose-700' : 'text-rose-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.website && (profile.website || profile.workData?.website)) {
    const rawWeb = profile.website || profile.workData?.website || '';
    const fullWeb = rawWeb.startsWith('http') ? rawWeb : `https://${rawWeb}`;
    sharedCoordinateItems.push({
      key: 'website',
      label: 'Website',
      value: rawWeb.replace(/^https?:\/\//, ''),
      href: fullWeb,
      icon: (
        <Globe
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-sky-700' : 'text-cyan-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.nickname && profile.personalData?.nickname) {
    sharedCoordinateItems.push({
      key: 'nickname',
      label: 'Nickname',
      value: `"${profile.personalData.nickname}"`,
      icon: (
        <User
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-rose-700' : 'text-rose-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.pronouns && profile.personalData?.pronouns) {
    sharedCoordinateItems.push({
      key: 'pronouns',
      label: 'Pronouns',
      value: profile.personalData.pronouns,
      icon: (
        <User
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-indigo-700' : 'text-indigo-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.gender && profile.personalData?.gender) {
    sharedCoordinateItems.push({
      key: 'gender',
      label: 'Gender',
      value: profile.personalData.gender,
      icon: (
        <User
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-purple-700' : 'text-purple-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.officeAddress && formatAddressLine(profile.workData?.officeAddress)) {
    sharedCoordinateItems.push({
      key: 'officeAddress',
      label: 'Office HQ',
      value: `HQ: ${formatAddressLine(profile.workData?.officeAddress)}`,
      icon: (
        <MapPin
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-indigo-700' : 'text-indigo-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.homeAddress && formatAddressLine(profile.personalData?.address)) {
    sharedCoordinateItems.push({
      key: 'homeAddress',
      label: 'Home Address',
      value: `Home: ${formatAddressLine(profile.personalData?.address)}`,
      icon: (
        <MapPin
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-rose-700' : 'text-rose-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.taxIdOrVat && profile.workData?.taxIdOrVat) {
    sharedCoordinateItems.push({
      key: 'taxIdOrVat',
      label: 'Tax ID / VAT',
      value: `VAT/EIN: ${profile.workData.taxIdOrVat}`,
      icon: (
        <ShieldCheck
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-indigo-700' : 'text-indigo-400'
          }`}
        />
      ),
      mono: true,
    });
  }

  if (card.visibleFields.birthday && profile.personalData?.birthday) {
    sharedCoordinateItems.push({
      key: 'birthday',
      label: 'Birthday',
      value: `BDAY: ${profile.personalData.birthday}`,
      icon: (
        <Calendar
          className={`h-3.5 w-3.5 shrink-0 ${
            themeConfig.isLight ? 'text-amber-700' : 'text-amber-300'
          }`}
        />
      ),
    });
  }

  if (card.visibleFields.emergencyContact) {
    const ecList =
      profile.personalData?.emergencyContacts && profile.personalData.emergencyContacts.length > 0
        ? profile.personalData.emergencyContacts.filter((c) => Boolean(c.name || c.phone))
        : profile.personalData?.emergencyContact?.name
        ? [profile.personalData.emergencyContact]
        : [];
    ecList.forEach((ec, idx) => {
      const ecText = `ICE${ecList.length > 1 ? ` #${idx + 1}` : ''}: ${ec.name}${
        ec.relationship ? ` (${ec.relationship})` : ''
      }${ec.phone ? ` · ${ec.phone}` : ''}`;
      sharedCoordinateItems.push({
        key: `emergencyContact-${idx}`,
        label: `Emergency ICE ${ecList.length > 1 ? idx + 1 : ''}`.trim(),
        value: ecText,
        href: ec.phone ? `tel:${ec.phone}` : undefined,
        icon: (
          <Zap
            className={`h-3.5 w-3.5 shrink-0 ${
              themeConfig.isLight ? 'text-rose-700' : 'text-rose-400'
            }`}
          />
        ),
        fullWidth: true,
      });
    });
  }

  // Render touchable icon-only social symbol buttons that open the social page directly when touched
  const renderSocialSymbolsRow = (
    variant: 'card' | 'pass' = 'card',
    align: 'start' | 'center' = 'start'
  ) => {
    if (enabledSocialPlatforms.length === 0) return null;
    return (
      <div
        className={`relative z-20 flex flex-wrap items-center gap-2 pt-2.5 ${
          align === 'center' ? 'justify-center' : 'justify-start'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {enabledSocialPlatforms.map((entry) => {
          const platform = getPlatformConfig(entry.platformId);
          const rawVal = entry.value;
          const fullUrl = getFullSocialUrl(entry.platformId, rawVal);
          const labelPart = entry.label?.trim() ? ` (${entry.label.trim()})` : '';
          const iconColor = themeConfig.isLight
            ? platform.lightColor || platform.color
            : platform.darkColor || platform.color;
          return (
            <a
              key={entry.id}
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={`${platform.name}${labelPart}${rawVal ? ` · ${rawVal}` : ''}`}
              aria-label={`Open ${platform.name}${labelPart}`}
              className={`inline-flex items-center justify-center rounded-xl border transition-all duration-200 hover:scale-110 active:scale-95 h-8 w-8 backdrop-blur-sm ${
                themeConfig.isLight
                  ? 'bg-white/95 hover:bg-white shadow-sm'
                  : 'bg-slate-950/85 hover:bg-slate-950 shadow-md'
              }`}
              style={{
                borderColor: `${iconColor}55`,
                backgroundColor: themeConfig.isLight ? '#FFFFFF' : 'rgba(9, 13, 22, 0.88)',
                color: iconColor,
              }}
            >
              {platform.renderIcon({
                className: 'h-4 w-4',
                style: { color: iconColor },
              })}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Interactive Mode Navigation & Action Controls */}
      {interactive && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          {/* Segmented View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setLayoutMode('card_3d')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                layoutMode === 'card_3d'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>3D Card</span>
            </button>
            <button
              onClick={() => setLayoutMode('story_deck')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                layoutMode === 'story_deck'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-amber-300/90 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Swipeable 3-Slide Executive Story Deck"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Story Deck</span>
            </button>
            {!recipientMode && (
              <button
                onClick={() => setLayoutMode('wallet_pass')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                  layoutMode === 'wallet_pass'
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Pass</span>
              </button>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-1.5">
            {layoutMode === 'card_3d' && !recipientMode && (
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700 shadow-sm"
                title="Flip to back / front"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-400" />
                <span>{isFlipped ? 'Front' : 'Flip QR'}</span>
              </button>
            )}

            {showRecipientActions && (
              <>
                <button
                  onClick={() => setIsExchangeOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
                  title="Reciprocal Contact Exchange"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Exchange</span>
                </button>

                <button
                  onClick={handleDownloadVCF}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm"
                  title="Save Contact vCard"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. 3D MULTI-PLANE DEPTH-OF-FIELD PHYSICAL CARD VIEW       */}
      {/* ========================================================= */}
      {layoutMode === 'card_3d' && (
        <div
          className={`relative w-full mx-auto transition-all duration-500 ${
            parallaxEnabled ? 'py-4 px-2 sm:px-4' : ''
          }`}
          style={{ perspective: '1100px' }}
        >
          <div
            onClick={() => interactive && !recipientMode && setIsFlipped(!isFlipped)}
            className={`digital-card-preserve relative w-full rounded-2xl border select-none transition-all duration-700 ease-out ${
              interactive && !recipientMode ? 'cursor-pointer' : ''
            } ${themeConfig.containerClass}`}
            style={{
              transformStyle: 'preserve-3d',
              transform:
                isFlipped && !recipientMode
                  ? parallaxEnabled
                    ? 'rotateY(188deg) rotateX(6deg)'
                    : 'rotateY(180deg)'
                  : parallaxEnabled
                  ? 'rotateX(7deg) rotateY(-8deg)'
                  : 'rotateY(0deg) rotateX(0deg)',
              minHeight: '415px',
            }}
          >
            {/* 3D Extruded Chassis & Recessed Depth Well */}
            {render3DChassisPlanes()}

            {/* ---------------- FRONT FACE ---------------- */}
            <div
              className={`relative p-6 sm:p-7 flex flex-col justify-between h-full ${cardFontClass}`}
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                display: isFlipped ? 'none' : 'flex',
              }}
            >
              {/* Tactile Material Surface Overlay (Base Plane 0px) */}
              {renderMaterialOverlay(card.materialFinish)}

              {/* ===================================================================== */}
              {/* DUAL BACKDROP ENGINE:                                                 */}
              {/*   MODE 1: Standard Top Landscape Banner (when !is3DSilhouetteStage)   */}
              {/*   MODE 2: Expanded 3D Photorealistic Silhouette & Spatial Depth Stage */}
              {/* ===================================================================== */}
              {is3DSilhouetteStage ? (
                <div
                  className="relative z-20 -mx-6 sm:-mx-7 -mt-6 sm:-mt-7 mb-3 px-6 sm:px-7 pt-5 pb-0 rounded-t-2xl overflow-hidden border-b border-white/15 select-none"
                  style={{
                    perspective: '900px',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Z-PLANE 1 (-36px): Crisp Unblurred 3D Spatial Environment Plane */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: 'translate3d(0px, 0px, -36px) scale(1.06)',
                    }}
                  >
                    <img
                      src={stageEnvironmentUrl}
                      alt="3D Spatial Environment"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Z-PLANE 3 (+18px): Floating Header (NFC Chip, Logo & Edition Badge) */}
                  <div
                    className="relative z-10 flex items-start justify-between"
                    style={{
                      transform: 'translate3d(0px, 0px, 18px)',
                    }}
                  >
                    <div className="flex items-center gap-3 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]">
                      <div
                        className={`relative flex items-center justify-center w-11 h-9 rounded-md border overflow-hidden shadow-lg ${
                          themeConfig.chipColor === 'silver'
                            ? 'bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 border-slate-500/70'
                            : themeConfig.chipColor === 'bronze'
                            ? 'bg-gradient-to-tr from-stone-400 via-amber-200 to-stone-500 border-stone-600/70'
                            : 'bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 border-amber-600/60'
                        }`}
                      >
                        <div className="w-full h-full border-t border-b border-black/30 flex items-center justify-center">
                          <div className="w-4 h-4 border border-black/40 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 border border-black/50 rounded-xs" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-300 drop-shadow" title="Contactless NFC Enabled">
                        <Radio className="h-5 w-5 transform -rotate-45" />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)]">
                      {companyLogo && card.visibleFields.companyLogo !== false && logoPlacement === 'top_right' && (
                        <div
                          className={`rounded-xl bg-black/85 border border-white/25 flex items-center justify-center shrink-0 shadow-2xl transition-all duration-300 hover:scale-105 ${logoSizeClasses.container}`}
                          title={profile.workData?.company || profile.company}
                          style={{
                            boxShadow: `0 8px 20px -4px rgba(0,0,0,0.7), 0 0 16px -2px ${card.accentColor}40`,
                          }}
                        >
                          <img
                            src={companyLogo}
                            alt="Company Logo"
                            className={`${logoSizeClasses.img} object-contain rounded-sm`}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border shadow-lg"
                          style={{
                            backgroundColor: `${card.accentColor}55`,
                            borderColor: card.accentColor,
                            color: '#ffffff',
                          }}
                        >
                          {card.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-black/75 text-white border-white/20">
                          #{card.tag || 'Executive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Z-PLANE 3.5 (+26px): Floating Live Presence & Time-Zone Status Bar */}
                  {livePresence.enabled && (
                    <div
                      className="relative z-10 mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.8)]"
                      style={{
                        transform: 'translate3d(0px, 0px, 26px)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${presenceStyle.dot}`}
                          />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${presenceStyle.dot}`} />
                        </span>
                        <span className="text-[11px] font-medium text-white truncate">
                          {ownerStatusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {holderLocalTime && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-white/15">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{holderLocalTime}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Z-PLANE 4 (+48px): FOREGROUND SUBJECT — 3D Photorealistic Silhouette Cutout & Identity */}
                  <div
                    className={`relative z-20 mt-2.5 flex items-end gap-4 ${
                      activeContentLayout === 'centered_monolith' || activeContentLayout === 'magazine_masthead'
                        ? 'flex-col items-center text-center'
                        : activeContentLayout === 'structured_ledger' || activeContentLayout === 'asymmetric_hero'
                        ? 'flex-row-reverse justify-between'
                        : activeContentLayout === 'split_columns' || activeContentLayout === 'swiss_grid'
                        ? 'items-center justify-between'
                        : ''
                    }`}
                    style={{
                      transform: 'translate3d(0px, 0px, 48px)',
                    }}
                  >
                    {/* Frameless 3D Photorealistic Person Silhouette standing cleanly in front of the 3D stage */}
                    <div
                      className={`group/portrait relative shrink-0 flex items-end justify-center w-24 sm:w-28 h-28 sm:h-32 -mb-0.5 overflow-hidden ${
                        onOpenImageHub && !recipientMode ? 'cursor-pointer hover:opacity-95' : ''
                      }`}
                      title={onOpenImageHub && !recipientMode ? `Click to open Photo Hub · ${profile.name}` : profile.name}
                      onClick={(e) => {
                        if (onOpenImageHub && !recipientMode) {
                          e.stopPropagation();
                          onOpenImageHub('portrait');
                        }
                      }}
                    >
                      {silhouetteCutoutUrl || effectiveAvatarUrl ? (
                        <img
                          src={silhouetteCutoutUrl || effectiveAvatarUrl}
                          alt={profile.name}
                          draggable={false}
                          className="relative z-10 w-full h-full object-contain object-bottom select-none pointer-events-none transition-transform duration-75"
                          style={{
                            objectPosition: `${avatarOffsetX}% ${avatarOffsetY}%`,
                            transform: `translate(${(50 - avatarOffsetX) * 0.35}%, ${(18 - avatarOffsetY) * 0.35}%) scale(${avatarZoom})`,
                            transformOrigin: 'center bottom',
                          }}
                        />
                      ) : (
                        <div className="relative z-10 w-20 h-20 mb-2 rounded-2xl border border-white/25 bg-black/75 backdrop-blur-md flex items-center justify-center text-lg font-bold text-white uppercase shadow-xl">
                          {(profile.name || 'YC')
                            .trim()
                            .split(/\s+/)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('') || 'YC'}
                        </div>
                      )}
                      {isKycVerified && (
                        <span
                          className="absolute bottom-2 right-0.5 z-20 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.9)]"
                          title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* Foreground Stage Right Block: In split_columns, show floating Executive Brief on stage so Identity lives in Left Column below */}
                    {activeContentLayout === 'split_columns' ? (
                      <div className="min-w-0 flex-1 pb-3">
                        {((card.customTagline || profile.headline) || sharedBioText) && (
                          <div className="p-2.5 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.85)] space-y-1">
                            {(card.customTagline || profile.headline) && (
                              <p className="text-[11px] sm:text-xs italic leading-snug text-amber-200/95 line-clamp-2">
                                "{card.customTagline || profile.headline}"
                              </p>
                            )}
                            {sharedBioText && (
                              <p className="text-[10px] sm:text-[11px] leading-relaxed text-slate-200/90 line-clamp-2">
                                {sharedBioText}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`min-w-0 flex-1 pb-3.5 ${
                          activeContentLayout === 'structured_ledger' ? 'text-left' : ''
                        }`}
                        style={{
                          textShadow: '0 4px 16px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
                        }}
                      >
                        <h3
                          className={`text-xl sm:text-2xl font-bold tracking-tight text-white truncate ${themeConfig.fontFamily}`}
                        >
                          {profile.name}
                        </h3>
                        {card.visibleFields.role && (
                          <p
                            className="text-xs sm:text-sm font-semibold truncate"
                            style={{ color: card.accentColor || '#38bdf8' }}
                          >
                            {profile.workData?.role || profile.role}
                          </p>
                        )}
                        {(card.visibleFields.company || card.visibleFields.department) && (
                          <p className="text-xs text-slate-200 truncate">
                            {card.visibleFields.company ? profile.workData?.company || profile.company : ''}
                            {card.visibleFields.department && profile.workData?.department
                              ? card.visibleFields.company
                                ? ` · ${profile.workData.department}`
                                : profile.workData.department
                              : ''}
                          </p>
                        )}
                        {card.visibleFields.location && profile.location && (
                          <div
                            className={`flex items-center gap-1 text-[11px] text-slate-300 mt-0.5 ${
                              activeContentLayout === 'centered_monolith' ? 'justify-center' : ''
                            }`}
                          >
                            <MapPin className="h-3 w-3 shrink-0 text-amber-300" />
                            <span className="truncate">{profile.location}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* MODE 1: STANDARD BANNER BACKDROP */}
                  {coverBanner && (
                    <div
                      className="absolute top-0 inset-x-0 h-36 rounded-t-2xl overflow-hidden pointer-events-none transition-transform duration-500"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(4px)' : 'translateZ(0px)',
                      }}
                    >
                      <img
                        src={coverBanner}
                        alt="Cover Banner"
                        className="w-full h-full object-cover opacity-55 contrast-115 brightness-95"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/60 to-transparent shadow-[inset_0_10px_24px_rgba(0,0,0,0.85)]" />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-40">
                    {(card.theme === 'executive' || card.theme === 'forged_carbon') && (
                      <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:18px_18px] opacity-25" />
                    )}
                    {card.theme === 'swiss_editorial' && (
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
                    )}
                    {card.theme === 'cyber' && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-fuchsia-500/10" />
                    )}
                    {card.theme === 'frosted_glass' && (
                      <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl" />
                    )}

                    {/* Floating 3D Holographic Brand Watermark Crest (translateZ: 14px) */}
                    {showLogoWatermark && (
                      <div
                        className="absolute right-3 bottom-14 pointer-events-none select-none overflow-hidden transition-all duration-700"
                        style={{
                          transform: parallaxEnabled ? 'translateZ(14px) rotate(-6deg)' : 'translateZ(0px)',
                        }}
                      >
                        <img
                          src={companyLogo}
                          alt=""
                          aria-hidden="true"
                          className="w-28 h-28 sm:w-36 sm:h-36 object-contain opacity-[0.09] dark:opacity-[0.14] filter contrast-125"
                          style={{
                            mixBlendMode: themeConfig.isLight ? 'multiply' : 'screen',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Card Header: Metallic NFC Chip, Brand Logo & Edition Badge */}
                  <div
                    className="relative z-10 flex items-start justify-between transition-all duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: parallaxEnabled ? 'translateZ(36px) translateY(-2px)' : 'translateZ(0px)',
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: parallaxEnabled ? 'translateZ(38px) translateY(-2px)' : 'translateZ(0px)',
                        filter:
                          parallaxEnabled && !themeConfig.isLight
                            ? 'drop-shadow(6px 12px 14px rgba(0,0,0,0.8))'
                            : undefined,
                      }}
                    >
                      <div
                        className={`relative flex items-center justify-center w-11 h-9 rounded-md border overflow-hidden ${
                          themeConfig.chipColor === 'silver'
                            ? 'bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 border-slate-500/70'
                            : themeConfig.chipColor === 'bronze'
                            ? 'bg-gradient-to-tr from-stone-400 via-amber-200 to-stone-500 border-stone-600/70'
                            : 'bg-gradient-to-tr from-amber-400 via-amber-200 to-yellow-500 border-amber-600/60'
                        }`}
                      >
                        <div className="w-full h-full border-t border-b border-black/30 flex items-center justify-center">
                          <div className="w-4 h-4 border border-black/40 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 border border-black/50 rounded-xs" />
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex items-center ${
                          themeConfig.isLight ? 'text-amber-700' : 'text-amber-300/90'
                        }`}
                        title="Contactless NFC Enabled"
                      >
                        <Radio className="h-5 w-5 transform -rotate-45" />
                      </div>

                      {/* Top-Left Logo Showcase */}
                      {companyLogo && card.visibleFields.companyLogo !== false && logoPlacement === 'top_left' && (
                        <div
                          className={`rounded-xl bg-black/75 dark:bg-black/85 border border-white/25 backdrop-blur-md flex items-center justify-center shrink-0 shadow-xl ml-1 transition-all duration-300 hover:scale-105 ${logoSizeClasses.container}`}
                          title={profile.workData?.company || profile.company}
                          style={{
                            boxShadow: `0 8px 20px -4px rgba(0,0,0,0.7), 0 0 16px -2px ${card.accentColor}35`,
                          }}
                        >
                          <img
                            src={companyLogo}
                            alt="Company Logo"
                            className={`${logoSizeClasses.img} object-contain rounded-sm`}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      className="flex flex-col items-end gap-2"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: parallaxEnabled ? 'translateZ(44px) translateY(-2px)' : 'translateZ(0px)',
                        filter:
                          parallaxEnabled && !themeConfig.isLight
                            ? 'drop-shadow(6px 12px 14px rgba(0,0,0,0.85))'
                            : undefined,
                      }}
                    >
                      {/* Top-Right Logo Showcase (Default Prominent Luxury Emblem) */}
                      {companyLogo && card.visibleFields.companyLogo !== false && logoPlacement === 'top_right' && (
                        <div
                          className={`rounded-xl bg-black/75 dark:bg-black/85 border border-white/25 backdrop-blur-md flex items-center justify-center shrink-0 shadow-2xl transition-all duration-300 hover:scale-105 ${logoSizeClasses.container}`}
                          title={profile.workData?.company || profile.company}
                          style={{
                            boxShadow: `0 8px 20px -4px rgba(0,0,0,0.7), 0 0 16px -2px ${card.accentColor}35`,
                          }}
                        >
                          <img
                            src={companyLogo}
                            alt="Company Logo"
                            className={`${logoSizeClasses.img} object-contain rounded-sm`}
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border shadow-sm"
                          style={{
                            backgroundColor: `${card.accentColor}30`,
                            borderColor: card.accentColor,
                            color: themeConfig.isLight ? '#1c1917' : '#ffffff',
                          }}
                        >
                          {card.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${themeConfig.accentBg}`}>
                          #{card.tag || 'Executive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identity Circle & Time-Zone Status Bar */}
                  {livePresence.enabled && (
                    <div
                      className={`relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all duration-500 ${darkPanelClass}`}
                      style={{
                        transform: parallaxEnabled ? 'translateZ(28px)' : 'translateZ(0px)',
                        boxShadow:
                          parallaxEnabled && !themeConfig.isLight
                            ? '8px 16px 24px -4px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.2)'
                            : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${presenceStyle.dot}`}
                          />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${presenceStyle.dot}`} />
                        </span>
                        <span
                          className={`text-[11px] font-medium truncate ${
                            themeConfig.isLight ? 'text-stone-900' : 'text-white'
                          }`}
                        >
                          {ownerStatusText}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {holderLocalTime && (
                          <span
                            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                              themeConfig.isLight
                                ? 'text-amber-900 bg-amber-500/15 border-amber-700/25 font-semibold'
                                : 'text-amber-300/90 bg-white/5 border-white/10'
                            }`}
                          >
                            <Clock className="h-2.5 w-2.5" />
                            <span>{holderLocalTime}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card Body: Framed Portrait & Identity Typography (for layouts that use standard top identity header) */}
                  {activeContentLayout !== 'split_columns' &&
                    activeContentLayout !== 'asymmetric_hero' &&
                    activeContentLayout !== 'magazine_masthead' &&
                    activeContentLayout !== 'swiss_grid' && (
                    <div
                      className={`relative z-20 my-3.5 flex transition-all duration-500 ${
                        activeContentLayout === 'centered_monolith'
                          ? 'flex-col items-center text-center gap-2.5'
                          : activeContentLayout === 'structured_ledger'
                          ? 'flex-row-reverse items-center justify-between gap-4'
                          : activeContentLayout === 'minimal_horizon'
                          ? `items-center justify-between gap-3 py-2 px-3 rounded-xl border ${boxSurfaceClass}`
                          : 'items-center gap-4'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: parallaxEnabled ? 'translateZ(48px) translateY(-3px)' : 'translateZ(0px)',
                      }}
                    >
                      <div className="relative shrink-0" style={{ transformStyle: 'preserve-3d' }}>
                        {renderFramedPortrait(
                          `border-2 transition-all duration-500 ${
                            activeContentLayout === 'centered_monolith'
                              ? 'h-20 w-20 sm:h-22 sm:w-22 rounded-full shadow-lg'
                              : 'h-16 w-16 sm:h-20 sm:w-20 rounded-2xl'
                          }`,
                          { borderColor: card.accentColor }
                        )}
                        {isKycVerified && (
                          <span
                            className="absolute -bottom-1 -right-1 z-20 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                            title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${themeConfig.fontFamily}`}
                        >
                          {profile.name}
                        </h3>
                        {card.visibleFields.role && (
                          <p className={`text-xs sm:text-sm font-semibold truncate ${themeConfig.accentText}`}>
                            {profile.workData?.role || profile.role}
                          </p>
                        )}
                        {(card.visibleFields.company || card.visibleFields.department) && (
                          <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            {companyLogo && card.visibleFields.companyLogo !== false && logoPlacement === 'identity_row' && (
                              <div
                                className="h-7 w-7 rounded-lg bg-black/60 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-md backdrop-blur-xs"
                                title={profile.workData?.company || profile.company}
                              >
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  className="h-full w-full object-contain"
                                />
                              </div>
                            )}
                            <p className={`text-xs truncate ${themeConfig.subtleText}`}>
                              {card.visibleFields.company ? profile.workData?.company || profile.company : ''}
                              {card.visibleFields.department && profile.workData?.department
                                ? card.visibleFields.company
                                  ? ` · ${profile.workData.department}`
                                  : profile.workData.department
                                : ''}
                            </p>
                          </div>
                        )}
                        {card.visibleFields.location && profile.location && (
                          <div
                            className={`flex items-center gap-1 text-[11px] mt-0.5 ${themeConfig.subtleText} ${
                              activeContentLayout === 'centered_monolith' ? 'justify-center' : ''
                            }`}
                          >
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===================================================================== */}
              {/* INFO DISTRIBUTION ENGINE (Selectable Professional Layouts)            */}
              {/* ===================================================================== */}
              {activeContentLayout === 'split_columns' ? (
                <div
                  className="relative z-20 my-2.5 pt-2.5 border-t border-current/15 grid grid-cols-12 gap-3 sm:gap-4 items-stretch transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Left Column (5 cols): Portrait (when !is3DSilhouetteStage) + Identity + Social Icons */}
                  <div
                    className={`col-span-5 flex flex-col justify-between gap-2.5 p-2.5 rounded-xl border min-w-0 ${boxSurfaceClass}`}
                  >
                    <div className="flex flex-col items-start gap-2 w-full min-w-0">
                      {!is3DSilhouetteStage && (
                        <div className="relative shrink-0">
                          {renderFramedPortrait(
                            'h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border-2 shadow-md',
                            { borderColor: card.accentColor }
                          )}
                          {isKycVerified && (
                            <span
                              className="absolute -bottom-1 -right-1 z-20 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow"
                              title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 w-full space-y-0.5">
                        <div className="text-[9px] uppercase tracking-wider opacity-60">
                          Identity
                        </div>
                        <h3
                          className={`text-base sm:text-lg font-bold tracking-tight leading-snug break-words ${themeConfig.fontFamily}`}
                        >
                          {profile.name}
                        </h3>
                        {card.visibleFields.role && (
                          <p className={`text-[11px] sm:text-xs font-semibold leading-snug ${themeConfig.accentText}`}>
                            {profile.workData?.role || profile.role}
                          </p>
                        )}
                        {(card.visibleFields.company || card.visibleFields.department) && (
                          <p className={`text-[10px] sm:text-[11px] truncate ${themeConfig.subtleText}`}>
                            {card.visibleFields.company ? profile.workData?.company || profile.company : ''}
                            {card.visibleFields.department && profile.workData?.department
                              ? card.visibleFields.company
                                ? ` · ${profile.workData.department}`
                                : profile.workData.department
                              : ''}
                          </p>
                        )}
                        {card.visibleFields.location && profile.location && (
                          <div className={`flex items-center gap-1 text-[10px] pt-0.5 ${themeConfig.subtleText}`}>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-current/10 w-full">
                      {renderSocialSymbolsRow('card', 'start')}
                    </div>
                  </div>

                  {/* Right Column (7 cols): Tagline, Bio (when !is3DSilhouetteStage) & Stacked Contact Coordinates */}
                  <div className="col-span-7 border-l border-current/20 pl-3 sm:pl-4 flex flex-col justify-between space-y-2 min-w-0">
                    {!is3DSilhouetteStage && (
                      <div className="space-y-1 pb-2 border-b border-current/10">
                        <p className={`text-[11px] sm:text-xs italic leading-snug line-clamp-2 ${themeConfig.subtleText}`}>
                          "{card.customTagline || profile.headline}"
                        </p>
                        {sharedBioText && (
                          <p className="text-[10px] sm:text-[11px] leading-relaxed opacity-85 line-clamp-2">
                            {sharedBioText}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider opacity-60">
                        Direct Coordinates
                      </div>
                      {sharedCoordinateItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          {sharedCoordinateItems.map((item) => {
                            const content = (
                              <>
                                {item.icon}
                                <span className="truncate">{item.value}</span>
                              </>
                            );
                            const itemClass = `flex items-center gap-2 truncate px-2 py-1 rounded-lg border text-[11px] ${pillSurfaceClass}`;
                            return item.href ? (
                              <a
                                key={item.key}
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                onClick={(e) => e.stopPropagation()}
                                className={`${itemClass} hover:underline transition`}
                                title={`${item.label}: ${item.value}`}
                              >
                                {content}
                              </a>
                            ) : (
                              <div key={item.key} className={itemClass} title={`${item.label}: ${item.value}`}>
                                {content}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] opacity-60 italic">No public coordinates enabled.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeContentLayout === 'centered_monolith' ? (
                <>
                  {/* Centered Editorial Bio & Tagline */}
                  <div className="relative z-10 py-2.5 border-t border-current/10 text-center space-y-1 max-w-md mx-auto">
                    <p className={`text-xs italic leading-relaxed line-clamp-2 ${themeConfig.subtleText}`}>
                      "{card.customTagline || profile.headline}"
                    </p>
                    {sharedBioText && (
                      <p className="text-[11px] leading-relaxed opacity-85 line-clamp-2">
                        {sharedBioText}
                      </p>
                    )}
                  </div>

                  {/* Symmetrical Centered Coordinate Pills */}
                  {sharedCoordinateItems.length > 0 && (
                    <div className="relative z-10 pt-1.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                      {sharedCoordinateItems.map((item) => {
                        const content = (
                          <>
                            {item.icon}
                            <span className="truncate max-w-[200px]">{item.value}</span>
                          </>
                        );
                        const pillClass = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${pillSurfaceClass}`;
                        return item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={`${pillClass} transition`}
                            title={`${item.label}: ${item.value}`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={item.key} className={pillClass} title={`${item.label}: ${item.value}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {renderSocialSymbolsRow('card', 'center')}
                </>
              ) : activeContentLayout === 'structured_ledger' ? (
                <>
                  {/* Framed Architectural Brief */}
                  <div className={`relative z-10 px-3 py-2 rounded-xl border space-y-1 ${boxSurfaceClass}`}>
                    <p className={`text-xs italic leading-relaxed line-clamp-2 ${themeConfig.subtleText}`}>
                      "{card.customTagline || profile.headline}"
                    </p>
                    {sharedBioText && (
                      <p className="text-[11px] leading-relaxed opacity-85 line-clamp-2">
                        {sharedBioText}
                      </p>
                    )}
                  </div>

                  {/* Boxed Ledger Cells for Coordinates */}
                  {sharedCoordinateItems.length > 0 && (
                    <div className="relative z-10 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {sharedCoordinateItems.map((item) => {
                        const content = (
                          <div className="flex items-center gap-2 min-w-0">
                            {item.icon}
                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] uppercase tracking-wider opacity-60 leading-none mb-0.5">
                                {item.label}
                              </div>
                              <div className="truncate text-[11px] font-medium">
                                {item.value}
                              </div>
                            </div>
                          </div>
                        );
                        const cellClass = `px-2.5 py-1.5 rounded-lg border transition ${pillSurfaceClass} ${
                          item.fullWidth ? 'sm:col-span-2' : ''
                        }`;
                        return item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={cellClass}
                            title={`${item.label}: ${item.value}`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={item.key} className={cellClass} title={`${item.label}: ${item.value}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {renderSocialSymbolsRow('card', 'start')}
                </>
              ) : activeContentLayout === 'asymmetric_hero' ? (
                <div
                  className="relative z-20 my-2.5 space-y-2.5 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Top Statement Typography Header (when !is3DSilhouetteStage) */}
                  {!is3DSilhouetteStage && (
                    <div className="pt-1 pb-2 border-b border-current/15 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {card.visibleFields.role && (
                          <span
                            className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-semibold"
                            style={{
                              borderColor: `${card.accentColor}66`,
                              backgroundColor: `${card.accentColor}20`,
                            }}
                          >
                            {profile.workData?.role || profile.role}
                          </span>
                        )}
                        {card.visibleFields.location && profile.location && (
                          <span className={`inline-flex items-center gap-1 text-[10px] ${themeConfig.subtleText}`}>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{profile.location}</span>
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none ${themeConfig.fontFamily}`}
                      >
                        {profile.name}
                      </h3>
                      {(card.visibleFields.company || card.visibleFields.department) && (
                        <p className={`text-xs font-medium ${themeConfig.subtleText}`}>
                          {card.visibleFields.company ? profile.workData?.company || profile.company : ''}
                          {card.visibleFields.department && profile.workData?.department
                            ? card.visibleFields.company
                              ? ` · ${profile.workData.department}`
                              : profile.workData.department
                            : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Lower Asymmetric Dock: Left Portrait/Quote + Right 2-Col Coordinates */}
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className={`col-span-4 flex flex-col items-start gap-2 p-2.5 rounded-xl border ${boxSurfaceClass}`}>
                      {!is3DSilhouetteStage && (
                        <div className="relative shrink-0">
                          {renderFramedPortrait(
                            'h-14 w-14 sm:h-16 sm:w-16 rounded-xl border-2 shadow-md',
                            { borderColor: card.accentColor }
                          )}
                          {isKycVerified && (
                            <span
                              className="absolute -bottom-1 -right-1 z-20 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow"
                              title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      )}
                      {(card.customTagline || profile.headline) && (
                        <p className={`text-[10px] sm:text-[11px] italic leading-snug line-clamp-3 ${themeConfig.subtleText}`}>
                          "{card.customTagline || profile.headline}"
                        </p>
                      )}
                    </div>

                    <div className="col-span-8 space-y-2 min-w-0">
                      {sharedCoordinateItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          {sharedCoordinateItems.map((item) => {
                            const content = (
                              <>
                                {item.icon}
                                <span className="truncate">{item.value}</span>
                              </>
                            );
                            const itemClass = `flex items-center gap-1.5 truncate px-2 py-1 rounded-lg border text-[11px] ${pillSurfaceClass} ${
                              item.fullWidth ? 'sm:col-span-2' : ''
                            }`;
                            return item.href ? (
                              <a
                                key={item.key}
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                onClick={(e) => e.stopPropagation()}
                                className={`${itemClass} hover:underline`}
                                title={`${item.label}: ${item.value}`}
                              >
                                {content}
                              </a>
                            ) : (
                              <div key={item.key} className={itemClass} title={`${item.label}: ${item.value}`}>
                                {content}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {renderSocialSymbolsRow('card', 'start')}
                    </div>
                  </div>
                </div>
              ) : activeContentLayout === 'minimal_horizon' ? (
                <div
                  className="relative z-20 space-y-2.5 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(30px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Accent Left-Rule Tagline Strip */}
                  <div
                    className="pl-3 py-1 border-l-2 space-y-0.5"
                    style={{ borderColor: card.accentColor }}
                  >
                    <p className={`text-xs italic leading-snug line-clamp-1 ${themeConfig.subtleText}`}>
                      "{card.customTagline || profile.headline}"
                    </p>
                    {sharedBioText && (
                      <p className="text-[10px] leading-relaxed opacity-80 line-clamp-1">
                        {sharedBioText}
                      </p>
                    )}
                  </div>

                  {/* Sleek 3-Column Compact Coordinate Strip */}
                  {sharedCoordinateItems.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs pt-1">
                      {sharedCoordinateItems.map((item) => {
                        const content = (
                          <>
                            {item.icon}
                            <span className="truncate">{item.value}</span>
                          </>
                        );
                        const chipClass = `flex items-center gap-1.5 truncate px-2.5 py-1.5 rounded-full border text-[10px] sm:text-[11px] ${pillSurfaceClass}`;
                        return item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={`${chipClass} transition`}
                            title={`${item.label}: ${item.value}`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={item.key} className={chipClass} title={`${item.label}: ${item.value}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {renderSocialSymbolsRow('card', 'start')}
                </div>
              ) : activeContentLayout === 'magazine_masthead' ? (
                <div
                  className="relative z-20 my-2.5 space-y-3 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Full-Width Double-Rule Editorial Masthead (when !is3DSilhouetteStage) */}
                  {!is3DSilhouetteStage && (
                    <div className="py-2 border-y-2 border-current/25 text-center space-y-1">
                      <h3
                        className={`text-xl sm:text-2xl font-bold uppercase tracking-wider leading-tight ${themeConfig.fontFamily}`}
                      >
                        {profile.name}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wider opacity-85">
                        {card.visibleFields.role && (
                          <span className={themeConfig.accentText}>
                            {profile.workData?.role || profile.role}
                          </span>
                        )}
                        {card.visibleFields.company && (
                          <>
                            <span>·</span>
                            <span>{profile.workData?.company || profile.company}</span>
                          </>
                        )}
                        {card.visibleFields.location && profile.location && (
                          <>
                            <span>·</span>
                            <span>{profile.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Editorial 2-Column Spread */}
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5 space-y-2">
                      {!is3DSilhouetteStage && (
                        <div className="relative">
                          {renderFramedPortrait(
                            'w-full h-24 sm:h-28 rounded-xl border shadow-md',
                            { borderColor: card.accentColor }
                          )}
                          {isKycVerified && (
                            <span
                              className="absolute bottom-1.5 right-1.5 z-20 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow"
                              title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      )}
                      <p className={`text-[11px] italic leading-relaxed line-clamp-3 ${themeConfig.subtleText}`}>
                        "{card.customTagline || profile.headline}"
                      </p>
                      {sharedBioText && (
                        <p className="text-[10px] leading-relaxed opacity-80 line-clamp-2">
                          {sharedBioText}
                        </p>
                      )}
                    </div>

                    <div className="col-span-7 border-l border-current/20 pl-3 space-y-2 min-w-0">
                      {sharedCoordinateItems.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 text-xs">
                          {sharedCoordinateItems.map((item) => {
                            const content = (
                              <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                                <span className="text-[9px] uppercase tracking-wider opacity-60 shrink-0">
                                  {item.label}
                                </span>
                                <span className="truncate text-[11px] font-medium">
                                  {item.value}
                                </span>
                              </div>
                            );
                            const rowClass = 'py-1 border-b border-current/15 flex items-center min-w-0';
                            return item.href ? (
                              <a
                                key={item.key}
                                href={item.href}
                                target={item.href.startsWith('http') ? '_blank' : undefined}
                                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                onClick={(e) => e.stopPropagation()}
                                className={`${rowClass} hover:underline`}
                                title={`${item.label}: ${item.value}`}
                              >
                                {content}
                              </a>
                            ) : (
                              <div key={item.key} className={rowClass} title={`${item.label}: ${item.value}`}>
                                {content}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {renderSocialSymbolsRow('card', 'start')}
                    </div>
                  </div>
                </div>
              ) : activeContentLayout === 'swiss_grid' ? (
                <div
                  className={`relative z-20 my-2.5 rounded-xl border overflow-hidden divide-y divide-current/20 transition-all duration-500 ${boxSurfaceClass}`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                  }}
                >
                  {/* Quadrant Row 1: Identity & Brief Cells */}
                  {!is3DSilhouetteStage ? (
                    <div className="grid grid-cols-12 divide-x divide-current/20">
                      <div className="col-span-4 p-2.5 flex flex-col items-center justify-center text-center gap-1.5">
                        <div className="relative">
                          {renderFramedPortrait(
                            'h-14 w-14 rounded-lg border',
                            { borderColor: card.accentColor }
                          )}
                          {isKycVerified && (
                            <span className="absolute -bottom-1 -right-1 z-20 h-4 w-4 rounded-full bg-emerald-500 border border-slate-950 text-slate-950 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] uppercase tracking-widest opacity-60">
                          00 · ID
                        </span>
                      </div>
                      <div className="col-span-8 p-2.5 flex flex-col justify-center min-w-0 space-y-0.5">
                        <div className="text-[9px] uppercase tracking-widest opacity-60">
                          01 · Principal
                        </div>
                        <h3 className={`text-lg sm:text-xl font-bold tracking-tight truncate ${themeConfig.fontFamily}`}>
                          {profile.name}
                        </h3>
                        {card.visibleFields.role && (
                          <p className={`text-xs font-semibold truncate ${themeConfig.accentText}`}>
                            {profile.workData?.role || profile.role}
                          </p>
                        )}
                        {(card.visibleFields.company || card.visibleFields.location) && (
                          <p className={`text-[10px] truncate ${themeConfig.subtleText}`}>
                            {[
                              card.visibleFields.company ? profile.workData?.company || profile.company : '',
                              card.visibleFields.location ? profile.location : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-widest opacity-60">
                        01 · Executive Statement
                      </span>
                      <p className={`text-xs italic truncate ${themeConfig.subtleText}`}>
                        "{card.customTagline || profile.headline}"
                      </p>
                    </div>
                  )}

                  {/* Quadrant Row 2: Numbered Coordinate Matrix */}
                  {sharedCoordinateItems.length > 0 && (
                    <div className="grid grid-cols-2 divide-x divide-y divide-current/20 text-xs">
                      {sharedCoordinateItems.map((item, idx) => {
                        const content = (
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between gap-1 text-[9px] uppercase tracking-wider opacity-60">
                              <span className="truncate">{item.label}</span>
                              <span>0{idx + 2}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate text-[11px] font-medium">
                              {item.icon}
                              <span className="truncate">{item.value}</span>
                            </div>
                          </div>
                        );
                        const cellClass = `p-2 hover:bg-current/5 transition block min-w-0 ${
                          item.fullWidth ? 'col-span-2' : ''
                        }`;
                        return item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={cellClass}
                            title={`${item.label}: ${item.value}`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={item.key} className={cellClass} title={`${item.label}: ${item.value}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quadrant Row 3: Social Index Footer */}
                  <div className={`px-2.5 py-1.5 ${themeConfig.isLight ? 'bg-stone-900/5' : 'bg-black/20'}`}>
                    {renderSocialSymbolsRow('card', 'start')}
                  </div>
                </div>
              ) : (
                <>
                  {/* DEFAULT (executive_left): Tagline & Executive Bio Summary */}
                  {((card.customTagline || profile.headline) || sharedBioText) && (
                    <div
                      className="relative z-10 py-2 border-t border-current/10 space-y-1 transition-all duration-500"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(20px)' : 'translateZ(0px)',
                        textShadow:
                          parallaxEnabled && !themeConfig.isLight
                            ? '3px 6px 12px rgba(0,0,0,0.85)'
                            : undefined,
                      }}
                    >
                      {(card.customTagline || profile.headline) && (
                        <p className={`text-xs italic leading-relaxed line-clamp-2 ${themeConfig.subtleText}`}>
                          "{card.customTagline || profile.headline}"
                        </p>
                      )}
                      {sharedBioText && (
                        <p className="text-[11px] leading-relaxed opacity-85 line-clamp-2">
                          {sharedBioText}
                        </p>
                      )}
                    </div>
                  )}

                  {/* All Selected Contact & Personal Coordinates */}
                  {sharedCoordinateItems.length > 0 && (
                    <div
                      className="relative z-10 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs transition-all duration-500"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(32px)' : 'translateZ(0px)',
                      }}
                    >
                      {sharedCoordinateItems.map((item) => {
                        const content = (
                          <>
                            {item.icon}
                            <span className="truncate">{item.value}</span>
                          </>
                        );
                        const itemClass = `flex items-center gap-2 truncate ${
                          item.fullWidth ? 'sm:col-span-2' : ''
                        } ${
                          parallaxEnabled
                            ? themeConfig.isLight
                              ? 'px-2.5 py-1.5 rounded-lg bg-white/80 border border-stone-900/15 text-stone-900 shadow-xs'
                              : 'px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 shadow-[6px_12px_18px_rgba(0,0,0,0.8)]'
                            : ''
                        }`;

                        return item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={`${itemClass} hover:underline`}
                            title={`${item.label}: ${item.value}`}
                          >
                            {content}
                          </a>
                        ) : (
                          <div key={item.key} className={itemClass} title={`${item.label}: ${item.value}`}>
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Touchable Social Media Symbol Bar */}
                  {renderSocialSymbolsRow('card', 'start')}
                </>
              )}

              {/* Video Business Card Greeting (+36px Z) */}
              {videoIntro && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVideoModalOpen(true);
                  }}
                  className="relative z-10 mt-2.5 flex items-center justify-between p-2 rounded-xl bg-indigo-950/85 hover:bg-indigo-900/85 border border-indigo-400/50 text-xs transition-all duration-500 cursor-pointer group"
                  style={{
                    transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                    boxShadow: parallaxEnabled ? '8px 16px 22px rgba(0,0,0,0.85)' : undefined,
                  }}
                  title="Watch elevator pitch / greeting video"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center group-hover:scale-110 transition shadow">
                      <Play className="h-3 w-3 fill-current ml-0.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px] leading-tight truncate">
                        {card.videoTitle || 'Watch Video Introduction'}
                      </div>
                      <div className="text-[9px] text-indigo-300 font-mono">Video Pitch</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-300 shrink-0">Play &rarr;</span>
                </div>
              )}

              {/* Card Footer: Serial Code, Story Deck Switch & Flip Hint (+16px Z) */}
              <div
                className="relative z-10 mt-4 pt-3 border-t border-current/10 flex items-center justify-between text-[10px] opacity-80 transition-all duration-500"
                style={{
                  transform: parallaxEnabled ? 'translateZ(16px)' : 'translateZ(0px)',
                }}
              >
                <span>YC-CARD-{card.id.slice(-6).toUpperCase()}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayoutMode('story_deck');
                    }}
                    className={`flex items-center gap-1 hover:underline font-semibold ${
                      themeConfig.isLight ? 'text-amber-800' : 'text-amber-300'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    <span>3-Slide Story</span>
                  </button>
                  {!recipientMode && (
                    <span className="flex items-center gap-1">
                      <span>Tap to Flip</span>
                      <ArrowRightLeft className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ---------------- BACK FACE (Owner Only - Never Accessible to Recipients) ---------------- */}
            {!recipientMode && (
              <div
                className={`relative p-6 sm:p-7 flex flex-col justify-between h-full ${cardFontClass}`}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transformStyle: 'preserve-3d',
                  transform: 'rotateY(180deg)',
                  display: isFlipped ? 'flex' : 'none',
                }}
              >
              {/* Tactile Material Surface Overlay */}
              {renderMaterialOverlay(card.materialFinish)}

              {/* Magnetic Stripe Graphic */}
              <div className="absolute top-6 inset-x-0 h-10 bg-gradient-to-r from-stone-900 via-black to-stone-900 border-y border-white/10" />

              <div
                className="relative z-10 mt-12 flex flex-col items-center justify-center space-y-3 transition-all duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: parallaxEnabled ? 'translateZ(46px)' : 'translateZ(0px)',
                }}
              >
                {/* Embedded High-Resolution Dynamic QR Code Popping Out of Plane */}
                <div
                  className="p-3 bg-white rounded-2xl border-4 border-slate-900/40"
                  style={{
                    boxShadow:
                      parallaxEnabled && !themeConfig.isLight
                        ? '10px 22px 32px rgba(0,0,0,0.92), 0 0 20px rgba(255,255,255,0.15)'
                        : undefined,
                  }}
                >
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Card QR" className="h-36 w-36 sm:h-40 sm:w-40" />
                  ) : (
                    <div className="h-36 w-36 bg-slate-200 animate-pulse rounded-lg" />
                  )}
                </div>

                <div className="text-center">
                  <div className="text-xs font-bold tracking-wider uppercase">
                    Scan with any smartphone camera
                  </div>
                  <p className={`text-[11px] mt-0.5 ${themeConfig.subtleText}`}>
                    Instantly imports vCard 3.0 contact details without downloading an app.
                  </p>
                </div>

                {/* Vanity Web Link */}
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] shadow-md ${pillSurfaceClass}`}
                >
                  <Globe className={`h-3 w-3 ${themeConfig.isLight ? 'text-indigo-700' : 'text-indigo-400'}`} />
                  <span>{getCardDisplayUrl(card)}</span>
                </div>
              </div>

              {/* Back Card Footer */}
              <div className="relative z-10 pt-3 border-t border-current/10 flex items-center justify-between text-[10px] opacity-70">
                <span className="flex items-center gap-1">
                  <Radio className="h-3 w-3" /> NFC Contactless Active
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3" /> Tap to view front
                </span>
              </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SWIPEABLE 3-SLIDE STORY DECK WITH 3D FIELD DEPTH       */}
      {/* ========================================================= */}
      {layoutMode === 'story_deck' && (
        <div
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current === null) return;
            const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current;
            if (deltaX < -40) {
              setStorySlide((prev) => (prev + 1) % 3);
            } else if (deltaX > 40) {
              setStorySlide((prev) => (prev - 1 + 3) % 3);
            }
            touchStartXRef.current = null;
          }}
          className={`relative w-full mx-auto transition-all duration-500 ${
            parallaxEnabled ? 'py-4 px-2 sm:px-4' : ''
          }`}
          style={{ perspective: '1100px' }}
        >
          {/* IMPORTANT: No overflow-hidden on this preserve-3d container so child Z-planes pop out in 3D space */}
          <div
            className={`digital-card-preserve relative w-full rounded-2xl border p-5 sm:p-6 flex flex-col justify-between select-none transition-all duration-700 ease-out ${themeConfig.containerClass} ${cardFontClass}`}
            style={{
              transformStyle: 'preserve-3d',
              transform: parallaxEnabled ? 'rotateX(7deg) rotateY(-8deg)' : 'rotateX(0deg) rotateY(0deg)',
              minHeight: '435px',
            }}
          >
            {/* 3D Extruded Chassis & Recessed Depth Well */}
            {render3DChassisPlanes()}

            {/* Tactile Material Surface Overlay (Base Plane 0px) */}
            {renderMaterialOverlay(card.materialFinish)}

            {/* Story Deck Top Progress Bar & Slide Selector (+22px Z) */}
            <div
              className="relative z-10 space-y-2.5 transition-all duration-500"
              style={{
                transform: parallaxEnabled ? 'translateZ(22px)' : 'translateZ(0px)',
              }}
            >
              <div className="grid grid-cols-3 gap-2">
                {[
                  { idx: 0, label: 'MY IDENTITY' },
                  { idx: 1, label: 'BIO & HIGHLIGHTS' },
                  { idx: 2, label: 'BEYOND & PORTFOLIO' },
                ].map((s) => {
                  const isActive = storySlide === s.idx;
                  return (
                    <button
                      key={s.idx}
                      type="button"
                      onClick={() => setStorySlide(s.idx)}
                      className="text-left group focus:outline-none"
                    >
                      <div
                        className={`h-1.5 w-full rounded-full overflow-hidden mb-1 ${
                          themeConfig.isLight ? 'bg-stone-900/15' : 'bg-white/15'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isActive
                              ? themeConfig.isLight
                                ? 'w-full bg-amber-600'
                                : 'w-full bg-amber-400'
                              : storySlide > s.idx
                              ? themeConfig.isLight
                                ? 'w-full bg-stone-900/45'
                                : 'w-full bg-white/50'
                              : 'w-0'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] tracking-wider uppercase block truncate ${
                          isActive
                            ? themeConfig.isLight
                              ? 'text-stone-950 font-bold'
                              : 'text-white font-bold'
                            : themeConfig.isLight
                            ? 'text-stone-700/80 group-hover:text-stone-950'
                            : 'text-white/60 group-hover:text-white/90'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PERSISTENT MAIN PROFILE HEADER (Adapts to activeContentLayout across all 3 Story Deck pages) */}
            <div
              className="relative z-20 mt-3.5 space-y-2.5"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {is3DSilhouetteStage ? (
                <div
                  className="relative rounded-2xl overflow-hidden border border-white/20 px-4 pt-4 pb-0 shadow-2xl"
                  style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      transform: 'translate3d(0px, 0px, -28px) scale(1.05)',
                    }}
                  >
                    <img
                      src={stageEnvironmentUrl}
                      alt="3D Story Stage"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="relative z-10 flex items-end gap-4"
                    style={{
                      transform: 'translate3d(0px, 0px, 40px)',
                    }}
                  >
                    <div
                      className={`group/portrait relative shrink-0 w-24 h-28 flex items-end justify-center -mb-0.5 overflow-hidden ${
                        onOpenImageHub && !recipientMode ? 'cursor-pointer hover:opacity-95' : ''
                      }`}
                      title={onOpenImageHub && !recipientMode ? `Click to open Photo Hub · ${profile.name}` : profile.name}
                      onClick={(e) => {
                        if (onOpenImageHub && !recipientMode) {
                          e.stopPropagation();
                          onOpenImageHub('portrait');
                        }
                      }}
                    >
                      {silhouetteCutoutUrl || effectiveAvatarUrl ? (
                        <img
                          src={silhouetteCutoutUrl || effectiveAvatarUrl}
                          alt={profile.name}
                          draggable={false}
                          className="w-full h-full object-contain object-bottom pointer-events-none transition-transform duration-75"
                          style={{
                            objectPosition: `${avatarOffsetX}% ${avatarOffsetY}%`,
                            transform: `translate(${(50 - avatarOffsetX) * 0.35}%, ${(18 - avatarOffsetY) * 0.35}%) scale(${avatarZoom})`,
                            transformOrigin: 'center bottom',
                          }}
                        />
                      ) : (
                        <div className="w-20 h-20 mb-2 rounded-2xl border border-white/25 bg-black/75 backdrop-blur-md flex items-center justify-center text-lg font-bold text-white uppercase shadow-xl">
                          {(profile.name || 'YC')
                            .trim()
                            .split(/\s+/)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('') || 'YC'}
                        </div>
                      )}
                      {isKycVerified && (
                        <span
                          className="absolute bottom-2 right-0.5 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                          title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <div
                      className="min-w-0 flex-1 pb-3.5"
                      style={{ textShadow: '0 4px 14px rgba(0,0,0,0.95)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-black/75 border border-white/20 text-white shadow">
                          {card.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                          3D Spatial Stage
                        </span>
                      </div>
                      <h3 className={`text-xl sm:text-2xl font-bold mt-1 text-white truncate ${themeConfig.fontFamily}`}>
                        {profile.name}
                      </h3>
                      {(card.visibleFields.role || card.visibleFields.company || card.visibleFields.department) && (
                        <p className="text-xs sm:text-sm font-semibold text-amber-300 truncate">
                          {[
                            card.visibleFields.role ? profile.workData?.role || profile.role : '',
                            card.visibleFields.company ? profile.workData?.company || profile.company : '',
                            card.visibleFields.department ? profile.workData?.department : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {card.visibleFields.location && profile.location && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-200 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-amber-300" />
                          <span className="truncate">{profile.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeContentLayout === 'centered_monolith' ? (
                /* Layout 2: Centered Monolith Header */
                <div
                  className="flex flex-col items-center text-center gap-2 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px) translateY(-2px)' : 'translateZ(0px)',
                  }}
                >
                  <div className="relative shrink-0" style={{ transformStyle: 'preserve-3d' }}>
                    {renderFramedPortrait('h-20 w-20 rounded-full border-2 shadow-xl', {
                      borderColor: card.accentColor,
                    })}
                    {isKycVerified && (
                      <span className="absolute -bottom-1 -right-1 z-20 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 max-w-full">
                    <div className="inline-flex items-center gap-2 justify-center">
                      <span className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border font-semibold ${themeConfig.accentBg}`}>
                        {card.name}
                      </span>
                      {companyLogo && card.visibleFields.companyLogo !== false && (
                        <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/20 backdrop-blur-xs flex items-center justify-center">
                          <img src={companyLogo} alt="Logo" className="h-6 max-w-[85px] object-contain rounded" />
                        </div>
                      )}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold mt-1 truncate ${themeConfig.fontFamily}`}>
                      {profile.name}
                    </h3>
                    {(card.visibleFields.role || card.visibleFields.company || card.visibleFields.department) && (
                      <p className={`text-xs sm:text-sm font-semibold truncate ${themeConfig.accentText}`}>
                        {[
                          card.visibleFields.role ? profile.workData?.role || profile.role : '',
                          card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          card.visibleFields.department ? profile.workData?.department : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {card.visibleFields.location && profile.location && (
                      <div className={`flex items-center justify-center gap-1 text-[11px] mt-0.5 ${themeConfig.subtleText}`}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeContentLayout === 'structured_ledger' || activeContentLayout === 'asymmetric_hero' ? (
                /* Layout 4 & 5: Right Portrait / Asymmetric Hero Header */
                <div
                  className={`flex flex-row-reverse items-center justify-between gap-4 p-3 rounded-2xl border transition-all duration-500 ${boxSurfaceClass}`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px) translateY(-2px)' : 'translateZ(0px)',
                  }}
                >
                  <div className="relative shrink-0" style={{ transformStyle: 'preserve-3d' }}>
                    {renderFramedPortrait('h-20 w-20 rounded-2xl border-2', {
                      borderColor: card.accentColor,
                    })}
                    {isKycVerified && (
                      <span className="absolute -bottom-1.5 -left-1.5 z-20 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-semibold ${themeConfig.accentBg}`}
                      >
                        {card.name}
                      </span>
                      {companyLogo && card.visibleFields.companyLogo !== false && (
                        <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/20 backdrop-blur-xs flex items-center justify-center">
                          <img src={companyLogo} alt="Logo" className="h-6 max-w-[85px] object-contain rounded" />
                        </div>
                      )}
                    </div>
                    <h3
                      className={`${
                        activeContentLayout === 'asymmetric_hero' ? 'text-2xl sm:text-3xl font-extrabold' : 'text-xl sm:text-2xl font-bold'
                      } mt-1 truncate ${themeConfig.fontFamily}`}
                    >
                      {profile.name}
                    </h3>
                    {(card.visibleFields.role || card.visibleFields.company || card.visibleFields.department) && (
                      <p className={`text-xs sm:text-sm font-semibold truncate ${themeConfig.accentText}`}>
                        {[
                          card.visibleFields.role ? profile.workData?.role || profile.role : '',
                          card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          card.visibleFields.department ? profile.workData?.department : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {card.visibleFields.location && profile.location && (
                      <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${themeConfig.subtleText}`}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeContentLayout === 'minimal_horizon' ? (
                /* Layout 6: Minimal Horizon Ribbon Header */
                <div
                  className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all duration-500 ${boxSurfaceClass}`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px)' : 'translateZ(0px)',
                    borderLeftWidth: '4px',
                    borderLeftColor: card.accentColor,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {renderFramedPortrait('h-14 w-14 rounded-xl border', {
                        borderColor: card.accentColor,
                      })}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-lg sm:text-xl font-bold truncate ${themeConfig.fontFamily}`}>
                        {profile.name}
                      </h3>
                      {(card.visibleFields.role || card.visibleFields.company) && (
                        <p className={`text-xs font-semibold truncate ${themeConfig.accentText}`}>
                          {[
                            card.visibleFields.role ? profile.workData?.role || profile.role : '',
                            card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-semibold shrink-0 ${themeConfig.accentBg}`}>
                    {card.name}
                  </span>
                </div>
              ) : activeContentLayout === 'magazine_masthead' ? (
                /* Layout 7: Editorial Masthead Header */
                <div
                  className="space-y-2 pb-2.5 border-b-2 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px)' : 'translateZ(0px)',
                    borderColor: `${card.accentColor}80`,
                  }}
                >
                  <div className={`flex items-center justify-between text-[10px] uppercase tracking-widest ${themeConfig.subtleText}`}>
                    <span>{card.name} · EDITORIAL ISSUE</span>
                    {card.visibleFields.location && profile.location && <span>{profile.location}</span>}
                  </div>
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      {renderFramedPortrait('h-16 w-16 rounded-xl border-2', {
                        borderColor: card.accentColor,
                      })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-2xl sm:text-3xl font-black tracking-tight uppercase truncate ${themeConfig.fontFamily}`}>
                        {profile.name}
                      </h3>
                      {(card.visibleFields.role || card.visibleFields.company) && (
                        <p className={`text-xs sm:text-sm font-semibold truncate ${themeConfig.accentText}`}>
                          {[
                            card.visibleFields.role ? profile.workData?.role || profile.role : '',
                            card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          ]
                            .filter(Boolean)
                            .join(' — ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeContentLayout === 'swiss_grid' ? (
                /* Layout 8: Swiss Modular Grid Header */
                <div
                  className={`grid grid-cols-12 border rounded-xl overflow-hidden transition-all duration-500 ${boxSurfaceClass}`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px)' : 'translateZ(0px)',
                  }}
                >
                  <div
                    className={`col-span-4 sm:col-span-3 p-2 border-r flex items-center justify-center ${
                      themeConfig.isLight ? 'bg-stone-900/5 border-stone-900/15' : 'bg-black/40 border-white/20'
                    }`}
                  >
                    {renderFramedPortrait('h-16 w-16 rounded-lg border', {
                      borderColor: card.accentColor,
                    })}
                  </div>
                  <div className="col-span-8 sm:col-span-9 p-2.5 flex flex-col justify-between">
                    <div className={`flex items-center justify-between text-[9px] uppercase tracking-widest font-semibold ${themeConfig.accentText}`}>
                      <span>01 / IDENTITY</span>
                      <span>{card.name}</span>
                    </div>
                    <div>
                      <h3 className={`text-lg sm:text-xl font-bold truncate ${themeConfig.fontFamily}`}>
                        {profile.name}
                      </h3>
                      {(card.visibleFields.role || card.visibleFields.company) && (
                        <p className={`text-xs truncate ${themeConfig.subtleText}`}>
                          {[
                            card.visibleFields.role ? profile.workData?.role || profile.role : '',
                            card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Default (executive_left & split_columns) Portrait & Identity Header */
                <div
                  className="flex items-center gap-4 transition-all duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: parallaxEnabled ? 'translateZ(48px) translateY(-2px)' : 'translateZ(0px)',
                  }}
                >
                  <div className="relative shrink-0" style={{ transformStyle: 'preserve-3d' }}>
                    {parallaxEnabled && (
                      <div
                        className="absolute -inset-1.5 rounded-2xl pointer-events-none border"
                        style={{
                          transform: 'translateZ(-18px) translateX(6px) translateY(8px)',
                          borderColor: `${card.accentColor}80`,
                          background: themeConfig.isLight ? 'rgba(214,211,209,0.7)' : 'rgba(0,0,0,0.78)',
                          boxShadow: themeConfig.isLight
                            ? '6px 12px 18px rgba(28,25,23,0.18)'
                            : '8px 16px 24px rgba(0,0,0,0.9)',
                        }}
                      />
                    )}
                    {renderFramedPortrait(
                      'h-20 w-20 rounded-2xl border-2',
                      {
                        borderColor: card.accentColor,
                        boxShadow:
                          parallaxEnabled && !themeConfig.isLight
                            ? '10px 20px 28px -4px rgba(0,0,0,0.92), 0 0 18px rgba(255,255,255,0.12)'
                            : undefined,
                      }
                    )}
                    {isKycVerified && (
                      <span
                        className="absolute -bottom-1.5 -right-1.5 z-20 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                        style={{
                          transform: parallaxEnabled ? 'translateZ(14px)' : undefined,
                        }}
                        title={`KYC Verified Identity · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div
                    className="min-w-0 flex-1"
                    style={{
                      textShadow:
                        parallaxEnabled && !themeConfig.isLight
                          ? '4px 10px 16px rgba(0,0,0,0.88)'
                          : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-semibold shadow-xs ${themeConfig.accentBg}`}
                      >
                        {card.name}
                      </span>
                      {companyLogo && card.visibleFields.companyLogo !== false && (
                        <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/20 backdrop-blur-xs flex items-center justify-center">
                          <img src={companyLogo} alt="Logo" className="h-6 max-w-[85px] object-contain rounded" />
                        </div>
                      )}
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-bold mt-1 truncate ${themeConfig.fontFamily}`}>
                      {profile.name}
                    </h3>
                    {(card.visibleFields.role || card.visibleFields.company || card.visibleFields.department) && (
                      <p className={`text-xs sm:text-sm font-semibold truncate ${themeConfig.accentText}`}>
                        {[
                          card.visibleFields.role ? profile.workData?.role || profile.role : '',
                          card.visibleFields.company ? profile.workData?.company || profile.company : '',
                          card.visibleFields.department ? profile.workData?.department : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {card.visibleFields.location && profile.location && (
                      <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${themeConfig.subtleText}`}>
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{profile.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Persistent Live Status & Timezone Bar (+32px Z) */}
              {livePresence.enabled && (
                <div
                  className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all duration-500 ${darkPanelClass}`}
                  style={{
                    transform: parallaxEnabled ? 'translateZ(32px)' : 'translateZ(0px)',
                    boxShadow:
                      parallaxEnabled && !themeConfig.isLight
                        ? '8px 16px 24px -4px rgba(0,0,0,0.85)'
                        : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full animate-pulse shrink-0 ${presenceStyle.dot}`} />
                    <span
                      className={`text-xs font-medium truncate ${
                        themeConfig.isLight ? 'text-stone-900' : 'text-white'
                      }`}
                    >
                      {ownerStatusText}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] shrink-0 font-semibold ${
                      themeConfig.isLight ? 'text-amber-800' : 'text-amber-300'
                    }`}
                  >
                    {holderLocalTime}
                  </span>
                </div>
              )}
            </div>

            {/* ---------------- SLIDE 01: UNIQUE DIRECT CONTACT & PERSONAL COORDINATES (Layout-Aware) ---------------- */}
            {storySlide === 0 && (
              <div
                className="relative z-20 my-3.5 space-y-3 animate-in fade-in duration-200 flex-1 flex flex-col justify-between"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {sharedCoordinateItems.length > 0 ? (
                  activeContentLayout === 'centered_monolith' ? (
                    <div
                      className="flex flex-wrap items-center justify-center gap-2 text-[11px] transition-all duration-500"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                      }}
                    >
                      {sharedCoordinateItems.map((item) => (
                        <div
                          key={item.key}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border max-w-full truncate ${pillSurfaceClass}`}
                          title={`${item.label}: ${item.value}`}
                        >
                          {item.icon}
                          <span className="truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : activeContentLayout === 'swiss_grid' ? (
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 border rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-current/15 text-[11px] ${boxSurfaceClass}`}
                      style={{
                        transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                      }}
                    >
                      {sharedCoordinateItems.map((item, idx) => (
                        <div
                          key={item.key}
                          className="p-2.5 flex items-center justify-between gap-2 border-b border-current/15"
                          title={`${item.label}: ${item.value}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-semibold shrink-0 ${
                                themeConfig.isLight ? 'text-amber-800' : 'text-amber-300/90'
                              }`}
                            >
                              0{idx + 2}
                            </span>
                            {item.icon}
                            <span className="truncate">{item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeContentLayout === 'structured_ledger' ? (
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                      }}
                    >
                      {sharedCoordinateItems.map((item) => (
                        <div
                          key={item.key}
                          className={`p-2 rounded-xl border flex flex-col gap-0.5 truncate ${pillSurfaceClass}`}
                          title={`${item.label}: ${item.value}`}
                        >
                          <span className={`text-[9px] uppercase tracking-wider flex items-center gap-1 ${themeConfig.subtleText}`}>
                            {item.icon}
                            <span>{item.label}</span>
                          </span>
                          <span className="truncate font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className={`grid ${
                        activeContentLayout === 'minimal_horizon'
                          ? 'grid-cols-1 gap-1.5'
                          : 'grid-cols-1 sm:grid-cols-2 gap-1.5'
                      } text-[11px] transition-all duration-500`}
                      style={{
                        transform: parallaxEnabled ? 'translateZ(36px)' : 'translateZ(0px)',
                      }}
                    >
                      {sharedCoordinateItems.map((item) =>
                        item.href ? (
                          <a
                            key={item.key}
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border truncate transition ${pillSurfaceClass} ${
                              item.fullWidth && activeContentLayout !== 'minimal_horizon' ? 'sm:col-span-2' : ''
                            }`}
                            title={`${item.label}: ${item.value}`}
                          >
                            {item.icon}
                            <span className="truncate">{item.value}</span>
                          </a>
                        ) : (
                          <div
                            key={item.key}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border truncate ${pillSurfaceClass} ${
                              item.fullWidth && activeContentLayout !== 'minimal_horizon' ? 'sm:col-span-2' : ''
                            }`}
                            title={`${item.label}: ${item.value}`}
                          >
                            {item.icon}
                            <span className="truncate">{item.value}</span>
                          </div>
                        )
                      )}
                    </div>
                  )
                ) : (
                  <div className={`p-4 rounded-xl border text-xs text-center ${boxSurfaceClass}`}>
                    No direct contact coordinates enabled in Selective Sharing for this card.
                  </div>
                )}
              </div>
            )}

            {/* ---------------- SLIDE 02: UNIQUE EXECUTIVE BIO, SPOTLIGHT & SOCIAL NETWORKS ---------------- */}
            {storySlide === 1 && (
              <div
                className="relative z-20 my-3.5 space-y-3 animate-in fade-in duration-200 flex-1 flex flex-col justify-between"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="space-y-2.5">
                  <div
                    className="flex items-center justify-between gap-2 transition-all duration-500"
                    style={{
                      transform: parallaxEnabled ? 'translateZ(34px)' : 'translateZ(0px)',
                    }}
                  >
                    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border font-bold shadow-xs ${themeConfig.accentBg}`}>
                      <Award className="h-3 w-3" />
                      <span>{storySpotlight.badge || 'PROFILE HIGHLIGHTS'}</span>
                    </span>
                    {storySpotlight.metricValue && (
                      <div
                        className="text-right"
                        style={{
                          textShadow:
                            parallaxEnabled && !themeConfig.isLight
                              ? '4px 8px 14px rgba(0,0,0,0.85)'
                              : undefined,
                        }}
                      >
                        <div
                          className={`text-sm font-black leading-none ${
                            themeConfig.isLight ? 'text-emerald-700' : 'text-emerald-400'
                          }`}
                        >
                          {storySpotlight.metricValue}
                        </div>
                        <div className={`text-[9px] ${themeConfig.subtleText}`}>
                          {storySpotlight.metricLabel || 'Identity Tier'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pop-Out Tagline, Bio & Highlights Card (+46px Z) */}
                  <div
                    className={`p-3.5 rounded-xl border backdrop-blur-md space-y-1.5 transition-all duration-500 ${darkPanelClass}`}
                    style={{
                      transform: parallaxEnabled ? 'translateZ(46px)' : 'translateZ(0px)',
                      boxShadow:
                        parallaxEnabled && !themeConfig.isLight
                          ? '10px 20px 30px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.2)'
                          : undefined,
                    }}
                  >
                    {(card.customTagline || profile.headline) && (
                      <p className={`text-xs italic font-medium ${themeConfig.accentText}`}>
                        "{card.customTagline || profile.headline}"
                      </p>
                    )}
                    <h4
                      className={`text-sm sm:text-base font-bold leading-snug ${
                        themeConfig.isLight ? 'text-stone-900' : 'text-white'
                      }`}
                    >
                      {storySpotlight.title}
                    </h4>
                    <p
                      className={`text-xs leading-relaxed ${
                        themeConfig.isLight ? 'text-stone-700' : 'text-slate-300'
                      }`}
                    >
                      {sharedBioText || storySpotlight.subtitle}
                    </p>
                  </div>
                </div>

                {/* Unique Social Networks & Video Pitch Row */}
                <div className="space-y-2 pt-1">
                  {renderSocialSymbolsRow('card')}

                  {videoIntro && (
                    <div
                      className="flex justify-end transition-all duration-500"
                      style={{
                        transform: parallaxEnabled ? 'translateZ(34px)' : 'translateZ(0px)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setIsVideoModalOpen(true)}
                        className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition ${pillSurfaceClass}`}
                      >
                        <Play
                          className={`h-3.5 w-3.5 fill-current ${
                            themeConfig.isLight ? 'text-amber-700' : 'text-amber-300'
                          }`}
                        />
                        <span>{card.videoTitle || 'Watch Video Pitch'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------- SLIDE 03: UNIFIED PASSIONS, EDUCATION & ARTIST PORTFOLIO SHOWCASE ---------------- */}
            {storySlide === 2 && (() => {
              const filledPassions = (profile.passions || []).filter((item) =>
                Boolean(item.title?.trim() || item.detail?.trim())
              );
              const filledEducation = (profile.education || []).filter((edu) =>
                Boolean(
                  edu.institution?.trim() ||
                    edu.degree?.trim() ||
                    edu.year?.trim() ||
                    edu.honors?.trim()
                )
              );
              const filledPortfolio = (profile.portfolio || []).filter((art) => {
                const isUntouchedDefault =
                  art.title === 'New Portfolio Work' &&
                  art.mediumOrRole === 'Mixed Media / Performance' &&
                  art.imageUrl === profile.avatarUrl;
                if (isUntouchedDefault) return false;
                return Boolean(
                  art.title?.trim() ||
                    art.mediumOrRole?.trim() ||
                    (art as any).roleOrMedium?.trim() ||
                    art.imageUrl?.trim() ||
                    art.description?.trim()
                );
              });

              const showPassions = card.visibleFields.passions !== false && filledPassions.length > 0;
              const showEducation = card.visibleFields.education !== false && filledEducation.length > 0;
              const showPortfolio = card.visibleFields.portfolioSection !== false && filledPortfolio.length > 0;

              const availableSlide3Tabs: Array<{
                id: 'passions' | 'education' | 'portfolio';
                label: string;
                count: number;
                activeClass: string;
                icon: React.ReactNode;
              }> = [
                ...(showPassions
                  ? [
                      {
                        id: 'passions' as const,
                        label: 'Passions',
                        count: filledPassions.length,
                        activeClass: 'bg-emerald-600 text-white shadow',
                        icon: <Trophy className="h-3 w-3 shrink-0" />,
                      },
                    ]
                  : []),
                ...(showEducation
                  ? [
                      {
                        id: 'education' as const,
                        label: 'Education',
                        count: filledEducation.length,
                        activeClass: 'bg-indigo-600 text-white shadow',
                        icon: <GraduationCap className="h-3 w-3 shrink-0" />,
                      },
                    ]
                  : []),
                ...(showPortfolio
                  ? [
                      {
                        id: 'portfolio' as const,
                        label: 'Portfolio',
                        count: filledPortfolio.length,
                        activeClass: 'bg-amber-500 text-slate-950 font-bold shadow',
                        icon: <Palette className="h-3 w-3 shrink-0" />,
                      },
                    ]
                  : []),
              ];

              const activeSlide3Tab = availableSlide3Tabs.some((t) => t.id === slide3Tab)
                ? slide3Tab
                : availableSlide3Tabs[0]?.id || null;

              return (
                <div
                  className="relative z-20 my-3 space-y-2.5 animate-in fade-in duration-200 flex-1 flex flex-col justify-between"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Dynamic Switcher: Only render tabs that are filled in Master Identity */}
                  {availableSlide3Tabs.length > 0 && (
                    <div className="space-y-2.5">
                      <div
                        className={`grid gap-1.5 p-1 rounded-xl border backdrop-blur-md ${boxSurfaceClass} ${
                          availableSlide3Tabs.length === 1
                            ? 'grid-cols-1'
                            : availableSlide3Tabs.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-3'
                        }`}
                      >
                        {availableSlide3Tabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSlide3Tab(tab.id)}
                            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                              activeSlide3Tab === tab.id
                                ? tab.activeClass
                                : themeConfig.isLight
                                ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-900/5'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {tab.icon}
                            <span className="truncate">{tab.label}</span>
                            <span className="text-[9px] opacity-80">({tab.count})</span>
                          </button>
                        ))}
                      </div>

                      {/* TAB CONTENT 1: HOBBIES, SPORTS & PASSIONS */}
                      {activeSlide3Tab === 'passions' && showPassions && (
                        <div className="space-y-1.5 max-h-[185px] overflow-y-auto pr-0.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filledPassions.map((item) => {
                              const badgeColor =
                                item.category === 'sport'
                                  ? themeConfig.isLight
                                    ? 'bg-emerald-500/15 text-emerald-800 border-emerald-600/35'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                  : item.category === 'hobby'
                                  ? themeConfig.isLight
                                    ? 'bg-sky-500/15 text-sky-800 border-sky-600/35'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                                  : themeConfig.isLight
                                  ? 'bg-amber-500/15 text-amber-800 border-amber-600/35'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-400/40';
                              return (
                                <div
                                  key={item.id}
                                  className={`p-2.5 rounded-xl border backdrop-blur-md space-y-1 ${darkPanelClass}`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span
                                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${badgeColor}`}
                                    >
                                      {item.category}
                                    </span>
                                    <Heart className="h-3 w-3 opacity-40 shrink-0" />
                                  </div>
                                  {item.title && (
                                    <div className="text-xs font-bold leading-snug truncate">
                                      {item.title}
                                    </div>
                                  )}
                                  {item.detail && (
                                    <div className={`text-[10px] leading-snug line-clamp-2 ${themeConfig.subtleText}`}>
                                      {item.detail}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB CONTENT 2: EDUCATION & CREDENTIALS */}
                      {activeSlide3Tab === 'education' && showEducation && (
                        <div className="space-y-1.5 max-h-[185px] overflow-y-auto pr-0.5">
                          <div className="space-y-1.5">
                            {filledEducation.map((edu) => (
                              <div
                                key={edu.id}
                                className={`p-2.5 rounded-xl border backdrop-blur-md flex items-start justify-between gap-2.5 ${darkPanelClass}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <GraduationCap
                                      className={`h-3.5 w-3.5 shrink-0 ${
                                        themeConfig.isLight ? 'text-indigo-700' : 'text-indigo-400'
                                      }`}
                                    />
                                    <span className="text-xs font-bold truncate">
                                      {edu.degree || edu.institution}
                                    </span>
                                  </div>
                                  {edu.degree && edu.institution && (
                                    <div
                                      className={`text-[11px] font-medium truncate mt-0.5 ${
                                        themeConfig.isLight ? 'text-indigo-800' : 'text-indigo-200'
                                      }`}
                                    >
                                      {edu.institution}
                                    </div>
                                  )}
                                  {edu.honors && (
                                    <div className={`text-[10px] truncate mt-0.5 ${themeConfig.subtleText}`}>
                                      {edu.honors}
                                    </div>
                                  )}
                                </div>
                                {edu.year && (
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded border shrink-0 font-semibold ${
                                      themeConfig.isLight
                                        ? 'bg-indigo-500/15 text-indigo-900 border-indigo-600/30'
                                        : 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
                                    }`}
                                  >
                                    {edu.year}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB CONTENT 3: ARTIST & CREATIVE PORTFOLIO COLLECTION */}
                      {activeSlide3Tab === 'portfolio' && showPortfolio && (
                        <div className="space-y-2 max-h-[195px] overflow-y-auto pr-0.5">
                          {profile.artistDiscipline && (
                            <div className={`flex items-center justify-between px-2.5 py-1 rounded-lg border ${themeConfig.accentBg}`}>
                              <span className="text-[10px] uppercase tracking-wider font-bold truncate">
                                {profile.artistDiscipline}
                              </span>
                              <span className="text-[9px] opacity-75 shrink-0">
                                Tap Artwork to Inspect
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            {filledPortfolio.map((art) => {
                              const roleOrMediumText =
                                art.mediumOrRole || (art as any).roleOrMedium || '';
                              return (
                                <div
                                  key={art.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePortfolioItem({
                                      ...art,
                                      roleOrMedium: roleOrMediumText,
                                    });
                                  }}
                                  className={`group/art relative rounded-xl overflow-hidden border hover:border-amber-400/70 cursor-pointer transition shadow-md ${darkPanelClass}`}
                                >
                                  {art.imageUrl && (
                                    <div className="relative h-20 w-full overflow-hidden bg-slate-900">
                                      <img
                                        src={art.imageUrl}
                                        alt={art.title || 'Portfolio artwork'}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                      {art.year && (
                                        <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded bg-black/75 text-amber-300 border border-white/15">
                                          {art.year}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="p-2 space-y-0.5">
                                    <div className="text-[11px] font-bold truncate">
                                      {art.title || 'Untitled Work'}
                                    </div>
                                    {roleOrMediumText && (
                                      <div className={`text-[9px] truncate ${themeConfig.accentText}`}>
                                        {roleOrMediumText}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compact Shareable Card Link, vCard & QR Footer Bar */}
                  <div className={`p-2.5 rounded-xl border backdrop-blur-md flex items-center justify-between gap-2.5 ${darkPanelClass}`}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold ${themeConfig.accentText}`}>
                        <Radio className={`h-3 w-3 shrink-0 ${themeConfig.isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                        <span className="truncate">{getCardDisplayUrl(card)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyPublicLink}
                          className="flex items-center gap-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition shadow"
                        >
                          {copiedLink ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                          <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadVCF}
                          className={`flex items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
                            themeConfig.isLight
                              ? 'bg-stone-900/10 hover:bg-stone-900/20 text-stone-900 border border-stone-900/15'
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          <Download className="h-2.5 w-2.5" />
                          <span>Save vCard</span>
                        </button>
                      </div>
                    </div>
                    {qrDataUrl && (
                      <div className="p-1 bg-white rounded-lg shadow shrink-0 border border-stone-200">
                        <img src={qrDataUrl} alt="My Card QR" className="h-11 w-11" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Story Deck Bottom Navigation Bar (+18px Z) */}
            <div
              className={`relative z-10 pt-3 border-t flex items-center justify-between text-xs transition-all duration-500 ${
                themeConfig.isLight ? 'border-stone-900/15' : 'border-white/15'
              }`}
              style={{
                transform: parallaxEnabled ? 'translateZ(18px)' : 'translateZ(0px)',
              }}
            >
              <button
                type="button"
                onClick={() => setStorySlide((prev) => (prev - 1 + 3) % 3)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                  themeConfig.isLight
                    ? 'bg-stone-900/10 hover:bg-stone-900/20 text-stone-900 border border-stone-900/15'
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => setStorySlide((prev) => (prev + 1) % 3)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                  themeConfig.isLight
                    ? 'bg-stone-900/10 hover:bg-stone-900/20 text-stone-900 border border-stone-900/15'
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. APPLE & GOOGLE WALLET PASS VIEW (Owner Only)           */}
      {/* ========================================================= */}
      {layoutMode === 'wallet_pass' && !recipientMode && (
        <div
          className={`digital-card-preserve relative max-w-md mx-auto rounded-3xl border p-5 space-y-4 overflow-hidden transition-all duration-300 ${themeConfig.containerClass} ${cardFontClass}`}
        >
          {renderMaterialOverlay(card.materialFinish)}

          {coverBanner && (
            <div className="absolute top-0 inset-x-0 h-28 overflow-hidden pointer-events-none z-0">
              <img src={coverBanner} alt="Cover Banner" className="w-full h-full object-cover opacity-35" />
              <div
                className={`absolute inset-0 bg-gradient-to-b ${
                  themeConfig.isLight
                    ? 'from-white/10 via-white/75 to-white/95'
                    : 'from-black/15 via-black/70 to-black/90'
                }`}
              />
            </div>
          )}

          {/* Pass Top Ribbon */}
          <div
            className={`relative z-10 flex items-center justify-between pb-3 border-b ${
              themeConfig.isLight ? 'border-stone-900/15' : 'border-white/15'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md flex items-center justify-center font-bold text-white text-xs shadow-sm"
                style={{ backgroundColor: card.accentColor || '#6366f1' }}
              >
                Y
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  themeConfig.isLight ? 'text-stone-900' : 'text-white'
                }`}
              >
                YouConnect Pass
              </span>
            </div>
            <div className="flex items-center gap-2">
              {companyLogo && card.visibleFields.companyLogo !== false && (
                <div className={`px-1.5 py-0.5 rounded border ${boxSurfaceClass}`}>
                  <img src={companyLogo} alt="Logo" className="max-h-4 max-w-[60px] object-contain rounded" />
                </div>
              )}
              <span
                className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${themeConfig.accentBg}`}
              >
                {card.name}
              </span>
            </div>
          </div>

          {/* Attendee Info Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative shrink-0">
              {renderFramedPortrait(
                `h-14 w-14 rounded-full border-2 shadow ${
                  themeConfig.isLight ? 'border-stone-900/30' : 'border-white/40'
                }`
              )}
              {isKycVerified && (
                <span
                  className="absolute -bottom-1 -right-1 z-20 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow"
                  title={`KYC Verified · ${profile.kycVerification?.traceabilityId}`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h4
                className={`text-lg font-bold leading-tight flex items-center gap-1.5 ${
                  themeConfig.isLight ? 'text-stone-900' : 'text-white'
                }`}
              >
                <span className="truncate">{profile.name}</span>
                {isKycVerified && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
              </h4>
              {card.visibleFields.role && (
                <p className={`text-xs font-semibold truncate ${themeConfig.accentText}`}>
                  {profile.workData?.role || profile.role}
                </p>
              )}
              {(card.visibleFields.company || card.visibleFields.department) && (
                <p className={`text-[11px] truncate ${themeConfig.subtleText}`}>
                  {card.visibleFields.company ? profile.workData?.company || profile.company : ''}
                  {card.visibleFields.department && profile.workData?.department
                    ? card.visibleFields.company
                      ? ` · ${profile.workData.department}`
                      : profile.workData.department
                    : ''}
                </p>
              )}
              {card.visibleFields.location && profile.location && (
                <p className={`text-[11px] truncate flex items-center gap-1 mt-0.5 ${themeConfig.subtleText}`}>
                  <MapPin className={`h-3 w-3 shrink-0 ${themeConfig.accentText}`} />
                  <span>{profile.location}</span>
                </p>
              )}
            </div>
          </div>

          {sharedBioText && (
            <p
              className={`relative z-10 text-[11px] leading-relaxed line-clamp-2 ${
                themeConfig.isLight ? 'text-stone-800' : 'text-white/90'
              }`}
            >
              {sharedBioText}
            </p>
          )}

          {/* Selected Coordinates on Pass */}
          {sharedCoordinateItems.length > 0 && (
            <div className={`relative z-10 grid grid-cols-1 gap-1.5 p-3 rounded-xl border text-xs ${darkPanelClass}`}>
              {sharedCoordinateItems.map((item) =>
                item.href ? (
                  <a
                    key={item.key}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-2 hover:underline truncate ${
                      themeConfig.isLight ? 'text-stone-900' : 'text-white'
                    } ${item.mono ? 'font-mono' : ''}`}
                  >
                    {item.icon}
                    <span className="truncate">{item.value}</span>
                  </a>
                ) : (
                  <div
                    key={item.key}
                    className={`flex items-center gap-2 truncate ${
                      themeConfig.isLight ? 'text-stone-900' : 'text-white'
                    } ${item.mono ? 'font-mono' : ''}`}
                  >
                    {item.icon}
                    <span className="truncate">{item.value}</span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="relative z-10">{renderSocialSymbolsRow('pass')}</div>

          {/* Pass Metadata Fields */}
          <div className={`relative z-10 grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs ${boxSurfaceClass}`}>
            <div>
              <div className={`text-[10px] uppercase font-mono ${themeConfig.subtleText}`}>Card Name</div>
              <div className="font-semibold">{card.name}</div>
            </div>
            <div>
              <div className={`text-[10px] uppercase font-mono ${themeConfig.subtleText}`}>Circle Tag</div>
              <div className="font-semibold">#{card.tag || 'Business'}</div>
            </div>
            <div>
              <div className={`text-[10px] uppercase font-mono ${themeConfig.subtleText}`}>Security NFC</div>
              <div
                className={`font-semibold flex items-center gap-1 ${
                  themeConfig.isLight ? 'text-emerald-700' : 'text-emerald-400'
                }`}
              >
                <Radio className="h-3 w-3" /> Active NDEF
              </div>
            </div>
            <div>
              <div className={`text-[10px] uppercase font-mono ${themeConfig.subtleText}`}>Local Time</div>
              <div className={`font-semibold ${themeConfig.accentText}`}>{holderLocalTime || 'Active'}</div>
            </div>
          </div>

          {/* High Density Barcode / QR Section */}
          <div className="relative z-10 p-4 bg-white rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-inner">
            {qrDataUrl && <img src={qrDataUrl} alt="Pass Barcode" className="h-36 w-36" />}
            <div className="font-mono text-xs font-bold tracking-widest text-black">YC-PASS-8840-X9</div>
          </div>

          {walletNotice && (
            <div className="relative z-10 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-700/60 text-center text-xs text-emerald-200">
              {walletNotice}
            </div>
          )}

          {/* Add to Apple / Google Wallet Buttons */}
          <div className="relative z-10 space-y-2 pt-1">
            <button
              onClick={() => {
                handleDownloadVCF();
                setWalletNotice('Downloaded contact pass (.vcf) — ready to import to Apple Wallet & Contacts.');
                setTimeout(() => setWalletNotice(null), 4000);
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition shadow-lg ${pillSurfaceClass}`}
            >
              <Smartphone className="h-4 w-4" />
              <span>Add to Apple Wallet</span>
            </button>
            <button
              onClick={() => {
                handleDownloadVCF();
                setWalletNotice('Downloaded vCard payload — ready to save to Google Wallet & Contacts.');
                setTimeout(() => setWalletNotice(null), 4000);
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-xs transition ${pillSurfaceClass}`}
            >
              <Globe className={`h-4 w-4 ${themeConfig.accentText}`} />
              <span>Save to Google Wallet</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. RECIPROCAL CONTACT EXCHANGE MODAL                      */}
      {/* ========================================================= */}
      {isExchangeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Send Your Details Back</h3>
              </div>
              <button onClick={() => setIsExchangeOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {exchangeSubmitted ? (
              <div className="p-5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">Contact Details Sent!</div>
                <p className="text-xs text-emerald-300">
                  {profile.name} has received your information and it was added to your mutual CRM directory.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReciprocalSubmit} className="space-y-3 text-xs">
                <p className="text-slate-400 text-xs">
                  Leave your contact information with <strong>{profile.name}</strong> to complete the mutual exchange
                  loop.
                </p>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={exchangeForm.name}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, name: e.target.value })}
                    placeholder="e.g. Jordan Lee"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Your Email Address *</label>
                  <input
                    type="email"
                    required
                    value={exchangeForm.email}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, email: e.target.value })}
                    placeholder="jordan.lee@example.com"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={exchangeForm.phone}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                  <input
                    type="text"
                    value={exchangeForm.company}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, company: e.target.value })}
                    placeholder="e.g. Apex Ventures"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Personal Note / Icebreaker</label>
                  <textarea
                    rows={2}
                    value={exchangeForm.notes}
                    onChange={(e) => setExchangeForm({ ...exchangeForm, notes: e.target.value })}
                    placeholder="Great meeting at the conference keynote..."
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsExchangeOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send My Details</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Video Business Card Player Modal */}
      {isVideoModalOpen && videoIntro && (
        <div
          onClick={() => setIsVideoModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{card.videoTitle || 'Video Introduction'}</h4>
                  <p className="text-[10px] text-slate-400">Presented by {profile.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              {videoInfo?.type === 'youtube' || videoInfo?.type === 'vimeo' ? (
                <iframe
                  src={videoInfo.embedUrl}
                  title="Video Introduction"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : videoInfo?.type === 'video' ? (
                <video src={videoInfo.embedUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-slate-300">Open external video greeting:</p>
                  <a
                    href={videoIntro}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Watch Video</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Artist & Creative Portfolio Lightbox Modal */}
      {activePortfolioItem && (
        <div
          onClick={() => setActivePortfolioItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Palette className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{activePortfolioItem.title}</h4>
                  <p className="text-[11px] font-mono text-amber-300 truncate">
                    {activePortfolioItem.roleOrMedium}
                    {activePortfolioItem.year ? ` · ${activePortfolioItem.year}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePortfolioItem(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 max-h-80 flex items-center justify-center">
              <img
                src={activePortfolioItem.imageUrl}
                alt={activePortfolioItem.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-80 object-contain"
              />
            </div>

            {activePortfolioItem.description && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePortfolioItem.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400">
                {profile.name} · {profile.artistDiscipline || 'Artist & Creative Portfolio'}
              </span>
              {activePortfolioItem.linkUrl && (
                <a
                  href={activePortfolioItem.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>View Work</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
