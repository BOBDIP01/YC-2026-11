import React, { useState, useRef, useEffect } from 'react';
import { MasterProfile, StoredPicture, SubscriptionState, AiUsageType } from '../types';
import { enhancePhotoWithAI } from '../utils/aiPhotoEnhancer';
import { getQuotaSummary } from '../utils/subscription';
import { apiFetch } from '../utils/apiConfig';
import {
  Sparkles,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Wand2,
  Trash2,
  RefreshCw,
  Plus,
  Camera,
  Layers,
  Video,
  SwitchCamera,
  Sliders,
  AlertCircle,
  ShieldCheck,
  Zap,
  ArrowRight,
  Info,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Download,
  FolderPlus,
  Columns,
  Coins,
  RotateCcw,
} from 'lucide-react';

interface AvatarManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  onUpdateProfile: (updated: MasterProfile) => void;
  initialTab?: 'vault' | 'library' | 'camera' | 'ai';
  subscription?: SubscriptionState;
  onConsumeAiCoin?: (usageType: AiUsageType, actionLabel: string) => boolean;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

export const AvatarManagerModal: React.FC<AvatarManagerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  initialTab = 'vault',
  subscription,
  onConsumeAiCoin,
  onOpenSubscriptionModal,
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'library' | 'camera' | 'ai'>(initialTab);
  
  // AI Modification & Generation States
  const [aiMode, setAiMode] = useState<'modify' | 'generate'>('modify');
  const [selectedSourceImage, setSelectedSourceImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'executive' | 'casual' | 'country_club' | 'athletic' | 'cyber' | 'editorial' | null>('executive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<{ url: string; name: string; isModified?: boolean; engine?: string; originalUrl?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Lightbox / Enlarge & Verify Modal States
  const [isEnlargedOpen, setIsEnlargedOpen] = useState(false);
  const [enlargedZoom, setEnlargedZoom] = useState<'fit' | '100%' | '150%'>('fit');
  const [comparisonMode, setComparisonMode] = useState<'enhanced' | 'side-by-side' | 'toggle'>('enhanced');
  const [toggleBeforeAfter, setToggleBeforeAfter] = useState<'before' | 'after'>('after');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Camera Capture States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  const quotaSummary = subscription ? getQuotaSummary(subscription) : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [vaultAssetFilter, setVaultAssetFilter] = useState<'all' | 'avatars' | 'banners'>('all');
  const [deletedHubAssets, setDeletedHubAssets] = useState<Array<{ item: StoredPicture; wasActiveAvatar: boolean }>>([]);
  const [modalAnchorAvatarUrl, setModalAnchorAvatarUrl] = useState<string>(
    () => profile.avatarUrl?.trim() || ''
  );

  useEffect(() => {
    if (!isOpen) {
      setModalAnchorAvatarUrl(profile.avatarUrl?.trim() || '');
    }
  }, [isOpen, profile.avatarUrl]);

  const storedPictures = profile.storedPictures || [];

  // Deduplicate and aggregate all Image Hub assets (Avatars & Cover Banners)
  // Order is anchored to modalAnchorAvatarUrl so clicking images while the vault is open never reorders them
  const rawHubAssets = [
    ...storedPictures,
    ...(profile.storedBanners || []).map((b) => ({
      ...b,
      context: 'banner' as const,
      category: 'banner' as const,
      aspectRatio: '16:9' as const,
    })),
  ].filter((p, idx, arr) => arr.findIndex((x) => x.url === p.url) === idx);

  const allHubAssets = (() => {
    const anchorUrl = isOpen ? modalAnchorAvatarUrl : profile.avatarUrl?.trim() || '';
    if (!anchorUrl) return rawHubAssets;
    const anchorItem = rawHubAssets.find((p) => p.url.trim() === anchorUrl);
    if (!anchorItem) return rawHubAssets;
    return [anchorItem, ...rawHubAssets.filter((p) => p.url.trim() !== anchorUrl)];
  })();

  const displayedAssets = allHubAssets.filter((pic) => {
    const isBanner = pic.context === 'banner' || pic.category === 'banner' || pic.aspectRatio === '16:9';
    if (vaultAssetFilter === 'banners') return isBanner;
    if (vaultAssetFilter === 'avatars') return !isBanner;
    return true;
  });

  // Deduplicate source photos so that the active profile photo and stored vault pictures
  // never appear twice, and order remains fixed while the modal is open.
  const uniqueSourcePhotos = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ id: string; url: string; name: string; isActive: boolean }> = [];
    const anchorUrl = isOpen ? modalAnchorAvatarUrl : profile.avatarUrl?.trim() || '';

    // 1. Primary entry: anchored profile photo at the time the vault opened
    if (anchorUrl) {
      seen.add(anchorUrl);
      const matchingStored = storedPictures.find((p) => p.url?.trim() === anchorUrl);
      list.push({
        id: matchingStored?.id || 'active-profile-photo',
        url: anchorUrl,
        name: matchingStored?.name || 'Active Profile Photo',
        isActive: anchorUrl === profile.avatarUrl?.trim(),
      });
    }

    // 2. Vault photos without duplicate URLs
    for (const pic of storedPictures) {
      const normalized = pic.url?.trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        list.push({
          id: pic.id,
          url: pic.url,
          name: pic.name || 'Stored Photo',
          isActive: normalized === profile.avatarUrl?.trim(),
        });
      }
    }

    return list;
  }, [isOpen, modalAnchorAvatarUrl, profile.avatarUrl, storedPictures]);

  // Style presets for AI Avatar Generation & Modification
  const avatarStyles = [
    {
      id: 'executive',
      shortLabel: 'EXECUTIVE',
      label: 'Executive Studio',
      desc: 'Navy tailored blazer, soft rim lighting, premium boardroom depth',
      badge: 'Corporate',
      color: '#6366F1',
    },
    {
      id: 'casual',
      shortLabel: 'CASUAL',
      label: 'Casual Lifestyle',
      desc: 'Warm knitwear, golden hour natural daylight, engaging smile',
      badge: 'Personal',
      color: '#F43F5E',
    },
    {
      id: 'country_club',
      shortLabel: 'COUNTRY CLUB',
      label: 'Country Club',
      desc: 'Smart-casual club polo or blazer, sunlit clubhouse terrace & manicured grounds',
      badge: 'Club & Leisure',
      color: '#10B981',
    },
    {
      id: 'athletic',
      shortLabel: 'ATHLETIC',
      label: 'Athletic Game-Day',
      desc: 'Performance athletic sportswear, dynamic arena lighting, focused athletic posture',
      badge: 'Sport & Fitness',
      color: '#06B6D4',
    },
    {
      id: 'cyber',
      shortLabel: 'TECH & CYBER',
      label: 'Modern Tech & Cyber',
      desc: 'High-contrast studio, subtle neon rim accent, minimal slate',
      badge: 'Tech & Advisory',
      color: '#A855F7',
    },
    {
      id: 'editorial',
      shortLabel: 'EDITORIAL',
      label: 'Monochrome Editorial',
      desc: 'High-fashion black & white portrait with dramatic key lighting',
      badge: 'Keynote & Media',
      color: '#E2E8F0',
    },
  ];

  const activeStyleObj = avatarStyles.find((s) => s.id === selectedStyle) || null;
  const activeStyleDisplayLabel = activeStyleObj ? activeStyleObj.shortLabel : 'CUSTOM';

  // Stop camera when closing or changing tab
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedSourceImage(profile.avatarUrl || null);
      setCapturedPhoto(null);
      setGeneratedPreview(null);
      setSavedSuccessMessage(null);
      setErrorMsg(null);
    } else {
      stopCameraStream();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (profile.avatarUrl) {
      setSelectedSourceImage(profile.avatarUrl);
    }
  }, [profile.avatarUrl]);

  useEffect(() => {
    if (activeTab === 'camera' && isOpen) {
      startCamera();
    } else {
      stopCameraStream();
    }
  }, [activeTab, cameraFacing, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEnlargedOpen) {
        setIsEnlargedOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnlargedOpen]);

  // Camera Management
  const startCamera = async () => {
    stopCameraStream();
    setCameraPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraPermissionError('Camera access unavailable or declined. You can upload a photo from your library instead.');
      setIsCameraActive(false);
    }
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw square cropped video
    const video = videoRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 640, 640);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // 1. Select a stored picture as current avatar
  const handleSelectPicture = (pic: StoredPicture) => {
    onUpdateProfile({
      ...profile,
      previousAvatarUrl: undefined,
      avatarUrl: pic.url,
    });
    onClose();
  };

  // 2. Upload picture from library / disk into Vault
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const newPic: StoredPicture = {
        id: `pic-upload-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        context: 'custom',
        originalSource: 'library',
        createdAt: new Date().toISOString(),
      };

      const updatedVault = [newPic, ...storedPictures.filter((p) => p.url !== dataUrl)];
      onUpdateProfile({
        ...profile,
        previousAvatarUrl: undefined,
        avatarUrl: dataUrl,
        storedPictures: updatedVault,
      });
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // 3. Send picture to AI Modification Studio
  const handleOpenAiModifier = (imageUrl: string) => {
    setSelectedSourceImage(imageUrl);
    setAiMode('modify');
    setActiveTab('ai');
    setGeneratedPreview(null);
  };

  // 4. Save Captured Camera Photo into Vault (Deduplicated by URL)
  const handleSaveCameraPhoto = (mode: 'avatar' | 'vault-only' | 'modify' = 'avatar') => {
    if (!capturedPhoto) return;

    const existingMatch = storedPictures.find((p) => p.url === capturedPhoto);
    const newPic: StoredPicture = existingMatch || {
      id: `pic-cam-${Date.now()}`,
      name: `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      url: capturedPhoto,
      context: 'custom',
      originalSource: 'camera',
      createdAt: new Date().toISOString(),
    };

    const updatedVault = [newPic, ...storedPictures.filter((p) => p.url !== capturedPhoto)];

    if (mode === 'avatar') {
      onUpdateProfile({
        ...profile,
        previousAvatarUrl: undefined,
        avatarUrl: capturedPhoto,
        storedPictures: updatedVault,
      });
      onClose();
    } else if (mode === 'vault-only') {
      onUpdateProfile({
        ...profile,
        storedPictures: updatedVault,
      });
      setSavedSuccessMessage('Camera photo saved to your Vault! It is stored in your library without replacing your current avatar.');
      setActiveTab('vault');
    } else if (mode === 'modify') {
      onUpdateProfile({
        ...profile,
        storedPictures: updatedVault,
      });
      handleOpenAiModifier(capturedPhoto);
    }
  };

  // 5. Delete picture or banner from vault / Image Hub (with Undo support)
  const handleDeletePicture = (e: React.MouseEvent, picId: string, picUrl?: string) => {
    e.stopPropagation();
    const targetItem = allHubAssets.find((p) => p.id === picId || (picUrl && p.url === picUrl));
    const wasActiveAvatar = Boolean(targetItem && profile.avatarUrl === targetItem.url);
    if (targetItem) {
      setDeletedHubAssets((prev) => [{ item: targetItem, wasActiveAvatar }, ...prev]);
    }
    const updatedVault = storedPictures.filter((p) => p.id !== picId && (!picUrl || p.url !== picUrl));
    const updatedBanners = (profile.storedBanners || []).filter((b) => b.id !== picId && (!picUrl || b.url !== picUrl));
    const fallbackAvatar = updatedVault.find((p) => p.context !== 'banner' && p.aspectRatio !== '16:9')?.url || '';
    onUpdateProfile({
      ...profile,
      avatarUrl: wasActiveAvatar ? fallbackAvatar : profile.avatarUrl,
      storedPictures: updatedVault,
      storedBanners: updatedBanners,
    });
  };

  const handleUndoDeletePicture = () => {
    if (deletedHubAssets.length === 0) return;
    const [lastDeleted, ...remaining] = deletedHubAssets;
    setDeletedHubAssets(remaining);

    const isBanner =
      lastDeleted.item.context === 'banner' ||
      lastDeleted.item.category === 'banner' ||
      lastDeleted.item.aspectRatio === '16:9';

    const existingVault = profile.storedPictures || [];
    const restoredVault = existingVault.some((p) => p.url === lastDeleted.item.url)
      ? existingVault
      : [lastDeleted.item, ...existingVault];

    const existingBanners = profile.storedBanners || [];
    const restoredBanners =
      isBanner && !existingBanners.some((b) => b.url === lastDeleted.item.url)
        ? [lastDeleted.item, ...existingBanners]
        : existingBanners;

    onUpdateProfile({
      ...profile,
      avatarUrl: lastDeleted.wasActiveAvatar || !profile.avatarUrl ? lastDeleted.item.url : profile.avatarUrl,
      storedPictures: restoredVault,
      storedBanners: restoredBanners,
    });
  };

  // 6. Generate or Modify with AI (Strict Facial Likeness Preservation)
  const handleRunAiStudio = async () => {
    setErrorMsg(null);
    setAiNotice(null);

    if (!selectedStyle && !customPrompt.trim()) {
      setErrorMsg('Please select a Target AI Headshot Style or enter your custom instructions in the description box below.');
      return;
    }

    // Identity anchor: either user's selected source image, active avatar, or first unique photo
    const sourceImg = selectedSourceImage || profile.avatarUrl || uniqueSourcePhotos[0]?.url;
    if (!sourceImg) {
      setErrorMsg('Please select a reference photo so AI preserves your facial likeness.');
      return;
    }

    // Check & consume 1 AI Quota Coin before running AI Headshot Studio
    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin(
        'image_headshot',
        `AI Headshot Studio (${activeStyleDisplayLabel})`
      );
      if (!allowed) {
        return;
      }
    }

    setIsGenerating(true);

    const effectiveStyleParam = selectedStyle || 'custom';

    try {
      let serverData: any = null;
      let quotaInfo: string | null = null;

      try {
        const res = await apiFetch('/api/ai/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: customPrompt,
            style: effectiveStyleParam,
            name: profile.name,
            inputImage: sourceImg,
            mode: aiMode,
          }),
        });

        if (res.ok) {
          serverData = await res.json();
          if (serverData.quotaNotice) {
            quotaInfo = serverData.quotaNotice;
          }
        }
      } catch (serverErr) {
        console.warn('Server AI image endpoint warning:', serverErr);
      }

      // If Gemini returned a generated image with facial consistency
      if (
        serverData?.imageUrl &&
        serverData.imageUrl.startsWith('data:') &&
        !serverData.shouldClientEnhance &&
        !serverData.isFallback &&
        serverData.imageUrl !== sourceImg
      ) {
        setGeneratedPreview({
          url: serverData.imageUrl,
          name: serverData.name || `${activeStyleDisplayLabel} Gemini Portrait (${profile.name})`,
          isModified: true,
          engine: 'Gemini 3.1 Flash Image',
          originalUrl: sourceImg,
        });
        setAiNotice(
          selectedStyle
            ? `Synthesized ${activeStyleDisplayLabel} portrait with Gemini 3.1 Flash Image model and strict facial likeness anchoring (1 AI Quota Coin consumed).`
            : 'Synthesized custom portrait exclusively from your instructions with Gemini 3.1 Flash Image model (1 AI Quota Coin consumed).'
        );
        return;
      }

      // If server returned shouldClientEnhance or if model generation falls back:
      // Apply high-fidelity photographic AI studio lighting, tone curves, and styled vignettes
      // DIRECTLY to the user's authentic face so their recognizable identity is 100% preserved!
      const enhancedDataUrl = await enhancePhotoWithAI({
        imageUrl: sourceImg,
        style: effectiveStyleParam,
        prompt: customPrompt,
      });

      setGeneratedPreview({
        url: enhancedDataUrl,
        name: `${activeStyleDisplayLabel} Studio AI Headshot (${profile.name})`,
        isModified: true,
        engine: 'AI Studio Photographic Synthesizer',
        originalUrl: sourceImg,
      });

      const noticeMessage = quotaInfo
        ? `${quotaInfo} Authentic facial likeness 100% preserved (1 AI Quota Coin consumed).`
        : `Applied ${activeStyleDisplayLabel} studio key lighting, depth vignette, and tone curve enhancement to ${profile.name}'s portrait (1 AI Quota Coin consumed).`;
      setAiNotice(noticeMessage);
    } catch (err: any) {
      console.error('AI studio execution error:', err);
      try {
        const fallbackEnhanced = await enhancePhotoWithAI({
          imageUrl: sourceImg,
          style: effectiveStyleParam,
          prompt: customPrompt,
        });
        setGeneratedPreview({
          url: fallbackEnhanced,
          name: `${activeStyleDisplayLabel} Studio AI Headshot (${profile.name})`,
          isModified: true,
          engine: 'AI Studio Photographic Synthesizer',
          originalUrl: sourceImg,
        });
        setAiNotice(`Applied ${activeStyleDisplayLabel} studio lighting and color grading to your photo (1 AI Quota Coin consumed).`);
      } catch {
        setErrorMsg('Could not process this image. Please select another photo from your vault or device.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Save to Vault Only (preserve image in vault without applying as active avatar)
  const handleSaveToVaultOnly = () => {
    if (!generatedPreview) return;
    const newPic: StoredPicture = {
      id: `pic-ai-${Date.now()}`,
      name: generatedPreview.name,
      url: generatedPreview.url,
      context: (selectedStyle || 'custom') as any,
      isAiGenerated: true,
      isAiModified: generatedPreview.isModified,
      aiStyle: selectedStyle || 'custom',
      createdAt: new Date().toISOString(),
    };

    const updatedVault = [
      newPic,
      ...storedPictures.filter((p) => p.url !== generatedPreview.url),
    ];
    onUpdateProfile({
      ...profile,
      storedPictures: updatedVault,
      // Note: avatarUrl remains untouched!
    });

    setIsEnlargedOpen(false);
    setSavedSuccessMessage(`"${generatedPreview.name}" saved to your Vault! It is available in your picture library without changing your active avatar.`);
  };

  // 8. Apply AI Headshot to profile and save in Vault
  const handleApplyGenerated = () => {
    if (!generatedPreview) return;
    const newPic: StoredPicture = {
      id: `pic-ai-${Date.now()}`,
      name: generatedPreview.name,
      url: generatedPreview.url,
      context: (selectedStyle || 'custom') as any,
      isAiGenerated: true,
      isAiModified: generatedPreview.isModified,
      aiStyle: selectedStyle || 'custom',
      createdAt: new Date().toISOString(),
    };

    const updatedVault = [
      newPic,
      ...storedPictures.filter((p) => p.url !== generatedPreview.url),
    ];
    onUpdateProfile({
      ...profile,
      previousAvatarUrl: generatedPreview.originalUrl || profile.avatarUrl,
      avatarUrl: generatedPreview.url,
      storedPictures: updatedVault,
    });
    setIsEnlargedOpen(false);
    onClose();
  };

  // 9. Download image directly to device
  const handleDownloadImage = (url: string, filename = 'ai-headshot.jpg') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Profile Picture & AI Headshot Studio
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  Vault · Camera · AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select from vault, pick from phone library, snap a live photo, and enhance with AI headshot styles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subscription Criteria & AI Quota Coin Counter Banner */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              Active Tier:{' '}
              <strong className="text-white uppercase">
                {quotaSummary ? quotaSummary.spec.name : 'Business'}
              </strong>
            </span>
            <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/50 font-mono">
              1 Coin per AI Image Generation
            </span>
          </div>

          <div className="flex items-center gap-3">
            {quotaSummary && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  Daily Quota: <strong className="text-white font-mono">{quotaSummary.dailyRemaining}/{quotaSummary.dailyIncludedMax}</strong>
                </span>
                <span className="text-[11px] text-cyan-300 font-mono">
                  Booster: <strong>+{quotaSummary.boosterRemaining}</strong>
                </span>
                <span className="text-[11px] text-amber-300 font-mono font-bold">
                  Available: {quotaSummary.totalAvailableCoins} Coins
                </span>
              </div>
            )}
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={() => onOpenSubscriptionModal()}
                className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 text-[10px] font-bold text-amber-300 transition"
              >
                +50 Booster / Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'vault'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Image Hub ({allHubAssets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Phone / Device Library</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'camera'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="h-4 w-4 text-cyan-400" />
            <span>Take Photo (Live Camera)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>AI Headshot Studio</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-bold">
              AI Gen
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="rounded-lg bg-rose-950/40 border border-rose-800/60 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccessMessage && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-200 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{savedSuccessMessage}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('vault');
                    setSavedSuccessMessage(null);
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-[11px] font-semibold text-white border border-emerald-700/50"
                >
                  View in Vault
                </button>
                <button
                  type="button"
                  onClick={() => setSavedSuccessMessage(null)}
                  className="p-1 text-emerald-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Image Hub & Vault */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Central Image Hub & Picture Vault</h3>
                  <p className="text-xs text-slate-400">
                    Store and organize all verified headshots and AI-generated widescreen cover banners in one place.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {deletedHubAssets.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUndoDeletePicture}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition shadow-sm"
                      title="Restore the last deleted avatar or background"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Undo Delete ({deletedHubAssets.length})</span>
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Image</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Image Hub Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setVaultAssetFilter('all')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    vaultAssetFilter === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  All Assets ({allHubAssets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVaultAssetFilter('avatars')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    vaultAssetFilter === 'avatars'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  Headshots ({allHubAssets.filter((p) => p.context !== 'banner' && p.aspectRatio !== '16:9').length})
                </button>
                <button
                  type="button"
                  onClick={() => setVaultAssetFilter('banners')}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    vaultAssetFilter === 'banners'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  Cover Banners ({allHubAssets.filter((p) => p.context === 'banner' || p.aspectRatio === '16:9').length})
                </button>
              </div>

              {/* Grid of stored pictures and banners */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayedAssets.map((pic) => {
                  const isCurrent = profile.avatarUrl === pic.url;
                  const isBanner = pic.context === 'banner' || pic.category === 'banner' || pic.aspectRatio === '16:9';
                  return (
                    <div
                      key={pic.id}
                      className={`group relative rounded-xl border p-2 transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-lg'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div
                        className={`relative w-full rounded-lg overflow-hidden bg-slate-900 ${
                          isBanner ? 'aspect-[16/9]' : 'aspect-square'
                        }`}
                      >
                        <img
                          src={pic.url}
                          alt={pic.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {isCurrent && (
                          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                        <button
                          onClick={(e) => handleDeletePicture(e, pic.id, pic.url)}
                          className="absolute bottom-1.5 right-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-md bg-slate-950/85 text-rose-400 hover:text-rose-300 transition shadow"
                          title="Delete from Image Hub"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="mt-2 text-left space-y-1">
                        <div className="text-xs font-medium text-slate-200 truncate">{pic.name}</div>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.2 rounded border ${
                              isBanner
                                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {isBanner ? '16:9 Banner' : pic.context}
                          </span>
                          {pic.isAiGenerated && (
                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">
                              AI
                            </span>
                          )}
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                          {isBanner ? (
                            <div className="text-[10px] text-cyan-400 font-mono py-1 w-full text-center">
                              Cover Banner Asset
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelectPicture(pic)}
                                className="flex-1 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-[10px] font-semibold text-slate-200 hover:text-white transition"
                              >
                                Set Avatar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAiModifier(pic.url)}
                                className="p-1 rounded bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white transition"
                                title="Enhance with AI Headshot Studio"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-cyan-400 hover:text-white" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Device Library / File Upload */}
          {activeTab === 'library' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Select from Phone / Device Library</h3>
                <p className="text-xs text-slate-400">
                  Pick any photo from your local files, phone camera roll, or drag and drop.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/60 hover:bg-indigo-950/20 transition group"
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Tap to browse photo library</span>
                    <span className="text-xs text-slate-400">Supports PNG, JPG, WebP up to 10MB</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/40">
                    Choose from Files
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-center gap-3">
                <Info className="h-5 w-5 text-indigo-400 shrink-0" />
                <p className="text-xs text-slate-300">
                  Uploaded photos are automatically preserved in your <strong>Vault</strong>. You can immediately modify them with the AI Headshot generator to create professional studio attire or custom background lighting.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Take Photo with Live Camera */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Take a Live Photo</h3>
                  <p className="text-xs text-slate-400">
                    Capture a fresh portrait with your front or rear device camera.
                  </p>
                </div>
                {isCameraActive && (
                  <button
                    onClick={() => setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                  >
                    <SwitchCamera className="h-3.5 w-3.5" />
                    <span>Flip Camera</span>
                  </button>
                )}
              </div>

              {cameraPermissionError ? (
                <div className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-6 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-300 max-w-md mx-auto">{cameraPermissionError}</p>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                  >
                    Browse Device Library Instead
                  </button>
                </div>
              ) : capturedPhoto ? (
                /* Freeze Snapshot Preview */
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative aspect-square w-72 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-xl bg-black">
                    <img src={capturedPhoto} alt="Snapshot" className="h-full w-full object-cover" />
                    <span className="absolute top-2 left-2 text-[10px] font-mono bg-black/60 px-2 py-0.5 rounded text-white">
                      Captured Snapshot
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={handleRetakePhoto}
                      className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                    >
                      Retake Photo
                    </button>
                    <button
                      onClick={() => handleSaveCameraPhoto('vault-only')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-700/60 bg-indigo-950/60 text-xs font-semibold text-indigo-300 hover:bg-indigo-900 transition"
                      title="Save snapshot to vault without setting as avatar"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>Save to Vault Only</span>
                    </button>
                    <button
                      onClick={() => handleSaveCameraPhoto('avatar')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 transition shadow"
                      title="Save to vault and apply as profile avatar"
                    >
                      Use as Active Avatar
                    </button>
                    <button
                      onClick={() => handleSaveCameraPhoto('modify')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 text-xs font-bold text-white hover:opacity-95 transition shadow"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Modify with AI Studio</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Live Video Stream */
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative aspect-square w-80 max-w-full rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    {/* Portrait viewfinder guide */}
                    <div className="pointer-events-none absolute inset-6 border border-white/20 rounded-full" />
                  </div>

                  <button
                    onClick={handleSnapPhoto}
                    className="flex items-center gap-2 rounded-full bg-white text-slate-950 px-6 py-3 font-bold text-xs shadow-xl hover:bg-slate-200 active:scale-95 transition"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Snap Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI Headshot Studio (Modify Photo OR Generate) */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Mode Toggle: Modify Photo vs. Generate From Scratch */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAiMode('modify')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    aiMode === 'modify'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Modify Existing Photo with AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode('generate')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    aiMode === 'generate'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Generate from Scratch with AI</span>
                </button>
              </div>

              {/* Source Photo / Identity Likeness Anchor */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    {aiMode === 'modify' ? (
                      <>
                        <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Source Photo to Enhance & Restyle</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Facial Identity Anchor (Preserves Your Likeness)</span>
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {aiMode === 'modify' ? 'Pick from vault or camera' : '100% Face Preserved'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {aiMode === 'modify'
                    ? 'Select your reference photo. AI will apply studio lighting, color grading, and style attires while keeping your face identical.'
                    : `AI synthesizes a new ${activeStyleDisplayLabel} portrait while strictly anchoring on ${profile.name}'s facial bone structure and recognizable likeness.`}
                </p>

                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {uniqueSourcePhotos.map((photo) => {
                    const isSelected = selectedSourceImage
                      ? selectedSourceImage === photo.url
                      : (photo.isActive || (!selectedSourceImage && photo.url === profile.avatarUrl));

                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedSourceImage(photo.url)}
                        className={`relative h-14 w-14 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                          isSelected
                            ? 'border-cyan-400 ring-2 ring-cyan-500/30'
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                        title={photo.name}
                      >
                        <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                        {photo.isActive && (
                          <span className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-[8px] font-mono text-center text-white font-semibold tracking-wider py-0.5">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setActiveTab('camera')}
                    className="h-14 w-14 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-400 hover:text-white shrink-0 transition"
                    title="Snap with camera"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="text-[8px] font-mono mt-0.5">Camera</span>
                  </button>
                </div>
              </div>

              {/* Target Headshot Styles */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white">Target AI Headshot Style</h4>
                    <span className="text-[10px] text-slate-400">
                      Click any preset style to select/deselect, or use only your custom description below
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStyle(selectedStyle === null ? 'executive' : null)}
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                      selectedStyle === null
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300'
                    }`}
                  >
                    <Sliders className="h-3 w-3" />
                    <span>{selectedStyle === null ? 'Using Custom Instructions Only ✓' : 'Use Custom Instructions Only'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {avatarStyles.map((st) => {
                    const isSelected = selectedStyle === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStyle(null);
                            setCustomPrompt('');
                          } else {
                            setSelectedStyle(st.id as any);
                            setCustomPrompt(st.desc);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border p-3 transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500 shadow-md'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{st.label}</span>
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded border text-white"
                            style={{ backgroundColor: `${st.color}25`, borderColor: st.color }}
                          >
                            {st.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{st.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Nuances & Instructions */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    {selectedStyle === null
                      ? 'Creative Direction & Specific Instructions (Generating from your instructions only)'
                      : 'Creative Direction & Specific Instructions'}
                  </label>
                  {selectedStyle !== null && customPrompt.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStyle(null)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Generate from my instructions only (clear preset)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={
                    selectedStyle === null
                      ? 'Describe the exact attire, background, lighting, and mood for your new headshot...'
                      : 'e.g. sharp charcoal tailored suit, soft diffused studio light, confident executive expression...'
                  }
                  className={`w-full rounded-lg border bg-slate-950 px-3.5 py-2 text-xs text-slate-200 focus:outline-none transition ${
                    selectedStyle === null
                      ? 'border-cyan-500/70 focus:border-cyan-400 ring-1 ring-cyan-500/20'
                      : 'border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Trigger Generation Button */}
              <button
                onClick={handleRunAiStudio}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>
                      {aiMode === 'modify' ? 'Enhancing photo with AI Headshot model...' : 'Synthesizing portrait with Gemini...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>
                      {selectedStyle === null
                        ? aiMode === 'modify'
                          ? 'Transform Photo with Custom Instructions'
                          : 'Generate New Avatar from Custom Instructions'
                        : aiMode === 'modify'
                        ? `Transform Photo into ${activeStyleDisplayLabel} Headshot`
                        : `Generate New ${activeStyleDisplayLabel} Avatar`}
                    </span>
                  </>
                )}
              </button>

              {/* AI Notice or Quota Advice */}
              {aiNotice && (
                <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/40 p-3.5 flex items-start gap-3 text-xs text-cyan-200">
                  <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-white">AI Studio Engine Notice</div>
                    <div className="text-[11px] text-cyan-300/90 leading-relaxed">{aiNotice}</div>
                  </div>
                </div>
              )}

              {/* Generated Result Preview with Side-by-Side Comparison */}
              {generatedPreview && (
                <div className="rounded-2xl border border-indigo-500/50 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-5 space-y-4 animate-in fade-in duration-200 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {generatedPreview.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {generatedPreview.engine && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {generatedPreview.engine}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Ready</span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Comparison: Original vs. AI Enhanced */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                    {generatedPreview.originalUrl && (
                      <div className="flex flex-col items-center space-y-1.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Original Photo
                        </span>
                        <div className="h-28 w-28 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow">
                          <img
                            src={generatedPreview.originalUrl}
                            alt="Original"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {generatedPreview.originalUrl && (
                      <div className="flex items-center justify-center text-cyan-400">
                        <ArrowRight className="h-5 w-5 hidden sm:block" />
                        <span className="text-xs font-mono font-bold sm:hidden">↓ Enhanced</span>
                      </div>
                    )}

                    {/* AI Enhanced / Generated Picture (Click to Enlarge & Verify) */}
                    <div className="flex flex-col items-center space-y-1.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold flex items-center gap-1">
                        <span>{generatedPreview.isModified ? 'AI Studio Enhanced' : 'Synthesized Headshot'}</span>
                      </span>

                      {/* Clickable Image Box */}
                      <div
                        onClick={() => setIsEnlargedOpen(true)}
                        className="group relative h-28 w-28 rounded-xl overflow-hidden border-2 border-cyan-400 ring-4 ring-cyan-500/20 shadow-2xl cursor-pointer transition-all duration-200 hover:scale-105 hover:ring-cyan-300 hover:shadow-cyan-500/30"
                        title="Click to enlarge and verify before saving"
                      >
                        <img
                          src={generatedPreview.url}
                          alt="AI Result"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-end p-2 text-center">
                          <Maximize2 className="h-4 w-4 text-cyan-300 mb-0.5" />
                          <span className="text-[9px] font-bold text-white leading-tight">Click to Enlarge</span>
                        </div>
                        {/* Corner Zoom Badge */}
                        <div className="absolute top-1 right-1 rounded-md bg-black/60 backdrop-blur-xs p-1 text-cyan-300 border border-white/10 group-hover:bg-cyan-500 group-hover:text-black transition">
                          <Maximize2 className="h-3 w-3" />
                        </div>
                      </div>

                      {/* Enlarge & Verify Button */}
                      <button
                        type="button"
                        onClick={() => setIsEnlargedOpen(true)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition pt-0.5"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                        <span>Enlarge & Verify</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEnlargedOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-800/60 bg-cyan-950/40 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 transition"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Inspect Full Size</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(generatedPreview.url, `${selectedStyle || 'custom'}-ai-headshot.png`)}
                        className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Download image file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Save to Vault Only (without applying as avatar) */}
                      <button
                        type="button"
                        onClick={handleSaveToVaultOnly}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white transition shadow-sm"
                        title="Preserve picture in Vault without changing your current avatar"
                      >
                        <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Save to Vault Only</span>
                      </button>

                      {/* Apply as Profile Avatar */}
                      <button
                        type="button"
                        onClick={handleApplyGenerated}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition shrink-0"
                        title="Save to vault and apply as active profile avatar"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save & Apply as Avatar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          HIGH-RESOLUTION ENLARGE & VERIFY LIGHTBOX MODAL
         ========================================================================= */}
      {isEnlargedOpen && generatedPreview && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-3.5 bg-slate-900/90 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ZoomIn className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {generatedPreview.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                    Verification Lightbox
                  </span>
                  {generatedPreview.engine && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 hidden sm:inline">
                      {generatedPreview.engine}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Inspect studio lighting, facial details, and composition at high resolution before saving.
                </p>
              </div>
            </div>

            {/* Header Right: Zoom Controls & Close */}
            <div className="flex items-center gap-2">
              {/* Comparison Mode if Original photo exists */}
              {generatedPreview.originalUrl && (
                <div className="hidden md:flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setComparisonMode('enhanced')}
                    className={`px-2.5 py-1 rounded-md transition font-medium ${
                      comparisonMode === 'enhanced'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Enhanced Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonMode('side-by-side')}
                    className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${
                      comparisonMode === 'side-by-side'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns className="h-3 w-3" />
                    <span>Side-by-Side</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComparisonMode('toggle')}
                    className={`px-2.5 py-1 rounded-md transition font-medium ${
                      comparisonMode === 'toggle'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Before / After
                  </button>
                </div>
              )}

              {/* Zoom Scale Buttons */}
              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEnlargedZoom('fit')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    enlargedZoom === 'fit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Fit to view screen"
                >
                  Fit View
                </button>
                <button
                  type="button"
                  onClick={() => setEnlargedZoom('100%')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    enlargedZoom === '100%' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Actual pixel resolution (100%)"
                >
                  100% 1:1
                </button>
                <button
                  type="button"
                  onClick={() => setEnlargedZoom('150%')}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    enlargedZoom === '150%' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Fine zoom 150%"
                >
                  150%
                </button>
              </div>

              {/* Download */}
              <button
                type="button"
                onClick={() => handleDownloadImage(generatedPreview.url, `${selectedStyle || 'custom'}-headshot.png`)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                title="Download image"
              >
                <Download className="h-4 w-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsEnlargedOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition ml-1"
                title="Close lightbox (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Body / Viewport */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/60 via-slate-950 to-black select-none">
            {/* View Mode 1: Side by side */}
            {comparisonMode === 'side-by-side' && generatedPreview.originalUrl ? (
              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 max-w-6xl w-full">
                {/* Original Photo */}
                <div className="flex flex-col items-center space-y-2 max-w-md w-full">
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                      Original Input Photo
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Source</span>
                  </div>
                  <div className="aspect-square w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                    <img
                      src={generatedPreview.originalUrl}
                      alt="Original"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <div className="text-cyan-400 font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 shrink-0">
                  <ArrowRight className="h-5 w-5 hidden lg:block" />
                  <span className="lg:hidden">↓ Enhanced</span>
                </div>

                {/* AI Enhanced Photo */}
                <div className="flex flex-col items-center space-y-2 max-w-md w-full">
                  <div className="flex items-center justify-between w-full px-1">
                    <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>AI Enhanced Studio Headshot</span>
                    </span>
                    <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50">
                      {activeStyleDisplayLabel}
                    </span>
                  </div>
                  <div className="aspect-square w-full rounded-2xl overflow-hidden border-2 border-cyan-400 ring-4 ring-cyan-500/20 shadow-2xl">
                    <img
                      src={generatedPreview.url}
                      alt="AI Enhanced"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : comparisonMode === 'toggle' && generatedPreview.originalUrl ? (
              /* View Mode 2: Toggle / Hold before & after */
              <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
                  <button
                    type="button"
                    onClick={() => setToggleBeforeAfter('before')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      toggleBeforeAfter === 'before'
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setToggleBeforeAfter('after')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      toggleBeforeAfter === 'after'
                        ? 'bg-cyan-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    AI Enhanced Headshot
                  </button>
                </div>

                <div
                  className={`rounded-2xl overflow-hidden border-2 shadow-2xl transition-all duration-300 ${
                    toggleBeforeAfter === 'after'
                      ? 'border-cyan-400 ring-4 ring-cyan-500/20'
                      : 'border-slate-700'
                  } ${
                    enlargedZoom === 'fit'
                      ? 'max-h-[62vh] max-w-[85vw]'
                      : enlargedZoom === '100%'
                      ? 'h-[512px] w-[512px]'
                      : 'h-[720px] w-[720px]'
                  }`}
                >
                  <img
                    src={toggleBeforeAfter === 'after' ? generatedPreview.url : generatedPreview.originalUrl}
                    alt={toggleBeforeAfter === 'after' ? 'AI Headshot' : 'Original'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Currently viewing:{' '}
                  <strong className={toggleBeforeAfter === 'after' ? 'text-cyan-400' : 'text-slate-200'}>
                    {toggleBeforeAfter === 'after' ? 'AI Enhanced Studio Result' : 'Original Raw Photo'}
                  </strong>
                </p>
              </div>
            ) : (
              /* View Mode 3: Focused High-Resolution Enhanced Result */
              <div className="flex flex-col items-center space-y-3">
                <div
                  className={`rounded-2xl overflow-hidden border-2 border-cyan-400 ring-4 ring-cyan-500/20 shadow-2xl bg-black/40 transition-all duration-300 ${
                    enlargedZoom === 'fit'
                      ? 'max-h-[62vh] max-w-[85vw] aspect-square'
                      : enlargedZoom === '100%'
                      ? 'h-[512px] w-[512px]'
                      : 'h-[720px] w-[720px]'
                  }`}
                >
                  <img
                    src={generatedPreview.url}
                    alt={generatedPreview.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">{generatedPreview.name}</span>
                  <span>·</span>
                  <span className="font-mono text-cyan-300">1:1 Square Resolution</span>
                  <span>·</span>
                  <span className="capitalize">{activeStyleDisplayLabel.toLowerCase()} Studio Style</span>
                </div>
              </div>
            )}
          </div>

          {/* Lightbox Footer Bar: Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 px-6 py-4 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Verified picture details. Choose to save to your Vault library only, or immediately apply as your active profile avatar.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsEnlargedOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Back to Studio
              </button>

              {/* SAVE TO VAULT ONLY BUTTON */}
              <button
                type="button"
                onClick={handleSaveToVaultOnly}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-700/70 bg-indigo-950/70 hover:bg-indigo-900 text-xs font-semibold text-indigo-200 hover:text-white transition shadow-sm"
                title="Preserve in vault without setting as avatar"
              >
                <FolderPlus className="h-4 w-4 text-indigo-400" />
                <span>Save to Vault Only</span>
              </button>

              {/* SAVE & APPLY AS AVATAR BUTTON */}
              <button
                type="button"
                onClick={handleApplyGenerated}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition shrink-0"
                title="Save into vault and update your current avatar"
              >
                <Check className="h-4 w-4" />
                <span>Save & Apply as Avatar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
