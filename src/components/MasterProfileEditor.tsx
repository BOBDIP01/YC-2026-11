import React, { useState, useRef } from 'react';
import {
  MasterProfile,
  PersonalData,
  WorkData,
  EmergencyContactItem,
  PassionItem,
  EducationItem,
  PortfolioItem,
  AiUsageType,
  DigitalCard,
  SocialLinks,
  SocialAccountEntry,
} from '../types';
import {
  MAJOR_SOCIAL_PLATFORMS,
  getFullSocialUrl,
  getPlatformConfig,
  getProfileSocialValue,
  getEffectiveSocialAccounts,
  getFilledSocialAccounts,
  syncSocialAccountsToLegacyLinks,
} from '../data/socialRegistry';
import {
  CheckCircle2,
  User,
  Briefcase,
  Globe,
  Sparkles,
  Camera,
  Wand2,
  Layers,
  Plus,
  Trash2,
  Heart,
  ExternalLink,
  Upload,
  Award,
  Palette,
  GraduationCap,
  Trophy,
  Building2,
  RefreshCw,
  Coins,
} from 'lucide-react';

interface MasterProfileEditorProps {
  profile: MasterProfile;
  onUpdateProfile: (updated: MasterProfile) => void;
  onOpenKYCModal: () => void;
  onOpenBioModal: () => void;
  onOpenAvatarModal: (tab: 'vault' | 'ai') => void;
  onOpenImageHub?: (subTab: 'avatar' | 'background') => void;
  activeCard?: DigitalCard;
  onUpdateCard?: (updated: DigitalCard) => void;
  onConsumeAiCoin?: (usageType: AiUsageType, actionLabel: string) => boolean;
  sectionMode?: 'all' | 'personal' | 'work' | 'beyond' | 'socials';
}

export const MasterProfileEditor: React.FC<MasterProfileEditorProps> = ({
  profile,
  onUpdateProfile,
  onOpenBioModal,
  onOpenAvatarModal,
  onOpenImageHub,
  activeCard,
  onUpdateCard,
  onConsumeAiCoin,
  sectionMode = 'all',
}) => {
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'work' | 'beyond' | 'socials'>('personal');
  const effectiveSubTab = sectionMode !== 'all' ? sectionMode : profileSubTab;

  // Company Logo Upload & AI Generator State
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isAiLogoPanelOpen, setIsAiLogoPanelOpen] = useState(false);
  const [aiLogoStyle, setAiLogoStyle] = useState<'minimal_monogram' | 'luxury_crest' | 'tech_geometric' | 'creative_emblem'>('minimal_monogram');
  const [aiLogoPrompt, setAiLogoPrompt] = useState('');
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);

  // Portfolio Image Upload Ref
  const portfolioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingPortfolioItemId, setUploadingPortfolioItemId] = useState<string | null>(null);

  // Binary & LGBTQ+ Inclusive Gender Options
  const GENDER_OPTIONS = [
    'Female',
    'Male',
    'Non-binary',
    'Genderqueer / Genderfluid',
    'Agender',
    'Two-Spirit',
    'Transgender Woman',
    'Transgender Man',
    'Cisgender Woman',
    'Cisgender Man',
    'Prefer not to say',
    'Self-describe',
  ];

  const PRONOUN_OPTIONS = [
    'she/her',
    'he/him',
    'they/them',
    'she/they',
    'he/they',
    'ze/zir',
    'any pronouns',
    'Prefer not to say',
    'Custom',
  ];

  const currentGender = profile.gender ?? '';
  const isCustomGender = Boolean(currentGender) && !GENDER_OPTIONS.slice(0, 11).includes(currentGender);

  const currentPronouns = profile.pronouns ?? '';
  const isCustomPronouns = Boolean(currentPronouns) && !PRONOUN_OPTIONS.slice(0, 8).includes(currentPronouns);

  // Extract initial / current first & last names
  const rawFullName = profile.personalData?.fullName || profile.name || '';
  const nameParts = rawFullName.trim().split(/\s+/);
  const defaultFirst = nameParts[0] || '';
  const defaultLast = nameParts.slice(1).join(' ') || '';

  const currentFirstName =
    profile.personalData?.firstName !== undefined
      ? profile.personalData.firstName
      : profile.firstName !== undefined
      ? profile.firstName
      : defaultFirst;

  const currentLastName =
    profile.personalData?.lastName !== undefined
      ? profile.personalData.lastName
      : profile.lastName !== undefined
      ? profile.lastName
      : defaultLast;

  const handleUpdateFirstName = (newFirst: string) => {
    const combined = [newFirst.trim(), currentLastName.trim()].filter(Boolean).join(' ');
    const cur = profile.personalData || {
      fullName: combined,
      phone: profile.phone,
      email: profile.email,
    };
    onUpdateProfile({
      ...profile,
      name: combined || newFirst,
      firstName: newFirst,
      lastName: currentLastName,
      personalData: {
        ...cur,
        firstName: newFirst,
        lastName: currentLastName,
        fullName: combined || newFirst,
      },
    });
  };

  const handleUpdateLastName = (newLast: string) => {
    const combined = [currentFirstName.trim(), newLast.trim()].filter(Boolean).join(' ');
    const cur = profile.personalData || {
      fullName: combined,
      phone: profile.phone,
      email: profile.email,
    };
    onUpdateProfile({
      ...profile,
      name: combined || newLast,
      firstName: currentFirstName,
      lastName: newLast,
      personalData: {
        ...cur,
        firstName: currentFirstName,
        lastName: newLast,
        fullName: combined || newLast,
      },
    });
  };

  // Master Profile Personal Data updater (Decoupled from Work Bio)
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
      firstName: updated.firstName !== undefined ? updated.firstName : profile.firstName,
      lastName: updated.lastName !== undefined ? updated.lastName : profile.lastName,
      nickname: updated.nickname !== undefined ? updated.nickname : profile.nickname,
      personalData: updated,
    });
  };

  // Master Profile Work Data updater
  const handleUpdateWork = (patch: Partial<WorkData>) => {
    const cur = profile.workData || {
      role: profile.role || '',
      company: profile.company || '',
      email: profile.email || '',
      phone: profile.phone || '',
      website: profile.website || '',
    };
    const updated = { ...cur, ...patch };
    onUpdateProfile({
      ...profile,
      role: updated.role !== undefined ? updated.role : (profile.role || ''),
      company: updated.company !== undefined ? updated.company : (profile.company || ''),
      email: updated.email !== undefined ? updated.email : (profile.email || ''),
      phone: updated.phone !== undefined ? updated.phone : (profile.phone || ''),
      website: updated.website !== undefined ? updated.website : (profile.website || ''),
      bio: updated.bio !== undefined ? updated.bio : profile.bio,
      companyLogoUrl:
        updated.companyLogoUrl !== undefined ? updated.companyLogoUrl : profile.companyLogoUrl,
      workData: updated,
    });
  };

  // Emergency Contacts list management (syncs index 0 with legacy emergencyContact)
  const emergencyContactsList: EmergencyContactItem[] = React.useMemo(() => {
    if (profile.personalData?.emergencyContacts && profile.personalData.emergencyContacts.length > 0) {
      return profile.personalData.emergencyContacts;
    }
    if (
      profile.personalData?.emergencyContact &&
      (profile.personalData.emergencyContact.name ||
        profile.personalData.emergencyContact.relationship ||
        profile.personalData.emergencyContact.phone)
    ) {
      return [
        {
          id: 'ec-primary',
          name: profile.personalData.emergencyContact.name || '',
          relationship: profile.personalData.emergencyContact.relationship || '',
          phone: profile.personalData.emergencyContact.phone || '',
        },
      ];
    }
    return [
      {
        id: 'ec-primary',
        name: '',
        relationship: '',
        phone: '',
      },
    ];
  }, [profile.personalData?.emergencyContacts, profile.personalData?.emergencyContact]);

  const handleSaveEmergencyContacts = (nextList: EmergencyContactItem[]) => {
    const primary = nextList[0] || { name: '', relationship: '', phone: '' };
    handleUpdatePersonal({
      emergencyContacts: nextList,
      emergencyContact: {
        name: primary.name,
        relationship: primary.relationship,
        phone: primary.phone,
      },
    });
  };

  const handleAddEmergencyContact = () => {
    const nextList: EmergencyContactItem[] = [
      ...emergencyContactsList,
      {
        id: `ec-${Date.now()}`,
        name: '',
        relationship: '',
        phone: '',
      },
    ];
    handleSaveEmergencyContacts(nextList);
  };

  const handleUpdateEmergencyContactItem = (
    id: string,
    field: 'name' | 'relationship' | 'phone',
    value: string
  ) => {
    const nextList = emergencyContactsList.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    handleSaveEmergencyContacts(nextList);
  };

  const handleRemoveEmergencyContact = (id: string) => {
    if (emergencyContactsList.length <= 1) {
      handleSaveEmergencyContacts([{ id: 'ec-primary', name: '', relationship: '', phone: '' }]);
      return;
    }
    const nextList = emergencyContactsList.filter((item) => item.id !== id);
    handleSaveEmergencyContacts(nextList);
  };

  // Company Logo Handlers (Upload, Link & AI Logo Tool)
  const currentCompanyLogo =
    profile.workData?.companyLogoUrl || profile.companyLogoUrl || activeCard?.companyLogoUrl || '';

  const applyCompanyLogoUrl = (url: string | undefined) => {
    handleUpdateWork({ companyLogoUrl: url });
    if (activeCard && onUpdateCard) {
      onUpdateCard({
        ...activeCard,
        companyLogoUrl: url,
        visibleFields: {
          ...activeCard.visibleFields,
          companyLogo: Boolean(url),
        },
      });
    }
  };

  const handleUploadCompanyLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        applyCompanyLogoUrl(finalLogoUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateAiCompanyLogo = async () => {
    if (isGeneratingLogo) return;
    const companyName = profile.workData?.company || profile.company || profile.name || 'Brand';
    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin('image_logo', `AI Company Logo (${companyName})`);
      if (!allowed) return;
    }
    setIsGeneratingLogo(true);
    try {
      const res = await fetch('/api/ai/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyName,
          style: aiLogoStyle,
          prompt: aiLogoPrompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.imageUrl) {
          applyCompanyLogoUrl(data.imageUrl);
        }
      }
    } catch (err) {
      console.warn('AI logo generation notice:', err);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  // Passions, Education & Portfolio Handlers
  const passionsList: PassionItem[] = profile.passions || [];
  const educationList: EducationItem[] = profile.education || [];
  const portfolioList: PortfolioItem[] = profile.portfolio || [];

  const handleAddPassion = () => {
    const newItem: PassionItem = {
      id: `pas-${Date.now()}`,
      title: '',
      category: 'passion',
      detail: '',
    };
    onUpdateProfile({
      ...profile,
      passions: [...passionsList, newItem],
    });
  };

  const handleUpdatePassion = (id: string, patch: Partial<PassionItem>) => {
    onUpdateProfile({
      ...profile,
      passions: passionsList.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleRemovePassion = (id: string) => {
    onUpdateProfile({
      ...profile,
      passions: passionsList.filter((item) => item.id !== id),
    });
  };

  const handleAddEducation = () => {
    const newItem: EducationItem = {
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      year: '',
      honors: '',
    };
    onUpdateProfile({
      ...profile,
      education: [...educationList, newItem],
    });
  };

  const handleUpdateEducation = (id: string, patch: Partial<EducationItem>) => {
    onUpdateProfile({
      ...profile,
      education: educationList.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleRemoveEducation = (id: string) => {
    onUpdateProfile({
      ...profile,
      education: educationList.filter((item) => item.id !== id),
    });
  };

  const handleAddPortfolioItem = () => {
    const newItem: PortfolioItem = {
      id: `port-${Date.now()}`,
      title: '',
      discipline: 'painter',
      imageUrl: '',
      mediumOrRole: '',
      year: '',
      description: '',
    };
    onUpdateProfile({
      ...profile,
      portfolio: [...portfolioList, newItem],
    });
  };

  const handleUpdatePortfolioItem = (id: string, patch: Partial<PortfolioItem>) => {
    onUpdateProfile({
      ...profile,
      portfolio: portfolioList.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const handleRemovePortfolioItem = (id: string) => {
    onUpdateProfile({
      ...profile,
      portfolio: portfolioList.filter((item) => item.id !== id),
    });
  };

  const handlePortfolioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPortfolioItemId) return;
    const targetId = uploadingPortfolioItemId;
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.max(img.width, img.height) > maxDim ? maxDim / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        const compressedUrl = ctx
          ? (ctx.drawImage(img, 0, 0, canvas.width, canvas.height),
            canvas.toDataURL('image/jpeg', 0.85))
          : rawDataUrl;
        handleUpdatePortfolioItem(targetId, { imageUrl: compressedUrl });
        setUploadingPortfolioItemId(null);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={sectionMode === 'all' ? 'rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6' : 'space-y-4'}>
      {/* Header & 4-Tab Navigation Pills (Only shown when sectionMode === 'all') */}
      {sectionMode === 'all' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (onOpenImageHub ? onOpenImageHub('avatar') : onOpenAvatarModal('vault'))}
                className="group relative shrink-0"
                title="Manage Profile & Background Images in Image Hub"
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-11 w-11 rounded-xl object-cover border border-indigo-500/50 shadow-md group-hover:border-cyan-400 transition"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-indigo-950/90 border border-indigo-500/50 shadow-md group-hover:border-cyan-400 transition flex items-center justify-center text-xs font-bold text-indigo-200 uppercase">
                    {(profile.name || 'YC')
                      .trim()
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('') || 'YC'}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-indigo-600 text-white shadow">
                  <Camera className="h-2.5 w-2.5" />
                </span>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white tracking-tight">Canonical Master Profile</h3>
                  {profile.circleName && (
                    <span className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                      {profile.circleName}
                    </span>
                  )}
                  {profile.isVerified && profile.kycVerification?.isCompleted && profile.kycVerification?.traceabilityId && (
                    <span
                      className="text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1"
                      title={`KYC Verified · Traceability ID: ${profile.kycVerification.traceabilityId}`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>Verified Identity</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Central identity registry. Control public publishing for any filled field via the Selective Sharing tab.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => (onOpenImageHub ? onOpenImageHub('avatar') : onOpenAvatarModal('vault'))}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition shadow-sm"
              >
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span>Open Image Hub →</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium no-scrollbar">
            <button
              onClick={() => setProfileSubTab('personal')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg transition whitespace-nowrap ${
                profileSubTab === 'personal'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Personal</span>
            </button>
            <button
              onClick={() => setProfileSubTab('work')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg transition whitespace-nowrap ${
                profileSubTab === 'work'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Work</span>
            </button>
            <button
              onClick={() => setProfileSubTab('beyond')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg transition whitespace-nowrap ${
                profileSubTab === 'beyond'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Passions & Portfolio</span>
            </button>
            <button
              onClick={() => setProfileSubTab('socials')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-lg transition whitespace-nowrap ${
                profileSubTab === 'socials'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Socials ({getFilledSocialAccounts(profile).length})
              </span>
            </button>
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* SUB-SECTION 1: PERSONAL DATA                                      */}
      {/* ================================================================= */}
      {effectiveSubTab === 'personal' && (
        <div className="space-y-5 pt-1 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>Personal Data & Identification</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Personal identity coordinates and demographic preferences. Every filled field becomes available in Selective Sharing.
              </p>
            </div>
          </div>

          {/* Identity Coordinates: Separate First Name, Last Name & Nickname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>
                  First Name <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] font-mono text-rose-400/90">Required</span>
              </label>
              <input
                type="text"
                required
                value={currentFirstName}
                onChange={(e) => handleUpdateFirstName(e.target.value)}
                className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none ${
                  !currentFirstName.trim()
                    ? 'border-rose-500/60 focus:border-rose-400'
                    : 'border-slate-800 focus:border-rose-500'
                }`}
                placeholder="e.g. Elena"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>
                  Last Name <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] font-mono text-rose-400/90">Required</span>
              </label>
              <input
                type="text"
                required
                value={currentLastName}
                onChange={(e) => handleUpdateLastName(e.target.value)}
                className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none ${
                  !currentLastName.trim()
                    ? 'border-rose-500/60 focus:border-rose-400'
                    : 'border-slate-800 focus:border-rose-500'
                }`}
                placeholder="e.g. Rostova"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nickname / Preferred Name
              </label>
              <input
                type="text"
                value={profile.personalData?.nickname ?? profile.nickname ?? ''}
                placeholder="e.g. Ellie, Alex, Marc"
                onChange={(e) => {
                  handleUpdatePersonal({ nickname: e.target.value });
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Binary & LGBTQ+ Inclusive Gender and Preferred Pronouns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Gender (Binary & LGBTQ+ Inclusive)
              </label>
              <select
                value={isCustomGender ? 'Self-describe' : currentGender}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateProfile({ ...profile, gender: val });
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="">Not specified</option>
                <optgroup label="Binary">
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </optgroup>
                <optgroup label="LGBTQ+ & Non-Binary">
                  <option value="Non-binary">Non-binary</option>
                  <option value="Genderqueer / Genderfluid">Genderqueer / Genderfluid</option>
                  <option value="Agender">Agender</option>
                  <option value="Two-Spirit">Two-Spirit</option>
                  <option value="Transgender Woman">Transgender Woman</option>
                  <option value="Transgender Man">Transgender Man</option>
                  <option value="Cisgender Woman">Cisgender Woman</option>
                  <option value="Cisgender Man">Cisgender Man</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Self-describe">Self-describe / Other</option>
                </optgroup>
              </select>

              {(isCustomGender || currentGender === 'Self-describe') && (
                <input
                  type="text"
                  value={currentGender === 'Self-describe' ? '' : profile.gender || ''}
                  placeholder="Specify your gender..."
                  onChange={(e) => onUpdateProfile({ ...profile, gender: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-rose-300 focus:border-rose-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preferred Pronouns
              </label>
              <select
                value={isCustomPronouns ? 'Custom' : currentPronouns}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateProfile({ ...profile, pronouns: val });
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="">Not specified</option>
                {PRONOUN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {(isCustomPronouns || currentPronouns === 'Custom') && (
                <input
                  type="text"
                  value={currentPronouns === 'Custom' ? '' : profile.pronouns || ''}
                  placeholder="e.g. ze/zir, fae/faer..."
                  onChange={(e) => onUpdateProfile({ ...profile, pronouns: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-rose-300 focus:border-rose-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Personal Phone, Email, Location & Birthday */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>
                  Personal Mobile / Cell <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] font-mono text-rose-400/90">Required</span>
              </label>
              <input
                type="tel"
                required
                value={profile.personalData?.phone ?? ''}
                placeholder="+1 (415) 518-9920"
                onChange={(e) => handleUpdatePersonal({ phone: e.target.value })}
                className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono ${
                  !(profile.personalData?.phone ?? '').trim()
                    ? 'border-rose-500/60 focus:border-rose-400'
                    : 'border-slate-800 focus:border-rose-500'
                }`}
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
                <span>
                  Personal Email <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] font-mono text-rose-400/90">Required</span>
              </label>
              <input
                type="email"
                required
                value={profile.personalData?.email ?? ''}
                placeholder="elena.personal@icloud.com"
                onChange={(e) => handleUpdatePersonal({ email: e.target.value })}
                className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none ${
                  !(profile.personalData?.email ?? '').trim()
                    ? 'border-rose-500/60 focus:border-rose-400'
                    : 'border-slate-800 focus:border-rose-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Home Neighborhood / City
              </label>
              <input
                type="text"
                value={profile.personalData?.address?.city ?? ''}
                placeholder="e.g. Presidio Heights, San Francisco"
                onChange={(e) =>
                  handleUpdatePersonal({
                    address: { ...profile.personalData?.address, city: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Birthday (Rubrica BDAY)
              </label>
              <input
                type="date"
                value={profile.personalData?.birthday || ''}
                onChange={(e) => handleUpdatePersonal({ birthday: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Primary & Additional Emergency Contacts (+ Button) */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 min-w-0">
                <Heart className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Emergency Contacts (ICE)</span>
              </div>
              <button
                type="button"
                onClick={handleAddEmergencyContact}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
                title="Add another emergency contact"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="space-y-3">
              {emergencyContactsList.map((ec, idx) => (
                <div
                  key={ec.id}
                  className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/90 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300/90">
                      {idx === 0 ? 'Primary Emergency Contact' : `Emergency Contact #${idx + 1}`}
                    </span>
                    {emergencyContactsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmergencyContact(ec.id)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                        title="Remove emergency contact"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1">Contact Name</span>
                      <input
                        type="text"
                        value={ec.name}
                        placeholder="e.g. Claire Rostova"
                        onChange={(e) =>
                          handleUpdateEmergencyContactItem(ec.id, 'name', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1">Relationship</span>
                      <input
                        type="text"
                        value={ec.relationship}
                        placeholder="e.g. Sister / Spouse"
                        onChange={(e) =>
                          handleUpdateEmergencyContactItem(ec.id, 'relationship', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-400 mb-1">Emergency Phone</span>
                      <input
                        type="tel"
                        value={ec.phone}
                        placeholder="+1 (415) 555-0199"
                        onChange={(e) =>
                          handleUpdateEmergencyContactItem(ec.id, 'phone', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Bio / Note (Decoupled from Work Bio & independently selectable in Selective Sharing) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Personal Bio / Note
              </label>
              <button
                type="button"
                onClick={onOpenBioModal}
                className="text-[11px] text-rose-400 hover:underline inline-flex items-center gap-1.5"
                title="Subject to AI Coins availability"
              >
                <Sparkles className="h-3 w-3" />
                <span>AI Rewrite</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                  <Coins className="h-2.5 w-2.5 text-amber-400" />
                  <span>1</span>
                </span>
              </button>
            </div>
            <textarea
              rows={2}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.max(56, el.scrollHeight)}px`;
                }
              }}
              value={profile.personalData?.bio ?? ''}
              placeholder="Personal interests, family notes, weekend passions, or personal introduction..."
              onChange={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.max(56, e.currentTarget.scrollHeight)}px`;
                handleUpdatePersonal({ bio: e.target.value });
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 leading-relaxed resize-none overflow-hidden focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-SECTION 2: WORK & PROFESSIONAL DATA (Company Logo at Bottom)  */}
      {/* ================================================================= */}
      {effectiveSubTab === 'work' && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span>Corporate & Executive Coordinates</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Professional details and company branding shared on corporate digital cards. Toggle visibility in Selective Sharing.
              </p>
            </div>
            <button
              onClick={onOpenBioModal}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition shrink-0"
              title="Subject to AI Coins availability"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Bio</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                <Coins className="h-3 w-3 text-amber-400" />
                <span>1</span>
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Executive Title / Role
              </label>
              <input
                type="text"
                value={profile.workData?.role ?? profile.role ?? ''}
                onChange={(e) => handleUpdateWork({ role: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. Founder & CEO"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company / Organization
              </label>
              <input
                type="text"
                value={profile.workData?.company ?? profile.company ?? ''}
                onChange={(e) => handleUpdateWork({ company: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="e.g. CognitionOS Inc."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Department / Division
              </label>
              <input
                type="text"
                value={profile.workData?.department || ''}
                placeholder="e.g. Executive Office & Applied Research"
                onChange={(e) => handleUpdateWork({ department: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Corporate Direct Email
              </label>
              <input
                type="email"
                value={profile.workData?.email ?? profile.email ?? ''}
                onChange={(e) => handleUpdateWork({ email: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="elena@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Direct Phone / Office Desk
              </label>
              <input
                type="tel"
                value={profile.workData?.phone ?? profile.phone ?? ''}
                onChange={(e) => handleUpdateWork({ phone: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="+1 (415) 890-3412"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Company Website
              </label>
              <input
                type="text"
                value={profile.workData?.website ?? profile.website ?? ''}
                onChange={(e) => handleUpdateWork({ website: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="https://company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Office Location / HQ City
              </label>
              <input
                type="text"
                value={profile.workData?.officeAddress?.city ?? profile.location ?? ''}
                placeholder="e.g. San Francisco, CA (SoMa HQ)"
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateProfile({
                    ...profile,
                    location: val,
                    workData: {
                      ...(profile.workData || {
                        role: profile.role || '',
                        company: profile.company || '',
                        email: profile.email || '',
                        phone: profile.phone || '',
                      }),
                      officeAddress: {
                        ...profile.workData?.officeAddress,
                        city: val,
                      },
                    },
                  });
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Corporate Tax ID / VAT Registration
              </label>
              <input
                type="text"
                value={profile.workData?.taxIdOrVat || ''}
                placeholder="e.g. US-EIN-94-3829104"
                onChange={(e) => handleUpdateWork({ taxIdOrVat: e.target.value })}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Executive Headline
            </label>
            <input
              type="text"
              value={profile.headline || ''}
              onChange={(e) =>
                onUpdateProfile({
                  ...profile,
                  headline: e.target.value,
                  workData: profile.workData
                    ? { ...profile.workData, headline: e.target.value }
                    : undefined,
                })
              }
              placeholder="e.g. Pioneering generative agent networks and autonomous multi-agent pipelines"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Executive Bio & Elevator Summary
              </label>
              <button
                type="button"
                onClick={onOpenBioModal}
                className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                title="Subject to AI Coins availability"
              >
                <Sparkles className="h-3 w-3" />
                <span>AI Rewrite</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                  <Coins className="h-2.5 w-2.5 text-amber-400" />
                  <span>1</span>
                </span>
              </button>
            </div>
            <textarea
              rows={2}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.max(68, el.scrollHeight)}px`;
                }
              }}
              value={profile.workData?.bio ?? profile.bio ?? ''}
              onChange={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.max(68, e.currentTarget.scrollHeight)}px`;
                handleUpdateWork({ bio: e.target.value });
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 leading-relaxed resize-none overflow-hidden focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Company Logo Hub moved to the bottom of the Work tab */}
          <div className="rounded-xl border border-indigo-500/30 bg-slate-950/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
                <div>
                  <span className="text-xs font-bold text-white">Company Logo</span>
                  <p className="text-[10px] text-slate-400">
                    Upload an image, paste a link, or generate a brand emblem with AI.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCompanyLogoFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiLogoPanelOpen((prev) => !prev)}
                  className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-semibold shadow-sm transition"
                  title="Subject to AI Coins availability"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>AI Logo</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-black/30 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                    <Coins className="h-2.5 w-2.5 text-amber-400" />
                    <span>1</span>
                  </span>
                </button>
                {currentCompanyLogo && (
                  <button
                    type="button"
                    onClick={() => applyCompanyLogoUrl(undefined)}
                    className="h-9 px-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 hover:bg-rose-900/40 flex items-center gap-1 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentCompanyLogo ? (
                <div className="h-12 w-16 rounded-xl bg-black/70 border border-indigo-500/40 p-1.5 flex items-center justify-center shrink-0 shadow">
                  <img
                    src={currentCompanyLogo}
                    alt="Company Logo"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              ) : (
                <div className="h-12 w-16 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                  No Logo
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Logo Image Link (PNG / SVG / JPG)
                </label>
                <input
                  type="url"
                  value={currentCompanyLogo}
                  onChange={(e) => applyCompanyLogoUrl(e.target.value)}
                  placeholder="https://... or upload / generate with AI"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Expandable AI Logo Generator Drawer */}
            {isAiLogoPanelOpen && (
              <div className="p-3.5 rounded-xl bg-slate-900/95 border border-indigo-500/40 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    <span>AI Brand Emblem Studio</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-300">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span>1</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'minimal_monogram', label: 'Minimal Monogram' },
                      { id: 'luxury_crest', label: 'Luxury Crest' },
                      { id: 'tech_geometric', label: 'Tech Geometric' },
                      { id: 'creative_emblem', label: 'Creative Studio' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setAiLogoStyle(st.id)}
                      className={`px-2.5 py-2 rounded-lg border text-left transition ${
                        aiLogoStyle === st.id
                          ? 'border-indigo-400 bg-indigo-950/50 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-semibold truncate">{st.label}</div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={aiLogoPrompt}
                    onChange={(e) => setAiLogoPrompt(e.target.value)}
                    placeholder={`Describe logo symbol for ${profile.workData?.company || profile.company || 'your company'}...`}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiCompanyLogo}
                    disabled={isGeneratingLogo}
                    className="h-9 flex items-center justify-center gap-1.5 px-3.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 shrink-0"
                  >
                    {isGeneratingLogo ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Designing...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3.5 w-3.5" />
                        <span>Generate</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                          <Coins className="h-2.5 w-2.5 text-amber-400" />
                          <span>1</span>
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-SECTION 3: PASSIONS, EDUCATION & ARTIST PORTFOLIO             */}
      {/* ================================================================= */}
      {effectiveSubTab === 'beyond' && (
        <div className="space-y-6 pt-1 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Palette className="h-4 w-4" />
                <span>Passions, Education & Artist Portfolio (Story Deck Slide 03)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Showcase your sports, hobbies, academic credentials, and visual art or performance portfolio (dancers, actors, painters, photographers) on Slide 3 of your Story Deck.
              </p>
            </div>
          </div>

          <input
            ref={portfolioFileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePortfolioFileChange}
            className="hidden"
          />

          {/* 1. Hobbies, Sports & Passions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 min-w-0">
                <Trophy className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Hobbies, Sports & Passions</span>
              </div>
              <button
                type="button"
                onClick={handleAddPassion}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span>Add Passion</span>
              </button>
            </div>

            {passionsList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No hobbies, sports, or passions added yet. Click "+ Add Passion / Sport" to showcase your athletic or personal interests.
              </p>
            ) : (
              <div className="space-y-2.5">
                {passionsList.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800"
                  >
                    <div className="sm:col-span-3">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleUpdatePassion(item.id, { category: e.target.value as any })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-emerald-300 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="sport">🏆 Sport / League</option>
                        <option value="hobby">🎨 Creative Hobby</option>
                        <option value="passion">🔥 Personal Passion</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdatePassion(item.id, { title: e.target.value })}
                        placeholder="Title (e.g. Links Golf, Classical Piano)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={item.detail || ''}
                        onChange={(e) => handleUpdatePassion(item.id, { detail: e.target.value })}
                        placeholder="Detail (e.g. Handicap 8.2 · Club Member)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemovePassion(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Education & Academic Credentials */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 min-w-0">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Education & Credentials</span>
              </div>
              <button
                type="button"
                onClick={handleAddEducation}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span>Add Education</span>
              </button>
            </div>

            {educationList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No education entries added yet. Click "+ Add Education" to list universities, conservatories, or fellowships.
              </p>
            ) : (
              <div className="space-y-2.5">
                {educationList.map((edu) => (
                  <div
                    key={edu.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800"
                  >
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) =>
                          handleUpdateEducation(edu.id, { institution: e.target.value })
                        }
                        placeholder="Institution (e.g. Stanford University)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducation(edu.id, { degree: e.target.value })}
                        placeholder="Degree / Diploma (e.g. M.S. Computer Science)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={edu.year || ''}
                        onChange={(e) => handleUpdateEducation(edu.id, { year: e.target.value })}
                        placeholder="Year"
                        className="w-16 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-amber-300 font-mono focus:border-indigo-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={edu.honors || ''}
                        onChange={(e) => handleUpdateEducation(edu.id, { honors: e.target.value })}
                        placeholder="Honors / Lab"
                        className="flex-1 min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(edu.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 transition"
                        title="Remove education"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Artist & Creative Portfolio (Dancers, Actors, Painters, Visual Artists) */}
          <div className="rounded-xl border border-amber-500/30 bg-slate-950/80 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 min-w-0">
                <Award className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Artist & Creative Portfolio</span>
              </div>
              <button
                type="button"
                onClick={handleAddPortfolioItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold whitespace-nowrap shrink-0 transition"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span>Add Work</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Artist Discipline / Creative Statement
              </label>
              <input
                type="text"
                value={profile.artistDiscipline || ''}
                onChange={(e) => onUpdateProfile({ ...profile, artistDiscipline: e.target.value })}
                placeholder="e.g. Contemporary Dancer, Stage & Screen Actor, Oil Painter, Fine-Art Photographer"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-amber-200 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {portfolioList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No portfolio works added yet. Add paintings, dance stills, acting headshots/stills, or photography collections.
              </p>
            ) : (
              <div className="space-y-2.5">
                {portfolioList.map((work) => (
                  <div
                    key={work.id}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-xl bg-slate-900/85 border border-slate-800"
                  >
                    {/* Left: Thumbnail Preview / Upload Trigger */}
                    <div className="sm:col-span-2 flex items-center gap-2.5">
                      <div
                        onClick={() => {
                          setUploadingPortfolioItemId(work.id);
                          portfolioFileInputRef.current?.click();
                        }}
                        className="relative h-16 w-20 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 hover:border-amber-500/60 shrink-0 group cursor-pointer flex items-center justify-center transition"
                        title="Click to upload artwork image"
                      >
                        {work.imageUrl ? (
                          <img
                            src={work.imageUrl}
                            alt={work.title || 'Portfolio preview'}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-[9px] text-slate-500 group-hover:text-amber-300 transition">
                            <Upload className="h-4 w-4 mb-0.5 text-amber-400/80" />
                            <span>Add Image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-semibold text-white transition">
                          <Upload className="h-3.5 w-3.5 mr-0.5 text-amber-400" /> Upload
                        </div>
                      </div>
                    </div>

                    {/* Middle: Structured Portfolio Metadata Inputs */}
                    <div className="sm:col-span-9 space-y-2 min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <select
                            value={work.discipline}
                            onChange={(e) =>
                              handleUpdatePortfolioItem(work.id, {
                                discipline: e.target.value as any,
                              })
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
                          >
                            <option value="painter">🎨 Painter / Visual Art</option>
                            <option value="dancer">🩰 Dancer / Choreography</option>
                            <option value="actor">🎭 Actor / Film & Stage</option>
                            <option value="photographer">📷 Photographer</option>
                            <option value="musician">🎹 Musician / Composer</option>
                            <option value="creative">✨ Creative Direction</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={work.title}
                            onChange={(e) =>
                              handleUpdatePortfolioItem(work.id, { title: e.target.value })
                            }
                            placeholder="Artwork / Production Title"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={work.mediumOrRole || ''}
                            onChange={(e) =>
                              handleUpdatePortfolioItem(work.id, { mediumOrRole: e.target.value })
                            }
                            placeholder="Medium / Role (e.g. Oil on Linen)"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={work.year || ''}
                            onChange={(e) =>
                              handleUpdatePortfolioItem(work.id, { year: e.target.value })
                            }
                            placeholder="Year"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={work.imageUrl}
                          onChange={(e) =>
                            handleUpdatePortfolioItem(work.id, { imageUrl: e.target.value })
                          }
                          placeholder="Image URL (https://...) or click Upload File"
                          className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingPortfolioItemId(work.id);
                            portfolioFileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700 shrink-0 transition"
                        >
                          Upload File
                        </button>
                      </div>
                    </div>

                    {/* Right: Dedicated Delete Action Column (aligned with Passions & Education) */}
                    <div className="sm:col-span-1 flex justify-end items-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioItem(work.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/30 transition"
                        title="Delete portfolio work"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-SECTION 4: MAJOR SOCIAL MEDIA HUB (TOP 5 + DYNAMIC ADD LINES) */}
      {/* ================================================================= */}
      {effectiveSubTab === 'socials' && (() => {
        const socialEntries = getEffectiveSocialAccounts(profile);

        const applySocialEntries = (nextEntries: SocialAccountEntry[]) => {
          const syncedLegacySocials = syncSocialAccountsToLegacyLinks(nextEntries);
          onUpdateProfile({
            ...profile,
            socialAccounts: nextEntries,
            socials: syncedLegacySocials,
            workData: profile.workData
              ? { ...profile.workData, socials: syncedLegacySocials }
              : undefined,
            personalData: profile.personalData
              ? { ...profile.personalData, socials: syncedLegacySocials }
              : undefined,
          });
        };

        const handleAddSocialLine = (preferredPlatformId?: keyof SocialLinks) => {
          const usedPlatforms = new Set(socialEntries.map((e) => e.platformId));
          const nextUnusedPlatform =
            preferredPlatformId ||
            MAJOR_SOCIAL_PLATFORMS.find((p) => !usedPlatforms.has(p.id))?.id ||
            'instagram';

          const samePlatformCount = socialEntries.filter(
            (e) => e.platformId === nextUnusedPlatform
          ).length;

          const newEntry: SocialAccountEntry = {
            id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            platformId: nextUnusedPlatform,
            value: '',
            label: samePlatformCount > 0 ? `Profile #${samePlatformCount + 1}` : '',
          };

          applySocialEntries([...socialEntries, newEntry]);
        };

        return (
          <div className="space-y-5 pt-1 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  <span>Social & Messaging Accounts ({socialEntries.filter((e) => e.value?.trim()).length} Filled)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Showing your Top 5 channels by default. Use the <strong className="text-slate-200">+ Add Another Social Profile Line</strong> button at the bottom of the section to add more platforms or multiple profiles for the same network.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {socialEntries.map((entry, idx) => {
                const platform = getPlatformConfig(entry.platformId);
                const val = entry.value || '';
                const hasUrl = Boolean(val.trim());
                const fullSocialHref = hasUrl ? getFullSocialUrl(entry.platformId, val) : undefined;
                const duplicateCount = socialEntries.filter(
                  (e) => e.platformId === entry.platformId
                ).length;

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 hover:border-slate-700 transition space-y-2"
                  >
                    {/* Top Row: Clickable Social Symbol (embeds link for testing) + Platform Selector + Address Input + Remove */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-5 flex items-center gap-2">
                        {hasUrl && fullSocialHref ? (
                          <a
                            href={fullSocialHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 hover:scale-105 hover:brightness-110 transition shadow-sm"
                            style={{
                              backgroundColor: `${platform.color}20`,
                              borderColor: `${platform.color}65`,
                              color: platform.color,
                            }}
                            title={`Click symbol to open & test ${platform.name} link`}
                          >
                            {platform.renderIcon({
                              className: 'h-4 w-4',
                              style: { color: platform.color },
                            })}
                          </a>
                        ) : (
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 opacity-75"
                            style={{
                              backgroundColor: `${platform.color}15`,
                              borderColor: `${platform.color}40`,
                              color: platform.color,
                            }}
                            title={`Enter your ${platform.name} address, then click this symbol to open and test`}
                          >
                            {platform.renderIcon({
                              className: 'h-4 w-4',
                              style: { color: platform.color },
                            })}
                          </div>
                        )}
                        <select
                          value={entry.platformId}
                          onChange={(e) => {
                            const nextPlatformId = e.target.value as keyof SocialLinks;
                            const nextList = socialEntries.map((item, i) =>
                              i === idx ? { ...item, platformId: nextPlatformId } : item
                            );
                            applySocialEntries(nextList);
                          }}
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                        >
                          <optgroup label="Top 5 Popular Networks">
                            {MAJOR_SOCIAL_PLATFORMS.filter((p) =>
                              ['linkedin', 'instagram', 'whatsapp', 'twitter', 'youtube'].includes(p.id)
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Professional & Business">
                            {MAJOR_SOCIAL_PLATFORMS.filter(
                              (p) =>
                                p.category === 'professional' &&
                                !['linkedin', 'twitter'].includes(p.id)
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Direct Messaging & Personal">
                            {MAJOR_SOCIAL_PLATFORMS.filter(
                              (p) =>
                                p.category === 'personal' &&
                                !['instagram', 'whatsapp'].includes(p.id)
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Creator & Community">
                            {MAJOR_SOCIAL_PLATFORMS.filter(
                              (p) =>
                                p.category === 'creator_community' &&
                                p.id !== 'youtube'
                            ).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Address / Handle / URL Input + Delete Button */}
                      <div className="sm:col-span-7 flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={val}
                            placeholder={platform.placeholder}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              const nextList = socialEntries.map((item, i) =>
                                i === idx ? { ...item, value: nextVal } : item
                              );
                              applySocialEntries(nextList);
                            }}
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none transition"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (socialEntries.length <= 1) {
                              applySocialEntries([{ ...entry, value: '', label: '' }]);
                              return;
                            }
                            const nextList = socialEntries.filter((_, i) => i !== idx);
                            applySocialEntries(nextList);
                          }}
                          className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition shrink-0"
                          title="Remove this social line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Profile Label / Tag placed below the address field */}
                    <div className="sm:pl-11">
                      <input
                        type="text"
                        value={entry.label || ''}
                        onChange={(e) => {
                          const nextList = socialEntries.map((item, i) =>
                            i === idx ? { ...item, label: e.target.value } : item
                          );
                          applySocialEntries(nextList);
                        }}
                        placeholder={
                          duplicateCount > 1
                            ? 'Profile label (e.g. Work, Personal)'
                            : 'Optional label below address (e.g. Personal, Studio, Official)'
                        }
                        className="w-full rounded-lg border border-slate-800/80 bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-300 focus:border-cyan-500 focus:outline-none transition"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Button + Quick Add Remaining Platforms */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => handleAddSocialLine()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-dashed border-cyan-500/50 bg-cyan-950/20 hover:bg-cyan-950/40 text-xs font-semibold text-cyan-300 transition"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Another Social Profile Line</span>
              </button>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mr-1">
                  Quick Add:
                </span>
                {(['github', 'calendly', 'telegram', 'tiktok', 'threads', 'discord'] as (keyof SocialLinks)[]).map(
                  (quickId) => {
                    const pConfig = getPlatformConfig(quickId);
                    return (
                      <button
                        key={quickId}
                        type="button"
                        onClick={() => handleAddSocialLine(quickId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-[10px] text-slate-300 hover:text-white transition"
                      >
                        <Plus className="h-2.5 w-2.5 text-cyan-400" />
                        <span>{pConfig.name}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
