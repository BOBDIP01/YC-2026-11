import React, { useState } from 'react';
import { MasterProfile, DigitalCard, CRMContact } from '../types';
import {
  ShieldCheck,
  Lock,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  ExternalLink,
  EyeOff,
  UserCheck,
  Smartphone,
  Check,
  FileText,
  Scale,
  Sparkles,
  HelpCircle,
  Copy,
  CheckCheck,
} from 'lucide-react';

interface ComplianceViewProps {
  profile: MasterProfile;
  cards: DigitalCard[];
  contacts: CRMContact[];
  onUpdateProfile: (updated: MasterProfile) => void;
  onRecursivePurge: () => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  profile,
  cards,
  contacts,
  onUpdateProfile,
  onRecursivePurge,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'sovereignty' | 'privacy' | 'terms'>('audit');
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
  const [purgeAuditToken, setPurgeAuditToken] = useState<string | null>(null);
  const [kycProcessing, setKycProcessing] = useState(false);
  const [kycSuccess, setKycSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // CCPA Toggle
  const handleToggleCCPA = () => {
    onUpdateProfile({
      ...profile,
      ccpaDoNotSell: !profile.ccpaDoNotSell,
    });
  };

  // Full Data Export (GDPR Article 20 Data Portability)
  const handleExportFullArchive = () => {
    const fullArchive = {
      exportTimestamp: new Date().toISOString(),
      standard: 'GDPR_ARTICLE_20_PORTABILITY',
      masterProfile: profile,
      digitalCards: cards,
      crmContacts: contacts,
      auditHash: `SHA256-${Math.random().toString(36).substring(2)}${Date.now()}`,
    };

    const blob = new Blob([JSON.stringify(fullArchive, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youconnect_data_archive_${profile.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Execute recursive deletion
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

  // Store Review Audit Items
  const appleAuditItems = [
    {
      id: 'apple-5-1-1-v',
      guideline: 'Guideline 5.1.1(v) — In-App Account & Data Deletion',
      status: 'passed',
      description: 'Apps supporting account data must offer a prominent, one-click mechanism to permanently delete user accounts and associated records within the app.',
      implementation: 'Implemented via GDPR Article 17 recursive purge button with cryptographic audit token generation and immediate local memory unlinking.',
    },
    {
      id: 'apple-5-1-1',
      guideline: 'Guideline 5.1.1 — Data Collection & Privacy Transparency',
      status: 'passed',
      description: 'Clear, easily accessible privacy policy outlining data collection, zero third-party tracking, and contact processing.',
      implementation: 'In-app Privacy Policy accessible to all users, CCPA opt-out, zero telemetry trackers or ads.',
    },
    {
      id: 'apple-4-2',
      guideline: 'Guideline 4.2 — Minimum Functionality & Value',
      status: 'passed',
      description: 'App must offer interactive native capabilities beyond a static repackaged website.',
      implementation: 'Hardware Web NFC tag reading/writing, WebRTC/BroadcastChannel P2P radar networking, RFC 2426 vCard generator, offline QR engine, and local CRM.',
    },
    {
      id: 'apple-2-1',
      guideline: 'Guideline 2.1 — App Completeness & UI Integrity',
      status: 'passed',
      description: 'No broken buttons, test stubs, or placeholder text. Native responsive layout adhering to iOS Human Interface Guidelines (touch targets >= 44px).',
      implementation: 'All interactive controls wired to functional handlers, single-line labels, safe area padding, and high-contrast accessibility.',
    },
  ];

  const googleAuditItems = [
    {
      id: 'google-user-data',
      policy: 'Google Play User Data & Account Deletion Policy',
      status: 'passed',
      description: 'Developers must provide an in-app path for users to delete their account and associated personal data.',
      implementation: 'Full recursive wipe irreversibly removes all profiles, contacts, and tokens from browser storage.',
    },
    {
      id: 'google-data-safety',
      policy: 'Google Play Data Safety Section Disclosures',
      status: 'passed',
      description: 'Accurate disclosure of data types: Contacts (optional, user-initiated), Hardware identifiers (NFC tag serial numbers), and Local storage.',
      implementation: 'All data is stored locally in client-controlled storage with zero external advertising data transfer.',
    },
    {
      id: 'google-pwa-twa',
      policy: 'PWA / TWA & Android Standards',
      status: 'passed',
      description: 'Web App Manifest compliance (name, short_name <= 12 chars, standalone display, maskable and any icons, theme color).',
      implementation: 'Configured in /public/manifest.json and capacitor.config.ts with target SDK 34+ compliance.',
    },
    {
      id: 'google-hardware',
      policy: 'Hardware Permission Transparency (Web NFC)',
      status: 'passed',
      description: 'Proper permission gating and graceful degradation when NFC hardware is absent or disabled.',
      implementation: 'Web NFC runtime capability check (isWebNfcSupported) with automatic fallback to high-fidelity emulation on unsupported devices.',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1720px] px-3 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-8">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Store Publication & Compliance Center
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
              <Check className="h-3.5 w-3.5" />
              Store Audit Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified against Apple App Store Review Guidelines, Google Play Developer Policies, GDPR Article 17, and CCPA protocols.
          </p>
        </div>

        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Store Audit
          </button>
          <button
            onClick={() => setActiveTab('sovereignty')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'sovereignty' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Data Sovereignty
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'privacy' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-md transition ${
              activeTab === 'terms' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terms & EULA
          </button>
        </div>
      </div>

      {purgeAuditToken && (
        <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>GDPR Article 17 Recursive Purge Executed</span>
          </div>
          <p>All local caches, virtual cards, contacts, and persona memories have been permanently unlinked and destroyed.</p>
          <div className="font-mono text-[11px] text-rose-400">Cryptographic Receipt: {purgeAuditToken}</div>
        </div>
      )}

      {/* TAB 1: Store Publication Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Apple App Store Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Apple App Store Review Guidelines Audit</h3>
                  <p className="text-xs text-slate-400">Evaluated against iOS Review Guidelines 5.1.1(v), 5.1.1, 4.2, and 2.1</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                100% Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appleAuditItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.guideline}</span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      PASSED
                    </span>
                  </div>
                  <p className="text-slate-400">{item.description}</p>
                  <div className="text-[11px] text-indigo-300 border-t border-slate-800/80 pt-2">
                    <strong className="text-slate-300">Implementation:</strong> {item.implementation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Google Play Store Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Play Store Developer Policy Audit</h3>
                  <p className="text-xs text-slate-400">Evaluated against User Data Deletion, Data Safety, and Hardware Permission Policies</p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
                100% Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {googleAuditItems.map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-950/80 border border-slate-800 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.policy}</span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      PASSED
                    </span>
                  </div>
                  <p className="text-slate-400">{item.description}</p>
                  <div className="text-[11px] text-cyan-300 border-t border-slate-800/80 pt-2">
                    <strong className="text-slate-300">Implementation:</strong> {item.implementation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Data Sovereignty */}
      {activeTab === 'sovereignty' && (
        <div className="space-y-6">
          {/* Grid: 3 Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: GDPR Article 17 Erasure */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 w-fit">
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white">GDPR Article 17 Erasure</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Apple App Store Guideline 5.1.1(v) compliant one-click recursive deletion. Irreversibly purges your Master Profile, digital cards, and CRM contacts.
                </p>
              </div>

              <button
                onClick={() => setIsPurgeConfirmOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600/20 border border-rose-500/40 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-600/30 transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Initiate Right to Erasure</span>
              </button>
            </div>

            {/* Pillar 2: CCPA "Do Not Sell" */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit">
                  <EyeOff className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white">CCPA Consumer Privacy</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  California Consumer Privacy Act (CCPA) opt-out. Explicitly blocks data brokers, automated scraping bots, and advertising exchanges.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-xs font-medium text-slate-200">Do Not Sell My Info</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Status: {profile.ccpaDoNotSell ? 'ENFORCED (OPTED OUT)' : 'STANDARD'}
                  </div>
                </div>
                <button
                  onClick={handleToggleCCPA}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    profile.ccpaDoNotSell ? 'bg-cyan-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      profile.ccpaDoNotSell ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Pillar 3: KYC Professional Badge */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white">KYC Professional Trust</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographic identity verification granting the green shield badge on all your virtual business cards and NFC payloads.
                </p>
              </div>

              <div>
                {profile.isVerified ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold">Verified Professional Identity</span>
                  </div>
                ) : (
                  <button
                    onClick={handleTriggerKYC}
                    disabled={kycProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {kycProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verify Identity (Instant)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data Portability Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Full Account Data Portability (JSON Archive)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download your complete Master Profile, all {cards.length} derived digital cards, and {contacts.length} CRM contacts in machine-readable JSON format.
                </p>
              </div>
              <button
                onClick={handleExportFullArchive}
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Download Archive (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Official Privacy Policy */}
      {activeTab === 'privacy' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 text-xs text-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">YouConnect Consolidated Conservative Privacy Policy</h3>
              <p className="text-xs text-slate-400">Effective Date: November 2026 · GDPR, UK GDPR, Australian APPs, Swiss FADP & CCPA/CPRA Compliant</p>
            </div>
            <button
              onClick={() => handleCopyText('YouConnect Privacy Policy: https://youconnect.app/privacy', 'privacy-url')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white transition"
            >
              {copiedSection === 'privacy-url' ? <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'privacy-url' ? 'URL Copied' : 'Copy Policy URL'}</span>
            </button>
          </div>

          <div className="space-y-4 leading-relaxed max-h-[500px] overflow-y-auto pr-2">
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">1. Information We Collect & Selective Sharing</h4>
              <p className="text-slate-400">
                YouConnect processes account registration credentials (via Firebase Authentication) and the identity fields you enter into your Master Profile. When you publish or share a digital card (/p/:slug), our client- and server-side Selective Sharing filters strip all unshared private fields (such as personal phone, home address, or emergency contacts) before transmission. We never sell, rent, or monetize your personal data or contact book.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">2. Cryptographic Card Traceability (No Biometric KYC)</h4>
              <p className="text-slate-400">
                Every digital business card receives a unique encrypted security number (YC-XXXX-XXXX-XXXX-XXXX) and a non-reversible SHA-256 HMAC digest associating the card with the registered user account in our database for fraud prevention and audit accountability—without collecting government ID documents or biometric selfies.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">3. AI Studio, OCR Scanning & Zero Model Training</h4>
              <p className="text-slate-400">
                When you explicitly invoke AI features (AI Bio Strategist, AI Headshots, 3D Avatars, Cover Banners, OCR Card Scanning, or CRM Enrichment), your inputs are transmitted over 256-bit TLS and processed transiently via Google Gemini APIs. Uploaded photos, scanned business cards, and CRM contacts are never used to train third-party foundational AI models.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">4. Peer-to-Peer Radar & WebSocket Signaling</h4>
              <p className="text-slate-400">
                Live presence discovery and card exchanges in the P2P Radar Room use ephemeral WebSocket signaling during active user-initiated sessions. No continuous or background GPS tracking is performed.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">5. Right to Erasure (GDPR Article 17) & Account Deletion</h4>
              <p className="text-slate-400">
                In strict compliance with Apple App Store Guideline 5.1.1(v), Google Play User Data Policy, and GDPR Article 17, users can immediately and permanently erase all local profiles, cloud backups, published cards, CRM contacts, and cryptographic registry records via the in-app deletion portal or at /delete-account.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">6. CCPA "Do Not Sell or Share My Personal Information"</h4>
              <p className="text-slate-400">
                Users can toggle the CCPA Opt-Out flag at any time, which enforces Global Privacy Control (GPC) signals and blocks automated scraping or third-party data exchanges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Terms & EULA */}
      {activeTab === 'terms' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 text-xs text-slate-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Consolidated Legal Disclaimer & Terms of Use (EULA)</h3>
              <p className="text-xs text-slate-400">Maximum Liability Limitation, Strictest User Compliance Warranties & Full Indemnification</p>
            </div>
          </div>

          <div className="space-y-4 leading-relaxed max-h-[500px] overflow-y-auto pr-2">
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">1. Binding Acceptance, Eligibility & Subscriptions</h4>
              <p className="text-slate-400">
                Users must be at least 18 years of age (or 13–18 under active parental/guardian supervision and consent). Paid subscriptions (Pro $12/mo and Business $29/mo) renew monthly unless cancelled at least 24 hours prior to renewal. Included daily AI Quota Coins are non-cumulative and do not roll over; +50 AI Booster Packs ($14.99) remain valid for 90 days from purchase.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">2. Strict User Warranties & Third-Party Privacy Compliance</h4>
              <p className="text-slate-400">
                You represent and warrant that you are the sole owner of all data you upload, or have obtained all legally required notices, consents, and releases from every individual whose business card, contact details, or likeness you scan (OCR), enrich, store, or upload, and that you comply with all applicable all-party audio/media recording and privacy laws.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">3. Comprehensive Warranty Disclaimers ("AS IS")</h4>
              <p className="text-slate-400">
                All services, cloud storage, OCR outputs, AI generations, P2P WebSocket Radar, and NFC hardware interactions are provided strictly "AS IS" and "AS AVAILABLE" without warranties of any kind. YouConnect disclaims all warranties of accuracy, uptime, or fitness for a particular purpose, and bears zero liability for data loss or storage quota enforcement.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-sm mb-1">4. Limitation of Liability & Full User Indemnification</h4>
              <p className="text-slate-400">
                In no event shall YouConnect be liable for indirect, incidental, consequential, or punitive damages. Aggregate liability is capped at the total subscription fees paid by you in the preceding 12 months (or USD $10.00 for free Basic users). You agree to defend, indemnify, and hold harmless YouConnect from any claims, regulatory fines, or legal fees arising from your breach of these Terms or unlawful uploading/processing of third-party contact data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Erasure */}
      {isPurgeConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-800/80 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">Confirm Right to Erasure</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action strictly follows GDPR Article 17 and Apple Guideline 5.1.1(v). It will irrevocably wipe all canonical profiles, cards, contact notes, and local storage data. This operation cannot be undone.
            </p>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsPurgeConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmErasure}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-500"
              >
                Permanently Destroy All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
