import React, { useState } from 'react';
import { MasterProfile, SubscriptionState, AiUsageType } from '../types';
import { getQuotaSummary } from '../utils/subscription';
import { Sparkles, X, Check, Loader2, Wand2, Coins } from 'lucide-react';

interface AIBioModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  onUpdateBio: (newBio: string, newHeadline?: string) => void;
  subscription?: SubscriptionState;
  onConsumeAiCoin?: (usageType: AiUsageType, actionLabel: string) => boolean;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

export const AIBioModal: React.FC<AIBioModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateBio,
  subscription,
  onConsumeAiCoin,
  onOpenSubscriptionModal,
}) => {
  const [tone, setTone] = useState<'executive' | 'creative' | 'friendly' | 'direct'>('executive');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{ bio: string; headline: string } | null>(null);

  if (!isOpen) return null;

  const quotaSummary = subscription ? getQuotaSummary(subscription) : null;

  const handleGenerate = async () => {
    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin(
        'text_bio',
        `AI Bio & Headline Strategist (${tone})`
      );
      if (!allowed) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          role: profile.role,
          company: profile.company,
          currentBio: profile.bio,
          tone,
          instructions,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setGeneratedResult({
        bio: data.bio || '',
        headline: data.headline || profile.headline,
      });
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to Gemini AI generator. Applied local tone template.');
      // Local fallback
      setGeneratedResult({
        bio: `${profile.role} at ${profile.company}. Focused on driving strategic outcomes, high-impact architecture, and scalable leadership in competitive markets.`,
        headline: `${profile.role} specializing in strategic execution`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult) return;
    onUpdateBio(generatedResult.bio, generatedResult.headline);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">AI Bio & Headline Strategist</h3>
              <p className="text-xs text-slate-400">Powered by Google Gemini 3.8 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Tone selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Strategic Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'executive', label: 'Executive', desc: 'High-status & authoritative' },
                  { id: 'creative', label: 'Creative', desc: 'Bespoke & visionary' },
                  { id: 'friendly', label: 'Friendly', desc: 'Approachable & collaborative' },
                  { id: 'direct', label: 'Direct', desc: 'High-velocity & concise' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tone === t.id
                      ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Specific instructions */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Specific Directives / AI Instructions
            </label>
            <textarea
              rows={2}
              value={instructions}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.max(52, el.scrollHeight)}px`;
                }
              }}
              onChange={(e) => {
                setInstructions(e.target.value);
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.max(52, e.currentTarget.scrollHeight)}px`;
              }}
              placeholder="e.g. Highlight Stanford research background and Series A fundraise"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none overflow-hidden leading-relaxed"
            />
          </div>

          {/* Current vs Generated View */}
          {generatedResult ? (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-3.5">
                <div className="flex items-center justify-between text-xs font-medium text-indigo-400 mb-1.5">
                  <span>Generated Bio Preview</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {generatedResult.bio.split(' ').length} words
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed mb-3">
                  {generatedResult.bio}
                </p>
                <div className="text-[11px] text-slate-400 border-t border-indigo-900/40 pt-2">
                  <span className="font-semibold text-slate-300">New Headline:</span> {generatedResult.headline}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Current Bio:</span> {profile.bio}
            </div>
          )}

          {error && (
            <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5">
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{quotaSummary ? quotaSummary.totalAvailableCoins : profile.aiCredits}</span>
            </span>
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={() => onOpenSubscriptionModal()}
                className="text-[10px] text-indigo-400 hover:underline ml-1"
              >
                +Coins
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{generatedResult ? 'Regenerate' : 'Generate'}</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                    <Coins className="h-2.5 w-2.5 text-amber-400" />
                    <span>{quotaSummary?.unlimitedTextAndCrmAi ? '0' : '1'}</span>
                  </span>
                </>
              )}
            </button>
            {generatedResult && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Apply Bio</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

