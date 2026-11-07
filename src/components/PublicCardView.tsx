import React, { useState, useEffect } from 'react';
import { MasterProfile, DigitalCard, CRMContact } from '../types';
import { DigitalCardRenderer } from './DigitalCardRenderer';
import { generateVCardString, downloadVCard } from '../utils/vcard';
import { apiFetch } from '../utils/apiConfig';
import {
  Download,
  Phone,
  Mail,
  Globe,
  Share2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Send,
  Linkedin,
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  Info,
  ChevronDown,
  Building,
  Briefcase,
  AlertCircle,
  QrCode,
  ArrowLeft,
  Play,
  Video,
} from 'lucide-react';
import { getVideoEmbedUrl } from '../utils/mediaHelper';

interface PublicCardViewProps {
  card: DigitalCard;
  profile: MasterProfile;
  onExitToStudio?: () => void;
  onAddReciprocalContact?: (contact: CRMContact) => void;
}

export const PublicCardView: React.FC<PublicCardViewProps> = ({
  card,
  profile,
  onExitToStudio,
  onAddReciprocalContact,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showExchangeForm, setShowExchangeForm] = useState(false);
  const [exchangeSubmitted, setExchangeSubmitted] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [exchangeData, setExchangeData] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    phone: '',
    notes: '',
  });

  const videoIntro = card.videoIntroUrl || profile.videoIntroUrl;
  const videoInfo = getVideoEmbedUrl(videoIntro);

  const primaryCta = card.primaryCta || {
    type: 'save_contact',
    label: 'Save Contact to Phone',
  };

  // Security sanitizer to block javascript:/vbscript:/data:text/html DOM XSS vectors in external CTAs
  const sanitizeSafeExternalUrl = (rawUrl: string | undefined | null, fallback = ''): string => {
    if (!rawUrl || typeof rawUrl !== 'string') return fallback;
    const trimmed = rawUrl.trim();
    if (/^(javascript|vbscript|data:text\/html)/i.test(trimmed)) return fallback;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) return `https://${trimmed}`;
    return fallback;
  };

  // Handle direct vCard import to smartphone Contacts app
  const handleSaveContact = () => {
    const vcardStr = generateVCardString(profile, card);
    downloadVCard(`${profile.name}_${card.name}`, vcardStr);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handleExecutePrimary = () => {
    switch (primaryCta.type) {
      case 'book_meeting': {
        const target = sanitizeSafeExternalUrl(
          primaryCta.url || profile.socials?.calendly || profile.workData?.socials?.calendly,
          'https://calendly.com'
        );
        if (target) window.open(target, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'whatsapp': {
        const waNum = primaryCta.url || profile.socials?.whatsapp || profile.personalData?.phone || profile.phone;
        const cleanNum = waNum.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNum}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'send_email': {
        window.location.href = `mailto:${primaryCta.url || profile.workData?.email || profile.email}`;
        break;
      }
      case 'call': {
        window.location.href = `tel:${primaryCta.url || profile.workData?.phone || profile.phone}`;
        break;
      }
      case 'watch_video': {
        setIsPlayingVideo(true);
        break;
      }
      case 'visit_website':
      case 'custom': {
        const safeTarget = sanitizeSafeExternalUrl(primaryCta.url);
        if (safeTarget) window.open(safeTarget, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'save_contact':
      default: {
        handleSaveContact();
        break;
      }
    }
  };

  // Handle recipient submitting their reciprocal contact details
  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeData.name.trim() || (!exchangeData.email.trim() && !exchangeData.phone.trim())) {
      return;
    }

    const newContact: CRMContact = {
      id: `c-mobile-recip-${Date.now()}`,
      name: exchangeData.name.trim(),
      role: exchangeData.role.trim() || 'Connection',
      company: exchangeData.company.trim() || 'Networking Lead',
      email: exchangeData.email.trim(),
      phone: exchangeData.phone.trim(),
      notes: `Met via digital card "${card.name}". ${exchangeData.notes}`.trim(),
      source: 'qr',
      status: 'new',
      tags: ['Mobile QR Scan', card.tag || 'Business'],
      createdAt: new Date().toISOString(),
    };

    if (onAddReciprocalContact) {
      onAddReciprocalContact(newContact);
    }

    // Also send to server reciprocal endpoint
    try {
      await apiFetch('/api/cards/reciprocal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          contact: newContact,
        }),
      });
    } catch (err) {
      console.warn('Could not post reciprocal contact:', err);
    }

    setExchangeSubmitted(true);
    setExchangeData({ name: '', role: '', company: '', email: '', phone: '', notes: '' });
  };

  const showPhone = card.visibleFields.phone && profile.phone;
  const showEmail = card.visibleFields.email && profile.email;
  const showWebsite = card.visibleFields.website && profile.website;
  const showLinkedin = card.visibleFields.socials && profile.socials?.linkedin;
  const showCalendly = card.visibleFields.socials && profile.socials?.calendly;
  const showEmergency = card.visibleFields.emergencyContact && profile.personalData?.emergencyContact;

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-white pb-12">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#070B14]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
              YC
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight flex items-center gap-1">
                <span>YouConnect</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  Card
                </span>
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="h-2.5 w-2.5" />
                <span>Verified Direct Profile</span>
              </span>
            </div>
          </div>

          {onExitToStudio && (
            <button
              onClick={onExitToStudio}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 transition"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Open Studio</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-5 space-y-5">
        {/* Card Presentation (Recipient View: 3D Card & Story Deck only — No Owner QR or Pass) */}
        <div className="w-full">
          <DigitalCardRenderer
            profile={profile}
            card={card}
            interactive={true}
            recipientMode={true}
            initialLayout={card.preferredLayout === 'story_deck' ? 'story_deck' : 'card_3d'}
          />
        </div>

        {/* Primary Action Button */}
        <div className="space-y-2">
          <button
            onClick={handleExecutePrimary}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 active:scale-[0.99] transition"
          >
            {primaryCta.type === 'book_meeting' ? (
              <Calendar className="h-4 w-4" />
            ) : primaryCta.type === 'watch_video' ? (
              <Play className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{primaryCta.label || 'Save Contact to Phone'}</span>
          </button>

          {/* Secondary Save Contact button if primary is Calendly/WhatsApp/etc */}
          {primaryCta.type !== 'save_contact' && (
            <button
              onClick={handleSaveContact}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5 text-indigo-400" />
              <span>Also Download vCard Contact</span>
            </button>
          )}

          {downloadSuccess && (
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Contact downloaded! Open file to add directly to your address book.</span>
            </div>
          )}
        </div>

        {/* Video Business Card Greeting / Pitch Player */}
        {videoIntro && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {card.videoTitle || 'Video Business Card Introduction'}
                  </h4>
                  <p className="text-[10px] text-slate-400">Personal Video Greeting</p>
                </div>
              </div>
              <button
                onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/30 flex items-center gap-1 transition"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{isPlayingVideo ? 'Hide' : 'Watch'}</span>
              </button>
            </div>

            {isPlayingVideo && (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 animate-in fade-in">
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
                      href={sanitizeSafeExternalUrl(videoIntro, '#')}
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
            )}
          </div>
        )}

        {/* Quick Action Grid */}
        <div className="grid grid-cols-4 gap-2">
          {showPhone ? (
            <a
              href={`tel:${profile.phone}`}
              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white transition group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                <Phone className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold">Call</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-900 bg-slate-950/40 text-slate-600 opacity-40">
              <div className="h-8 w-8 rounded-lg bg-slate-800/20 text-slate-600 flex items-center justify-center mb-1">
                <Phone className="h-4 w-4" />
              </div>
              <span className="text-[10px]">Call</span>
            </div>
          )}

          {showEmail ? (
            <a
              href={`mailto:${profile.email}`}
              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white transition group"
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold">Email</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-900 bg-slate-950/40 text-slate-600 opacity-40">
              <div className="h-8 w-8 rounded-lg bg-slate-800/20 text-slate-600 flex items-center justify-center mb-1">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-[10px]">Email</span>
            </div>
          )}

          {showLinkedin ? (
            <a
              href={profile.socials?.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white transition group"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                <Linkedin className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold">LinkedIn</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-900 bg-slate-950/40 text-slate-600 opacity-40">
              <div className="h-8 w-8 rounded-lg bg-slate-800/20 text-slate-600 flex items-center justify-center mb-1">
                <Linkedin className="h-4 w-4" />
              </div>
              <span className="text-[10px]">LinkedIn</span>
            </div>
          )}

          {showWebsite ? (
            <a
              href={profile.website?.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white transition group"
            >
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold">Website</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-slate-900 bg-slate-950/40 text-slate-600 opacity-40">
              <div className="h-8 w-8 rounded-lg bg-slate-800/20 text-slate-600 flex items-center justify-center mb-1">
                <Globe className="h-4 w-4" />
              </div>
              <span className="text-[10px]">Website</span>
            </div>
          )}
        </div>

        {/* Meeting Booking (Calendly) if active */}
        {showCalendly && (
          <a
            href={profile.socials?.calendly}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl border border-indigo-800/50 bg-indigo-950/30 hover:bg-indigo-950/50 transition group text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-white">Schedule 1-on-1 Meeting</div>
                <div className="text-[10px] text-slate-400">Book directly on {profile.name}'s calendar</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-indigo-400 group-hover:translate-x-0.5 transition" />
          </a>
        )}

        {/* Reciprocal Exchange ("Share Your Info Back") */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg">
          <button
            onClick={() => setShowExchangeForm(!showExchangeForm)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/40 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Share Your Contact Back</div>
                <div className="text-[10px] text-slate-400">Send your details directly to {profile.name}</div>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${showExchangeForm ? 'rotate-180' : ''}`}
            />
          </button>

          {showExchangeForm && (
            <div className="p-4 pt-1 border-t border-slate-800/80 bg-slate-950/60 space-y-3 animate-in fade-in">
              {exchangeSubmitted ? (
                <div className="py-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-white">Details Sent Successfully!</div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {profile.name} has received your contact card in their YouConnect address book.
                  </p>
                  <button
                    onClick={() => setExchangeSubmitted(false)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium pt-1"
                  >
                    Send another update
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExchangeSubmit} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Miller"
                      value={exchangeData.name}
                      onChange={(e) => setExchangeData({ ...exchangeData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Company / Org</label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp"
                        value={exchangeData.company}
                        onChange={(e) => setExchangeData({ ...exchangeData, company: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Partner"
                        value={exchangeData.role}
                        onChange={(e) => setExchangeData({ ...exchangeData, role: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="you@email.com"
                        value={exchangeData.email}
                        onChange={(e) => setExchangeData({ ...exchangeData, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Phone</label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={exchangeData.phone}
                        onChange={(e) => setExchangeData({ ...exchangeData, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Quick Note</label>
                    <input
                      type="text"
                      placeholder="e.g. Great meeting you at the conference!"
                      value={exchangeData.notes}
                      onChange={(e) => setExchangeData({ ...exchangeData, notes: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-600/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send My Contact Card</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Directory & Selective Sharing Details */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-indigo-400" />
              <span>Professional Details</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Selective Sharing</span>
          </div>

          <div className="space-y-2 text-slate-300">
            {profile.company && (
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Organization:</span>
                <span className="font-medium text-white">{profile.company}</span>
              </div>
            )}
            {profile.role && (
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Title / Role:</span>
                <span className="font-medium text-white">{profile.role}</span>
              </div>
            )}
            {profile.location && card.visibleFields.location && (
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
                <span className="text-slate-400">Headquarters / Location:</span>
                <span className="font-medium text-white">{profile.location}</span>
              </div>
            )}

            {/* Emergency Contact if enabled (Personal circle) */}
            {showEmergency && (
              <div className="mt-3 p-3 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                  <span>Emergency ICE Contact</span>
                </div>
                <div className="text-[11px]">
                  <strong>{profile.personalData?.emergencyContact?.name}</strong> (
                  {profile.personalData?.emergencyContact?.relationship}):{' '}
                  <a
                    href={`tel:${profile.personalData?.emergencyContact?.phone}`}
                    className="underline text-rose-300 hover:text-white"
                  >
                    {profile.personalData?.emergencyContact?.phone}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio / About */}
        {card.visibleFields.bio && profile.bio && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-2 text-xs">
            <span className="font-bold text-white">About {profile.name}</span>
            <p className="text-slate-400 leading-relaxed text-[11px]">{profile.bio}</p>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md mx-auto w-full px-4 pt-6 text-center space-y-2">
        <div className="text-[10px] text-slate-400">
          Powered by <strong className="text-slate-300">YouConnect</strong> Digital Identity Architecture
        </div>
        <div className="flex items-center justify-center gap-3 text-[10px] text-indigo-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Encrypted vCard 3.0
          </span>
          <span>·</span>
          <span>NFC & Instant QR Ready</span>
        </div>
      </footer>
    </div>
  );
};
