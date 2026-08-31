/**
 * ARC Club Data Types
 */

export type AccountStatus = 'active' | 'inactive' | 'locked';

export type UserRoleName = 
  | 'Admin' 
  | 'President' 
  | 'Vice President' 
  | 'Treasurer' 
  | 'Secretary' 
  | 'EXCO Member'
  | 'Club Member';

export type ModuleKey = 
  | 'dashboard'
  | 'members'
  | 'events_meetings'
  | 'events'
  | 'budget'
  | 'slideshow'
  | 'content'
  | 'vision_mission'
  | 'contact'
  | 'contacts'
  | 'social_media'
  | 'exco_team'
  | 'ramazan_quiz'
  | 'quiz'
  | 'quiz_participants'
  | 'quiz_winners'
  | 'users'
  | 'roles_permissions'
  | 'roles'
  | 'audit_logs'
  | 'club_rules'
  | 'settings'
  | 'messages';

export type MessageCategory = 'general' | 'announcement' | 'quiz_alert' | 'system_alert' | 'direct';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MessageActionRecord {
  id: string;
  actionTaken: string;
  actionByUserId: string;
  actionByName: string;
  replyMethod: 'mail' | 'call' | 'message' | 'meeting' | 'other';
  replyDetails: string;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  senderId?: string;
  senderName: string; // Visitor name
  senderRole?: string;
  contactInfo?: string; // Phone number or Email
  recipientType?: 'all' | 'user' | 'role';
  recipientId?: string;
  recipientName?: string;
  subject: string;
  body: string;
  category: MessageCategory;
  priority: MessagePriority;
  status?: 'pending' | 'in_progress' | 'resolved' | 'archived';
  readBy: string[]; // array of userIds who read this message
  archivedBy?: string[]; // array of userIds who archived/deleted from their view
  replyToId?: string;
  actions?: MessageActionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientId: string; // userId or 'all'
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'quiz' | 'message';
  link?: string;
  readBy: string[]; // userIds
  createdAt: string;
}

export interface ModulePermission {
  id: string;
  userId: string;
  moduleKey: ModuleKey;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canApprove: boolean;
  canExport: boolean;
  canManageSettings: boolean;
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  designation: string;
  contactNumber: string;
  roleId: string;
  roleName: UserRoleName;
  profileImage?: string;
  status: AccountStatus;
  isActive?: boolean;
  isLocked?: boolean;
  requirePinChange: boolean;
  failedLoginCount: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  permissions: ModulePermission[];
  modulePermissions?: ModulePermission[];
  memberId?: string;
  memberNumber?: string;
  idCardNumber?: string;
  pinHash?: string;
  pinSalt?: string;
}

export interface MemberDashboardWidgetSettings {
  showClubOverviewStats?: boolean;
  showPersonalScore?: boolean;
  showQuizHistory?: boolean;
  showWinsRecord?: boolean;
  showAttendanceRecord?: boolean;
  showBadgesMilestones?: boolean;
  showUpcomingEvents?: boolean;
  showClubRulesBanner?: boolean;
  showWelcomeBanner?: boolean;
  showProfileCard?: boolean;
  showStatsSummary?: boolean;
  showBadges?: boolean;
  showWinsHistory?: boolean;
  showAttendanceHistory?: boolean;
  showBudgetStats?: boolean;
  showPersonalBudgetReport?: boolean;
  showClubRulesQuickButton?: boolean;
  showQuizQuickButton?: boolean;
  allowMemberConnectProfile?: boolean;
}

export interface UserPerformanceBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: 'emerald' | 'amber' | 'sky' | 'orange' | 'purple';
}

export interface UserPerformanceData {
  userId: string;
  fullName: string;
  username: string;
  designation: string;
  roleName: string;
  profileImage?: string;
  status: string;
  member?: ClubMember;
  attendance: {
    eventsAttended: number;
    totalEvents: number;
    meetingsAttended: number;
    totalMeetings: number;
    totalPresent: number;
    totalAbsent: number;
    totalExcused: number;
    attendanceRate: number;
    records: Array<{
      type: 'event' | 'meeting';
      id: string;
      title: string;
      date: string;
      venue?: string;
      status: 'present' | 'absent' | 'excused';
      notes?: string;
    }>;
  };
  quiz: {
    totalAttempts: number;
    revealedAnswersCount?: number;
    pendingRevealCount?: number;
    correctAnswers: number;
    accuracyRate: number;
    submissions: Array<{
      id: string;
      questionId?: string;
      questionNumber: number;
      questionTitle: string;
      selectedOptionText?: string;
      selectedOptionLabel?: string;
      isAnswerRevealed?: boolean;
      isCorrect?: boolean;
      correctOptionText?: string;
      correctOptionLabel?: string;
      answerExplanation?: string;
      status?: 'pending_reveal' | 'evaluated';
      submittedAt: string;
      closeAt?: string;
      revealAt?: string;
    }>;
    wins: Array<{
      id: string;
      questionNumber: number;
      prizeTitle: string;
      sponsorName?: string;
      selectedAt: string;
      prizeCollectionStatus: string;
    }>;
  };
  activity: {
    messagesCount: number;
    auditLogsCount: number;
  };
  budget?: {
    summary: {
      totalPaid: number;
      totalFines: number;
      totalPending: number;
      pendingCount: number;
      overdueCount: number;
      paidCount: number;
      waivedCount: number;
      totalMonths: number;
      isUpToDate: boolean;
      monthlyFee: number;
      dueDayOfMonth: number;
      annualAdvanceDiscountMonths: number;
      status: 'good_standing' | 'pending' | 'overdue';
      depositAccount?: {
        id: string;
        accountName: string;
        accountNumber: string;
        bankName: string;
        currency: string;
      };
    };
    contributions: MemberContributionRecord[];
    clubStats: {
      totalClubIncome: number;
      totalClubExpenses: number;
      netReserve: number;
      totalContributionsCollected: number;
      currentYear: number;
    };
  };
  overallScore: number;
  badges: UserPerformanceBadge[];
}

export type ContactInfo = {
  id: string;
  type: 'email' | 'primary_phone' | 'secondary_phone' | 'whatsapp' | 'viber' | 'address' | 'map_url' | 'working_hours';
  label: string;
  value: string;
  displayOrder: number;
  status: 'active' | 'inactive';
};

export interface Role {
  id: string;
  name: UserRoleName;
  description: string;
  isSystemRole: boolean;
  defaultPermissions: Omit<ModulePermission, 'id' | 'userId'>[];
  createdAt: string;
  updatedAt: string;
}

export interface SlideshowItem {
  id: string;
  desktopImage: string;
  mobileImage?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  textAlignment: 'left' | 'center' | 'right';
  overlayLevel: number; // 0 to 80 percent
  displayOrder: number;
  publishAt?: string;
  expireAt?: string;
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSetting {
  id: string;
  group: 'branding' | 'public_site' | 'security' | 'quiz' | 'system' | 'budget' | 'invoice' | 'widgets' | 'content';
  key: string;
  value: any;
  updatedBy?: string;
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'linkedin' | 'whatsapp' | 'viber' | 'telegram' | 'website';
  url: string;
  icon?: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  openInNewTab: boolean;
}

export interface ExcoMember {
  id: string;
  fullName: string;
  designation: string;
  idCardNumber?: string;
  image: string;
  description?: string;
  socialLink?: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface QuizPrize {
  id: string;
  title: string;
  description?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  valueAmount?: string;
  image?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface QuizSponsor {
  id: string;
  name: string;
  logo?: string;
  adText?: string;
  specialProductImage?: string;
  websiteUrl?: string;
  status: 'active' | 'inactive';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type QuizStatus = 
  | 'draft'
  | 'scheduled'
  | 'open'
  | 'closed'
  | 'awaiting_reveal'
  | 'answer_revealed'
  | 'draw_scheduled'
  | 'draw_running'
  | 'winner_announced'
  | 'completed'
  | 'cancelled';

export interface QuizOption {
  id: string;
  questionId: string;
  optionLabel: string; // e.g. 'A', 'B', 'C', 'D'
  optionText: string;
  text?: string; // alias for optionText
  optionImage?: string;
  displayOrder: number;
}

export interface QuizQuestion {
  id: string;
  title: string;
  questionNumber: number;
  questionText: string;
  questionImage?: string;
  showQuestionImage?: boolean;
  options: QuizOption[];
  correctOptionId?: string; // Hidden from public APIs until reveal time
  answerExplanation?: string; // Hidden from public APIs until reveal time
  publishAt: string;
  closeAt: string;
  revealAt: string;
  drawStartAt: string;
  rollingDurationSeconds: number;
  winnerDisplayDurationSeconds: number;
  prizeId?: string;
  prizeTitle: string;
  prizeDescription?: string;
  sponsorId?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  status: QuizStatus;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Stats summary (computed for portal)
  totalParticipants?: number;
  correctCount?: number;
  eligibleCount?: number;
}

export interface QuizSubmission {
  id: string;
  questionId: string;
  participantNumber: string; // e.g. 'RQ-0001'
  participantName?: string;
  fullName?: string;
  normalizedIdNumber: string; // e.g. 'A123456'
  idNumber?: string;
  contactNumber?: string; // e.g. '7712345'
  encryptedIdNumber?: string;
  encryptedContactNumber?: string;
  maskedIdNumber: string; // e.g. 'A12***56'
  maskedContactNumber: string; // e.g. '77***89'
  selectedOptionId: string;
  isCorrect: boolean;
  isEligible: boolean;
  isInvalid: boolean;
  isDisqualified: boolean;
  disqualificationReason?: string;
  internalNotes?: string;
  submittedAt: string;
  updatedAt: string;
  // Option label/text for convenient display in portal
  selectedOptionLabel?: string;
  selectedOptionText?: string;
}

export interface QuizWinner {
  id: string;
  questionId: string;
  submissionId: string;
  participantNumber: string;
  maskedIdNumber: string;
  maskedContactNumber: string;
  // Unmasked fields accessible only in admin portal
  fullName?: string;
  participantName?: string;
  contactNumber?: string;
  idNumber?: string;
  prizeId?: string;
  prizeTitle: string;
  prizeDescription?: string;
  sponsorId?: string;
  sponsorName?: string;
  sponsorLogo?: string;
  eligibleCount: number;
  selectedAt: string;
  selectedBy: string; // 'system' or userId
  selectionMethod: 'random' | 'manual_reselect';
  auditReference: string;
  contactedStatus: 'not_contacted' | 'contacted' | 'unreachable';
  prizeCollectionStatus: 'pending' | 'collected' | 'forfeited';
  prizeCollectionDate?: string;
  paymentSlipUrl?: string;
  publicStatus: 'published' | 'hidden';
  internalNotes?: string;
  replacementReason?: string;
  isReplaced?: boolean;
  // Helper properties for UI
  isContacted?: boolean;
  isPrizeCollected?: boolean;
  drawnAt?: string;
  questionNumber?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  action: string;
  module: ModuleKey | 'auth' | 'system';
  recordId?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  deviceReference?: string;
  createdAt: string;
}

export interface ClubEvent {
  id: string;
  title: string;
  summary: string;
  description?: string;
  eventDate?: string;
  location?: string;
  coverImage?: string;
  photoAlbum: string[];
  displayOrder: number;
  status: 'active' | 'inactive';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSiteData {
  branding: {
    clubName: string;
    clubAbbreviation: string;
    logo: string;
    useLogo?: boolean;
    welcomeHeading: string;
    welcomeMessage: string;
    aboutText: string;
    headerTitle: string;
    headerSubtitle: string;
    footerDescription: string;
    copyrightText: string;
    announcement?: string;
    announcementActive?: boolean;
  };
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  slideshow: SlideshowItem[];
  slideshowSettings: {
    autoplay: boolean;
    slideDuration: number;
    transitionDuration: number;
    showArrows: boolean;
    showDots: boolean;
    pauseOnHover: boolean;
  };
  visionMission: {
    heading: string;
    introduction?: string;
    visionTitle: string;
    visionContent: string;
    missionTitle: string;
    missionContent: string;
    bgImage?: string;
  };
  contacts: Array<{
    id: string;
    type: 'email' | 'primary_phone' | 'secondary_phone' | 'whatsapp' | 'viber' | 'address' | 'map_url' | 'working_hours';
    label: string;
    value: string;
    displayOrder: number;
    status: 'active' | 'inactive';
  }>;
  socialLinks: SocialLink[];
  excoMembers: ExcoMember[];
  events?: ClubEvent[];
  clubRules?: ClubRulesData;
}

export interface ClubRuleArticle {
  articleNumber: string;
  title?: string;
  titleDhivehi?: string;
  titleEnglish?: string;
  content?: string;
  contentDhivehi?: string;
  contentEnglish?: string;
}

export interface ClubRuleChapter {
  id: string;
  chapterNumber: number;
  titleDhivehi: string;
  titleEnglish: string;
  summary?: string;
  summaryDhivehi?: string;
  summaryEnglish?: string;
  articles: ClubRuleArticle[];
}

export interface ClubRulesData {
  titleDhivehi: string;
  titleEnglish: string;
  description?: string;
  descriptionDhivehi?: string;
  descriptionEnglish?: string;
  version: string;
  effectiveDate: string;
  pdfUrl?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  updatedAt: string;
  updatedByName?: string;
  chapters: ClubRuleChapter[];
}

export interface ClubMember {
  id: string;
  memberNumber: string;
  fullName: string;
  idCardNumber?: string;
  address: string;
  phoneNumber: string;
  email?: string;
  memberType: 'standard' | 'exco' | 'committee' | 'honorary';
  excoDesignation?: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  memberId: string;
  userId?: string;
  memberName: string;
  memberNumber: string;
  status: 'present' | 'absent' | 'excused';
  notes?: string;
  markedAt?: string;
}

export interface EventItem {
  id: string;
  title: string;
  heldDate: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  summary: string;
  description?: string;
  eventType: 'community' | 'sports' | 'charity' | 'social' | 'workshop' | 'other';
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  photoGallery: string[];
  attendance: AttendanceRecord[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingVotingItem {
  id: string;
  topic: string;
  description?: string;
  status: 'open' | 'closed' | 'finalized';
  votes: {
    inFavor: number;
    against: number;
    abstain: number;
  };
  votedMembers?: Array<{
    memberId: string;
    memberName: string;
    choice: 'in_favor' | 'against' | 'abstain';
  }>;
  finalizedAction?: string;
  createdAt: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  meetingType: 'general_members' | 'exco';
  heldDate: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  summary: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attendance: AttendanceRecord[];
  votings: MeetingVotingItem[];
  finalizedActions: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// --- BUDGET MODULE TYPES ---

export type BankAccountType = 'bank' | 'cash' | 'mobile_wallet' | 'other';

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  type: BankAccountType;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type IncomeCategory = 
  | 'member_contribution'
  | 'sponsorship'
  | 'donation'
  | 'event_fee'
  | 'service_fee'
  | 'merchandise'
  | 'rental'
  | 'grant'
  | 'other';

export interface IncomeRecord {
  id: string;
  title: string;
  category: IncomeCategory;
  amount: number;
  date: string;
  accountId: string;
  accountName?: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'gateway' | 'other';
  referenceNumber?: string;
  receivedFrom: string;
  payerMemberId?: string;
  status: 'received' | 'pending' | 'cancelled';
  notes?: string;
  attachments?: string[];
  contributionRecordId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory = 
  | 'event_logistics'
  | 'venue_rent'
  | 'catering'
  | 'marketing_pr'
  | 'prizes_awards'
  | 'office_admin'
  | 'utilities'
  | 'equipment'
  | 'travel'
  | 'maintenance'
  | 'other';

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  accountId: string;
  accountName?: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'other';
  referenceNumber?: string;
  payee: string;
  approvedBy?: string;
  status: 'paid' | 'pending_approval' | 'rejected';
  receiptNumber?: string;
  notes?: string;
  attachments?: string[];
  
  // Bill upload and vendor billing fields
  billDocumentUrl?: string; // Base64 data or URL
  billDocumentName?: string; // Filename e.g. "fuel_bill_001.pdf"
  vendorName?: string; // Vendor / supplier name
  billNumber?: string; // Vendor's invoice/bill number
  billDate?: string; // Date on the bill
  billTotal?: number; // Total billed amount
  
  // Executive Payment Release Approval tracking
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  paymentReleaseApproved?: boolean;
  paymentReleasedAt?: string;
  paymentReleasedBy?: string;
  approvalRemarks?: string;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceType = 'invoice' | 'quotation';
export type InvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number; // qty * rate
}

export interface InvoiceRecord {
  id: string;
  type: InvoiceType; // 'invoice' | 'quotation'
  invoiceNumber: string; // e.g. 'ARC/INV/2026/0001' or 'ARC/QUO/2026/0001'
  invoiceDate: string; // e.g. '2026-02-09' (formatted 09/02/2026)
  dueDate?: string;

  // Client Details
  billTo: string; // e.g. 'R.Maduvvari Health Center'
  customerAddress?: string;
  tin?: string; // Tax Identification Number (e.g. 'TIN: 1054321GST001' or empty)
  remark?: string; // e.g. 'Supply of fuel for emergency generator'

  // Items & Calculations
  items: InvoiceLineItem[];
  subTotal: number;
  discount: number;
  totalNetPayments: number; // subTotal - discount
  amountPaid: number; // default 0
  amountDue: number; // totalNetPayments - amountPaid

  // Payment Method & Acknowledgment
  paymentMethod: 'cash' | 'online' | 'both';
  receivedBy?: string;
  receivedDate?: string;
  referenceNumber?: string;
  depositAccountId?: string;
  collectedIncomeRecordId?: string;
  signature?: string;

  // Bank & Payment Instructions (defaults to ARC club details)
  bankName?: string; // 'Bank of Maldives (BML)'
  accountName?: string; // 'AANANDHA RECREATION CLUB'
  accountNumber?: string; // 'BML | (MVR) 7730000308018'
  logoUrl?: string;

  // Footer & Club Information
  footerNoticeEnglish?: string;
  footerNoticeDhivehi?: string;
  clubPhone?: string;
  clubEmail?: string;
  clubAddress?: string;

  // Executive Approval (President / Vice President)
  status: InvoiceStatus;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalRemarks?: string;

  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransferRecord {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  date: string;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface MemberContributionSetting {
  monthlyFee: number;
  dueDayOfMonth: number;
  finePerDay: number;
  annualAdvanceDiscountMonths: number;
  currency: string;
  defaultDepositAccountId: string;
  enableAutoFines: boolean;
  gracePeriodDays: number;
  updatedAt: string;
  updatedBy?: string;
}

export type ContributionStatus = 'paid' | 'pending' | 'overdue' | 'waived';

export interface MemberContributionRecord {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  year: number;
  month: number; // 1 to 12
  baseAmount: number;
  discountAmount: number;
  fineDays: number;
  finePerDay: number;
  fineAmount: number;
  totalPayable: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  status: ContributionStatus;
  paymentMethod?: 'bank_transfer' | 'cash' | 'cheque' | 'gateway' | 'other';
  referenceNumber?: string;
  accountId?: string;
  accountName?: string;
  isAdvancePayment?: boolean;
  advancePackageMonths?: number;
  incomeRecordId?: string;
  receiptNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBudgetAllocation {
  id: string;
  year: number;
  category: ExpenseCategory;
  categoryLabel: string;
  allocatedAmount: number;
  spentAmount?: number;
  notes?: string;
  updatedAt?: string;
}

export interface BudgetStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalAccountsBalance: number;
  totalContributionsCollected: number;
  pendingContributionsCount: number;
  pendingContributionsAmount: number;
  overdueContributionsCount: number;
  overdueContributionsAmount: number;
  totalFinesCollected: number;
  monthlyFlow: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  categoryIncome: Array<{
    category: string;
    categoryLabel: string;
    amount: number;
    percentage: number;
  }>;
  categoryExpense: Array<{
    category: string;
    categoryLabel: string;
    amount: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'income' | 'expense';
    title: string;
    amount: number;
    date: string;
    category: string;
    accountName: string;
    status: string;
  }>;
}

// --- EXECUTIVE OFFICER SPECIFIC TYPES ---

export interface PresidentialDirective {
  id: string;
  title: string;
  titleDv?: string;
  directiveNumber?: string;
  refNumber?: string;
  body?: string;
  description?: string;
  targetRole?: string;
  targetOfficer?: string;
  priority: 'low' | 'normal' | 'routine' | 'high' | 'urgent';
  status: 'draft' | 'issued' | 'active' | 'in_progress' | 'completed' | 'archived';
  effectiveDate?: string;
  issueDate?: string;
  targetDate?: string;
  issuedBy?: string;
  completionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfficialCircular {
  id: string;
  circularNumber?: string;
  refNumber?: string;
  title: string;
  titleDv?: string;
  content?: string;
  summary?: string;
  category?: 'general' | 'agm' | 'election' | 'event' | 'policy';
  targetAudience?: 'all_members' | 'exco' | 'public' | 'committee';
  publishDate?: string;
  publishedDate?: string;
  status: 'draft' | 'published' | 'archived';
  signatoryName?: string;
  signedBy?: string;
  signatoryRole?: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

