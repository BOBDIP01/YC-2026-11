import { MasterProfile, DigitalCard, CRMContact, CardVisibleFields } from '../types';

/**
 * Generates standard vCard 3.0 formatting compliant with RFC 2426
 */
export function generateVCardString(profile: MasterProfile, card?: DigitalCard): string {
  const showPhone = !card || card.visibleFields.phone;
  const showPersonalPhone = !card || card.visibleFields.personalPhone !== false;
  const showEmail = !card || card.visibleFields.email;
  const showPersonalEmail = !card || card.visibleFields.personalEmail !== false;
  const showRole = !card || card.visibleFields.role;
  const showCompany = !card || card.visibleFields.company;
  const showWebsite = !card || card.visibleFields.website;
  const showLocation = !card || card.visibleFields.location;
  const showBio = !card || card.visibleFields.bio;
  const showSocials = !card || card.visibleFields.socials;
  const showBirthday = !card || card.visibleFields.birthday;
  const showRubrica = !card || card.visibleFields.rubrica;
  const showEmergency = !card || card.visibleFields.emergencyContact;

  const names = (profile.name || '').trim().split(' ');
  const firstName = profile.personalData?.firstName || profile.firstName || names[0] || '';
  const lastName = profile.personalData?.lastName || profile.lastName || (names.length > 1 ? names.slice(1).join(' ') : '');

  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${profile.name}`,
  ];

  if (showCompany && profile.company) {
    lines.push(`ORG:${profile.company}${profile.workData?.department ? `;${profile.workData.department}` : ''}`);
  }

  if (showRole && profile.role) {
    lines.push(`TITLE:${profile.role}`);
  }

  // Work Email
  if (showEmail && profile.email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK,PREF:${profile.email}`);
  }
  // Personal Email (if distinct and enabled)
  if (showPersonalEmail && profile.personalData?.email && profile.personalData.email !== profile.email) {
    lines.push(`EMAIL;TYPE=INTERNET,HOME:${profile.personalData.email}`);
  }

  // Work Phone
  if (showPhone && profile.phone) {
    lines.push(`TEL;TYPE=WORK,VOICE:${profile.phone}`);
  }
  // Personal Mobile Phone (if distinct and enabled)
  if (showPersonalPhone && profile.personalData?.phone && profile.personalData.phone !== profile.phone) {
    lines.push(`TEL;TYPE=CELL,HOME:${profile.personalData.phone}`);
  }

  // Birthday (Standard Rubrica BDAY field)
  if (showBirthday && profile.personalData?.birthday) {
    lines.push(`BDAY:${profile.personalData.birthday}`);
  }

  if (showWebsite && profile.website) {
    lines.push(`URL:${profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}`);
  }

  // Addresses: Personal (Home) and Work (Office)
  if (showLocation && (profile.workData?.officeAddress?.city || profile.location)) {
    const loc = profile.workData?.officeAddress
      ? `${profile.workData.officeAddress.street || ''};${profile.workData.officeAddress.city || ''};${profile.workData.officeAddress.state || ''};${profile.workData.officeAddress.zip || ''};${profile.workData.officeAddress.country || ''}`
      : `;;${profile.location};;;;`;
    lines.push(`ADR;TYPE=WORK:${loc}`);
  }
  if (showLocation && profile.personalData?.address?.city) {
    const homeLoc = `${profile.personalData.address.street || ''};${profile.personalData.address.city || ''};${profile.personalData.address.state || ''};${profile.personalData.address.zip || ''};${profile.personalData.address.country || ''}`;
    lines.push(`ADR;TYPE=HOME:${homeLoc}`);
  }

  // Emergency contacts in extended property
  if (showEmergency) {
    const ecList =
      profile.personalData?.emergencyContacts && profile.personalData.emergencyContacts.length > 0
        ? profile.personalData.emergencyContacts
        : profile.personalData?.emergencyContact?.phone
        ? [profile.personalData.emergencyContact]
        : [];
    ecList.forEach((ec) => {
      if (ec.name || ec.phone) {
        lines.push(`X-EMERGENCY-CONTACT:${ec.name} (${ec.relationship || 'ICE'}): ${ec.phone}`);
      }
    });
  }

  if (card?.visibleFields.nickname && profile.personalData?.nickname) {
    lines.push(`NICKNAME:${profile.personalData.nickname}`);
  }

  // Note with Bio, Personal Bio, Passions, Education, and Additional Rubrica custom attributes
  const rubricaNoteParts: string[] = [];
  if (showBio && (card?.customTagline || profile.workData?.bio || profile.bio)) {
    const wBio = profile.workData?.bio || profile.bio;
    rubricaNoteParts.push(card?.customTagline ? `${card.customTagline} - ${wBio}` : wBio);
  }
  if (card?.visibleFields.personalBio && profile.personalData?.bio) {
    rubricaNoteParts.push(`Personal Bio: ${profile.personalData.bio}`);
  }
  const filledPassions = (profile.passions || []).filter((p) =>
    Boolean(p.title?.trim() || p.detail?.trim())
  );
  if ((!card || card.visibleFields.passions !== false) && filledPassions.length > 0) {
    rubricaNoteParts.push(
      `Passions: ${filledPassions.map((p) => p.title?.trim() || p.detail?.trim()).join(', ')}`
    );
  }
  const filledEducation = (profile.education || []).filter((e) =>
    Boolean(e.degree?.trim() || e.institution?.trim() || e.honors?.trim() || e.year?.trim())
  );
  if ((!card || card.visibleFields.education !== false) && filledEducation.length > 0) {
    rubricaNoteParts.push(
      `Education: ${filledEducation
        .map((e) => [e.degree?.trim(), e.institution?.trim()].filter(Boolean).join(' — '))
        .filter(Boolean)
        .join(', ')}`
    );
  }
  if (showRubrica && profile.rubricaFields && profile.rubricaFields.length > 0) {
    const fieldsToInclude = card?.sharedRubricaFieldIds
      ? profile.rubricaFields.filter((f) => card.sharedRubricaFieldIds!.includes(f.id))
      : profile.rubricaFields;
    if (fieldsToInclude.length > 0) {
      const rubricaStr = fieldsToInclude.map((f) => `[${f.label}: ${f.value}]`).join(' | ');
      rubricaNoteParts.push(`Directory Data: ${rubricaStr}`);
    }
  }
  if (rubricaNoteParts.length > 0) {
    lines.push(`NOTE:${rubricaNoteParts.join(' \\n ').replace(/\n/g, '\\n')}`);
  }

  // Social profiles (Granular Major Social Media selection + multiple profiles support)
  if (showSocials) {
    if (profile.socialAccounts && profile.socialAccounts.length > 0) {
      for (const entry of profile.socialAccounts) {
        const val = entry.value?.trim();
        if (!val) continue;
        const isVisible = card
          ? card.visibleFields.socialAccounts &&
            typeof card.visibleFields.socialAccounts[entry.id] === 'boolean'
            ? card.visibleFields.socialAccounts[entry.id]
            : card.visibleFields[entry.platformId] !== false
          : true;
        if (isVisible) {
          lines.push(`X-SOCIALPROFILE;TYPE=${entry.platformId}:${val}`);
        }
      }
    } else {
      const socialMap: Array<{ key: keyof CardVisibleFields; type: string; getVal: () => string | undefined }> = [
        { key: 'linkedin', type: 'linkedin', getVal: () => profile.socials?.linkedin || profile.workData?.socials?.linkedin },
        { key: 'twitter', type: 'twitter', getVal: () => profile.socials?.twitter || profile.workData?.socials?.twitter },
        { key: 'github', type: 'github', getVal: () => profile.socials?.github || profile.workData?.socials?.github },
        { key: 'calendly', type: 'calendly', getVal: () => profile.socials?.calendly || profile.workData?.socials?.calendly },
        { key: 'youtube', type: 'youtube', getVal: () => profile.socials?.youtube || profile.workData?.socials?.youtube },
        { key: 'threads', type: 'threads', getVal: () => profile.socials?.threads || profile.personalData?.socials?.threads },
        { key: 'substack', type: 'substack', getVal: () => profile.socials?.substack || profile.workData?.socials?.substack },
        { key: 'medium', type: 'medium', getVal: () => profile.socials?.medium || profile.workData?.socials?.medium },
        { key: 'behance', type: 'behance', getVal: () => profile.socials?.behance || profile.workData?.socials?.behance },
        { key: 'dribbble', type: 'dribbble', getVal: () => profile.socials?.dribbble || profile.workData?.socials?.dribbble },
        { key: 'discord', type: 'discord', getVal: () => profile.socials?.discord || profile.workData?.socials?.discord },
        { key: 'reddit', type: 'reddit', getVal: () => profile.socials?.reddit || profile.personalData?.socials?.reddit },
        { key: 'pinterest', type: 'pinterest', getVal: () => profile.socials?.pinterest || profile.personalData?.socials?.pinterest },
        { key: 'twitch', type: 'twitch', getVal: () => profile.socials?.twitch || profile.personalData?.socials?.twitch },
        { key: 'spotify', type: 'spotify', getVal: () => profile.socials?.spotify || profile.personalData?.socials?.spotify },
        { key: 'whatsapp', type: 'whatsapp', getVal: () => profile.personalData?.socials?.whatsapp || profile.personalData?.phone },
        { key: 'telegram', type: 'telegram', getVal: () => profile.personalData?.socials?.telegram || profile.socials?.telegram },
        { key: 'instagram', type: 'instagram', getVal: () => profile.personalData?.socials?.instagram || profile.socials?.instagram },
        { key: 'tiktok', type: 'tiktok', getVal: () => profile.personalData?.socials?.tiktok || profile.socials?.tiktok },
        { key: 'facebook', type: 'facebook', getVal: () => profile.personalData?.socials?.facebook || profile.socials?.facebook },
        { key: 'snapchat', type: 'snapchat', getVal: () => profile.personalData?.socials?.snapchat || profile.socials?.snapchat },
        { key: 'signal', type: 'signal', getVal: () => profile.personalData?.socials?.signal || profile.socials?.signal },
        { key: 'wechat', type: 'wechat', getVal: () => profile.personalData?.socials?.wechat || profile.socials?.wechat },
      ];

      for (const item of socialMap) {
        const isVisible = card ? card.visibleFields[item.key] !== false : true;
        const val = item.getVal();
        if (isVisible && val) {
          lines.push(`X-SOCIALPROFILE;TYPE=${item.type}:${val}`);
        }
      }
    }
  }

  lines.push('REV:' + new Date().toISOString().slice(0, 10));
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Downloads a vCard (.vcf) file in the browser
 */
export function downloadVCard(filename: string, vCardContent: string): void {
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports contacts array to a standard CSV file
 */
export function exportContactsToCSV(contacts: CRMContact[]): void {
  const headers = [
    'Name',
    'Role',
    'Company',
    'Category',
    'Email',
    'Phone',
    'Website',
    'Source',
    'Status',
    'Deal Name',
    'Deal Stage',
    'Deal Value',
    'Currency',
    'Close Date',
    'Deal Owner',
    'Loss Reason',
    'Account Status',
    'Purchase Date',
    'Ticket ID',
    'Case Reason',
    'Case Status',
    'Case Priority',
    'Product Linked',
    'Resolution Notes',
    'Tags',
    'Created At',
    'Notes',
  ];

  const rows = contacts.map((c) => {
    const primaryCase = c.afterSalesCases?.[0];
    return [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.role || '').replace(/"/g, '""')}"`,
      `"${(c.company || '').replace(/"/g, '""')}"`,
      `"${c.category || (c.isBusinessCRM ? 'business' : 'personal')}"`,
      `"${(c.email || c.personalEmail || '').replace(/"/g, '""')}"`,
      `"${(c.phone || c.personalPhone || '').replace(/"/g, '""')}"`,
      `"${(c.website || '').replace(/"/g, '""')}"`,
      `"${c.source}"`,
      `"${c.status}"`,
      `"${(c.dealName || '').replace(/"/g, '""')}"`,
      `"${c.dealStage || ''}"`,
      `"${c.dealValue || ''}"`,
      `"${c.dealCurrency || '$'}"`,
      `"${c.closeDate || c.expectedCloseDate || ''}"`,
      `"${(c.dealOwner || '').replace(/"/g, '""')}"`,
      `"${(c.lossReason || '').replace(/"/g, '""')}"`,
      `"${c.accountStatus || ''}"`,
      `"${c.purchaseDate || ''}"`,
      `"${c.ticketId || primaryCase?.caseId || ''}"`,
      `"${c.caseReason || primaryCase?.caseCategory || ''}"`,
      `"${c.caseStatus || primaryCase?.status || ''}"`,
      `"${c.casePriority || primaryCase?.priority || ''}"`,
      `"${(c.productLinked || primaryCase?.productLinked || '').replace(/"/g, '""')}"`,
      `"${(c.resolutionNotes || primaryCase?.resolutionNotes || '').replace(/"/g, '""')}"`,
      `"${(c.tags || []).join(';')}"`,
      `"${c.createdAt}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `youconnect_contacts_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports all given contacts into a single standard vCard (.vcf) address book file
 */
export function exportContactsToVCF(contacts: CRMContact[]): void {
  const vcards = contacts.map(c => {
    const names = (c.name || '').trim().split(' ');
    const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
    const firstName = names[0] || '';

    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${c.name || 'Contact'}`,
    ];

    if (c.company) lines.push(`ORG:${c.company}`);
    if (c.role) lines.push(`TITLE:${c.role}`);
    if (c.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${c.email}`);
    if (c.personalEmail && c.personalEmail !== c.email) {
      lines.push(`EMAIL;TYPE=INTERNET,HOME:${c.personalEmail}`);
    }
    if (c.phone) lines.push(`TEL;TYPE=WORK,VOICE:${c.phone}`);
    if (c.personalPhone && c.personalPhone !== c.phone) {
      lines.push(`TEL;TYPE=CELL,HOME:${c.personalPhone}`);
    }
    if (c.website) lines.push(`URL:${c.website.startsWith('http') ? c.website : `https://${c.website}`}`);
    if (c.birthday) lines.push(`BDAY:${c.birthday}`);
    if (c.notes) lines.push(`NOTE:${c.notes.replace(/\n/g, '\\n')}`);
    if (c.category) lines.push(`CATEGORIES:${c.category.toUpperCase()}`);

    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  const allVCardString = vcards.join('\r\n\r\n');
  const blob = new Blob([allVCardString], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `youconnect_addressbook_${new Date().toISOString().slice(0, 10)}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses vCard (.vcf) format files into contacts
 */
export function parseVCardContacts(vcfText: string): Partial<CRMContact>[] {
  const cardsRaw = vcfText.split(/BEGIN:VCARD/i).filter(c => c.trim().length > 0);
  const contacts: Partial<CRMContact>[] = [];

  cardsRaw.forEach(cardRaw => {
    const lines = cardRaw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const item: Partial<CRMContact> = {
      source: 'import',
      status: 'new',
      tags: ['vCard Import'],
      createdAt: new Date().toISOString(),
    };

    lines.forEach(line => {
      if (line.startsWith('FN:')) {
        item.name = line.substring(3).trim();
      } else if (!item.name && line.startsWith('N:')) {
        const parts = line.substring(2).split(';');
        item.name = `${parts[1] || ''} ${parts[0] || ''}`.trim();
      } else if (line.startsWith('ORG:')) {
        item.company = line.substring(4).split(';')[0].trim();
      } else if (line.startsWith('TITLE:')) {
        item.role = line.substring(6).trim();
      } else if (line.startsWith('EMAIL') && line.includes(':')) {
        const emailVal = line.substring(line.indexOf(':') + 1).trim();
        if (!item.email) item.email = emailVal;
        else item.personalEmail = emailVal;
      } else if (line.startsWith('TEL') && line.includes(':')) {
        const telVal = line.substring(line.indexOf(':') + 1).trim();
        if (!item.phone) item.phone = telVal;
        else item.personalPhone = telVal;
      } else if (line.startsWith('URL:') || line.startsWith('URL;')) {
        item.website = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.startsWith('BDAY:')) {
        item.birthday = line.substring(5).trim();
      } else if (line.startsWith('NOTE:') || line.startsWith('NOTE;')) {
        item.notes = line.substring(line.indexOf(':') + 1).replace(/\\n/g, '\n').trim();
      } else if (line.startsWith('CATEGORIES:')) {
        const cat = line.substring(11).toLowerCase();
        if (cat.includes('business') || cat.includes('work')) item.category = 'business';
        else if (cat.includes('club') || cat.includes('sport')) item.category = 'club';
        else if (cat.includes('family')) item.category = 'family';
        else item.category = 'personal';
      }
    });

    if (item.name || item.email || item.phone) {
      contacts.push(item);
    }
  });

  return contacts;
}

/**
 * Parses simple CSV content into CRM contacts
 */
export function parseCSVContacts(csvText: string): Partial<CRMContact>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const parsed: Partial<CRMContact>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Basic CSV row parsing with quote handling
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    const cleanCells = row.map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    const item: Partial<CRMContact> = {
      source: 'import',
      status: 'new',
      tags: ['Imported'],
      createdAt: new Date().toISOString(),
    };

    headers.forEach((h, idx) => {
      const val = cleanCells[idx] || '';
      if (!val) return;

      if (h.includes('name')) item.name = val;
      else if (h.includes('role') || h.includes('title')) item.role = val;
      else if (h.includes('company') || h.includes('org')) item.company = val;
      else if (h.includes('category')) {
        const cLower = val.toLowerCase();
        if (cLower.includes('business')) item.category = 'business';
        else if (cLower.includes('club') || cLower.includes('sport')) item.category = 'club';
        else if (cLower.includes('family')) item.category = 'family';
        else item.category = 'personal';
      }
      else if (h.includes('email')) item.email = val;
      else if (h.includes('phone') || h.includes('tel') || h.includes('mobile')) item.phone = val;
      else if (h.includes('website') || h.includes('url')) item.website = val;
      else if (h.includes('note')) item.notes = val;
      else if (h.includes('deal') || h.includes('value')) {
        const parsedVal = parseFloat(val.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedVal)) item.dealValue = parsedVal;
      }
    });

    if (item.name || item.email || item.phone) {
      parsed.push(item);
    }
  }

  return parsed;
}
