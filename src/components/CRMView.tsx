import React, { useState, useMemo } from 'react';
import {
  CRMContact,
  CRMStatus,
  ContactSource,
  DuplicatePair,
  ContactActivityLog,
  DealStage,
  AccountLifecycleStatus,
  AfterSalesCase,
  CaseReasonCategory,
  AfterSalesCaseStatus,
  AfterSalesCasePriority,
  SubscriptionState,
  AiUsageType,
} from '../types';
import { findDuplicatePairs } from '../utils/deduplication';
import { exportContactsToCSV } from '../utils/vcard';
import { getQuotaSummary } from '../utils/subscription';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { ContactCardReaderModal } from './ContactCardReaderModal';
import { COVER_BANNER_PRESETS } from '../data/presets';
import {
  Search,
  Download,
  UserPlus,
  Sparkles,
  GitMerge,
  Trash2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  X,
  Briefcase,
  DollarSign,
  TrendingUp,
  Clock,
  RotateCcw,
  BookOpen,
  Send,
  ScanLine,
  Copy,
  CreditCard,
  ShieldCheck,
  Wrench,
  Layers,
  Globe,
  UserCheck,
  AlertTriangle,
  Plus,
  Check,
  Share2,
  Lock,
  Crown,
  Coins,
} from 'lucide-react';

interface CRMViewProps {
  contacts: CRMContact[];
  onUpdateContacts: (updated: CRMContact[]) => void;
  onAddContact: (newContact: CRMContact) => void;
  onNavigateToRubrica?: () => void;
  subscription?: SubscriptionState;
  onConsumeAiCoin?: (usageType: AiUsageType, label: string) => boolean;
  onOpenSubscriptionModal?: () => void;
  onUpgradeToBusiness?: () => void;
}

const DEAL_STAGES: DealStage[] = [
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed-Won',
  'Closed-Lost',
];

const LOSS_REASON_OPTIONS = [
  'Budget / Pricing Constraints',
  'Competitor Selected',
  'Timing / Deferred to Next Quarter',
  'Missing Feature / Technical Fit',
  'No Decision / Prospect Unresponsive',
  'Internal Champion Left Organization',
  'Other Strategic Shift',
];

const ACCOUNT_STATUS_OPTIONS: AccountLifecycleStatus[] = [
  'Prospect',
  'Evaluating',
  'Onboarding',
  'Active Customer',
  'At Risk / Support Hold',
];

const CASE_CATEGORY_OPTIONS: CaseReasonCategory[] = [
  'Technical Support',
  'Billing',
  'Product Feedback',
  'Onboarding',
  'Account Management',
  'Warranty / SLA',
];

const CASE_STATUS_OPTIONS: AfterSalesCaseStatus[] = [
  'New',
  'In Progress',
  'Awaiting Customer',
  'Resolved',
];

const CASE_PRIORITY_OPTIONS: AfterSalesCasePriority[] = ['Low', 'Medium', 'High', 'Urgent'];

function mapDealStageToCRMStatus(stage: DealStage): CRMStatus {
  switch (stage) {
    case 'Qualification':
      return 'new';
    case 'Proposal':
      return 'contacted';
    case 'Negotiation':
      return 'qualified';
    case 'Closed-Won':
      return 'converted';
    case 'Closed-Lost':
      return 'lost';
  }
}

function getEffectiveDealStage(contact: CRMContact): DealStage {
  if (contact.dealStage) return contact.dealStage;
  switch (contact.status) {
    case 'new':
      return 'Qualification';
    case 'contacted':
      return 'Proposal';
    case 'qualified':
      return 'Negotiation';
    case 'converted':
      return 'Closed-Won';
    case 'lost':
      return 'Closed-Lost';
    default:
      return 'Qualification';
  }
}

function generateUniqueCaseId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CASE-${year}-${rand}`;
}

export const CRMView: React.FC<CRMViewProps> = ({
  contacts,
  onUpdateContacts,
  onAddContact,
  onNavigateToRubrica,
  subscription,
  onConsumeAiCoin,
  onOpenSubscriptionModal,
  onUpgradeToBusiness,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'sales' | 'after_sales' | 'intelligence' | 'shared_card'
  >('sales');
  const [activeDuplicatePair, setActiveDuplicatePair] = useState<DuplicatePair | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRubricaReaderModalOpen, setIsRubricaReaderModalOpen] = useState(false);
  const [cardReaderContact, setCardReaderContact] = useState<CRMContact | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [projectDiscussionInput, setProjectDiscussionInput] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lossReasonPromptContactId, setLossReasonPromptContactId] = useState<string | null>(null);

  // New Deal / Business Lead form state (includes Core + Minimum Sales + Synced fields)
  const [newForm, setNewForm] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    phone: '',
    dealName: '',
    dealStage: 'Qualification' as DealStage,
    dealValue: 45000,
    dealCurrency: '$',
    expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    dealOwner: 'Elena Rostova',
    lossReason: '',
    accountStatus: 'Prospect' as AccountLifecycleStatus,
    purchaseDate: '',
    productLinked: 'CognitionOS Enterprise Runtime (50 Licenses)',
    nextFollowUpDate: '',
    notes: '',
    source: 'manual' as ContactSource,
    tags: 'Business Deal, Prospect',
    linkedin: '',
    twitter: '',
    github: '',
  });

  // New After-Sales Case Form State
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    caseId: generateUniqueCaseId(),
    caseCategory: 'Technical Support' as CaseReasonCategory,
    status: 'New' as AfterSalesCaseStatus,
    priority: 'Medium' as AfterSalesCasePriority,
    productLinked: '',
    subject: '',
    resolutionNotes: '',
  });

  // Log Activity Form State
  const [activityForm, setActivityForm] = useState({
    type: 'call' as 'call' | 'email' | 'meeting' | 'note',
    summary: '',
  });
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // Business Contacts Only (Separation from General Rubrica)
  const businessContacts = useMemo(() => {
    return contacts.filter((c) =>
      typeof c.isBusinessCRM === 'boolean' ? c.isBusinessCRM : c.category === 'business'
    );
  }, [contacts]);

  // All Rubrica contacts (including non-CRM contacts that can be read or imported)
  const rubricaOnlyContacts = useMemo(() => {
    return contacts.filter((c) =>
      typeof c.isBusinessCRM === 'boolean' ? !c.isBusinessCRM : c.category !== 'business'
    );
  }, [contacts]);

  // Calculate duplicate pairs strictly across business contacts
  const duplicatePairs = useMemo(() => {
    return findDuplicatePairs(businessContacts, 60);
  }, [businessContacts]);

  // Filtered contacts based on search & Deal Stage
  const filteredContacts = useMemo(() => {
    return businessContacts.filter((c) => {
      const stage = getEffectiveDealStage(c);
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.dealName && c.dealName.toLowerCase().includes(q)) ||
        (c.dealOwner && c.dealOwner.toLowerCase().includes(q)) ||
        (c.productLinked && c.productLinked.toLowerCase().includes(q)) ||
        (c.role && c.role.toLowerCase().includes(q)) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(q)));

      const matchesStage =
        selectedStageFilter === 'all'
          ? true
          : selectedStageFilter === 'after_sales_open'
          ? (c.afterSalesCases || []).some((cs) => cs.status !== 'Resolved')
          : stage === selectedStageFilter;

      return matchesSearch && matchesStage;
    });
  }, [businessContacts, searchTerm, selectedStageFilter]);

  // Pipeline & After-Sales Metrics Calculation
  const pipelineMetrics = useMemo(() => {
    let totalPipelineValue = 0;
    let negotiationAndProposalValue = 0;
    let convertedValue = 0;
    let activeDealsCount = 0;
    let wonCount = 0;
    let openSupportCasesCount = 0;
    let urgentSupportCasesCount = 0;

    businessContacts.forEach((c) => {
      const stage = getEffectiveDealStage(c);
      const val = c.dealValue || 0;
      if (stage !== 'Closed-Lost') {
        totalPipelineValue += val;
        activeDealsCount++;
      }
      if (stage === 'Proposal' || stage === 'Negotiation') {
        negotiationAndProposalValue += val;
      }
      if (stage === 'Closed-Won') {
        convertedValue += val;
        wonCount++;
      }
      (c.afterSalesCases || []).forEach((cs) => {
        if (cs.status !== 'Resolved') {
          openSupportCasesCount++;
          if (cs.priority === 'High' || cs.priority === 'Urgent') {
            urgentSupportCasesCount++;
          }
        }
      });
    });

    return {
      totalPipelineValue,
      negotiationAndProposalValue,
      convertedValue,
      activeDealsCount,
      wonCount,
      openSupportCasesCount,
      urgentSupportCasesCount,
    };
  }, [businessContacts]);

  // Update arbitrary fields on a contact & keep selectedContact in sync
  const updateContactFields = (contactId: string, patch: Partial<CRMContact>, logMessage?: string) => {
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        const nextLogs = logMessage
          ? [
              {
                id: `act-${Date.now()}`,
                date: new Date().toISOString().slice(0, 10),
                type: 'note' as const,
                summary: logMessage,
              },
              ...(c.activityLog || []),
            ]
          : c.activityLog;

        return {
          ...c,
          ...patch,
          updatedAt: new Date().toISOString(),
          activityLog: nextLogs,
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated.find((c) => c.id === contactId) || null);
    }
  };

  // Handle Deal Stage update with Synced Account Status, Purchase Date & Mandatory Loss Reason
  const handleUpdateDealStage = (
    contactId: string,
    newStage: DealStage,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const target = contacts.find((c) => c.id === contactId);
    if (!target) return;

    const newStatus = mapDealStageToCRMStatus(newStage);
    const today = new Date().toISOString().slice(0, 10);

    // Sync Account Status & Purchase Date when Closed-Won
    let nextAccountStatus: AccountLifecycleStatus =
      target.accountStatus || 'Prospect';
    let nextPurchaseDate = target.purchaseDate;

    if (newStage === 'Closed-Won') {
      nextAccountStatus = 'Active Customer';
      if (!nextPurchaseDate) nextPurchaseDate = today;
    } else if (newStage === 'Negotiation' || newStage === 'Proposal') {
      if (nextAccountStatus === 'Prospect') nextAccountStatus = 'Evaluating';
    }

    // If Closed-Lost and no lossReason yet, open the contact detail drawer on Sales tab and prompt for Loss Reason
    if (newStage === 'Closed-Lost' && !target.lossReason) {
      setLossReasonPromptContactId(contactId);
      setActiveDrawerTab('sales');
    } else {
      setLossReasonPromptContactId(null);
    }

    const defaultLossReason =
      newStage === 'Closed-Lost'
        ? target.lossReason || LOSS_REASON_OPTIONS[0]
        : undefined;

    updateContactFields(
      contactId,
      {
        dealStage: newStage,
        status: newStatus,
        accountStatus: nextAccountStatus,
        purchaseDate: nextPurchaseDate,
        lossReason: defaultLossReason,
        expectedCloseDate:
          newStage === 'Closed-Won' && !target.expectedCloseDate
            ? today
            : target.expectedCloseDate,
      },
      `Deal Stage updated to "${newStage}"${
        newStage === 'Closed-Won'
          ? ` (Account synced to Active Customer · Purchase Date ${nextPurchaseDate})`
          : newStage === 'Closed-Lost'
          ? ` (Loss Reason: ${defaultLossReason})`
          : ''
      }`
    );
  };

  // Promote / Import a Rubrica Contact into Business CRM preserving 100% of shared YouConnect data
  const handleImportRubricaContactToCRM = (rubricaContact: CRMContact) => {
    const today = new Date().toISOString().slice(0, 10);
    const updated = contacts.map((c) => {
      if (c.id === rubricaContact.id) {
        return {
          ...c,
          isBusinessCRM: true,
          category: 'business' as const,
          dealName:
            c.dealName ||
            `${c.company || c.name} — Enterprise YouConnect Opportunity`,
          dealStage: c.dealStage || 'Qualification',
          status: c.status === 'new' ? 'qualified' : c.status,
          dealValue: c.dealValue || 45000,
          dealCurrency: c.dealCurrency || '$',
          expectedCloseDate:
            c.expectedCloseDate ||
            new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          dealOwner: c.dealOwner || 'Elena Rostova',
          accountStatus: c.accountStatus || 'Evaluating',
          productLinked:
            c.productLinked || 'CognitionOS Enterprise Runtime (50 Licenses)',
          tags: Array.from(
            new Set([...(c.tags || []), 'Imported from Rubrica', 'YouConnect Card Synced'])
          ),
          updatedAt: new Date().toISOString(),
          activityLog: [
            {
              id: `act-sync-${Date.now()}`,
              date: today,
              type: 'note' as const,
              summary: `Imported full shared YouConnect digital card & social profiles from Rubrica (${
                c.selectiveSyncInfo?.sharedFieldsList?.length || 8
              } shared fields preserved).`,
            },
            ...(c.activityLog || []),
          ],
        };
      }
      return c;
    });

    onUpdateContacts(updated);
    const newlySynced = updated.find((c) => c.id === rubricaContact.id) || null;
    setSelectedContact(newlySynced);
    setCardReaderContact(null);
    setIsRubricaReaderModalOpen(false);
  };

  // Demote to General Rubrica (Remove from Business CRM pipeline)
  const handleDemoteToRubrica = (contactId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = contacts.map((c) => {
      if (c.id === contactId) {
        return {
          ...c,
          isBusinessCRM: false,
          category: 'other' as const,
          tags: (c.tags || []).filter((t) => t !== 'Promoted to CRM'),
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    onUpdateContacts(updated);
    if (selectedContact?.id === contactId) {
      setSelectedContact(null);
    }
  };

  // Create new After-Sales Service Case
  const handleCreateAfterSalesCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;

    const createdCase: AfterSalesCase = {
      caseId: newCaseForm.caseId || generateUniqueCaseId(),
      caseCategory: newCaseForm.caseCategory,
      status: newCaseForm.status,
      priority: newCaseForm.priority,
      productLinked:
        newCaseForm.productLinked.trim() ||
        selectedContact.productLinked ||
        'CognitionOS Enterprise License',
      subject: newCaseForm.subject.trim() || `${newCaseForm.caseCategory} Request`,
      resolutionNotes: newCaseForm.resolutionNotes.trim() || 'Initial triage logged.',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const existingCases = selectedContact.afterSalesCases || [];
    // Sync Account Status if Urgent/High priority ticket is opened
    const shouldFlagAtRisk =
      (createdCase.priority === 'Urgent' || createdCase.priority === 'High') &&
      createdCase.status !== 'Resolved';

    const nextAccountStatus: AccountLifecycleStatus = shouldFlagAtRisk
      ? 'At Risk / Support Hold'
      : selectedContact.accountStatus === 'Prospect'
      ? 'Active Customer'
      : selectedContact.accountStatus || 'Active Customer';

    updateContactFields(
      selectedContact.id,
      {
        afterSalesCases: [createdCase, ...existingCases],
        accountStatus: nextAccountStatus,
        ticketId: createdCase.caseId,
        caseReason: createdCase.caseCategory,
        caseStatus: createdCase.status,
        casePriority: createdCase.priority,
        productLinked: createdCase.productLinked,
        resolutionNotes: createdCase.resolutionNotes,
      },
      `Opened After-Sales Case ${createdCase.caseId} [${createdCase.caseCategory} · ${createdCase.priority}]`
    );

    setIsAddingCase(false);
    setNewCaseForm({
      caseId: generateUniqueCaseId(),
      caseCategory: 'Technical Support',
      status: 'New',
      priority: 'Medium',
      productLinked: selectedContact.productLinked || '',
      subject: '',
      resolutionNotes: '',
    });
  };

  // Update an existing After-Sales Case (Status, Priority, Resolution Notes)
  const handleUpdateAfterSalesCase = (
    caseId: string,
    patch: Partial<AfterSalesCase>
  ) => {
    if (!selectedContact) return;
    const updatedCases = (selectedContact.afterSalesCases || []).map((cs) =>
      cs.caseId === caseId
        ? { ...cs, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
        : cs
    );

    const primaryCase = updatedCases.find((cs) => cs.caseId === caseId) || updatedCases[0];

    // Sync Account Status back to Active Customer if all High/Urgent tickets are resolved
    const hasOpenCritical = updatedCases.some(
      (cs) =>
        cs.status !== 'Resolved' &&
        (cs.priority === 'High' || cs.priority === 'Urgent')
    );

    let nextAccountStatus = selectedContact.accountStatus || 'Active Customer';
    if (!hasOpenCritical && nextAccountStatus === 'At Risk / Support Hold') {
      nextAccountStatus = 'Active Customer';
    } else if (hasOpenCritical) {
      nextAccountStatus = 'At Risk / Support Hold';
    }

    updateContactFields(
      selectedContact.id,
      {
        afterSalesCases: updatedCases,
        accountStatus: nextAccountStatus,
        ...(primaryCase
          ? {
              ticketId: primaryCase.caseId,
              caseReason: primaryCase.caseCategory,
              caseStatus: primaryCase.status,
              casePriority: primaryCase.priority,
              productLinked: primaryCase.productLinked,
              resolutionNotes: primaryCase.resolutionNotes,
            }
          : {}),
      },
      patch.status === 'Resolved'
        ? `Resolved After-Sales Case ${caseId}`
        : undefined
    );
  };

  // Log new activity note/meeting/call
  const handleAddActivityLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !activityForm.summary.trim()) return;

    const newLog: ContactActivityLog = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: activityForm.type,
      summary: activityForm.summary.trim(),
    };

    updateContactFields(selectedContact.id, {
      activityLog: [newLog, ...(selectedContact.activityLog || [])],
    });
    setActivityForm({ type: 'call', summary: '' });
    setIsLoggingActivity(false);
  };

  // Handle AI Contact Enrichment & Social Profile Scanner
  const handleEnrichContact = async (contact: CRMContact, customContext?: string) => {
    if (onConsumeAiCoin) {
      const allowed = onConsumeAiCoin(
        'crm_intelligence',
        `CRM Lead & Social Intelligence (${contact.name})`
      );
      if (!allowed) {
        onOpenSubscriptionModal?.();
        return;
      }
    }

    setEnrichingId(contact.id);
    const discussionTopic =
      customContext?.trim() ||
      projectDiscussionInput.trim() ||
      contact.dealName ||
      contact.productLinked ||
      `${contact.company} Enterprise Partnership`;

    try {
      const res = await fetch('/api/ai/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          projectDiscussionContext: discussionTopic,
        }),
      });

      const data = res.ok ? await res.json() : null;

      if (data) {
        const combinedTags = Array.from(
          new Set([...(contact.tags || []), ...(data.suggestedTags || [])])
        );
        updateContactFields(
          contact.id,
          {
            tags: combinedTags,
            aiEnrichment: {
              summary: data.summary,
              industry: data.industry,
              suggestedIcebreaker: data.suggestedIcebreaker,
              draftedMessageContent: data.draftedMessageContent,
              projectDiscussionContext:
                data.projectDiscussionContext || discussionTopic,
              socialInsights: data.socialInsights || [],
              enrichmentTimestamp: new Date().toISOString(),
            },
          },
          `Scanned connected social profiles & generated contextual outreach for "${discussionTopic}".`
        );
      }
    } catch (err) {
      console.warn('Social enrichment error:', err);
    } finally {
      setEnrichingId(null);
    }
  };

  // Add new business deal submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.company.trim()) return;
    if (newForm.dealStage === 'Closed-Lost' && !newForm.lossReason) {
      return;
    }

    const status = mapDealStageToCRMStatus(newForm.dealStage);
    const today = new Date().toISOString().slice(0, 10);

    const newContact: CRMContact = {
      id: `c-biz-${Date.now()}`,
      name: newForm.name.trim(),
      role: newForm.role.trim() || 'Executive Decision Maker',
      company: newForm.company.trim(),
      email: newForm.email.trim(),
      phone: newForm.phone.trim(),
      dealName:
        newForm.dealName.trim() ||
        `${newForm.company.trim()} — Enterprise License Opportunity`,
      dealStage: newForm.dealStage,
      dealValue: Number(newForm.dealValue) || 0,
      dealCurrency: newForm.dealCurrency || '$',
      closeDate: newForm.expectedCloseDate || today,
      expectedCloseDate: newForm.expectedCloseDate || today,
      dealOwner: newForm.dealOwner.trim() || 'Elena Rostova',
      lossReason:
        newForm.dealStage === 'Closed-Lost'
          ? newForm.lossReason || LOSS_REASON_OPTIONS[0]
          : undefined,
      accountStatus:
        newForm.dealStage === 'Closed-Won'
          ? 'Active Customer'
          : newForm.accountStatus,
      purchaseDate:
        newForm.dealStage === 'Closed-Won'
          ? newForm.purchaseDate || today
          : newForm.purchaseDate || undefined,
      productLinked:
        newForm.productLinked.trim() ||
        'CognitionOS Enterprise Runtime (50 Licenses)',
      nextFollowUpDate: newForm.nextFollowUpDate || undefined,
      notes: newForm.notes.trim(),
      source: newForm.source,
      status,
      isBusinessCRM: true,
      category: 'business',
      socials: {
        linkedin: newForm.linkedin.trim() || undefined,
        twitter: newForm.twitter.trim() || undefined,
        github: newForm.github.trim() || undefined,
      },
      tags: newForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    };

    onAddContact(newContact);
    setSelectedContact(newContact);
    setIsAddModalOpen(false);
  };

  // Delete contact
  const handleDeleteContact = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateContacts(contacts.filter((c) => c.id !== id));
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  // Scan Incoming NFC YouConnect Business Lead with 100% Shared Data & Socials
  const handleScanNfcBusinessLead = () => {
    const newLead: CRMContact = {
      id: `c-nfc-crm-${Date.now()}`,
      name: 'Alexander Sterling',
      firstName: 'Alexander',
      lastName: 'Sterling',
      role: 'Managing Partner',
      department: 'Enterprise AI & FinTech Practice',
      company: 'Apex Sovereign Ventures',
      email: 'a.sterling@apexsovereign.vc',
      personalEmail: 'alex.sterling.sf@icloud.com',
      phone: '+1 (415) 890-4410',
      personalPhone: '+1 (415) 902-3318',
      website: 'https://apexsovereign.vc',
      location: 'San Francisco, CA',
      officeAddress: '101 California St, Suite 4100, San Francisco, CA 94111',
      taxIdOrVat: 'US-EIN-94-6629104',
      headline: 'Backing Sovereign AI & Autonomous FinTech Infrastructure across North America & EU',
      bio: 'Managing Partner at Apex Sovereign Ventures ($600M AUM). Former head of institutional algorithmic infrastructure.',
      notes: 'Captured via NFC Executive Card Tap at FinTech Summit. Discussed deploying 60 Enterprise Seats for Apex portfolio analysts.',
      source: 'nfc',
      status: 'qualified',
      isBusinessCRM: true,
      category: 'business',
      dealName: 'Apex Sovereign Ventures — 60 Analyst Seats & Deal Intelligence Node',
      dealStage: 'Proposal',
      dealValue: 85000,
      dealCurrency: '$',
      expectedCloseDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      dealOwner: 'Elena Rostova',
      accountStatus: 'Evaluating',
      productLinked: 'CognitionOS Enterprise Runtime (60 Licenses)',
      nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      tags: ['NFC Lead', 'YouConnect Synced', 'Series B Investor', 'High Priority'],
      socials: {
        linkedin: 'https://linkedin.com/in/alexander-sterling-apex',
        twitter: 'https://x.com/asterling_vc',
        substack: 'https://apexsovereign.substack.com',
        calendly: 'https://calendly.com/a-sterling-apex/30min',
      },
      rubricaFields: [
        { id: 'rf-as-1', label: 'Fund Mandate', value: '$600M AUM · Series A/B AI & FinTech', category: 'work' },
        { id: 'rf-as-2', label: 'Executive Assistant', value: 'Clara Chen · cchen@apexsovereign.vc', category: 'work' },
      ],
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle: 'Executive & Partner NFC Card',
        sharedFieldsList: [
          'Full Name',
          'Managing Partner Role',
          'Work & Personal Emails',
          'Work & Mobile Phones',
          '101 California St Office & EIN',
          'LinkedIn, X, Substack, Calendly',
          'Fund Mandate & EA Contact',
        ],
        version: 1,
      },
      sharedCard: {
        cardName: 'Apex Sovereign · Partner Card',
        category: 'business',
        tag: 'Investor',
        theme: 'forged_carbon',
        materialFinish: 'satin_gold',
        accentColor: '#D4AF37',
        layoutStyle: 'editorial_masthead',
        customTagline: 'Managing Partner · 101 California St, SF',
        vanitySlug: 'alexander-sterling',
        coverBannerUrl: COVER_BANNER_PRESETS[5].url,
        livePresenceStatus: 'FinTech Summit · VIP Partner Lounge',
      },
      aiEnrichment: {
        summary: 'Managing Partner at Apex Sovereign Ventures focusing on Series B AI & Enterprise Infrastructure. Active publisher on Apex Sovereign Substack and X.',
        industry: 'Venture Capital & FinTech AI',
        suggestedIcebreaker: 'Hi Alexander, great connecting via NFC at the FinTech Summit — loved your recent X thread on automated portfolio due-diligence agents!',
        draftedMessageContent:
          'Hi Alexander,\n\nGreat tapping YouConnect NFC cards at the FinTech Summit! I just read your recent @asterling_vc post and your Apex Sovereign Substack breakdown on autonomous due-diligence pipelines.\n\nFollowing up on our discussion around the "Apex Sovereign Ventures — 60 Analyst Seats & Deal Intelligence Node" rollout, I configured a dedicated sandbox with SOC2 compliance guardrails for your investment team.\n\nWould Thursday morning work for a 15-minute technical walkthrough?\n\nBest,\nElena Rostova',
        projectDiscussionContext: 'Apex Sovereign Ventures — 60 Analyst Seats & Deal Intelligence Node',
        socialInsights: [
          {
            platform: 'X / Twitter',
            handleOrUrl: '@asterling_vc',
            recentSignal: 'Posted thread on how VC research teams spend 65% of time on manual data-room parsing',
            salesRelevance: 'Directly pitch our automated Deal Intelligence Node for his 60 investment analysts.',
          },
          {
            platform: 'Substack',
            handleOrUrl: 'apexsovereign.substack.com',
            recentSignal: 'Published Q4 Institutional FinTech AI Infrastructure Thesis',
            salesRelevance: 'Align proposal ROI metrics with his published institutional compliance benchmarks.',
          },
        ],
        enrichmentTimestamp: new Date().toISOString(),
      },
      activityLog: [
        {
          id: `act-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: 'meeting',
          summary: 'Scanned YouConnect NFC Executive Card at FinTech Summit; imported 100% of shared fields & social profiles.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    };
    onAddContact(newLead);
    setSelectedContact(newLead);
  };

  // Send Contextual Icebreaker / Drafted Message & Auto-Log CRM Activity
  const handleSendContextualMessage = (contact: CRMContact, useFullDraft = true) => {
    const messageBody = useFullDraft
      ? contact.aiEnrichment?.draftedMessageContent ||
        contact.aiEnrichment?.suggestedIcebreaker ||
        `Hi ${contact.name.split(' ')[0]}, great connecting! Following up regarding "${contact.dealName || contact.company}".`
      : contact.aiEnrichment?.suggestedIcebreaker ||
        `Hi ${contact.name.split(' ')[0]}, great connecting! Following up regarding "${contact.dealName || contact.company}".`;

    const currentStage = getEffectiveDealStage(contact);
    const nextStage: DealStage =
      currentStage === 'Qualification' ? 'Proposal' : currentStage;

    updateContactFields(
      contact.id,
      {
        dealStage: nextStage,
        status: mapDealStageToCRMStatus(nextStage),
      },
      `Sent social-enriched outreach for "${contact.dealName || contact.company}": "${messageBody.slice(0, 120)}..."`
    );

    if (contact.email) {
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
        contact.dealName || `Following up — ${contact.company || 'Executive Connection'}`
      )}&body=${encodeURIComponent(messageBody)}`;
    }
  };

  const getStageBadgeStyle = (stage: DealStage) => {
    switch (stage) {
      case 'Qualification':
        return 'bg-slate-900 text-slate-300 border-slate-700';
      case 'Proposal':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60';
      case 'Negotiation':
        return 'bg-amber-950/60 text-amber-300 border-amber-700/60';
      case 'Closed-Won':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60';
      case 'Closed-Lost':
        return 'bg-rose-950/60 text-rose-300 border-rose-700/60';
    }
  };

  const getAccountStatusBadge = (status?: AccountLifecycleStatus) => {
    switch (status) {
      case 'Active Customer':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Onboarding':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'At Risk / Support Hold':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'Evaluating':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Prospect':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const quotaSummary = subscription ? getQuotaSummary(subscription) : null;

  // Enforce Business Tier requirement for Business CRM access (Free & Basic have no CRM access)
  if (subscription && subscription.tier !== 'business') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-950 p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>Business Tier Feature · Currently on {subscription.tier.toUpperCase()} Tier</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Unlock Business CRM, Sales Pipeline & Full AI CRM Intelligence
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                The <span className="font-semibold text-white">Free</span> and{' '}
                <span className="font-semibold text-white">Basic</span> subscription tiers do not include access to the Business CRM & After-Sales Hub. Upgrade to the{' '}
                <span className="font-semibold text-amber-300">Business Tier ($29/mo)</span> to unlock:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <Briefcase className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Sales & After-Sales CRM Pipeline</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Manage Deal Stages, Revenue Value, Mandatory Loss Reasons, and Service Ticket Cases.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Full AI Power for CRM & Reasoning</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Unlimited AI social profile scanning, lead intelligence & contextual outreach up to Google service limits.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <CreditCard className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Rubrica Card Reader & Sync</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Read 100% of shared YouConnect contact cards from your Rubrica directly inside the CRM.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <Coins className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">10 AI Image Generations / Day</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      10 daily AI image coins included + optional 50-Coin AI Booster Pack support.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                {onUpgradeToBusiness && (
                  <button
                    onClick={onUpgradeToBusiness}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-5 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Activate Business Tier ($29/mo)</span>
                  </button>
                )}
                {onOpenSubscriptionModal && (
                  <button
                    onClick={onOpenSubscriptionModal}
                    className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/70 px-4 py-3 text-xs font-semibold text-indigo-200 transition"
                  >
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span>Compare Plans & AI Quota Coins</span>
                  </button>
                )}
                {onNavigateToRubrica && (
                  <button
                    onClick={onNavigateToRubrica}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-medium text-slate-300 transition"
                  >
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>Open Personal Rubrica</span>
                  </button>
                )}
              </div>
            </div>

            <div className="w-full lg:w-72 rounded-2xl border border-amber-500/30 bg-slate-950/90 p-5 space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                  Business Plan Spec
                </span>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  $29 / month
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Full Business CRM & After-Sales</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited AI CRM & Text Reasoning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>10 AI Image Generations / Day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Unlimited Digital Cards & Radar</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>+50 AI Booster Pack Compatible</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
              Business CRM & After-Sales Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {businessContacts.length} Active Accounts & Deals in your pipeline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Read / Sync Contact Cards from Contacts */}
          <button
            type="button"
            onClick={() => setIsRubricaReaderModalOpen(true)}
            className="h-9 px-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 text-xs font-semibold text-indigo-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-indigo-900/70 hover:text-white"
            title="Read digital cards of any contact and import their full shared YouConnect data into CRM"
          >
            <CreditCard className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span>Read Contact Cards ({contacts.length})</span>
          </button>

          {/* Scan Incoming NFC Business Lead */}
          <button
            type="button"
            onClick={handleScanNfcBusinessLead}
            className="h-9 px-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 text-xs font-semibold text-cyan-300 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-cyan-900/60 hover:text-white"
            title="Scan an incoming YouConnect NFC card with full shared data & socials into CRM"
          >
            <ScanLine className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span>Scan NFC Lead</span>
          </button>

          {onNavigateToRubrica && (
            <button
              type="button"
              onClick={onNavigateToRubrica}
              className="h-9 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Contacts</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => exportContactsToCSV(businessContacts)}
            className="h-9 px-3.5 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-slate-800 hover:text-white transition"
            title="Download Business Pipeline CSV"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Export CSV</span>
          </button>

          {/* Add Business Lead / Deal */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 hover:bg-indigo-500 transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            <span>Add Deal / Account</span>
          </button>
        </div>
      </div>

      {/* Pipeline & After-Sales KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Open Pipeline</span>
            <DollarSign className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono">
            ${pipelineMetrics.totalPipelineValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {pipelineMetrics.activeDealsCount} active opportunities
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Proposal & Negotiation</span>
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-300 font-mono">
            ${pipelineMetrics.negotiationAndProposalValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Late-stage revenue forecast
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Closed-Won Revenue</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 font-mono">
            ${pipelineMetrics.convertedValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {pipelineMetrics.wonCount} active customer contracts
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>After-Sales Support</span>
            <Wrench className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-white font-mono flex items-center gap-2">
            <span>{pipelineMetrics.openSupportCasesCount} Open</span>
            {pipelineMetrics.urgentSupportCasesCount > 0 && (
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                {pipelineMetrics.urgentSupportCasesCount} High/Urgent
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            Synced with Sales Account Status
          </div>
        </div>
      </div>

      {/* Duplicate Detection Alert Banner */}
      {duplicatePairs.length > 0 && (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <GitMerge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  Duplicate Business Records ({duplicatePairs.length} pair
                  {duplicatePairs.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  High similarity detected between{' '}
                  <span className="font-semibold text-white">
                    {duplicatePairs[0].contactA.name}
                  </span>{' '}
                  and{' '}
                  <span className="font-semibold text-white">
                    {duplicatePairs[0].contactB.name}
                  </span>{' '}
                  ({duplicatePairs[0].similarityScore}% confidence).
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveDuplicatePair(duplicatePairs[0])}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shrink-0 shadow-sm"
            >
              <span>Review & Merge</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar & Deal Stage Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by contact, company, deal name, owner, product..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Deal Stage & After-Sales Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {(
            [
              { id: 'all', label: 'All Deals' },
              { id: 'Qualification', label: 'Qualification' },
              { id: 'Proposal', label: 'Proposal' },
              { id: 'Negotiation', label: 'Negotiation' },
              { id: 'Closed-Won', label: 'Closed-Won' },
              { id: 'Closed-Lost', label: 'Closed-Lost' },
              { id: 'after_sales_open', label: 'Open Support Cases' },
            ] as const
          ).map((tab) => {
            const count =
              tab.id === 'all'
                ? businessContacts.length
                : tab.id === 'after_sales_open'
                ? businessContacts.filter((c) =>
                    (c.afterSalesCases || []).some((cs) => cs.status !== 'Resolved')
                  ).length
                : businessContacts.filter((c) => getEffectiveDealStage(c) === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStageFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  selectedStageFilter === tab.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main CRM Layout: Accounts/Deals Table + Comprehensive Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Accounts & Deals Table */}
        <div
          className={`${
            selectedContact ? 'lg:col-span-6' : 'lg:col-span-12'
          } rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold">
                  <th className="py-3 px-4">Account & Primary Contact</th>
                  <th className="py-3 px-4">Deal / Opportunity</th>
                  <th className="py-3 px-4">Deal Stage</th>
                  <th className="py-3 px-4 hidden xl:table-cell">Synced Status & Cases</th>
                  <th className="py-3 px-4 text-right">Card & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No matching deals or accounts. Click "Read Rubrica Cards" to import a YouConnect contact or add a new deal.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((c) => {
                    const isSelected = selectedContact?.id === c.id;
                    const stage = getEffectiveDealStage(c);
                    const openCases = (c.afterSalesCases || []).filter(
                      (cs) => cs.status !== 'Resolved'
                    );
                    const hasUrgentCase = openCases.some(
                      (cs) => cs.priority === 'High' || cs.priority === 'Urgent'
                    );

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className={`cursor-pointer transition hover:bg-slate-800/40 ${
                          isSelected ? 'bg-slate-800/80 text-white' : 'text-slate-300'
                        }`}
                      >
                        {/* Contact & Company */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                c.avatarUrl ||
                                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
                              }
                              alt={c.name}
                              className="h-9 w-9 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                                <span>{c.name}</span>
                                {c.selectiveSyncInfo?.isSynced && (
                                  <span title="Full YouConnect Shared Card Synced">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  </span>
                                )}
                                {c.aiEnrichment?.socialInsights && (
                                  <span title="Social Profiles Scanned by AI">
                                    <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {c.company} · {c.role || 'Executive'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {c.email} {c.phone ? `· ${c.phone}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Deal Name, Value, Close Date & Owner */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200 truncate max-w-[200px]">
                            {c.dealName || `${c.company} — Enterprise Deal`}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-emerald-400">
                              {c.dealCurrency || '$'}
                              {(c.dealValue || 0).toLocaleString()}
                            </span>
                            {c.expectedCloseDate && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                Close: {c.expectedCloseDate}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Owner: {c.dealOwner || 'Elena Rostova'}
                          </div>
                        </td>

                        {/* Deal Stage Selector */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={stage}
                            onChange={(e) =>
                              handleUpdateDealStage(c.id, e.target.value as DealStage)
                            }
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold focus:outline-none ${getStageBadgeStyle(
                              stage
                            )}`}
                          >
                            {DEAL_STAGES.map((st) => (
                              <option key={st} value={st} className="bg-slate-900 text-white">
                                {st}
                              </option>
                            ))}
                          </select>
                          {stage === 'Closed-Lost' && c.lossReason && (
                            <div className="text-[10px] text-rose-400 mt-1 truncate max-w-[140px]">
                              Reason: {c.lossReason}
                            </div>
                          )}
                        </td>

                        {/* Synced Account Status & After-Sales Cases */}
                        <td className="py-3 px-4 hidden xl:table-cell">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${getAccountStatusBadge(
                                c.accountStatus
                              )}`}
                            >
                              {c.accountStatus || 'Prospect'}
                            </span>
                            {openCases.length > 0 ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-mono ${
                                  hasUrgentCase ? 'text-rose-400 font-semibold' : 'text-cyan-400'
                                }`}
                              >
                                <Wrench className="h-3 w-3" />
                                <span>
                                  {openCases.length} open case{openCases.length > 1 ? 's' : ''}
                                </span>
                              </span>
                            ) : c.purchaseDate ? (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Won: {c.purchaseDate}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Actions: Read Digital Card, Demote, Delete */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCardReaderContact(c)}
                              className="flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-950/60 px-2 py-1 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                              title="Read this contact's interactive YouConnect Digital Card & full shared data"
                            >
                              <CreditCard className="h-3 w-3" />
                              <span className="hidden sm:inline">Read Card</span>
                            </button>

                            <button
                              onClick={(e) => handleDemoteToRubrica(c.id, e)}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                              title="Move back to General Rubrica"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteContact(c.id, e)}
                              className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Contact Comprehensive Detail Drawer (6 cols) */}
        {selectedContact && (
          <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl space-y-5">
            {/* Top Contact Identity + Read Digital Card Button */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedContact.avatarUrl ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={selectedContact.name}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-indigo-500/40"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white leading-tight">
                      {selectedContact.name}
                    </h2>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${getAccountStatusBadge(
                        selectedContact.accountStatus
                      )}`}
                    >
                      {selectedContact.accountStatus || 'Prospect'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedContact.role}{' '}
                    {selectedContact.company ? `@ ${selectedContact.company}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCardReaderContact(selectedContact)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Read Digital Card</span>
                </button>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-slate-500 hover:text-slate-300 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ⚖️ SYNCED SALES <-> AFTER-SALES BRIDGE BANNER */}
            {(() => {
              const openCases = (selectedContact.afterSalesCases || []).filter(
                (cs) => cs.status !== 'Resolved'
              );
              const criticalCase = openCases.find(
                (cs) => cs.priority === 'High' || cs.priority === 'Urgent'
              );
              return (
                <div
                  className={`rounded-xl border p-3.5 space-y-2.5 ${
                    criticalCase
                      ? 'border-rose-500/40 bg-rose-950/25'
                      : 'border-slate-800 bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Synced Sales & After-Sales Lifecycle</span>
                    </span>
                    {criticalCase && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        <AlertTriangle className="h-3 w-3" />
                        <span>
                          Active {criticalCase.priority} Ticket ({criticalCase.caseId}) — Do Not Pitch Blind
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Synced Account Status
                      </label>
                      <select
                        value={selectedContact.accountStatus || 'Prospect'}
                        onChange={(e) =>
                          updateContactFields(
                            selectedContact.id,
                            {
                              accountStatus: e.target.value as AccountLifecycleStatus,
                            },
                            `Account Status synced to "${e.target.value}"`
                          )
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        {ACCOUNT_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Purchase / Warranty Start Date
                      </label>
                      <input
                        type="date"
                        value={selectedContact.purchaseDate || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            purchaseDate: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Product / Asset Linked
                      </label>
                      <input
                        type="text"
                        value={selectedContact.productLinked || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            productLinked: e.target.value,
                          })
                        }
                        placeholder="e.g. 50 User Licenses"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Drawer Section Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('sales')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  activeDrawerTab === 'sales'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Sales & Core</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('after_sales')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  activeDrawerTab === 'after_sales'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>After-Sales ({(selectedContact.afterSalesCases || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('intelligence')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  activeDrawerTab === 'intelligence'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Social AI</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDrawerTab('shared_card')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                  activeDrawerTab === 'shared_card'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Shared Data</span>
              </button>
            </div>

            {/* ===================================================================== */}
            {/* TAB 1: CORE ACCOUNT & MINIMUM SALES CRM FIELDS                        */}
            {/* ===================================================================== */}
            {activeDrawerTab === 'sales' && (
              <div className="space-y-4">
                {/* 📑 Core Account & Contact Fields */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      Core Account & Contact Fields
                    </h3>
                    <span className="text-[10px] text-slate-500">
                      Shared across Sales & After-Sales
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Contact Name (First & Last) *
                      </label>
                      <input
                        type="text"
                        value={selectedContact.name}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, { name: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Company Name (Account Entity) *
                      </label>
                      <input
                        type="text"
                        value={selectedContact.company}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, { company: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Email Address (Primary & Receipts) *
                      </label>
                      <input
                        type="email"
                        value={selectedContact.email}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, { email: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Phone Number (Follow-Up & Urgent Support) *
                      </label>
                      <input
                        type="text"
                        value={selectedContact.phone}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, { phone: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 💰 Minimum Sales CRM Fields */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Sales Opportunity & Pipeline Fields
                    </h3>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {selectedContact.dealCurrency || '$'}
                      {(selectedContact.dealValue || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Deal / Opportunity Name *
                      </label>
                      <input
                        type="text"
                        value={selectedContact.dealName || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            dealName: e.target.value,
                          })
                        }
                        placeholder="e.g. Company X - 50 User Licenses"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Deal Stage *
                        </label>
                        <select
                          value={getEffectiveDealStage(selectedContact)}
                          onChange={(e) =>
                            handleUpdateDealStage(
                              selectedContact.id,
                              e.target.value as DealStage
                            )
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
                        >
                          {DEAL_STAGES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Deal Value & Currency *
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedContact.dealCurrency || '$'}
                            onChange={(e) =>
                              updateContactFields(selectedContact.id, {
                                dealCurrency: e.target.value,
                              })
                            }
                            className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white"
                          >
                            <option value="$">$</option>
                            <option value="€">€</option>
                            <option value="£">£</option>
                            <option value="CHF">CHF</option>
                          </select>
                          <input
                            type="number"
                            value={selectedContact.dealValue || 0}
                            onChange={(e) =>
                              updateContactFields(selectedContact.id, {
                                dealValue: Number(e.target.value),
                              })
                            }
                            className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Close Date (Target or Actual) *
                        </label>
                        <input
                          type="date"
                          value={
                            selectedContact.closeDate ||
                            selectedContact.expectedCloseDate ||
                            ''
                          }
                          onChange={(e) =>
                            updateContactFields(selectedContact.id, {
                              closeDate: e.target.value,
                              expectedCloseDate: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">
                          Deal Owner (Sales Representative) *
                        </label>
                        <input
                          type="text"
                          value={selectedContact.dealOwner || 'Elena Rostova'}
                          onChange={(e) =>
                            updateContactFields(selectedContact.id, {
                              dealOwner: e.target.value,
                            })
                          }
                          placeholder="e.g. Elena Rostova"
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Mandatory Loss Reason Dropdown when Deal Stage === 'Closed-Lost' */}
                    {getEffectiveDealStage(selectedContact) === 'Closed-Lost' && (
                      <div
                        className={`rounded-xl border p-3 ${
                          lossReasonPromptContactId === selectedContact.id
                            ? 'border-rose-500 bg-rose-950/40'
                            : 'border-rose-500/40 bg-rose-950/20'
                        }`}
                      >
                        <label className="block text-xs font-bold text-rose-300 mb-1">
                          Loss Reason (Mandatory for Closed-Lost Deals) *
                        </label>
                        <select
                          required
                          value={selectedContact.lossReason || LOSS_REASON_OPTIONS[0]}
                          onChange={(e) => {
                            setLossReasonPromptContactId(null);
                            updateContactFields(
                              selectedContact.id,
                              { lossReason: e.target.value },
                              `Updated Closed-Lost Reason: "${e.target.value}"`
                            );
                          }}
                          className="w-full rounded-lg border border-rose-500/50 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          {LOSS_REASON_OPTIONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: MINIMUM AFTER-SALES (SERVICE / SUCCESS) CRM FIELDS             */}
            {/* ===================================================================== */}
            {activeDrawerTab === 'after_sales' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      After-Sales Service, Onboarding & Support Cases
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-generated Ticket IDs linked to {selectedContact.company}'s purchased assets.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCaseForm({
                        caseId: generateUniqueCaseId(),
                        caseCategory: 'Technical Support',
                        status: 'New',
                        priority: 'Medium',
                        productLinked:
                          selectedContact.productLinked ||
                          'CognitionOS Enterprise Runtime',
                        subject: '',
                        resolutionNotes: '',
                      });
                      setIsAddingCase(!isAddingCase);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAddingCase ? 'Cancel' : 'New Ticket / Case'}</span>
                  </button>
                </div>

                {/* 🛠️ Primary Minimum After-Sales (Service/Success) CRM Fields on Contact Record */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                      Primary After-Sales (Service / Success) CRM Record
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = generateUniqueCaseId();
                        updateContactFields(selectedContact.id, {
                          ticketId: newId,
                          caseStatus: selectedContact.caseStatus || 'New',
                          casePriority: selectedContact.casePriority || 'Medium',
                          caseReason: selectedContact.caseReason || 'Technical Support',
                        });
                      }}
                      className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 underline"
                    >
                      Auto-Generate Ticket ID
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Ticket / Case ID *
                      </label>
                      <input
                        type="text"
                        value={
                          selectedContact.ticketId ||
                          selectedContact.afterSalesCases?.[0]?.caseId ||
                          ''
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            ticketId: e.target.value,
                          })
                        }
                        placeholder="e.g. CASE-2026-4810"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Case Reason / Category *
                      </label>
                      <select
                        value={
                          selectedContact.caseReason ||
                          selectedContact.afterSalesCases?.[0]?.caseCategory ||
                          'Technical Support'
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            caseReason: e.target.value as CaseReasonCategory,
                          })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {CASE_CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Status *
                      </label>
                      <select
                        value={
                          selectedContact.caseStatus ||
                          selectedContact.afterSalesCases?.[0]?.status ||
                          'New'
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            caseStatus: e.target.value as AfterSalesCaseStatus,
                          })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {CASE_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Priority *
                      </label>
                      <select
                        value={
                          selectedContact.casePriority ||
                          selectedContact.afterSalesCases?.[0]?.priority ||
                          'Medium'
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            casePriority: e.target.value as AfterSalesCasePriority,
                          })
                        }
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {CASE_PRIORITY_OPTIONS.map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Product / Asset Linked *
                      </label>
                      <input
                        type="text"
                        value={
                          selectedContact.productLinked ||
                          selectedContact.afterSalesCases?.[0]?.productLinked ||
                          ''
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            productLinked: e.target.value,
                          })
                        }
                        placeholder="e.g. CognitionOS Enterprise Runtime (150 User Licenses)"
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Resolution Notes *
                      </label>
                      <textarea
                        rows={2}
                        value={
                          selectedContact.resolutionNotes ||
                          selectedContact.afterSalesCases?.[0]?.resolutionNotes ||
                          ''
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            resolutionNotes: e.target.value,
                          })
                        }
                        placeholder="Summary of how the post-sale issue or onboarding milestone was resolved..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* New After-Sales Case Form */}
                {isAddingCase && (
                  <form
                    onSubmit={handleCreateAfterSalesCase}
                    className="rounded-xl border border-cyan-500/40 bg-slate-950/90 p-4 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-cyan-300">
                        Create Post-Sale Support / Onboarding Case
                      </span>
                      <span className="rounded bg-cyan-950 border border-cyan-700/50 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                        Auto ID: {newCaseForm.caseId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Case Reason / Category *
                        </label>
                        <select
                          value={newCaseForm.caseCategory}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              caseCategory: e.target.value as CaseReasonCategory,
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                        >
                          {CASE_CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Status *
                        </label>
                        <select
                          value={newCaseForm.status}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              status: e.target.value as AfterSalesCaseStatus,
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                        >
                          {CASE_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                          Priority *
                        </label>
                        <select
                          value={newCaseForm.priority}
                          onChange={(e) =>
                            setNewCaseForm({
                              ...newCaseForm,
                              priority: e.target.value as AfterSalesCasePriority,
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                        >
                          {CASE_PRIORITY_OPTIONS.map((pr) => (
                            <option key={pr} value={pr}>
                              {pr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Product / Asset Linked *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCaseForm.productLinked}
                        onChange={(e) =>
                          setNewCaseForm({
                            ...newCaseForm,
                            productLinked: e.target.value,
                          })
                        }
                        placeholder="Specific product or license tier purchased"
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                        Resolution Notes / Issue Summary *
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={newCaseForm.resolutionNotes}
                        onChange={(e) =>
                          setNewCaseForm({
                            ...newCaseForm,
                            resolutionNotes: e.target.value,
                          })
                        }
                        placeholder="Explain how the issue is being handled or was resolved..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 text-xs font-bold text-white"
                      >
                        Save After-Sales Case
                      </button>
                    </div>
                  </form>
                )}

                {/* Existing After-Sales Cases List */}
                <div className="space-y-3">
                  {(selectedContact.afterSalesCases || []).length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-400">
                      No post-sale support or onboarding cases logged for {selectedContact.company} yet.
                    </div>
                  ) : (
                    (selectedContact.afterSalesCases || []).map((cs) => (
                      <div
                        key={cs.caseId}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-slate-900 border border-slate-700 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300">
                              {cs.caseId}
                            </span>
                            <span className="font-semibold text-white">
                              {cs.caseCategory}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <select
                              value={cs.priority}
                              onChange={(e) =>
                                handleUpdateAfterSalesCase(cs.caseId, {
                                  priority: e.target.value as AfterSalesCasePriority,
                                })
                              }
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                                cs.priority === 'Urgent' || cs.priority === 'High'
                                  ? 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                                  : 'border-slate-700 bg-slate-900 text-slate-300'
                              }`}
                            >
                              {CASE_PRIORITY_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p} Priority
                                </option>
                              ))}
                            </select>

                            <select
                              value={cs.status}
                              onChange={(e) =>
                                handleUpdateAfterSalesCase(cs.caseId, {
                                  status: e.target.value as AfterSalesCaseStatus,
                                })
                              }
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                                cs.status === 'Resolved'
                                  ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                                  : 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300'
                              }`}
                            >
                              {CASE_STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500">Product / Asset Linked:</span>{' '}
                          <span className="text-slate-200 font-medium">{cs.productLinked}</span>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                            Resolution Notes
                          </label>
                          <textarea
                            rows={2}
                            value={cs.resolutionNotes}
                            onChange={(e) =>
                              handleUpdateAfterSalesCase(cs.caseId, {
                                resolutionNotes: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: SOCIAL PROFILE SCANNER, LEAD INTELLIGENCE & MESSAGE CONTENT    */}
            {/* ===================================================================== */}
            {activeDrawerTab === 'intelligence' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/25 p-4 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span>Social Profile Scanner & Contextual Message Generator</span>
                    </div>
                    <button
                      onClick={() =>
                        handleEnrichContact(selectedContact, projectDiscussionInput)
                      }
                      disabled={enrichingId === selectedContact.id}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-50 shadow-sm"
                    >
                      {enrichingId === selectedContact.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Scanning Socials...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Scan Socials & Identify Message Content</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Connected Social Profiles Being Scanned */}
                  <div className="rounded-lg bg-slate-950/80 border border-slate-800 p-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Customer Social Profiles Connected for AI Scan
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        value={selectedContact.socials?.linkedin || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            socials: {
                              ...(selectedContact.socials || {}),
                              linkedin: e.target.value,
                            },
                          })
                        }
                        placeholder="LinkedIn URL or handle"
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 font-mono"
                      />
                      <input
                        type="text"
                        value={selectedContact.socials?.twitter || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            socials: {
                              ...(selectedContact.socials || {}),
                              twitter: e.target.value,
                            },
                          })
                        }
                        placeholder="X / Twitter handle (@...)"
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 font-mono"
                      />
                      <input
                        type="text"
                        value={selectedContact.socials?.github || ''}
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            socials: {
                              ...(selectedContact.socials || {}),
                              github: e.target.value,
                            },
                          })
                        }
                        placeholder="GitHub username / repo"
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 font-mono"
                      />
                      <input
                        type="text"
                        value={
                          selectedContact.socials?.substack ||
                          selectedContact.socials?.instagram ||
                          ''
                        }
                        onChange={(e) =>
                          updateContactFields(selectedContact.id, {
                            socials: {
                              ...(selectedContact.socials || {}),
                              substack: e.target.value,
                            },
                          })
                        }
                        placeholder="Substack / Instagram / Medium"
                        className="rounded border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 font-mono"
                      />
                    </div>

                    <div className="pt-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
                        Active Project / Sales Discussion Context
                      </label>
                      <input
                        type="text"
                        value={
                          projectDiscussionInput ||
                          selectedContact.aiEnrichment?.projectDiscussionContext ||
                          selectedContact.dealName ||
                          ''
                        }
                        onChange={(e) => setProjectDiscussionInput(e.target.value)}
                        placeholder="e.g. 150 Enterprise Licenses, SOC2 Compliance & Q4 Rollout..."
                        className="w-full rounded-lg border border-indigo-500/30 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Scanned Social Insights & Message Output */}
                  {selectedContact.aiEnrichment ? (
                    <div className="space-y-3 text-xs">
                      <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-3">
                        <span className="text-[10px] text-indigo-400 uppercase font-bold block">
                          Executive & Industry Synthesis ({selectedContact.aiEnrichment.industry})
                        </span>
                        <p className="text-slate-300 mt-1 leading-relaxed">
                          {selectedContact.aiEnrichment.summary}
                        </p>
                      </div>

                      {/* Social Signals Detected */}
                      {selectedContact.aiEnrichment.socialInsights &&
                        selectedContact.aiEnrichment.socialInsights.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-cyan-400 uppercase font-bold block">
                              Recent Social Profile Signals Identified
                            </span>
                            {selectedContact.aiEnrichment.socialInsights.map((insight, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-slate-950/90 border border-cyan-500/30 p-3 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-cyan-300">
                                    {insight.platform}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {insight.handleOrUrl}
                                  </span>
                                </div>
                                <p className="text-slate-200 font-medium">
                                  Signal: {insight.recentSignal}
                                </p>
                                <p className="text-[11px] text-emerald-300">
                                  Sales Hook: {insight.salesRelevance}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                      {/* Contextual Icebreaker */}
                      {selectedContact.aiEnrichment.suggestedIcebreaker && (
                        <div className="rounded-lg bg-slate-950/80 border border-indigo-500/30 p-3 space-y-1.5">
                          <span className="text-[10px] text-indigo-300 uppercase font-bold block">
                            Contextual Icebreaker (1-Line Opener)
                          </span>
                          <p className="text-slate-200 italic">
                            "{selectedContact.aiEnrichment.suggestedIcebreaker}"
                          </p>
                        </div>
                      )}

                      {/* Full Identified Message Content */}
                      <div className="rounded-lg bg-slate-950/90 border border-emerald-500/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-400 uppercase font-bold">
                            Identified Sales Message Content (Social + Deal Context)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const textToCopy =
                                selectedContact.aiEnrichment?.draftedMessageContent ||
                                selectedContact.aiEnrichment?.suggestedIcebreaker ||
                                '';
                              navigator.clipboard.writeText(textToCopy);
                              setCopiedMessageId(selectedContact.id);
                              setTimeout(() => setCopiedMessageId(null), 2000);
                            }}
                            className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200"
                          >
                            {copiedMessageId === selectedContact.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Message</span>
                              </>
                            )}
                          </button>
                        </div>

                        <textarea
                          rows={5}
                          value={
                            selectedContact.aiEnrichment.draftedMessageContent ||
                            selectedContact.aiEnrichment.suggestedIcebreaker ||
                            ''
                          }
                          onChange={(e) =>
                            updateContactFields(selectedContact.id, {
                              aiEnrichment: {
                                ...selectedContact.aiEnrichment,
                                draftedMessageContent: e.target.value,
                              },
                            })
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 leading-relaxed focus:border-emerald-500 focus:outline-none"
                        />

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSendContextualMessage(selectedContact, true)}
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white transition shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Message via Email & Log Activity</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Click "Scan Socials & Identify Message Content" above to scan this customer's connected social profiles and generate a tailored sales message for the project under discussion.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 4: FULL SHARED YOUCONNECT CARD & RUBRICA DATA                     */}
            {/* ===================================================================== */}
            {activeDrawerTab === 'shared_card' && (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>
                        {selectedContact.selectiveSyncInfo?.senderCircle ||
                          selectedContact.sharedCard?.cardName ||
                          'Full YouConnect Shared Profile'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      All fields shared by this YouConnect user in Rubrica are synced into the CRM.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCardReaderContact(selectedContact)}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shrink-0"
                  >
                    Open Interactive 3D Card
                  </button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                  {selectedContact.headline && (
                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Shared Headline
                      </span>
                      <span className="text-slate-200 font-medium">
                        "{selectedContact.headline}"
                      </span>
                    </div>
                  )}
                  {selectedContact.bio && (
                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Shared Bio
                      </span>
                      <span className="text-slate-300">{selectedContact.bio}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500">Department:</span>{' '}
                      <span className="text-slate-200">
                        {selectedContact.department || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Personal Email:</span>{' '}
                      <span className="text-slate-200 font-mono">
                        {selectedContact.personalEmail || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Personal Mobile:</span>{' '}
                      <span className="text-slate-200 font-mono">
                        {selectedContact.personalPhone || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tax ID / VAT:</span>{' '}
                      <span className="text-slate-200 font-mono">
                        {selectedContact.taxIdOrVat || '—'}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Office Address:</span>{' '}
                      <span className="text-slate-200">
                        {selectedContact.officeAddress || selectedContact.location || '—'}
                      </span>
                    </div>
                    {selectedContact.homeAddress && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500">Home Address:</span>{' '}
                        <span className="text-slate-200">{selectedContact.homeAddress}</span>
                      </div>
                    )}
                  </div>

                  {selectedContact.rubricaFields &&
                    selectedContact.rubricaFields.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">
                          Shared Custom Rubrica Fields
                        </span>
                        {selectedContact.rubricaFields.map((rf) => (
                          <div key={rf.id} className="flex justify-between text-xs">
                            <span className="text-slate-400">{rf.label}:</span>
                            <span className="font-mono text-slate-200">{rf.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Activity History & Quick Logger */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Interaction & Activity Log</span>
                </h3>
                <button
                  onClick={() => setIsLoggingActivity(!isLoggingActivity)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  {isLoggingActivity ? 'Cancel' : '+ Log Activity'}
                </button>
              </div>

              {isLoggingActivity && (
                <form
                  onSubmit={handleAddActivityLog}
                  className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-2"
                >
                  <div className="flex gap-2">
                    <select
                      value={activityForm.type}
                      onChange={(e) =>
                        setActivityForm((prev) => ({
                          ...prev,
                          type: e.target.value as any,
                        }))
                      }
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                    >
                      <option value="call">Phone Call</option>
                      <option value="meeting">Meeting / Demo</option>
                      <option value="email">Email</option>
                      <option value="note">Internal Note</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Summary of discussion or next action..."
                      value={activityForm.summary}
                      onChange={(e) =>
                        setActivityForm((prev) => ({ ...prev, summary: e.target.value }))
                      }
                      className="flex-1 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Save Log
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedContact.activityLog && selectedContact.activityLog.length > 0 ? (
                  selectedContact.activityLog.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg bg-slate-950/50 border border-slate-800/80 p-2.5 text-xs text-slate-300"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="font-semibold uppercase text-indigo-400">
                          {log.type}
                        </span>
                        <span className="font-mono">{log.date}</span>
                      </div>
                      <p className="text-slate-300 text-xs">{log.summary}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No activity logged yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RUBRICA DIGITAL CARD READER & CRM IMPORTER MODAL                          */}
      {/* ========================================================================= */}
      {isRubricaReaderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsRubricaReaderModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Rubrica Contact Cards & YouConnect Data Sync
                </h3>
                <p className="text-xs text-slate-400">
                  Read the digital card of any contact in your Rubrica and import 100% of their shared YouConnect fields & social profiles into the Business CRM.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70 border border-slate-800 rounded-xl bg-slate-950/60">
              {contacts.map((c) => {
                const socialCount = Object.values(c.socials || {}).filter(Boolean).length;
                return (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="h-11 w-11 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{c.name}</span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                            {c.category || 'personal'}
                          </span>
                          {c.selectiveSyncInfo?.isSynced && (
                            <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                              {c.selectiveSyncInfo.sharedFieldsList.length} Shared Fields · {socialCount} Socials
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          {c.role} {c.company ? `@ ${c.company}` : ''} · {c.email || c.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCardReaderContact(c)}
                        className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/70 hover:bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:text-white transition"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Read Digital Card</span>
                      </button>

                      {!c.isBusinessCRM ? (
                        <button
                          type="button"
                          onClick={() => handleImportRubricaContactToCRM(c)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Import Full Data to CRM</span>
                        </button>
                      ) : (
                        <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                          ✓ Synced in CRM
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD BUSINESS DEAL / ACCOUNT MODAL                                         */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Add Business Account & Sales Opportunity
                </h3>
                <p className="text-xs text-slate-400">
                  Includes Core Account Fields, Minimum Sales CRM Fields, and Synced Lifecycle Status.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Core Account & Contact Fields */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  Core Account & Contact Fields
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Contact Name (First & Last) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.name}
                      onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      placeholder="e.g. David Vance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Company Name (Account) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.company}
                      onChange={(e) => setNewForm({ ...newForm, company: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      placeholder="e.g. Acme Ventures"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newForm.email}
                      onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      placeholder="david@acme.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.phone}
                      onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      placeholder="+1 (415) 555-0100"
                    />
                  </div>
                </div>
              </div>

              {/* Minimum Sales CRM Fields */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Minimum Sales CRM Fields
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Deal / Opportunity Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.dealName}
                      onChange={(e) => setNewForm({ ...newForm, dealName: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      placeholder="e.g. Acme Ventures - 50 User Licenses"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Deal Stage *
                    </label>
                    <select
                      value={newForm.dealStage}
                      onChange={(e) =>
                        setNewForm({ ...newForm, dealStage: e.target.value as DealStage })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    >
                      {DEAL_STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Deal Value *
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={newForm.dealCurrency}
                        onChange={(e) =>
                          setNewForm({ ...newForm, dealCurrency: e.target.value })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-white"
                      >
                        <option value="$">$</option>
                        <option value="€">€</option>
                        <option value="£">£</option>
                        <option value="CHF">CHF</option>
                      </select>
                      <input
                        type="number"
                        value={newForm.dealValue}
                        onChange={(e) =>
                          setNewForm({ ...newForm, dealValue: Number(e.target.value) })
                        }
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Close Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newForm.expectedCloseDate}
                      onChange={(e) =>
                        setNewForm({ ...newForm, expectedCloseDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Deal Owner *
                    </label>
                    <input
                      type="text"
                      required
                      value={newForm.dealOwner}
                      onChange={(e) => setNewForm({ ...newForm, dealOwner: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    />
                  </div>

                  {newForm.dealStage === 'Closed-Lost' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-rose-400 mb-1">
                        Loss Reason (Mandatory when Closed-Lost) *
                      </label>
                      <select
                        required
                        value={newForm.lossReason}
                        onChange={(e) =>
                          setNewForm({ ...newForm, lossReason: e.target.value })
                        }
                        className="w-full rounded-lg border border-rose-500/50 bg-slate-800 px-3 py-2 text-xs text-white"
                      >
                        <option value="">Select Loss Reason...</option>
                        {LOSS_REASON_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Profiles for AI Scan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    LinkedIn Profile (for Social AI Scan)
                  </label>
                  <input
                    type="text"
                    value={newForm.linkedin}
                    onChange={(e) => setNewForm({ ...newForm, linkedin: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    X / Twitter Handle (for Social AI Scan)
                  </label>
                  <input
                    type="text"
                    value={newForm.twitter}
                    onChange={(e) => setNewForm({ ...newForm, twitter: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white"
                    placeholder="@handle"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500"
                >
                  Save Account & Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Digital Card Reader Modal for any Contact */}
      <ContactCardReaderModal
        contact={cardReaderContact}
        onClose={() => setCardReaderContact(null)}
        onSyncOrPromoteToCRM={handleImportRubricaContactToCRM}
      />

      {/* Duplicate Merge Modal */}
      <DuplicateMergeModal
        pair={activeDuplicatePair}
        onClose={() => setActiveDuplicatePair(null)}
        onDismiss={() => setActiveDuplicatePair(null)}
        onConfirmMerge={(merged, deletedId) => {
          const updated = contacts
            .map((c) => (c.id === merged.id ? merged : c))
            .filter((c) => c.id !== deletedId);
          onUpdateContacts(updated);
          setActiveDuplicatePair(null);
        }}
      />
    </div>
  );
};
