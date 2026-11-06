import React, { useState } from 'react';
import { DigitalCard, CardTheme, MasterProfile, ProfileCategory, CardVisibleFields } from '../types';
import { PROFILE_CATEGORIES } from '../data/presets';
import { MAJOR_SOCIAL_PLATFORMS, getProfileSocialValue } from '../data/socialRegistry';
import {
  X,
  Plus,
  Palette,
  Eye,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Briefcase,
  Heart,
  Trophy,
  Compass,
  Tag,
  Mail,
  Phone,
  Building,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  HelpCircle,
  Globe,
} from 'lucide-react';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: MasterProfile;
  onCreateCard: (newCard: DigitalCard) => void;
}

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onCreateCard,
}) => {
  const nameParts = (currentProfile.name || '').trim().split(/\s+/);
  const initialFirstName =
    currentProfile.personalData?.firstName || currentProfile.firstName || nameParts[0] || '';
  const initialLastName =
    currentProfile.personalData?.lastName ||
    currentProfile.lastName ||
    nameParts.slice(1).join(' ') ||
    '';
  const initialEmail =
    currentProfile.email ||
    currentProfile.personalData?.email ||
    currentProfile.workData?.email ||
    '';
  const initialPhone =
    currentProfile.phone ||
    currentProfile.personalData?.phone ||
    currentProfile.workData?.phone ||
    '';

  const [holderFirstName, setHolderFirstName] = useState(initialFirstName);
  const [holderLastName, setHolderLastName] = useState(initialLastName);
  const [holderEmail, setHolderEmail] = useState(initialEmail);
  const [holderPhone, setHolderPhone] = useState(initialPhone);

  const [name, setName] = useState('Tech & Advisory');
  const [category, setCategory] = useState<ProfileCategory>('business');
  const [tag, setTag] = useState('Business');
  const [customTagInput, setCustomTagInput] = useState('');
  const [theme, setTheme] = useState<CardTheme>('cyber');
  const [accentColor, setAccentColor] = useState('#06B6D4');
  const [customTagline, setCustomTagline] = useState('');
  const [vanitySlug, setVanitySlug] = useState(
    `${(initialFirstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}-card`
  );
  const [qrMode, setQrMode] = useState<'vcard' | 'weblink'>('vcard');

  React.useEffect(() => {
    if (isOpen) {
      const parts = (currentProfile.name || '').trim().split(/\s+/);
      const fName =
        currentProfile.personalData?.firstName || currentProfile.firstName || parts[0] || '';
      const lName =
        currentProfile.personalData?.lastName ||
        currentProfile.lastName ||
        parts.slice(1).join(' ') ||
        '';
      setHolderFirstName(fName);
      setHolderLastName(lName);
      setHolderEmail(
        currentProfile.email ||
          currentProfile.personalData?.email ||
          currentProfile.workData?.email ||
          ''
      );
      setHolderPhone(
        currentProfile.phone ||
          currentProfile.personalData?.phone ||
          currentProfile.workData?.phone ||
          ''
      );
    }
  }, [isOpen, currentProfile]);

  // Granular Field Sharing Decision Matrix
  const [visibleFields, setVisibleFields] = useState<CardVisibleFields>({
    role: true,
    company: true,
    department: true,
    phone: true,
    personalPhone: false,
    email: true,
    personalEmail: false,
    website: true,
    location: true,
    homeAddress: false,
    officeAddress: true,
    bio: true,
    socials: true,
    birthday: false,
    emergencyContact: false,
    rubrica: true,
    taxIdOrVat: false,
    linkedin: true,
    twitter: true,
    github: false,
    calendly: true,
    whatsapp: false,
    telegram: false,
    instagram: false,
  });

  const [selectedRubricaIds, setSelectedRubricaIds] = useState<string[]>(
    currentProfile.rubricaFields?.map((f) => f.id).slice(0, 2) || []
  );

  if (!isOpen) return null;

  const quickColors = [
    { name: 'Cyan', hex: '#06B6D4' },
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Rose', hex: '#F43F5E' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Purple', hex: '#A855F7' },
    { name: 'Slate', hex: '#94A3B8' },
  ];

  const handleNameChange = (val: string) => {
    setName(val);
    const firstSlug = (holderFirstName || currentProfile.name.split(' ')[0] || 'card')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const autoSlug = `${firstSlug}-${val.toLowerCase().replace(/[^a-z0-9]/g, '-')}`.slice(0, 24);
    setVanitySlug(autoSlug);
  };

  const handleCategorySelect = (catId: ProfileCategory) => {
    setCategory(catId);
    const catConfig = PROFILE_CATEGORIES.find((c) => c.id === catId);
    if (catConfig && catConfig.tags.length > 0) {
      setTag(catConfig.tags[0]);
    }
    // Set smart default field toggles depending on category
    if (catId === 'business') {
      setVisibleFields((prev) => ({
        ...prev,
        role: true,
        company: true,
        department: true,
        phone: true,
        personalPhone: false,
        email: true,
        personalEmail: false,
        officeAddress: true,
        homeAddress: false,
        linkedin: true,
        calendly: true,
        emergencyContact: false,
        birthday: false,
        whatsapp: false,
      }));
      setAccentColor('#6366F1');
      setTheme('executive');
    } else if (catId === 'personal') {
      setVisibleFields((prev) => ({
        ...prev,
        role: false,
        company: false,
        department: false,
        personalPhone: true,
        personalEmail: true,
        phone: false,
        email: false,
        homeAddress: true,
        officeAddress: false,
        birthday: true,
        emergencyContact: true,
        whatsapp: true,
        telegram: true,
        linkedin: false,
        calendly: false,
      }));
      setAccentColor('#F43F5E');
      setTheme('creative');
    } else if (catId === 'hobby_sport') {
      setVisibleFields((prev) => ({
        ...prev,
        role: true,
        company: true,
        phone: true,
        personalPhone: true,
        email: true,
        personalEmail: false,
        rubrica: true,
        telegram: true,
        homeAddress: false,
        emergencyContact: false,
      }));
      setAccentColor('#10B981');
      setTheme('minimal');
    }
  };

  const toggleField = (fieldKey: keyof CardVisibleFields) => {
    setVisibleFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const toggleRubricaField = (id: string) => {
    setSelectedRubricaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalTag = customTagInput.trim() || tag;
    const resolvedFullName =
      [holderFirstName.trim(), holderLastName.trim()].filter(Boolean).join(' ') ||
      currentProfile.name;

    const newCard: DigitalCard = {
      id: `card-${Date.now()}`,
      name: name.trim(),
      category,
      tag: finalTag,
      theme,
      accentColor,
      customTagline: customTagline.trim() || `${currentProfile.role} at ${currentProfile.company}`,
      vanitySlug: vanitySlug.trim() || `card-${Date.now()}`,
      qrMode,
      holderFirstName: holderFirstName.trim() || undefined,
      holderLastName: holderLastName.trim() || undefined,
      holderFullName: resolvedFullName || undefined,
      holderEmail: holderEmail.trim() || undefined,
      holderPhone: holderPhone.trim() || undefined,
      visibleFields,
      sharedRubricaFieldIds: selectedRubricaIds,
      spatialParallax: true,
      livePresence: {
        enabled: true,
        statusText: `Verified Identity · ${name.trim()}`,
        availability: 'available',
        timezone: 'America/Los_Angeles',
      },
    };

    onCreateCard(newCard);
    onClose();
  };

  const getThemeStyles = (t: CardTheme) => {
    switch (t) {
      case 'forged_carbon':
        return 'from-[#16171d] via-[#0b0c10] to-[#261f0a] border-[#D4AF37]/60 shadow-amber-500/15';
      case 'brushed_titanium':
        return 'from-[#282d38] via-[#1b1f27] to-[#0f1218] border-slate-300/50 shadow-slate-500/15';
      case 'gold_bullion':
        return 'from-[#2b210a] via-[#171205] to-[#080602] border-amber-300/60 shadow-amber-500/20';
      case 'frosted_glass':
        return 'from-slate-900/60 via-slate-900/40 to-cyan-950/40 border-cyan-400/40 shadow-cyan-500/10 backdrop-blur-xl';
      case 'swiss_editorial':
        return 'from-[#FAF9F5] via-[#F4F3EE] to-[#EBE9E1] border-stone-400 shadow-stone-900/20 text-stone-900';
      case 'bento_dark':
        return 'from-[#0B0F19] via-[#080B12] to-[#04060A] border-indigo-500/40 shadow-indigo-500/10';
      case 'royal_navy':
        return 'from-[#0b172a] via-[#091124] to-[#040814] border-amber-500/40 shadow-amber-500/10';
      case 'emerald_luxury':
        return 'from-[#06241b] via-[#041a14] to-[#020d0a] border-emerald-400/40 shadow-emerald-500/10';
      case 'cyber':
        return 'from-slate-950 via-slate-900 to-cyan-950/80 border-cyan-500/40 shadow-cyan-500/10';
      case 'creative':
        return 'from-slate-950 via-purple-950/40 to-slate-900 border-pink-500/40 shadow-pink-500/10';
      case 'minimal':
        return 'from-slate-900 via-slate-900 to-slate-950 border-slate-700 shadow-slate-900/50';
      case 'executive':
      default:
        return 'from-[#12141a] via-[#0d0f14] to-[#08090c] border-amber-500/30 shadow-amber-500/10';
    }
  };


  const activeCategoryConfig = PROFILE_CATEGORIES.find((c) => c.id === category) || PROFILE_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-600/20 p-2 text-cyan-400 border border-cyan-500/30">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Create Profile / Digital Business Card</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  Custom Data Sharing
                </span>
              </div>
              <p className="text-xs text-slate-400">
                No preset circle restrictions. Freely name your card, assign one of 4 clean categories, and pick exactly which data to share.
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

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {/* Live Card Mini-Preview */}
          <div
            className={`rounded-2xl border p-4 bg-gradient-to-br transition-all duration-200 ${getThemeStyles(
              theme
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={currentProfile.avatarUrl}
                  alt={currentProfile.name}
                  className="h-12 w-12 rounded-xl object-cover border border-white/20 shadow"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">
                      {[holderFirstName.trim(), holderLastName.trim()].filter(Boolean).join(' ') || currentProfile.name}
                    </span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  {visibleFields.role && (
                    <span className="text-[11px] font-medium" style={{ color: accentColor }}>
                      {currentProfile.role}
                    </span>
                  )}
                  {visibleFields.company && (
                    <span className="text-[10px] text-slate-300 ml-1.5">· {currentProfile.company}</span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {visibleFields.email && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {holderEmail || 'Work Email'}
                      </span>
                    )}
                    {visibleFields.personalPhone && (
                      <span className="text-[10px] text-rose-300 flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" /> {holderPhone || 'Personal Mobile'}
                      </span>
                    )}
                    {visibleFields.emergencyContact && (
                      <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> ICE Contact
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border border-white/10 text-white shadow-sm"
                  style={{ backgroundColor: `${accentColor}30`, borderColor: accentColor }}
                >
                  {name || 'Card Profile'}
                </span>
                <span className="text-[10px] text-slate-400 bg-black/40 px-2 py-0.5 rounded font-mono">
                  Tag: #{customTagInput || tag}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-2 text-[11px] italic text-slate-300 truncate">
              "{customTagline || 'Custom Tagline'}"
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Card Name & Auto-Populated Holder Identity Fields */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">*</span>
                    <span>Card Profile Name</span>
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.2 rounded ml-1">
                      Mandatory
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">Name this business card freely</span>
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white font-medium focus:border-cyan-400 focus:outline-none transition"
                  placeholder="e.g. Angel Investor Pitch, Sunday Padel Club, Emergency Family Card"
                />
              </div>

              {/* Auto-Populated Identity Settings Fields (Editable per Card) */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <User className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Card Identity Fields (Auto-Populated from Identity Settings · Editable)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Can be modified for this card</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Name (First Name)
                    </label>
                    <input
                      type="text"
                      value={holderFirstName}
                      onChange={(e) => setHolderFirstName(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={holderLastName}
                      onChange={(e) => setHolderLastName(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      placeholder="Last Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={holderEmail}
                      onChange={(e) => setHolderEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={holderPhone}
                      onChange={(e) => setHolderPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                      placeholder="+1 (415) 000-0000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: 4 Categories Selector (User requested limited to 4 to avoid infinite clusters) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Choose Primary Category (4 Standard Clusters)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Prevents chaotic clustering while organizing cards across your life scenarios.
                  </p>
                </div>
              </div>

              {/* 4 Category Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PROFILE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id as ProfileCategory)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-md ring-1 ring-cyan-500/30'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <div className="text-xs font-bold text-slate-100">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cat.badge}</div>
                    </button>
                  );
                })}
              </div>

              {/* Tag Selector & Suggestions for the active category */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category Tag (like Business, Work, Hobby, Family, Sport, Game, or Custom)
                </label>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {activeCategoryConfig.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTag(t);
                        setCustomTagInput('');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                        tag === t && !customTagInput
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    placeholder="Or type a custom tag (e.g. #Padel, #Volunteering)..."
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Granular Data Sharing Matrix (Decide which data to share for this card) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Selective Data Sharing Matrix</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You decide which data to share with other people for this specific profile card.
                </p>
              </div>

              {/* Group A: Work Data Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 border-b border-indigo-900/40 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3" />
                    <span>Work & Corporate Data</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Toggle fields to include</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'role', label: 'Role / Job Title', val: currentProfile.workData?.role || currentProfile.role },
                    { key: 'company', label: 'Company / Org', val: currentProfile.workData?.company || currentProfile.company },
                    { key: 'department', label: 'Department', val: currentProfile.workData?.department || 'Executive' },
                    { key: 'email', label: 'Work Email', val: currentProfile.workData?.email || currentProfile.email },
                    { key: 'phone', label: 'Work Phone', val: currentProfile.workData?.phone || currentProfile.phone },
                    { key: 'officeAddress', label: 'Office Address', val: currentProfile.workData?.officeAddress?.city || 'HQ Address' },
                    { key: 'taxIdOrVat', label: 'Tax ID / VAT', val: currentProfile.workData?.taxIdOrVat || 'EIN/VAT' },
                    { key: 'linkedin', label: 'LinkedIn', val: 'Profile Link' },
                    { key: 'calendly', label: 'Calendly Booking', val: 'Meeting Link' },
                  ].map((f) => {
                    const isChecked = !!visibleFields[f.key as keyof CardVisibleFields];
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => toggleField(f.key as keyof CardVisibleFields)}
                        className={`flex items-start justify-between p-2 rounded-lg border text-left text-xs transition ${
                          isChecked
                            ? 'border-indigo-500/50 bg-indigo-950/40 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[11px] leading-tight">{f.label}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{f.val}</div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ml-1 border ${
                            isChecked ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group B: Personal Data Fields */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-rose-300 border-b border-rose-900/40 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3" />
                    <span>Personal & Family Data</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Private contact channels</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'personalPhone', label: 'Personal Mobile', val: currentProfile.personalData?.phone || currentProfile.phone },
                    { key: 'personalEmail', label: 'Personal Email', val: currentProfile.personalData?.email || currentProfile.email },
                    { key: 'homeAddress', label: 'Home Address', val: currentProfile.personalData?.address?.city || 'Home City' },
                    { key: 'birthday', label: 'Birthday', val: currentProfile.personalData?.birthday || 'DOB' },
                    { key: 'emergencyContact', label: 'Emergency Contact', val: currentProfile.personalData?.emergencyContact?.name || 'ICE' },
                    { key: 'whatsapp', label: 'WhatsApp', val: 'Direct Messaging' },
                    { key: 'telegram', label: 'Telegram', val: 'Private Chat' },
                    { key: 'instagram', label: 'Instagram', val: 'Social Feed' },
                  ].map((f) => {
                    const isChecked = !!visibleFields[f.key as keyof CardVisibleFields];
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => toggleField(f.key as keyof CardVisibleFields)}
                        className={`flex items-start justify-between p-2 rounded-lg border text-left text-xs transition ${
                          isChecked
                            ? 'border-rose-500/50 bg-rose-950/40 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[11px] leading-tight">{f.label}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{f.val}</div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ml-1 border ${
                            isChecked ? 'bg-rose-600 border-rose-400 text-white' : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group C: Major Social Media Channels to Share */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-cyan-300 border-b border-cyan-900/40 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Major Social Media Channels ({MAJOR_SOCIAL_PLATFORMS.filter(p => visibleFields[p.id] !== false && !!getProfileSocialValue(currentProfile, p.id)).length} Active)</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...visibleFields, socials: true };
                        MAJOR_SOCIAL_PLATFORMS.forEach((p) => { next[p.id] = true; });
                        setVisibleFields(next);
                      }}
                      className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...visibleFields };
                        MAJOR_SOCIAL_PLATFORMS.forEach((p) => { next[p.id] = false; });
                        setVisibleFields(next);
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...visibleFields, socials: true };
                        const proList: Array<keyof typeof currentProfile.socials> = ['linkedin', 'twitter', 'github', 'calendly', 'substack', 'medium', 'behance', 'dribbble'];
                        MAJOR_SOCIAL_PLATFORMS.forEach((p) => { next[p.id] = proList.includes(p.id); });
                        setVisibleFields(next);
                      }}
                      className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800"
                    >
                      Business
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...visibleFields, socials: true };
                        const persList: Array<keyof typeof currentProfile.socials> = ['whatsapp', 'telegram', 'signal', 'instagram', 'facebook', 'snapchat', 'wechat'];
                        MAJOR_SOCIAL_PLATFORMS.forEach((p) => { next[p.id] = persList.includes(p.id); });
                        setVisibleFields(next);
                      }}
                      className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800"
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...visibleFields, socials: true };
                        const creatorList: Array<keyof typeof currentProfile.socials> = ['youtube', 'tiktok', 'threads', 'discord', 'reddit', 'twitch', 'spotify', 'pinterest'];
                        MAJOR_SOCIAL_PLATFORMS.forEach((p) => { next[p.id] = creatorList.includes(p.id); });
                        setVisibleFields(next);
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800"
                    >
                      Creator
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {MAJOR_SOCIAL_PLATFORMS.map((platform) => {
                    const val = getProfileSocialValue(currentProfile, platform.id);
                    const isChecked = visibleFields[platform.id] !== false;

                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() =>
                          setVisibleFields({
                            ...visibleFields,
                            socials: true,
                            [platform.id]: !isChecked,
                          })
                        }
                        className={`flex items-center justify-between p-2 rounded-lg border text-left text-xs transition ${
                          isChecked
                            ? 'border-cyan-500/50 bg-cyan-950/30 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div
                            className="p-1 rounded flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${platform.color}15`,
                              borderColor: `${platform.color}35`,
                              color: platform.color,
                            }}
                          >
                            {platform.renderIcon({ className: 'h-3.5 w-3.5', style: { color: platform.color } })}
                          </div>
                          <div className="min-w-0 truncate">
                            <div className="font-medium text-[11px] leading-tight truncate">{platform.name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {val || <span className="italic text-slate-500">Not set</span>}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked ? 'bg-cyan-600 border-cyan-400 text-white' : 'border-slate-700 bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 4: Visual Theme, Colors, and Output Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Visual Theme & Material Finish</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as CardTheme)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="scuderia_corsa">Crimson Carbon (Racing Red & Solar Gold)</option>
                  <option value="milano_saffiano">Cross-Grain Noir (Textured Black & Silver)</option>
                  <option value="firenze_heritage">Forest & Ivory (Emerald, White & Gold)</option>
                  <option value="tailored_boss">Anthracite Camel (Charcoal & Warm Camel)</option>
                  <option value="paris_sellier">Saddle Amber (Burnt Orange & Warm Cream)</option>
                  <option value="forged_carbon">Forged Carbon & 24k Gold Leaf</option>
                  <option value="brushed_titanium">Brushed Aerospace Titanium</option>
                  <option value="gold_bullion">24k Gold Leaf & Anodized Obsidian</option>
                  <option value="executive">Obsidian Noir & Satin Gold</option>
                  <option value="frosted_glass">Optical Glass (Frosted Acrylic)</option>
                  <option value="swiss_editorial">Archival Ivory & Serif (Cotton Press)</option>
                  <option value="bento_dark">Midnight Indigo (Anodized Slate)</option>
                  <option value="royal_navy">Royal Midnight Navy & Brass</option>
                  <option value="emerald_luxury">Malachite Silk & Emerald</option>
                  <option value="cyber">Cyber Chrome & Electric Cyan</option>
                  <option value="minimal">Monolith Slate (Pure Matte)</option>
                  <option value="creative">Velvet Amethyst & Rose</option>
                </select>

              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Accent Highlight Color</label>
                <div className="flex items-center gap-2 pt-1">
                  {quickColors.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setAccentColor(col.hex)}
                      className={`h-7 w-7 rounded-full border transition-all ${
                        accentColor === col.hex
                          ? 'border-white scale-110 shadow-md ring-2 ring-white/20'
                          : 'border-transparent opacity-75'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-7 w-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>

            {/* Tagline & Vanity URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Card Tagline / Subtitle</label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. Connecting at Web Summit 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vanity URL Handle</label>
                <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400">
                  <span className="text-slate-500 font-mono text-[11px]">{typeof window !== 'undefined' ? window.location.host : 'youconnect.app'}/p/</span>
                  <input
                    type="text"
                    required
                    value={vanitySlug}
                    onChange={(e) => setVanitySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-transparent px-1 text-xs text-cyan-300 font-mono focus:outline-none"
                    placeholder="my-card"
                  />
                </div>
              </div>
            </div>

            {/* Default QR Output Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default QR Output Mode</label>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setQrMode('vcard')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    qrMode === 'vcard'
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Direct vCard Contact Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrMode('weblink')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    qrMode === 'weblink'
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Live Web Profile Card</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create & Activate Card Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
