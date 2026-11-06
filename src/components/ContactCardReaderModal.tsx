import React, { useState } from 'react';
import { CRMContact, MasterProfile, DigitalCard } from '../types';
import { DigitalCardRenderer } from './DigitalCardRenderer';
import { COVER_BANNER_PRESETS } from '../data/presets';
import {
  X,
  CreditCard,
  ShieldCheck,
  Briefcase,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building,
  Sparkles,
  ExternalLink,
  Calendar,
  Tag,
  CheckCircle2,
  Layers,
  UserCheck,
  Heart,
  Share2,
} from 'lucide-react';

export function buildCardAndProfileFromContact(contact: CRMContact): {
  profile: MasterProfile;
  card: DigitalCard;
} {
  const firstName = contact.firstName || contact.name.split(' ')[0] || contact.name;
  const lastName = contact.lastName || contact.name.split(' ').slice(1).join(' ') || '';
  const sc = contact.sharedCard || {};

  const profile: MasterProfile = {
    id: `profile-${contact.id}`,
    name: contact.name,
    firstName,
    lastName,
    role: contact.role || 'Executive',
    company: contact.company || 'Organization',
    profileTitle: sc.cardName || `${contact.name} (${contact.company || 'YouConnect'})`,
    category: contact.category === 'business' ? 'business' : contact.category === 'club' ? 'hobby_sport' : 'personal',
    tag: sc.tag || (contact.category === 'business' ? 'Business' : contact.category === 'club' ? 'Sport' : 'Personal'),
    circleName: contact.selectiveSyncInfo?.senderCircle || sc.cardName || 'YouConnect Shared Card',
    headline:
      contact.headline ||
      sc.customTagline ||
      `${contact.role || 'Leader'} at ${contact.company || 'Enterprise'}`,
    email: contact.email || contact.personalEmail || '',
    phone: contact.phone || contact.personalPhone || '',
    website: contact.website || '',
    location: contact.location || contact.officeAddress || contact.homeAddress || 'San Francisco, CA',
    bio:
      contact.bio ||
      contact.notes ||
      `${contact.name} (${contact.role || 'Professional'} at ${contact.company || 'YouConnect Network'}).`,
    avatarUrl:
      contact.avatarUrl ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    socials: contact.socials || {},
    isVerified: Boolean(contact.selectiveSyncInfo?.isSynced),
    ccpaDoNotSell: false,
    aiCredits: 0,
    personalData: {
      firstName,
      lastName,
      fullName: contact.name,
      phone: contact.personalPhone || contact.phone || '',
      email: contact.personalEmail || contact.email || '',
      birthday: contact.birthday,
      address: contact.homeAddress
        ? {
            street: contact.homeAddress,
            city: contact.location || '',
            state: '',
            zip: '',
            country: '',
          }
        : undefined,
      emergencyContact: contact.isEmergencyContact
        ? {
            name: contact.name,
            relationship: contact.emergencyRelationship || 'Emergency Contact (ICE)',
            phone: contact.personalPhone || contact.phone || '',
          }
        : undefined,
      bio: contact.bio || contact.notes || '',
      socials: contact.socials || {},
    },
    workData: {
      role: contact.role || '',
      company: contact.company || '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      website: contact.website || '',
      officeAddress: contact.officeAddress
        ? {
            street: contact.officeAddress,
            city: contact.location || '',
            state: '',
            zip: '',
            country: '',
          }
        : undefined,
      taxIdOrVat: contact.taxIdOrVat,
      headline: contact.headline || sc.customTagline || '',
      bio: contact.bio || contact.notes || '',
      socials: contact.socials || {},
      companyLogoUrl: sc.companyLogoUrl,
    },
    rubricaFields: contact.rubricaFields || [],
  };

  const socials = contact.socials || {};

  const card: DigitalCard = {
    id: `card-contact-${contact.id}`,
    name: sc.cardName || `${contact.name} · Shared Card`,
    category: contact.category === 'business' ? 'business' : contact.category === 'club' ? 'hobby_sport' : 'personal',
    tag: sc.tag || (contact.category === 'business' ? 'Business' : contact.category === 'club' ? 'Sport' : 'Personal'),
    theme: (sc.theme as DigitalCard['theme']) || (contact.category === 'business' ? 'forged_carbon' : contact.category === 'club' ? 'brushed_titanium' : 'aurora_glass'),
    materialFinish: (sc.materialFinish as DigitalCard['materialFinish']) || 'forged_carbon',
    accentColor: sc.accentColor || (contact.category === 'business' ? '#6366F1' : contact.category === 'club' ? '#10B981' : '#F43F5E'),
    layoutStyle: sc.layoutStyle || 'editorial_masthead',
    customTagline:
      sc.customTagline ||
      contact.headline ||
      `${contact.role || 'Executive'} · ${contact.company || 'YouConnect'}`,
    vanitySlug: sc.vanitySlug || contact.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    qrMode: 'vcard',
    avatarOffsetX: sc.avatarOffsetX ?? 0,
    avatarOffsetY: sc.avatarOffsetY ?? 18,
    avatarZoom: sc.avatarZoom ?? 1,
    coverBannerUrl: sc.coverBannerUrl || COVER_BANNER_PRESETS[0].url,
    companyLogoUrl: sc.companyLogoUrl,
    sharedRubricaFieldIds: (contact.rubricaFields || []).map((rf) => rf.id),
    visibleFields: {
      role: Boolean(contact.role),
      company: Boolean(contact.company),
      department: Boolean(contact.department),
      phone: Boolean(contact.phone),
      personalPhone: Boolean(contact.personalPhone),
      email: Boolean(contact.email),
      personalEmail: Boolean(contact.personalEmail),
      website: Boolean(contact.website),
      location: Boolean(contact.location),
      officeAddress: Boolean(contact.officeAddress),
      homeAddress: Boolean(contact.homeAddress),
      taxIdOrVat: Boolean(contact.taxIdOrVat),
      birthday: Boolean(contact.birthday),
      emergencyContact: Boolean(contact.isEmergencyContact),
      bio: Boolean(contact.bio || contact.notes),
      socials: Object.values(socials).some(Boolean),
      linkedin: Boolean(socials.linkedin),
      twitter: Boolean(socials.twitter),
      github: Boolean(socials.github),
      calendly: Boolean(socials.calendly),
      whatsapp: Boolean(socials.whatsapp),
      telegram: Boolean(socials.telegram),
      instagram: Boolean(socials.instagram),
      youtube: Boolean(socials.youtube),
      substack: Boolean(socials.substack),
      medium: Boolean(socials.medium),
      rubrica: Boolean(contact.rubricaFields && contact.rubricaFields.length > 0),
    },
    spatialParallax: true,
    livePresence: {
      enabled: true,
      statusText:
        sc.livePresenceStatus ||
        `${contact.selectiveSyncInfo?.senderCircle || 'YouConnect Synced'} · ${contact.location || 'Active'}`,
      availability: 'available',
      timezone: 'America/Los_Angeles',
    },
    storySpotlight: sc.storySpotlight || {
      title: `${contact.company || contact.name} — Shared Overview`,
      subtitle:
        contact.bio ||
        contact.headline ||
        contact.notes ||
        `Connected via YouConnect (${contact.source.toUpperCase()})`,
      badge: 'SHARED YOUCONNECT PROFILE',
      metricLabel: 'Shared Attributes',
      metricValue: `${(contact.selectiveSyncInfo?.sharedFieldsList?.length || 6)} Verified Fields`,
    },
  };

  return { profile, card };
}

interface ContactCardReaderModalProps {
  contact: CRMContact | null;
  onClose: () => void;
  onSyncOrPromoteToCRM?: (contact: CRMContact) => void;
}

export const ContactCardReaderModal: React.FC<ContactCardReaderModalProps> = ({
  contact,
  onClose,
  onSyncOrPromoteToCRM,
}) => {
  const [activeTab, setActiveTab] = useState<'interactive_card' | 'full_shared_data'>('interactive_card');

  if (!contact) return null;

  const { profile, card } = buildCardAndProfileFromContact(contact);
  const socialEntries = Object.entries(contact.socials || {}).filter(
    ([_, val]) => typeof val === 'string' && val.trim().length > 0
  ) as [string, string][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md animate-fade-in">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src={profile.avatarUrl}
              alt={contact.name}
              className="h-11 w-11 rounded-xl object-cover ring-2 ring-indigo-500/40"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">{contact.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>
                    {contact.selectiveSyncInfo?.isSynced
                      ? `YouConnect Synced v${contact.selectiveSyncInfo.version || 1}`
                      : 'Rubrica Digital Card'}
                  </span>
                </span>
                {contact.isBusinessCRM && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    <Briefcase className="h-3 w-3" />
                    <span>Active in Business CRM</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {contact.role} {contact.company ? `@ ${contact.company}` : ''} ·{' '}
                <span className="text-indigo-300 font-medium">
                  {contact.selectiveSyncInfo?.senderCircle || card.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch between Live Digital Card and Full Shared Dataset */}
            <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('interactive_card')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'interactive_card'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Live Digital Card</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('full_shared_data')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'full_shared_data'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Full Shared Data ({socialEntries.length + (contact.rubricaFields?.length || 0) + 8})</span>
              </button>
            </div>

            {onSyncOrPromoteToCRM && !contact.isBusinessCRM && (
              <button
                type="button"
                onClick={() => onSyncOrPromoteToCRM(contact)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Import Full Card to CRM</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'interactive_card' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 cols: Full Interactive Digital Card Renderer */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div className="w-full max-w-xl">
                  <DigitalCardRenderer
                    profile={profile}
                    card={card}
                    interactive={true}
                    recipientMode={true}
                    showRecipientActions={false}
                  />
                </div>
              </div>

              {/* Right 5 cols: Shared Card Summary & Socials */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" />
                      <span>YouConnect Shared Payload</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Source: {contact.source.toUpperCase()}
                    </span>
                  </div>

                  {contact.headline && (
                    <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3">
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Shared Headline / Tagline
                      </div>
                      <p className="text-xs font-medium text-slate-200 mt-0.5">
                        "{contact.headline}"
                      </p>
                    </div>
                  )}

                  {contact.bio && (
                    <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3">
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        Shared Biography
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        {contact.bio}
                      </p>
                    </div>
                  )}

                  {/* All Shared Coordinates */}
                  <div className="space-y-2 pt-1 text-xs">
                    {contact.email && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Work Email</span>
                        <a href={`mailto:${contact.email}`} className="text-indigo-400 hover:underline font-mono">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.personalEmail && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Personal Email</span>
                        <a href={`mailto:${contact.personalEmail}`} className="text-indigo-400 hover:underline font-mono">
                          {contact.personalEmail}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Work Phone</span>
                        <a href={`tel:${contact.phone}`} className="text-slate-200 font-mono">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.personalPhone && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Personal Mobile</span>
                        <a href={`tel:${contact.personalPhone}`} className="text-emerald-300 font-mono">
                          {contact.personalPhone}
                        </a>
                      </div>
                    )}
                    {contact.department && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Department</span>
                        <span className="text-slate-200">{contact.department}</span>
                      </div>
                    )}
                    {contact.officeAddress && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60 gap-4">
                        <span className="text-slate-400 shrink-0">Office Address</span>
                        <span className="text-slate-200 text-right">{contact.officeAddress}</span>
                      </div>
                    )}
                    {contact.homeAddress && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60 gap-4">
                        <span className="text-slate-400 shrink-0">Home Address</span>
                        <span className="text-slate-200 text-right">{contact.homeAddress}</span>
                      </div>
                    )}
                    {contact.taxIdOrVat && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Tax ID / VAT</span>
                        <span className="text-slate-200 font-mono">{contact.taxIdOrVat}</span>
                      </div>
                    )}
                    {contact.birthday && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Birthday</span>
                        <span className="text-slate-200 font-mono">{contact.birthday}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connected Social Profiles */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Shared Social Profiles ({socialEntries.length})
                  </div>
                  {socialEntries.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {socialEntries.map(([platform, val]) => {
                        const href = val.startsWith('http')
                          ? val
                          : platform === 'twitter'
                          ? `https://x.com/${val.replace('@', '')}`
                          : platform === 'instagram'
                          ? `https://instagram.com/${val.replace('@', '')}`
                          : platform === 'telegram'
                          ? `https://t.me/${val.replace('@', '')}`
                          : platform === 'whatsapp'
                          ? `https://wa.me/${val.replace(/[^0-9]/g, '')}`
                          : `https://${val}`;
                        return (
                          <a
                            key={platform}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs hover:border-cyan-500/40 hover:bg-slate-900 transition"
                          >
                            <div>
                              <div className="text-[10px] font-bold uppercase text-cyan-400">
                                {platform}
                              </div>
                              <div className="text-slate-200 truncate max-w-[150px] font-mono text-[11px]">
                                {val}
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 text-slate-500 shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No social handles shared on this card.</p>
                  )}
                </div>

                {/* Custom Rubrica Fields Shared */}
                {contact.rubricaFields && contact.rubricaFields.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Shared Custom Attributes ({contact.rubricaFields.length})
                    </div>
                    <div className="space-y-1.5">
                      {contact.rubricaFields.map((rf) => (
                        <div
                          key={rf.id}
                          className="flex items-center justify-between rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-1.5 text-xs"
                        >
                          <span className="text-slate-400">{rf.label}:</span>
                          <span className="font-mono text-slate-200 font-medium">{rf.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Full Shared Data Tab */
            <div className="space-y-6">
              {contact.selectiveSyncInfo?.isSynced && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>
                        Selective Sharing Sync Manifest · {contact.selectiveSyncInfo.senderCircle}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Last Synced: {new Date(contact.selectiveSyncInfo.lastSyncedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.selectiveSyncInfo.sharedFieldsList.map((field, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 text-xs font-mono text-emerald-200"
                      >
                        ✓ {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Work & Executive Data Shared
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Full Name:</span>
                      <span className="text-white font-semibold">{contact.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Role / Title:</span>
                      <span className="text-slate-200">{contact.role || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Department:</span>
                      <span className="text-slate-200">{contact.department || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Company / Entity:</span>
                      <span className="text-slate-200">{contact.company || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Work Email:</span>
                      <span className="text-indigo-400 font-mono">{contact.email || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Work Phone:</span>
                      <span className="text-slate-200 font-mono">{contact.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Office Address:</span>
                      <span className="text-slate-200">{contact.officeAddress || contact.location || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Tax ID / VAT:</span>
                      <span className="text-slate-200 font-mono">{contact.taxIdOrVat || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Personal, Club & Emergency Data Shared
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Personal Mobile:</span>
                      <span className="text-slate-200 font-mono">{contact.personalPhone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Personal Email:</span>
                      <span className="text-slate-200 font-mono">{contact.personalEmail || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Home Address:</span>
                      <span className="text-slate-200">{contact.homeAddress || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Birthday:</span>
                      <span className="text-slate-200 font-mono">{contact.birthday || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Emergency (ICE) Status:</span>
                      <span className="text-rose-300 font-semibold">
                        {contact.isEmergencyContact
                          ? `Yes (${contact.emergencyRelationship || 'Primary ICE'})`
                          : 'Standard Contact'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Card Theme & Layout:</span>
                      <span className="text-slate-200 font-mono">
                        {card.theme} · {card.layoutStyle}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
