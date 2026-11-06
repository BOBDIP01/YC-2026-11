import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MasterProfile, DigitalCard } from '../types';
import { getCardPublicUrl, getCardDisplayUrl } from '../utils/urlHelper';
import {
  X,
  Copy,
  Check,
  Mail,
  Smartphone,
  ExternalLink,
  Sparkles,
  QrCode,
  Layers,
  Palette,
  Eye,
  Download,
} from 'lucide-react';

interface EmailSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MasterProfile;
  card: DigitalCard;
}

export const EmailSignatureModal: React.FC<EmailSignatureModalProps> = ({
  isOpen,
  onClose,
  profile,
  card,
}) => {
  const [signatureStyle, setSignatureStyle] = useState<'executive' | 'compact' | 'dual_brand'>('executive');
  const [includeQr, setIncludeQr] = useState(true);
  const [includePhone, setIncludePhone] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  const cardUrl = getCardPublicUrl(card);
  const displayUrl = getCardDisplayUrl(card);
  const companyLogo = card.companyLogoUrl || profile.workData?.companyLogoUrl || profile.companyLogoUrl;
  const role = profile.workData?.role || profile.role;
  const company = profile.workData?.company || profile.company;
  const email = profile.workData?.email || profile.email;
  const phone = profile.workData?.phone || profile.phone;

  useEffect(() => {
    async function genQr() {
      try {
        const dataUrl = await QRCode.toDataURL(cardUrl, {
          width: 140,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        setQrBase64(dataUrl);
      } catch (e) {
        console.error('Failed to generate signature QR:', e);
      }
    }
    if (isOpen) {
      genQr();
    }
  }, [isOpen, cardUrl]);

  if (!isOpen) return null;

  // Generate HTML for clipboard
  const generateSignatureHtml = () => {
    const accent = card.accentColor || '#6366F1';
    
    if (signatureStyle === 'compact') {
      return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b;">
  <tr>
    <td style="padding-right: 14px; vertical-align: top;">
      <img src="${profile.avatarUrl}" alt="${profile.name}" width="60" height="60" style="border-radius: 50%; object-fit: cover; display: block; border: 2px solid ${accent};" />
    </td>
    <td style="vertical-align: top; border-left: 2px solid #e2e8f0; padding-left: 14px;">
      <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${profile.name}</div>
      <div style="font-size: 12px; color: ${accent}; font-weight: 600;">${role}${company ? ` · ${company}` : ''}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
        ${email ? `<a href="mailto:${email}" style="color: #475569; text-decoration: none;">${email}</a>` : ''}
        ${includePhone && phone ? ` &bull; <a href="tel:${phone}" style="color: #475569; text-decoration: none;">${phone}</a>` : ''}
      </div>
      <div style="margin-top: 6px;">
        <a href="${cardUrl}" style="display: inline-block; font-size: 10px; font-weight: bold; color: #ffffff; background-color: ${accent}; padding: 3px 8px; border-radius: 4px; text-decoration: none;">Save Virtual Card &rarr;</a>
      </div>
    </td>
  </tr>
</table>`.trim();
    }

    if (signatureStyle === 'dual_brand') {
      return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b;">
  <tr>
    <td style="padding-right: 16px; vertical-align: middle;">
      <img src="${profile.avatarUrl}" alt="${profile.name}" width="72" height="72" style="border-radius: 12px; object-fit: cover; display: block; border: 2px solid ${accent};" />
    </td>
    <td style="vertical-align: top; border-left: 2px solid ${accent}; padding-left: 16px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">${profile.name}</span>
            ${profile.isVerified ? '<span style="color: #10b981; font-size: 12px; margin-left: 4px;">&#10003; Verified</span>' : ''}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; font-weight: 600; color: #334155; padding-top: 2px;">
            ${role} ${company ? `<span style="color: ${accent};">@ ${company}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #64748b; padding-top: 6px;">
            ${email ? `<a href="mailto:${email}" style="color: #64748b; text-decoration: none;">&#9993; ${email}</a>` : ''}
            ${includePhone && phone ? `<span style="margin: 0 6px;">|</span><a href="tel:${phone}" style="color: #64748b; text-decoration: none;">&#9742; ${phone}</a>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding-top: 10px;">
            <a href="${cardUrl}" style="display: inline-block; font-size: 11px; font-weight: bold; color: #ffffff; background-color: #0f172a; padding: 5px 12px; border-radius: 6px; text-decoration: none; border: 1px solid #334155;">
              &#128179; Connect via Digital Business Card
            </a>
          </td>
        </tr>
      </table>
    </td>
    ${includeQr && qrBase64 ? `
    <td style="padding-left: 20px; vertical-align: middle; text-align: center;">
      <img src="${qrBase64}" width="68" height="68" alt="Scan QR" style="display: block; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px; background: #ffffff;" />
      <div style="font-size: 9px; font-family: monospace; color: #94a3b8; margin-top: 3px;">SCAN TO SAVE</div>
    </td>` : ''}
  </tr>
</table>`.trim();
    }

    // Default: Executive
    return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.45; color: #1e293b;">
  <tr>
    <td style="padding-right: 18px; vertical-align: top;">
      <img src="${profile.avatarUrl}" alt="${profile.name}" width="80" height="80" style="border-radius: 14px; object-fit: cover; display: block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 2px solid ${accent};" />
      ${includeLogo && companyLogo ? `
      <div style="margin-top: 6px; text-align: center;">
        <img src="${companyLogo}" alt="${company}" width="60" style="max-height: 24px; object-fit: contain; display: inline-block;" />
      </div>` : ''}
    </td>
    <td style="vertical-align: top; border-left: 2px solid #e2e8f0; padding-left: 18px;">
      <div style="font-size: 16px; font-weight: bold; color: #0f172a; letter-spacing: -0.2px;">${profile.name}</div>
      <div style="font-size: 13px; font-weight: 600; color: ${accent}; margin-top: 1px;">${role}</div>
      <div style="font-size: 12px; color: #475569; margin-top: 1px;">${company}</div>
      
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 8px; font-size: 12px; color: #64748b;">
        ${includePhone && phone ? `
        <tr>
          <td style="padding-bottom: 2px; color: #94a3b8; font-size: 11px; padding-right: 6px;">T:</td>
          <td style="padding-bottom: 2px;"><a href="tel:${phone}" style="color: #475569; text-decoration: none;">${phone}</a></td>
        </tr>` : ''}
        ${email ? `
        <tr>
          <td style="padding-bottom: 2px; color: #94a3b8; font-size: 11px; padding-right: 6px;">E:</td>
          <td style="padding-bottom: 2px;"><a href="mailto:${email}" style="color: #475569; text-decoration: none;">${email}</a></td>
        </tr>` : ''}
        <tr>
          <td style="padding-bottom: 2px; color: #94a3b8; font-size: 11px; padding-right: 6px;">W:</td>
          <td style="padding-bottom: 2px;"><a href="${cardUrl}" style="color: ${accent}; text-decoration: none; font-weight: 600;">${displayUrl}</a></td>
        </tr>
      </table>

      <div style="margin-top: 10px;">
        <a href="${cardUrl}" style="display: inline-block; background-color: ${accent}; color: #ffffff; font-size: 11px; font-weight: bold; padding: 5px 12px; border-radius: 6px; text-decoration: none;">
          View Digital Business Card &rarr;
        </a>
      </div>
    </td>
    ${includeQr && qrBase64 ? `
    <td style="padding-left: 20px; vertical-align: top; text-align: center;">
      <div style="background: #ffffff; padding: 4px; border-radius: 8px; border: 1px solid #e2e8f0; display: inline-block;">
        <img src="${qrBase64}" width="72" height="72" alt="QR" style="display: block;" />
      </div>
      <div style="font-size: 9px; font-family: monospace; color: #94a3b8; margin-top: 4px;">SCAN FOR VCARD</div>
    </td>` : ''}
  </tr>
</table>`.trim();
  };

  const handleCopyRichText = async () => {
    try {
      const html = generateSignatureHtml();
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([`${profile.name}\n${role} @ ${company}\n${cardUrl}`], { type: 'text/plain' });
      
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2500);
    } catch (e) {
      console.warn('Fallback to text copy:', e);
      await navigator.clipboard.writeText(generateSignatureHtml());
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2500);
    }
  };

  const handleCopyRawHtml = () => {
    navigator.clipboard.writeText(generateSignatureHtml());
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Dynamic Email Signature Generator</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  Professional HTML
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generate a clickable, branded HTML email signature for Gmail, Outlook, or Apple Mail.
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

        {/* Style Selector Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setSignatureStyle('executive')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition ${
              signatureStyle === 'executive'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Executive Horizontal
          </button>
          <button
            onClick={() => setSignatureStyle('dual_brand')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition ${
              signatureStyle === 'dual_brand'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dual-Brand Card
          </button>
          <button
            onClick={() => setSignatureStyle('compact')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition ${
              signatureStyle === 'compact'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Clean Compact
          </button>
        </div>

        {/* Customization Toggles */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeQr}
              onChange={(e) => setIncludeQr(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <span>Include QR Code</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePhone}
              onChange={(e) => setIncludePhone(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <span>Include Phone</span>
          </label>
          {companyLogo && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span>Include Company Logo</span>
            </label>
          )}
        </div>

        {/* Live White-Background Email Signature Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Email Client Preview (Light Canvas):</span>
            <span className="font-mono text-[10px]">HTML 4.01 / Responsive Table</span>
          </div>

          <div
            ref={previewRef}
            className="p-6 bg-white rounded-xl shadow-inner border border-slate-300 overflow-x-auto text-slate-900 select-text"
            dangerouslySetInnerHTML={{ __html: generateSignatureHtml() }}
          />
        </div>

        {/* How to use instruction */}
        <div className="text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-1">
          <div className="font-semibold text-slate-300">How to install in Gmail or Outlook:</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Click <strong>"Copy Rich Signature"</strong> below.</li>
            <li>Open Gmail Settings &rarr; <em>General</em> &rarr; <em>Signature</em> (or Outlook Settings &rarr; <em>Signatures</em>).</li>
            <li>Paste directly (<kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Ctrl+V</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-[10px]">Cmd+V</kbd>) into the signature box and save.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleCopyRawHtml}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
          >
            {copiedHtml ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedHtml ? 'Copied HTML Code!' : 'Copy Raw HTML'}</span>
          </button>

          <button
            onClick={handleCopyRichText}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition"
          >
            {copiedRich ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copiedRich ? 'Copied to Clipboard!' : 'Copy Rich Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
