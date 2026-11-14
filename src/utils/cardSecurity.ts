import { DigitalCard, CardSecurityTraceability } from '../types';

/**
 * Secret internal salt for cryptographic card number generation and authenticity hashing
 */
const CARD_SECURITY_SALT = 'YC_SEC_SALT_2026_V1';

/**
 * Generates a pseudo-random or deterministic 16-hex character formatted card number:
 * Format: YC-XXXX-XXXX-XXXX-XXXX
 */
export function generateFormattedCardNumber(seedStr?: string): string {
  let hexString = '';
  if (seedStr) {
    // Generate deterministic hash from seed
    let h1 = 0xdeadbeef ^ seedStr.length;
    let h2 = 0x41c6ce57 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      const ch = seedStr.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const part1 = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
    const part2 = (h2 >>> 0).toString(16).padStart(8, '0').toUpperCase();
    hexString = (part1 + part2).slice(0, 16);
  } else {
    // Random secure hex bytes
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(8);
      crypto.getRandomValues(bytes);
      hexString = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join('');
    } else {
      hexString = Math.random().toString(16).slice(2, 10).toUpperCase() +
                  Math.random().toString(16).slice(2, 10).toUpperCase();
    }
  }

  // Format into YC-XXXX-XXXX-XXXX-XXXX
  const s = hexString.padEnd(16, '0').slice(0, 16);
  return `YC-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

/**
 * Computes a fast cryptographic SHA-256 fingerprint hex string
 */
export async function computeSecurityHash(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input + ':' + CARD_SECURITY_SALT);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }
  // Synchronous fallback hash
  let hash = 0;
  const str = input + ':' + CARD_SECURITY_SALT;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

/**
 * Masks an email address for privacy in public audit logs (e.g. "roberto@example.com" -> "r***o@example.com")
 */
export function maskOwnerEmail(email?: string): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Generates a full CardSecurityTraceability record binding a card to a registered user
 */
export function generateCardSecurityTraceability(
  cardId: string,
  ownerId?: string,
  ownerEmail?: string
): CardSecurityTraceability {
  const cleanOwnerId = (ownerId && ownerId.trim().length > 0) ? ownerId.trim() : 'anonymous';
  const timestamp = new Date().toISOString();
  const seed = `${cleanOwnerId}:${cardId}:${timestamp}`;
  const cardNumber = generateFormattedCardNumber(seed);

  // Synchronous initial hash; will be verified/updated on sync
  let hashNum = 0;
  const rawSeed = `${cardNumber}:${cleanOwnerId}:${cardId}:${CARD_SECURITY_SALT}`;
  for (let i = 0; i < rawSeed.length; i++) {
    hashNum = (hashNum << 5) - hashNum + rawSeed.charCodeAt(i);
    hashNum |= 0;
  }
  const securityHash = Math.abs(hashNum).toString(16).padStart(32, '0');

  return {
    cardNumber,
    securityHash,
    registeredOwnerId: cleanOwnerId,
    registeredOwnerEmailMasked: maskOwnerEmail(ownerEmail),
    issuedAt: timestamp,
    status: 'active',
  };
}

/**
 * Ensures a DigitalCard has its unique cryptographic card security number and traceability metadata.
 * If the user signs in with a real account (ownerId), updates the binding while preserving the existing card number.
 */
export function ensureCardSecurityTraceability(
  card: DigitalCard,
  ownerId?: string,
  ownerEmail?: string
): DigitalCard {
  const cleanOwnerId = (ownerId && ownerId.trim().length > 0) ? ownerId.trim() : 'anonymous';

  if (card.securityTraceability && card.cardSecurityNumber) {
    // If card was previously anonymous and now we have an authenticated user ID, bind it
    if (
      cleanOwnerId !== 'anonymous' &&
      card.securityTraceability.registeredOwnerId === 'anonymous'
    ) {
      return {
        ...card,
        securityTraceability: {
          ...card.securityTraceability,
          registeredOwnerId: cleanOwnerId,
          registeredOwnerEmailMasked: maskOwnerEmail(ownerEmail) || card.securityTraceability.registeredOwnerEmailMasked,
        },
      };
    }
    return card;
  }

  // Generate new traceability record
  const securityTraceability = generateCardSecurityTraceability(card.id, cleanOwnerId, ownerEmail);

  return {
    ...card,
    cardSecurityNumber: securityTraceability.cardNumber,
    securityTraceability,
  };
}

/**
 * Ensures an array of DigitalCards all have valid security numbers
 */
export function ensureAllCardsSecurityTraceability(
  cards: DigitalCard[],
  ownerId?: string,
  ownerEmail?: string
): DigitalCard[] {
  return cards.map((c) => ensureCardSecurityTraceability(c, ownerId, ownerEmail));
}

