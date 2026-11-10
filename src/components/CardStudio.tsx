import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MasterProfile, DigitalCard, CardTheme, CardMaterial, CardLayoutMode, CRMContact, ProfileCategory, CardVisibleFields, PrimaryCtaType, StoredPicture, SubscriptionState, AiUsageType } from '../types';
import { generateVCardString, downloadVCard } from '../utils/vcard';
import { getCardPublicUrl, getCardDisplayUrl, publishCardToServer } from '../utils/urlHelper';
import { apiFetch } from '../utils/apiConfig';
import { PROFILE_CATEGORIES, COVER_BANNER_PRESETS, LandscapePresetCategory, PERSONA_PRESETS } from '../data/presets';
import { extractPersonSilhouetteCutout } from '../utils/silhouetteExtractor';
import { enhancePhotoWithAI, AvatarStyle } from '../utils/aiPhotoEnhancer';
import {
  MAJOR_SOCIAL_PLATFORMS,
  getFullSocialUrl,
  getProfileSocialValue,
  getFilledSocialAccounts,
  getPlatformConfig,
  isSocialAccountVisible,
} from '../data/socialRegistry';
import {
  isWebNfcSupported,
  writeBusinessCardToNfc,
  startNfcReader,
  NfcReadResult,
} from '../services/nfc';
import { AIBioModal } from './AIBioModal';
import { AvatarManagerModal } from './AvatarManagerModal';
import { CreatePersonaModal } from './CreatePersonaModal';
import { CreateCardModal } from './CreateCardModal';
import { KYCRegistrationModal } from './KYCRegistrationModal';
import { MasterProfileEditor } from './MasterProfileEditor';
import { DigitalCardRenderer } from './DigitalCardRenderer';
import { EmailSignatureModal } from './EmailSignatureModal';
import { AIBannerModal } from './AIBannerModal';
import { RubricaField, PersonalData, WorkData } from '../types';
import {
  Sparkles,
  QrCode,
  Radio,
  Download,
  CreditCard,
  Share2,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Linkedin,
  Twitter,
  Github,
  Calendar,
  Layers,
  Palette,
  Eye,
  Sliders,
  Copy,
  CheckCheck,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Inbox,
  User,
  Briefcase,
  BookOpen,
  Camera,
  Wand2,
  Plus,
  Trash2,
  Building2,
  Home,
  Cake,
  MessageSquare,
  Tag,
  FolderHeart,
  Heart,
  CopyPlus,
  Image,
  Play,
  Video,
  RotateCcw,
  ChevronDown,
  X,
  Lock,
  Coins,
  Award,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

interface CardStudioProps {
  profile: MasterProfile;
  cards: DigitalCard[];
  activeCard: DigitalCard;
  onSelectCard: (card: DigitalCard) => void;
  onUpdateProfile: (updated: MasterProfile) => void;
  onUpdateCard: (updated: DigitalCard) => void;
  onSelectPersona: (id: string) => void;
  allPersonas: MasterProfile[];
  onAddContactToCRM?: (contact: CRMContact) => void;
  onCreatePersona?: (newPersona: MasterProfile, matchingCard?: DigitalCard) => void;
  onDeletePersona?: (personaId: string) => void;
  onCreateCard?: (newCard: DigitalCard) => void;
  onDeleteCard?: (cardId: string) => void;
  onDuplicateCard?: (cardId: string) => void;
  subscription?: SubscriptionState;
  onConsumeAiCoin?: (usageType: AiUsageType, actionLabel: string) => boolean;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

export const CardStudio: React.FC<CardStudioProps> = ({
  profile,
  cards,
  activeCard,
  onSelectCard,
  onUpdateProfile,
  onUpdateCard,
  onSelectPersona,
  allPersonas,
  onAddContactToCRM,
  onCreatePersona,
  onDeletePersona,
  onCreateCard,
  onDeleteCard,
  onDuplicateCard,
  subscription,
  onConsumeAiCoin,
  onOpenSubscriptionModal,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrMode, setQrMode] = useState<'vcard' | 'weblink'>('weblink');
  const [copiedLink, setCopiedLink] = useState(false);
  const [nfcState, setNfcState] = useState<'idle' | 'writing' | 'written'>('idle');
  const [nfcLogs, setNfcLogs] = useState<string[]>([]);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarModalTab, setAvatarModalTab] = useState<'vault' | 'library' | 'camera' | 'ai'>('vault');
  const [isCreatePersonaModalOpen, setIsCreatePersonaModalOpen] = useState(false);
  const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);
  const [isEmailSignatureModalOpen, setIsEmailSignatureModalOpen] = useState(false);
  const [isAiBannerModalOpen, setIsAiBannerModalOpen] = useState(false);
  const [bannerSourceTab, setBannerSourceTab] = useState<'hub' | 'presets'>('presets');
  const [landscapeFilter, setLandscapeFilter] = useState<'all' | LandscapePresetCategory>('all');
  const [isRecreating3DAvatar, setIsRecreating3DAvatar] = useState(false);
  const [portraitPresetFilter, setPortraitPresetFilter] = useState<'all' | 'headshot' | '3d_stylized'>('all');
  const [avatarStylePreset, setAvatarStylePreset] = useState<
    | 'executive'
    | 'casual'
    | 'country_club'
    | 'athletic'
    | 'cyber'
    | 'editorial'
    | '3d_pixar'
    | 'comic_book'
    | 'cartoon'
    | 'manga'
    | '3d_photoreal'
    | 'cyberpunk'
    | 'pop_art'
    | 'oil_painting'
    | 'custom_only'
  >('custom_only');
  const [avatarCustomCommand, setAvatarCustomCommand] = useState('');
  const [avatarCreationStatus, setAvatarCreationStatus] = useState<string | null>(null);
  const [isPortraitVaultOpen, setIsPortraitVaultOpen] = useState(false);
  const [isBackgroundVaultOpen, setIsBackgroundVaultOpen] = useState(false);
  const [portraitVaultAnchorUrl, setPortraitVaultAnchorUrl] = useState<string>(
    () => profile.avatarUrl?.trim() || ''
  );
  const [backgroundVaultAnchorUrl, setBackgroundVaultAnchorUrl] = useState<string>(
    () => activeCard.coverBannerUrl?.trim() || ''
  );

  // Only update the front-of-vault anchor when the vault is closed, so clicking
  // different images while the vault is open keeps every image in its exact place.
  useEffect(() => {
    if (!isPortraitVaultOpen) {
      setPortraitVaultAnchorUrl(profile.avatarUrl?.trim() || '');
    }
  }, [isPortraitVaultOpen, profile.avatarUrl]);

  useEffect(() => {
    if (!isBackgroundVaultOpen) {
      setBackgroundVaultAnchorUrl(activeCard.coverBannerUrl?.trim() || '');
    }
  }, [isBackgroundVaultOpen, activeCard.coverBannerUrl]);

  const handleTogglePortraitVault = (forceState?: boolean) => {
    setIsPortraitVaultOpen((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      if (next && !prev) {
        setPortraitVaultAnchorUrl(profile.avatarUrl?.trim() || '');
      }
      return next;
    });
  };

  const handleToggleBackgroundVault = (forceState?: boolean) => {
    setIsBackgroundVaultOpen((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      if (next && !prev) {
        setBackgroundVaultAnchorUrl(activeCard.coverBannerUrl?.trim() || '');
      }
      return next;
    });
  };

  const [deletedPortraitsHistory, setDeletedPortraitsHistory] = useState<
    Array<{ item: StoredPicture; wasActive: boolean }>
  >([]);
  const [deletedBannersHistory, setDeletedBannersHistory] = useState<
    Array<{ item: StoredPicture; wasActive: boolean }>
  >([]);
  const [enlargedPreviewImage, setEnlargedPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'images' | 'card' | 'fields'>('profile');
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const mobileEditorSectionRef = useRef<HTMLDivElement | null>(null);
  const [openAccordions, setOpenAccordions] = useState<{
    personal: boolean;
    work: boolean;
    beyond: boolean;
    socials: boolean;
    portrait: boolean;
    background: boolean;
    theme: boolean;
    sharing: boolean;
  }>({
    personal: false,
    work: false,
    beyond: false,
    socials: false,
    portrait: false,
    background: false,
    theme: false,
    sharing: false,
  });

  const handleRecallMobileSection = (sectionKey?: keyof typeof openAccordions) => {
    if (sectionKey && isMobileEditorOpen && openAccordions[sectionKey]) {
      setIsMobileEditorOpen(false);
      return;
    }
    const targetKey = sectionKey || 'personal';
    setIsMobileEditorOpen(true);
    setOpenAccordions({
      personal: targetKey === 'personal',
      work: targetKey === 'work',
      beyond: targetKey === 'beyond',
      socials: targetKey === 'socials',
      portrait: targetKey === 'portrait',
      background: targetKey === 'background',
      theme: targetKey === 'theme',
      sharing: targetKey === 'sharing',
    });
    window.setTimeout(() => {
      mobileEditorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const toggleAccordion = (key: keyof typeof openAccordions) => {
    setOpenAccordions((prev) => {
      const nextOpen = !prev[key];
      if (key === 'portrait' && !nextOpen) {
        setIsPortraitVaultOpen(false);
      }
      if (key === 'background' && !nextOpen) {
        setIsBackgroundVaultOpen(false);
      }
      const updated = { ...prev, [key]: nextOpen };
      if (!Object.values(updated).some(Boolean)) {
        setIsMobileEditorOpen(false);
      }
      return updated;
    });
  };

  const areAllAccordionsOpen = Object.values(openAccordions).every(Boolean);
  const handleToggleAllAccordions = () => {
    const nextState = !areAllAccordionsOpen;
    setOpenAccordions({
      personal: nextState,
      work: nextState,
      beyond: nextState,
      socials: nextState,
      portrait: nextState,
      background: nextState,
      theme: nextState,
      sharing: nextState,
    });
  };

  const portraitSectionRef = useRef<HTMLDivElement | null>(null);

  const handleOpenImageHub = (section: 'portrait' | 'background' = 'portrait') => {
    setIsMobileEditorOpen(true);
    setOpenAccordions((prev) => ({
      ...prev,
      [section]: true,
    }));
    window.setTimeout(() => {
      if (section === 'portrait' && portraitSectionRef.current) {
        portraitSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        mobileEditorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Framing, Zoom & Pan State for the Image Hub
  const [isDraggingFramingPreview, setIsDraggingFramingPreview] = useState(false);
  const framingDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  const handleFramingPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!profile.avatarUrl) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    framingDragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: typeof activeCard.avatarOffsetX === 'number' ? activeCard.avatarOffsetX : 50,
      initialOffsetY: typeof activeCard.avatarOffsetY === 'number' ? activeCard.avatarOffsetY : 18,
    };
    setIsDraggingFramingPreview(true);
  };

  const handleFramingPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!framingDragRef.current?.active) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - framingDragRef.current.startX;
    const dy = e.clientY - framingDragRef.current.startY;
    const nextX = Math.max(0, Math.min(100, Math.round(framingDragRef.current.initialOffsetX - dx * 0.4)));
    const nextY = Math.max(0, Math.min(100, Math.round(framingDragRef.current.initialOffsetY - dy * 0.4)));
    onUpdateCard({
      ...activeCard,
      avatarOffsetX: nextX,
      avatarOffsetY: nextY,
    });
  };

  const handleFramingPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!framingDragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    framingDragRef.current = null;
    setIsDraggingFramingPreview(false);
  };

  const handleSetZoom = (nextZoom: number) => {
    const clamped = Math.max(1.0, Math.min(2.5, Math.round(nextZoom * 100) / 100));
    onUpdateCard({
      ...activeCard,
      avatarZoom: clamped,
    });
  };

  const handleStepZoom = (delta: number) => {
    const currentZoom = typeof activeCard.avatarZoom === 'number' ? activeCard.avatarZoom : 1.0;
    handleSetZoom(currentZoom + delta);
  };

  const handleNudgePan = (deltaX: number, deltaY: number) => {
    const currentX = typeof activeCard.avatarOffsetX === 'number' ? activeCard.avatarOffsetX : 50;
    const currentY = typeof activeCard.avatarOffsetY === 'number' ? activeCard.avatarOffsetY : 18;
    const nextX = Math.max(0, Math.min(100, currentX + deltaX));
    const nextY = Math.max(0, Math.min(100, currentY + deltaY));
    onUpdateCard({
      ...activeCard,
      avatarOffsetX: nextX,
      avatarOffsetY: nextY,
    });
  };

  const handleResetFraming = () => {
    onUpdateCard({
      ...activeCard,
      avatarZoom: 1.0,
      avatarOffsetX: 50,
      avatarOffsetY: 18,
    });
  };

  const [imageHubSubTab, setImageHubSubTab] = useState<'avatar' | 'background'>('avatar');
  const [paletteGroup, setPaletteGroup] = useState<'all' | 'signature' | 'metals'>('all');
  const [inlineBannerPrompt, setInlineBannerPrompt] = useState('');
  const [isGeneratingInlineBanner, setIsGeneratingInlineBanner] = useState(false);
  const [isCardSelectorOpen, setIsCardSelectorOpen] = useState(false);
  const [isQrNfcPanelOpen, setIsQrNfcPanelOpen] = useState(false);

  // Brand & Logo Management States in Card Theme & Style -> Brand & Media
  const [brandLogoStyle, setBrandLogoStyle] = useState<
    'minimal_monogram' | 'luxury_crest' | 'tech_geometric' | 'creative_emblem'
  >('minimal_monogram');
  const [brandLogoPrompt, setBrandLogoPrompt] = useState('');
  const [isGeneratingBrandLogo, setIsGeneratingBrandLogo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropFileInputRef = useRef<HTMLInputElement | null>(null);
  const profilePhotoFileInputRef = useRef<HTMLInputElement | null>(null);
  const brandLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInstructionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bannerInstructionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const syncTextareaHeight = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.max(58, el.scrollHeight + 2)}px`;
    };
    syncTextareaHeight(avatarInstructionTextareaRef.current);
    syncTextareaHeight(bannerInstructionTextareaRef.current);
    const frameId = window.requestAnimationFrame(() => {
      syncTextareaHeight(avatarInstructionTextareaRef.current);
      syncTextareaHeight(bannerInstructionTextareaRef.current);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [avatarCustomCommand, inlineBannerPrompt, imageHubSubTab, activeTab, openAccordions]);

  // Preserve previous portrait only if explicitly recorded before an AI transformation
  const originalPortraitUrl =
    profile.previousAvatarUrl && profile.previousAvatarUrl !== profile.avatarUrl
      ? profile.previousAvatarUrl
      : undefined;

  const handleRestoreOriginalAvatar = async () => {
    if (!originalPortraitUrl) return;
    onUpdateProfile({
      ...profile,
      avatarUrl: originalPortraitUrl,
      previousAvatarUrl: undefined,
    });
    setAvatarCreationStatus('Previous portrait restored.');
    setTimeout(() => setAvatarCreationStatus(null), 3000);
  };

  // Upload Profile Photo directly inside Image Hub
  const handleUploadProfilePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 720;
        const scale = Math.max(img.width, img.height) > maxDim ? maxDim / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        const compressedUrl = ctx
          ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height),
            canvas.toDataURL('image/jpeg', 0.9))
          : rawDataUrl;

        const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Portrait';
        const newPic: StoredPicture = {
          id: `pic-upload-${Date.now()}`,
          name: cleanName,
          url: compressedUrl,
          context: 'custom',
          originalSource: 'library',
          createdAt: new Date().toISOString(),
        };
        const currentPics = (profile.storedPictures || []).filter(
          (p) => p.url !== compressedUrl
        );
        onUpdateProfile({
          ...profile,
          previousAvatarUrl: undefined,
          avatarUrl: compressedUrl,
          storedPictures: [newPic, ...currentPics],
        });
        setAvatarCreationStatus(`Uploaded "${cleanName}" and set as active profile image.`);
        setTimeout(() => setAvatarCreationStatus(null), 3500);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Unified AI Headshot, Attire & 3D/Stylized Avatar Generator from Active Profile Image (profile.avatarUrl)
  const handleRecreate3DAvatar = async () => {
    if (isRecreating3DAvatar || !profile.avatarUrl) return;

    const headshotStyleIds = ['executive', 'casual', 'country_club', 'athletic', 'cyber', 'editorial', 'custom_only'];
    const isHeadshotPreset = headshotStyleIds.includes(avatarStylePreset);

    if (avatarStylePreset === 'custom_only' && !avatarCustomCommand.trim()) {
      setAvatarCreationStatus('Please enter custom instructions below or select one of the presets above.');
      return;
    }

    const presetLabels: Record<string, string> = {
      executive: 'Executive Studio',
      casual: 'Casual Lifestyle',
      country_club: 'Country Club',
      athletic: 'Athletic Game-Day',
      cyber: 'Modern Tech & Cyber',
      editorial: 'Monochrome Editorial',
      custom_only: 'Custom AI Studio',
      '3d_pixar': '3D Animation Studio',
      comic_book: 'Comic Book Hero',
      cartoon: 'Cartoon Illustration',
      manga: 'Manga & Anime',
      '3d_photoreal': '3D Photorealistic',
      cyberpunk: 'Cyberpunk 3D Neon',
      pop_art: 'Pop Art Screenprint',
      oil_painting: 'Classical Oil Portrait',
    };
    const chosenLabel = presetLabels[avatarStylePreset] || 'AI Portrait';

    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin(
        isHeadshotPreset ? 'image_headshot' : 'image_3d_avatar',
        `${chosenLabel} (${profile.name})`
      );
      if (!allowed) return;
    }

    const activeSourcePortrait = profile.avatarUrl;
    setIsRecreating3DAvatar(true);
    setAvatarCreationStatus(null);

    // Track A: Studio Headshot & Attire Presets (or Custom Instructions Only)
    if (isHeadshotPreset) {
      const effectiveStyleParam: AvatarStyle =
        avatarStylePreset === 'custom_only' ? 'custom' : (avatarStylePreset as AvatarStyle);
      try {
        let finalHeadshotUrl: string | null = null;
        try {
          const res = await apiFetch('/api/ai/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: avatarCustomCommand,
              style: effectiveStyleParam,
              name: profile.name,
              inputImage: activeSourcePortrait,
              mode: 'modify',
            }),
          });
          if (res.ok) {
            const serverData = await res.json();
            if (
              serverData?.imageUrl &&
              serverData.imageUrl.startsWith('data:') &&
              serverData.model === 'gemini-3.1-flash-lite-image'
            ) {
              finalHeadshotUrl = serverData.imageUrl;
            }
          }
        } catch (err) {
          console.warn('Headshot server endpoint notice:', err);
        }

        if (!finalHeadshotUrl) {
          finalHeadshotUrl = await enhancePhotoWithAI({
            imageUrl: activeSourcePortrait,
            style: effectiveStyleParam,
            prompt: avatarCustomCommand,
          });
        }

        const newHeadshotEntry: StoredPicture = {
          id: `pic-ai-${Date.now()}`,
          name: `${chosenLabel}${avatarCustomCommand.trim() ? ` (${avatarCustomCommand.trim().slice(0, 18)})` : ''}`,
          url: finalHeadshotUrl,
          context: (avatarStylePreset === 'custom_only' ? 'custom' : avatarStylePreset) as any,
          aiStyle: effectiveStyleParam,
          isAiGenerated: true,
          isAiModified: true,
          createdAt: new Date().toISOString(),
        };

        const existingPics = (profile.storedPictures || []).filter(
          (p) => p.url !== finalHeadshotUrl
        );
        onUpdateProfile({
          ...profile,
          previousAvatarUrl: activeSourcePortrait,
          avatarUrl: finalHeadshotUrl,
          storedPictures: [newHeadshotEntry, ...existingPics],
        });
        setAvatarCreationStatus(
          `Applied "${newHeadshotEntry.name}" to your active portrait and saved to your Image Hub Vault.`
        );
      } catch (err) {
        console.warn('Headshot enhancement error:', err);
      } finally {
        setIsRecreating3DAvatar(false);
      }
      return;
    }

    // Track B: 3D & Stylized Character Avatar Presets
    try {
      const res = await apiFetch('/api/ai/avatar-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputImage: activeSourcePortrait,
          name: profile.name,
          role: profile.workData?.role || profile.role,
          stylePreset: avatarStylePreset,
          customCommand: avatarCustomCommand,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = async () => {
            const size = 640;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            let finalAvatarUrl = data.imageUrl;
            if (ctx) {
              // Center-crop square
              const minSide = Math.min(img.width, img.height);
              const sx = (img.width - minSide) / 2;
              const sy = (img.height - minSide) / 2;

              if (data.shouldClientStylize) {
                if (avatarStylePreset === 'comic_book') {
                  ctx.filter = 'contrast(1.38) saturate(1.45) brightness(1.04)';
                } else if (avatarStylePreset === 'cartoon') {
                  ctx.filter = 'saturate(1.55) contrast(1.22) brightness(1.06)';
                } else if (avatarStylePreset === 'manga') {
                  ctx.filter = 'contrast(1.42) saturate(0.85) brightness(1.08)';
                } else if (avatarStylePreset === 'cyberpunk') {
                  ctx.filter = 'contrast(1.3) saturate(1.5) hue-rotate(-12deg)';
                } else if (avatarStylePreset === 'pop_art') {
                  ctx.filter = 'contrast(1.5) saturate(1.75)';
                } else if (avatarStylePreset === 'oil_painting') {
                  ctx.filter = 'contrast(1.18) saturate(1.28) sepia(0.18)';
                } else {
                  ctx.filter = 'contrast(1.16) saturate(1.22) brightness(1.04)';
                }
              }

              ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
              ctx.filter = 'none';

              if (data.shouldClientStylize) {
                const grad = ctx.createRadialGradient(size * 0.5, size * 0.35, size * 0.2, size * 0.5, size * 0.5, size * 0.72);
                if (avatarStylePreset === 'cyberpunk') {
                  grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
                  grad.addColorStop(1, 'rgba(217, 70, 239, 0.32)');
                } else if (avatarStylePreset === 'comic_book' || avatarStylePreset === 'pop_art') {
                  grad.addColorStop(0, 'rgba(250, 204, 21, 0)');
                  grad.addColorStop(1, 'rgba(220, 38, 38, 0.26)');
                } else if (avatarStylePreset === 'manga') {
                  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                  grad.addColorStop(1, 'rgba(99, 102, 241, 0.25)');
                } else {
                  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                  grad.addColorStop(1, 'rgba(15, 23, 42, 0.28)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, size, size);
              }

              finalAvatarUrl = canvas.toDataURL('image/jpeg', 0.9);
            }

            const newAvatarEntry: StoredPicture = {
              id: `pic-3d-${Date.now()}`,
              name: `${chosenLabel}${avatarCustomCommand.trim() ? ` (${avatarCustomCommand.trim().slice(0, 18)})` : ''}`,
              url: finalAvatarUrl,
              context: 'custom',
              aiStyle: avatarStylePreset,
              isAiGenerated: true,
              createdAt: new Date().toISOString(),
            };

            const existingPics = (profile.storedPictures || []).filter(
              (p) => p.url !== finalAvatarUrl
            );
            onUpdateProfile({
              ...profile,
              previousAvatarUrl: activeSourcePortrait,
              avatarUrl: finalAvatarUrl,
              storedPictures: [newAvatarEntry, ...existingPics],
            });
            setAvatarCreationStatus(`Created "${newAvatarEntry.name}" from your active portrait and saved to your Image Hub Vault.`);
            setIsRecreating3DAvatar(false);
          };
          img.onerror = () => {
            setIsRecreating3DAvatar(false);
          };
          img.src = data.imageUrl;
          return;
        }
      }
    } catch (err) {
      console.warn('3D Avatar creation notice:', err);
    }
    setIsRecreating3DAvatar(false);
  };

  // Brand Logo Upload & AI Generator Handlers (for Card Theme & Style -> Brand & Media)
  const applyBrandLogoUrl = (url: string | undefined) => {
    onUpdateCard({
      ...activeCard,
      companyLogoUrl: url,
      visibleFields: {
        ...activeCard.visibleFields,
        companyLogo: Boolean(url),
      },
    });
    if (profile.workData) {
      onUpdateProfile({
        ...profile,
        companyLogoUrl: url,
        workData: {
          ...profile.workData,
          companyLogoUrl: url,
        },
      });
    } else {
      onUpdateProfile({
        ...profile,
        companyLogoUrl: url,
      });
    }
  };

  const handleUploadBrandLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 360;
        const scale = Math.max(img.width, img.height) > maxDim ? maxDim / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        const finalLogoUrl = ctx
          ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height),
            canvas.toDataURL('image/png'))
          : rawDataUrl;
        applyBrandLogoUrl(finalLogoUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateBrandLogoWithAi = async () => {
    if (isGeneratingBrandLogo) return;
    const companyName = profile.workData?.company || profile.company || activeCard.name || 'Brand';
    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin('image_logo', `AI Brand Logo (${companyName})`);
      if (!allowed) return;
    }
    setIsGeneratingBrandLogo(true);
    try {
      const res = await apiFetch('/api/ai/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyName,
          style: brandLogoStyle,
          prompt: brandLogoPrompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.imageUrl) {
          applyBrandLogoUrl(data.imageUrl);
        }
      }
    } catch (err) {
      console.warn('AI brand logo generation notice:', err);
    } finally {
      setIsGeneratingBrandLogo(false);
    }
  };

  const handleUploadCustomBackdropFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = 1280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        const compressedUrl = ctx
          ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height),
            canvas.toDataURL('image/jpeg', 0.82))
          : rawDataUrl;

        const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Backdrop';
        handleSaveBannerToImageHub({
          url: compressedUrl,
          name: cleanName,
          style: 'custom_upload',
        });
        onUpdateCard({
          ...activeCard,
          coverBannerUrl: compressedUrl,
          backdropMode: 'standard',
          backdropSource: 'banner',
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Generate QR Code dynamically
  useEffect(() => {
    async function updateQR() {
      try {
        const publicUrl = getCardPublicUrl(activeCard);
        const vcardPayload = generateVCardString(profile, activeCard);
        // By default, encodes the real public Web Link so smartphone cameras open the mobile card directly!
        const textToEncode = qrMode === 'weblink' ? publicUrl : vcardPayload;

        const url = await QRCode.toDataURL(textToEncode, {
          width: 280,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);

        // Keep card published to server memory store
        publishCardToServer(activeCard, profile);
      } catch (err) {
        console.error('Failed to generate QR:', err);
      }
    }
    updateQR();
  }, [profile, activeCard, qrMode]);

  const [nfcWriteMode, setNfcWriteMode] = useState<'hybrid' | 'vcard' | 'url'>('hybrid');
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcReadResult, setNfcReadResult] = useState<NfcReadResult | null>(null);
  const [nfcSavedSuccess, setNfcSavedSuccess] = useState(false);
  const nfcStopScanRef = useRef<(() => void) | null>(null);

  // Clean up NFC scan listener on unmount
  useEffect(() => {
    return () => {
      if (nfcStopScanRef.current) {
        nfcStopScanRef.current();
      }
    };
  }, []);

  // Write Business Card to Physical NFC Tag via Web NFC API
  const handleWriteNFC = async () => {
    setNfcState('writing');
    setNfcLogs([
      `[Hardware Check] Web NFC API Supported: ${isWebNfcSupported() ? 'YES (Device Antenna Ready)' : 'NO (Emulation Mode)'}`,
      `[NDEF Configuration] Write Mode: ${nfcWriteMode.toUpperCase()}`,
    ]);

    try {
      const result = await writeBusinessCardToNfc({
        profile,
        card: activeCard,
        mode: nfcWriteMode,
        onStatusUpdate: (status) => {
          setNfcLogs((prev) => [...prev, status]);
        },
      });

      if (result.success) {
        setNfcState('written');
        setNfcLogs((prev) => [
          ...prev,
          `[NFC Result] Success! Wrote ${result.recordsWritten} record(s), ${result.totalBytes} bytes.`,
          result.serialNumber ? `[Tag Serial] UID: ${result.serialNumber}` : '[Tag Serial] Emulated NDEF Tag Ready',
        ]);
      }
    } catch (err: any) {
      setNfcState('idle');
      setNfcLogs((prev) => [...prev, `[NFC Error] ${err.message || 'Operation failed'}`]);
    }
  };

  // Start Reading NFC Tags via Web NFC API
  const handleToggleNfcReader = async () => {
    if (isNfcScanning) {
      if (nfcStopScanRef.current) {
        nfcStopScanRef.current();
        nfcStopScanRef.current = null;
      }
      setIsNfcScanning(false);
      setNfcLogs((prev) => [...prev, '[NFC Reader] Scan cancelled by user.']);
      return;
    }

    setIsNfcScanning(true);
    setNfcReadResult(null);
    setNfcSavedSuccess(false);
    setNfcLogs([
      `[NFC Reader] Starting NDEF scan. Web NFC Supported: ${isWebNfcSupported() ? 'YES' : 'NO (Emulation)'}`,
      '[NFC Reader] Ready for tag tap...',
    ]);

    const stopFn = await startNfcReader(
      (result) => {
        setNfcReadResult(result);
        setIsNfcScanning(false);
        setNfcLogs((prev) => [
          ...prev,
          `[NFC Tag Read] Tag tapped! UID: ${result.serialNumber || 'N/A'}. Found ${result.rawRecords.length} record(s).`,
          result.contact?.name ? `[Card Identified] ${result.contact.name} (${result.contact.company || 'Unknown'})` : '[Card Identified] Generic NDEF Content',
        ]);
      },
      (error) => {
        setIsNfcScanning(false);
        setNfcLogs((prev) => [...prev, `[NFC Reader Error] ${error}`]);
      },
      (status) => {
        setNfcLogs((prev) => [...prev, status]);
      }
    );

    nfcStopScanRef.current = stopFn;
  };

  // Simulate an incoming tag tap for testing in desktop preview
  const handleSimulateIncomingTap = () => {
    const mockRead: NfcReadResult = {
      serialNumber: '04:8A:3F:B2:91:00:80',
      vcardString: `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Devon Chen\r\nTITLE:Partner & General Counsel\r\nORG:Vanguard Global Legal\r\nEMAIL:d.chen@vanguardlegal.com\r\nTEL:+1 (415) 555-0812\r\nNOTE:Met at Hardware Summit. Physical NFC tag tap.\r\nEND:VCARD`,
      rawRecords: [
        { recordType: 'url', content: getCardPublicUrl({ vanitySlug: 'devon-chen' }) },
        { recordType: 'mime', mediaType: 'text/vcard', content: 'vCard 3.0 Payload' },
      ],
      contact: {
        name: 'Devon Chen',
        role: 'Partner & General Counsel',
        company: 'Vanguard Global Legal',
        email: 'd.chen@vanguardlegal.com',
        phone: '+1 (415) 555-0812',
        notes: 'Captured via physical NFC tag tap (ISO 14443 Type 4).',
        source: 'nfc',
        status: 'new',
        tags: ['NFC Tag', 'Hardware Summit'],
        createdAt: new Date().toISOString(),
      },
    };

    setNfcReadResult(mockRead);
    setIsNfcScanning(false);
    setNfcSavedSuccess(false);
    setNfcLogs((prev) => [
      ...prev,
      '[NFC Emulation] Simulated physical NFC tag tapped against antenna!',
      `[NFC Card Identified] ${mockRead.contact?.name} (${mockRead.contact?.company})`,
    ]);
  };

  // Save the read NFC contact to CRM
  const handleSaveNfcToCRM = () => {
    if (!nfcReadResult?.contact) return;
    const contactToAdd: CRMContact = {
      id: `c-nfc-${Date.now()}`,
      name: nfcReadResult.contact.name || 'NFC Contact',
      role: nfcReadResult.contact.role || '',
      company: nfcReadResult.contact.company || '',
      category: 'personal',
      isBusinessCRM: false,
      email: nfcReadResult.contact.email || '',
      phone: nfcReadResult.contact.phone || '',
      website: nfcReadResult.contact.website || nfcReadResult.url || '',
      notes: nfcReadResult.contact.notes || `Read from physical NFC tag (UID: ${nfcReadResult.serialNumber || 'N/A'})`,
      source: 'nfc',
      status: 'new',
      tags: ['NFC Tag', 'Physical Hardware'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle: 'NFC Card Tap',
        sharedFieldsList: ['Full Name', 'Organization', 'Role', 'Email', 'Phone'],
        version: 1,
      },
    };

    onAddContactToCRM?.(contactToAdd);
    setNfcSavedSuccess(true);
    setNfcLogs((prev) => [...prev, `[Rubrica Storage] Saved ${contactToAdd.name} into Rubrica address book.`]);
  };

  const handleCopyLink = () => {
    const url = getCardPublicUrl(activeCard);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadVCard = () => {
    const vcardStr = generateVCardString(profile, activeCard);
    downloadVCard(`${profile.name}_${activeCard.name}`, vcardStr);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${profile.name.replace(/\s+/g, '_')}_QR.png`;
    a.click();
  };

  // Master Profile Personal Data updater
  const handleUpdatePersonal = (patch: Partial<PersonalData>) => {
    const cur = profile.personalData || {
      fullName: profile.name,
      phone: profile.phone,
      email: profile.email,
    };
    const updated = { ...cur, ...patch };
    onUpdateProfile({
      ...profile,
      name: updated.fullName || profile.name,
      personalData: updated,
    });
  };

  // Master Profile Work Data updater
  const handleUpdateWork = (patch: Partial<WorkData>) => {
    const cur = profile.workData || {
      role: profile.role,
      company: profile.company,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
    };
    const updated = { ...cur, ...patch };
    onUpdateProfile({
      ...profile,
      role: updated.role || profile.role,
      company: updated.company || profile.company,
      email: updated.email || profile.email,
      phone: updated.phone || profile.phone,
      website: updated.website || profile.website,
      workData: updated,
    });
  };

  // User's saved Cover Banners in their Image Hub / Vault
  // Order is anchored to backgroundVaultAnchorUrl so clicking a background while the vault is open does not reorder items
  const rawHubBanners = [
    ...(profile.storedBanners || []),
    ...(profile.storedPictures?.filter((p) => p.context === 'banner' || p.category === 'banner' || p.aspectRatio === '16:9') || []),
  ].filter((b, idx, arr) => arr.findIndex((x) => x.url === b.url) === idx);

  const hubBanners = (() => {
    const anchorBannerUrl = isBackgroundVaultOpen
      ? backgroundVaultAnchorUrl
      : activeCard.coverBannerUrl?.trim() || '';
    if (!anchorBannerUrl) return rawHubBanners;
    const anchorMatch = rawHubBanners.find((b) => b.url.trim() === anchorBannerUrl);
    if (!anchorMatch) return rawHubBanners;
    return [anchorMatch, ...rawHubBanners.filter((b) => b.url.trim() !== anchorBannerUrl)];
  })();

  // Save new banner into the user's Image Hub
  const handleSaveBannerToImageHub = (banner: { url: string; name: string; style: string }) => {
    const newBannerItem: StoredPicture = {
      id: `banner-${Date.now()}`,
      name: banner.name,
      url: banner.url,
      context: 'banner',
      category: 'banner',
      aspectRatio: '16:9',
      aiStyle: banner.style,
      isAiGenerated: true,
      createdAt: new Date().toISOString(),
    };
    const currentPictures = profile.storedPictures || [];
    const currentBanners = profile.storedBanners || [];
    onUpdateProfile({
      ...profile,
      storedPictures: [newBannerItem, ...currentPictures.filter((p) => p.url !== banner.url)],
      storedBanners: [newBannerItem, ...currentBanners.filter((b) => b.url !== banner.url)],
    });
  };

  // Delete a portrait from the user's Vault (and record in Undo stack)
  const handleDeletePortraitFromVault = (e: React.MouseEvent | undefined, pic: StoredPicture) => {
    if (e) e.stopPropagation();
    const wasActive = profile.avatarUrl?.trim() === pic.url?.trim();
    setDeletedPortraitsHistory((prev) => [{ item: pic, wasActive }, ...prev]);

    const nextPics = (profile.storedPictures || []).filter(
      (p) => p.id !== pic.id && p.url.trim() !== pic.url.trim()
    );
    const remainingAvatars = nextPics.filter(
      (p) => p.context !== 'banner' && p.category !== 'banner' && p.aspectRatio !== '16:9' && Boolean(p.url)
    );
    onUpdateProfile({
      ...profile,
      avatarUrl: wasActive ? remainingAvatars[0]?.url || '' : profile.avatarUrl,
      storedPictures: nextPics,
    });
  };

  // Undo the most recent portrait deletion
  const handleUndoDeletePortrait = () => {
    if (deletedPortraitsHistory.length === 0) return;
    const [latest, ...rest] = deletedPortraitsHistory;
    setDeletedPortraitsHistory(rest);
    const currentPics = (profile.storedPictures || []).filter(
      (p) => p.url.trim() !== latest.item.url.trim()
    );
    onUpdateProfile({
      ...profile,
      avatarUrl: latest.wasActive || !profile.avatarUrl ? latest.item.url : profile.avatarUrl,
      storedPictures: [latest.item, ...currentPics],
    });
    setAvatarCreationStatus(`Restored "${latest.item.name}".`);
    setTimeout(() => setAvatarCreationStatus(null), 3000);
  };

  // Remove banner from the user's Image Hub (and record in Undo stack)
  const handleDeleteBannerFromHub = (
    e: React.MouseEvent | undefined,
    bannerUrl: string,
    bannerObj?: StoredPicture
  ) => {
    if (e) e.stopPropagation();
    const currentPictures = profile.storedPictures || [];
    const currentBanners = profile.storedBanners || [];
    const existingItem =
      bannerObj ||
      currentBanners.find((b) => b.url === bannerUrl) ||
      currentPictures.find((p) => p.url === bannerUrl) || {
        id: `banner-deleted-${Date.now()}`,
        name: 'Saved Background',
        url: bannerUrl,
        context: 'banner' as const,
        category: 'banner' as const,
        aspectRatio: '16:9' as const,
      };
    const wasActive = activeCard.coverBannerUrl === bannerUrl;
    setDeletedBannersHistory((prev) => [{ item: existingItem, wasActive }, ...prev]);

    onUpdateProfile({
      ...profile,
      storedPictures: currentPictures.filter((p) => p.url !== bannerUrl),
      storedBanners: currentBanners.filter((b) => b.url !== bannerUrl),
    });
    if (wasActive) {
      onUpdateCard({ ...activeCard, coverBannerUrl: undefined, backdropMode: 'standard' });
    }
  };

  // Undo the most recent background deletion or clear action
  const handleUndoDeleteBanner = () => {
    if (deletedBannersHistory.length === 0) return;
    const [latest, ...rest] = deletedBannersHistory;
    setDeletedBannersHistory(rest);
    const currentPictures = (profile.storedPictures || []).filter((p) => p.url !== latest.item.url);
    const currentBanners = (profile.storedBanners || []).filter((b) => b.url !== latest.item.url);
    onUpdateProfile({
      ...profile,
      storedPictures: [latest.item, ...currentPictures],
      storedBanners: [latest.item, ...currentBanners],
    });
    if (latest.wasActive || !activeCard.coverBannerUrl) {
      onUpdateCard({
        ...activeCard,
        coverBannerUrl: latest.item.url,
        backdropMode: 'standard',
        backdropSource: 'banner',
      });
    }
  };

  // Direct inline AI Backdrop generator from user description
  const handleGenerateInlineBanner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inlineBannerPrompt.trim();
    if (!clean || isGeneratingInlineBanner) return;

    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin(
        'image_banner',
        `Inline AI Backdrop ("${clean.slice(0, 24)}")`
      );
      if (!allowed) return;
    }

    setIsGeneratingInlineBanner(true);
    try {
      const res = await apiFetch('/api/ai/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: clean,
          style: 'dolomites_peaks',
          company: activeCard.name,
        }),
      });
      const data = await res.json();
      if (data?.imageUrl) {
        const bannerName = `Custom: ${clean.slice(0, 32)}`;
        handleSaveBannerToImageHub({
          url: data.imageUrl,
          name: bannerName,
          style: 'custom_prompt',
        });
        onUpdateCard({
          ...activeCard,
          coverBannerUrl: data.imageUrl,
          backdropSource: 'banner',
        });
        setInlineBannerPrompt('');
      }
    } catch (err) {
      console.warn('Inline banner generation notice:', err);
    } finally {
      setIsGeneratingInlineBanner(false);
    }
  };

  // Card theme styling tokens
  const getThemeStyles = (theme: CardTheme) => {
    switch (theme) {
      case 'cyber':
        return 'from-slate-950 via-slate-900 to-cyan-950/80 border-cyan-500/40 shadow-cyan-500/10';
      case 'creative':
        return 'from-slate-950 via-purple-950/40 to-slate-900 border-pink-500/40 shadow-pink-500/10';
      case 'minimal':
        return 'from-slate-900 via-slate-900 to-slate-950 border-slate-700 shadow-slate-900/50';
      case 'executive':
      default:
        return 'from-slate-950 via-slate-900 to-indigo-950/60 border-indigo-500/30 shadow-indigo-500/10';
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] px-3 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-7">
      {/* Sticky Compact Mini-Card Bar on Mobile (< lg) & Top Card Bar on Desktop */}
      <div className="sticky top-13 sm:top-15 z-30 lg:static lg:z-40 mb-5 rounded-2xl border border-slate-800 bg-slate-900/95 p-2.5 sm:p-3 backdrop-blur-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shadow-xl">
        {/* Left: Active Card Dropdown Selector */}
        <div className="relative min-w-0 flex-1 max-w-md">
          <button
            type="button"
            onClick={() => setIsCardSelectorOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-indigo-500/40 bg-slate-950/90 hover:border-indigo-400 text-left transition shadow-sm"
            title="Switch active digital business card"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={activeCard.name}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border border-indigo-400/50"
                  />
                ) : (
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-indigo-950 border border-indigo-400/50 flex items-center justify-center text-[10px] font-bold text-indigo-200 uppercase">
                    {(profile.name || 'YC')
                      .trim()
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('') || 'YC'}
                  </div>
                )}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950"
                  style={{ backgroundColor: activeCard.accentColor || '#6366f1' }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {activeCard.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {activeCard.tag ? `#${activeCard.tag}` : 'Active Card'}
                </div>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isCardSelectorOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {isCardSelectorOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCardSelectorOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-700 bg-slate-950 shadow-2xl p-1.5 z-50 max-h-72 overflow-y-auto space-y-1">
                {cards.map((c, idx) => {
                  const isActive = c.id === activeCard.id;
                  const isLockedByFreeTier = subscription?.tier === 'free' && idx >= 2;
                  const matchingPersona =
                    allPersonas.find(
                      (p) => p.id === c.id || p.circleName === c.name || p.profileTitle === c.name
                    ) || profile;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (isLockedByFreeTier) {
                          setIsCardSelectorOpen(false);
                          if (onOpenSubscriptionModal) {
                            onOpenSubscriptionModal(
                              'Free Tier allows up to 2 Digital Business Cards maximum. Upgrade to Basic ($12/mo) or Business ($29/mo) to unlock unlimited digital cards.'
                            );
                          }
                          return;
                        }
                        onSelectCard(c);
                        if (matchingPersona) onSelectPersona(matchingPersona.id);
                        setIsCardSelectorOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-lg text-xs transition ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : isLockedByFreeTier
                          ? 'text-slate-500 bg-slate-900/40 hover:bg-slate-900'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {matchingPersona.avatarUrl || profile.avatarUrl ? (
                          <img
                            src={matchingPersona.avatarUrl || profile.avatarUrl}
                            alt={c.name}
                            className={`h-7 w-7 rounded-full object-cover border border-white/20 shrink-0 ${
                              isLockedByFreeTier ? 'opacity-40 grayscale' : ''
                            }`}
                          />
                        ) : (
                          <div
                            className={`h-7 w-7 rounded-full bg-indigo-950 border border-white/20 shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-200 uppercase ${
                              isLockedByFreeTier ? 'opacity-40 grayscale' : ''
                            }`}
                          >
                            {(matchingPersona.name || profile.name || 'YC')
                              .trim()
                              .split(/\s+/)
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('') || 'YC'}
                          </div>
                        )}
                        <div className="text-left min-w-0">
                          <div className="font-semibold truncate flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {isLockedByFreeTier && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] text-amber-300">
                                <Lock className="h-2.5 w-2.5" /> Basic+
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isActive ? 'text-indigo-100 font-normal' : 'text-slate-400'
                            }`}
                          >
                            #{c.tag || 'Card'}
                          </div>
                        </div>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Mobile Recall Editor Menus Button + Quick Card Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile (< lg) Recall / Hide Edit Menus Trigger (Card is always primary display) */}
          <button
            type="button"
            onClick={() => {
              if (!isMobileEditorOpen) {
                handleRecallMobileSection();
              } else {
                setIsMobileEditorOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`lg:hidden h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition shrink-0 ${
              isMobileEditorOpen
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white shadow-indigo-500/20'
            }`}
            title={isMobileEditorOpen ? 'Hide Edit Menus and Return to Card' : 'Recall Menus to Fill & Customize Card Data'}
          >
            {isMobileEditorOpen ? (
              <>
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Sliders className="h-3.5 w-3.5 shrink-0" />
                <span>Edit Card</span>
              </>
            )}
          </button>

          {/* Integrated Public Handle & Copy Link Pill (Desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 pl-2.5 pr-1.5 py-1 text-xs">
            <span className="font-mono text-[11px] text-slate-500 select-none">/p/</span>
            <input
              type="text"
              value={activeCard.vanitySlug || ''}
              onChange={(e) => onUpdateCard({ ...activeCard, vanitySlug: e.target.value })}
              placeholder="your-handle"
              title="Edit public card handle"
              className="w-28 bg-transparent font-mono text-[11px] text-slate-200 focus:outline-none focus:text-cyan-300"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${
                copiedLink
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Copy public card URL"
            >
              {copiedLink ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-cyan-400" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsQrNfcPanelOpen((prev) => !prev)}
            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition shadow-sm shrink-0 ${
              isQrNfcPanelOpen
                ? 'border-indigo-400 bg-indigo-600 text-white shadow-indigo-500/30'
                : 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300'
            }`}
            title="Instant QR & NFC Hardware"
            aria-label="Toggle Instant QR & NFC Hardware"
          >
            <QrCode className="h-4 w-4" />
          </button>

          {onDuplicateCard && (
            <button
              type="button"
              onClick={() => {
                if (subscription?.tier === 'free' && cards.length >= 2) {
                  onOpenSubscriptionModal?.(
                    'Free Tier allows generating a maximum of 2 Digital Business Cards. Upgrade to Basic or Business for unlimited cards, or delete an existing card first.'
                  );
                  return;
                }
                onDuplicateCard(activeCard.id);
              }}
              className="hidden sm:flex h-9 w-9 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 items-center justify-center transition shadow-sm shrink-0"
              title="Duplicate Card"
              aria-label="Duplicate Card"
            >
              <CopyPlus className="h-4 w-4" />
            </button>
          )}

          {cards.length > 1 && onDeleteCard && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${activeCard.name}" card?`)) {
                  onDeleteCard(activeCard.id);
                }
              }}
              className="h-9 w-9 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 flex items-center justify-center transition shadow-sm shrink-0"
              title="Delete Card"
              aria-label="Delete Card"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (subscription?.tier === 'free' && cards.length >= 2) {
                onOpenSubscriptionModal?.(
                  'Free Tier allows generating a maximum of 2 Digital Business Cards. Upgrade to Basic ($12/mo) or Business ($29/mo) for unlimited cards, or delete an existing card first.'
                );
                return;
              }
              setIsCreateCardModalOpen(true);
            }}
            className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25 transition shrink-0"
            title="Create New Card"
            aria-label="Create New Card"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Card Hub Grid: Live Card ALWAYS Primary in View + On-Demand Edit Menus on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN (Always visible on Phone & Desktop): Live 3D Virtual Card & On-Demand Sharing Actions */}
        <div className="block lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          {/* Interactive Luxury Digital Card Display (3D Flip, Bento Hub, Wallet Pass) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-5 shadow-xl backdrop-blur-md">
            <DigitalCardRenderer
              profile={profile}
              card={activeCard}
              onUpdateCard={onUpdateCard}
              onAddContactToCRM={onAddContactToCRM}
              interactive={true}
              onOpenImageHub={handleOpenImageHub}
            />
          </div>

          {/* Mobile (< lg) Quick-Recall Menu Dock: Keep Card Primary, Recall Data Menus on Demand */}
          <div className="lg:hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-3 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Fill & Customize Card Data</span>
                </span>
                <p className="text-[11px] text-slate-400 truncate">
                  Tap an icon below to open that section (tap again to close)
                </p>
              </div>
              {isMobileEditorOpen && (
                <button
                  type="button"
                  onClick={() => setIsMobileEditorOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shrink-0 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Close</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { key: 'personal', label: 'Identity', icon: User, color: 'text-rose-400' },
                  { key: 'work', label: 'Work', icon: Briefcase, color: 'text-indigo-400' },
                  { key: 'beyond', label: 'Passions', icon: Sparkles, color: 'text-amber-400' },
                  { key: 'socials', label: 'Socials', icon: Globe, color: 'text-cyan-400' },
                  { key: 'portrait', label: 'Portrait', icon: Camera, color: 'text-purple-400' },
                  { key: 'background', label: 'Cover', icon: Image, color: 'text-teal-400' },
                  { key: 'theme', label: 'Theme', icon: Palette, color: 'text-amber-300' },
                  { key: 'sharing', label: 'Visibility', icon: Eye, color: 'text-emerald-400' },
                ] as const
              ).map((item) => {
                const IconComp = item.icon;
                const isActiveSection = isMobileEditorOpen && openAccordions[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleRecallMobileSection(item.key)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-[11px] font-semibold transition ${
                      isActiveSection
                        ? 'border-indigo-500 bg-indigo-950/60 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/70 hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <IconComp className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Sharing Modalities: QR & NFC Card Box (Opened when Share icon is selected) */}
          {isQrNfcPanelOpen && (
          <div className="rounded-xl border border-indigo-500/40 bg-slate-900/90 p-5 space-y-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Instant QR & NFC Hardware
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-md border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setQrMode('vcard')}
                    className={`px-2 py-0.5 rounded transition ${
                      qrMode === 'vcard' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Offline vCard
                  </button>
                  <button
                    onClick={() => setQrMode('weblink')}
                    className={`px-2 py-0.5 rounded transition ${
                      qrMode === 'weblink' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Web Link
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrNfcPanelOpen(false)}
                  className="h-6 w-6 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                  title="Close Instant QR & NFC Hardware"
                  aria-label="Close Instant QR & NFC Hardware"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* QR Canvas Display */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80">
              {qrDataUrl ? (
                <div className="bg-white p-2 rounded-lg shadow-md shrink-0">
                  <img src={qrDataUrl} alt="QR Code" className="h-32 w-32" />
                </div>
              ) : (
                <div className="h-32 w-32 bg-slate-800 rounded-lg animate-pulse" />
              )}
              <div className="space-y-2 text-xs text-slate-400">
                <p>
                  {qrMode === 'vcard'
                    ? 'Encodes compact vCard 3.0 directly into QR for offline address book import.'
                    : `Directs smartphone camera to open your mobile digital business card at: ${getCardDisplayUrl(activeCard)}`}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={handleDownloadQR}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    <Download className="h-3 w-3" />
                    <span>Download QR</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>{copiedLink ? 'Copied Real Link!' : 'Copy Mobile Link'}</span>
                  </button>
                  <button
                    onClick={() => setIsEmailSignatureModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-medium transition border border-purple-500/30"
                    title="Generate clickable HTML email signature for Gmail / Outlook"
                  >
                    <Mail className="h-3 w-3 text-purple-400" />
                    <span>Email Signature</span>
                  </button>
                  <a
                    href={getCardPublicUrl(activeCard)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-medium transition border border-indigo-500/30"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Test Mobile Card</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Physical Web NFC Tag Writer Console (User's Own Card) */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Program My Physical NFC Card (NDEF Writer)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isWebNfcSupported()
                      ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-400'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {isWebNfcSupported() ? 'Web NFC API Active' : 'Desktop Emulation'}
                </span>
              </div>

              {/* NFC Mode Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">Record Type:</span>
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setNfcWriteMode('hybrid')}
                    className={`px-2 py-0.5 rounded transition ${
                      nfcWriteMode === 'hybrid' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Hybrid (URL+vCard)
                  </button>
                  <button
                    onClick={() => setNfcWriteMode('vcard')}
                    className={`px-2 py-0.5 rounded transition ${
                      nfcWriteMode === 'vcard' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Offline vCard
                  </button>
                  <button
                    onClick={() => setNfcWriteMode('url')}
                    className={`px-2 py-0.5 rounded transition ${
                      nfcWriteMode === 'url' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400'
                    }`}
                  >
                    Web URL
                  </button>
                </div>
              </div>

              {/* Write My Card to Physical Tag Button */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={handleWriteNFC}
                  disabled={nfcState === 'writing'}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 transition disabled:opacity-50"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>
                    {nfcState === 'writing'
                      ? 'Writing Your Card to NFC Tag...'
                      : `Write "${activeCard.name}" to My NFC Tag (NDEF)`}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Encodes your own digital card onto a physical NFC card or ring. To scan or import a contact's NFC card, use <strong className="text-slate-200">Contacts (Rubrica)</strong> or <strong className="text-slate-200">Business CRM</strong>.
                </p>
              </div>

              {/* NFC Diagnostic Logs Console */}
              {nfcLogs.length > 0 && (
                <div className="rounded-lg bg-black/70 border border-slate-800 p-2.5 font-mono text-[10px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
                  {nfcLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('Success') || log.includes('Verified') || log.includes('Identified')
                          ? 'text-emerald-400'
                          : log.includes('Error')
                          ? 'text-rose-400'
                          : log.includes('Hardware') || log.includes('Reader')
                          ? 'text-cyan-400'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* RIGHT COLUMN: Single-Level Collapsible Accordion Workspace (7 cols) */}
        <div
          ref={mobileEditorSectionRef}
          className={`${isMobileEditorOpen ? 'block' : 'hidden lg:block'} lg:col-span-7 space-y-3 scroll-mt-20`}
        >
          {/* Card Hub Single-Level Workspace Header (Desktop only; Mobile uses the Horizontal Icon Menu) */}
          <div className="hidden lg:flex items-center justify-between gap-2 px-1 pb-1">
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                <span>Card Hub Sections</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Tap any section below to expand or collapse. Changes update your card live.
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleAllAccordions}
                className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition"
              >
                {areAllAccordionsOpen ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 1: PERSONAL IDENTITY & COORDINATES                      */}
          {/* ================================================================= */}
          <div className={`${openAccordions.personal ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
            <button
              type="button"
              onClick={() => toggleAccordion('personal')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Personal Identity & Coordinates
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Name, personal phone & email, home address, emergency ICE contacts, and personal bio
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  openAccordions.personal ? 'rotate-180 text-rose-400' : ''
                }`}
              />
            </button>
            {openAccordions.personal && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40">
                <MasterProfileEditor
                  sectionMode="personal"
                  profile={profile}
                  activeCard={activeCard}
                  onUpdateProfile={onUpdateProfile}
                  onUpdateCard={onUpdateCard}
                  onConsumeAiCoin={onConsumeAiCoin}
                  onOpenKYCModal={() => setIsKYCModalOpen(true)}
                  onOpenBioModal={() => setIsBioModalOpen(true)}
                  onOpenImageHub={(sub) => {
                    setOpenAccordions((prev) => ({
                      ...prev,
                      portrait: sub !== 'background',
                      background: sub === 'background',
                    }));
                  }}
                  onOpenAvatarModal={(tab) => {
                    setAvatarModalTab(tab);
                    setIsAvatarModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 2: WORK & CORPORATE CREDENTIALS                         */}
          {/* ================================================================= */}
          <div className={`${openAccordions.work ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
            <button
              type="button"
              onClick={() => toggleAccordion('work')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Work & Corporate Credentials
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Role, company, work email & phone, website, HQ city, tax/VAT, executive bio, and company logo
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  openAccordions.work ? 'rotate-180 text-indigo-400' : ''
                }`}
              />
            </button>
            {openAccordions.work && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40">
                <MasterProfileEditor
                  sectionMode="work"
                  profile={profile}
                  activeCard={activeCard}
                  onUpdateProfile={onUpdateProfile}
                  onUpdateCard={onUpdateCard}
                  onConsumeAiCoin={onConsumeAiCoin}
                  onOpenKYCModal={() => setIsKYCModalOpen(true)}
                  onOpenBioModal={() => setIsBioModalOpen(true)}
                  onOpenImageHub={(sub) => {
                    setOpenAccordions((prev) => ({
                      ...prev,
                      portrait: sub !== 'background',
                      background: sub === 'background',
                    }));
                  }}
                  onOpenAvatarModal={(tab) => {
                    setAvatarModalTab(tab);
                    setIsAvatarModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 3: PASSIONS, EDUCATION & ARTIST PORTFOLIO               */}
          {/* ================================================================= */}
          <div className={`${openAccordions.beyond ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
            <button
              type="button"
              onClick={() => toggleAccordion('beyond')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Passions, Education & Portfolio
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Hobbies & sports, academic credentials, and creative portfolio works
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  openAccordions.beyond ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>
            {openAccordions.beyond && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40">
                <MasterProfileEditor
                  sectionMode="beyond"
                  profile={profile}
                  activeCard={activeCard}
                  onUpdateProfile={onUpdateProfile}
                  onUpdateCard={onUpdateCard}
                  onConsumeAiCoin={onConsumeAiCoin}
                  onOpenKYCModal={() => setIsKYCModalOpen(true)}
                  onOpenBioModal={() => setIsBioModalOpen(true)}
                  onOpenImageHub={(sub) => {
                    setOpenAccordions((prev) => ({
                      ...prev,
                      portrait: sub !== 'background',
                      background: sub === 'background',
                    }));
                  }}
                  onOpenAvatarModal={(tab) => {
                    setAvatarModalTab(tab);
                    setIsAvatarModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 4: SOCIAL & MESSAGING NETWORKS                          */}
          {/* ================================================================= */}
          <div className={`${openAccordions.socials ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
            <button
              type="button"
              onClick={() => toggleAccordion('socials')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Social & Messaging Networks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    LinkedIn, WhatsApp, Instagram, X, GitHub, Calendly, and custom social profile links
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  openAccordions.socials ? 'rotate-180 text-cyan-400' : ''
                }`}
              />
            </button>
            {openAccordions.socials && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40">
                <MasterProfileEditor
                  sectionMode="socials"
                  profile={profile}
                  activeCard={activeCard}
                  onUpdateProfile={onUpdateProfile}
                  onUpdateCard={onUpdateCard}
                  onConsumeAiCoin={onConsumeAiCoin}
                  onOpenKYCModal={() => setIsKYCModalOpen(true)}
                  onOpenBioModal={() => setIsBioModalOpen(true)}
                  onOpenImageHub={(sub) => {
                    setOpenAccordions((prev) => ({
                      ...prev,
                      portrait: sub !== 'background',
                      background: sub === 'background',
                    }));
                  }}
                  onOpenAvatarModal={(tab) => {
                    setAvatarModalTab(tab);
                    setIsAvatarModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 5 & 6: PORTRAIT STUDIO & BACKGROUND STUDIO              */}
          {/* ================================================================= */}
          {(() => {
            const rawAvatars = (profile.storedPictures || []).filter(
              (p) => p.context !== 'banner' && p.category !== 'banner' && p.aspectRatio !== '16:9' && Boolean(p.url)
            );
            const seenUrls = new Set<string>();
            const profileAvatarsVault: StoredPicture[] = [];
            // Use the anchored URL captured when the vault was opened so clicking different images
            // while the vault is open keeps every image in its current position.
            const anchorAvatarUrl = isPortraitVaultOpen
              ? portraitVaultAnchorUrl
              : profile.avatarUrl?.trim() || '';
            if (anchorAvatarUrl) {
              seenUrls.add(anchorAvatarUrl);
              const existingAnchor = rawAvatars.find((p) => p.url.trim() === anchorAvatarUrl);
              profileAvatarsVault.push(
                existingAnchor || {
                  id: 'active-portrait-current',
                  name: 'Active Portrait',
                  url: anchorAvatarUrl,
                  context: 'custom',
                }
              );
            }
            for (const pic of rawAvatars) {
              const normalizedUrl = pic.url.trim();
              if (!seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                profileAvatarsVault.push(pic);
              }
            }
            if (profile.avatarUrl && profile.avatarUrl.trim() && !seenUrls.has(profile.avatarUrl.trim())) {
              seenUrls.add(profile.avatarUrl.trim());
              profileAvatarsVault.push({
                id: 'active-portrait-selected',
                name: 'Active Portrait',
                url: profile.avatarUrl,
                context: 'custom',
              });
            }

            const headshotPresetsList = [
              {
                id: 'executive' as const,
                label: 'Executive Studio',
                sub: 'Navy tailored blazer, soft rim lighting, premium boardroom depth',
                promptText:
                  'Executive studio headshot, wearing a tailored navy blazer, soft rim lighting, premium boardroom depth, preserving exact facial likeness',
                badge: 'Corporate',
                badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              },
              {
                id: 'casual' as const,
                label: 'Casual Lifestyle',
                sub: 'Warm knitwear, golden hour natural daylight, engaging smile',
                promptText:
                  'Casual lifestyle portrait, wearing warm knitwear, golden hour natural daylight, engaging smile, preserving exact facial likeness',
                badge: 'Personal',
                badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              },
              {
                id: 'country_club' as const,
                label: 'Country Club',
                sub: 'Smart-casual club polo or blazer, sunlit clubhouse terrace & grounds',
                promptText:
                  'Country club portrait, wearing smart-casual club polo or blazer, sunlit clubhouse terrace and manicured grounds, preserving exact facial likeness',
                badge: 'Club & Leisure',
                badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
              },
              {
                id: 'athletic' as const,
                label: 'Athletic Game-Day',
                sub: 'Performance athletic sportswear, dynamic arena lighting, focused posture',
                promptText:
                  'Athletic game-day portrait, wearing performance athletic sportswear, dynamic arena lighting, focused posture, preserving exact facial likeness',
                badge: 'Sport & Fitness',
                badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
              },
              {
                id: 'cyber' as const,
                label: 'Modern Tech & Cyber',
                sub: 'High-contrast studio, subtle neon rim accent, minimal slate',
                promptText:
                  'Modern tech executive portrait, high-contrast studio lighting, subtle cyan and violet neon rim accent, minimal dark slate background',
                badge: 'Tech & Advisory',
                badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              },
              {
                id: 'editorial' as const,
                label: 'Monochrome Editorial',
                sub: 'High-fashion black & white portrait with dramatic key lighting',
                promptText:
                  'Monochrome black and white high-fashion editorial portrait, dramatic key lighting, crisp studio contrast, preserving exact facial likeness',
                badge: 'Keynote & Media',
                badgeClass: 'bg-slate-700/60 text-slate-200 border-slate-500/40',
              },
            ];

            const avatarStylePresetsList = [
              {
                id: '3d_pixar' as const,
                label: '3D Animation',
                sub: 'Pixar / Studio 3D character',
                promptText:
                  '3D animation studio character in Pixar style, expressive studio lighting, smooth 3D render while keeping facial features recognizable',
                badge: 'Popular',
              },
              {
                id: 'comic_book' as const,
                label: 'Comic Book',
                sub: 'Bold ink & graphic halftone',
                promptText:
                  'Comic book hero portrait, bold graphic novel ink outlines, vibrant halftone shading, dynamic heroic rim lighting',
                badge: 'Heroic',
              },
              {
                id: 'cartoon' as const,
                label: 'Cartoon Studio',
                sub: 'Vibrant stylized illustration',
                promptText:
                  'Stylized cartoon studio illustration portrait, vibrant cel-shaded colors, clean expressive character lines',
                badge: 'Stylized',
              },
              {
                id: 'manga' as const,
                label: 'Manga & Anime',
                sub: 'Japanese cel-shaded art',
                promptText:
                  'Japanese manga and anime character portrait, detailed cel-shaded artwork, cinematic anime lighting and atmosphere',
                badge: 'Anime',
              },
              {
                id: '3d_photoreal' as const,
                label: '3D Photoreal',
                sub: 'Volumetric 3D digital human',
                promptText:
                  'Volumetric 3D photorealistic digital human avatar, subsurface skin lighting, Unreal Engine 5 studio render',
                badge: '3D Twin',
              },
              {
                id: 'cyberpunk' as const,
                label: 'Cyberpunk 3D',
                sub: 'Neon cyan & magenta rim',
                promptText:
                  'Cyberpunk 3D character avatar, futuristic tech collar, neon cyan and magenta rim lighting, night city bokeh',
                badge: 'Sci-Fi',
              },
              {
                id: 'pop_art' as const,
                label: 'Pop Art',
                sub: 'Bold gallery screenprint',
                promptText:
                  'Pop art gallery screenprint portrait, bold Warhol-inspired color blocks and high-contrast graphic halftone',
                badge: 'Gallery',
              },
              {
                id: 'oil_painting' as const,
                label: 'Fine Art Oil',
                sub: 'Classical impasto brushwork',
                promptText:
                  'Classical fine art oil painting portrait, rich impasto brushwork, warm museum canvas texture and chiaroscuro lighting',
                badge: 'Classical',
              },
            ];

            return (
              <>
                {/* ACCORDION 5: PORTRAIT & AI AVATAR STUDIO */}
                <div
                  ref={portraitSectionRef}
                  className={`${openAccordions.portrait ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion('portrait')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Camera className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            Portrait & AI Avatar Studio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Upload photo, live camera, AI executive headshots, and 3D stylized avatars
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        openAccordions.portrait ? 'rotate-180 text-indigo-400' : ''
                      }`}
                    />
                  </button>

                  {openAccordions.portrait && (
                    <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4 animate-in fade-in duration-150">
                      {/* Top Area: Active Portrait + Uniform Action Bar + Side-by-Side AI Prompt Field */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/85 p-4 space-y-3.5">
                      {/* Full-Width Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            Profile & Avatar Studio
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Click the active portrait or <strong className="text-slate-200">Saved Images</strong> to switch photos, or describe your AI generation beside it.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/30 shrink-0">
                          1:1 Portrait
                        </span>
                      </div>

                      {/* Side-by-Side: Active Portrait (Left) + Uniform Buttons & AI Description (Right) */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* Left: Active Portrait Only (Click to toggle Saved Images Vault) */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePortraitVault()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (profile.avatarUrl) {
                                setEnlargedPreviewImage({
                                  url: profile.avatarUrl,
                                  title: `${profile.name} — Active Portrait`,
                                });
                              }
                            }}
                            className="group relative h-32 w-32 sm:h-36 sm:w-36 rounded-2xl overflow-hidden border-2 border-indigo-500/70 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition block bg-slate-950"
                            title="Click to toggle Saved Vault · Double-click to enlarge & inspect"
                          >
                            {profile.avatarUrl ? (
                              <img
                                src={profile.avatarUrl}
                                alt={profile.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-indigo-300 p-3 text-center">
                                <User className="h-9 w-9 text-indigo-400/80 mb-1" />
                                <span className="text-[10px] font-medium text-slate-400 leading-tight">
                                  No portrait uploaded
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-indigo-600/95 text-[9px] font-mono font-bold text-white uppercase shadow">
                              {profile.avatarUrl ? 'Active' : 'Empty'}
                            </span>
                            <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-black/80 py-1 text-[10px] font-semibold text-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition">
                              <Layers className="h-3 w-3 shrink-0" />
                              <span>Saved ({profileAvatarsVault.length})</span>
                            </span>
                          </button>
                        </div>

                        {/* Right: Uniform Buttons Row + AI Description & Instructions Box */}
                        <div className="flex-1 min-w-0 w-full space-y-3">
                          {/* Row 1: Uniform Dimension Action Buttons */}
                          <div
                            className={`grid grid-cols-2 ${
                              originalPortraitUrl ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
                            } gap-2 w-full`}
                          >
                            <input
                              ref={profilePhotoFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleUploadProfilePhotoFile}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleTogglePortraitVault()}
                              className={`h-9 px-2.5 w-full rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition shadow-sm ${
                                isPortraitVaultOpen
                                  ? 'border-indigo-400 bg-indigo-950/80 text-indigo-200'
                                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <span className="truncate">Saved ({profileAvatarsVault.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => profilePhotoFileInputRef.current?.click()}
                              className="h-9 px-2.5 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition"
                            >
                              <Camera className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Upload</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAvatarModalTab('camera');
                                setIsAvatarModalOpen(true);
                              }}
                              className="h-9 px-2.5 w-full rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition"
                            >
                              <Video className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">Camera</span>
                            </button>

                            {originalPortraitUrl && (
                              <button
                                type="button"
                                onClick={handleRestoreOriginalAvatar}
                                className="h-9 px-2.5 w-full rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition"
                                title="Restore your previous unmodified portrait"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                <span className="truncate">Original</span>
                              </button>
                            )}

                            {deletedPortraitsHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={handleUndoDeletePortrait}
                                className="h-9 px-2.5 w-full rounded-xl border border-emerald-500/40 bg-emerald-950/35 hover:bg-emerald-900/50 text-emerald-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition col-span-2 sm:col-span-1"
                                title="Undo last portrait deletion"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">Undo Delete ({deletedPortraitsHistory.length})</span>
                              </button>
                            )}
                          </div>

                          {/* Row 2: Auto-Expanding AI Description & Instructions Field (Identical expansion behavior to Personal Bio) */}
                          <div className="rounded-xl bg-slate-900/90 border border-indigo-500/30 p-3 space-y-2 w-full">
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 min-w-0">
                                <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate">AI Instructions</span>
                              </label>
                              <button
                                type="button"
                                onClick={handleRecreate3DAvatar}
                                disabled={isRecreating3DAvatar || !avatarCustomCommand.trim()}
                                className="h-8 px-3 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md transition disabled:opacity-50 shrink-0"
                              >
                                <Wand2 className={`h-3.5 w-3.5 shrink-0 ${isRecreating3DAvatar ? 'animate-spin' : ''}`} />
                                <span>
                                  {isRecreating3DAvatar ? 'Generating...' : 'Generate'}
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono text-amber-200">
                                  <Coins className="h-2.5 w-2.5 text-amber-300" />
                                  <span>1</span>
                                </span>
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              ref={(el) => {
                                avatarInstructionTextareaRef.current = el;
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${Math.max(58, el.scrollHeight + 2)}px`;
                                }
                              }}
                              value={avatarCustomCommand}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setAvatarCustomCommand(nextVal);
                                if (!nextVal.trim()) {
                                  setAvatarStylePreset('custom_only');
                                }
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = `${Math.max(58, e.currentTarget.scrollHeight + 2)}px`;
                              }}
                              placeholder="Tap a preset below or describe how to style your photo..."
                              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 leading-relaxed resize-none overflow-hidden placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {avatarCreationStatus && (
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>{avatarCreationStatus}</span>
                        </div>
                      )}

                      {/* On-Demand Saved Portraits Vault Drawer (Only visible when user clicks Active Picture or Saved Images button) */}
                      {isPortraitVaultOpen && (
                        <div className="pt-3 border-t border-slate-800/90 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                                <span>Saved Portraits & Generated Avatars ({profileAvatarsVault.length})</span>
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Click any image to set as active · Double-click any image to enlarge and inspect.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deletedPortraitsHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleUndoDeletePortrait}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-[11px] font-semibold text-emerald-300 flex items-center gap-1 transition"
                                  title="Restore deleted portrait"
                                >
                                  <RotateCcw className="h-3 w-3 text-emerald-400" />
                                  <span>Undo Delete ({deletedPortraitsHistory.length})</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleTogglePortraitVault(false)}
                                className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 shrink-0"
                              >
                                <span>Close Vault</span>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                            {profileAvatarsVault.map((pic) => {
                              const isCurrent = profile.avatarUrl?.trim() === pic.url?.trim();
                              return (
                                <div
                                  key={pic.id}
                                  onClick={() => {
                                    onUpdateProfile({
                                      ...profile,
                                      previousAvatarUrl: undefined,
                                      avatarUrl: pic.url,
                                    });
                                  }}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEnlargedPreviewImage({ url: pic.url, title: pic.name });
                                  }}
                                  className={`group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition ${
                                    isCurrent
                                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 shadow-md'
                                      : 'border-slate-800 hover:border-slate-600'
                                  }`}
                                  title={`Click to select "${pic.name}" · Double-click to enlarge`}
                                >
                                  <img
                                    src={pic.url}
                                    alt={pic.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                                  {isCurrent && (
                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-indigo-600 text-[8px] font-bold text-white shadow">
                                      Active
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeletePortraitFromVault(e, pic)}
                                    className="absolute top-1.5 right-1.5 h-5 w-5 rounded-md bg-black/75 hover:bg-rose-600 text-rose-300 hover:text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
                                    title="Delete from Vault"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                  <div className="absolute inset-x-1.5 bottom-1.5">
                                    <div className="text-[9px] font-semibold text-white truncate">
                                      {pic.name}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INTERACTIVE PORTRAIT FRAMING, ZOOM & PAN STUDIO */}
                    <div className="rounded-xl border border-cyan-500/35 bg-slate-950/90 p-4 space-y-4 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                            <Move className="h-4 w-4 text-cyan-400" />
                          </div>
                          <div>
                            <h5 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                              Portrait Framing & Pan / Zoom Studio
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                                Live 3D Sync
                              </span>
                            </h5>
                            <p className="text-[11px] text-slate-400">
                              Drag the portrait to pan, or use the zoom slider and nudge buttons to frame your photo perfectly on your cards.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetFraming}
                          title="Reset portrait framing to golden center ratio"
                          className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                          <span>Reset Center</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        {/* Left (md:col-span-5): Interactive Drag-to-Pan Canvas Preview */}
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div
                            onPointerDown={handleFramingPointerDown}
                            onPointerMove={handleFramingPointerMove}
                            onPointerUp={handleFramingPointerUp}
                            onPointerCancel={handleFramingPointerUp}
                            className={`relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-2 select-none shadow-2xl transition-all ${
                              isDraggingFramingPreview
                                ? 'border-cyan-400 ring-4 ring-cyan-500/30 cursor-grabbing'
                                : 'border-cyan-500/40 hover:border-cyan-400 cursor-grab'
                            } bg-slate-900`}
                            style={{ touchAction: 'none' }}
                            title="Click and drag anywhere to pan the portrait"
                          >
                            {profile.avatarUrl ? (
                              <>
                                <img
                                  src={profile.avatarUrl}
                                  alt={profile.name}
                                  draggable={false}
                                  className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-75"
                                  style={{
                                    objectPosition: `${activeCard.avatarOffsetX ?? 50}% ${activeCard.avatarOffsetY ?? 18}%`,
                                    transform: (activeCard.avatarZoom ?? 1) !== 1 ? `scale(${activeCard.avatarZoom})` : undefined,
                                    transformOrigin: `${activeCard.avatarOffsetX ?? 50}% ${activeCard.avatarOffsetY ?? 18}%`,
                                  }}
                                />
                                {/* Subtle Pan & Zoom Crosshair Overlay */}
                                <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-cyan-300 flex items-center gap-1 pointer-events-none shadow">
                                  <Move className="h-2.5 w-2.5" />
                                  <span>Pan {activeCard.avatarOffsetX ?? 50}%, {activeCard.avatarOffsetY ?? 18}%</span>
                                </div>
                                <div className="absolute bottom-2 inset-x-2 py-1 rounded-md bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-center text-slate-300 pointer-events-none shadow">
                                  {(activeCard.avatarZoom ?? 1).toFixed(2)}x Zoom · Drag to pan
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400">
                                <Camera className="h-8 w-8 text-slate-500 mb-2" />
                                <span className="text-xs">Upload a portrait above to enable framing</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 text-center">
                            💡 Drag inside the square above to freely pan your photo
                          </span>
                        </div>

                        {/* Right (md:col-span-7): Zoom Slider & Precise Directional Pan D-Pad */}
                        <div className="space-y-4">
                          {/* Zoom Control Section */}
                          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <ZoomIn className="h-3.5 w-3.5 text-cyan-400" />
                                <span>Zoom Level</span>
                              </span>
                              <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                                {(activeCard.avatarZoom ?? 1.0).toFixed(2)}x
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleStepZoom(-0.1)}
                                disabled={(activeCard.avatarZoom ?? 1.0) <= 1.0}
                                className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center justify-center transition shrink-0"
                                title="Zoom Out"
                              >
                                <ZoomOut className="h-4 w-4" />
                              </button>
                              <input
                                type="range"
                                min={1.0}
                                max={2.5}
                                step={0.05}
                                value={activeCard.avatarZoom ?? 1.0}
                                onChange={(e) => handleSetZoom(parseFloat(e.target.value))}
                                className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleStepZoom(0.1)}
                                disabled={(activeCard.avatarZoom ?? 1.0) >= 2.5}
                                className="h-8 w-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center justify-center transition shrink-0"
                                title="Zoom In"
                              >
                                <ZoomIn className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Quick Zoom Presets */}
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {[
                                { label: '1.0x Fit', value: 1.0 },
                                { label: '1.25x Close', value: 1.25 },
                                { label: '1.50x Bust', value: 1.5 },
                                { label: '2.0x Focus', value: 2.0 },
                              ].map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => handleSetZoom(preset.value)}
                                  className={`py-1 px-1 rounded-lg text-[10px] font-mono font-medium transition ${
                                    Math.abs((activeCard.avatarZoom ?? 1.0) - preset.value) < 0.04
                                      ? 'bg-cyan-600 text-white font-bold shadow'
                                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Directional Pan Nudge Controls */}
                          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <Move className="h-3.5 w-3.5 text-cyan-400" />
                                <span>Directional Pan & Fine Tuning</span>
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                X: {activeCard.avatarOffsetX ?? 50}% · Y: {activeCard.avatarOffsetY ?? 18}%
                              </span>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                              {/* D-Pad Buttons */}
                              <div className="inline-grid grid-cols-3 gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                                <div />
                                <button
                                  type="button"
                                  onClick={() => handleNudgePan(0, -5)}
                                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95"
                                  title="Pan Up (nudges down into frame)"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <div />

                                <button
                                  type="button"
                                  onClick={() => handleNudgePan(5, 0)}
                                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95"
                                  title="Pan Left"
                                >
                                  <ArrowLeft className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleResetFraming}
                                  className="h-8 w-8 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 flex items-center justify-center transition active:scale-95"
                                  title="Center & Reset"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleNudgePan(-5, 0)}
                                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95"
                                  title="Pan Right"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </button>

                                <div />
                                <button
                                  type="button"
                                  onClick={() => handleNudgePan(0, 5)}
                                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95"
                                  title="Pan Down (nudges up into frame)"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                                <div />
                              </div>

                              <div className="text-[11px] text-slate-400 leading-snug pl-2 max-w-[180px]">
                                Use arrows to fine-tune portrait positioning by 5% increments.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Area: Presets that populate the AI Description Field above */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-indigo-400 shrink-0" />
                            <span className="truncate">Style Presets</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click any preset to load its description into the AI instruction box above (click again to clear).
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPortraitPresetFilter('all')}
                            className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                              portraitPresetFilter === 'all'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            All (14)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPortraitPresetFilter('headshot')}
                            className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                              portraitPresetFilter === 'headshot'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Headshots (6)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPortraitPresetFilter('3d_stylized')}
                            className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                              portraitPresetFilter === '3d_stylized'
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            3D & Stylized (8)
                          </button>
                        </div>
                      </div>

                      {/* Studio Headshot & Attire Presets (Compact, No Redundant Description) */}
                      {(portraitPresetFilter === 'all' || portraitPresetFilter === 'headshot') && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            <span>Studio Headshot & Attire Presets</span>
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {headshotPresetsList.map((preset) => {
                              const isSelected = avatarStylePreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setAvatarStylePreset('custom_only');
                                      setAvatarCustomCommand('');
                                    } else {
                                      setAvatarStylePreset(preset.id);
                                      setAvatarCustomCommand(preset.promptText);
                                    }
                                  }}
                                  className={`h-9 px-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1.5 ${
                                    isSelected
                                      ? 'border-indigo-400 bg-indigo-950/45 text-white ring-1 ring-indigo-400/40 shadow-md'
                                      : 'border-slate-800 bg-slate-950/85 text-slate-300 hover:border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <span className="text-xs font-bold text-white truncate">
                                    {preset.label}
                                  </span>
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 hidden sm:inline-block ${preset.badgeClass}`}
                                  >
                                    {preset.badge}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3D & Stylized Character Avatar Presets */}
                      {(portraitPresetFilter === 'all' || portraitPresetFilter === '3d_stylized') && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <Wand2 className="h-3 w-3 text-amber-400" />
                            <span>3D & Stylized Avatar Presets</span>
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {avatarStylePresetsList.map((preset) => {
                              const isSelected = avatarStylePreset === preset.id;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setAvatarStylePreset('custom_only');
                                      setAvatarCustomCommand('');
                                    } else {
                                      setAvatarStylePreset(preset.id);
                                      setAvatarCustomCommand(preset.promptText);
                                    }
                                  }}
                                  className={`h-9 px-2.5 rounded-xl border text-left transition flex items-center justify-between gap-1 ${
                                    isSelected
                                      ? 'border-amber-400 bg-amber-950/35 text-white ring-1 ring-amber-400/40 shadow-md'
                                      : 'border-slate-800 bg-slate-950/85 text-slate-300 hover:border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <span className="text-xs font-bold truncate">{preset.label}</span>
                                  {isSelected ? (
                                    <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  ) : preset.badge ? (
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                      {preset.badge}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 6: CARD BACKGROUND & SCENIC STUDIO */}
                <div className={`${openAccordions.background ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('background')}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <Image className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            Card Background & Scenic Studio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          16:9 cover backgrounds, AI scene generator, and curated scenic & executive presets
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        openAccordions.background ? 'rotate-180 text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {openAccordions.background && (
                    <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4 animate-in fade-in duration-150">
                      {/* Top Area: Active Background Preview + Uniform Action Bar + Side-by-Side AI Prompt Field */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950/85 p-4 space-y-3.5">
                      {/* Full-Width Section Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            Background Studio
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            Click the active cover or <strong className="text-slate-200">Saved Images</strong> to switch backgrounds, or describe a scene beside it.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/30 shrink-0">
                          16:9 Cover
                        </span>
                      </div>

                      {/* Side-by-Side: Active Background (Left) + Uniform Buttons & AI Description (Right) */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* Left: Active Background Only (Click to toggle Saved Backgrounds Vault) */}
                        <div className="shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleBackgroundVault()}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (activeCard.coverBannerUrl) {
                                setEnlargedPreviewImage({
                                  url: activeCard.coverBannerUrl,
                                  title: `${activeCard.name} — Active Cover Background`,
                                });
                              }
                            }}
                            className="group relative h-32 w-44 sm:h-36 sm:w-48 rounded-2xl overflow-hidden border-2 border-cyan-500/70 bg-slate-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 transition block"
                            title="Click to toggle Saved Vault · Double-click to enlarge & inspect"
                          >
                            {activeCard.coverBannerUrl ? (
                              <img
                                src={activeCard.coverBannerUrl}
                                alt={activeCard.name}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/50 p-2 text-center">
                                <Image className="h-6 w-6 text-cyan-400/70 mb-1" />
                                <span className="text-[10px] font-medium text-slate-400">
                                  No Cover Active
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-cyan-600/95 text-[9px] font-mono font-bold text-white uppercase shadow">
                              Active
                            </span>
                            <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-black/80 py-1 text-[10px] font-semibold text-cyan-200 group-hover:bg-cyan-600 group-hover:text-white transition">
                              <Layers className="h-3 w-3 shrink-0" />
                              <span>Saved ({hubBanners.length})</span>
                            </span>
                          </button>
                        </div>

                        {/* Right: Uniform Buttons Row + AI Description & Instructions Box */}
                        <div className="flex-1 min-w-0 w-full space-y-3">
                          {/* Row 1: Uniform Dimension Action Buttons */}
                          <div
                            className={`grid grid-cols-2 ${
                              activeCard.coverBannerUrl ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                            } gap-2 w-full`}
                          >
                            <input
                              ref={backdropFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleUploadCustomBackdropFile}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => handleToggleBackgroundVault()}
                              className={`h-9 px-2.5 w-full rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition shadow-sm ${
                                isBackgroundVaultOpen
                                  ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200'
                                  : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              <Layers className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">Saved ({hubBanners.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => backdropFileInputRef.current?.click()}
                              className="h-9 px-2.5 w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition"
                            >
                              <Camera className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">Upload</span>
                            </button>

                            {activeCard.coverBannerUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const activeUrl = activeCard.coverBannerUrl!;
                                  const existingBanner = hubBanners.find((b) => b.url === activeUrl) || {
                                    id: `banner-cleared-${Date.now()}`,
                                    name: `${activeCard.name} Cover`,
                                    url: activeUrl,
                                    context: 'banner' as const,
                                    category: 'banner' as const,
                                    aspectRatio: '16:9' as const,
                                  };
                                  setDeletedBannersHistory((prev) => [
                                    { item: existingBanner, wasActive: true },
                                    ...prev,
                                  ]);
                                  onUpdateCard({
                                    ...activeCard,
                                    coverBannerUrl: undefined,
                                    backdropMode: 'standard',
                                  });
                                }}
                                className="h-9 px-2.5 w-full rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition col-span-2 sm:col-span-1"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">Clear</span>
                              </button>
                            )}

                            {deletedBannersHistory.length > 0 && (
                              <button
                                type="button"
                                onClick={handleUndoDeleteBanner}
                                className="h-9 px-2.5 w-full rounded-xl border border-emerald-500/40 bg-emerald-950/35 hover:bg-emerald-900/50 text-emerald-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm transition col-span-2 sm:col-span-1"
                                title="Undo last background deletion or clear"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">Undo Delete ({deletedBannersHistory.length})</span>
                              </button>
                            )}
                          </div>

                          {/* Row 2: Auto-Expanding AI Description & Instructions Field (Identical expansion behavior to Personal Bio) */}
                          <form
                            onSubmit={handleGenerateInlineBanner}
                            className="rounded-xl bg-slate-900/90 border border-cyan-500/30 p-3 space-y-2 w-full"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 min-w-0">
                                <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate">AI Instructions</span>
                              </label>
                              <button
                                type="submit"
                                disabled={!inlineBannerPrompt.trim() || isGeneratingInlineBanner}
                                className="h-8 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md transition disabled:opacity-50 shrink-0"
                              >
                                <Wand2 className={`h-3.5 w-3.5 shrink-0 ${isGeneratingInlineBanner ? 'animate-spin' : ''}`} />
                                <span>
                                  {isGeneratingInlineBanner ? 'Generating...' : 'Generate'}
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono text-amber-200">
                                  <Coins className="h-2.5 w-2.5 text-amber-300" />
                                  <span>1</span>
                                </span>
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              ref={(el) => {
                                bannerInstructionTextareaRef.current = el;
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${Math.max(58, el.scrollHeight + 2)}px`;
                                }
                              }}
                              value={inlineBannerPrompt}
                              onChange={(e) => {
                                setInlineBannerPrompt(e.target.value);
                                e.currentTarget.style.height = 'auto';
                                e.currentTarget.style.height = `${Math.max(58, e.currentTarget.scrollHeight + 2)}px`;
                              }}
                              placeholder="Tap a preset below or describe your background scene..."
                              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 leading-relaxed resize-none overflow-hidden placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                            />
                          </form>
                        </div>
                      </div>

                      {/* On-Demand Saved Backgrounds Vault Drawer */}
                      {isBackgroundVaultOpen && (
                        <div className="pt-3 border-t border-slate-800/90 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                                <span>Saved Backgrounds Vault ({hubBanners.length})</span>
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Click any background to apply · Double-click any background to enlarge and inspect.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deletedBannersHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleUndoDeleteBanner}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-[11px] font-semibold text-emerald-300 flex items-center gap-1 transition"
                                  title="Restore deleted background"
                                >
                                  <RotateCcw className="h-3 w-3 text-emerald-400" />
                                  <span>Undo Delete ({deletedBannersHistory.length})</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleBackgroundVault(false)}
                                className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 shrink-0"
                              >
                                <span>Close Vault</span>
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {hubBanners.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                              {hubBanners.map((banner) => {
                                const isCurrent = activeCard.coverBannerUrl === banner.url;
                                return (
                                  <div
                                    key={banner.id}
                                    onClick={() => {
                                      onUpdateCard({
                                        ...activeCard,
                                        coverBannerUrl: banner.url,
                                        backdropMode: 'standard',
                                        backdropSource: 'banner',
                                      });
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setEnlargedPreviewImage({ url: banner.url, title: banner.name });
                                    }}
                                    className={`group relative h-20 rounded-xl overflow-hidden border p-2 transition cursor-pointer ${
                                      isCurrent
                                        ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-md'
                                        : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                    title={`Click to apply "${banner.name}" · Double-click to enlarge`}
                                  >
                                    <img
                                      src={banner.url}
                                      alt={banner.name}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                    {isCurrent && (
                                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-cyan-600 text-[8px] font-bold text-white shadow z-10">
                                        Active
                                      </span>
                                    )}
                                    <div className="relative z-10 h-full flex items-end justify-between">
                                      <span className="text-[10px] font-semibold text-white truncate">
                                        {banner.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteBannerFromHub(e, banner.url, banner)}
                                        className="opacity-90 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded bg-black/75 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                                        title="Delete from Vault"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-3 px-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                              No custom or AI backgrounds saved yet. Upload an image or generate one above to store it in your Vault.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Area: Background Presets that populate the AI Description Field above & preview on card */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/75 p-4 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <Image className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span>Background Presets</span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click any preset to apply the cover and load its scene description into the AI instruction box above.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            { id: 'all', label: `All (${COVER_BANNER_PRESETS.length})` },
                            { id: 'landscapes_nature', label: 'Scenic (5)' },
                            { id: 'executive', label: 'Executive' },
                            { id: 'tech_ai', label: 'Tech & AI' },
                            { id: 'creative_social', label: 'Social' },
                            { id: 'architecture_workspace', label: 'Architecture' },
                          ] as const
                        ).map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setLandscapeFilter(cat.id)}
                            className={`h-8 px-3 rounded-lg text-[10px] font-semibold whitespace-nowrap transition border ${
                              landscapeFilter === cat.id
                                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {COVER_BANNER_PRESETS.filter(
                          (b) => landscapeFilter === 'all' || b.category === landscapeFilter
                        ).map((banner) => {
                          const isSelected = activeCard.coverBannerUrl === banner.url;
                          const bannerPromptText = `${banner.name} — ${banner.subtitle}, cinematic 16:9 widescreen background, high atmospheric depth`;
                          return (
                            <button
                              key={banner.id}
                              type="button"
                              onClick={() => {
                                if (isSelected && inlineBannerPrompt === bannerPromptText) {
                                  setInlineBannerPrompt('');
                                } else {
                                  setInlineBannerPrompt(bannerPromptText);
                                  onUpdateCard({
                                    ...activeCard,
                                    coverBannerUrl: banner.url,
                                    backdropMode: 'standard',
                                    backdropSource: 'banner',
                                  });
                                }
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEnlargedPreviewImage({ url: banner.url, title: banner.name });
                              }}
                              className={`group relative h-20 rounded-xl overflow-hidden border text-left p-2 transition ${
                                isSelected
                                  ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-md'
                                  : 'border-slate-800 hover:border-slate-600'
                              }`}
                              title={`${banner.name} (${banner.subtitle}) · Click to apply, double-click to enlarge`}
                            >
                              <img
                                src={banner.url}
                                alt={banner.name}
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="relative z-10 h-full flex items-end">
                                <span
                                  style={{ backgroundColor: 'rgba(2, 6, 23, 0.88)', color: '#ffffff' }}
                                  className="inline-block max-w-full px-2 py-0.5 rounded-md border border-white/20 text-[11px] font-bold tracking-tight leading-snug truncate shadow-md"
                                >
                                  {banner.name}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ================================================================= */}
          {/* ACCORDION 7: CARD THEME, LAYOUT & BRAND LOGO                      */}
          {/* ================================================================= */}
          <div className={`${openAccordions.theme ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
            <button
              type="button"
              onClick={() => toggleAccordion('theme')}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Palette className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      Card Theme, Layout & Brand Logo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    Color palette, material texture, 8 card layouts, fonts, live status, and brand logo
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  openAccordions.theme ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {openAccordions.theme && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-6 animate-in fade-in duration-150">
                {/* PART 1: FINISH & PALETTE */}
                <div className="space-y-3">
                  {/* Compact Filter Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-white">
                        Color & Material Palette
                      </span>
                    </div>

                    <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px]">
                      {(
                        [
                          { id: 'all', label: 'All (12)' },
                          { id: 'signature', label: 'Modern & Young (6)' },
                          { id: 'metals', label: 'Classy Business (6)' },
                        ] as const
                      ).map((grp) => (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => setPaletteGroup(grp.id)}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                            paletteGroup === grp.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {grp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Curated 12-Preset Modern & Young + Classy Business Swatch Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(
                      [
                        // MODERN & YOUNG (6)
                        {
                          id: 'cyber',
                          group: 'signature',
                          label: 'Cyber Pulse',
                          sub: 'Electric Cyan & Indigo',
                          material: 'holographic_foil',
                          gradient: 'from-[#06B6D4] via-[#1E3A8A] to-[#0F172A]',
                          accent: '#22D3EE',
                        },
                        {
                          id: 'creative',
                          group: 'signature',
                          label: 'Tokyo Ultraviolet',
                          sub: 'Neon Violet & Magenta',
                          material: 'holographic_foil',
                          gradient: 'from-[#D946EF] via-[#6D28D9] to-[#1E1B4B]',
                          accent: '#E879F9',
                        },
                        {
                          id: 'frosted_glass',
                          group: 'signature',
                          label: 'Arctic Frost',
                          sub: 'Iridescent Pearl & Sky',
                          material: 'frosted_glass',
                          gradient: 'from-[#FFFFFF] via-[#E0F2FE] to-[#CBD5E1]',
                          accent: '#0284C7',
                          isLight: true,
                        },
                        {
                          id: 'emerald_luxury',
                          group: 'signature',
                          label: 'Neo-Mint Slate',
                          sub: 'Electric Mint & Slate',
                          material: 'anodized_titanium',
                          gradient: 'from-[#10B981] via-[#0F2926] to-[#090D16]',
                          accent: '#34D399',
                        },
                        {
                          id: 'paris_sellier',
                          group: 'signature',
                          label: 'Solar Coral',
                          sub: 'Vibrant Sunset & Rose',
                          material: 'satin_silk',
                          gradient: 'from-[#FB7185] via-[#E11D48] to-[#881337]',
                          accent: '#FDE047',
                        },
                        {
                          id: 'bento_dark',
                          group: 'signature',
                          label: 'Linear Carbon',
                          sub: 'Electric Indigo & Noir',
                          material: 'forged_carbon',
                          gradient: 'from-[#4F46E5] via-[#1E1B4B] to-[#09090B]',
                          accent: '#818CF8',
                        },
                        // CLASSY BUSINESS (6)
                        {
                          id: 'royal_navy',
                          group: 'metals',
                          label: 'Mayfair Navy',
                          sub: 'Sovereign Navy & Gold',
                          material: 'brushed_metal',
                          gradient: 'from-[#1E3A8A] via-[#0F2952] to-[#051024]',
                          accent: '#D4AF37',
                        },
                        {
                          id: 'executive',
                          group: 'metals',
                          label: 'Obsidian & Gold',
                          sub: 'Matte Noir & 24k Gold',
                          material: 'brushed_metal',
                          gradient: 'from-[#27272A] via-[#18181B] to-[#09090B]',
                          accent: '#D4AF37',
                        },
                        {
                          id: 'brushed_titanium',
                          group: 'metals',
                          label: 'Silver Titanium',
                          sub: 'Aerospace Grade-5 Alloy',
                          material: 'anodized_titanium',
                          gradient: 'from-[#64748B] via-[#475569] to-[#1E293B]',
                          accent: '#E2E8F0',
                        },
                        {
                          id: 'swiss_editorial',
                          group: 'metals',
                          label: 'Geneva Ivory',
                          sub: 'Archival Cotton & Gold',
                          material: 'tactile_paper',
                          gradient: 'from-[#FDFBF7] via-[#F2ECE1] to-[#E2D9C5]',
                          accent: '#B48327',
                          isLight: true,
                        },
                        {
                          id: 'firenze_heritage',
                          group: 'metals',
                          label: 'Connaught Green',
                          sub: 'British Racing Emerald',
                          material: 'equestrian_stripe',
                          gradient: 'from-[#065F46] via-[#064E3B] to-[#022C22]',
                          accent: '#D4AF37',
                        },
                        {
                          id: 'tailored_boss',
                          group: 'metals',
                          label: 'Savile Taupe',
                          sub: 'Warm Cashmere & Pinstripe',
                          material: 'tailored_pinstripe',
                          gradient: 'from-[#F5EFE6] via-[#E5D5C0] to-[#C8B296]',
                          accent: '#78350F',
                          isLight: true,
                        },
                      ] as const
                    )
                      .filter((t) => paletteGroup === 'all' || t.group === paletteGroup)
                      .map((t) => {
                        const isSelected = activeCard.theme === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              onUpdateCard({
                                ...activeCard,
                                theme: t.id,
                                materialFinish: t.material as any,
                                accentColor: t.accent,
                              })
                            }
                            className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-amber-400 bg-slate-900 shadow-sm ring-1 ring-amber-400/35'
                                : 'border-slate-800/90 bg-slate-950/85 hover:border-slate-700 hover:bg-slate-900/60'
                            }`}
                          >
                            {/* Left Color Swatch Pill */}
                            <div
                              className={`relative h-8 w-9 shrink-0 rounded-lg bg-gradient-to-br ${t.gradient} border flex items-center justify-end pr-1.5 overflow-hidden shadow-xs ${
                                'isLight' in t && t.isLight ? 'border-stone-400/90' : 'border-white/25'
                              }`}
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full shadow-sm border border-black/30"
                                style={{ backgroundColor: t.accent }}
                              />
                            </div>

                            {/* Compact Label + Sub */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className={`text-xs font-bold truncate leading-tight ${
                                    isSelected ? 'text-white' : 'text-slate-200'
                                  }`}
                                >
                                  {t.label}
                                </span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                                {t.sub}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {/* Compact Unified Surface Grain & Accent Toolbar (Zero Scrollbars, No Clipping) */}
                  <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-3">
                    {/* Row 1: Scrollbar-Free Compact Texture Grid */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Surface Texture
                        </span>
                        <span className="text-[10px] font-mono text-amber-400/90 capitalize">
                          {(activeCard.materialFinish || 'forged_carbon') === 'none'
                            ? 'Plain Surface'
                            : (activeCard.materialFinish || 'forged_carbon')
                                .replace('saffiano_leather', 'Cross-Grain')
                                .replace('equestrian_stripe', 'Ribbon Stripe')
                                .replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                        {(
                          [
                            { id: 'forged_carbon', label: 'Carbon', swatch: 'bg-zinc-800 border-amber-400/40' },
                            { id: 'saffiano_leather', label: 'Cross-Grain', swatch: 'bg-zinc-900 border-zinc-400/50' },
                            { id: 'equestrian_stripe', label: 'Ribbon Stripe', swatch: 'bg-gradient-to-r from-[#065F46] via-white to-[#065F46] border-emerald-400/50' },
                            { id: 'tailored_pinstripe', label: 'Pinstripe', swatch: 'bg-stone-800 border-[#C69C6D]/60' },
                            { id: 'anodized_titanium', label: 'Titanium', swatch: 'bg-slate-600 border-slate-300/60' },
                            { id: 'gold_leaf', label: '24k Gold', swatch: 'bg-amber-500/80 border-amber-300' },
                            { id: 'brushed_metal', label: 'Brushed', swatch: 'bg-slate-700 border-slate-400' },
                            { id: 'matte', label: 'Matte', swatch: 'bg-zinc-950 border-zinc-700' },
                            { id: 'frosted_glass', label: 'Glass', swatch: 'bg-cyan-950 border-cyan-400/60' },
                            { id: 'tactile_paper', label: 'Paper', swatch: 'bg-[#EAE6DB] border-stone-400' },
                            { id: 'holographic', label: 'Holo Foil', swatch: 'bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-400 border-white/40' },
                            { id: 'none', label: 'Plain', swatch: 'bg-transparent border-dashed border-slate-600' },
                          ] as const
                        ).map((m) => {
                          const currentFinish = activeCard.materialFinish || 'forged_carbon';
                          const active = currentFinish === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() =>
                                onUpdateCard({
                                  ...activeCard,
                                  materialFinish: m.id as any,
                                })
                              }
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition truncate ${
                                active
                                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/70 shadow-sm'
                                  : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-sm border shrink-0 ${m.swatch}`} />
                              <span className="truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row 2: Unclipped Accent Swatch Bar with Generous Spacing */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/70">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                          Accent
                        </span>
                        <div className="flex flex-wrap items-center gap-2.5 px-1 py-1">
                          {[
                            { color: '#D4AF37', label: 'Satin Gold' },
                            { color: '#FACC15', label: 'Solar Gold' },
                            { color: '#C69C6D', label: 'Warm Camel' },
                            { color: '#DC2626', label: 'Crimson Red' },
                            { color: '#E2E8F0', label: 'Platinum Ice' },
                            { color: '#10B981', label: 'Deep Emerald' },
                            { color: '#06B6D4', label: 'Electric Cyan' },
                            { color: '#6366F1', label: 'Royal Indigo' },
                          ].map((c) => {
                            const isSelected =
                              activeCard.accentColor?.toLowerCase() === c.color.toLowerCase();
                            return (
                              <button
                                key={c.color}
                                type="button"
                                onClick={() => onUpdateCard({ ...activeCard, accentColor: c.color })}
                                title={c.label}
                                className={`h-5 w-5 rounded-full transition-all shrink-0 ${
                                  isSelected
                                    ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950 shadow-sm'
                                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                                }`}
                                style={{ backgroundColor: c.color }}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <label
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-[10px] text-slate-300 shrink-0"
                        title="Custom Hex Color"
                      >
                        <input
                          type="color"
                          value={activeCard.accentColor || '#D4AF37'}
                          onChange={(e) =>
                            onUpdateCard({ ...activeCard, accentColor: e.target.value })
                          }
                          className="h-3.5 w-3.5 rounded bg-transparent cursor-pointer border-0 p-0"
                        />
                        <span className="font-mono uppercase">{activeCard.accentColor}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* PART 2: LAYOUT & LIVE STATUS */}
                <div className="space-y-5 pt-4 border-t border-slate-800/80">
                  {/* Streamlined 3-Card Presentation Selector (Single-Line on Phone & Desktop) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">
                        Default Card Presentation Mode
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Initial view when shared
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          id: 'card_3d',
                          title: '3D Card',
                        },
                        {
                          id: 'story_deck',
                          title: 'Story Deck',
                        },
                        {
                          id: 'wallet_pass',
                          title: 'Wallet Pass',
                        },
                      ].map((p) => {
                        const currentPref =
                          activeCard.preferredLayout === 'story_deck' ||
                          activeCard.preferredLayout === 'wallet_pass'
                            ? activeCard.preferredLayout
                            : 'card_3d';
                        const isSelected = currentPref === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              onUpdateCard({ ...activeCard, preferredLayout: p.id as any })
                            }
                            className={`px-2 py-2 rounded-xl border text-center transition whitespace-nowrap truncate ${
                              isSelected
                                ? 'border-amber-400/90 bg-amber-950/30 text-white font-bold shadow-sm'
                                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200 font-semibold'
                            }`}
                          >
                            <span className="text-[11px] sm:text-xs truncate">{p.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Layout & Fonts & Styles Architecture (Works for both 3D Physical Card & 3-Slide Story Deck) */}
                  <div className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-3.5">
                    {/* Card Layout */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Card Layout (3D Card & Story Deck)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          8 layout arrangements
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          {
                            id: 'executive_left',
                            title: 'Executive Left',
                            sub: 'Classic left identity & 2-col grid',
                          },
                          {
                            id: 'centered_monolith',
                            title: 'Centered Monolith',
                            sub: 'Symmetrical portrait & pills',
                          },
                          {
                            id: 'split_columns',
                            title: 'Split Dual-Column',
                            sub: 'Left identity · Right coordinates',
                          },
                          {
                            id: 'structured_ledger',
                            title: 'Structured Ledger',
                            sub: 'Right portrait & boxed cells',
                          },
                          {
                            id: 'asymmetric_hero',
                            title: 'Asymmetric Hero',
                            sub: 'Statement title & lower dock',
                          },
                          {
                            id: 'minimal_horizon',
                            title: 'Minimal Horizon',
                            sub: 'Sleek ribbon & compact strip',
                          },
                          {
                            id: 'magazine_masthead',
                            title: 'Editorial Masthead',
                            sub: 'Full-width masthead & spread',
                          },
                          {
                            id: 'swiss_grid',
                            title: 'Swiss Modular Grid',
                            sub: 'Numbered architectural cells',
                          },
                        ].map((layoutOpt) => {
                          const isSelected =
                            (activeCard.contentLayout || 'executive_left') === layoutOpt.id;
                          return (
                            <button
                              key={layoutOpt.id}
                              type="button"
                              onClick={() =>
                                onUpdateCard({
                                  ...activeCard,
                                  contentLayout: layoutOpt.id as any,
                                })
                              }
                              className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'border-indigo-400/90 bg-indigo-950/30 text-white shadow-sm'
                                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              {/* Mini Visual Wireframe Preview */}
                              <div className="w-full h-9 rounded-lg bg-slate-950/90 border border-slate-800/80 p-1.5 flex items-center">
                                {layoutOpt.id === 'executive_left' && (
                                  <div className="w-full flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="h-3.5 w-3.5 rounded bg-indigo-400/70 shrink-0" />
                                      <div className="space-y-0.5 flex-1">
                                        <div className="h-1 w-3/4 rounded bg-slate-300/80" />
                                        <div className="h-1 w-1/2 rounded bg-slate-600" />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="h-1 rounded bg-slate-700" />
                                      <div className="h-1 rounded bg-slate-700" />
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'centered_monolith' && (
                                  <div className="w-full flex flex-col items-center justify-center gap-1">
                                    <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                                    <div className="h-1 w-1/2 rounded bg-slate-300/80" />
                                    <div className="flex gap-1">
                                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                                      <div className="h-1 w-4 rounded-full bg-slate-700" />
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'split_columns' && (
                                  <div className="w-full h-full grid grid-cols-12 gap-1.5 items-center">
                                    <div className="col-span-5 flex flex-col gap-1">
                                      <div className="h-3 w-3 rounded bg-emerald-400/75" />
                                      <div className="h-1 w-full rounded bg-slate-400" />
                                    </div>
                                    <div className="col-span-7 border-l border-slate-700 pl-1.5 space-y-1">
                                      <div className="h-1 w-full rounded bg-slate-300/70" />
                                      <div className="h-1 w-5/6 rounded bg-slate-600" />
                                      <div className="h-1 w-4/6 rounded bg-slate-600" />
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'structured_ledger' && (
                                  <div className="w-full flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <div className="space-y-0.5 flex-1">
                                        <div className="h-1 w-3/4 rounded bg-slate-300/80" />
                                        <div className="h-1 w-1/2 rounded bg-slate-600" />
                                      </div>
                                      <div className="h-3.5 w-3.5 rounded bg-cyan-400/75 shrink-0" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div className="h-1.5 rounded border border-slate-700 bg-slate-900" />
                                      <div className="h-1.5 rounded border border-slate-700 bg-slate-900" />
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'asymmetric_hero' && (
                                  <div className="w-full flex flex-col gap-1">
                                    <div className="h-1.5 w-5/6 rounded bg-rose-400/80" />
                                    <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800">
                                      <div className="h-3 w-3 rounded bg-slate-300/80 shrink-0" />
                                      <div className="grid grid-cols-2 gap-1 flex-1">
                                        <div className="h-1 rounded bg-slate-600" />
                                        <div className="h-1 rounded bg-slate-600" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'minimal_horizon' && (
                                  <div className="w-full flex flex-col justify-between gap-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 flex-1">
                                        <div className="h-2.5 w-2.5 rounded-full bg-teal-400/80 shrink-0" />
                                        <div className="h-1 w-2/3 rounded bg-slate-300/80" />
                                      </div>
                                      <div className="h-1 w-4 rounded bg-teal-400/50" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800">
                                      <div className="h-1 rounded-full bg-slate-600" />
                                      <div className="h-1 rounded-full bg-slate-600" />
                                      <div className="h-1 rounded-full bg-slate-600" />
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'magazine_masthead' && (
                                  <div className="w-full flex flex-col gap-1">
                                    <div className="w-full border-y border-slate-700 py-0.5 flex justify-center">
                                      <div className="h-1 w-4/5 rounded bg-amber-300/85" />
                                    </div>
                                    <div className="grid grid-cols-12 gap-1 items-center">
                                      <div className="col-span-4 h-2.5 rounded bg-slate-500/80" />
                                      <div className="col-span-8 space-y-0.5">
                                        <div className="h-0.5 w-full rounded bg-slate-600" />
                                        <div className="h-0.5 w-4/5 rounded bg-slate-600" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {layoutOpt.id === 'swiss_grid' && (
                                  <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-slate-700/70 p-0.5 rounded border border-slate-700">
                                    <div className="bg-slate-950 p-0.5 flex items-center gap-1">
                                      <div className="h-2 w-2 rounded-xs bg-purple-400/80 shrink-0" />
                                      <div className="h-1 w-full rounded bg-slate-400" />
                                    </div>
                                    <div className="bg-slate-950 p-0.5 flex items-center">
                                      <div className="h-1 w-4/5 rounded bg-slate-600" />
                                    </div>
                                    <div className="bg-slate-950 p-0.5 flex items-center">
                                      <div className="h-1 w-3/4 rounded bg-slate-700" />
                                    </div>
                                    <div className="bg-slate-950 p-0.5 flex items-center">
                                      <div className="h-1 w-3/4 rounded bg-slate-700" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-[11px] font-semibold truncate">
                                  {layoutOpt.title}
                                </div>
                                <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                  {layoutOpt.sub}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Fonts & Styles */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          Fonts & Styles
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          10 curated typefaces
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {[
                          {
                            id: 'classic_bodoni',
                            label: 'High-Fashion Didone',
                            sample: 'Aa · Bodoni',
                            fontClass: 'font-card-bodoni',
                          },
                          {
                            id: 'roman_cinzel',
                            label: 'Roman Heritage',
                            sample: 'Aa · Cinzel',
                            fontClass: 'font-card-cinzel',
                          },
                          {
                            id: 'couture_display',
                            label: 'Couture Display',
                            sample: 'Aa · Cormorant',
                            fontClass: 'font-card-couture',
                          },
                          {
                            id: 'architectural_grotesk',
                            label: 'Architectural',
                            sample: 'Aa · Grotesk',
                            fontClass: 'font-card-grotesk',
                          },
                          {
                            id: 'modern_sans',
                            label: 'Geometric Sans',
                            sample: 'Aa · Jakarta',
                            fontClass: 'font-card-sans',
                          },
                          {
                            id: 'technical_mono',
                            label: 'Technical Mono',
                            sample: 'Aa · JetBrains',
                            fontClass: 'font-card-mono',
                          },
                          {
                            id: 'humanist_outfit',
                            label: 'Pure Modernist',
                            sample: 'Aa · Outfit',
                            fontClass: 'font-card-outfit',
                          },
                          {
                            id: 'editorial_serif',
                            label: 'Editorial Serif',
                            sample: 'Aa · Playfair',
                            fontClass: 'font-card-serif',
                          },
                          {
                            id: 'cyber_sora',
                            label: 'Techno Precision',
                            sample: 'Aa · Sora',
                            fontClass: 'font-card-sora',
                          },
                          {
                            id: 'avant_syne',
                            label: 'Avant-Garde',
                            sample: 'Aa · Syne',
                            fontClass: 'font-card-syne',
                          },
                        ].map((fontOpt) => {
                          const isSelected =
                            (activeCard.fontPairing || 'modern_sans') === fontOpt.id;
                          return (
                            <button
                              key={fontOpt.id}
                              type="button"
                              onClick={() =>
                                onUpdateCard({
                                  ...activeCard,
                                  fontPairing: fontOpt.id as any,
                                })
                              }
                              className={`px-2.5 py-2 rounded-xl border text-left transition ${
                                isSelected
                                  ? 'border-amber-400/85 bg-amber-950/25 text-white shadow-sm'
                                  : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              <div className={`text-sm font-bold truncate ${fontOpt.fontClass}`}>
                                {fontOpt.sample}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5">
                                {fontOpt.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Live Presence & Time-Zone Bar */}
                  <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <span className="text-xs font-semibold text-white">
                            Live Status & Local Time-Zone Pulse
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Shows your availability badge and live local clock on the card.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = activeCard.livePresence || {
                            enabled: true,
                            statusText: `Verified Identity · ${activeCard.name}`,
                            availability: 'available',
                            timezone: 'America/Los_Angeles',
                          };
                          onUpdateCard({
                            ...activeCard,
                            livePresence: { ...cur, enabled: !cur.enabled },
                          });
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          activeCard.livePresence?.enabled !== false
                            ? 'bg-emerald-600'
                            : 'bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                            activeCard.livePresence?.enabled !== false
                              ? 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {activeCard.livePresence?.enabled !== false && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">
                            Availability
                          </label>
                          <select
                            value={activeCard.livePresence?.availability || 'available'}
                            onChange={(e) => {
                              const cur = activeCard.livePresence || {
                                enabled: true,
                                statusText: `Verified Identity · ${activeCard.name}`,
                                availability: 'available',
                                timezone: 'America/Los_Angeles',
                              };
                              onUpdateCard({
                                ...activeCard,
                                livePresence: {
                                  ...cur,
                                  availability: e.target.value as any,
                                },
                              });
                            }}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="available">🟢 Active Profile</option>
                            <option value="event">🟡 At Summit / Event</option>
                            <option value="deep_work">🟣 Focus / Deep Work</option>
                            <option value="traveling">🔵 Traveling</option>
                            <option value="do_not_disturb">🔴 Do Not Disturb</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">
                            Time-Zone Clock
                          </label>
                          <select
                            value={activeCard.livePresence?.timezone || 'America/Los_Angeles'}
                            onChange={(e) => {
                              const cur = activeCard.livePresence || {
                                enabled: true,
                                statusText: `Verified Identity · ${activeCard.name}`,
                                availability: 'available',
                                timezone: 'America/Los_Angeles',
                              };
                              onUpdateCard({
                                ...activeCard,
                                livePresence: { ...cur, timezone: e.target.value },
                              });
                            }}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                          >
                            <option value="America/Los_Angeles">San Francisco (PT)</option>
                            <option value="America/New_York">New York (ET)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Europe/Paris">Zurich / Milan (CET)</option>
                            <option value="Asia/Dubai">Dubai (GST)</option>
                            <option value="Asia/Singapore">Singapore (SGT)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-1">
                            Status Headline
                          </label>
                          <input
                            type="text"
                            value={
                              activeCard.livePresence?.statusText ??
                              `Verified Identity · ${activeCard.name || ''}`
                            }
                            onChange={(e) => {
                              const cur = activeCard.livePresence || {
                                enabled: true,
                                statusText: '',
                                availability: 'available',
                                timezone: 'America/Los_Angeles',
                              };
                              onUpdateCard({
                                ...activeCard,
                                livePresence: { ...cur, statusText: e.target.value },
                              });
                            }}
                            placeholder="Executive Identity · HQ"
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Story Deck Slide 02 Editor */}
                  <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-amber-400" />
                          <span>Story Deck — Slide 02 Spotlight</span>
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Customize the executive brief shown on Slide 02 of the Story Deck mode.
                        </p>
                      </div>
                      {activeCard.preferredLayout !== 'story_deck' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCard({ ...activeCard, preferredLayout: 'story_deck' })
                          }
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-semibold transition"
                        >
                          Activate Story Deck
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Spotlight Title
                        </label>
                        <input
                          type="text"
                          value={
                            activeCard.storySpotlight?.title ??
                            `${profile.company || 'Executive'} — Overview`
                          }
                          onChange={(e) => {
                            const cur = activeCard.storySpotlight || {
                              title: '',
                              subtitle: profile.headline || '',
                              badge: 'PROFILE HIGHLIGHTS',
                              metricValue: activeCard.tag || '',
                            };
                            onUpdateCard({
                              ...activeCard,
                              storySpotlight: { ...cur, title: e.target.value },
                            });
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Badge Label
                        </label>
                        <input
                          type="text"
                          value={activeCard.storySpotlight?.badge ?? 'PROFILE HIGHLIGHTS'}
                          onChange={(e) => {
                            const cur = activeCard.storySpotlight || {
                              title: `${profile.company || 'Executive'} — Overview`,
                              subtitle: profile.headline || '',
                              badge: 'PROFILE HIGHLIGHTS',
                              metricValue: activeCard.tag || '',
                            };
                            onUpdateCard({
                              ...activeCard,
                              storySpotlight: { ...cur, badge: e.target.value },
                            });
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Key Tag / Metric
                        </label>
                        <input
                          type="text"
                          value={activeCard.storySpotlight?.metricValue ?? activeCard.tag ?? ''}
                          onChange={(e) => {
                            const cur = activeCard.storySpotlight || {
                              title: `${profile.company || 'Executive'} — Overview`,
                              subtitle: profile.headline || '',
                              badge: 'PROFILE HIGHLIGHTS',
                              metricValue: '',
                            };
                            onUpdateCard({
                              ...activeCard,
                              storySpotlight: { ...cur, metricValue: e.target.value },
                            });
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-emerald-300 font-mono focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">
                          Executive Summary
                        </label>
                        <textarea
                          rows={2}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${Math.max(54, el.scrollHeight)}px`;
                            }
                          }}
                          value={activeCard.storySpotlight?.subtitle ?? profile.bio ?? ''}
                          onChange={(e) => {
                            e.currentTarget.style.height = 'auto';
                            e.currentTarget.style.height = `${Math.max(54, e.currentTarget.scrollHeight)}px`;
                            const cur = activeCard.storySpotlight || {
                              title: `${profile.company || 'Executive'} — Overview`,
                              subtitle: '',
                              badge: 'PROFILE HIGHLIGHTS',
                              metricValue: activeCard.tag || '',
                            };
                            onUpdateCard({
                              ...activeCard,
                              storySpotlight: { ...cur, subtitle: e.target.value },
                            });
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 leading-relaxed resize-none overflow-hidden focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PART 3: LOGO, CARD HANDLE & VIDEO PITCH */}
                <div className="space-y-5 pt-4 border-t border-slate-800/80">
                  {/* ENHANCED BRAND & LOGO MANAGEMENT STUDIO */}
                  <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-cyan-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Brand & Logo Management Studio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload your official company or personal brand logo, paste a transparent PNG/SVG link, or generate a custom emblem with AI.
                        </p>
                      </div>

                      {/* Visibility Toggle on Card */}
                      <div
                        onClick={() =>
                          onUpdateCard({
                            ...activeCard,
                            visibleFields: {
                              ...activeCard.visibleFields,
                              companyLogo: !(activeCard.visibleFields.companyLogo !== false),
                            },
                          })
                        }
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 cursor-pointer select-none"
                      >
                        <span className="text-[11px] font-semibold text-slate-300">
                          Display Logo on Card
                        </span>
                        <button
                          type="button"
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            activeCard.visibleFields.companyLogo !== false
                              ? 'bg-cyan-600'
                              : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                              activeCard.visibleFields.companyLogo !== false
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Active Brand Logo Preview + Upload + Direct URL */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-2.5 shrink-0">
                        {activeCard.companyLogoUrl ||
                        profile.workData?.companyLogoUrl ||
                        profile.companyLogoUrl ? (
                          <div className="h-16 w-24 rounded-xl bg-black/75 border border-slate-800 p-2 flex items-center justify-center shadow-inner">
                            <img
                              src={
                                activeCard.companyLogoUrl ||
                                profile.workData?.companyLogoUrl ||
                                profile.companyLogoUrl
                              }
                              alt="Brand Logo"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-24 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-500">
                            <Briefcase className="h-4 w-4 mb-1 text-slate-600" />
                            <span>No Logo</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 w-full space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={brandLogoFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleUploadBrandLogoFile}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => brandLogoFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold transition"
                          >
                            <Camera className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Upload Logo File</span>
                          </button>

                          {(activeCard.companyLogoUrl ||
                            profile.workData?.companyLogoUrl ||
                            profile.companyLogoUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateCard({ ...activeCard, companyLogoUrl: undefined });
                                onUpdateProfile({
                                  ...profile,
                                  companyLogoUrl: undefined,
                                  workData: {
                                    role: profile.workData?.role ?? profile.role ?? '',
                                    company: profile.workData?.company ?? profile.company ?? '',
                                    email: profile.workData?.email ?? profile.email ?? '',
                                    phone: profile.workData?.phone ?? profile.phone ?? '',
                                    website: profile.workData?.website ?? profile.website ?? '',
                                    ...(profile.workData || {}),
                                    companyLogoUrl: undefined,
                                  },
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-medium transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Remove Logo</span>
                            </button>
                          )}
                        </div>

                        <input
                          type="url"
                          value={
                            activeCard.companyLogoUrl ||
                            profile.workData?.companyLogoUrl ||
                            profile.companyLogoUrl ||
                            ''
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateCard({ ...activeCard, companyLogoUrl: val });
                            onUpdateProfile({
                              ...profile,
                              companyLogoUrl: val,
                              workData: {
                                role: profile.workData?.role ?? profile.role ?? '',
                                company: profile.workData?.company ?? profile.company ?? '',
                                email: profile.workData?.email ?? profile.email ?? '',
                                phone: profile.workData?.phone ?? profile.phone ?? '',
                                website: profile.workData?.website ?? profile.website ?? '',
                                ...(profile.workData || {}),
                                companyLogoUrl: val,
                              },
                            });
                          }}
                          placeholder="Or paste direct Brand Logo image URL (https://... PNG / SVG / WebP)"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* AI Brand Logo & Emblem Generator */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                          <span>AI Brand Logo & Monogram Generator</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Uses Company Name ({profile.workData?.company || profile.company || activeCard.name})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {(
                          [
                            { id: 'minimal_monogram', label: 'Minimal Monogram' },
                            { id: 'luxury_crest', label: 'Luxury Crest' },
                            { id: 'tech_geometric', label: 'Tech Geometric' },
                            { id: 'creative_emblem', label: 'Creative Emblem' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setBrandLogoStyle(st.id)}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition ${
                              brandLogoStyle === st.id
                                ? 'border-indigo-400 bg-indigo-950/60 text-white'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={brandLogoPrompt}
                          onChange={(e) => setBrandLogoPrompt(e.target.value)}
                          placeholder="Optional symbol or motif (e.g. golden phoenix, neural node, minimalist shield)..."
                          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateBrandLogoWithAi}
                          disabled={isGeneratingBrandLogo}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 shrink-0"
                        >
                          <Wand2 className={`h-3.5 w-3.5 ${isGeneratingBrandLogo ? 'animate-spin' : ''}`} />
                          <span>
                            {isGeneratingBrandLogo ? 'Generating Logo...' : 'Generate AI Logo'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* INTEGRATED CARD INFORMATION, CONTEXTUAL TAGLINE & PUBLIC LINK */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Card Identity, Tagline & Public Handle</span>
                        </span>
                        <span className="text-[10px] font-mono text-indigo-300">
                          Card #{cards.findIndex((c) => c.id === activeCard.id) + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Card Name (Switcher Label)
                          </label>
                          <input
                            type="text"
                            value={activeCard.name || ''}
                            onChange={(e) => onUpdateCard({ ...activeCard, name: e.target.value })}
                            placeholder="e.g. Executive Work, VIP Social"
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Public Vanity Link
                          </label>
                          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 pl-2.5 pr-1 py-1 text-xs">
                            <span className="font-mono text-slate-500 select-none">/p/</span>
                            <input
                              type="text"
                              value={activeCard.vanitySlug || ''}
                              onChange={(e) =>
                                onUpdateCard({ ...activeCard, vanitySlug: e.target.value })
                              }
                              placeholder="your-handle"
                              className="min-w-0 flex-1 bg-transparent text-slate-200 font-mono focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleCopyLink}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                copiedLink
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {copiedLink ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          Contextual Tagline / Subtitle on Card
                        </label>
                        <input
                          type="text"
                          value={activeCard.customTagline || ''}
                          onChange={(e) =>
                            onUpdateCard({ ...activeCard, customTagline: e.target.value })
                          }
                          placeholder="e.g. Connecting at Web Summit 2026 · Advisory & Angel Investing"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Video Business Card Pitch */}
                    <div className="lg:col-span-5 p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Video className="h-3.5 w-3.5 text-purple-400" />
                            <span>Video Intro Pitch</span>
                          </span>
                          <span className="text-[10px] font-mono text-purple-400">30s Clip</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          Add an optional video greeting or pitch clip accessible directly from your digital card.
                        </p>
                        <div className="space-y-2">
                          <input
                            type="url"
                            value={activeCard.videoIntroUrl || ''}
                            onChange={(e) =>
                              onUpdateCard({ ...activeCard, videoIntroUrl: e.target.value })
                            }
                            placeholder="Video URL (YouTube / MP4)"
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={activeCard.videoTitle || ''}
                            onChange={(e) =>
                              onUpdateCard({ ...activeCard, videoTitle: e.target.value })
                            }
                            placeholder="Callout title (e.g. Executive Intro)"
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* ACCORDION 8: SELECTIVE SHARING & FIELD VISIBILITY                 */}
          {/* ================================================================= */}
          {(() => {
            const formatAddr = (addr?: {
              street?: string;
              city?: string;
              state?: string;
              zip?: string;
              country?: string;
            }) => {
              if (!addr) return '';
              return [addr.street, addr.city, addr.state, addr.zip, addr.country]
                .map((s) => (s || '').trim())
                .filter(Boolean)
                .join(', ');
            };

            const formatEmergency = (
              ec?: {
                name?: string;
                relationship?: string;
                phone?: string;
              },
              ecList?: Array<{
                name?: string;
                relationship?: string;
                phone?: string;
              }>
            ) => {
              const items =
                ecList && ecList.length > 0
                  ? ecList.filter((item) => Boolean(item.name || item.phone))
                  : ec && (ec.name || ec.phone)
                  ? [ec]
                  : [];
              if (items.length === 0) return '';
              return items
                .map((item) =>
                  [item.name, item.relationship, item.phone]
                    .map((s) => (s || '').trim())
                    .filter(Boolean)
                    .join(' · ')
                )
                .join(' | ');
            };

            const activeLogoVal = (
              activeCard.companyLogoUrl ||
              profile.workData?.companyLogoUrl ||
              profile.companyLogoUrl ||
              ''
            ).trim();

            // 1. Work & Corporate Data — automatically filter out unfilled Master Identity fields
            const availableWorkFields: Array<{
              key: keyof CardVisibleFields;
              label: string;
              desc: string;
            }> = (
              [
                {
                  key: 'role' as keyof CardVisibleFields,
                  label: 'Executive Role / Job Title',
                  desc: (profile.workData?.role || profile.role || '').trim(),
                },
                {
                  key: 'company' as keyof CardVisibleFields,
                  label: 'Company / Organization',
                  desc: (profile.workData?.company || profile.company || '').trim(),
                },
                {
                  key: 'companyLogo' as keyof CardVisibleFields,
                  label: 'Company Logo Badge',
                  desc: activeLogoVal
                    ? activeLogoVal.startsWith('data:')
                      ? 'Custom Uploaded / AI Brand Emblem'
                      : activeLogoVal
                    : '',
                },
                {
                  key: 'headline' as keyof CardVisibleFields,
                  label: 'Executive Headline',
                  desc: (profile.headline || '').trim(),
                },
                {
                  key: 'department' as keyof CardVisibleFields,
                  label: 'Department / Division',
                  desc: (profile.workData?.department || '').trim(),
                },
                {
                  key: 'email' as keyof CardVisibleFields,
                  label: 'Corporate Direct Email',
                  desc: (profile.workData?.email || profile.email || '').trim(),
                },
                {
                  key: 'phone' as keyof CardVisibleFields,
                  label: 'Work Direct Phone / Desk',
                  desc: (profile.workData?.phone || profile.phone || '').trim(),
                },
                {
                  key: 'officeAddress' as keyof CardVisibleFields,
                  label: 'Office Address / HQ',
                  desc: formatAddr(profile.workData?.officeAddress),
                },
                {
                  key: 'taxIdOrVat' as keyof CardVisibleFields,
                  label: 'Tax ID / Corporate VAT',
                  desc: (profile.workData?.taxIdOrVat || '').trim(),
                },
              ]
            ).filter((f) => Boolean(f.desc));

            const workFieldKeys = availableWorkFields.map((f) => f.key);
            const isAllWorkSelected =
              workFieldKeys.length > 0 &&
              workFieldKeys.every((k) => activeCard.visibleFields[k] !== false && Boolean(activeCard.visibleFields[k] ?? (k === 'companyLogo')));
            const activeWorkCount = workFieldKeys.filter(
              (k) => k === 'companyLogo' ? activeCard.visibleFields.companyLogo !== false : !!activeCard.visibleFields[k]
            ).length;

            // 2. Personal Data Coordinates — automatically filter out unfilled Master Identity fields
            const availablePersonalFields: Array<{
              key: keyof CardVisibleFields;
              label: string;
              desc: string;
            }> = (
              [
                {
                  key: 'personalBio' as keyof CardVisibleFields,
                  label: 'Personal Bio & About Note',
                  desc: (profile.personalData?.bio || '').trim(),
                },
                {
                  key: 'personalPhone' as keyof CardVisibleFields,
                  label: 'Personal Mobile Phone',
                  desc: (profile.personalData?.phone || '').trim(),
                },
                {
                  key: 'personalEmail' as keyof CardVisibleFields,
                  label: 'Personal Email (iCloud/Gmail)',
                  desc: (profile.personalData?.email || '').trim(),
                },
                {
                  key: 'nickname' as keyof CardVisibleFields,
                  label: 'Nickname / Preferred Name',
                  desc: (profile.personalData?.nickname || '').trim(),
                },
                {
                  key: 'pronouns' as keyof CardVisibleFields,
                  label: 'Preferred Pronouns',
                  desc: (profile.personalData?.pronouns || '').trim(),
                },
                {
                  key: 'gender' as keyof CardVisibleFields,
                  label: 'Gender Identity',
                  desc: (profile.personalData?.gender || '').trim(),
                },
                {
                  key: 'homeAddress' as keyof CardVisibleFields,
                  label: 'Home Residential Address',
                  desc: formatAddr(profile.personalData?.address),
                },
                {
                  key: 'birthday' as keyof CardVisibleFields,
                  label: 'Birthday Date (BDAY)',
                  desc: (profile.personalData?.birthday || '').trim(),
                },
                {
                  key: 'emergencyContact' as keyof CardVisibleFields,
                  label: `Emergency ICE Contacts (${
                    (profile.personalData?.emergencyContacts?.filter((c) => c.name || c.phone).length ||
                      (profile.personalData?.emergencyContact?.name ? 1 : 0))
                  })`,
                  desc: formatEmergency(
                    profile.personalData?.emergencyContact,
                    profile.personalData?.emergencyContacts
                  ),
                },
              ]
            ).filter((f) => Boolean(f.desc));

            const personalFieldKeys = availablePersonalFields.map((f) => f.key);
            const isAllPersonalSelected =
              personalFieldKeys.length > 0 &&
              personalFieldKeys.every((k) => !!activeCard.visibleFields[k]);
            const activePersonalCount = personalFieldKeys.filter(
              (k) => !!activeCard.visibleFields[k]
            ).length;

            // 3. Social Media Channels — automatically filter out unfilled social accounts (supports multiple profiles on same platform)
            const filledSocialEntries = getFilledSocialAccounts(profile);
            const isAllSocialsSelected =
              filledSocialEntries.length > 0 &&
              activeCard.visibleFields.socials !== false &&
              filledSocialEntries.every((entry) => isSocialAccountVisible(activeCard, entry));
            const activeSocialsCount =
              activeCard.visibleFields.socials === false
                ? 0
                : filledSocialEntries.filter((entry) => isSocialAccountVisible(activeCard, entry))
                    .length;

            // 4. General Web, Bio & Story Deck Slide 03 Showcase — automatically filter out unfilled fields
            const passionsList = (profile.passions || []).filter((p) =>
              Boolean(p.title?.trim() || p.detail?.trim())
            );
            const educationList = (profile.education || []).filter((e) =>
              Boolean(
                e.institution?.trim() ||
                  e.degree?.trim() ||
                  e.year?.trim() ||
                  e.honors?.trim()
              )
            );
            const portfolioList = (profile.portfolio || []).filter((item) => {
              const isUntouchedDefault =
                item.title === 'New Portfolio Work' &&
                item.mediumOrRole === 'Mixed Media / Performance' &&
                item.imageUrl === profile.avatarUrl;
              if (isUntouchedDefault) return false;
              return Boolean(
                item.title?.trim() ||
                  item.mediumOrRole?.trim() ||
                  (item as any).roleOrMedium?.trim() ||
                  item.imageUrl?.trim() ||
                  item.description?.trim()
              );
            });

            const availableGeneralFields: Array<{
              key: keyof CardVisibleFields;
              label: string;
              desc: string;
            }> = (
              [
                {
                  key: 'website' as keyof CardVisibleFields,
                  label: 'Official Website / Portfolio',
                  desc: (profile.website || profile.workData?.website || '').trim(),
                },
                {
                  key: 'location' as keyof CardVisibleFields,
                  label: 'City Location',
                  desc: (profile.location || '').trim(),
                },
                {
                  key: 'bio' as keyof CardVisibleFields,
                  label: 'Work Executive Bio Summary',
                  desc: (profile.workData?.bio || profile.bio || '').trim(),
                },
                {
                  key: 'passions' as keyof CardVisibleFields,
                  label: `Hobbies, Sports & Passions (${passionsList.length})`,
                  desc: passionsList
                    .map((p) => p.title?.trim() || p.detail?.trim())
                    .filter(Boolean)
                    .join(' · '),
                },
                {
                  key: 'education' as keyof CardVisibleFields,
                  label: `Education & Academic Credentials (${educationList.length})`,
                  desc: educationList
                    .map((e) =>
                      [e.degree?.trim(), e.institution?.trim()].filter(Boolean).join(' — ') ||
                      e.honors?.trim() ||
                      e.year?.trim()
                    )
                    .filter(Boolean)
                    .join(' · '),
                },
                {
                  key: 'portfolioSection' as keyof CardVisibleFields,
                  label: `Artist & Creative Portfolio (${portfolioList.length})`,
                  desc: portfolioList
                    .map(
                      (item) =>
                        item.title?.trim() ||
                        item.mediumOrRole?.trim() ||
                        (item as any).roleOrMedium?.trim() ||
                        'Artwork'
                    )
                    .filter(Boolean)
                    .join(' · '),
                },
              ]
            ).filter((f) => Boolean(f.desc));

            const generalFieldKeys = availableGeneralFields.map((f) => f.key);
            const isAllGeneralSelected =
              generalFieldKeys.length > 0 &&
              generalFieldKeys.every((k) =>
                k === 'passions' || k === 'education' || k === 'portfolioSection'
                  ? activeCard.visibleFields[k] !== false
                  : !!activeCard.visibleFields[k]
              );
            const activeGeneralCount = generalFieldKeys.filter((k) =>
              k === 'passions' || k === 'education' || k === 'portfolioSection'
                ? activeCard.visibleFields[k] !== false
                : !!activeCard.visibleFields[k]
            ).length;

            return (
              <div className={`${openAccordions.sharing ? 'block' : 'hidden lg:block'} rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition`}>
                <button
                  type="button"
                  onClick={() => toggleAccordion('sharing')}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Eye className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          Selective Sharing & Field Visibility
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        Control exactly which filled work, personal, and social fields are visible on "{activeCard.name}"
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      openAccordions.sharing ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                {openAccordions.sharing && (
                  <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-5 animate-in fade-in duration-150">
                    {/* Group 1: Work & Corporate Data */}
                {availableWorkFields.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                        <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Work & Corporate Data</span>
                        <span className="text-[10px] font-mono text-indigo-400/80 font-normal">
                          ({activeWorkCount}/{workFieldKeys.length})
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          const nextState = !isAllWorkSelected;
                          const updatedFields = { ...activeCard.visibleFields };
                          workFieldKeys.forEach((k) => {
                            (updatedFields as any)[k] = nextState;
                          });
                          onUpdateCard({
                            ...activeCard,
                            visibleFields: updatedFields,
                          });
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                      >
                        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition">
                          {isAllWorkSelected ? 'Unselect All' : 'Select All'}
                        </span>
                        <button
                          type="button"
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAllWorkSelected ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isAllWorkSelected ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableWorkFields.map((field) => {
                        const isVisible =
                          field.key === 'companyLogo'
                            ? activeCard.visibleFields.companyLogo !== false
                            : !!activeCard.visibleFields[field.key];
                        return (
                          <div
                            key={field.key}
                            onClick={() =>
                              onUpdateCard({
                                ...activeCard,
                                visibleFields: {
                                  ...activeCard.visibleFields,
                                  [field.key]: !isVisible,
                                },
                              })
                            }
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                              isVisible
                                ? 'border-indigo-500/50 bg-indigo-950/30 text-white'
                                : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="text-xs font-semibold leading-tight">{field.label}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{field.desc}</div>
                            </div>
                            <button
                              type="button"
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isVisible ? 'bg-indigo-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isVisible ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group 2: Personal Data Coordinates */}
                {availablePersonalFields.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-900/40 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                        <User className="h-3.5 w-3.5 text-rose-400" />
                        <span>Personal Data Coordinates</span>
                        <span className="text-[10px] font-mono text-rose-400/80 font-normal">
                          ({activePersonalCount}/{personalFieldKeys.length})
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          const nextState = !isAllPersonalSelected;
                          const updatedFields = { ...activeCard.visibleFields };
                          personalFieldKeys.forEach((k) => {
                            (updatedFields as any)[k] = nextState;
                          });
                          onUpdateCard({
                            ...activeCard,
                            visibleFields: updatedFields,
                          });
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                      >
                        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition">
                          {isAllPersonalSelected ? 'Unselect All' : 'Select All'}
                        </span>
                        <button
                          type="button"
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAllPersonalSelected ? 'bg-rose-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isAllPersonalSelected ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availablePersonalFields.map((field) => {
                        const isVisible = !!activeCard.visibleFields[field.key];
                        return (
                          <div
                            key={field.key}
                            onClick={() =>
                              onUpdateCard({
                                ...activeCard,
                                visibleFields: {
                                  ...activeCard.visibleFields,
                                  [field.key]: !isVisible,
                                },
                              })
                            }
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                              isVisible
                                ? 'border-rose-500/50 bg-rose-950/30 text-white'
                                : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="text-xs font-semibold leading-tight">{field.label}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{field.desc}</div>
                            </div>
                            <button
                              type="button"
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isVisible ? 'bg-rose-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isVisible ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group 3: Major Social Media Channels to Share */}
                {filledSocialEntries.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-cyan-900/40 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <Globe className="h-4 w-4 text-cyan-400" />
                        <span>
                          Major Social Media Symbols ({activeSocialsCount}/{filledSocialEntries.length} Displayed on Card)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        {/* Preset quick filters */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextSocialAccounts: Record<string, boolean> = {
                              ...(activeCard.visibleFields.socialAccounts || {}),
                            };
                            const newFields = { ...activeCard.visibleFields, socials: true };
                            const proList: Array<keyof typeof profile.socials> = ['linkedin', 'twitter', 'github', 'calendly', 'substack', 'medium', 'behance', 'dribbble'];
                            filledSocialEntries.forEach((entry) => {
                              const match = proList.includes(entry.platformId);
                              nextSocialAccounts[entry.id] = match;
                              newFields[entry.platformId] = match;
                            });
                            newFields.socialAccounts = nextSocialAccounts;
                            onUpdateCard({ ...activeCard, visibleFields: newFields });
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800 hover:bg-indigo-900/60 transition"
                        >
                          💼 Business
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSocialAccounts: Record<string, boolean> = {
                              ...(activeCard.visibleFields.socialAccounts || {}),
                            };
                            const newFields = { ...activeCard.visibleFields, socials: true };
                            const persList: Array<keyof typeof profile.socials> = ['whatsapp', 'telegram', 'signal', 'instagram', 'facebook', 'snapchat', 'wechat'];
                            filledSocialEntries.forEach((entry) => {
                              const match = persList.includes(entry.platformId);
                              nextSocialAccounts[entry.id] = match;
                              newFields[entry.platformId] = match;
                            });
                            newFields.socialAccounts = nextSocialAccounts;
                            onUpdateCard({ ...activeCard, visibleFields: newFields });
                          }}
                          className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900/60 transition"
                        >
                          🏠 Personal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextSocialAccounts: Record<string, boolean> = {
                              ...(activeCard.visibleFields.socialAccounts || {}),
                            };
                            const newFields = { ...activeCard.visibleFields, socials: true };
                            const creatorList: Array<keyof typeof profile.socials> = ['youtube', 'tiktok', 'threads', 'discord', 'reddit', 'twitch', 'spotify', 'pinterest'];
                            filledSocialEntries.forEach((entry) => {
                              const match = creatorList.includes(entry.platformId);
                              nextSocialAccounts[entry.id] = match;
                              newFields[entry.platformId] = match;
                            });
                            newFields.socialAccounts = nextSocialAccounts;
                            onUpdateCard({ ...activeCard, visibleFields: newFields });
                          }}
                          className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900/60 transition"
                        >
                          🎮 Creator
                        </button>

                        <span className="text-slate-700">|</span>

                        {/* Select / Unselect All Toggle */}
                        <div
                          onClick={() => {
                            const nextState = !isAllSocialsSelected;
                            const nextSocialAccounts: Record<string, boolean> = {
                              ...(activeCard.visibleFields.socialAccounts || {}),
                            };
                            const newFields = {
                              ...activeCard.visibleFields,
                              socials: nextState,
                            };
                            filledSocialEntries.forEach((entry) => {
                              nextSocialAccounts[entry.id] = nextState;
                              newFields[entry.platformId] = nextState;
                            });
                            newFields.socialAccounts = nextSocialAccounts;
                            onUpdateCard({ ...activeCard, visibleFields: newFields });
                          }}
                          className="flex items-center gap-2 cursor-pointer select-none group"
                        >
                          <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition">
                            {isAllSocialsSelected ? 'Unselect All' : 'Select All'}
                          </span>
                          <button
                            type="button"
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isAllSocialsSelected ? 'bg-cyan-600' : 'bg-slate-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isAllSocialsSelected ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Each enabled social channel (including multiple profiles on the same network) appears on "{activeCard.name}" as a touchable icon symbol that opens the page directly when tapped.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filledSocialEntries.map((entry) => {
                        const platform = getPlatformConfig(entry.platformId);
                        const val = entry.value.trim();
                        const isEnabledToggle = isSocialAccountVisible(activeCard, entry);

                        return (
                          <div
                            key={entry.id}
                            onClick={() => {
                              const nextVal = !isEnabledToggle;
                              const nextSocialAccounts: Record<string, boolean> = {
                                ...(activeCard.visibleFields.socialAccounts || {}),
                                [entry.id]: nextVal,
                              };
                              onUpdateCard({
                                ...activeCard,
                                visibleFields: {
                                  ...activeCard.visibleFields,
                                  socials: true,
                                  [entry.platformId]: nextVal,
                                  socialAccounts: nextSocialAccounts,
                                },
                              });
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                              isEnabledToggle
                                ? 'border-cyan-500/50 bg-cyan-950/20 text-white shadow-sm'
                                : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div
                                className="p-1.5 rounded-md flex items-center justify-center shrink-0 border"
                                style={{
                                  backgroundColor: `${platform.color}15`,
                                  borderColor: `${platform.color}35`,
                                  color: platform.color,
                                }}
                              >
                                {platform.renderIcon({ className: 'h-4 w-4', style: { color: platform.color } })}
                              </div>
                              <div className="min-w-0 truncate">
                                <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                                  <span className="truncate">{platform.name}</span>
                                  {entry.label?.trim() && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0">
                                      {entry.label.trim()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                  {val}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabledToggle ? 'bg-cyan-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isEnabledToggle ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group 4: General Coordinates */}
                {availableGeneralFields.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <Globe className="h-3.5 w-3.5 text-cyan-400" />
                        <span>General Web & Summary Details</span>
                        <span className="text-[10px] font-mono text-cyan-400/80 font-normal">
                          ({activeGeneralCount}/{generalFieldKeys.length})
                        </span>
                      </div>
                      <div
                        onClick={() => {
                          const nextState = !isAllGeneralSelected;
                          const updatedFields = { ...activeCard.visibleFields };
                          generalFieldKeys.forEach((k) => {
                            (updatedFields as any)[k] = nextState;
                          });
                          onUpdateCard({
                            ...activeCard,
                            visibleFields: updatedFields,
                          });
                        }}
                        className="flex items-center gap-2 cursor-pointer select-none group"
                      >
                        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white transition">
                          {isAllGeneralSelected ? 'Unselect All' : 'Select All'}
                        </span>
                        <button
                          type="button"
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAllGeneralSelected ? 'bg-cyan-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isAllGeneralSelected ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {availableGeneralFields.map((field) => {
                        const isVisible =
                          field.key === 'passions' ||
                          field.key === 'education' ||
                          field.key === 'portfolioSection'
                            ? activeCard.visibleFields[field.key] !== false
                            : !!activeCard.visibleFields[field.key];
                        return (
                          <div
                            key={field.key}
                            onClick={() =>
                              onUpdateCard({
                                ...activeCard,
                                visibleFields: {
                                  ...activeCard.visibleFields,
                                  [field.key]: !isVisible,
                                },
                              })
                            }
                            className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                              isVisible
                                ? 'border-cyan-500/50 bg-cyan-950/30 text-white'
                                : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="text-xs font-semibold leading-tight">{field.label}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{field.desc}</div>
                            </div>
                            <button
                              type="button"
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isVisible ? 'bg-cyan-600' : 'bg-slate-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isVisible ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </div>

      {/* AI Bio Generator Modal */}
      <AIBioModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        profile={profile}
        subscription={subscription}
        onConsumeAiCoin={onConsumeAiCoin}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
        onUpdateBio={(newBio, newHeadline) => {
          onUpdateProfile({
            ...profile,
            bio: newBio,
            headline: newHeadline || profile.headline,
            workData: {
              role: profile.workData?.role ?? profile.role ?? '',
              company: profile.workData?.company ?? profile.company ?? '',
              email: profile.workData?.email ?? profile.email ?? '',
              phone: profile.workData?.phone ?? profile.phone ?? '',
              website: profile.workData?.website ?? profile.website ?? '',
              ...(profile.workData || {}),
              bio: newBio,
            },
          });
        }}
      />

      {/* Profile Picture Gallery & AI Avatar Modal */}
      <AvatarManagerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
        initialTab={avatarModalTab}
        subscription={subscription}
        onConsumeAiCoin={onConsumeAiCoin}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
      />

      {/* Create New Persona / Circle Modal */}
      <CreatePersonaModal
        isOpen={isCreatePersonaModalOpen}
        onClose={() => setIsCreatePersonaModalOpen(false)}
        currentProfile={profile}
        onCreatePersona={(newPersona, matchingCard) => {
          if (onCreatePersona) {
            onCreatePersona(newPersona, matchingCard);
          }
        }}
      />

      {/* Create New Digital Card Profile Modal */}
      <CreateCardModal
        isOpen={isCreateCardModalOpen}
        onClose={() => setIsCreateCardModalOpen(false)}
        currentProfile={profile}
        onCreateCard={(newCard) => {
          if (onCreateCard) {
            onCreateCard(newCard);
          }
        }}
      />

      {/* Automatic KYC Registration Modal */}
      <KYCRegistrationModal
        isOpen={isKYCModalOpen}
        onClose={() => setIsKYCModalOpen(false)}
        profile={profile}
        onUpdateProfile={onUpdateProfile}
      />

      {/* Interactive Email Signature Generator */}
      <EmailSignatureModal
        isOpen={isEmailSignatureModalOpen}
        onClose={() => setIsEmailSignatureModalOpen(false)}
        profile={profile}
        card={activeCard}
      />

      {/* AI Cover Banner Studio Modal */}
      <AIBannerModal
        isOpen={isAiBannerModalOpen}
        onClose={() => setIsAiBannerModalOpen(false)}
        card={activeCard}
        subscription={subscription}
        onConsumeAiCoin={onConsumeAiCoin}
        onOpenSubscriptionModal={onOpenSubscriptionModal}
        onApplyBanner={(bannerUrl, bannerName) => {
          onUpdateCard({ ...activeCard, coverBannerUrl: bannerUrl });
          handleSaveBannerToImageHub({
            url: bannerUrl,
            name: bannerName || `AI Banner - ${activeCard.name}`,
            style: 'ai_synthesized',
          });
        }}
        onSaveToImageHub={handleSaveBannerToImageHub}
      />

      {/* Double-Click Enlarged Image Inspector Modal */}
      {enlargedPreviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setEnlargedPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Maximize2 className="h-4 w-4 text-cyan-400 shrink-0" />
                <h4 className="text-sm font-bold text-white truncate">
                  {enlargedPreviewImage.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEnlargedPreviewImage(null)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                <span>Close</span>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-center rounded-xl overflow-hidden bg-black/90 max-h-[75vh]">
              <img
                src={enlargedPreviewImage.url}
                alt={enlargedPreviewImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
