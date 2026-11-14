import { DigitalCard, MasterProfile } from '../types';
import { apiFetch, getPublicWebOrigin, isNativeMobilePlatform } from './apiConfig';

/**
 * Returns the fully qualified public URL for opening a digital business card on any smartphone or browser.
 * Uses getPublicWebOrigin() so Capacitor iOS/Android builds always encode a real HTTPS Universal Link
 * rather than `capacitor://localhost` or `https://localhost`.
 */
export function getCardPublicUrl(card: { vanitySlug?: string; id?: string }): string {
  const origin = getPublicWebOrigin();
  const slug = encodeURIComponent(card.vanitySlug || card.id || 'profile');
  return `${origin}/p/${slug}`;
}

/**
 * Returns a clean, human-readable URL display string (e.g. "youconnect.app/p/elena-exec")
 */
export function getCardDisplayUrl(card: { vanitySlug?: string; id?: string }): string {
  const slug = card.vanitySlug || card.id || 'profile';
  if (typeof window === 'undefined' || isNativeMobilePlatform()) {
    const origin = getPublicWebOrigin().replace(/^https?:\/\//i, '');
    return `${origin}/p/${slug}`;
  }
  const host = window.location.host;
  return `${host}/p/${slug}`;
}

function getOrCreateClientOwnerToken(): string {
  try {
    const key = 'youconnect_card_owner_token_v1';
    let token = localStorage.getItem(key);
    if (!token) {
      token = `own_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, token);
    }
    return token;
  } catch {
    return 'ephemeral_owner';
  }
}

export function sanitizeProfileForPublicShare(profile: MasterProfile, card: DigitalCard): MasterProfile {
  const vis = card.visibleFields || ({} as any);
  const sharedRubricaIds = Array.isArray(card.sharedRubricaFieldIds) ? card.sharedRubricaFieldIds : [];

  const isSocialAllowed = (k: string) => {
    if (vis.socials === false) return false;
    return (vis as Record<string, any>)[k] !== false;
  };

  const filteredPersonalSocials: Record<string, string> = {};
  if (profile.personalData?.socials) {
    for (const [k, v] of Object.entries(profile.personalData.socials)) {
      if (isSocialAllowed(k) && v) filteredPersonalSocials[k] = v;
    }
  }

  const filteredWorkSocials: Record<string, string> = {};
  if (profile.workData?.socials) {
    for (const [k, v] of Object.entries(profile.workData.socials)) {
      if (isSocialAllowed(k) && v) filteredWorkSocials[k] = v;
    }
  }

  const filteredRootSocials: Record<string, string> = {};
  if (profile.socials) {
    for (const [k, v] of Object.entries(profile.socials)) {
      if (isSocialAllowed(k) && v) filteredRootSocials[k] = v;
    }
  }

  return {
    ...profile,
    role: vis.role !== false ? profile.role : '',
    company: vis.company !== false ? profile.company : '',
    companyLogoUrl: vis.companyLogo !== false ? profile.companyLogoUrl : undefined,
    headline: vis.headline !== false ? profile.headline : '',
    bio: vis.bio !== false ? profile.bio : '',
    email: vis.workEmail || vis.email ? profile.email : '',
    phone: vis.workPhone || vis.phone ? profile.phone : '',
    website: vis.website ? profile.website : '',
    location: vis.location ? profile.location : '',
    nickname: vis.nickname ? profile.nickname : undefined,
    pronouns: vis.pronouns ? profile.pronouns : undefined,
    gender: vis.gender ? profile.gender : undefined,
    personalData: profile.personalData
      ? {
          firstName: profile.personalData.firstName,
          lastName: profile.personalData.lastName,
          fullName: profile.personalData.fullName,
          nickname: vis.nickname ? profile.personalData.nickname : undefined,
          pronouns: vis.pronouns ? profile.personalData.pronouns : undefined,
          gender: vis.gender ? profile.personalData.gender : undefined,
          phone: vis.personalPhone ? profile.personalData.phone : '',
          email: vis.personalEmail ? profile.personalData.email : '',
          address: vis.homeAddress ? profile.personalData.address : undefined,
          birthday: vis.birthday ? profile.personalData.birthday : undefined,
          emergencyContact: vis.emergencyContact ? profile.personalData.emergencyContact : undefined,
          emergencyContacts: vis.emergencyContact ? profile.personalData.emergencyContacts : undefined,
          bio: vis.personalBio ? profile.personalData.bio : undefined,
          socials: filteredPersonalSocials,
        }
      : undefined,
    workData: profile.workData
      ? {
          role: vis.role !== false ? profile.workData.role : '',
          company: vis.company !== false ? profile.workData.company : '',
          companyLogoUrl: vis.companyLogo !== false ? profile.workData.companyLogoUrl : undefined,
          department: vis.department ? profile.workData.department : undefined,
          phone: vis.workPhone || vis.phone ? profile.workData.phone : '',
          email: vis.workEmail || vis.email ? profile.workData.email : '',
          website: vis.website ? profile.workData.website : undefined,
          officeAddress: vis.officeAddress ? profile.workData.officeAddress : undefined,
          headline: vis.headline !== false ? profile.workData.headline : undefined,
          bio: vis.bio !== false ? profile.workData.bio : undefined,
          taxIdOrVat: vis.taxIdOrVat || vis.taxId ? profile.workData.taxIdOrVat : undefined,
          bookingLink: vis.bookingLink ? profile.workData.bookingLink : undefined,
          socials: filteredWorkSocials,
        }
      : undefined,
    socials: filteredRootSocials as any,
    rubricaFields: Array.isArray(profile.rubricaFields)
      ? profile.rubricaFields.filter((rf) => sharedRubricaIds.includes(rf.id))
      : [],
    passions: vis.passions !== false ? profile.passions : [],
    education: vis.education !== false ? profile.education : [],
    portfolio: vis.portfolioSection !== false && vis.portfolio !== false ? profile.portfolio : [],
    storedPictures: [],
    storedBanners: [],
  };
}

const lastPublishedSignatureByCard = new Map<string, string>();
const inFlightSignatureByCard = new Map<string, string>();
const pendingPublishTimersByCard = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Publishes the sanitized card and profile to the server memory store so any phone or remote device
 * that scans the QR code can immediately retrieve and render the authentic card without leaking unshared fields.
 * Deduplicates identical payloads and debounces rapid edits so the server is never spammed.
 */
export async function publishCardToServer(card: DigitalCard, profile: MasterProfile): Promise<boolean> {
  if (typeof window === 'undefined' || !card?.id) return false;
  try {
    const sanitizedProfile = sanitizeProfileForPublicShare(profile, card);
    const ownerToken = getOrCreateClientOwnerToken();
    const slug = card.vanitySlug || card.id;
    const payloadObj = {
      slug,
      cardId: card.id,
      card,
      profile: sanitizedProfile,
      ownerToken,
    };
    const payloadJson = JSON.stringify(payloadObj);

    // Skip if this exact card + profile state was already published or is currently in flight
    if (
      lastPublishedSignatureByCard.get(card.id) === payloadJson ||
      inFlightSignatureByCard.get(card.id) === payloadJson
    ) {
      return true;
    }

    const existingTimer = pendingPublishTimersByCard.get(card.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(async () => {
        pendingPublishTimersByCard.delete(card.id);
        if (
          lastPublishedSignatureByCard.get(card.id) === payloadJson ||
          inFlightSignatureByCard.get(card.id) === payloadJson
        ) {
          resolve(true);
          return;
        }
        inFlightSignatureByCard.set(card.id, payloadJson);
        try {
          const res = await apiFetch('/api/cards/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadJson,
          });
          if (res.ok) {
            lastPublishedSignatureByCard.set(card.id, payloadJson);
          }
          resolve(res.ok);
        } catch {
          resolve(false);
        } finally {
          inFlightSignatureByCard.delete(card.id);
        }
      }, 350);

      pendingPublishTimersByCard.set(card.id, timer);
    });
  } catch {
    return false;
  }
}
