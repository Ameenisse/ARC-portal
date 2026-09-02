import crypto from 'crypto';
import {
  User,
  Role,
  ClubMember,
  SiteSetting,
  SlideshowItem,
  SocialLink,
  ExcoMember,
  ClubEvent,
  EventItem,
  MeetingItem,
  QuizQuestion,
  QuizSubmission,
  QuizWinner,
  QuizPrize,
  QuizSponsor,
  AuditLog,
  InboxMessage,
  AppNotification,
  ClubRulesData,
  BankAccount,
  IncomeRecord,
  ExpenseRecord,
  AccountTransferRecord,
  MemberContributionSetting,
  MemberContributionRecord,
  CategoryBudgetAllocation,
  PresidentialDirective,
  OfficialCircular,
  UserPerformanceData,
  InvoiceRecord
} from '../types';
import {
  ALL_MODULES,
  defaultClubRules,
  defaultSiteSettingsList,
  defaultRoles,
  defaultSlideshow,
  defaultContacts,
  defaultSocialLinks,
  defaultExcoMembers,
  defaultEvents,
  defaultInvoices
} from './seedData';

// Generate default admin credentials
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 10000, 64, 'sha512').toString('hex');
}

const defaultAdminSalt = crypto.randomBytes(16).toString('hex');
const defaultAdminHash = hashPin('2613', defaultAdminSalt);

const defaultAdminUser: User = {
  id: 'usr_admin_001',
  fullName: 'System Administrator',
  username: 'admin',
  designation: 'Chief Administrator',
  contactNumber: '+960 7771234',
  roleId: 'role_admin',
  roleName: 'Admin',
  status: 'active',
  requirePinChange: false,
  failedLoginCount: 0,
  lockedUntil: null,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  notes: 'Primary system administrator account (Default PIN: 2613)',
  permissions: ALL_MODULES.map(m => ({
    id: `perm_usr_admin_001_${m}`,
    roleId: 'role_admin',
    userId: 'usr_admin_001',
    moduleKey: m,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canApprove: true,
    canExport: true,
    canManageSettings: true
  })),
  pinHash: defaultAdminHash,
  pinSalt: defaultAdminSalt
};

export class MemoryFallbackStore {
  users = new Map<string, User>([['usr_admin_001', defaultAdminUser]]);
  roles = new Map<string, Role>(defaultRoles.map(r => [r.id, r]));
  settings = new Map<string, SiteSetting>(defaultSiteSettingsList.map(s => [s.id, s]));
  slideshow = new Map<string, SlideshowItem>(defaultSlideshow.map(s => [s.id, s]));
  contacts = new Map<string, any>(defaultContacts.map(c => [c.id, c]));
  socialLinks = new Map<string, SocialLink>(defaultSocialLinks.map(s => [s.id, s]));
  excoMembers = new Map<string, ExcoMember>(defaultExcoMembers.map(e => [e.id, e]));
  events = new Map<string, ClubEvent>(defaultEvents.map(e => [e.id, e]));
  eventItems = new Map<string, EventItem>();
  meetings = new Map<string, MeetingItem>();
  invoices = new Map<string, InvoiceRecord>(defaultInvoices.map(i => [i.id, i]));
  rules: ClubRulesData = { ...defaultClubRules };
  members = new Map<string, ClubMember>();
  quizQuestions = new Map<string, QuizQuestion>();
  quizSubmissions = new Map<string, QuizSubmission>();
  quizWinners = new Map<string, QuizWinner>();
  quizPrizes = new Map<string, QuizPrize>();
  quizSponsors = new Map<string, QuizSponsor>();
  ineligibleIds: string[] = [];
  ineligibleParticipantIds = new Set<string>();
  ineligibleDetails = new Map<string, any>();
  bankAccounts = new Map<string, BankAccount>([
    [
      'acc_primary_001',
      {
        id: 'acc_primary_001',
        accountName: 'AANANDHA RECREATION CLUB',
        accountNumber: '7730000308018',
        bankName: 'Bank of Maldives (BML)',
        type: 'bank',
        currency: 'MVR',
        openingBalance: 150000,
        currentBalance: 150000,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  ]);
  incomeRecords = new Map<string, IncomeRecord>();
  expenseRecords = new Map<string, ExpenseRecord>();
  accountTransfers = new Map<string, AccountTransferRecord>();
  memberContributions = new Map<string, MemberContributionRecord>();
  contributionSettings: MemberContributionSetting = {
    monthlyFee: 100,
    dueDayOfMonth: 10,
    finePerDay: 5,
    annualAdvanceDiscountMonths: 2,
    currency: 'MVR',
    defaultDepositAccountId: 'acc_primary_001',
    enableAutoFines: true,
    gracePeriodDays: 5,
    updatedAt: new Date().toISOString()
  };
  budgetAllocations = new Map<string, CategoryBudgetAllocation>();
  directives = new Map<string, PresidentialDirective>();
  circulars = new Map<string, OfficialCircular>();
  auditLogs = new Map<string, AuditLog>();
  inboxMessages = new Map<string, InboxMessage>();
  appNotifications = new Map<string, AppNotification>();
  inbox = new Map<string, InboxMessage>();
  notifications = new Map<string, AppNotification>();
  userPerformance = new Map<string, UserPerformanceData>();
  sessions = new Map<string, { tokenHash: string; userId: string; expiresAt: number; revokedAt: string | null; userAgent?: string; lastSeenAt?: string; createdAt?: string }>();
  counters = new Map<string, number>([['members', 1], ['quizParticipants', 1]]);
}

export const fallbackStore = new MemoryFallbackStore();

let lastErrorLogTime = 0;
export function logFallbackNotice(context: string, err: any) {
  const now = Date.now();
  // Throttle logging to avoid console spam during background polling
  if (now - lastErrorLogTime > 15000) {
    console.warn(`[Firestore Resilient Layer] Using in-memory fallback for "${context}" (${err?.message || 'Database unavailable'})`);
    lastErrorLogTime = now;
  }
}
