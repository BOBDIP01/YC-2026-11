import React, { useState, useRef } from 'react';
import { MasterProfile, DigitalCard, CardTheme, ProfileCategory } from '../types';
import { DEFAULT_STORED_PICTURES, PROFILE_CATEGORIES } from '../data/presets';
import {
  X,
  Plus,
  User,
  Users,
  Briefcase,
  Heart,
  Trophy,
  Compass,
  Camera,
  Upload,
  Palette,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: MasterProfile;
  onCreatePersona: (newPersona: MasterProfile, matchingCard?: DigitalCard) => void;
}

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onCreatePersona,
}) => {
  const [creationMode, setCreationMode] = useState<'profile_context' | 'new_person'>('profile_context');

  const currentNameParts = (currentProfile.name || '').trim().split(/\s+/);
  const defaultCurrentFirst = currentProfile.personalData?.firstName || currentProfile.firstName || currentNameParts[0] || '';
  const defaultCurrentLast = currentProfile.personalData?.lastName || currentProfile.lastName || (currentNameParts.slice(1).join(' ') || '');
  const defaultCurrentEmail = currentProfile.email || currentProfile.personalData?.email || 'elena.advisory@cognitionos.ai';
  const defaultCurrentPhone = currentProfile.phone || currentProfile.personalData?.phone || '+1 (415) 890-3412';

  // Form Fields
  const [firstName, setFirstName] = useState(defaultCurrentFirst);
  const [lastName, setLastName] = useState(defaultCurrentLast);
  const [nickname, setNickname] = useState(currentProfile.nickname || '');
  const [pronouns, setPronouns] = useState(currentProfile.pronouns || 'she/her');
  const [gender, setGender] = useState(currentProfile.gender || 'Cisgender Woman');
  const [profileTitle, setProfileTitle] = useState('Angel & Tech Advisory');
  const [category, setCategory] = useState<ProfileCategory>('business');
  const [tag, setTag] = useState('Business');
  const [customTagInput, setCustomTagInput] = useState('');
  const [role, setRole] = useState('Angel Investor & Tech Advisor');
  const [company, setCompany] = useState('Elena Advisory / CognitionOS');
  const [headline, setHeadline] = useState('Angel investments in AI infrastructure and enterprise agent systems');
  const [email, setEmail] = useState(defaultCurrentEmail);
  const [phone, setPhone] = useState(defaultCurrentPhone);
  const [location, setLocation] = useState('San Francisco, CA');
  const [bio, setBio] = useState('Advising early-stage founders and participating in seed rounds across autonomous agent infrastructure.');
  const [avatarUrl, setAvatarUrl] = useState(
    currentProfile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80'
  );

  // Auto-create matching card toggle
  const [createMatchingCard, setCreateMatchingCard] = useState(true);
  const [cardTheme, setCardTheme] = useState<CardTheme>('cyber');
  const [cardAccent, setCardAccent] = useState('#06B6D4');
  const [cardTagline, setCardTagline] = useState('Angel Investments & Autonomous Systems');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && creationMode === 'profile_context') {
      const parts = (currentProfile.name || '').trim().split(/\s+/);
      setFirstName(currentProfile.personalData?.firstName || currentProfile.firstName || parts[0] || '');
      setLastName(currentProfile.personalData?.lastName || currentProfile.lastName || parts.slice(1).join(' ') || '');
      setEmail(currentProfile.email || currentProfile.personalData?.email || '');
      setPhone(currentProfile.phone || currentProfile.personalData?.phone || '');
    }
  }, [isOpen, currentProfile, creationMode]);

  if (!isOpen) return null;

  const handleModeChange = (mode: 'profile_context' | 'new_person') => {
    setCreationMode(mode);
    if (mode === 'profile_context') {
      setFirstName(defaultCurrentFirst);
      setLastName(defaultCurrentLast);
      setNickname(currentProfile.nickname || '');
      setPronouns(currentProfile.pronouns || 'she/her');
      setGender(currentProfile.gender || 'Cisgender Woman');
      setProfileTitle('Angel & Tech Advisory');
      setCategory('business');
      setTag('Advisory');
      setRole('Angel Investor & Tech Advisor');
      setCompany('Elena Advisory / CognitionOS');
      setHeadline('Angel investments in AI infrastructure and enterprise agent systems');
      setEmail(defaultCurrentEmail);
      setPhone(defaultCurrentPhone);
      setCardAccent('#06B6D4');
      setCardTheme('cyber');
      setCardTagline('Angel Investments & Autonomous Systems');
    } else {
      setFirstName('Marcus');
      setLastName('Brody');
      setNickname('Marc');
      setPronouns('he/him');
      setGender('Cisgender Man');
      setProfileTitle('Executive Operations & Chief of Staff');
      setCategory('business');
      setTag('Corporate');
      setRole('Chief of Staff & VP Operations');
      setCompany('CognitionOS Inc.');
      setHeadline('Scaling autonomous agent operations and strategic enterprise alliances');
      setEmail('marcus@cognitionos.ai');
      setPhone('+1 (415) 890-4419');
      setLocation('San Francisco, CA');
      setBio('Direct contact for executive scheduling, operational workflows, and corporate partnership coordination.');
      setAvatarUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80');
      setCardAccent('#6366F1');
      setCardTheme('executive');
      setCardTagline('Executive Operations & Strategic Alliances');
    }
  };

  const handleCategorySelect = (catId: ProfileCategory) => {
    setCategory(catId);
    const catConfig = PROFILE_CATEGORIES.find((c) => c.id === catId);
    if (catConfig && catConfig.tags.length > 0) {
      setTag(catConfig.tags[0]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'New Contact';
    const resolvedTitle = profileTitle.trim() || 'Personal Card';

    const finalTag = customTagInput.trim() || tag;
    const newId = `persona-${Date.now()}`;
    const slug = `${resolvedName.toLowerCase().replace(/\s+/g, '-')}-${resolvedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}`.slice(0, 32);

    const newPersona: MasterProfile = {
      id: newId,
      name: resolvedName,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      nickname: nickname.trim() || undefined,
      pronouns: pronouns.trim() || undefined,
      gender: gender.trim() || undefined,
      role: role.trim(),
      company: company.trim() || resolvedTitle,
      profileTitle: resolvedTitle,
      category,
      tag: finalTag,
      circleName: resolvedTitle,
      headline: headline.trim() || `${role} at ${company}`,
      email: email.trim(),
      phone: phone.trim(),
      website: `https://${slug}.youconnect.app`,
      location: location.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl || currentProfile.avatarUrl,
      socials: { ...currentProfile.socials },
      isVerified: true,
      verifiedAt: new Date().toISOString(),
      ccpaDoNotSell: true,
      aiCredits: 250,
      personalData: currentProfile.personalData ? {
        ...currentProfile.personalData,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        fullName: resolvedName,
        email: email.trim() || currentProfile.personalData.email,
        phone: phone.trim() || currentProfile.personalData.phone,
        nickname: nickname.trim() || currentProfile.personalData.nickname,
      } : {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        fullName: resolvedName,
        email: email.trim(),
        phone: phone.trim(),
        socials: {},
      },
      workData: {
        role: role.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        website: `https://${slug}.youconnect.app`,
      },
      rubricaFields: [...(currentProfile.rubricaFields || [])],
      storedPictures: currentProfile.storedPictures || DEFAULT_STORED_PICTURES,
    };

    let matchingCard: DigitalCard | undefined;
    if (createMatchingCard) {
      matchingCard = {
        id: `card-${Date.now()}`,
        name: profileTitle.trim(),
        category,
        tag: finalTag,
        theme: cardTheme,
        accentColor: cardAccent,
        customTagline: cardTagline.trim() || headline.trim(),
        vanitySlug: slug,
        qrMode: 'vcard',
        holderFirstName: firstName.trim() || undefined,
        holderLastName: lastName.trim() || undefined,
        holderFullName: resolvedName || undefined,
        holderEmail: email.trim() || undefined,
        holderPhone: phone.trim() || undefined,
        visibleFields: {
          role: true,
          company: true,
          department: true,
          phone: true,
          personalPhone: category === 'personal' || category === 'hobby_sport',
          email: true,
          personalEmail: category === 'personal',
          website: true,
          location: true,
          officeAddress: category === 'business',
          homeAddress: category === 'personal',
          bio: true,
          socials: true,
          rubrica: true,
        },
      };
    }

    onCreatePersona(newPersona, matchingCard);
    onClose();
  };

  const activeCategoryConfig = PROFILE_CATEGORIES.find((c) => c.id === category) || PROFILE_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600/20 p-2 text-indigo-400 border border-indigo-500/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Create Profile / Person Identity</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  No Preset Circle Limits
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Create a tailored persona context for your needs, or register a distinct individual (colleague, assistant, partner).
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
          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange('profile_context')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition ${
                creationMode === 'profile_context'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Tailored Profile for {currentProfile.name.split(' ')[0]}</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('new_person')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition ${
                creationMode === 'new_person'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Brand New Person / Team Member</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 4 Standard Categories & Tag */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Profile Category (4 Clean Clusters)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cluster this profile to keep contacts orderly without endless scattered circles.
                </p>
              </div>

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
                          ? 'border-indigo-400 bg-indigo-950/50 text-white shadow-md ring-1 ring-indigo-500/30'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                      </div>
                      <div className="text-xs font-bold text-slate-100">{cat.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cat.badge}</div>
                    </button>
                  );
                })}
              </div>

              {/* Tags */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Category Tag (Business, Work, Hobby, Family, Personal, Sport, Game, or Custom)
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
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  placeholder="Or type custom tag (e.g. #PadelClub, #BoardOfDirectors)..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Profile Identity Details (All Voluntary & Flexible) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Identity & Contact Coordinates
                </span>
                <span className="text-[11px] text-slate-400">
                  All fields are optional
                </span>
              </div>

              {/* Name Coordinates: First Name, Last Name & Nickname */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    First Name <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Elena"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Last Name <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Rostova"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nickname / Preferred Name <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Ellie, Marc, Alex"
                  />
                </div>
              </div>

              {/* LGBTQ+ Inclusive Gender & Pronouns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gender (LGBTQ+ Inclusive) <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
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
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pronouns <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <select
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="she/her">she / her</option>
                    <option value="they/them">they / them</option>
                    <option value="he/him">he / him</option>
                    <option value="she/they">she / they</option>
                    <option value="he/they">he / they</option>
                    <option value="ze/zir">ze / zir</option>
                    <option value="any pronouns">any pronouns</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Profile / Card Label & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Profile / Card Label <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-medium focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Angel Advisory, Sunday Padel, Elena Direct"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Role / Context Title <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Founder, Member, Consultant"
                  />
                </div>
              </div>

              {/* Company & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Company / Organization / Club <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. CognitionOS, Bay Racket Club"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Location / City <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Direct Email <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="contact@domain.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Direct Telephone <span className="text-[10px] text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder="+1 (415) 000-0000"
                  />
                </div>
              </div>

              {/* Headline & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Headline / Bio Summary
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="Brief 1-sentence summary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>

              {/* Profile Photo */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="h-14 w-14 rounded-xl object-cover border-2 border-indigo-500/50 shadow"
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Custom Photo</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      You can also pick headshots or generate AI portraits from the Avatar Vault anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-create Matching Digital Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">Create Companion Digital Card</span>
                  <p className="text-[11px] text-slate-400">
                    Instantly generates a shareable virtual business card with NFC and QR support.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={createMatchingCard}
                  onChange={(e) => setCreateMatchingCard(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {createMatchingCard && (
                <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Card Theme</label>
                    <select
                      value={cardTheme}
                      onChange={(e) => setCardTheme(e.target.value as CardTheme)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="cyber">Cyber Cyan</option>
                      <option value="executive">Executive Obsidian</option>
                      <option value="creative">Creative Magenta</option>
                      <option value="minimal">Titanium Minimal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Card Subtitle Tagline</label>
                    <input
                      type="text"
                      value={cardTagline}
                      onChange={(e) => setCardTagline(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      placeholder="e.g. Angel Investments & Advisory"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create & Activate Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
