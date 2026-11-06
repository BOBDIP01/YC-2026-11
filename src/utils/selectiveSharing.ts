import { MasterProfile, DigitalCard, CRMContact, ContactSource, RubricaField, SocialLinks } from '../types';

export interface SelectiveSharingResult {
  contactData: Partial<CRMContact>;
  sharedFieldsList: string[];
}

/**
 * Filters the sender's profile according to their digital card's selective sharing settings
 */
export function extractSelectiveContactData(
  senderProfile: Partial<MasterProfile>,
  senderCard?: Partial<DigitalCard>,
  source: ContactSource = 'p2p'
): SelectiveSharingResult {
  const visible = senderCard?.visibleFields;
  const sharedFields: string[] = ['First & Last Name'];

  const fullName = (senderProfile.name || 'YouConnect Member').trim();
  const derivedFirstName =
    senderProfile.personalData?.firstName?.trim() ||
    fullName.split(/\s+/)[0] ||
    fullName;
  const derivedLastName =
    senderProfile.personalData?.lastName !== undefined
      ? senderProfile.personalData.lastName.trim()
      : fullName.split(/\s+/).slice(1).join(' ');

  // Base identity
  const contact: Partial<CRMContact> = {
    name: fullName,
    firstName: derivedFirstName,
    lastName: derivedLastName,
    avatarUrl: senderProfile.avatarUrl,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Role, Department & Company
  if (!visible || visible.role) {
    contact.role = senderProfile.role || senderProfile.workData?.role || '';
    if (contact.role) sharedFields.push('Professional Role');
  } else {
    contact.role = '';
  }

  if (!visible || visible.department !== false) {
    const dept = senderProfile.workData?.department || (senderProfile as any).department || '';
    if (dept) {
      contact.department = dept;
      sharedFields.push('Department');
    }
  }

  if (!visible || visible.company) {
    contact.company = senderProfile.company || senderProfile.workData?.company || '';
    if (contact.company) sharedFields.push('Organization / Club');
  } else {
    contact.company = '';
  }

  // Work Email vs Personal Email
  if (!visible || visible.email) {
    contact.email = senderProfile.email || senderProfile.workData?.email || '';
    if (contact.email) sharedFields.push('Work Email');
  } else {
    contact.email = '';
  }

  if ((!visible || visible.personalEmail) && (senderProfile.personalData?.email || (senderProfile as any).personalEmail)) {
    contact.personalEmail = senderProfile.personalData?.email || (senderProfile as any).personalEmail;
    sharedFields.push('Personal Email');
  }

  // Work Phone vs Personal Phone
  if (!visible || visible.phone) {
    contact.phone = senderProfile.phone || senderProfile.workData?.phone || '';
    if (contact.phone) sharedFields.push('Work Phone');
  } else {
    contact.phone = '';
  }

  if ((!visible || visible.personalPhone) && (senderProfile.personalData?.phone || (senderProfile as any).personalPhone)) {
    contact.personalPhone = senderProfile.personalData?.phone || (senderProfile as any).personalPhone;
    sharedFields.push('Personal Mobile');
  }

  // Website, Location, Office Address, Home Address, Tax ID
  if (!visible || visible.website) {
    contact.website = senderProfile.website || senderProfile.workData?.website || '';
    if (contact.website) sharedFields.push('Website');
  }

  if (!visible || visible.location) {
    contact.location = senderProfile.location || '';
    if (contact.location) sharedFields.push('Location');
  }

  if (!visible || visible.officeAddress !== false) {
    const officeAddr = senderProfile.workData?.officeAddress || (senderProfile as any).officeAddress || '';
    if (officeAddr) {
      contact.officeAddress = officeAddr;
      sharedFields.push('Office Address');
    }
  }

  if ((!visible || visible.personalAddress) && (senderProfile.personalData?.address || (senderProfile as any).homeAddress)) {
    contact.homeAddress = senderProfile.personalData?.address || (senderProfile as any).homeAddress;
    sharedFields.push('Home Address');
  }

  if (!visible || visible.taxIdOrVat !== false) {
    const taxId = senderProfile.workData?.taxIdOrVat || (senderProfile as any).taxIdOrVat || '';
    if (taxId) {
      contact.taxIdOrVat = taxId;
      sharedFields.push('Tax ID / VAT');
    }
  }

  // Birthday
  if ((!visible || visible.birthday) && (senderProfile.personalData?.birthday || (senderProfile as any).birthday)) {
    contact.birthday = senderProfile.personalData?.birthday || (senderProfile as any).birthday;
    sharedFields.push('Birthday');
  }

  // Synthesize additional shared identity fields into both direct fields and rubricaFields
  const extraRubricaFields: RubricaField[] = [];

  const logoUrl = senderCard?.companyLogoUrl || senderProfile.workData?.companyLogoUrl || senderProfile.companyLogoUrl;
  if ((!visible || visible.companyLogo !== false) && logoUrl) {
    contact.companyLogoUrl = logoUrl;
    sharedFields.push('Company Logo');
  }

  const bannerUrl = senderCard?.coverBannerUrl || senderProfile.coverBannerUrl;
  if (bannerUrl) {
    contact.coverBannerUrl = bannerUrl;
  }

  if ((!visible || visible.headline) && senderProfile.headline) {
    contact.headline = senderProfile.headline;
    extraRubricaFields.push({
      id: 'shared-headline',
      label: 'Headline',
      value: senderProfile.headline,
      category: 'work',
    });
    sharedFields.push('Executive Headline');
  }

  if ((!visible || visible.bio) && (senderProfile.workData?.bio || senderProfile.bio)) {
    const bioVal = (senderProfile.workData?.bio || senderProfile.bio || '').trim();
    contact.bio = bioVal;
    extraRubricaFields.push({
      id: 'shared-work-bio',
      label: 'Executive Bio',
      value: bioVal,
      category: 'work',
    });
    sharedFields.push('Work Bio');
  }

  if ((!visible || visible.personalBio) && senderProfile.personalData?.bio) {
    const pBio = senderProfile.personalData.bio.trim();
    contact.personalBio = pBio;
    extraRubricaFields.push({
      id: 'shared-personal-bio',
      label: 'Personal Bio',
      value: pBio,
      category: 'personal',
    });
    sharedFields.push('Personal Bio');
  }

  if ((!visible || visible.nickname) && senderProfile.personalData?.nickname) {
    contact.nickname = senderProfile.personalData.nickname;
    extraRubricaFields.push({
      id: 'shared-nickname',
      label: 'Nickname',
      value: senderProfile.personalData.nickname,
      category: 'personal',
    });
    sharedFields.push('Nickname');
  }

  if ((!visible || visible.pronouns) && senderProfile.personalData?.pronouns) {
    contact.pronouns = senderProfile.personalData.pronouns;
    extraRubricaFields.push({
      id: 'shared-pronouns',
      label: 'Pronouns',
      value: senderProfile.personalData.pronouns,
      category: 'personal',
    });
    sharedFields.push('Pronouns');
  }

  if ((!visible || visible.gender) && senderProfile.personalData?.gender) {
    contact.gender = senderProfile.personalData.gender;
    extraRubricaFields.push({
      id: 'shared-gender',
      label: 'Gender',
      value: senderProfile.personalData.gender,
      category: 'personal',
    });
    sharedFields.push('Gender');
  }

  if (!visible || visible.emergencyContact) {
    const ecList =
      senderProfile.personalData?.emergencyContacts && senderProfile.personalData.emergencyContacts.length > 0
        ? senderProfile.personalData.emergencyContacts
        : senderProfile.personalData?.emergencyContact?.name
        ? [senderProfile.personalData.emergencyContact]
        : [];
    if (ecList.length > 0) {
      contact.emergencyContacts = ecList;
      contact.emergencyContact = ecList[0];
      extraRubricaFields.push({
        id: 'shared-ice',
        label: 'Emergency Contacts',
        value: ecList
          .map((ec) => `${ec.name}${ec.relationship ? ` (${ec.relationship})` : ''}: ${ec.phone}`)
          .join(' | '),
        category: 'emergency',
      });
      sharedFields.push(`Emergency Contacts (${ecList.length})`);
    }
  }

  if ((!visible || visible.passions !== false) && senderProfile.passions && senderProfile.passions.length > 0) {
    contact.passions = senderProfile.passions;
    extraRubricaFields.push({
      id: 'shared-passions',
      label: 'Passions & Sports',
      value: senderProfile.passions.map((p) => `${p.title} (${p.category})`).join(', '),
      category: 'club',
    });
    sharedFields.push('Passions & Sports');
  }

  if ((!visible || visible.education !== false) && senderProfile.education && senderProfile.education.length > 0) {
    contact.education = senderProfile.education;
    extraRubricaFields.push({
      id: 'shared-education',
      label: 'Education',
      value: senderProfile.education.map((e) => `${e.degree} — ${e.institution} (${e.year})`).join(' | '),
      category: 'work',
    });
    sharedFields.push('Education');
  }

  if ((!visible || visible.portfolioSection !== false) && senderProfile.portfolio && senderProfile.portfolio.length > 0) {
    contact.portfolio = senderProfile.portfolio;
    extraRubricaFields.push({
      id: 'shared-portfolio',
      label: 'Artist Portfolio',
      value: senderProfile.portfolio.map((item) => `${item.title} [${item.roleOrMedium}]`).join(', '),
      category: 'custom',
    });
    sharedFields.push('Artist Portfolio');
  }

  // Rubrica custom fields
  const combinedRubrica: RubricaField[] = [...extraRubricaFields];
  if (!visible || visible.rubrica) {
    const rawFields = senderProfile.rubricaFields || [];
    const allowedIds = senderCard?.sharedRubricaFieldIds;
    const filteredRubrica = allowedIds
      ? rawFields.filter((f) => allowedIds.includes(f.id))
      : rawFields;

    if (filteredRubrica.length > 0) {
      combinedRubrica.push(...filteredRubrica);
      sharedFields.push(`Custom Directory (${filteredRubrica.length} fields)`);
    }
  }
  if (combinedRubrica.length > 0) {
    contact.rubricaFields = combinedRubrica;
  }

  // Shared card snapshot metadata
  if (senderCard) {
    contact.sharedCard = {
      cardName: senderCard.name || 'Shared YouConnect Card',
      category: senderCard.category || 'business',
      tag: senderCard.tag || 'Executive',
      theme: senderCard.theme || 'obsidian_gold',
      accentColor: senderCard.accentColor || '#6366f1',
      layoutStyle: senderCard.layoutStyle || 'modern',
      customTagline: senderCard.customTagline,
      companyLogoUrl: logoUrl,
      coverBannerUrl: bannerUrl,
      vanitySlug: senderCard.vanitySlug,
      livePresenceStatus: senderCard.livePresence?.statusText,
    };
  }

  // Social Links
  if (!visible || visible.socials) {
    const activeSocials: SocialLinks = {};
    if (senderProfile.socialAccounts && senderProfile.socialAccounts.length > 0) {
      senderProfile.socialAccounts.forEach((entry) => {
        const val = entry.value?.trim();
        if (!val) return;
        const isAllowed = visible
          ? visible.socialAccounts && typeof visible.socialAccounts[entry.id] === 'boolean'
            ? visible.socialAccounts[entry.id]
            : (visible as any)[entry.platformId] !== false
          : true;
        if (isAllowed) {
          if (!activeSocials[entry.platformId]) {
            activeSocials[entry.platformId] = val;
          }
          const labelSuffix = entry.label?.trim() ? ` (${entry.label.trim()})` : '';
          sharedFields.push(
            `${entry.platformId.charAt(0).toUpperCase() + entry.platformId.slice(1)}${labelSuffix}`
          );
        }
      });
    } else {
      const profileSocials = {
        ...(senderProfile.personalData?.socials || {}),
        ...(senderProfile.workData?.socials || {}),
        ...(senderProfile.socials || {}),
      };

      const keys: (keyof SocialLinks)[] = [
        'linkedin',
        'twitter',
        'github',
        'calendly',
        'youtube',
        'whatsapp',
        'telegram',
        'instagram',
        'tiktok',
        'threads',
        'facebook',
        'signal',
        'discord',
      ];

      keys.forEach((k) => {
        const isAllowed = visible ? (visible as any)[k] !== false : true;
        if (isAllowed && (profileSocials as any)[k]) {
          (activeSocials as any)[k] = (profileSocials as any)[k];
          sharedFields.push(k.charAt(0).toUpperCase() + k.slice(1));
        }
      });
    }

    if (Object.keys(activeSocials).length > 0) {
      contact.socials = activeSocials;
    }
  }

  // Category determination
  const cardCategory = senderCard?.category || senderProfile.category;
  if (cardCategory === 'business') {
    contact.category = 'business';
    contact.isBusinessCRM = true;
    contact.status = 'qualified';
    contact.tags = ['Business', 'Selective Share'];
  } else if (cardCategory === 'hobby_sport') {
    contact.category = 'club';
    contact.isBusinessCRM = false;
    contact.status = 'new';
    contact.tags = ['Club / Sports', 'Selective Share'];
  } else if (cardCategory === 'personal') {
    contact.category = 'personal';
    contact.isBusinessCRM = false;
    contact.status = 'new';
    contact.tags = ['Personal', 'Selective Share'];
  } else {
    contact.category = 'other';
    contact.isBusinessCRM = false;
    contact.status = 'new';
    contact.tags = ['Selective Share'];
  }

  return {
    contactData: contact,
    sharedFieldsList: sharedFields,
  };
}

/**
 * Synchronizes an incoming selective card into the user's contacts.
 * If contact already exists (by email, phone, or matching name), it updates the existing record
 * with the newly received fields, keeping existing private notes and logs intact.
 */
export function syncIncomingSelectiveContact(
  existingContacts: CRMContact[],
  senderProfile: Partial<MasterProfile>,
  senderCard?: Partial<DigitalCard>,
  source: ContactSource = 'p2p'
): {
  updatedContacts: CRMContact[];
  isUpdate: boolean;
  contact: CRMContact;
  sharedFieldsList: string[];
} {
  const { contactData, sharedFieldsList } = extractSelectiveContactData(
    senderProfile,
    senderCard,
    source
  );

  const senderCircle =
    senderCard?.name || senderProfile.profileTitle || senderProfile.circleName || 'Shared Persona';

  // Normalize matchers
  const incomingEmail = (contactData.email || contactData.personalEmail || '').trim().toLowerCase();
  const incomingPhone = (contactData.phone || contactData.personalPhone || '').replace(/\D/g, '');
  const incomingName = (contactData.name || '').trim().toLowerCase();

  // Find existing contact
  const existingIdx = existingContacts.findIndex((c) => {
    if (incomingEmail && c.email && c.email.trim().toLowerCase() === incomingEmail) return true;
    if (incomingEmail && c.personalEmail && c.personalEmail.trim().toLowerCase() === incomingEmail)
      return true;
    if (incomingPhone && c.phone && c.phone.replace(/\D/g, '') === incomingPhone) return true;
    if (incomingPhone && c.personalPhone && c.personalPhone.replace(/\D/g, '') === incomingPhone)
      return true;
    if (incomingName && c.name.trim().toLowerCase() === incomingName) return true;
    return false;
  });

  if (existingIdx >= 0) {
    // Existing contact found -> UPDATE DATA AS RECEIVED
    const target = existingContacts[existingIdx];

    const mergedRubricaFields: RubricaField[] = [
      ...(target.rubricaFields || []),
    ];
    if (contactData.rubricaFields) {
      contactData.rubricaFields.forEach((rf) => {
        const foundRfIdx = mergedRubricaFields.findIndex((m) => m.label.toLowerCase() === rf.label.toLowerCase());
        if (foundRfIdx >= 0) {
          mergedRubricaFields[foundRfIdx] = rf;
        } else {
          mergedRubricaFields.push(rf);
        }
      });
    }

    const updatedContact: CRMContact = {
      ...target,
      name: contactData.name || target.name,
      firstName: contactData.firstName || target.firstName,
      lastName: contactData.lastName !== undefined ? contactData.lastName : target.lastName,
      nickname: contactData.nickname || target.nickname,
      pronouns: contactData.pronouns || target.pronouns,
      gender: contactData.gender || target.gender,
      role: contactData.role !== undefined && contactData.role !== '' ? contactData.role : target.role,
      department: contactData.department || target.department,
      company: contactData.company !== undefined && contactData.company !== '' ? contactData.company : target.company,
      email: contactData.email || target.email,
      personalEmail: contactData.personalEmail || target.personalEmail,
      phone: contactData.phone || target.phone,
      personalPhone: contactData.personalPhone || target.personalPhone,
      website: contactData.website || target.website,
      location: contactData.location || target.location,
      officeAddress: contactData.officeAddress || target.officeAddress,
      homeAddress: contactData.homeAddress || target.homeAddress,
      taxIdOrVat: contactData.taxIdOrVat || target.taxIdOrVat,
      headline: contactData.headline || target.headline,
      bio: contactData.bio || target.bio,
      personalBio: contactData.personalBio || target.personalBio,
      birthday: contactData.birthday || target.birthday,
      avatarUrl: contactData.avatarUrl || target.avatarUrl,
      companyLogoUrl: contactData.companyLogoUrl || target.companyLogoUrl,
      coverBannerUrl: contactData.coverBannerUrl || target.coverBannerUrl,
      passions: contactData.passions || target.passions,
      education: contactData.education || target.education,
      portfolio: contactData.portfolio || target.portfolio,
      emergencyContact: contactData.emergencyContact || target.emergencyContact,
      emergencyContacts: contactData.emergencyContacts || target.emergencyContacts,
      sharedCard: contactData.sharedCard || target.sharedCard,
      rubricaFields: mergedRubricaFields.length > 0 ? mergedRubricaFields : target.rubricaFields,
      socials: {
        ...(target.socials || {}),
        ...(contactData.socials || {}),
      },
      updatedAt: new Date().toISOString(),
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle,
        sharedFieldsList,
        version: (target.selectiveSyncInfo?.version || 0) + 1,
      },
    };

    const nextContacts = [...existingContacts];
    nextContacts[existingIdx] = updatedContact;

    return {
      updatedContacts: nextContacts,
      isUpdate: true,
      contact: updatedContact,
      sharedFieldsList,
    };
  } else {
    // Brand new contact
    const newContact: CRMContact = {
      id: `c-sync-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: contactData.name || 'New Connection',
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      nickname: contactData.nickname,
      pronouns: contactData.pronouns,
      gender: contactData.gender,
      role: contactData.role || '',
      department: contactData.department,
      company: contactData.company || '',
      email: contactData.email || '',
      personalEmail: contactData.personalEmail,
      phone: contactData.phone || '',
      personalPhone: contactData.personalPhone,
      website: contactData.website || '',
      location: contactData.location || '',
      officeAddress: contactData.officeAddress,
      homeAddress: contactData.homeAddress,
      taxIdOrVat: contactData.taxIdOrVat,
      headline: contactData.headline,
      bio: contactData.bio,
      personalBio: contactData.personalBio,
      birthday: contactData.birthday,
      companyLogoUrl: contactData.companyLogoUrl,
      coverBannerUrl: contactData.coverBannerUrl,
      passions: contactData.passions,
      education: contactData.education,
      portfolio: contactData.portfolio,
      emergencyContact: contactData.emergencyContact,
      emergencyContacts: contactData.emergencyContacts,
      sharedCard: contactData.sharedCard,
      notes: `Received via YouConnect Selective Sharing (${source.toUpperCase()}) from ${senderCircle}.`,
      source,
      status: contactData.status || 'new',
      category: contactData.category || 'personal',
      isBusinessCRM: contactData.isBusinessCRM || false,
      tags: contactData.tags || ['Selective Share'],
      avatarUrl:
        contactData.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      rubricaFields: contactData.rubricaFields,
      socials: contactData.socials,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle,
        sharedFieldsList,
        version: 1,
      },
    };

    return {
      updatedContacts: [newContact, ...existingContacts],
      isUpdate: false,
      contact: newContact,
      sharedFieldsList,
    };
  }
}
