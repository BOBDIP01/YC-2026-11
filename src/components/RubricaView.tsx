import React, { useState, useMemo, useRef } from 'react';
import { CRMContact, ContactCategory, RubricaField, ContactSource } from '../types';
import { exportContactsToCSV, exportContactsToVCF, parseCSVContacts, parseVCardContacts, downloadVCard } from '../utils/vcard';
import { ContactCardReaderModal } from './ContactCardReaderModal';
import {
  Search,
  Filter,
  Upload,
  Download,
  UserPlus,
  BookOpen,
  Briefcase,
  Share2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  X,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  RefreshCw,
  Users,
  Dumbbell,
  Heart,
  Tag,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  List,
  Star,
  ShieldAlert,
  PhoneCall,
  MessageCircle,
  AlertTriangle,
  ScanLine,
  Send,
  CreditCard,
} from 'lucide-react';

interface RubricaViewProps {
  contacts: CRMContact[];
  onUpdateContacts: (contacts: CRMContact[]) => void;
  onAddContact: (contact: CRMContact) => void;
  onNavigateToCRM?: () => void;
}

export const RubricaView: React.FC<RubricaViewProps> = ({
  contacts,
  onUpdateContacts,
  onAddContact,
  onNavigateToCRM,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [cardReaderContact, setCardReaderContact] = useState<CRMContact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [contactToPromote, setContactToPromote] = useState<CRMContact | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    stage: 'qualified' as 'new' | 'contacted' | 'qualified',
    dealValue: 25000,
    currency: '$',
    expectedCloseDate: '',
  });

  // Import Modal & File Inputs
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatusNotice, setImportStatusNotice] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const vcfInputRef = useRef<HTMLInputElement>(null);

  // New Contact Form (Supports all Master Profile fields)
  const [addContactSection, setAddContactSection] = useState<'personal' | 'work' | 'socials_extra'>('personal');
  const [newContactForm, setNewContactForm] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    pronouns: '',
    gender: '',
    role: '',
    department: '',
    company: '',
    headline: '',
    bio: '',
    personalBio: '',
    category: 'personal' as ContactCategory,
    email: '',
    personalEmail: '',
    phone: '',
    personalPhone: '',
    website: '',
    location: '',
    officeAddress: '',
    homeAddress: '',
    taxIdOrVat: '',
    birthday: '',
    notes: '',
    source: 'manual' as ContactSource,
    tags: '',
    passionsText: '',
    educationInstitution: '',
    educationDegree: '',
    linkedin: '',
    instagram: '',
    twitter: '',
    whatsapp: '',
    github: '',
    youtube: '',
    tiktok: '',
    telegram: '',
    customFieldLabel: '',
    customFieldValue: '',
    isFavorite: false,
    isEmergencyContact: false,
    emergencyRelationship: '',
  });

  // Toggle Favorite
  const handleToggleFavorite = (contactId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        const nextFav = !c.isFavorite;
        return {
          ...c,
          isFavorite: nextFav,
          updatedAt: new Date().toISOString(),
          tags: nextFav
            ? Array.from(new Set([...(c.tags || []), 'Favorite']))
            : (c.tags || []).filter((t) => t !== 'Favorite'),
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated.find((c) => c.id === contactId) || null);
    }
  };

  // Toggle Emergency Contact (ICE - In Case of Emergency)
  const handleToggleEmergency = (contactId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        const nextIce = !c.isEmergencyContact;
        return {
          ...c,
          isEmergencyContact: nextIce,
          emergencyRelationship: nextIce
            ? c.emergencyRelationship || (c.category === 'family' ? 'Family (ICE)' : 'Emergency Contact (ICE)')
            : undefined,
          updatedAt: new Date().toISOString(),
          tags: nextIce
            ? Array.from(new Set([...(c.tags || []), 'ICE', 'Emergency Contact']))
            : (c.tags || []).filter((t) => t !== 'ICE' && t !== 'Emergency Contact'),
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated.find((c) => c.id === contactId) || null);
    }
  };

  // Filtered contacts list
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(query) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.role && c.role.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.personalEmail && c.personalEmail.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.personalPhone && c.personalPhone.includes(query)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(query))) ||
        (c.emergencyRelationship && c.emergencyRelationship.toLowerCase().includes(query)) ||
        (c.rubricaFields &&
          c.rubricaFields.some(
            (rf) =>
              rf.label.toLowerCase().includes(query) || rf.value.toLowerCase().includes(query)
          ));

      // Category / View filters
      if (selectedCategory === 'all') return matchesSearch;
      if (selectedCategory === 'favorites') return matchesSearch && !!c.isFavorite;
      if (selectedCategory === 'emergency') return matchesSearch && !!c.isEmergencyContact;
      if (selectedCategory === 'synced') return matchesSearch && !!c.selectiveSyncInfo?.isSynced;
      if (selectedCategory === 'business') return matchesSearch && (c.isBusinessCRM || c.category === 'business');
      if (selectedCategory === 'personal') return matchesSearch && (c.category === 'personal' || c.category === 'family');
      if (selectedCategory === 'club') return matchesSearch && c.category === 'club';
      return matchesSearch && c.category === selectedCategory;
    });
  }, [contacts, searchTerm, selectedCategory]);

  // Counts by category & special filters
  const counts = useMemo(() => {
    return {
      all: contacts.length,
      favorites: contacts.filter((c) => c.isFavorite).length,
      emergency: contacts.filter((c) => c.isEmergencyContact).length,
      personal: contacts.filter((c) => c.category === 'personal' || c.category === 'family').length,
      club: contacts.filter((c) => c.category === 'club').length,
      business: contacts.filter((c) => c.isBusinessCRM || c.category === 'business').length,
      synced: contacts.filter((c) => c.selectiveSyncInfo?.isSynced).length,
    };
  }, [contacts]);

  // Handlers for Promotion to Business CRM
  const handleOpenPromoteModal = (contact: CRMContact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setContactToPromote(contact);
    setPromoteForm({
      stage: 'qualified',
      dealValue: 25000,
      currency: '$',
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    });
    setIsPromoteModalOpen(true);
  };

  const handleConfirmPromotion = () => {
    if (!contactToPromote) return;
    const mappedStage =
      promoteForm.stage === 'new'
        ? 'Qualification'
        : promoteForm.stage === 'contacted'
        ? 'Proposal'
        : 'Negotiation';

    const updated = contacts.map((c) => {
      if (c.id === contactToPromote.id) {
        return {
          ...c,
          isBusinessCRM: true,
          category: 'business' as ContactCategory,
          status: promoteForm.stage,
          dealName: c.dealName || `${c.company || c.name} — Enterprise Opportunity`,
          dealStage: mappedStage as any,
          dealValue: Number(promoteForm.dealValue) || 0,
          dealCurrency: promoteForm.currency,
          expectedCloseDate: promoteForm.expectedCloseDate,
          dealOwner: c.dealOwner || 'Elena Rostova',
          accountStatus: c.accountStatus || 'Evaluating',
          productLinked: c.productLinked || 'CognitionOS Enterprise Runtime (50 Licenses)',
          updatedAt: new Date().toISOString(),
          tags: Array.from(new Set([...(c.tags || []), 'Promoted to CRM', 'YouConnect Synced'])),
          activityLog: [
            ...(c.activityLog || []),
            {
              id: `act-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              type: 'note' as const,
              summary: `Promoted from General Rubrica to Business CRM (${mappedStage}) with ${promoteForm.currency}${promoteForm.dealValue.toLocaleString()} target deal value and 100% shared YouConnect data.`,
            },
          ],
        };
      }
      return c;
    });

    onUpdateContacts(updated);
    setIsPromoteModalOpen(false);
    setContactToPromote(null);
    setImportStatusNotice(`✓ Promoted "${contactToPromote.name}" to Business CRM with full shared card data!`);
    setTimeout(() => setImportStatusNotice(null), 3500);
  };

  // CSV Import handler
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parseCSVContacts(content);
      if (parsed.length > 0) {
        const newItems: CRMContact[] = parsed.map((p, idx) => ({
          id: `c-csv-${Date.now()}-${idx}`,
          name: p.name || 'Imported Contact',
          role: p.role || '',
          company: p.company || '',
          category: p.category || 'personal',
          isBusinessCRM: p.category === 'business',
          email: p.email || '',
          personalEmail: p.personalEmail,
          phone: p.phone || '',
          personalPhone: p.personalPhone,
          website: p.website || '',
          notes: p.notes || 'Imported from CSV address book.',
          source: 'import',
          status: p.status || 'new',
          tags: p.tags || ['CSV Import'],
          createdAt: new Date().toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        }));

        onUpdateContacts([...newItems, ...contacts]);
        setImportStatusNotice(`✓ Successfully imported ${newItems.length} contacts from CSV.`);
        setTimeout(() => setImportStatusNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = '';
    setIsImportModalOpen(false);
  };

  // vCard (.vcf) Import handler
  const handleVCFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = parseVCardContacts(content);
      if (parsed.length > 0) {
        const newItems: CRMContact[] = parsed.map((p, idx) => ({
          id: `c-vcf-${Date.now()}-${idx}`,
          name: p.name || 'vCard Contact',
          role: p.role || '',
          company: p.company || '',
          category: p.category || 'personal',
          isBusinessCRM: p.category === 'business',
          email: p.email || '',
          personalEmail: p.personalEmail,
          phone: p.phone || '',
          personalPhone: p.personalPhone,
          website: p.website || '',
          notes: p.notes || 'Imported from vCard .vcf address book.',
          source: 'import',
          status: 'new',
          tags: ['vCard (.vcf)'],
          createdAt: new Date().toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        }));

        onUpdateContacts([...newItems, ...contacts]);
        setImportStatusNotice(`✓ Successfully imported ${newItems.length} contacts from vCard file.`);
        setTimeout(() => setImportStatusNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    if (vcfInputRef.current) vcfInputRef.current.value = '';
    setIsImportModalOpen(false);
  };

  // Single Contact vCard Download
  const handleDownloadSingleVCard = (contact: CRMContact, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const vCardStr = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      contact.company ? `ORG:${contact.company}` : '',
      contact.role ? `TITLE:${contact.role}` : '',
      contact.email ? `EMAIL;TYPE=INTERNET,WORK:${contact.email}` : '',
      contact.personalEmail ? `EMAIL;TYPE=INTERNET,HOME:${contact.personalEmail}` : '',
      contact.phone ? `TEL;TYPE=WORK,VOICE:${contact.phone}` : '',
      contact.personalPhone ? `TEL;TYPE=CELL,HOME:${contact.personalPhone}` : '',
      contact.website ? `URL:${contact.website}` : '',
      contact.isEmergencyContact ? `X-EMERGENCY:YES;RELATION=${contact.emergencyRelationship || 'ICE'}` : '',
      contact.notes ? `NOTE:${contact.notes.replace(/\n/g, '\\n')}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

    downloadVCard(contact.name || 'contact', vCardStr);
  };

  // Delete contact
  const handleDeleteContact = (contactId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateContacts(contacts.filter((c) => c.id !== contactId));
    if (selectedContact?.id === contactId) setSelectedContact(null);
  };

  // Create new contact manually with full Master Profile fields support
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    const first = newContactForm.firstName.trim();
    const last = newContactForm.lastName.trim();
    const fullName = [first, last].filter(Boolean).join(' ').trim();
    if (!fullName) return;

    const socialsObj: Record<string, string> = {};
    if (newContactForm.linkedin.trim()) socialsObj.linkedin = newContactForm.linkedin.trim();
    if (newContactForm.instagram.trim()) socialsObj.instagram = newContactForm.instagram.trim();
    if (newContactForm.twitter.trim()) socialsObj.twitter = newContactForm.twitter.trim();
    if (newContactForm.whatsapp.trim()) socialsObj.whatsapp = newContactForm.whatsapp.trim();
    if (newContactForm.github.trim()) socialsObj.github = newContactForm.github.trim();
    if (newContactForm.youtube.trim()) socialsObj.youtube = newContactForm.youtube.trim();
    if (newContactForm.tiktok.trim()) socialsObj.tiktok = newContactForm.tiktok.trim();
    if (newContactForm.telegram.trim()) socialsObj.telegram = newContactForm.telegram.trim();

    const passionsList = newContactForm.passionsText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((title, idx) => ({
        id: `pas-${Date.now()}-${idx}`,
        title,
        category: 'sport' as const,
      }));

    const educationList =
      newContactForm.educationInstitution.trim() || newContactForm.educationDegree.trim()
        ? [
            {
              id: `edu-${Date.now()}`,
              institution: newContactForm.educationInstitution.trim() || 'University',
              degree: newContactForm.educationDegree.trim() || 'Degree',
            },
          ]
        : undefined;

    const customFields: RubricaField[] =
      newContactForm.customFieldLabel.trim() && newContactForm.customFieldValue.trim()
        ? [
            {
              id: `rf-${Date.now()}`,
              label: newContactForm.customFieldLabel.trim(),
              value: newContactForm.customFieldValue.trim(),
              category:
                newContactForm.category === 'club'
                  ? 'club'
                  : newContactForm.category === 'business'
                  ? 'work'
                  : 'personal',
            },
          ]
        : [];

    const newContact: CRMContact = {
      id: `c-rubrica-${Date.now()}`,
      name: fullName,
      firstName: first || undefined,
      lastName: last || undefined,
      nickname: newContactForm.nickname.trim() || undefined,
      pronouns: newContactForm.pronouns.trim() || undefined,
      gender: newContactForm.gender.trim() || undefined,
      role: newContactForm.role.trim(),
      department: newContactForm.department.trim() || undefined,
      company: newContactForm.company.trim(),
      headline: newContactForm.headline.trim() || undefined,
      bio: newContactForm.bio.trim() || undefined,
      personalBio: newContactForm.personalBio.trim() || undefined,
      category: newContactForm.category,
      isBusinessCRM: newContactForm.category === 'business',
      email: newContactForm.email.trim() || newContactForm.personalEmail.trim(),
      personalEmail: newContactForm.personalEmail.trim() || undefined,
      phone: newContactForm.phone.trim() || newContactForm.personalPhone.trim(),
      personalPhone: newContactForm.personalPhone.trim() || undefined,
      website: newContactForm.website.trim() || undefined,
      location: newContactForm.location.trim() || undefined,
      officeAddress: newContactForm.officeAddress.trim() || undefined,
      homeAddress: newContactForm.homeAddress.trim() || undefined,
      taxIdOrVat: newContactForm.taxIdOrVat.trim() || undefined,
      birthday: newContactForm.birthday || undefined,
      notes: newContactForm.notes.trim() || undefined,
      socials: Object.keys(socialsObj).length > 0 ? socialsObj : undefined,
      passions: passionsList.length > 0 ? passionsList : undefined,
      education: educationList,
      rubricaFields: customFields.length > 0 ? customFields : undefined,
      isFavorite: newContactForm.isFavorite,
      isEmergencyContact: newContactForm.isEmergencyContact,
      emergencyRelationship: newContactForm.isEmergencyContact
        ? newContactForm.emergencyRelationship || 'Emergency Contact'
        : undefined,
      source: 'manual',
      status: 'new',
      tags: newContactForm.tags
        ? newContactForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [newContactForm.category],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    };

    onAddContact(newContact);
    setIsAddModalOpen(false);
    setNewContactForm({
      firstName: '',
      lastName: '',
      nickname: '',
      pronouns: '',
      gender: '',
      role: '',
      department: '',
      company: '',
      headline: '',
      bio: '',
      personalBio: '',
      category: 'personal',
      email: '',
      personalEmail: '',
      phone: '',
      personalPhone: '',
      website: '',
      location: '',
      officeAddress: '',
      homeAddress: '',
      taxIdOrVat: '',
      birthday: '',
      notes: '',
      source: 'manual',
      tags: '',
      passionsText: '',
      educationInstitution: '',
      educationDegree: '',
      linkedin: '',
      instagram: '',
      twitter: '',
      whatsapp: '',
      github: '',
      youtube: '',
      tiktok: '',
      telegram: '',
      customFieldLabel: '',
      customFieldValue: '',
      isFavorite: false,
      isEmergencyContact: false,
      emergencyRelationship: '',
    });
    setImportStatusNotice(`✓ Added "${newContact.name}" to Contacts.`);
    setTimeout(() => setImportStatusNotice(null), 3000);
  };

  // Scan / Tap Incoming NFC Contact Card into Rubrica
  const handleScanIncomingNfcContact = () => {
    const sampleIncomingContacts: CRMContact[] = [
      {
        id: `c-nfc-${Date.now()}`,
        name: 'Sofia Valenti',
        firstName: 'Sofia',
        lastName: 'Valenti',
        role: 'Club Captain & Principal Architect',
        department: 'Architectural Design & Padel Committee',
        company: 'Milano Padel & Design Studio',
        category: 'club',
        isBusinessCRM: false,
        email: 'sofia@valentistudio.it',
        personalEmail: 'sofia.valenti.mi@icloud.com',
        personalPhone: '+39 02 5550 1928',
        phone: '+39 02 5550 1928',
        website: 'https://valentistudio.it',
        location: 'Milan, Italy',
        officeAddress: 'Via Tortona 31, 20144 Milano MI, Italy',
        taxIdOrVat: 'IT-08912340962',
        headline: 'Principal Hospitality Architect & Milano Padel Club Captain',
        bio: 'Designing sustainable luxury sports clubs & boutique hotels across Europe. Playing 4.5 level left-side padel.',
        notes: 'Received via NFC card tap. Shared full YouConnect Club, Studio & Social coordinates.',
        source: 'nfc',
        status: 'new',
        tags: ['NFC Tap', 'Padel Club', 'Selective Sync', 'YouConnect Synced'],
        socials: {
          linkedin: 'https://linkedin.com/in/sofiavalenti-arch',
          instagram: '@sofiavalenti.arch',
          twitter: 'https://x.com/sofiavalenti_mi',
          whatsapp: '+390255501928',
        },
        selectiveSyncInfo: {
          isSynced: true,
          lastSyncedAt: new Date().toISOString(),
          senderCircle: 'Club & Studio Hybrid Card',
          sharedFieldsList: [
            'Full Name',
            'Role & Department',
            'Work & Personal Emails',
            'Mobile Phone',
            'Via Tortona Studio Address & VAT',
            'Bio & Headline',
            'LinkedIn, Instagram, X, WhatsApp',
            'Padel Level 4.5 & Court Preference',
          ],
          version: 1,
        },
        sharedCard: {
          cardName: 'Sofia Valenti · Studio & Club Card',
          category: 'club',
          tag: 'Sport',
          theme: 'aurora_glass',
          accentColor: '#10B981',
          layoutStyle: 'editorial_masthead',
          customTagline: 'Principal Architect & Club Captain · Milan',
          vanitySlug: 'sofia-valenti',
          livePresenceStatus: 'Milano Design District · Via Tortona',
        },
        rubricaFields: [
          { id: 'rf-nfc-1', label: 'Padel Level', value: '4.5 Intermediate-Adv', category: 'sport' },
          { id: 'rf-nfc-2', label: 'Preferred Court', value: 'Left Side / Backhand', category: 'sport' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      },
    ];
    const tapped = sampleIncomingContacts[0];
    onAddContact(tapped);
    setSelectedContact(tapped);
    setImportStatusNotice(`✓ NFC Contact Card Read: "${tapped.name}" saved to your Contacts with full shared data.`);
    setTimeout(() => setImportStatusNotice(null), 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Notice Banner */}
      {importStatusNotice && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{importStatusNotice}</span>
          </div>
          <button
            onClick={() => setImportStatusNotice(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">Contacts</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {contacts.length} {contacts.length === 1 ? 'Connection' : 'Connections'} in your network directory
            </p>
          </div>
        </div>

        {/* Global Rubrica Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scan Incoming NFC Contact Tag */}
          <button
            type="button"
            onClick={handleScanIncomingNfcContact}
            className="h-9 px-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 text-xs font-semibold text-cyan-300 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-cyan-900/60 hover:text-white"
            title="Read another person's NFC business card into your Contacts"
          >
            <ScanLine className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Scan NFC Contact</span>
          </button>

          {/* Upload / Import Menu Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>Upload Contacts</span>
          </button>

          {/* Export vCard */}
          <button
            type="button"
            onClick={() => exportContactsToVCF(filteredContacts)}
            className="h-9 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 hover:text-white"
            title="Export standard vCard (.vcf) address book"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Export vCard (.vcf)</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportContactsToCSV(filteredContacts)}
            className="h-9 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 hover:text-white"
            title="Export CSV spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Export CSV</span>
          </button>

          {/* Add New Contact */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm transition-all hover:bg-indigo-500"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Emergency Contact Quick Access Banner (if any configured) */}
      {counts.emergency > 0 && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-slate-900/60 to-slate-950 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">
                    Emergency (ICE) Contacts Configured
                  </span>
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    {counts.emergency} Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Designated emergency contacts are accessible for urgent calling and medical assistance.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedCategory('emergency')}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-600/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-600/40 hover:text-white shrink-0"
            >
              <Heart className="h-3.5 w-3.5" />
              <span>View Emergency Contacts</span>
            </button>
          </div>
        </div>
      )}

      {/* Search, Category Filter Tabs & View Mode Switcher */}
      <div className="mb-6 space-y-4">
        {/* Row 1: Filter Chips + View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category & Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow-inner'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              All ({counts.all})
            </button>

            {/* Favorite Filter Chip */}
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'favorites'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>Favorites ({counts.favorites})</span>
            </button>

            {/* Emergency Filter Chip */}
            <button
              onClick={() => setSelectedCategory('emergency')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'emergency'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>Emergency (ICE) ({counts.emergency})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('personal')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'personal'
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Heart className="h-3 w-3 text-rose-400" />
              <span>Personal & Family ({counts.personal})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('club')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'club'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Dumbbell className="h-3 w-3 text-amber-400" />
              <span>Club & Sports ({counts.club})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('business')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'business'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Briefcase className="h-3 w-3 text-indigo-400" />
              <span>Business ({counts.business})</span>
            </button>

            <button
              onClick={() => setSelectedCategory('synced')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedCategory === 'synced'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>Synced ({counts.synced})</span>
            </button>
          </div>

          {/* View Mode Toggle (List View vs. Card View) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Dense List View"
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Card Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, phone, club, relationship, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTACTS DISPLAY: LIST VIEW VS CARD GRID VIEW                             */}
      {/* ========================================================================= */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No contacts found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? `No contacts match "${searchTerm}". Try a different keyword.`
              : selectedCategory === 'favorites'
              ? 'No favorite contacts starred yet. Click the star on any contact to add.'
              : selectedCategory === 'emergency'
              ? 'No emergency (ICE) contacts configured yet. Mark a family member or doctor as ICE.'
              : 'Your Contacts directory is ready. Add a contact or import your address book.'}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Add Contact
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Import CSV / vCard
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ======================== 1. DENSE LIST VIEW ======================== */
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold select-none">
                  <th className="py-3 pl-4 pr-2 w-10 text-center" title="Favorite">
                    <Star className="h-3.5 w-3.5 mx-auto text-slate-500" />
                  </th>
                  <th className="py-3 px-2 w-12 text-center" title="In Case of Emergency">
                    <ShieldAlert className="h-3.5 w-3.5 mx-auto text-slate-500" />
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">Name</th>
                  <th className="py-3 px-3 min-w-[120px]">Last Name</th>
                  <th className="py-3 px-3 min-w-[125px]">Circle & Role</th>
                  <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">Phone Number</th>
                  <th className="py-3 px-3 min-w-[145px] hidden md:table-cell">Email Address</th>
                  <th className="py-3 px-3 hidden lg:table-cell">Directory Details</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap w-[164px]">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContacts.map((contact) => {
                  const isSelected = selectedContact?.id === contact.id;
                  const primaryPhone = contact.phone || contact.personalPhone;
                  const primaryEmail = contact.email || contact.personalEmail;
                  const derivedFirstName =
                    contact.firstName || contact.name.trim().split(/\s+/)[0] || contact.name;
                  const derivedLastName =
                    contact.lastName ||
                    contact.name.trim().split(/\s+/).slice(1).join(' ') ||
                    '—';

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`cursor-pointer transition hover:bg-slate-800/50 group ${
                        isSelected ? 'bg-slate-800/70 text-white' : 'text-slate-300'
                      }`}
                    >
                      {/* Favorite Toggle Star */}
                      <td
                        className="py-3 pl-4 pr-2 text-center"
                        onClick={(e) => handleToggleFavorite(contact.id, e)}
                      >
                        <button
                          type="button"
                          className="p-1 rounded hover:scale-110 transition-transform"
                          title={contact.isFavorite ? 'Remove from favorites' : 'Star as favorite'}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              contact.isFavorite
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600 hover:text-amber-400'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Emergency Contact (ICE) Badge / Toggle */}
                      <td
                        className="py-3 px-2 text-center"
                        onClick={(e) => handleToggleEmergency(contact.id, e)}
                      >
                        <button
                          type="button"
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-tight transition-all ${
                            contact.isEmergencyContact
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                              : 'text-slate-600 hover:text-rose-400 border border-transparent'
                          }`}
                          title={
                            contact.isEmergencyContact
                              ? `Emergency Contact: ${contact.emergencyRelationship || 'ICE'}. Click to toggle.`
                              : 'Click to mark as Emergency Contact (ICE)'
                          }
                        >
                          {contact.isEmergencyContact ? 'ICE' : '+ICE'}
                        </button>
                      </td>

                      {/* Contact First Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              contact.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                            }
                            alt={contact.name}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                                {derivedFirstName}
                              </span>
                              {contact.selectiveSyncInfo?.isSynced && (
                                <span title="Updated via selective sharing sync">
                                  <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            {contact.emergencyRelationship && (
                              <span className="text-[10px] text-rose-400 font-medium block truncate">
                                {contact.emergencyRelationship}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Last Name */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate block">
                          {derivedLastName}
                        </span>
                      </td>

                      {/* Circle & Role */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-medium uppercase ${
                              contact.category === 'family' || contact.category === 'personal'
                                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                : contact.category === 'club'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : contact.category === 'business'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {contact.category || 'personal'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {contact.role || contact.company || '—'}
                        </div>
                      </td>

                      {/* Phone Number with quick dial */}
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {primaryPhone ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${primaryPhone}`}
                              className="hover:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                            >
                              <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                              <span>{primaryPhone}</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Email Address */}
                      <td className="py-3 px-3 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        {primaryEmail ? (
                          <a
                            href={`mailto:${primaryEmail}`}
                            className="text-slate-300 hover:text-indigo-400 hover:underline flex items-center gap-1.5 truncate max-w-[170px]"
                          >
                            <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{primaryEmail}</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Directory Details / Rubrica Custom attributes */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        {contact.rubricaFields && contact.rubricaFields.length > 0 ? (
                          <div className="flex items-center gap-1 max-w-[175px] overflow-hidden">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono truncate">
                              {contact.rubricaFields[0].label}: {contact.rubricaFields[0].value}
                            </span>
                            {contact.rubricaFields.length > 1 && (
                              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                +{contact.rubricaFields.length - 1}
                              </span>
                            )}
                          </div>
                        ) : contact.location ? (
                          <span className="text-[11px] text-slate-400 truncate flex items-center gap-1 max-w-[175px]">
                            <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate">{contact.location}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* Single vCard Download */}
                          <button
                            onClick={(e) => handleDownloadSingleVCard(contact, e)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                            title="Download vCard (.vcf)"
                          >
                            <Download className="h-3.5 w-3.5 text-cyan-400" />
                          </button>

                          {/* Promote to Business CRM button / CRM status badge (uniform width for vertical alignment) */}
                          {!contact.isBusinessCRM ? (
                            <button
                              onClick={(e) => handleOpenPromoteModal(contact, e)}
                              className="inline-flex h-6 w-[78px] items-center justify-center gap-1 rounded-md bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 px-2 text-[10px] font-semibold text-indigo-300 hover:text-white transition shrink-0"
                              title="Promote to Business CRM"
                            >
                              <TrendingUp className="h-3 w-3 shrink-0" />
                              <span>Promote</span>
                            </button>
                          ) : (
                            <span
                              className="inline-flex h-6 w-[78px] items-center justify-center rounded-md bg-indigo-950/60 border border-indigo-800/40 px-2 text-[10px] font-semibold text-indigo-300 shrink-0"
                              title="Already in Business CRM"
                            >
                              CRM
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDeleteContact(contact.id, e)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                            title="Delete contact"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ======================== 2. CARD GRID VIEW ======================== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => {
            const primaryPhone = contact.phone || contact.personalPhone;
            const primaryEmail = contact.email || contact.personalEmail;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-slate-900/70 p-5 transition-all hover:border-slate-700 hover:bg-slate-900 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer"
              >
                <div>
                  {/* Top Bar: Favorite + ICE + Category Tag + Selective Sync */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(contact.id, e)}
                        className="p-1 rounded hover:scale-110 transition-transform"
                        title={contact.isFavorite ? 'Remove from favorites' : 'Star as favorite'}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            contact.isFavorite
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600 hover:text-amber-400'
                          }`}
                        />
                      </button>

                      {/* Emergency ICE Button */}
                      <button
                        onClick={(e) => handleToggleEmergency(contact.id, e)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-tight transition-all ${
                          contact.isEmergencyContact
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                            : 'text-slate-600 hover:text-rose-400 border border-transparent'
                        }`}
                        title={
                          contact.isEmergencyContact
                            ? `Emergency Contact: ${contact.emergencyRelationship || 'ICE'}. Click to toggle.`
                            : 'Click to mark as Emergency Contact (ICE)'
                        }
                      >
                        {contact.isEmergencyContact ? 'ICE' : '+ICE'}
                      </button>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                          contact.category === 'family' || contact.category === 'personal'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : contact.category === 'club'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : contact.category === 'business'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {contact.category || 'personal'}
                      </span>
                    </div>

                    {/* Selective Sharing Sync Status */}
                    {contact.selectiveSyncInfo?.isSynced && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
                        title={`Synced from ${contact.selectiveSyncInfo.senderCircle}: ${contact.selectiveSyncInfo.sharedFieldsList.join(', ')}`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>Sync v{contact.selectiveSyncInfo.version || 1}</span>
                      </span>
                    )}
                  </div>

                  {/* Contact Identity */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <img
                      src={
                        contact.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={contact.name}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-base truncate group-hover:text-indigo-400 transition-colors">
                        {contact.name}
                      </h3>
                      {contact.emergencyRelationship && (
                        <p className="text-[11px] text-rose-400 font-medium truncate">
                          {contact.emergencyRelationship}
                        </p>
                      )}
                      {contact.role && (
                        <p className="text-xs text-slate-300 truncate">{contact.role}</p>
                      )}
                      {contact.company && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Selective Sync Fields pill list */}
                  {contact.selectiveSyncInfo?.isSynced && (
                    <div className="mb-3 rounded-lg bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-medium text-slate-300">Selective Sharing Received:</span>
                        <span className="text-[10px] text-emerald-400/90 font-mono">
                          {contact.selectiveSyncInfo.sharedFieldsList.length} fields
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {contact.selectiveSyncInfo.sharedFieldsList.slice(0, 4).map((f, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-800"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact channels */}
                  <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                    {primaryPhone && (
                      <div className="flex items-center gap-2 text-slate-300 truncate">
                        <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{primaryPhone}</span>
                        {contact.personalPhone && contact.personalPhone === primaryPhone && (
                          <span className="text-[10px] text-slate-400 font-mono">(Mobile)</span>
                        )}
                      </div>
                    )}
                    {primaryEmail && (
                      <div className="flex items-center gap-2 text-slate-300 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{primaryEmail}</span>
                      </div>
                    )}
                    {contact.location && (
                      <div className="flex items-center gap-2 text-slate-400 truncate text-[11px]">
                        <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{contact.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row Actions */}
                <div
                  className="mt-2 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Download single vCard */}
                  <button
                    onClick={(e) => handleDownloadSingleVCard(contact, e)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                    title="Download RFC vCard .vcf file"
                  >
                    <Download className="h-3.5 w-3.5 text-cyan-400" />
                    <span>vCard</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Promote to Business CRM button */}
                    {!contact.isBusinessCRM ? (
                      <button
                        onClick={(e) => handleOpenPromoteModal(contact, e)}
                        className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-600/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 transition-colors hover:bg-indigo-600 hover:text-white"
                        title="Promote contact into Business CRM sales pipeline"
                      >
                        <TrendingUp className="h-3 w-3" />
                        <span>Promote</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 rounded-lg bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                        <Briefcase className="h-3 w-3" />
                        <span>In CRM</span>
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteContact(contact.id, e)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROMOTE TO BUSINESS CRM MODAL                                              */}
      {/* ========================================================================= */}
      {isPromoteModalOpen && contactToPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsPromoteModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Promote to Business CRM</h3>
                <p className="text-xs text-slate-400">
                  Transition this contact into your qualified business opportunity pipeline.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 flex items-center gap-3">
              <img
                src={contactToPromote.avatarUrl}
                alt={contactToPromote.name}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-700"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {contactToPromote.name}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {contactToPromote.role || 'Contact'}{' '}
                  {contactToPromote.company ? `@ ${contactToPromote.company}` : ''}
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Starting Pipeline Stage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['new', 'contacted', 'qualified'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPromoteForm((prev) => ({ ...prev, stage: st }))}
                      className={`rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                        promoteForm.stage === st
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Deal / Opportunity Value
                </label>
                <div className="flex gap-2">
                  <select
                    value={promoteForm.currency}
                    onChange={(e) =>
                      setPromoteForm((prev) => ({ ...prev, currency: e.target.value }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-white"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="CHF">CHF</option>
                  </select>
                  <input
                    type="number"
                    value={promoteForm.dealValue}
                    onChange={(e) =>
                      setPromoteForm((prev) => ({ ...prev, dealValue: Number(e.target.value) }))
                    }
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Expected Close Date
                </label>
                <input
                  type="date"
                  value={promoteForm.expectedCloseDate}
                  onChange={(e) =>
                    setPromoteForm((prev) => ({ ...prev, expectedCloseDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPromotion}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
              >
                Promote to CRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMPORT CONTACTS MODAL (CSV & vCard .vcf)                                   */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload & Import Contacts</h3>
                <p className="text-xs text-slate-400">
                  Seamlessly import your existing address book into YouConnect Contacts.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: vCard (.vcf) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-indigo-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">vCard (.vcf) File</div>
                      <div className="text-xs text-slate-400">
                        Apple Contacts, Google Contacts, iOS & Android exports.
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500">
                    <span>Select .vcf</span>
                    <input
                      ref={vcfInputRef}
                      type="file"
                      accept=".vcf,text/vcard"
                      onChange={handleVCFUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Option 2: CSV Spreadsheet */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-indigo-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">CSV Spreadsheet</div>
                      <div className="text-xs text-slate-400">
                        Standard spreadsheet with columns: Name, Role, Company, Email, Phone.
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500">
                    <span>Select CSV</span>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD CONTACT MODAL (Supports Separate Name & Last Name + All Master Fields) */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Add New Contact</h3>
                <p className="text-xs text-slate-400">
                  Enter Name & Last Name plus any Personal, Work, Social, or Master Profile fields.
                </p>
              </div>
            </div>

            {/* Section Tabs inside Add Contact Modal */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              {[
                { id: 'personal', label: 'Personal & Identity' },
                { id: 'work', label: 'Work & Organization' },
                { id: 'socials_extra', label: 'Socials, Bio & Extras' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setAddContactSection(sec.id as any)}
                  className={`h-8 px-2 rounded-lg text-xs font-semibold transition truncate ${
                    addContactSection === sec.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              {/* Always Visible Top Identity Row: Name (First Name) + Last Name + Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Name (First Name) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactForm.firstName}
                    onChange={(e) =>
                      setNewContactForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Marco"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Last Name (Surname) <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactForm.lastName}
                    onChange={(e) =>
                      setNewContactForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Bellini"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newContactForm.category}
                    onChange={(e) =>
                      setNewContactForm((prev) => ({
                        ...prev,
                        category: e.target.value as ContactCategory,
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="personal">Personal / Friends</option>
                    <option value="family">Family Circle</option>
                    <option value="club">Club & Sports (Golf, Soccer, Padel)</option>
                    <option value="business">Business / Professional</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* SECTION 1: PERSONAL & IDENTITY */}
              {addContactSection === 'personal' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Personal Mobile / Cell
                      </label>
                      <input
                        type="text"
                        value={newContactForm.personalPhone}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, personalPhone: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="+1 (415) 555-0199"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Personal Email
                      </label>
                      <input
                        type="email"
                        value={newContactForm.personalEmail}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, personalEmail: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="marco@icloud.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={newContactForm.nickname}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, nickname: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. Marc"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Pronouns
                      </label>
                      <input
                        type="text"
                        value={newContactForm.pronouns}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, pronouns: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. He/Him, She/Her"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Birthday
                      </label>
                      <input
                        type="date"
                        value={newContactForm.birthday}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, birthday: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Home Address
                      </label>
                      <input
                        type="text"
                        value={newContactForm.homeAddress}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, homeAddress: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Residential street & city"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={newContactForm.location}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, location: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>
                  </div>

                  {/* Special Flags: Favorite and Emergency ICE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={newContactForm.isFavorite}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, isFavorite: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500/40"
                      />
                      <div className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span>Star as Favorite</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={newContactForm.isEmergencyContact}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({
                            ...prev,
                            isEmergencyContact: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500/40"
                      />
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                        <span>Emergency (ICE) Contact</span>
                      </div>
                    </label>

                    {newContactForm.isEmergencyContact && (
                      <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                        <label className="block text-[11px] font-medium text-rose-300 mb-1">
                          Emergency Relationship (e.g. Sister, Doctor, Spouse)
                        </label>
                        <input
                          type="text"
                          value={newContactForm.emergencyRelationship}
                          onChange={(e) =>
                            setNewContactForm((prev) => ({
                              ...prev,
                              emergencyRelationship: e.target.value,
                            }))
                          }
                          placeholder="e.g. Sister (Primary ICE)"
                          className="w-full h-9 rounded-lg border border-rose-500/30 bg-slate-900 px-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 2: WORK & ORGANIZATION */}
              {addContactSection === 'work' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Role / Job Title
                      </label>
                      <input
                        type="text"
                        value={newContactForm.role}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, role: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. Managing Partner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        value={newContactForm.company}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, company: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. Bellini Ventures"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Department / Practice
                      </label>
                      <input
                        type="text"
                        value={newContactForm.department}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. Executive Board"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Work Phone
                      </label>
                      <input
                        type="text"
                        value={newContactForm.phone}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="+1 (415) 555-0100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={newContactForm.email}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="marco@belliniventures.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Official Website
                      </label>
                      <input
                        type="text"
                        value={newContactForm.website}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, website: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Office Address
                      </label>
                      <input
                        type="text"
                        value={newContactForm.officeAddress}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, officeAddress: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="HQ street, suite & city"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Tax ID / VAT
                      </label>
                      <input
                        type="text"
                        value={newContactForm.taxIdOrVat}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, taxIdOrVat: e.target.value }))
                        }
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. IT-08912340962"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Executive Headline
                    </label>
                    <input
                      type="text"
                      value={newContactForm.headline}
                      onChange={(e) =>
                        setNewContactForm((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      placeholder="Short professional positioning statement..."
                    />
                  </div>
                </div>
              )}

              {/* SECTION 3: SOCIALS, BIO, PASSIONS, EDUCATION & CUSTOM FIELDS */}
              {addContactSection === 'socials_extra' && (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="text"
                        value={newContactForm.linkedin}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, linkedin: e.target.value }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={newContactForm.instagram}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, instagram: e.target.value }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="@handle"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        X / Twitter
                      </label>
                      <input
                        type="text"
                        value={newContactForm.twitter}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, twitter: e.target.value }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="@handle"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={newContactForm.whatsapp}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, whatsapp: e.target.value }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="+14155550199"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Passions & Sports (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={newContactForm.passionsText}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, passionsText: e.target.value }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Padel, Golf, Sailing"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Alma Mater / University
                      </label>
                      <input
                        type="text"
                        value={newContactForm.educationInstitution}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({
                            ...prev,
                            educationInstitution: e.target.value,
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. Bocconi University"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Degree / Field
                      </label>
                      <input
                        type="text"
                        value={newContactForm.educationDegree}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({
                            ...prev,
                            educationDegree: e.target.value,
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="e.g. MSc Finance"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Custom Attribute Label (e.g. Padel Level)
                      </label>
                      <input
                        type="text"
                        value={newContactForm.customFieldLabel}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({
                            ...prev,
                            customFieldLabel: e.target.value,
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Padel Level"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Custom Attribute Value (e.g. 4.5 Left)
                      </label>
                      <input
                        type="text"
                        value={newContactForm.customFieldValue}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({
                            ...prev,
                            customFieldValue: e.target.value,
                          }))
                        }
                        className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="4.5 Intermediate"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Bio / Executive Summary
                      </label>
                      <textarea
                        rows={2}
                        value={newContactForm.bio}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, bio: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Professional or personal bio..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Notes & Tags
                      </label>
                      <textarea
                        rows={2}
                        value={newContactForm.notes}
                        onChange={(e) =>
                          setNewContactForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        placeholder="Context notes, where you met..."
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
                >
                  Save to Contacts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTACT DETAIL DRAWER / MODAL (Full Master Profile & Shared Card Record)  */}
      {/* ========================================================================= */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedContact(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 mb-5">
              <img
                src={selectedContact.avatarUrl}
                alt={selectedContact.name}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-500/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white truncate">{selectedContact.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      selectedContact.category === 'family' || selectedContact.category === 'personal'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : selectedContact.category === 'club'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : selectedContact.category === 'business'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {selectedContact.category || 'personal'}
                  </span>

                  {selectedContact.isFavorite && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <span>Favorite</span>
                    </span>
                  )}

                  {selectedContact.isEmergencyContact && (
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      <ShieldAlert className="h-3 w-3" />
                      <span>{selectedContact.emergencyRelationship || 'ICE'}</span>
                    </span>
                  )}
                </div>

                {/* Explicit Name & Last Name Split Badge */}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300">
                  <span>
                    <strong className="text-slate-400">Name:</strong>{' '}
                    {selectedContact.firstName || selectedContact.name.trim().split(/\s+/)[0]}
                  </span>
                  <span>
                    <strong className="text-slate-400">Last Name:</strong>{' '}
                    {selectedContact.lastName ||
                      selectedContact.name.trim().split(/\s+/).slice(1).join(' ') ||
                      '—'}
                  </span>
                  {selectedContact.nickname && (
                    <span>
                      <strong className="text-slate-400">Nickname:</strong> "{selectedContact.nickname}"
                    </span>
                  )}
                  {selectedContact.pronouns && (
                    <span className="text-[11px] font-mono text-indigo-300">
                      ({selectedContact.pronouns})
                    </span>
                  )}
                </div>

                {selectedContact.role && (
                  <p className="text-sm text-slate-300 mt-1">
                    {selectedContact.role}
                    {selectedContact.department ? ` · ${selectedContact.department}` : ''}
                  </p>
                )}
                {selectedContact.company && (
                  <p className="text-xs text-slate-400">{selectedContact.company}</p>
                )}
              </div>
            </div>

            {/* Emergency & Favorite Quick Toggles Bar */}
            <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-xl bg-slate-950/70 border border-slate-800 p-3">
              {/* Toggle Favorite */}
              <button
                type="button"
                onClick={() => handleToggleFavorite(selectedContact.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedContact.isFavorite
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    selectedContact.isFavorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{selectedContact.isFavorite ? 'Starred Favorite' : 'Star as Favorite'}</span>
              </button>

              {/* Toggle Emergency Contact */}
              <button
                type="button"
                onClick={() => handleToggleEmergency(selectedContact.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedContact.isEmergencyContact
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                <span>
                  {selectedContact.isEmergencyContact
                    ? 'Configured as ICE Contact'
                    : 'Mark as Emergency (ICE)'}
                </span>
              </button>
            </div>

            {/* Contact Actions: Save Contact to Phone, Official Website & Contextual Icebreaker */}
            <div className="mb-5 rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <MessageCircle className="h-4 w-4 text-indigo-400" />
                  <span>Contact Actions & Contextual Icebreaker</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase">
                  {selectedContact.category || 'Personal'} Circle
                </span>
              </div>

              {/* Primary Contact Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCardReaderContact(selectedContact)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Read Digital Card & Shared Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSingleVCard(selectedContact)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 transition shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Save Contact to Phone (.vcf)</span>
                </button>

                {selectedContact.website && (
                  <a
                    href={
                      selectedContact.website.startsWith('http')
                        ? selectedContact.website
                        : `https://${selectedContact.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3.5 py-2 text-xs font-bold text-indigo-200 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Explore Official Website</span>
                  </a>
                )}
              </div>

              <div className="pt-2 border-t border-indigo-500/20 space-y-2">
                <p className="text-xs text-slate-300 italic">
                  "{selectedContact.aiEnrichment?.suggestedIcebreaker ||
                    (selectedContact.category === 'club'
                      ? `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]}, great connecting at ${selectedContact.company || 'the club'}! Let's schedule our next match soon.`
                      : `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]}, great exchanging YouConnect cards! Keeping your latest coordinates in my Rubrica.`)}"
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {(selectedContact.email || selectedContact.personalEmail) && (
                    <a
                      href={`mailto:${selectedContact.email || selectedContact.personalEmail}?subject=${encodeURIComponent(
                        `Great connecting — ${selectedContact.company || 'YouConnect'}`
                      )}&body=${encodeURIComponent(
                        selectedContact.aiEnrichment?.suggestedIcebreaker ||
                          (selectedContact.category === 'club'
                            ? `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]},\n\nGreat connecting at ${selectedContact.company || 'the club'}! Let's set up a match soon.`
                            : `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]},\n\nGreat exchanging YouConnect cards!`)
                      )}`}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Contextual Icebreaker (Email)</span>
                    </a>
                  )}
                  {(selectedContact.personalPhone || selectedContact.phone) && (
                    <a
                      href={`https://wa.me/${(selectedContact.personalPhone || selectedContact.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        selectedContact.aiEnrichment?.suggestedIcebreaker ||
                          (selectedContact.category === 'club'
                            ? `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]}, great connecting at ${selectedContact.company || 'the club'}! Let's schedule a match soon.`
                            : `Hi ${selectedContact.firstName || selectedContact.name.split(' ')[0]}, great exchanging YouConnect cards!`)
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp Icebreaker</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact Quick Call Button (if designated) */}
            {selectedContact.isEmergencyContact && (selectedContact.phone || selectedContact.personalPhone) && (
              <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300 text-xs">
                  <PhoneCall className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>
                    Emergency Hotline:{' '}
                    <strong className="text-white font-mono">
                      {selectedContact.personalPhone || selectedContact.phone}
                    </strong>
                  </span>
                </div>
                <a
                  href={`tel:${selectedContact.personalPhone || selectedContact.phone}`}
                  className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-500 transition shadow"
                >
                  Call Now
                </a>
              </div>
            )}

            {/* Comprehensive Contact Details List (All Shared & Master Profile Fields) */}
            <div className="space-y-3.5 mb-6 text-xs text-slate-300">
              {/* Phone Numbers & Emails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Phone Numbers
                  </div>
                  {selectedContact.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Work:</span>
                      <a
                        href={`tel:${selectedContact.phone}`}
                        className="text-indigo-400 hover:underline font-mono truncate"
                      >
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}
                  {selectedContact.personalPhone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Personal:</span>
                      <a
                        href={`tel:${selectedContact.personalPhone}`}
                        className="text-indigo-400 hover:underline font-mono truncate"
                      >
                        {selectedContact.personalPhone}
                      </a>
                    </div>
                  )}
                  {!selectedContact.phone && !selectedContact.personalPhone && (
                    <span className="text-slate-500">No phone shared</span>
                  )}
                </div>

                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Email Addresses
                  </div>
                  {selectedContact.email && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Work:</span>
                      <a
                        href={`mailto:${selectedContact.email}`}
                        className="text-indigo-400 hover:underline truncate"
                      >
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                  {selectedContact.personalEmail && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Personal:</span>
                      <a
                        href={`mailto:${selectedContact.personalEmail}`}
                        className="text-indigo-400 hover:underline truncate"
                      >
                        {selectedContact.personalEmail}
                      </a>
                    </div>
                  )}
                  {!selectedContact.email && !selectedContact.personalEmail && (
                    <span className="text-slate-500">No email shared</span>
                  )}
                </div>
              </div>

              {/* Work, Addresses, Tax ID & Birthday */}
              {(selectedContact.location ||
                selectedContact.officeAddress ||
                selectedContact.homeAddress ||
                selectedContact.taxIdOrVat ||
                selectedContact.birthday) && (
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Locations, Coordinates & Dates
                  </div>
                  {selectedContact.location && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">City / Location:</span>
                      <span className="text-slate-200">{selectedContact.location}</span>
                    </div>
                  )}
                  {selectedContact.officeAddress && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Office Address:</span>
                      <span className="text-slate-200 text-right">{selectedContact.officeAddress}</span>
                    </div>
                  )}
                  {selectedContact.homeAddress && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Home Address:</span>
                      <span className="text-slate-200 text-right">{selectedContact.homeAddress}</span>
                    </div>
                  )}
                  {selectedContact.taxIdOrVat && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Tax ID / VAT:</span>
                      <span className="text-slate-200 font-mono">{selectedContact.taxIdOrVat}</span>
                    </div>
                  )}
                  {selectedContact.birthday && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Birthday:</span>
                      <span className="text-slate-200 font-mono">{selectedContact.birthday}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Headline & Bio */}
              {(selectedContact.headline || selectedContact.bio || selectedContact.personalBio) && (
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Headline & Bio
                  </div>
                  {selectedContact.headline && (
                    <p className="text-xs font-semibold text-indigo-300">{selectedContact.headline}</p>
                  )}
                  {selectedContact.bio && (
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedContact.bio}</p>
                  )}
                  {selectedContact.personalBio && (
                    <p className="text-xs text-slate-400 leading-relaxed">{selectedContact.personalBio}</p>
                  )}
                </div>
              )}

              {/* Social Channels */}
              {selectedContact.socials && Object.values(selectedContact.socials).some(Boolean) && (
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Shared Social Channels
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedContact.socials)
                      .filter(([, val]) => Boolean(val))
                      .map(([platform, val]) => (
                        <span
                          key={platform}
                          className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] font-mono text-cyan-300"
                        >
                          <strong className="uppercase text-slate-400 mr-1">{platform}:</strong>
                          {val}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Passions, Education & Custom Rubrica Fields */}
              {((selectedContact.passions && selectedContact.passions.length > 0) ||
                (selectedContact.education && selectedContact.education.length > 0) ||
                (selectedContact.rubricaFields && selectedContact.rubricaFields.length > 0)) && (
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5 space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Passions, Education & Custom Attributes
                  </div>
                  {selectedContact.passions && selectedContact.passions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedContact.passions.map((p) => (
                        <span
                          key={p.id}
                          className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] text-amber-300"
                        >
                          ★ {p.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedContact.education && selectedContact.education.length > 0 && (
                    <div className="space-y-1">
                      {selectedContact.education.map((ed) => (
                        <div key={ed.id} className="text-xs text-slate-300">
                          🎓 <strong>{ed.institution}</strong> — {ed.degree}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedContact.rubricaFields && selectedContact.rubricaFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedContact.rubricaFields.map((rf) => (
                        <span
                          key={rf.id}
                          className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-200"
                        >
                          {rf.label}: {rf.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Notes
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">
                    {selectedContact.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => handleDownloadSingleVCard(selectedContact)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5 text-cyan-400" />
                <span>Download vCard (.vcf)</span>
              </button>

              <div className="flex items-center gap-2">
                {!selectedContact.isBusinessCRM && (
                  <button
                    onClick={() => handleOpenPromoteModal(selectedContact)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Promote to Business CRM</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedContact(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Digital Card Reader Modal */}
      <ContactCardReaderModal
        contact={cardReaderContact}
        onClose={() => setCardReaderContact(null)}
        onSyncOrPromoteToCRM={(c) => {
          setCardReaderContact(null);
          handleOpenPromoteModal(c);
        }}
      />
    </div>
  );
};
