import React, { useState } from 'react';
import { DigitalCard, SubscriptionState, AiUsageType } from '../types';
import { getQuotaSummary } from '../utils/subscription';
import { apiFetch } from '../utils/apiConfig';
import {
  Sparkles,
  X,
  Check,
  Loader2,
  Wand2,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  FolderPlus,
  Coins,
} from 'lucide-react';

interface AIBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: DigitalCard;
  onApplyBanner: (bannerUrl: string, bannerName?: string) => void;
  onSaveToImageHub?: (banner: { url: string; name: string; style: string }) => void;
  subscription?: SubscriptionState;
  onConsumeAiCoin?: (usageType: AiUsageType, actionLabel: string) => boolean;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

export const AIBannerModal: React.FC<AIBannerModalProps> = ({
  isOpen,
  onClose,
  card,
  onApplyBanner,
  onSaveToImageHub,
  subscription,
  onConsumeAiCoin,
  onOpenSubscriptionModal,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<
    | 'dolomites_peaks'
    | 'amalfi_coast'
    | 'desert_canyon'
    | 'emerald_fairway'
    | 'kyoto_bamboo'
    | 'executive_gold'
  >('dolomites_peaks');
  const [customPrompt, setCustomPrompt] = useState('');
  const [bannerTitle, setBannerTitle] = useState('AI 3D Landscape Backdrop');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [generatedBannerUrl, setGeneratedBannerUrl] = useState<string | null>(
    card.coverBannerUrl || null
  );
  const [generationMeta, setGenerationMeta] = useState<string | null>(null);

  if (!isOpen) return null;

  const stylePresets = [
    {
      id: 'dolomites_peaks' as const,
      name: 'Dolomites & Peaks',
      desc: 'Alpenglow mountain ridges & misty pine valley depth',
      previewGradient: 'from-slate-900 via-indigo-950 to-amber-700/70',
    },
    {
      id: 'amalfi_coast' as const,
      name: 'Amalfi & Pacific Cliffs',
      desc: 'Golden hour coastal headlands & turquoise horizon',
      previewGradient: 'from-cyan-950 via-amber-900/60 to-orange-600/70',
    },
    {
      id: 'desert_canyon' as const,
      name: 'Desert Dunes & Canyons',
      desc: 'Sculpted golden sand ridges & crimson canyon dusk',
      previewGradient: 'from-amber-950 via-orange-900/70 to-rose-950',
    },
    {
      id: 'emerald_fairway' as const,
      name: 'Emerald Links & Fjords',
      desc: 'Morning dew championship fairway & Nordic mirror fjord',
      previewGradient: 'from-emerald-950 via-teal-900 to-cyan-950',
    },
    {
      id: 'kyoto_bamboo' as const,
      name: 'Kyoto Bamboo & Valley',
      desc: 'Sunlit bamboo sanctuary & misty autumn maple gorge',
      previewGradient: 'from-emerald-950 via-amber-950 to-red-950',
    },
    {
      id: 'executive_gold' as const,
      name: 'Obsidian & Gold',
      desc: 'Dark brushed titanium with satin gold geometric lines',
      previewGradient: 'from-zinc-950 via-zinc-900 to-amber-950/60',
    },
  ];

  const compressDataUrl = (dataUrl: string, maxWidth = 1280, quality = 0.82): Promise<string> => {
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

  const quotaSummary = subscription ? getQuotaSummary(subscription) : null;

  const handleGenerate = async () => {
    if (onConsumeAiCoin) {
      const styleName = stylePresets.find((s) => s.id === selectedStyle)?.name || 'AI Style';
      const allowed = onConsumeAiCoin(
        'image_banner',
        `AI Cover Banner Generator (${styleName})`
      );
      if (!allowed) {
        return;
      }
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    try {
      const res = await apiFetch('/api/ai/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          style: selectedStyle,
          company: card.name,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.imageUrl) {
        const optimizedUrl = await compressDataUrl(data.imageUrl);
        setGeneratedBannerUrl(optimizedUrl);
        setGenerationMeta(data.model || 'Gemini 3.1 Flash Image');
        const styleName = stylePresets.find((s) => s.id === selectedStyle)?.name || 'AI Style';
        setBannerTitle(`AI ${styleName} (${card.name})`);
      } else {
        throw new Error('No image returned');
      }
    } catch (err: any) {
      console.error('Error generating banner:', err);
      setErrorMsg('Could not reach AI image model. Applied high-resolution executive preset.');
      // Fallback
      setGeneratedBannerUrl(
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80'
      );
      setBannerTitle(`AI Executive Horizon (${card.name})`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveOnlyToHub = () => {
    if (!generatedBannerUrl) return;
    if (onSaveToImageHub) {
      onSaveToImageHub({
        url: generatedBannerUrl,
        name: bannerTitle.trim() || 'AI Generated Banner',
        style: selectedStyle,
      });
      setSaveSuccessMsg('Cover banner saved to your Image Hub!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleApply = () => {
    if (generatedBannerUrl) {
      onApplyBanner(generatedBannerUrl, bannerTitle);
      if (onSaveToImageHub) {
        onSaveToImageHub({
          url: generatedBannerUrl,
          name: bannerTitle.trim() || 'AI Generated Banner',
          style: selectedStyle,
        });
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Cover Banner Generator</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  Gemini Flash Image
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generate a bespoke, cinematic widescreen backdrop tailored to your card edition.
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

        {/* Live Preview Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              Live Banner Preview
            </span>
            {generationMeta && (
              <span className="text-[10px] font-mono text-cyan-400">
                Synthesized: {generationMeta}
              </span>
            )}
          </div>

          <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group">
            {generatedBannerUrl ? (
              <img
                src={generatedBannerUrl}
                alt="AI Generated Cover Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <ImageIcon className="h-8 w-8 text-slate-600" />
                <span className="text-xs">Select a style below or enter a custom prompt</span>
              </div>
            )}

            {/* Gradient Overlay & Card Context Simulation */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  {card.name} Backdrop
                </span>
                <div className="text-xs font-bold text-white drop-shadow mt-1">
                  16:9 Ultra-Widescreen Card Banner
                </div>
              </div>
              {generatedBannerUrl && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/40">
                  <CheckCircle2 className="h-3 w-3" /> Ready to Apply
                </span>
              )}
            </div>

            {isGenerating && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-cyan-400 animate-in fade-in">
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-xs font-medium text-slate-200">
                  Synthesizing luxury banner with Gemini AI...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Custom Prompt Box (Promoted to Top for Custom User Descriptions) */}
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Describe Your Custom Backdrop</span>
            </label>
            <span className="text-[10px] text-slate-400">Write any scene, lighting, or architectural mood</span>
          </div>
          <textarea
            rows={2}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Panoramic glass penthouse overlooking a twilight city skyline with warm amber lighting, or sunlit coastal golf links at sunrise..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-500 mr-1">Try:</span>
            {[
              'Snowy Swiss alpine peaks at golden hour',
              'Minimalist concrete & glass villa overlooking the sea',
              'Futuristic midnight skyline with warm bokeh',
              'Championship golf fairway along coastal cliffs',
            ].map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setCustomPrompt(idea)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 transition"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        {/* Style Presets Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Or Pick a Base Visual Atmosphere
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stylePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedStyle(preset.id)}
                className={`p-2.5 rounded-xl border text-left transition group ${
                  selectedStyle === preset.id
                    ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400/40'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{preset.name}</span>
                  <div
                    className={`h-2.5 w-6 rounded-full bg-gradient-to-r ${preset.previewGradient} border border-white/20`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 leading-snug">
                  {preset.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Banner Title & Image Hub Info (when generated) */}
        {generatedBannerUrl && (
          <div className="space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                Asset Name in Image Hub
              </label>
              <span className="text-[10px] font-mono text-cyan-400">16:9 Cover Banner</span>
            </div>
            <input
              type="text"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              placeholder="e.g. AI Executive Horizon"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-xs text-amber-300">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{quotaSummary ? quotaSummary.totalAvailableCoins : 10}</span>
            </span>
            {onOpenSubscriptionModal && (
              <button
                type="button"
                onClick={() => onOpenSubscriptionModal()}
                className="text-[10px] text-amber-400 hover:underline ml-1"
              >
                +Coins
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-md shadow-cyan-600/20 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                  <span>{generatedBannerUrl ? 'Regenerate' : 'Generate'}</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                    <Coins className="h-2.5 w-2.5 text-amber-400" />
                    <span>1</span>
                  </span>
                </>
              )}
            </button>

            {generatedBannerUrl && (
              <>
                <button
                  type="button"
                  onClick={handleSaveOnlyToHub}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 text-xs font-semibold text-indigo-200 transition"
                  title="Save banner to your Image Hub without applying to this card"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Save to Image Hub</span>
                </button>

                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Apply & Save</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
