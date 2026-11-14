export type CardTheme =
  | 'executive'          // Obsidian Titanium & Satin Gold
  | 'forged_carbon'      // Architectural Forged Carbon & 24k Gold Leaf
  | 'brushed_titanium'   // Raw Aerospace Brushed Titanium & Ice Silver
  | 'gold_bullion'       // Anodized Obsidian & Champagne Gold Leaf
  | 'scuderia_corsa'     // Crimson Carbon: Racing Red & Exposed Carbon with Solar Gold
  | 'milano_saffiano'    // Cross-Grain Noir: Cross-Hatch Black Leather & Platinum Silver
  | 'firenze_heritage'   // Forest & Ruby: Deep Emerald Green, Crimson & Antique Gold
  | 'tailored_boss'      // Anthracite Camel: Sartorial Charcoal Wool, Warm Camel & Crisp Ivory
  | 'paris_sellier'      // Saddle Amber: Burnt Orange Leather & Warm Cream Stitch
  | 'frosted_glass'      // Frosted Arctic Glassmorphism (Liquid translucent)
  | 'swiss_editorial'    // Archival Ivory & Modernist Serif
  | 'bento_dark'         // Midnight Indigo Neo-Tech Dark Mode
  | 'royal_navy'         // Royal Midnight Navy & Champagne Brass
  | 'emerald_luxury'     // Malachite Emerald & Rose Gold
  | 'cyber'              // Cyber Holographic Chrome & Electric Cyan
  | 'minimal'            // Monolith Monochrome Slate & Stark Lines
  | 'creative'           // Velvet Amethyst & Rose Gold
  | 'aurora_glass'       // Aurora Glassmorphism
  | 'obsidian_gold';     // Obsidian Gold

export type CardMaterial =
  | 'none'
  | 'matte'
  | 'brushed_metal'
  | 'forged_carbon'
  | 'anodized_titanium'
  | 'gold_leaf'
  | 'saffiano_leather'
  | 'equestrian_stripe'
  | 'tailored_pinstripe'
  | 'frosted_glass'
  | 'tactile_paper'
  | 'holographic';

export type CardLayoutMode = 'card_3d' | 'story_deck' | 'wallet_pass';
export type CardFontPairing =
  | 'modern_sans'
  | 'editorial_serif'
  | 'architectural_grotesk'
  | 'couture_display'
  | 'technical_mono'
  | 'avant_syne'
  | 'classic_bodoni'
  | 'humanist_outfit'
  | 'roman_cinzel'
  | 'cyber_sora';
export type CardContentLayout =
  | 'executive_left'
  | 'centered_monolith'
  | 'split_columns'
  | 'structured_ledger'
  | 'asymmetric_hero'
  | 'minimal_horizon'
  | 'magazine_masthead'
  | 'swiss_grid';


export type ContactSource = 'nfc' | 'qr' | 'p2p' | 'manual' | 'import';

export type CRMStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export interface SocialLinks {
  // Professional & Creator
  linkedin?: string;
  twitter?: string;
  github?: string;
  calendly?: string;
  youtube?: string;
  threads?: string;
  substack?: string;
  medium?: string;
  behance?: string;
  dribbble?: string;
  discord?: string;
  reddit?: string;
  pinterest?: string;
  twitch?: string;
  spotify?: string;
  // Personal & Messaging
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  snapchat?: string;
  signal?: string;
  wechat?: string;
  portfolio?: string;
}

export interface SocialAccountEntry {
  id: string;
  platformId: keyof SocialLinks;
  value: string;
  label?: string;
}

export interface EmergencyContactItem {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface PassionItem {
  id: string;
  title: string;
  category: 'sport' | 'hobby' | 'passion';
  detail?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  year?: string;
  honors?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  discipline: 'dancer' | 'actor' | 'painter' | 'photographer' | 'musician' | 'creative';
  imageUrl: string;
  mediumOrRole?: string;
  roleOrMedium?: string;
  linkUrl?: string;
  year?: string;
  description?: string;
}

export interface PersonalData {
  firstName?: string;
  lastName?: string;
  fullName: string;
  nickname?: string;
  pronouns?: string;
  gender?: string;
  phone: string;
  email: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  birthday?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  emergencyContacts?: EmergencyContactItem[];
  bio?: string;
  socials?: SocialLinks;
}

export interface WorkData {
  role: string;
  company: string;
  department?: string;
  email: string;
  phone: string;
  website?: string;
  officeAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  taxIdOrVat?: string;
  bookingLink?: string;
  headline?: string;
  bio?: string;
  companyLogoUrl?: string;
  socials?: SocialLinks;
}

export interface RubricaField {
  id: string;
  label: string;
  value: string;
  category: 'personal' | 'work' | 'club' | 'sport' | 'emergency' | 'custom';
}

export interface StoredPicture {
  id: string;
  name: string;
  url: string;
  context: 'work' | 'family' | 'golf' | 'soccer' | 'custom' | 'banner';
  category?: 'avatar' | 'banner';
  aspectRatio?: '1:1' | '16:9';
  isAiGenerated?: boolean;
  isAiModified?: boolean;
  originalSource?: 'vault' | 'library' | 'camera';
  aiStyle?: string;
  createdAt?: string;
}

export type ProfileCategory = 'business' | 'personal' | 'hobby_sport' | 'other';

export interface CardVisibleFields {
  role: boolean;
  company: boolean;
  companyLogo?: boolean;
  department?: boolean;
  headline?: boolean;
  phone: boolean;
  workPhone?: boolean;
  personalPhone?: boolean;
  email: boolean;
  workEmail?: boolean;
  personalEmail?: boolean;
  website: boolean;
  location: boolean;
  homeAddress?: boolean;
  personalAddress?: boolean;
  officeAddress?: boolean;
  bio: boolean;
  personalBio?: boolean;
  nickname?: boolean;
  pronouns?: boolean;
  gender?: boolean;
  socials: boolean;
  birthday?: boolean;
  emergencyContact?: boolean;
  rubrica?: boolean;
  taxIdOrVat?: boolean;
  taxId?: boolean;
  bookingLink?: boolean;
  passions?: boolean;
  education?: boolean;
  portfolioSection?: boolean;
  // Granular Major Social Media Toggles
  linkedin?: boolean;
  twitter?: boolean;
  github?: boolean;
  calendly?: boolean;
  youtube?: boolean;
  threads?: boolean;
  substack?: boolean;
  medium?: boolean;
  behance?: boolean;
  dribbble?: boolean;
  discord?: boolean;
  reddit?: boolean;
  pinterest?: boolean;
  twitch?: boolean;
  spotify?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
  instagram?: boolean;
  tiktok?: boolean;
  facebook?: boolean;
  snapchat?: boolean;
  signal?: boolean;
  wechat?: boolean;
  portfolio?: boolean;
  socialAccounts?: Record<string, boolean>;
}

export interface MasterProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: string;
  company: string;
  headline: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  bio: string;
  avatarUrl: string;
  previousAvatarUrl?: string;
  coverBannerUrl?: string;
  // Flexible user-defined profile naming & categorization (no preset circle)
  profileTitle?: string;
  category?: ProfileCategory;
  tag?: string;
  tags?: string[];
  circleName?: string;
  circleType?: string;
  socials: SocialLinks;
  socialAccounts?: SocialAccountEntry[];
  isVerified: boolean;
  verifiedAt?: string;
  ccpaDoNotSell: boolean;
  aiCredits: number;

  // LGBTQ+ Inclusive Identity & Personalization
  nickname?: string;
  gender?: string; // LGBTQ+ inclusive (e.g. Non-binary, Genderqueer, Agender, Transgender Woman/Man, Cisgender, Self-described, etc.)
  pronouns?: string; // e.g. they/them, she/her, he/him, ze/zir, any

  // Document + Selfie KYC Verification & Database Traceability
  kycVerification?: {
    isCompleted: boolean;
    firstName: string;
    lastName: string;
    email: string;
    verifiedAt?: string;
    kycLevel?: 'Level-1 Automatic' | 'Level-2 Enhanced' | 'Level-3 Biometric Document & Selfie';
    traceabilityId?: string;
    traceabilityHash?: string;
    documentType?: string;
    issuingCountry?: string;
    documentNumberMasked?: string;
    dateOfBirth?: string;
    expirationDate?: string;
    documentConfidenceScore?: number;
    biometricMatchScore?: number;
    livenessVerified?: boolean;
    comparisonSummary?: string;
    documentThumbUrl?: string;
    selfieThumbUrl?: string;
  };

  // Separated Personal vs. Work & Standard Rubrica
  personalData?: PersonalData;
  workData?: WorkData;
  companyLogoUrl?: string;
  videoIntroUrl?: string;
  videoTitle?: string;
  rubricaFields?: RubricaField[];
  passions?: PassionItem[];
  education?: EducationItem[];
  portfolio?: PortfolioItem[];
  artistDiscipline?: string;
  storedPictures?: StoredPicture[];
  storedBanners?: StoredPicture[];
  visibleFields?: CardVisibleFields;
}

export type PrimaryCtaType =
  | 'save_contact'
  | 'book_meeting'
  | 'send_email'
  | 'call'
  | 'whatsapp'
  | 'visit_website'
  | 'watch_video'
  | 'custom';

export interface PrimaryCtaConfig {
  type: PrimaryCtaType;
  label?: string;
  url?: string;
}

export interface LivePresenceConfig {
  enabled: boolean;
  statusText: string;
  availability: 'available' | 'deep_work' | 'event' | 'traveling' | 'do_not_disturb';
  timezone: string;
  icebreakerPrompt?: string;
}

export interface StoryDeckSpotlight {
  title: string;
  subtitle: string;
  badge?: string;
  metricLabel?: string;
  metricValue?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
}

export type CardLogoPosition = 'top_right' | 'identity_row' | 'top_left';
export type CardLogoSize = 'compact' | 'standard' | 'prominent';

export interface DigitalCard {
  id: string;
  name: string;
  category: ProfileCategory;
  tag: string;
  // Auto-populated from Identity Settings on card creation, editable per card
  holderFirstName?: string;
  holderLastName?: string;
  holderFullName?: string;
  holderEmail?: string;
  holderPhone?: string;
  theme: CardTheme;
  accentColor: string;
  customTagline: string;
  vanitySlug: string;
  qrMode: 'vcard' | 'weblink';
  visibleFields: CardVisibleFields;
  sharedRubricaFieldIds?: string[];
  // Enhanced Aesthetic & Material Finish Customization
  materialFinish?: CardMaterial;
  fontPairing?: CardFontPairing;
  contentLayout?: CardContentLayout;
  preferredLayout?: CardLayoutMode;
  layoutStyle?: CardLayoutMode | string;
  showNfcChip?: boolean;
  showQrOnFront?: boolean;
  cardPattern?: 'subtle_grid' | 'metallic_mesh' | 'geometric_lines' | 'clean' | 'topographic';
  // Personalization Features: Card-Specific Portrait, Cover Banner, Brand Logo, CTA, Video & Framing
  avatarUrl?: string;
  previousAvatarUrl?: string;
  coverBannerUrl?: string;
  avatarOffsetX?: number; // 0 to 100 (default 50)
  avatarOffsetY?: number; // 0 to 100 (default 18 for natural face focus)
  avatarZoom?: number; // 1.0 to 2.2 (default 1.0)
  backdropMode?: 'standard' | '3d_silhouette';
  backdropSource?: 'banner' | 'portrait_environment';
  backdropDepthBlur?: 'deep' | 'cinematic' | 'subtle';
  silhouetteEdgeMode?: 'tight' | 'balanced' | 'soft_halo';
  silhouetteCutoutUrl?: string;
  companyLogoUrl?: string;
  customLogoUrl?: string;
  logoPlacement?: CardLogoPosition;
  logoSize?: CardLogoSize;
  logoWatermark?: boolean;
  primaryCta?: PrimaryCtaConfig;
  videoIntroUrl?: string;
  videoTitle?: string;
  // Disruptive Experience Capabilities
  spatialParallax?: boolean;
  livePresence?: LivePresenceConfig;
  storySpotlight?: StoryDeckSpotlight;
}


export type ContactCategory = 'business' | 'personal' | 'family' | 'club' | 'other';

export interface ContactActivityLog {
  id: string;
  date: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  summary: string;
}

export interface SelectiveSyncMeta {
  isSynced: boolean;
  lastSyncedAt: string;
  senderCircle?: string;
  sharedFieldsList: string[];
  version?: number;
}

export type DealStage =
  | 'Qualification'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed-Won'
  | 'Closed-Lost';

export type AccountLifecycleStatus =
  | 'Prospect'
  | 'Evaluating'
  | 'Onboarding'
  | 'Active Customer'
  | 'At Risk / Support Hold';

export type CaseReasonCategory =
  | 'Technical Support'
  | 'Billing'
  | 'Product Feedback'
  | 'Onboarding'
  | 'Account Management'
  | 'Warranty / SLA';

export type AfterSalesCaseStatus =
  | 'New'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Resolved';

export type AfterSalesCasePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface AfterSalesCase {
  caseId: string; // Auto-generated unique ID, e.g., CASE-2026-4812
  caseCategory: CaseReasonCategory;
  status: AfterSalesCaseStatus;
  priority: AfterSalesCasePriority;
  productLinked: string;
  subject?: string;
  resolutionNotes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SocialScanInsight {
  platform: string;
  handleOrUrl: string;
  recentSignal: string;
  salesRelevance: string;
}

export interface SharedYouConnectCardSnapshot {
  cardName?: string;
  category?: ContactCategory | ProfileCategory;
  tag?: string;
  theme?: CardTheme | string;
  materialFinish?: CardMaterial | string;
  accentColor?: string;
  layoutStyle?: CardLayoutMode | string;
  customTagline?: string;
  vanitySlug?: string;
  coverBannerUrl?: string;
  companyLogoUrl?: string;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  avatarZoom?: number;
  livePresenceStatus?: string;
  storySpotlight?: {
    title: string;
    subtitle: string;
    badge?: string;
    metricLabel?: string;
    metricValue?: string;
  };
}

export interface CRMContact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  pronouns?: string;
  gender?: string;
  role: string;
  department?: string;
  company: string;
  email: string;
  phone: string;
  website?: string;
  location?: string;
  officeAddress?: string;
  homeAddress?: string;
  taxIdOrVat?: string;
  headline?: string;
  bio?: string;
  personalBio?: string;
  notes?: string;
  source: ContactSource;
  status: CRMStatus;
  tags: string[];
  avatarUrl?: string;
  companyLogoUrl?: string;
  coverBannerUrl?: string;
  createdAt: string;
  updatedAt?: string;

  // Two-section separation: General Rubrica vs. Business CRM
  isBusinessCRM?: boolean;
  category?: ContactCategory;

  // Minimum Sales CRM Fields
  dealName?: string; // Deal / Opportunity Name (e.g., "Company X - 50 User Licenses")
  dealStage?: DealStage; // Deal Stage: Qualification | Proposal | Negotiation | Closed-Won | Closed-Lost
  dealValue?: number; // Deal Value: Estimated or exact revenue amount
  dealCurrency?: string;
  closeDate?: string; // Close Date: Target or actual date the deal is finalized
  expectedCloseDate?: string; // Alias for Close Date compatibility
  dealOwner?: string; // Deal Owner: Specific sales representative responsible for the account
  lossReason?: string; // Loss Reason: Mandatory dropdown when dealStage === 'Closed-Lost'
  nextFollowUpDate?: string;
  activityLog?: ContactActivityLog[];

  // Synced Sales & After-Sales Bridge Fields
  accountStatus?: AccountLifecycleStatus; // Prospect | Evaluating | Onboarding | Active Customer | At Risk / Support Hold
  purchaseDate?: string; // Marks sales win & start of warranty/subscription coverage

  // Minimum After-Sales (Service / Success) CRM Fields
  ticketId?: string; // Ticket / Case ID: Unique auto-generated identifier for tracking customer issues
  caseReason?: CaseReasonCategory; // Case Reason / Category: Technical Support | Billing | Product Feedback | Onboarding | Account Management | Warranty / SLA
  caseStatus?: AfterSalesCaseStatus; // Status: New | In Progress | Awaiting Customer | Resolved
  casePriority?: AfterSalesCasePriority; // Priority: Low | Medium | High | Urgent
  productLinked?: string; // Product / Asset Linked: Specific product or service purchased
  resolutionNotes?: string; // Resolution Notes: Brief text explaining how the issue was solved
  afterSalesCases?: AfterSalesCase[]; // Multi-case history log

  // Rubrica Extended Address Book & Full YouConnect Shared Properties
  personalEmail?: string;
  personalPhone?: string;
  birthday?: string;
  rubricaFields?: RubricaField[];
  socials?: SocialLinks;
  isFavorite?: boolean;
  isEmergencyContact?: boolean;
  emergencyRelationship?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  emergencyContacts?: {
    id?: string;
    name: string;
    relationship: string;
    phone: string;
  }[];
  passions?: PassionItem[];
  education?: EducationItem[];
  portfolio?: PortfolioItem[];
  sharedCard?: SharedYouConnectCardSnapshot;

  // Selective Sharing Synchronization Metadata
  selectiveSyncInfo?: SelectiveSyncMeta;

  // AI Contact Enrichment & Social Scanner
  aiEnrichment?: {
    summary?: string;
    industry?: string;
    suggestedIcebreaker?: string;
    draftedMessageContent?: string;
    projectDiscussionContext?: string;
    socialInsights?: SocialScanInsight[];
    enrichmentTimestamp?: string;
  };
}

export interface DuplicatePair {
  contactA: CRMContact;
  contactB: CRMContact;
  similarityScore: number;
  matchedFields: string[];
}

export interface PeerNode {
  id: string;
  name: string;
  role: string;
  company: string;
  avatarUrl: string;
  distanceMeters: number;
  signalDbm: number;
  protocol: 'bluetooth' | 'wifi' | 'webrtc' | 'websocket';
  cardData: Partial<MasterProfile> & { customTagline?: string };
  isLocalTab?: boolean;
  isRealLivePeer?: boolean;
  socketId?: string;
  isDemo?: boolean;
}

export type AppNavTab = 'studio' | 'radar' | 'rubrica' | 'crm' | 'settings';

export type AppearanceMode = 'day' | 'night' | 'auto';

export type SettingsSubMenu =
  | 'account'
  | 'kyc'
  | 'privacy'
  | 'storage'
  | 'subscription'
  | 'radar'
  | 'security';

export interface KycTraceabilityRecord {
  traceabilityId: string;
  traceabilityHash: string;
  profileId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  documentType: string;
  issuingCountry: string;
  documentNumberMasked: string;
  dateOfBirth: string;
  expirationDate: string;
  documentConfidenceScore: number;
  biometricMatchScore: number;
  livenessVerified: boolean;
  matchVerdict: 'VERIFIED_MATCH' | 'REVIEW_REQUIRED';
  comparisonSummary: string;
  extractedFields: {
    fullName: string;
    documentNumber: string;
    dateOfBirth: string;
    issuingCountry: string;
    expirationDate: string;
    mrzStatus: string;
    documentAuthenticity: string;
  };
  registeredAt: string;
  auditTrail: Array<{
    step: string;
    status: 'passed' | 'verified';
    timestamp: string;
    detail: string;
  }>;
}

export interface ParentalControlConfig {
  enabled: boolean;
  masterPin: string;
  lockedPersonaIds: string[];
  hidePrivateDataInPublicShare: boolean;
  restrictAdultSocialPlatforms: boolean;
  restrictedPlatforms: string[];
  stealthRadarMode: boolean;
}

export interface RadarPreferencesConfig {
  defaultVisibility: 'public' | 'stealth' | 'contacts_only';
  maxRangeMeters: number;
  autoAcceptRequests: boolean;
  audioProximityAlert: boolean;
  hapticFeedback: boolean;
  defaultRoom: string;
}

export interface SecuritySettingsConfig {
  biometricLockEnabled: boolean;
  twoFactorEnabled: boolean;
  sessionTimeoutMinutes: number;
  lastSecurityAudit: string;
}

export interface RadarRoom {
  id: string;
  name: string;
  description?: string;
  hasPassword: boolean;
  password?: string;
  maxParticipants: number; // 0 = unlimited, or e.g. 5, 10, 25
  durationMinutes: number; // max 600 (10 hours)
  createdAt: number;
  expiresAt: number;
  createdBy: string;
  createdByProfileId?: string;
  creatorKey?: string;
  isDefault?: boolean;
}

export interface RadarRoomPublicInfo {
  id: string;
  name: string;
  description?: string;
  hasPassword: boolean;
  maxParticipants: number;
  durationMinutes: number;
  createdAt: number;
  expiresAt: number;
  createdBy: string;
  createdByProfileId?: string;
  currentParticipantsCount: number;
  isExpired: boolean;
  isDefault?: boolean;
}

export type SubscriptionTier = 'basic' | 'pro' | 'business';

export type AiUsageType =
  | 'image_headshot'
  | 'image_3d_avatar'
  | 'image_banner'
  | 'image_logo'
  | 'text_bio'
  | 'crm_intelligence';

export interface AiCoinTransaction {
  id: string;
  timestamp: string;
  actionLabel: string;
  usageType: AiUsageType;
  coinsDeducted: number; // 1 coin, or 0 if included in Business tier Text/CRM AI
  sourcePool: 'daily_quota' | 'booster_pack' | 'business_unlimited_text';
}

export interface AiBoosterPackBatch {
  id: string;
  purchasedAt: string; // ISO date
  expiresAt: string; // ISO date (valid 3 months from purchase)
  initialCoins: number;
  remainingCoins: number;
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  // Monthly billing cycle tracking (included tier coins are non-cumulative and never roll over to next month)
  billingCycleStartDate?: string; // YYYY-MM-DD
  billingCycleRenewalDate?: string; // YYYY-MM-DD (1 month cycle; remaining tier coins do not top up next month)
  // Daily included AI quota tracking (0 for Free, 5 any-AI for Basic, 10 image-AI for Business; non-cumulative)
  dailyQuotaDate: string; // YYYY-MM-DD
  dailyCoinsUsed: number;
  // Purchased AI Booster Pack coins (+50 coins per pack; valid for 3 months from purchase)
  boosterCoinsBalance: number;
  boosterPacksPurchasedCount: number;
  boosterPacks?: AiBoosterPackBatch[];
  boosterExpiresAt?: string; // ISO date of active booster pack expiration (3 months validity)
  // Total lifetime coins consumed counter
  totalCoinsConsumedLifetime: number;
  // P2P Radar weekly usage tracking (Basic tier: max 1 session/week)
  radarWeekStartDate: string; // YYYY-MM-DD of current week
  weeklyRadarSessionsUsed: number;
  activeRadarSessionDate?: string; // Allows re-entering radar on the same active session day without double-counting
  // Consumption ledger history
  coinHistory: AiCoinTransaction[];
}

