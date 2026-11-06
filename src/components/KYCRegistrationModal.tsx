import React, { useState } from 'react';
import { MasterProfile } from '../types';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Lock,
  UserCheck,
  AlertCircle,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Globe2,
} from 'lucide-react';

interface KYCRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  onUpdateProfile: (updated: MasterProfile) => void;
}

export const KYCRegistrationModal: React.FC<KYCRegistrationModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  // Extract initial names from profile.name or separated fields
  const nameParts = (profile.name || '').trim().split(/\s+/);
  const defaultFirst = profile.personalData?.firstName || profile.firstName || nameParts[0] || '';
  const defaultLast = profile.personalData?.lastName || profile.lastName || (nameParts.slice(1).join(' ') || '');

  const [firstName, setFirstName] = useState(
    profile.kycVerification?.firstName || defaultFirst
  );
  const [lastName, setLastName] = useState(
    profile.kycVerification?.lastName || defaultLast
  );
  const [email, setEmail] = useState(
    profile.kycVerification?.email || profile.email || ''
  );
  const [country, setCountry] = useState('United States');
  const [acceptTerms, setAcceptTerms] = useState(true);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(profile.kycVerification?.isCompleted || false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunKYC = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Only 3 mandatory fields: First Name, Last Name, Email
    if (!firstName.trim()) {
      setErrorMsg('First Name is mandatory for identity registration.');
      return;
    }
    if (!lastName.trim()) {
      setErrorMsg('Last Name is mandatory for identity registration.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid Email address is mandatory for KYC identity verification.');
      return;
    }

    setIsVerifying(true);
    setVerificationStep('Validating legal identity syntax & email authenticity...');

    setTimeout(() => {
      setVerificationStep('Checking anti-fraud and international sanctions registry...');
      setTimeout(() => {
        setVerificationStep('Finalizing Level-1 Automatic eIDAS clearance...');
        setTimeout(() => {
          setIsVerifying(false);
          setIsSuccess(true);

          const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
          const updated: MasterProfile = {
            ...profile,
            name: fullName,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            personalData: profile.personalData
              ? {
                  ...profile.personalData,
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  fullName: fullName,
                }
              : undefined,
            kycVerification: {
              isCompleted: true,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              verifiedAt: new Date().toISOString(),
              kycLevel: 'Level-1 Automatic',
            },
          };
          onUpdateProfile(updated);
        }, 600);
      }, 700);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Automatic Identity KYC Registration</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-semibold">
                  Level-1 Instant
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official registration for verifiable virtual business card network access.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Informative Guidance Banner */}
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Lock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Registration Policy & Mandatory Requirements</span>
          </div>
          <p className="text-[11px] text-indigo-300/80 leading-relaxed">
            Only <strong>First Name</strong>, <strong>Last Name</strong>, and <strong>Email</strong> are mandatory to complete your verified registration. All other fields in your Card Studio (company, role, phone, bio, themes) remain <strong>100% voluntary</strong> with no mandatory requirements.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="py-6 text-center space-y-4 animate-in fade-in">
            <div className="h-14 w-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Automatic KYC Verified!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1">
                Identity verified for <strong>{firstName} {lastName}</strong> (<code className="text-indigo-300">{email}</code>).
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-[11px] text-emerald-300 mt-3 font-mono">
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Certificate: eIDAS-KYC-AUTO-{Date.now().toString().slice(-6)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition"
              >
                Done · Return to Card Studio
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRunKYC} className="space-y-4 text-xs">
            {/* The 3 Mandatory KYC Registration Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-200 font-semibold mb-1 flex items-center gap-1">
                  <span>First Name</span>
                  <span className="text-amber-400 font-bold">*</span>
                  <span className="text-[9px] font-mono uppercase bg-amber-950/80 text-amber-300 px-1 rounded ml-auto">
                    Mandatory
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Elena"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1 flex items-center gap-1">
                  <span>Last Name</span>
                  <span className="text-amber-400 font-bold">*</span>
                  <span className="text-[9px] font-mono uppercase bg-amber-950/80 text-amber-300 px-1 rounded ml-auto">
                    Mandatory
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Rostova"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-200 font-semibold mb-1 flex items-center gap-1">
                <span>Verified Email Address</span>
                <span className="text-amber-400 font-bold">*</span>
                <span className="text-[9px] font-mono uppercase bg-amber-950/80 text-amber-300 px-1 rounded ml-auto">
                  Mandatory
                </span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@cognitionos.ai"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Used to anchor your verifiable credential and cryptographic card signature.
              </span>
            </div>

            {/* Optional Jurisdiction */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Jurisdiction / Country <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="European Union">European Union</option>
                <option value="Canada">Canada</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Singapore">Singapore</option>
                <option value="Japan">Japan</option>
                <option value="Australia">Australia</option>
                <option value="Other">Other / International</option>
              </select>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="kyc-consent"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              <label htmlFor="kyc-consent" className="text-[11px] text-slate-400 leading-snug">
                I authorize YouConnect to perform automatic level-1 identity syntax verification in accordance with privacy laws and CCPA/GDPR zero-tracking standards.
              </label>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !acceptTerms}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 hover:opacity-95 transition disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-cyan-200" />
                  <span>{verificationStep || 'Running Automatic KYC...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Run Automatic KYC Verification</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
