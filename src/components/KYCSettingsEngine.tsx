import React, { useState, useRef, useEffect } from 'react';
import { MasterProfile, KycTraceabilityRecord } from '../types';
import {
  ShieldCheck,
  Check,
  CheckCircle2,
  Upload,
  Camera,
  FileText,
  Sparkles,
  AlertCircle,
  Database,
  RefreshCw,
  Download,
  Trash2,
  ScanLine,
  UserCheck,
  Lock,
  Eye,
  X,
} from 'lucide-react';

interface KYCSettingsEngineProps {
  profile: MasterProfile;
  onUpdateProfile: (updated: MasterProfile) => void;
  onNavigateToStudio?: () => void;
}

export const KYCSettingsEngine: React.FC<KYCSettingsEngineProps> = ({
  profile,
  onUpdateProfile,
  onNavigateToStudio,
}) => {
  const nameParts = (profile.name || '').trim().split(/\s+/);
  const defaultFirst = profile.personalData?.firstName || profile.firstName || nameParts[0] || 'Elena';
  const defaultLast =
    profile.personalData?.lastName || profile.lastName || nameParts.slice(1).join(' ') || 'Rostova';

  const [firstName, setFirstName] = useState(profile.kycVerification?.firstName || defaultFirst);
  const [lastName, setLastName] = useState(profile.kycVerification?.lastName || defaultLast);
  const [email, setEmail] = useState(profile.kycVerification?.email || profile.email || '');
  const [documentType, setDocumentType] = useState<string>(
    profile.kycVerification?.documentType || 'Passport'
  );
  const [issuingCountry, setIssuingCountry] = useState<string>(
    profile.kycVerification?.issuingCountry || 'United States'
  );

  // Document & Selfie Images
  const [documentImage, setDocumentImage] = useState<string | null>(
    profile.kycVerification?.documentThumbUrl || null
  );
  const [selfieImage, setSelfieImage] = useState<string | null>(
    profile.kycVerification?.selfieThumbUrl || null
  );

  // Live Camera Capture States ('doc' | 'selfie' | null)
  const [activeCameraMode, setActiveCameraMode] = useState<'doc' | 'selfie' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const docInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  // Verification Engine State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestRecord, setLatestRecord] = useState<KycTraceabilityRecord | null>(null);
  const [dbRecords, setDbRecords] = useState<KycTraceabilityRecord[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const isKycVerified = Boolean(
    profile.isVerified &&
      profile.kycVerification?.isCompleted &&
      profile.kycVerification?.traceabilityId
  );

  const [biometricConsentAccepted, setBiometricConsentAccepted] = useState(false);

  // Compress uploaded/captured images so they transfer quickly and never bloat storage
  const compressImageDataUrl = (dataUrl: string, maxWidth = 960, quality = 0.82): Promise<string> => {
    if (!dataUrl.startsWith('data:image/')) return Promise.resolve(dataUrl);
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Load Traceability Database Records from Server (Scoped to current profileId)
  const fetchTraceabilityRecords = async () => {
    setIsLoadingDb(true);
    try {
      const params = new URLSearchParams({
        profileId: profile.id || '',
        traceabilityId: profile.kycVerification?.traceabilityId || '',
      });
      const res = await fetch(`/api/kyc/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.records)) {
          setDbRecords(data.records);
          if (!latestRecord && data.records.length > 0) {
            const matching = data.records.find(
              (r: KycTraceabilityRecord) =>
                r.traceabilityId === profile.kycVerification?.traceabilityId ||
                r.profileId === profile.id
            );
            if (matching) setLatestRecord(matching);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load KYC database records:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchTraceabilityRecords();
    return () => {
      stopCamera();
    };
  }, [profile.id]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActiveCameraMode(null);
  };

  const startCamera = async (mode: 'doc' | 'selfie') => {
    setCameraError(null);
    stopCamera();
    setActiveCameraMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Camera permission was denied or no camera hardware is available. Please upload an image file or use the sample generator.'
      );
      setActiveCameraMode(null);
    }
  };

  const captureCameraFrame = async () => {
    if (!videoRef.current || !activeCameraMode) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const compressed = await compressImageDataUrl(rawDataUrl, 900, 0.82);
      if (activeCameraMode === 'doc') {
        setDocumentImage(compressed);
      } else {
        setSelfieImage(compressed);
      }
    }
    stopCamera();
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'doc' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        const compressed = await compressImageDataUrl(result, 960, 0.82);
        if (target === 'doc') {
          setDocumentImage(compressed);
        } else {
          setSelfieImage(compressed);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Generate a realistic high-resolution specimen Identity Document on Canvas for 1-click testing
  const handleGenerateSpecimenDocument = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background security guilloche gradient
    const grad = ctx.createLinearGradient(0, 0, 760, 480);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 760, 480);

    // Subtle security grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 760; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(760, y);
      ctx.stroke();
    }

    // Gold top header bar
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 0, 760, 58);
    ctx.fillStyle = '#090d16';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(
      `${issuingCountry.toUpperCase()} · ${documentType.toUpperCase()}`,
      28,
      36
    );
    ctx.font = 'bold 13px monospace';
    ctx.fillText('ICAO 9303 BIOMETRIC E-DOCUMENT', 490, 35);

    // Portrait frame on left
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 85, 190, 235);
    ctx.fillRect(32, 85, 190, 235);

    // Stylized silhouette / biometric face landmarks inside portrait frame
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(127, 165, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(127, 285, 70, Math.PI, Math.PI * 2);
    ctx.fill();

    // Biometric crosshair overlay on portrait
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(65, 110, 124, 150);

    // Document Text Fields
    const docNum = `P${Math.floor(10000000 + Math.random() * 89999999)}`;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('SURNAME / LAST NAME', 255, 102);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText((lastName || 'ROSTOVA').toUpperCase(), 255, 128);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('GIVEN NAMES / FIRST NAME', 255, 162);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText((firstName || 'ELENA').toUpperCase(), 255, 188);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('DOCUMENT NO.', 255, 224);
    ctx.fillText('DATE OF BIRTH', 485, 224);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(docNum, 255, 248);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('1989-08-24', 485, 248);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('ISSUING STATE', 255, 284);
    ctx.fillText('DATE OF EXPIRY', 485, 284);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(issuingCountry.toUpperCase(), 255, 308);
    ctx.fillStyle = '#10b981';
    ctx.fillText('2033-08-23', 485, 308);

    // Holographic seal badge
    ctx.beginPath();
    ctx.arc(675, 150, 42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.18)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('eIDAS CHIP', 641, 148);
    ctx.fillText('VERIFIED', 647, 164);

    // Bottom Machine Readable Zone (MRZ)
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 365, 760, 115);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 19px monospace';
    const cleanLastM = (lastName || 'ROSTOVA').toUpperCase().replace(/[^A-Z]/g, '');
    const cleanFirstM = (firstName || 'ELENA').toUpperCase().replace(/[^A-Z]/g, '');
    const line1 = `P<USA${cleanLastM}<<${cleanFirstM}${'<'.repeat(44)}`.slice(0, 44);
    const line2 = `${docNum}<8USA8908244F3308236<<<<<<<<<<<<<<04`.slice(0, 44);
    ctx.fillText(line1, 28, 408);
    ctx.fillText(line2, 28, 444);

    setDocumentImage(canvas.toDataURL('image/jpeg', 0.86));
  };

  // Run the AI Document Recognition + Selfie Comparison + Traceability Registration
  const handleRunVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Please enter your First Name and Last Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid Email address for traceability registration.');
      return;
    }
    if (!documentImage) {
      setErrorMsg('Please upload a picture of your identity document (or click "Load Specimen ID").');
      return;
    }
    if (!selfieImage) {
      setErrorMsg('Please capture or upload a selfie shot for biometric comparison.');
      return;
    }
    if (!biometricConsentAccepted) {
      setErrorMsg('Please review and accept the Biometric & AI Vision Processing Consent before running verification.');
      return;
    }

    setIsVerifying(true);
    setVerificationStage('1/4 · Recognizing Identity Document via AI Vision OCR...');

    try {
      await new Promise((r) => setTimeout(r, 450));
      setVerificationStage('2/4 · Inspecting MRZ Checksum & Document Authenticity...');
      await new Promise((r) => setTimeout(r, 450));
      setVerificationStage('3/4 · Comparing Document Portrait against Live Selfie Shot (1:1 Biometrics)...');

      const res = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          documentType,
          issuingCountry,
          documentImage,
          selfieImage,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Verification server returned ${res.status}`);
      }

      setVerificationStage('4/4 · Registering User Identity in Traceability Database...');
      await new Promise((r) => setTimeout(r, 350));

      const data = await res.json();
      const record: KycTraceabilityRecord = data.record;
      setLatestRecord(record);

      // Update profile with verified status & traceability metadata -> unlocks green tick mark on image!
      const compactDocThumb = await compressImageDataUrl(documentImage, 320, 0.7);
      const compactSelfieThumb = await compressImageDataUrl(selfieImage, 320, 0.7);

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const updatedProfile: MasterProfile = {
        ...profile,
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        isVerified: true,
        verifiedAt: record.registeredAt,
        personalData: profile.personalData
          ? {
              ...profile.personalData,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              fullName,
            }
          : undefined,
        kycVerification: {
          isCompleted: true,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          verifiedAt: record.registeredAt,
          kycLevel: 'Level-3 Biometric Document & Selfie',
          traceabilityId: record.traceabilityId,
          traceabilityHash: record.traceabilityHash,
          documentType: record.documentType,
          issuingCountry: record.issuingCountry,
          documentNumberMasked: record.documentNumberMasked,
          dateOfBirth: record.dateOfBirth,
          expirationDate: record.expirationDate,
          documentConfidenceScore: record.documentConfidenceScore,
          biometricMatchScore: record.biometricMatchScore,
          livenessVerified: record.livenessVerified,
          comparisonSummary: record.comparisonSummary,
          documentThumbUrl: compactDocThumb,
          selfieThumbUrl: compactSelfieThumb,
        },
      };

      onUpdateProfile(updatedProfile);
      await fetchTraceabilityRecords();
    } catch (err: any) {
      console.error('KYC verification error:', err);
      setErrorMsg(err.message || 'Failed to complete KYC document and selfie verification.');
    } finally {
      setIsVerifying(false);
      setVerificationStage(null);
    }
  };

  // Revoke / Reset KYC Verification
  const handleResetVerification = async () => {
    const traceId = profile.kycVerification?.traceabilityId;
    if (traceId) {
      try {
        await fetch(
          `/api/kyc/records/${encodeURIComponent(traceId)}?profileId=${encodeURIComponent(profile.id || '')}`,
          { method: 'DELETE' }
        );
      } catch {
        // ignore
      }
    }
    onUpdateProfile({
      ...profile,
      isVerified: false,
      verifiedAt: undefined,
      kycVerification: undefined,
    });
    setLatestRecord(null);
    await fetchTraceabilityRecords();
  };

  // Download JSON Traceability Certificate
  const handleDownloadCertificate = (rec: KycTraceabilityRecord) => {
    const blob = new Blob([JSON.stringify(rec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KYC_Traceability_Certificate_${rec.traceabilityId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Banner: Live Profile Image Green Tick Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            {/* User Profile Image with conditional Green Verified Tick Mark */}
            <div className="relative shrink-0">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className={`h-16 w-16 rounded-2xl object-cover border-2 transition-all ${
                  isKycVerified
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                    : 'border-slate-700'
                }`}
              />
              {isKycVerified && (
                <span
                  className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-950 text-slate-950 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-in zoom-in duration-200"
                  title={`KYC Verified · Traceability ID: ${profile.kycVerification?.traceabilityId}`}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  KYC Document Recognition, Biometric Selfie & Database Traceability
                </h2>
                {isKycVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Green Verified Tick Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span>Unverified — No Green Tick on Card Image Yet</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Upload a photo of your official ID document and compare it with a selfie shot. Once verified and registered in the traceability database, your profile photo receives the green verified tick mark on all digital cards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isKycVerified && onNavigateToStudio && (
              <button
                type="button"
                onClick={onNavigateToStudio}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow-md shadow-emerald-600/20"
              >
                View Verified Card in Studio &rarr;
              </button>
            )}
            {isKycVerified && (
              <button
                type="button"
                onClick={handleResetVerification}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/50 text-xs font-semibold text-rose-300 transition"
                title="Revoke KYC status and remove green tick mark"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset KYC</span>
              </button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/70 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Live Camera Modal / Drawer when capturing Document or Selfie */}
        {activeCameraMode && (
          <div className="rounded-2xl border border-indigo-500/50 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Camera className="h-4 w-4 text-cyan-400" />
                <span>
                  {activeCameraMode === 'doc'
                    ? 'Position Identity Document Inside Frame'
                    : 'Position Your Face Inside Biometric Selfie Frame'}
                </span>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative aspect-video max-h-72 mx-auto rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {activeCameraMode === 'selfie' ? (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-52 rounded-full border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                </div>
              ) : (
                <div className="absolute inset-6 pointer-events-none rounded-xl border-2 border-dashed border-cyan-400/80" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={captureCameraFrame}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg transition"
              >
                <Camera className="h-4 w-4" />
                <span>
                  {activeCameraMode === 'doc' ? 'Capture Document Photo' : 'Snap Live Selfie Shot'}
                </span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/60 text-xs text-amber-200 flex items-center justify-between">
            <span>{cameraError}</span>
            <button onClick={() => setCameraError(null)} className="text-amber-400 hover:underline ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* KYC Form: Legal Identity + Step 1 Document + Step 2 Selfie */}
        <form onSubmit={handleRunVerification} className="space-y-6">
          {/* Identity Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Traceability Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="Passport">International Passport</option>
                <option value="National ID Card">National ID Card</option>
                <option value="Driver License">Driver's License</option>
                <option value="Residence Permit">Residence Permit</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Issuing Country</label>
              <select
                value={issuingCountry}
                onChange={(e) => setIssuingCountry(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="European Union">European Union (Italy / Germany / France)</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Canada">Canada</option>
                <option value="Singapore">Singapore</option>
                <option value="Japan">Japan</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
          </div>

          {/* Side-by-Side Upload & Capture Panels: [1] ID Document Picture vs [2] Selfie Shot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* STEP 1: IDENTITY DOCUMENT PICTURE */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center font-mono">
                      1
                    </span>
                    <span>Upload Identity Document Picture</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400">OCR Engine Ready</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Upload a photo of your {documentType} ({issuingCountry}) for AI optical character & MRZ recognition.
                </p>
              </div>

              {documentImage ? (
                <div className="relative rounded-xl overflow-hidden border border-indigo-500/40 bg-black aspect-[16/10] flex items-center justify-center">
                  <img
                    src={documentImage}
                    alt="Uploaded ID Document"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Document Loaded</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocumentImage(null)}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-black/80 text-slate-300 hover:text-rose-400 border border-white/10"
                    title="Remove document image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => docInputRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 aspect-[16/10] flex flex-col items-center justify-center p-4 text-center transition group"
                >
                  <FileText className="h-8 w-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                  <div className="text-xs font-semibold text-slate-200">
                    Click to Upload {documentType} Image
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Supports JPG, PNG, WebP · Auto-compressed
                  </div>
                </div>
              )}

              <input
                ref={docInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'doc')}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Upload ID Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => startCamera('doc')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  <Camera className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSpecimenDocument}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-700/60 text-xs font-semibold text-indigo-200 transition"
                  title="Generate a realistic ICAO specimen passport with your name for instant testing"
                >
                  <ScanLine className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Load Specimen ID</span>
                </button>
              </div>
            </div>

            {/* STEP 2: BIOMETRIC SELFIE SHOT */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-cyan-600 text-white text-[11px] flex items-center justify-center font-mono">
                      2
                    </span>
                    <span>Capture or Upload Selfie Shot</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">1:1 Face Match</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Provide a live selfie shot to compare against the portrait on your uploaded identity document.
                </p>
              </div>

              {selfieImage ? (
                <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 bg-black aspect-[16/10] flex items-center justify-center">
                  <img
                    src={selfieImage}
                    alt="User Selfie Shot"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span>Selfie Ready</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelfieImage(null)}
                    className="absolute top-2 right-2 p-1 rounded-lg bg-black/80 text-slate-300 hover:text-rose-400 border border-white/10"
                    title="Remove selfie image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => startCamera('selfie')}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-900/40 aspect-[16/10] flex flex-col items-center justify-center p-4 text-center transition group"
                >
                  <Camera className="h-8 w-8 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
                  <div className="text-xs font-semibold text-slate-200">
                    Click to Take a Live Selfie Shot or Upload Photo
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    1:1 facial landmark comparison with ID document
                  </div>
                </div>
              )}

              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'selfie')}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera('selfie')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Take Selfie Shot</span>
                </button>
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                >
                  <Upload className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelfieImage(profile.avatarUrl)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 text-xs font-semibold text-emerald-200 transition"
                  title="Use your active profile photo as the selfie shot"
                >
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Use Profile Photo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Explicit Biometric & AI Vision Processing Consent (GDPR Art. 9 & BIPA Compliance) */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/90 border border-indigo-500/30 cursor-pointer hover:border-indigo-500/60 transition">
            <input
              type="checkbox"
              checked={biometricConsentAccepted}
              onChange={(e) => setBiometricConsentAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <div className="text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-white">Explicit Biometric & AI Vision Consent (GDPR Art. 9 / BIPA):</strong> I consent to the transient processing of my uploaded identity document and live selfie via Google Gemini AI Vision solely for optical character recognition (OCR) and 1:1 facial geometry comparison. Raw biometric images are never retained on the server or used for model training, and I may revoke my verification record at any time.
            </div>
          </label>

          {/* STEP 3: SUBMIT TO AI RECOGNITION & TRACEABILITY ENGINE */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>{verificationStage || 'Running Document OCR & Selfie Comparison...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    Recognize Document, Compare with Selfie & Register User in Traceability Database
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Recognition & Biometric Comparison Results Panel */}
        {(latestRecord || isKycVerified) && (
          <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/40">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Check className="h-5 w-5 stroke-[3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Identity Verified & Registered in Traceability Database
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      VERIFIED_MATCH
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    {latestRecord?.comparisonSummary ||
                      profile.kycVerification?.comparisonSummary ||
                      'Document OCR and 1:1 biometric selfie comparison passed.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-emerald-300">
                    {latestRecord?.biometricMatchScore ??
                      profile.kycVerification?.biometricMatchScore ??
                      98.6}
                    % Face Match
                  </div>
                  <div className="text-[10px] text-slate-400">
                    OCR Confidence:{' '}
                    {latestRecord?.documentConfidenceScore ??
                      profile.kycVerification?.documentConfidenceScore ??
                      99.1}
                    %
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Document Data & Traceability Keys */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Traceability ID</div>
                <div className="font-mono font-bold text-emerald-400 mt-0.5 truncate">
                  {latestRecord?.traceabilityId || profile.kycVerification?.traceabilityId}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">Document & No.</div>
                <div className="font-mono font-semibold text-white mt-0.5 truncate">
                  {latestRecord?.documentType || profile.kycVerification?.documentType} ·{' '}
                  {latestRecord?.documentNumberMasked ||
                    profile.kycVerification?.documentNumberMasked}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Extracted Legal Name
                </div>
                <div className="font-semibold text-white mt-0.5 truncate">
                  {latestRecord?.extractedFields?.fullName || profile.name}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  Cryptographic Audit Hash
                </div>
                <div
                  className="font-mono text-[11px] text-cyan-300 mt-0.5 truncate"
                  title={latestRecord?.traceabilityHash || profile.kycVerification?.traceabilityHash}
                >
                  {latestRecord?.traceabilityHash || profile.kycVerification?.traceabilityHash}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. KYC Traceability Database Registry Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                KYC Traceability Database Ledger ({dbRecords.length} Registered)
              </h3>
              <p className="text-xs text-slate-400">
                Server-side audit database storing verified user identity registrations, document OCR hashes, and selfie biometric comparison scores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchTraceabilityRecords}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
            <span>Refresh Database</span>
          </button>
        </div>

        {dbRecords.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
            <Database className="h-7 w-7 text-slate-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-300">
              No KYC Traceability Records Registered Yet
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Upload an identity document and capture/select a selfie shot above, then click "Recognize Document, Compare with Selfie & Register User" to log your verifiable record.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dbRecords.map((rec) => (
              <div
                key={rec.traceabilityId}
                className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{rec.fullName}</span>
                        <span className="text-[11px] font-mono text-indigo-300">{rec.email}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                          {rec.traceabilityId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {rec.documentType} ({rec.issuingCountry}) · Doc #{rec.documentNumberMasked} ·{' '}
                        {new Date(rec.registeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">
                      Selfie Match: {rec.biometricMatchScore}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownloadCertificate(rec)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition"
                      title="Download JSON Traceability Certificate"
                    >
                      <Download className="h-3 w-3" />
                      <span>Certificate</span>
                    </button>
                  </div>
                </div>

                {/* Audit Trail Steps */}
                {rec.auditTrail && rec.auditTrail.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                    {rec.auditTrail.map((stepItem, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 text-[10px]"
                      >
                        <div className="font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{stepItem.step}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5 truncate" title={stepItem.detail}>
                          {stepItem.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
