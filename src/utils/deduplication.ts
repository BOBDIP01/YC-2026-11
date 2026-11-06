import { CRMContact, DuplicatePair } from '../types';

/**
 * Standard Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  const m = s1.length;
  const n = s2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Calculates string similarity ratio between 0 and 1
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Normalizes phone numbers to digits only
 */
export function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Compares two CRM contacts across multiple fields and returns match confidence
 */
export function evaluateDuplicateScore(a: CRMContact, b: CRMContact): { score: number; matchedFields: string[] } {
  if (a.id === b.id) return { score: 0, matchedFields: [] };

  const matchedFields: string[] = [];
  let totalScore = 0;

  // 1. Exact or partial email match
  const emailA = (a.email || '').toLowerCase().trim();
  const emailB = (b.email || '').toLowerCase().trim();
  if (emailA && emailB && emailA === emailB) {
    totalScore += 55;
    matchedFields.push('Email (Exact)');
  } else if (emailA && emailB && emailA.split('@')[0] === emailB.split('@')[0]) {
    totalScore += 25;
    matchedFields.push('Email Handle');
  }

  // 2. Phone match
  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA.length >= 7 && phoneB.length >= 7) {
    if (phoneA === phoneB || phoneA.endsWith(phoneB) || phoneB.endsWith(phoneA)) {
      totalScore += 40;
      matchedFields.push('Phone Number');
    }
  }

  // 3. Name similarity (Levenshtein)
  const nameSim = stringSimilarity(a.name, b.name);
  if (nameSim >= 0.85) {
    totalScore += Math.round(nameSim * 35);
    matchedFields.push(`Name Similarity (${Math.round(nameSim * 100)}%)`);
  }

  // 4. Company similarity
  const companySim = stringSimilarity(a.company, b.company);
  if (a.company && b.company && companySim >= 0.85) {
    totalScore += 15;
    matchedFields.push('Company');
  }

  // Normalized score capped at 99% unless identical email & phone
  const finalScore = Math.min(100, totalScore);

  return {
    score: finalScore,
    matchedFields,
  };
}

/**
 * Scans a contacts list and returns all duplicate pairs above a threshold
 */
export function findDuplicatePairs(contacts: CRMContact[], threshold = 60): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      const pairKey = [a.id, b.id].sort().join(':');

      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const { score, matchedFields } = evaluateDuplicateScore(a, b);
      if (score >= threshold) {
        pairs.push({
          contactA: a,
          contactB: b,
          similarityScore: score,
          matchedFields,
        });
      }
    }
  }

  return pairs.sort((x, y) => y.similarityScore - x.similarityScore);
}

/**
 * Merges contact A and contact B using user-selected field values
 */
export function mergeContacts(
  primary: CRMContact,
  secondary: CRMContact,
  fieldOverrides: Partial<Record<keyof CRMContact, any>>
): CRMContact {
  const mergedTags = Array.from(new Set([...(primary.tags || []), ...(secondary.tags || [])]));

  return {
    ...primary,
    ...fieldOverrides,
    tags: mergedTags,
    notes: [primary.notes, secondary.notes].filter(Boolean).join('\n---\n'),
    updatedAt: new Date().toISOString(),
  };
}
