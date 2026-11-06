import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { MasterProfile, DigitalCard } from '../types';
import { generateVCardString, downloadVCard } from '../utils/vcard';
import { getCardPublicUrl, getCardDisplayUrl, publishCardToServer } from '../utils/urlHelper';
import { writeBusinessCardToNfc, isWebNfcSupported } from '../services/nfc';
import { DigitalCardRenderer } from './DigitalCardRenderer';
import {
  X,
  QrCode,
  Download,
  Copy,
  CheckCheck,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Mail,
  Phone,
  Globe,
  CreditCard,
  Radio,
  Share2,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  card: DigitalCard;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  profile,
  card,
}) => {
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareTab, setShareTab] = useState<'preview' | 'qr' | 'link' | 'nfc'>('preview');
  const [qrFormat, setQrFormat] = useState<'weblink' | 'vcard'>('weblink');
  const [nfcWriting, setNfcWriting] = useState(false);
  const [nfcStatusMsg, setNfcStatusMsg] = useState<string | null>(null);

  const publicUrl = getCardPublicUrl(card);

  const handleWriteNfcTag = async () => {
    setNfcWriting(true);
    setNfcStatusMsg('Hold NFC tag near device...');
    try {
      const res = await writeBusinessCardToNfc({
        profile,
        card,
        mode: 'hybrid',
        onStatusUpdate: (msg) => setNfcStatusMsg(msg),
      });
      if (res.success) {
        setNfcStatusMsg(`✓ Written successfully! (${res.totalBytes} bytes)`);
      }
    } catch (err: any) {
      setNfcStatusMsg(`Error: ${err.message || 'Write failed'}`);
    } finally {
      setNfcWriting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      publishCardToServer(card, profile);
      const textToEncode = qrFormat === 'weblink' ? publicUrl : generateVCardString(profile, card);
      QRCode.toDataURL(textToEncode, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      }).then(setQrUrl);
    }
  }, [isOpen, profile, card, qrFormat, publicUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const vcard = generateVCardString(profile, card);
    downloadVCard(`${profile.name}_${card.name}`, vcard);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Share Business Card</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300">
                "{card.name}"
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-channel sharing: 3D interactive flip, instant QR camera import, public link, and NFC tap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Share Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setShareTab('preview')}
            className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              shareTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Interactive Card</span>
          </button>
          <button
            onClick={() => setShareTab('qr')}
            className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              shareTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Offline QR</span>
          </button>
          <button
            onClick={() => setShareTab('link')}
            className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              shareTab === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Public Link</span>
          </button>
          <button
            onClick={() => setShareTab('nfc')}
            className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
              shareTab === 'nfc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>NFC Tap</span>
          </button>
        </div>

        {/* Tab 1: Interactive Card Preview (Recipient View Simulation) */}
        {shareTab === 'preview' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-3.5 py-2 text-[11px] text-indigo-200 flex items-center justify-between gap-2">
              <span>
                <strong>Recipient View Simulation:</strong> Shows only your selected info & images (QR code & Wallet Pass are private to you).
              </span>
            </div>
            <DigitalCardRenderer
              profile={profile}
              card={card}
              interactive={true}
              recipientMode={true}
              showRecipientActions={true}
            />
          </div>
        )}

        {/* Tab 2: QR Sharing */}
        {shareTab === 'qr' && (
          <div className="space-y-4 text-center py-2">
            <div className="flex items-center justify-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-fit mx-auto">
              <button
                type="button"
                onClick={() => setQrFormat('weblink')}
                className={`py-1 px-3 rounded-lg font-medium transition ${
                  qrFormat === 'weblink' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Web Link (Open Card on Mobile)
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('vcard')}
                className={`py-1 px-3 rounded-lg font-medium transition ${
                  qrFormat === 'vcard' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Offline vCard (.vcf)
              </button>
            </div>

            <div className="mx-auto w-fit p-4 bg-white rounded-2xl shadow-xl">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="h-52 w-52 mx-auto" />
              ) : (
                <div className="h-52 w-52 bg-slate-800 rounded animate-pulse" />
              )}
            </div>

            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {qrFormat === 'weblink'
                ? `Scanners open ${profile.name}'s luxury digital card directly in their phone browser with instant action buttons.`
                : `Encodes raw RFC 2426 vCard into the QR for offline address book import without internet.`}
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-500/20"
              >
                <Download className="h-4 w-4" />
                <span>Download vCard (.vcf)</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition border border-slate-700"
              >
                {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied Real Link' : 'Copy Mobile Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Public Link */}
        {shareTab === 'link' && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Claimed Public Profile URL</label>
              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300">
                <span className="truncate flex-1 font-mono text-[11px]">{publicUrl}</span>
                <button
                  onClick={handleCopy}
                  className="ml-2 p-1 text-slate-400 hover:text-white transition"
                  title="Copy URL"
                >
                  {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2">
              <div className="text-slate-300 font-semibold">Recipient Landing Page Preview:</div>
              <div className="flex items-center gap-3 text-slate-400">
                <img src={profile.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover border border-white/20" />
                <div>
                  <div className="text-white font-medium">{profile.name}</div>
                  <div className="text-[11px]">{profile.role} · {profile.company}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-500/20"
            >
              {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Vanity Link'}</span>
            </button>
          </div>
        )}

        {/* Tab 4: NFC */}
        {shareTab === 'nfc' && (
          <div className="space-y-4 text-xs text-center">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <Smartphone className="h-10 w-10 text-cyan-400 mx-auto" />
              <div className="font-semibold text-slate-200">Physical NFC Tap Protocol</div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Hold any NFC metal card, smart ring, or sticker tag against the back of your smartphone antenna to write this digital card into the physical chip memory.
              </p>
              <div className="text-[10px] font-mono text-cyan-400 border border-slate-800 rounded bg-black/40 py-1 px-2">
                Format: NDEF Hybrid (URL + vCard 3.0 MIME)
              </div>
            </div>

            <button
              onClick={handleWriteNfcTag}
              disabled={nfcWriting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50 shadow-md shadow-cyan-500/20"
            >
              <Smartphone className="h-4 w-4" />
              <span>{nfcWriting ? 'Writing to Physical Tag...' : 'Write Active Card to NFC Tag'}</span>
            </button>

            {nfcStatusMsg && (
              <div className="text-[11px] font-mono p-2 rounded bg-slate-950 border border-slate-800 text-emerald-400 text-center">
                {nfcStatusMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
