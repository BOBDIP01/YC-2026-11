import React, { useState } from 'react';
import {
  Radio,
  DoorOpen,
  CreditCard,
  ArrowRightLeft,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Lock,
  Zap,
  QrCode,
  Sparkles,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface RadarWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRoomQr?: () => void;
}

interface GuideStep {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  takeaway: string;
  icon: React.ReactNode;
  accentColor: string;
}

export const RadarWalkthroughModal: React.FC<RadarWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onOpenRoomQr,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  if (!isOpen) return null;

  const steps: GuideStep[] = [
    {
      id: 1,
      badge: 'Real-Time Radar',
      title: 'Welcome to Live P2P Radar',
      subtitle: 'Zero-Trust, Zero-Simulator Proximity Networking',
      description:
        'YouConnect establishes a secure real-time WebSocket connection to scan your active networking room. Every avatar blip on the radar represents a real attendee currently active in the same space.',
      takeaway: 'Real connected devices only. No fake bots, no simulated crowds.',
      icon: <Radio className="h-6 w-6 text-indigo-400" />,
      accentColor: 'indigo',
    },
    {
      id: 2,
      badge: 'Privacy & Security',
      title: 'Ephemeral Rooms & Access Control',
      subtitle: 'Host Public Gatherings or Encrypted Breakouts',
      description:
        'Network openly in the Public Networking Room or tap "Create Room" to set up your own encrypted ephemeral space. Add an optional access password, participant capacity limit, and an auto-dissolve countdown timer (up to 10 hours).',
      takeaway: 'Rooms auto-dissolve safely with zero leftover footprint on the server.',
      icon: <DoorOpen className="h-6 w-6 text-cyan-400" />,
      accentColor: 'cyan',
    },
    {
      id: 3,
      badge: 'Selective Sharing',
      title: 'Broadcasting Your Chosen Card',
      subtitle: 'Switch Personas with One Tap',
      description:
        'You always control what you reveal. Tap the "Broadcasting Card" selector to switch between your Executive Business card, Personal Family circle, or Sports & Club personas. The radar instantly updates what peers see.',
      takeaway: 'Share work credentials at a summit or your personal circle at casual mixers.',
      icon: <CreditCard className="h-6 w-6 text-violet-400" />,
      accentColor: 'violet',
    },
    {
      id: 4,
      badge: 'Instant Handshake',
      title: '1-Tap Card Exchange & Auto-Accept',
      subtitle: 'Bilateral Sharing Straight to CRM & Contacts',
      description:
        'Tap any peer avatar on the radar to inspect their credential summary and send a 1-tap swap request. Both parties receive each other\'s full digital card into their local Contacts and CRM. Enable "Auto-Accept" for hands-free instant sharing.',
      takeaway: 'Seamless bilateral swaps with instant vCard (.vcf) generation.',
      icon: <ArrowRightLeft className="h-6 w-6 text-emerald-400" />,
      accentColor: 'emerald',
    },
    {
      id: 5,
      badge: 'Instant Verification',
      title: 'Try It Live with Your Phone or 2nd Tab',
      subtitle: 'See Multi-Device Discovery in Action',
      description:
        'Want to experience real live discovery right now? Tap "Room QR" to scan with your smartphone camera, or copy the invite link into another browser window. Watch both devices pulse and connect on each other’s radars in real time!',
      takeaway: 'Open a second window or phone camera to test live discovery right now.',
      icon: <Smartphone className="h-6 w-6 text-amber-400" />,
      accentColor: 'amber',
    },
  ];

  const handleFinish = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem('yc_radar_guide_completed', 'true');
      } catch (err) {
        console.warn('Could not save guide status to localStorage:', err);
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-7 shadow-2xl text-slate-100 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  P2P Radar Interactive Guide
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                A quick walkthrough on using real proximity discovery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Close Guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Visual Preview Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4 shadow-inner relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                step.accentColor === 'indigo'
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                  : step.accentColor === 'cyan'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : step.accentColor === 'violet'
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
                  : step.accentColor === 'emerald'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {step.icon}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="inline-block text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 mb-1">
                {step.badge}
              </div>
              <h4 className="text-base font-bold text-white leading-snug">{step.title}</h4>
              <p className="text-xs text-indigo-300/90 font-medium">{step.subtitle}</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">{step.description}</p>

          {/* Interactive Micro-Demos for Each Step */}
          {currentStep === 0 && (
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </div>
                <span>Live scanning active on WebSocket channel</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                100% Real Live
              </span>
            </div>
          )}

          {currentStep === 1 && (
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <Lock className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-1" />
                <span className="text-slate-200 font-semibold block">Optional Password</span>
                <span className="text-[9px] text-slate-400">Restricted access</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <Users className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-1" />
                <span className="text-slate-200 font-semibold block">Capacity Caps</span>
                <span className="text-[9px] text-slate-400">Up to unlimited</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 mx-auto mb-1" />
                <span className="text-slate-200 font-semibold block">Auto-Dissolve</span>
                <span className="text-[9px] text-slate-400">Max 10 hours</span>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-600/40 border border-indigo-400/50 flex items-center justify-center text-[10px] font-bold text-white">
                  YC
                </div>
                <div>
                  <span className="font-semibold text-white text-[11px] block">
                    Active Broadcasting Identity
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Switch between Business, Personal, or Club cards anytime
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 font-bold px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">
                1-Tap Swap
              </span>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auto-Accept exchanges enabled</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Two-Way Sync
              </span>
            </div>
          )}

          {currentStep === 4 && (
            <div className="rounded-lg bg-gradient-to-r from-cyan-950/60 to-indigo-950/60 border border-cyan-800/50 p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-left text-xs">
                <span className="font-bold text-white block">Ready to test now?</span>
                <span className="text-[11px] text-cyan-300">
                  Scan the room QR code with your mobile phone camera
                </span>
              </div>
              {onOpenRoomQr && (
                <button
                  type="button"
                  onClick={() => {
                    handleFinish();
                    onOpenRoomQr();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5 shrink-0"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Show Room QR</span>
                </button>
              )}
            </div>
          )}

          {/* Key Takeaway Note */}
          <div className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-2.5 flex items-center gap-2 text-[11px] text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{step.takeaway}</span>
          </div>
        </div>

        {/* Stepper Dots & Checkbox */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Stepper Dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-indigo-500'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Don't show again toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Don't show this automatically on start</span>
          </label>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              currentStep === 0
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition"
            >
              <span>
                {currentStep === steps.length - 1 ? 'Got it! Start Networking' : 'Next Step'}
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

