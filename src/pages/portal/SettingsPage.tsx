import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { ClubRulesData, ClubRuleChapter, ClubRuleArticle, MemberContributionSetting } from '../../types';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import {
  Settings as SettingsIcon,
  BookOpen,
  Upload,
  FileText,
  Shield,
  Save,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  Sparkles,
  FileUp,
  X,
  Database,
  RefreshCw,
  Table,
  Layers,
  HardDrive,
  Cloud,
  FileCode,
  Clock,
  Globe,
  LayoutDashboard,
  HelpCircle,
  Trophy,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Check,
  CreditCard,
  Building2,
  DollarSign,
  Landmark,
  Receipt,
  FileCheck,
  Palette,
  Moon,
  Gift,
  HelpCircle as QuizIcon,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

interface MemberDashboardWidgetSettings {
  showWelcomeBanner: boolean;
  showProfileCard: boolean;
  showStatsSummary: boolean;
  showBadges: boolean;
  showQuizHistory: boolean;
  showWinsHistory: boolean;
  showAttendanceHistory: boolean;
  showClubRulesQuickButton: boolean;
  showQuizQuickButton: boolean;
  allowMemberConnectProfile: boolean;
}

const DEFAULT_WIDGET_SETTINGS: MemberDashboardWidgetSettings = {
  showWelcomeBanner: true,
  showProfileCard: true,
  showStatsSummary: true,
  showBadges: true,
  showQuizHistory: true,
  showWinsHistory: true,
  showAttendanceHistory: true,
  showClubRulesQuickButton: true,
  showQuizQuickButton: true,
  allowMemberConnectProfile: true,
};

type SettingsTab =
  | 'budget'
  | 'branding'
  | 'quiz'
  | 'widgets'
  | 'security'
  | 'hosting_time'
  | 'rules'
  | 'database';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // Tab State
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'budget';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const handleTabSelect = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Check if current user is Admin
  const isAdmin = Boolean(
    user && (
      user.roleName === 'Admin' ||
      user.roleId === 'role_admin' ||
      user.roleName.toLowerCase().includes('admin')
    )
  );

  // ==========================================
  // 1. BUDGET & INVOICES SETTINGS STATE
  // ==========================================
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [bankName, setBankName] = useState('Bank of Maldives (BML)');
  const [accountName, setAccountName] = useState('AANANDHA RECREATION CLUB');
  const [accountNumber, setAccountNumber] = useState('BML | (MVR) 7730000308018');
  const [paymentInstructionsEn, setPaymentInstructionsEn] = useState(
    'Bank Transfer made payable to: Account Name: AANANDHA RECREATION CLUB | Account Number: BML | (MVR) 7730000308018. Please mention invoice number in remarks and send slip to info@arcclub.mv'
  );
  const [paymentInstructionsDv, setPaymentInstructionsDv] = useState(
    'ބޭންކް ޓްރާންސްފަރ މެދުވެރިކޮށް ފައިސާދައްކާނީ AANANDHA RECREATION CLUB އަށެވެ. ޓްރާންސްފަރ ރިމާކްސްގައި އިންވޮއިސް ނަންބަރު ޖެއްސެވުމަށްފަހު ސްލިޕް info@arcclub.mv އަށް ފޮނުއްވާދެއްވުން އެދެމެވެ.'
  );
  const [invoiceLogo, setInvoiceLogo] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('6580394');
  const [invoiceEmail, setInvoiceEmail] = useState('info@arcclub.mv');
  const [invoiceAddress, setInvoiceAddress] = useState('AANANDHA RECREATION CLUB\nRaa.Maduvvari, 05110\nMaldives');
  const [defaultInvoicePrefix, setDefaultInvoicePrefix] = useState('ARC/INV/');
  const [defaultQuotationPrefix, setDefaultQuotationPrefix] = useState('ARC/QUO/');
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('Payment due within 30 days of invoice date');
  const [footerNoticeEnglish, setFooterNoticeEnglish] = useState('For any queries or issues related to the invoice, please notify us within 24hrs.');
  const [footerNoticeDhivehi, setFooterNoticeDhivehi] = useState('ބިލާމެދު އެއްވެސް މައްސަލައެއް އުޅޭނަމަ 24 ގަޑިއިރު ތެރޭގައި އެންގުން އެދެމެވެ.');

  // Member Contribution Rules
  const [bankAccountsList, setBankAccountsList] = useState<any[]>([]);
  const [contributionRules, setContributionRules] = useState<MemberContributionSetting>({
    monthlyFee: 50,
    dueDayOfMonth: 5,
    finePerDay: 5,
    annualAdvanceDiscountMonths: 2,
    currency: 'MVR',
    defaultDepositAccountId: '',
    enableAutoFines: true,
    gracePeriodDays: 5,
    updatedAt: new Date().toISOString()
  });

  // ==========================================
  // 2. BRANDING & PUBLIC SITE STATE
  // ==========================================
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [clubName, setClubName] = useState('Ananda Recreation Club');
  const [clubAbbreviation, setClubAbbreviation] = useState('ARC');
  const [mainSiteLogo, setMainSiteLogo] = useState('');
  const [useLogo, setUseLogo] = useState(true);
  const [headerTitle, setHeaderTitle] = useState('Ananda Recreation Club');
  const [headerSubtitle, setHeaderSubtitle] = useState('Community & Youth Empowerment Portal');
  const [welcomeHeading, setWelcomeHeading] = useState('Welcome to Ananda Recreation Club');
  const [welcomeMessage, setWelcomeMessage] = useState('Connecting hearts and encouraging excellence.');
  const [aboutText, setAboutText] = useState('Ananda Recreation Club (ARC) is dedicated to youth empowerment, sports, and community engagement in Male\', Maldives.');
  const [copyrightText, setCopyrightText] = useState(`© ${new Date().getFullYear()} Ananda Recreation Club. All Rights Reserved.`);
  const [footerDescription, setFooterDescription] = useState('Official community club website and Ramazan Quiz platform.');

  // ==========================================
  // 3. RAMAZAN QUIZ SETTINGS STATE
  // ==========================================
  const [quizSaving, setQuizSaving] = useState(false);
  const [dailyOpenTime, setDailyOpenTime] = useState('20:00');
  const [dailyCloseTime, setDailyCloseTime] = useState('23:59');
  const [autoClose, setAutoClose] = useState(true);
  const [requireSmsVerification, setRequireSmsVerification] = useState(false);
  const [defaultPrizeTitle, setDefaultPrizeTitle] = useState('ARC Club Ramazan Gift Pack');
  const [defaultPrizeDescription, setDefaultPrizeDescription] = useState('Exclusive club souvenir and sponsor gift voucher.');
  const [defaultSponsorName, setDefaultSponsorName] = useState('Bank of Maldives');
  const [defaultSponsorLogo, setDefaultSponsorLogo] = useState('');
  const [quizTermsAndRules, setQuizTermsAndRules] = useState(
    'ކޮންމެ ދުވަހަކުވެސް ސުވާލަށް ޖަވާބު ދެވޭނީ އެއް ފަހަރުއެވެ. ގުރުއަތުން ހޮވޭ ފަރާތްތަކަށް އިނާމު ހަވާލުކުރެވޭނެއެވެ.'
  );

  // ==========================================
  // 4. WIDGETS CONFIGURATION STATE
  // ==========================================
  const [widgetSettings, setWidgetSettings] = useState<MemberDashboardWidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [widgetsSaving, setWidgetsSaving] = useState(false);

  // ==========================================
  // 5. SECURITY SETTINGS STATE
  // ==========================================
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(15);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(12);
  const [secSaving, setSecSaving] = useState(false);

  // ==========================================
  // 6. HOSTING TIME & TIMEZONE STATE
  // ==========================================
  const [selectedTimezone, setSelectedTimezone] = useState('Indian/Maldives (GMT+05:00)');
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);
  const [timeSaving, setTimeSaving] = useState(false);
  const [liveServerTime, setLiveServerTime] = useState<Date>(new Date());

  // ==========================================
  // 7. CLUB RULES STATE
  // ==========================================
  const [rules, setRules] = useState<ClubRulesData>({
    titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދު 2026',
    titleEnglish: 'Ananda Recreation Club - Official Rules & Regulations (2026)',
    description: 'ކްލަބުގެ މަޤްޞަދުތަކާއި، މެންބަރުންގެ ޙައްޤުތަކާއި މަސްއޫލިއްޔަތުތައް، އަދި ހިންގާ ކޮމިޓީގެ ދައުރާއި އިދާރީ އުޞޫލުތައް ބަޔާންކުރާ ރަސްމީ ޤަވާޢިދު.',
    version: '2.1',
    effectiveDate: '2026-01-01',
    pdfUrl: '',
    pdfFileName: '',
    pdfFileSize: '',
    updatedAt: '',
    updatedByName: '',
    chapters: []
  });
  const [rulesSaving, setRulesSaving] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapTitleDh, setNewChapTitleDh] = useState('');
  const [newChapTitleEn, setNewChapTitleEn] = useState('');
  const [newChapSummary, setNewChapSummary] = useState('');
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);
  const [newArtNum, setNewArtNum] = useState('');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtContent, setNewArtContent] = useState('');

  // ==========================================
  // 8. DATABASE & CLOUD SYNC STATE
  // ==========================================
  const [dbTables, setDbTables] = useState<Array<{ key: string; name: string; nameDh: string; count: number; schema: string; sample: any[] }>>([]);
  const [dbTotalRecords, setDbTotalRecords] = useState(0);
  const [dbLastSynced, setDbLastSynced] = useState<string>('');
  const [dbSyncing, setDbSyncing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [importingDb, setImportingDb] = useState(false);

  // Fetch Database tables summary
  const fetchDbTables = async () => {
    try {
      const res = await api.getDbTables();
      if (res && Array.isArray(res.tables)) {
        setDbTables(res.tables);
        setDbTotalRecords(res.totalRecords || 0);
        setDbLastSynced(res.lastSyncedAt || new Date().toISOString());
      }
    } catch (err: any) {
      console.error('Failed to load DB tables:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getContentSettings().catch(() => ({ settings: [] })),
      api.getContributionSettings().catch(() => null),
      api.getBankAccounts().catch(() => []),
      api.getClubRules().catch(() => null),
      api.getDbTables().catch(() => null)
    ])
      .then(([secRes, contribRes, accountsRes, rulesRes, dbRes]) => {
        const settings = secRes.settings || [];
        const getVal = (g: string, k: string, def: any) => {
          const item = settings.find((s: any) => s.group === g && s.key === k);
          return item !== undefined && item.value !== undefined ? item.value : def;
        };

        // 1. Budget & Invoice Settings
        setBankName(getVal('budget', 'bankName', 'Bank of Maldives (BML)'));
        setAccountName(getVal('budget', 'accountName', 'AANANDHA RECREATION CLUB'));
        setAccountNumber(getVal('budget', 'accountNumber', 'BML | (MVR) 7730000308018'));
        setPaymentInstructionsEn(getVal('budget', 'paymentInstructionsEn', 'Bank Transfer made payable to: Account Name: AANANDHA RECREATION CLUB | Account Number: BML | (MVR) 7730000308018. Please mention invoice number in remarks and send slip to info@arcclub.mv'));
        setPaymentInstructionsDv(getVal('budget', 'paymentInstructionsDv', 'ބޭންކް ޓްރާންސްފަރ މެދުވެރިކޮށް ފައިސާދައްކާނީ AANANDHA RECREATION CLUB އަށެވެ. ޓްރާންސްފަރ ރިމާކްސްގައި އިންވޮއިސް ނަންބަރު ޖެއްސެވުމަށްފަހު ސްލިޕް info@arcclub.mv އަށް ފޮނުއްވާދެއްވުން އެދެމެވެ.'));
        setInvoiceLogo(getVal('budget', 'invoiceLogo', ''));
        setInvoicePhone(getVal('budget', 'invoicePhone', '6580394'));
        setInvoiceEmail(getVal('budget', 'invoiceEmail', 'info@arcclub.mv'));
        setInvoiceAddress(getVal('budget', 'invoiceAddress', 'AANANDHA RECREATION CLUB\nRaa.Maduvvari, 05110\nMaldives'));
        setDefaultInvoicePrefix(getVal('budget', 'defaultInvoicePrefix', 'ARC/INV/'));
        setDefaultQuotationPrefix(getVal('budget', 'defaultQuotationPrefix', 'ARC/QUO/'));
        setDefaultPaymentTerms(getVal('budget', 'defaultPaymentTerms', 'Payment due within 30 days of invoice date'));
        setFooterNoticeEnglish(getVal('budget', 'footerNoticeEnglish', 'For any queries or issues related to the invoice, please notify us within 24hrs.'));
        setFooterNoticeDhivehi(getVal('budget', 'footerNoticeDhivehi', 'ބިލާމެދު އެއްވެސް މައްސަލައެއް އުޅޭނަމަ 24 ގަޑިއިރު ތެރޭގައި އެންގުން އެދެމެވެ.'));

        // Accounts list & Contribution rules
        if (Array.isArray(accountsRes)) {
          setBankAccountsList(accountsRes);
        }
        if (contribRes) {
          setContributionRules(contribRes);
        }

        // 2. Branding & Public Site Settings
        setClubName(getVal('branding', 'clubName', 'Ananda Recreation Club'));
        setClubAbbreviation(getVal('branding', 'clubAbbreviation', 'ARC'));
        setMainSiteLogo(getVal('branding', 'logo', ''));
        setUseLogo(Boolean(getVal('branding', 'useLogo', true)));
        setHeaderTitle(getVal('branding', 'headerTitle', 'Ananda Recreation Club'));
        setHeaderSubtitle(getVal('branding', 'headerSubtitle', 'Community & Youth Empowerment Portal'));
        setWelcomeHeading(getVal('branding', 'welcomeHeading', 'Welcome to Ananda Recreation Club'));
        setWelcomeMessage(getVal('branding', 'welcomeMessage', 'Connecting hearts and encouraging excellence.'));
        setAboutText(getVal('branding', 'aboutText', 'Ananda Recreation Club (ARC) is dedicated to youth empowerment, sports, and community engagement in Male\', Maldives.'));
        setCopyrightText(getVal('branding', 'copyrightText', `© ${new Date().getFullYear()} Ananda Recreation Club. All Rights Reserved.`));
        setFooterDescription(getVal('branding', 'footerDescription', 'Official community club website and Ramazan Quiz platform.'));

        // 3. Quiz Module Settings
        setDailyOpenTime(getVal('quiz', 'dailyOpenTime', '20:00'));
        setDailyCloseTime(getVal('quiz', 'dailyCloseTime', '23:59'));
        setAutoClose(Boolean(getVal('quiz', 'autoClose', true)));
        setRequireSmsVerification(Boolean(getVal('quiz', 'requireSmsVerification', false)));
        setDefaultPrizeTitle(getVal('quiz', 'defaultPrizeTitle', 'ARC Club Ramazan Gift Pack'));
        setDefaultPrizeDescription(getVal('quiz', 'defaultPrizeDescription', 'Exclusive club souvenir and sponsor gift voucher.'));
        setDefaultSponsorName(getVal('quiz', 'defaultSponsorName', 'Bank of Maldives'));
        setDefaultSponsorLogo(getVal('quiz', 'defaultSponsorLogo', ''));
        setQuizTermsAndRules(getVal('quiz', 'quizTermsAndRules', 'ކޮންމެ ދުވަހަކުވެސް ސުވާލަށް ޖަވާބު ދެވޭނީ އެއް ފަހަރުއެވެ. ގުރުއަތުން ހޮވޭ ފަރާތްތަކަށް އިނާމު ހަވާލުކުރެވޭނެއެވެ.'));

        // 4. Member Dashboard Widgets Settings
        setWidgetSettings({
          showWelcomeBanner: Boolean(getVal('widgets', 'showWelcomeBanner', true)),
          showProfileCard: Boolean(getVal('widgets', 'showProfileCard', true)),
          showStatsSummary: Boolean(getVal('widgets', 'showStatsSummary', true)),
          showBadges: Boolean(getVal('widgets', 'showBadges', true)),
          showQuizHistory: Boolean(getVal('widgets', 'showQuizHistory', true)),
          showWinsHistory: Boolean(getVal('widgets', 'showWinsHistory', true)),
          showAttendanceHistory: Boolean(getVal('widgets', 'showAttendanceHistory', true)),
          showClubRulesQuickButton: Boolean(getVal('widgets', 'showClubRulesQuickButton', true)),
          showQuizQuickButton: Boolean(getVal('widgets', 'showQuizQuickButton', true)),
          allowMemberConnectProfile: Boolean(getVal('widgets', 'allowMemberConnectProfile', true)),
        });

        // 5. Security Settings
        setMaxLoginAttempts(Number(getVal('security', 'maxLoginAttempts', 5)));
        setLockoutDurationMinutes(Number(getVal('security', 'lockoutDurationMinutes', 15)));
        setSessionTimeoutHours(Number(getVal('security', 'sessionTimeoutHours', 12)));

        // 6. Timezone & Hosting Time
        const tzVal = getVal('system', 'timezone', getVal('quiz', 'timezone', 'Indian/Maldives (GMT+05:00)'));
        const offsetVal = getVal('system', 'timeOffsetMinutes', 0);
        setSelectedTimezone(tzVal);
        setTimeOffsetMinutes(Number(offsetVal));

        // 7. Club Rules
        if (rulesRes) {
          setRules(rulesRes);
          if (rulesRes.chapters) {
            const exp: Record<string, boolean> = {};
            rulesRes.chapters.forEach((c: any) => { exp[c.id] = true; });
            setExpandedChapters(exp);
          }
        }

        // 8. Database tables
        if (dbRes && Array.isArray(dbRes.tables)) {
          setDbTables(dbRes.tables);
          setDbTotalRecords(dbRes.totalRecords || 0);
          setDbLastSynced(dbRes.lastSyncedAt || new Date().toISOString());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveServerTime(new Date(Date.now() + (timeOffsetMinutes * 60 * 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeOffsetMinutes]);

  // ==========================================
  // HANDLER: SAVE BUDGET & INVOICES SETTINGS
  // ==========================================
  const handleSaveBudgetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBudgetSaving(true);
      const settingsPayload = [
        { group: 'budget', key: 'bankName', value: bankName.trim() },
        { group: 'budget', key: 'accountName', value: accountName.trim() },
        { group: 'budget', key: 'accountNumber', value: accountNumber.trim() },
        { group: 'budget', key: 'paymentInstructionsEn', value: paymentInstructionsEn.trim() },
        { group: 'budget', key: 'paymentInstructionsDv', value: paymentInstructionsDv.trim() },
        { group: 'budget', key: 'invoiceLogo', value: invoiceLogo },
        { group: 'budget', key: 'invoicePhone', value: invoicePhone.trim() },
        { group: 'budget', key: 'invoiceEmail', value: invoiceEmail.trim() },
        { group: 'budget', key: 'invoiceAddress', value: invoiceAddress.trim() },
        { group: 'budget', key: 'defaultInvoicePrefix', value: defaultInvoicePrefix.trim() },
        { group: 'budget', key: 'defaultQuotationPrefix', value: defaultQuotationPrefix.trim() },
        { group: 'budget', key: 'defaultPaymentTerms', value: defaultPaymentTerms.trim() },
        { group: 'budget', key: 'footerNoticeEnglish', value: footerNoticeEnglish.trim() },
        { group: 'budget', key: 'footerNoticeDhivehi', value: footerNoticeDhivehi.trim() },
      ];

      await Promise.all([
        api.updateContentSettings(settingsPayload),
        api.updateContributionSettings(contributionRules)
      ]);

      showToast('success', 'ބަޖެޓް އަދި އިންވޮއިސް ސެޓިންގްސް ސޭވްކުރެވިއްޖެ! (Budget & Invoice Settings Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save budget settings.');
    } finally {
      setBudgetSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE BRANDING & PUBLIC SITE
  // ==========================================
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBrandingSaving(true);
      await api.updateContentSettings([
        { group: 'branding', key: 'clubName', value: clubName },
        { group: 'branding', key: 'clubAbbreviation', value: clubAbbreviation },
        { group: 'branding', key: 'logo', value: mainSiteLogo },
        { group: 'branding', key: 'useLogo', value: useLogo },
        { group: 'branding', key: 'headerTitle', value: headerTitle },
        { group: 'branding', key: 'headerSubtitle', value: headerSubtitle },
        { group: 'branding', key: 'welcomeHeading', value: welcomeHeading },
        { group: 'branding', key: 'welcomeMessage', value: welcomeMessage },
        { group: 'branding', key: 'aboutText', value: aboutText },
        { group: 'branding', key: 'copyrightText', value: copyrightText },
        { group: 'branding', key: 'footerDescription', value: footerDescription }
      ]);
      showToast('success', 'ބްރޭންޑިންގ އަދި ވެބްސައިޓް ސެޓިންގްސް ސޭވްކުރެވިއްޖެ! (Branding Settings Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save branding.');
    } finally {
      setBrandingSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE QUIZ SETTINGS
  // ==========================================
  const handleSaveQuizSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setQuizSaving(true);
      await api.updateContentSettings([
        { group: 'quiz', key: 'dailyOpenTime', value: dailyOpenTime },
        { group: 'quiz', key: 'dailyCloseTime', value: dailyCloseTime },
        { group: 'quiz', key: 'autoClose', value: autoClose },
        { group: 'quiz', key: 'requireSmsVerification', value: requireSmsVerification },
        { group: 'quiz', key: 'defaultPrizeTitle', value: defaultPrizeTitle },
        { group: 'quiz', key: 'defaultPrizeDescription', value: defaultPrizeDescription },
        { group: 'quiz', key: 'defaultSponsorName', value: defaultSponsorName },
        { group: 'quiz', key: 'defaultSponsorLogo', value: defaultSponsorLogo },
        { group: 'quiz', key: 'quizTermsAndRules', value: quizTermsAndRules },
      ]);
      showToast('success', 'ރަމަޟާން ކުއިޒް ސެޓިންގްސް ސޭވްކުރެވިއްޖެ! (Quiz Settings Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save quiz settings.');
    } finally {
      setQuizSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE WIDGET SETTINGS
  // ==========================================
  const handleSaveWidgetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setWidgetsSaving(true);
      const list = Object.entries(widgetSettings).map(([key, value]) => ({
        group: 'widgets',
        key,
        value
      }));
      await api.updateContentSettings(list);
      showToast('success', 'މެންބަރުންގެ ޑޭޝްބޯޑް ވިޖެޓްސް ސޭވްކުރެވިއްޖެ! (Widget Settings Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save widget settings.');
    } finally {
      setWidgetsSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE SECURITY
  // ==========================================
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSecSaving(true);
      await api.updateContentSettings([
        { group: 'security', key: 'maxLoginAttempts', value: maxLoginAttempts },
        { group: 'security', key: 'lockoutDurationMinutes', value: lockoutDurationMinutes },
        { group: 'security', key: 'sessionTimeoutHours', value: sessionTimeoutHours }
      ]);
      showToast('success', 'ސެކިއުރިޓީ ސެޓިންގްސް ސޭވްކުރެވިއްޖެ! (Security settings saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save security settings.');
    } finally {
      setSecSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE TIMEZONE / HOSTING TIME
  // ==========================================
  const handleSaveTimezoneSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTimeSaving(true);
      await api.updateContentSettings([
        { group: 'system', key: 'timezone', value: selectedTimezone },
        { group: 'quiz', key: 'timezone', value: selectedTimezone },
        { group: 'system', key: 'timeOffsetMinutes', value: timeOffsetMinutes }
      ]);
      showToast('success', 'ހޯސްޓިންގް ޓައިމް އަދި ޓައިމްޒޯން ސެޓިންގްސް ސޭވްކުރެވިއްޖެ! (Hosting Time Settings Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save hosting time settings.');
    } finally {
      setTimeSaving(false);
    }
  };

  // ==========================================
  // HANDLER: SAVE CLUB RULES
  // ==========================================
  const handleSaveRules = async () => {
    try {
      setRulesSaving(true);
      const res = await api.updateClubRules(rules);
      setRules(res);
      showToast('success', 'ޤަވާޢިދު ކާމިޔާބުކަމާއެކު ސޭވްކުރެވިއްޖެ! (Club Rules Saved)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save rules.');
    } finally {
      setRulesSaving(false);
    }
  };

  // Database Handlers
  const handleManualSync = async () => {
    try {
      setDbSyncing(true);
      await api.syncDb();
      showToast('success', 'ޑޭޓާބޭސް ކާމިޔާބުކަމާއެކު ސިންކު ކުރެވިއްޖެ! (Database synced successfully)');
      await fetchDbTables();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to sync database.');
    } finally {
      setDbSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const blob = await api.exportDbBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ARC_Club_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('success', 'ޑޭޓާބޭސް ބެކްއަޕް ޑައުންލޯޑް ކުރެވިއްޖެ! (Database backup downloaded)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to export database backup.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setImportingDb(true);
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON file structure');
        }
        await api.importDbSnapshot(parsed);
        showToast('success', 'ޑޭޓާބޭސް ބެކްއަޕް ކާމިޔާބުކަމާއެކު ރީސްޓޯ ކުރެވިއްޖެ!');
        await fetchDbTables();
      } catch (err: any) {
        showToast('error', err.message || 'Failed to import database snapshot.');
      } finally {
        setImportingDb(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are supported.');
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRules(prev => ({
        ...prev,
        pdfUrl: dataUrl,
        pdfFileName: file.name,
        pdfFileSize: sizeMb
      }));
      showToast('success', `PDF Document "${file.name}" uploaded.`);
    };
    reader.readAsDataURL(file);
  };

  if (!loading && !isAdmin) {
    return (
      <PortalLayout currentModule="settings" title="އެޑްމިން ސެޓިންގްސް (Admin Settings)">
        <div className="py-20 px-4 text-center space-y-4 max-w-md mx-auto" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-heading text-white">
            އެޑްމިން އެކްސެސް އެކަނި (Admin Access Only)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            އެޑްމިން ސެޓިންގްސް ބެއްލެވޭނީ އަދި ބަދަލުކުރެއްވޭނީ ކްލަބުގެ އެޑްމިން ޔޫޒަރުންނަށް އެކަނި. އިތުރު މަޢުލޫމާތަށް ސިސްޓަމް އެޑްމިނިސްޓްރޭޓަރާ ގުޅުއްވާ.
          </p>
          <a
            href="/portal/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition mt-2"
          >
            ޑޭޝްބޯޑަށް އެނބުރިވަޑައިގަންނަވާ
          </a>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout currentModule="settings" title="އެޑްމިން ސެޓިންގްސް (Admin Settings)">
      <div className="space-y-6 max-w-6xl" dir="rtl">

        {/* Page Top Header Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>Unified Module Control Center</span>
            </div>
            <h2 className="text-2xl font-black text-white font-heading">
              އެޑްމިން ސެޓިންގްސް (Admin Settings & Modules Configuration)
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              ކްލަބް ޕޯޓަލްގެ ހުރިހާ މޮޑިއުލްތަކުގެ ސެޓިންގްސް — ބަޖެޓް، އިންވޮއިސް ބްރޭންޑިންގ، ބޭންކް ޓްރާންސްފަރ އިރުޝާދު، ރަމަޟާން ކުއިޒް، ވެބްސައިޓް ބްރޭންޑިންގ އަދި ސެކިއުރިޓީ.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={dbSyncing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin text-orange-400' : ''}`} />
              <span>{dbSyncing ? 'ސިންކުވަނީ...' : 'ސިންކު ޗެކް'}</span>
            </button>
          </div>
        </div>

        {/* Horizontal Tab Navigation Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto shadow-lg">
          {[
            { id: 'budget', labelEn: 'Budget & Invoices', labelDv: 'ބަޖެޓް އަދި އިންވޮއިސް', icon: Receipt },
            { id: 'branding', labelEn: 'Branding & Website', labelDv: 'ބްރޭންޑިންގ އަދި ވެބްސައިޓް', icon: Palette },
            { id: 'quiz', labelEn: 'Ramazan Quiz', labelDv: 'ރަމަޟާން ކުއިޒް', icon: Moon },
            { id: 'widgets', labelEn: 'Dashboard Widgets', labelDv: 'ޑޭޝްބޯޑް ވިޖެޓްސް', icon: LayoutDashboard },
            { id: 'security', labelEn: 'Security & Limits', labelDv: 'ސެކިއުރިޓީ', icon: Shield },
            { id: 'hosting_time', labelEn: 'Hosting Time', labelDv: 'ހޯސްޓިންގް ޓައިމް', icon: Clock },
            { id: 'rules', labelEn: 'Club Rules', labelDv: 'ކްލަބް ޤަވާޢިދު', icon: BookOpen },
            { id: 'database', labelEn: 'Supabase / DB', labelDv: 'ޑޭޓާބޭސް', icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  handleTabSelect(tab.id as SettingsTab);
                  if (tab.id === 'database') fetchDbTables();
                }}
                className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.labelDv} ({tab.labelEn})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">ސެޓިންގްސް ލޯޑުވަނީ...</p>
          </div>
        ) : activeTab === 'budget' ? (

          /* =========================================================
             TAB 1: BUDGET & INVOICE SETTINGS
             ========================================================= */
          <form onSubmit={handleSaveBudgetSettings} className="space-y-6">
            
            {/* 1.1 Payment Instructions & Bank Transfer Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <span>ބޭންކް ޓްރާންސްފަރ އަދި ފައިސާ ދެއްކުމުގެ އިރުޝާދު (Payment Instructions & Bank Account)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    އިންވޮއިސްތަކާއި، ކޯޓޭޝަންތަކުގައި އަދި ފައިސާ ބަލައިގަތުމުގެ ރިސިޕްޓުތަކުގައި ދައްކާނެ ރަސްމީ އެކައުންޓް އަދި ޓްރާންސްފަރ އިރުޝާދު.
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                  BML 7730000308018
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ބޭންކް ނަން (Bank Transfer Made Payable To) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="Bank of Maldives (BML)"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. Bank of Maldives (BML)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    އެކައުންޓް ނަން (Account Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="AANANDHA RECREATION CLUB"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. AANANDHA RECREATION CLUB</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    އެކައުންޓް ނަންބަރު (Account Number) *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="BML | (MVR) 7730000308018"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. BML | (MVR) 7730000308018</span>
                </div>
              </div>

              {/* Detailed Payment Instructions Text */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    އިނގިރޭސި އިރުޝާދު (Payment Instructions - English)
                  </label>
                  <textarea
                    rows={3}
                    value={paymentInstructionsEn}
                    onChange={e => setPaymentInstructionsEn(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                    placeholder="Bank Transfer made payable to..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ދިވެހި އިރުޝާދު (Payment Instructions - Dhivehi)
                  </label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={paymentInstructionsDv}
                    onChange={e => setPaymentInstructionsDv(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                    placeholder="ބޭންކް ޓްރާންސްފަރ މެދުވެރިކޮށް ފައިސާދައްކާނީ..."
                  />
                </div>
              </div>
            </div>

            {/* 1.2 Official Invoice & Quotation Branding & Logo Upload */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-400" />
                    <span>އިންވޮއިސް ލޯގޯ އަދި ބްރޭންޑިންގ (Invoice & Quotation Branding)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    އިންވޮއިސް އަދި ކޯޓޭޝަން ޕީޑީއެފްގައި ދައްކާނެ ރަސްމީ ކްލަބް ލޯގޯ، ގުޅޭނެ ނަންބަރު، އީމެއިލް އަދި އެޑްރެސް.
                  </p>
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-6 space-y-3">
                  <ImageUploadInput
                    label="އިންވޮއިސް އަދި ކޯޓޭޝަން ލޯގޯ (Invoice Official Logo)"
                    value={invoiceLogo}
                    onChange={setInvoiceLogo}
                    placeholder="Upload high-res PNG / SVG Logo for Invoices..."
                  />
                  <span className="text-[11px] text-slate-400 block leading-relaxed">
                    ހުދު ނުވަތަ ޓްރާންސްޕޭރަންޓް ބެކްގްރައުންޑެއް ހުރި ހައި-ރިޒޮލިއުޝަން ޕީއެންޖީ ނުވަތަ އެސްވީޖީ ފައިލެއް އަޕްލޯޑު ކުރައްވާ. ލޯގޯ ނެތްނަމަ އޭއާރްސީގެ ރަސްމީ ނިޝާން އޮޓޮމެޓިކުން ދައްކާނެއެވެ.
                  </span>
                </div>

                {/* Live Invoice Preview Box */}
                <div className="md:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 block">
                    ލައިވް އިންވޮއިސް ޕްރިވިއު (Live Invoice Header Preview)
                  </span>

                  <div className="bg-white text-slate-900 p-4 rounded-xl shadow-inner border border-slate-200 space-y-3" dir="ltr">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        {invoiceLogo ? (
                          <img src={invoiceLogo} alt="Invoice Logo" className="max-h-12 max-w-[120px] object-contain" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                            ARC
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-none">AANANDHA RECREATION CLUB</div>
                          <div className="text-[9px] font-semibold text-red-600 uppercase tracking-wider mt-0.5">NGO • R. MADUVVARI</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-red-600 uppercase">INVOICE</span>
                        <div className="text-[10px] font-mono text-slate-500">ARC/INV/2026/0001</div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-700 space-y-0.5">
                      <div className="font-bold text-slate-900 uppercase">Payment Instructions</div>
                      <div>Bank: <strong className="text-slate-900">{bankName || 'Bank of Maldives (BML)'}</strong></div>
                      <div>Account: <strong className="text-slate-900">{accountName || 'AANANDHA RECREATION CLUB'}</strong></div>
                      <div>Acc No: <strong className="text-slate-900 font-mono">{accountNumber || 'BML | (MVR) 7730000308018'}</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Contact & Defaults */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    ފޯނު ނަންބަރު (Invoice Phone)
                  </label>
                  <input
                    type="text"
                    value={invoicePhone}
                    onChange={e => setInvoicePhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    އީމެއިލް (Invoice Email)
                  </label>
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={e => setInvoiceEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    އިދާރީ އެޑްރެސް (Invoice Address)
                  </label>
                  <input
                    type="text"
                    value={invoiceAddress}
                    onChange={e => setInvoiceAddress(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Prefixes and Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    އިންވޮއިސް ޕްރީފިކްސް (Invoice Prefix)
                  </label>
                  <input
                    type="text"
                    value={defaultInvoicePrefix}
                    onChange={e => setDefaultInvoicePrefix(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    ކޯޓޭޝަން ޕްރީފިކްސް (Quotation Prefix)
                  </label>
                  <input
                    type="text"
                    value={defaultQuotationPrefix}
                    onChange={e => setDefaultQuotationPrefix(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                    ފައިސާ ދެއްކުމުގެ މުއްދަތު (Default Payment Terms)
                  </label>
                  <input
                    type="text"
                    value={defaultPaymentTerms}
                    onChange={e => setDefaultPaymentTerms(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* 1.3 Membership Contribution & Subscription Rules */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-teal-400" />
                    <span>މެންބަރޝިޕް ފީ އަދި ޖޫރިމަނާގެ އުސޫލުތައް (Membership Fee & Contribution Rules)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    މަހު ފީ، ފީ ދައްކަންޖެހޭ ތާރީޚް، އަހަރީ އެޑްވާންސް ޑިސްކައުންޓް، އަދި ޖޫރިމަނާ ހިސާބުކުރާ އުސޫލު.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    މަހު ފީ - ރުފިޔާއިން (Monthly Fee MVR) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={contributionRules.monthlyFee}
                    onChange={e => setContributionRules({ ...contributionRules, monthlyFee: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    މަހު ފީ ދައްކަންޖެހޭ ދުވަސް (Due Day of Month) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={contributionRules.dueDayOfMonth}
                    onChange={e => setContributionRules({ ...contributionRules, dueDayOfMonth: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. 5th of every month</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ލަސްވާ ކޮންމެ ދުވަހަކަށް ޖޫރިމަނާ (Daily Overdue Fine MVR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={contributionRules.finePerDay}
                    onChange={e => setContributionRules({ ...contributionRules, finePerDay: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    އަހަރީ އެޑްވާންސް ޑިސްކައުންޓް (Advance Discount Months Free)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={contributionRules.annualAdvanceDiscountMonths}
                    onChange={e => setContributionRules({ ...contributionRules, annualAdvanceDiscountMonths: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-emerald-400 mt-1 block">12 މަސް އެއްފަހަރާ ދެއްކުމުން 2 މަސް ހިލޭ</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ގްރޭސް ޕީރިއަޑް (Grace Period Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={contributionRules.gracePeriodDays}
                    onChange={e => setContributionRules({ ...contributionRules, gracePeriodDays: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ފީ ޖަމާވާނެ ޑިފޯލްޓް އެކައުންޓް (Default Deposit Account)
                  </label>
                  <select
                    value={contributionRules.defaultDepositAccountId}
                    onChange={e => setContributionRules({ ...contributionRules, defaultDepositAccountId: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="">-- ބޭންކް އެކައުންޓް އިޚްތިޔާރުކުރައްވާ --</option>
                    {bankAccountsList.map(a => (
                      <option key={a.id} value={a.id}>{a.accountName} ({a.accountNumber})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contributionRules.enableAutoFines}
                    onChange={e => setContributionRules({ ...contributionRules, enableAutoFines: e.target.checked })}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    ސުންގަޑި ހަމަވުމުން އޮޓޮމެޓިކުން ޖޫރިމަނާ އިތުރުކުރާގޮތަށް ހަމަޖެއްސުން (Auto-Apply Overdue Fines)
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button for Budget Settings */}
            <div className="flex justify-start">
              <button
                type="submit"
                disabled={budgetSaving}
                className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{budgetSaving ? 'ސޭވްވަނީ...' : 'ބަޖެޓް އަދި އިންވޮއިސް ސެޓިންގްސް ސޭވްކުރައްވާ (Save Budget Settings)'}</span>
              </button>
            </div>
          </form>

        ) : activeTab === 'branding' ? (

          /* =========================================================
             TAB 2: BRANDING & PUBLIC SITE SETTINGS
             ========================================================= */
          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                  <Palette className="w-5 h-5 text-orange-400" />
                  <span>ކްލަބް ބްރޭންޑިންގ އަދި ވެބްސައިޓް (Club Branding & Public Website)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ޕަބްލިކް ވެބްސައިޓްގެ މައި ލޯގޯ، ނަން، ވެލްކަމް ބެނަރ އަދި ފުޓަރ ޓެކްސްޓްތައް.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ކްލަބްގެ ފުރިހަމަ ނަން (Club Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={clubName}
                      onChange={e => setClubName(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ކްލަބްގެ ކުރު ނަން (Club Abbreviation) *
                    </label>
                    <input
                      type="text"
                      required
                      value={clubAbbreviation}
                      onChange={e => setClubAbbreviation(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ހެޑަރ ޓައިޓްލް (Header Title)
                    </label>
                    <input
                      type="text"
                      value={headerTitle}
                      onChange={e => setHeaderTitle(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ހެޑަރ ސަބްޓައިޓްލް (Header Subtitle)
                    </label>
                    <input
                      type="text"
                      value={headerSubtitle}
                      onChange={e => setHeaderSubtitle(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <ImageUploadInput
                    label="ވެބްސައިޓް މައި ލޯގޯ (Public Website Main Logo)"
                    value={mainSiteLogo}
                    onChange={setMainSiteLogo}
                    placeholder="Upload public website header logo..."
                  />

                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLogo}
                        onChange={e => setUseLogo(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-950 border-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-200">
                        ވެބްސައިޓް ހެޑަރގައި ލޯގޯ އިމޭޖް ދެއްކުމަށް އެނޭބަލްކުރުން (Display Logo Image)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Welcome & About Texts */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ވެލްކަމް ހެޑިންގ (Welcome Heading)
                    </label>
                    <input
                      type="text"
                      value={welcomeHeading}
                      onChange={e => setWelcomeHeading(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ވެލްކަމް މެސެޖް (Welcome Message)
                    </label>
                    <input
                      type="text"
                      value={welcomeMessage}
                      onChange={e => setWelcomeMessage(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ކްލަބާ ބެހޭ މަޢުލޫމާތު (About Club Overview)
                  </label>
                  <textarea
                    rows={3}
                    value={aboutText}
                    onChange={e => setAboutText(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ކޮޕީރައިޓް ޓެކްސްޓް (Copyright Notice)
                    </label>
                    <input
                      type="text"
                      value={copyrightText}
                      onChange={e => setCopyrightText(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                      ފުޓަރ ޑިސްކްރިޕްޝަން (Footer Description)
                    </label>
                    <input
                      type="text"
                      value={footerDescription}
                      onChange={e => setFooterDescription(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={brandingSaving}
                  className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{brandingSaving ? 'ސޭވްވަނީ...' : 'ބްރޭންޑިންގ ސެޓިންގްސް ސޭވްކުރައްވާ (Save Branding)'}</span>
                </button>
              </div>
            </div>
          </form>

        ) : activeTab === 'quiz' ? (

          /* =========================================================
             TAB 3: RAMAZAN QUIZ SETTINGS
             ========================================================= */
          <form onSubmit={handleSaveQuizSettings} className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                  <Moon className="w-5 h-5 text-amber-400" />
                  <span>ރަމަޟާން ކުއިޒް މޮޑިއުލް ސެޓިންގްސް (Ramazan Quiz Settings)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ކުއިޒްގެ ދުވަހީ ސުވާލު ހުޅުވޭ އަދި ބަންދުވާ ގަޑިތައް، ސްޕޮންސަރުން، އަދި ޤަވާޢިދުތައް.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ސުވާލު ހުޅުވޭ ގަޑި (Daily Open Time) *
                  </label>
                  <input
                    type="time"
                    required
                    value={dailyOpenTime}
                    onChange={e => setDailyOpenTime(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ސުވާލު ބަންދުވާ ގަޑި (Daily Close Time) *
                  </label>
                  <input
                    type="time"
                    required
                    value={dailyCloseTime}
                    onChange={e => setDailyCloseTime(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ޑިފޯލްޓް އިނާމުގެ ނަން (Default Prize Title)
                  </label>
                  <input
                    type="text"
                    value={defaultPrizeTitle}
                    onChange={e => setDefaultPrizeTitle(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    މައި ސްޕޮންސަރު (Main Sponsor)
                  </label>
                  <input
                    type="text"
                    value={defaultSponsorName}
                    onChange={e => setDefaultSponsorName(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <ImageUploadInput
                  label="ސްޕޮންސަރުގެ ލޯގޯ (Sponsor Official Logo)"
                  value={defaultSponsorLogo}
                  onChange={setDefaultSponsorLogo}
                  placeholder="Upload Sponsor Logo..."
                />

                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                    ކުއިޒްގެ އުސޫލުތަކާއި ޤަވާޢިދު (Quiz Terms & Rules)
                  </label>
                  <textarea
                    rows={4}
                    dir="rtl"
                    value={quizTermsAndRules}
                    onChange={e => setQuizTermsAndRules(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClose}
                    onChange={e => setAutoClose(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    ސުންގަޑި ހަމަވުމުން އޮޓޮމެޓިކުން ސުވާލު ބަންދުކުރުން (Auto-Close Active Questions)
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireSmsVerification}
                    onChange={e => setRequireSmsVerification(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    ޖަވާބު ފޮނުވުމުގެ ކުރިން އެސްއެމްއެސް އައިޑީ ކަށަވަރުކުރުން (Require Identity Verification)
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={quizSaving}
                  className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{quizSaving ? 'ސޭވްވަނީ...' : 'ކުއިޒް ސެޓިންގްސް ސޭވްކުރައްވާ (Save Quiz Settings)'}</span>
                </button>
              </div>
            </div>
          </form>

        ) : activeTab === 'widgets' ? (

          /* =========================================================
             TAB 4: MEMBER DASHBOARD WIDGETS
             ========================================================= */
          <form onSubmit={handleSaveWidgetSettings} className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-orange-400" />
                  <span>މެންބަރުންގެ ޑޭޝްބޯޑް ވިޖެޓްސް ކޮންފިގަރޭޝަން (Member Dashboard Widgets)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  މެންބަރުން ޕޯޓަލަށް ލޮގިންވުމުން ޑޭޝްބޯޑުގައި ދައްކާނެ ވިޖެޓްތަކާއި ޚާއްޞަ ބަޓަންތައް ކޮންޓްރޯލްކުރުން.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'showWelcomeBanner', title: 'ވެލްކަމް ބެނަރ (Welcome Banner Card)', desc: 'މެންބަރުގެ ނަމާއި ރަސްމީ މަރުޙަބާ މެސެޖް ދެއްކުން' },
                  { key: 'showProfileCard', title: 'ޕްރޯފައިލް ކާޑު (Profile Card)', desc: 'މެންބަރުގެ ފޮޓޯ، އައިޑީ އަދި މަޤާމު ދެއްކުން' },
                  { key: 'showStatsSummary', title: 'މާލީ އަދި ޙަރަކާތްތަކުގެ ޚުލާޞާ (Stats Summary Widget)', desc: 'ފީ ދައްކާފައިވާ މިންވަރާއި ޙާޟިރީ ދެއްކުން' },
                  { key: 'showBadges', title: 'ބެޖްތަކާއި ކާމިޔާބީ (Badges & Awards)', desc: 'މެންބަރަށް ލިބިފައިވާ ރަސްމީ ބެޖްތައް ދެއްކުން' },
                  { key: 'showQuizHistory', title: 'ކުއިޒް ޖަވާބުތަކުގެ ތާރީޚް (Quiz Participation History)', desc: 'ބައިވެރިވި ސުވާލުތަކާއި ޕޮއިންޓް ދެއްކުން' },
                  { key: 'showWinsHistory', title: 'ލިބުނު އިނާމުތަކުގެ ރެކޯޑު (Quiz Wins & Prizes)', desc: 'ގުރުއަތުން ލިބުނު އިނާމުތަކުގެ ލިސްޓު ދެއްކުން' },
                  { key: 'showAttendanceHistory', title: 'ޙާޟިރީ އަދި ބައްދަލުވުންތައް (Attendance Records)', desc: 'ކްލަބް އިވެންޓްތަކުގެ ޙާޟިރީ ތާރީޚް ދެއްކުން' },
                  { key: 'showClubRulesQuickButton', title: 'ޤަވާޢިދު ބަޓަން (Club Rules Quick Button)', desc: 'ޤަވާޢިދު ބަލާލުމަށް އަވަސް ބަޓަނެއް ދެއްކުން' },
                  { key: 'showQuizQuickButton', title: 'ކުއިޒް ބަޓަން (Ramazan Quiz Quick Button)', desc: 'މިއަދުގެ ސުވާލަށް އަވަހަށް ދިއުމުގެ ބަޓަން' },
                  { key: 'allowMemberConnectProfile', title: 'މެންބަރުންގެ ގުޅުން (Member Connect Feature)', desc: 'އެހެން މެންބަރުންނާ ގުޅުމަށް ޕްރޯފައިލް ފެންނަގޮތް ހެދުން' },
                ].map(item => {
                  const isChecked = Boolean((widgetSettings as any)[item.key]);
                  return (
                    <div
                      key={item.key}
                      onClick={() => setWidgetSettings({ ...widgetSettings, [item.key]: !isChecked })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isChecked
                          ? 'bg-slate-950 border-orange-500/40 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white">{item.title}</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isChecked ? <Check className="w-4 h-4" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="submit"
                  disabled={widgetsSaving}
                  className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{widgetsSaving ? 'ސޭވްވަނީ...' : 'ވިޖެޓްސް ސެޓިންގްސް ސޭވްކުރައްވާ (Save Widget Settings)'}</span>
                </button>
              </div>
            </div>
          </form>

        ) : activeTab === 'security' ? (

          /* =========================================================
             TAB 5: SECURITY & LIMITS
             ========================================================= */
          <form onSubmit={handleSaveSecurity} className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2 border-b border-slate-800 pb-4">
                <Shield className="w-5 h-5 text-orange-400" />
                <span>އޮތެންޓިކޭޝަން އަދި ސެކިއުރިޓީ އުޞޫލުތައް (Security & Limits)</span>
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  ލޮގިން ނުވެވޭ ގޮތަށް އެކައުންޓް ލޮކްވާނެ ނުބައި ޕިން އަދަދު (Max Login Attempts)
                </label>
                <input
                  type="number"
                  required
                  min={3}
                  max={10}
                  disabled={!isAdmin}
                  value={maxLoginAttempts}
                  onChange={e => setMaxLoginAttempts(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ކަނޑައެޅިފައިވާ އަދަދަށްވުރެ ގިނައިން ނުބައި ޕިން ކޯޑު ޖެހުމުން އެކައުންޓް ވަގުތީގޮތުން ލޮކްވާނެއެވެ.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  އެކައުންޓް ލޮކްވެފައި ހުންނާނެ މުއްދަތު - މިނެޓުން (Lockout Duration Minutes)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  disabled={!isAdmin}
                  value={lockoutDurationMinutes}
                  onChange={e => setLockoutDurationMinutes(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  ސެޝަން އެކްސްޕަޔަރ ވާނެ މުއްދަތު - ގަޑިއިރުން (Session Timeout Hours)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={72}
                  disabled={!isAdmin}
                  value={sessionTimeoutHours}
                  onChange={e => setSessionTimeoutHours(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={secSaving}
                    className="px-8 py-3.5 rounded-2xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400 flex items-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{secSaving ? 'ސޭވްވަނީ...' : 'ސެކިއުރިޓީ ސެޓިންގްސް ސޭވްކުރައްވާ'}</span>
                  </button>
                </div>
              )}
            </div>
          </form>

        ) : activeTab === 'hosting_time' ? (

          /* =========================================================
             TAB 6: HOSTING TIME & TIMEZONE
             ========================================================= */
          <form onSubmit={handleSaveTimezoneSettings} className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-400" />
                  <span>ސިސްޓަމް ހޯސްޓިންގް ޓައިމް އަދި ޓައިމްޒޯން (Server Hosting Time & Timezone)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ކުއިޒް ޓައިމަރުތަކާއި، ސުވާލު ހުޅުވޭ ގަޑިތަކާއި، އަދި ގުރާތައް އެއްހަމައެއްގައި ހިންގުމަށް ބޭނުންކުރާ ރަސްމީ ސާވަރު ގަޑި.
                </p>
              </div>

              {/* Live Official Clock Display Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">ރަސްމީ ހޯސްޓިންގް ގަޑި (Official Hosting Clock)</span>
                  <div className="text-3xl font-black font-mono text-white flex items-center gap-2 justify-center sm:justify-start">
                    <Clock className="w-6 h-6 text-emerald-400 animate-pulse" />
                    <span>
                      {liveServerTime.toLocaleTimeString('en-GB', { hour12: false })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    {liveServerTime.toLocaleDateString('en-GB')} — {selectedTimezone}
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono text-center shrink-0">
                  ● Synced Server Clock
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  ސިސްޓަމް ޓައިމްޒޯން (System Timezone) *
                </label>
                <select
                  disabled={!isAdmin}
                  value={selectedTimezone}
                  onChange={e => setSelectedTimezone(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                >
                  <option value="Indian/Maldives (GMT+05:00)">Indian/Maldives (GMT+05:00) - Maldives Standard Time</option>
                  <option value="UTC (GMT+00:00)">UTC (GMT+00:00) - Coordinated Universal Time</option>
                  <option value="Asia/Dubai (GMT+04:00)">Asia/Dubai (GMT+04:00) - Gulf Standard Time</option>
                  <option value="Asia/Kolkata (GMT+05:30)">Asia/Kolkata (GMT+05:30) - India Standard Time</option>
                  <option value="Asia/Singapore (GMT+08:00)">Asia/Singapore (GMT+08:00) - Singapore Time</option>
                  <option value="Europe/London (GMT+00:00)">Europe/London (GMT+00:00) - London Time</option>
                  <option value="America/New_York (GMT-05:00)">America/New_York (GMT-05:00) - Eastern Time</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  ގަޑި އެޖަސްޓްމަންޓް - މިނެޓުން (Server Time Adjustment Offset in Minutes)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={timeOffsetMinutes}
                  onChange={e => setTimeOffsetMinutes(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-start">
                  <button
                    type="submit"
                    disabled={timeSaving}
                    className="px-8 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{timeSaving ? 'ސޭވްވަނީ...' : 'ހޯސްޓިންގް ޓައިމް ސޭވްކުރައްވާ (Save Hosting Time)'}</span>
                  </button>
                </div>
              )}
            </div>
          </form>

        ) : activeTab === 'rules' ? (

          /* =========================================================
             TAB 7: CLUB RULES & CONSTITUTION
             ========================================================= */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-400" />
                    <span>ކްލަބުގެ ރަސްމީ ހިންގާ ޤަވާޢިދު (Official Club Rules & Constitution)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    ކްލަބުގެ ބާބުތަކާއި، މާއްދާތައް އަދި އިދާރީ އުޞޫލުތައް.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-4 h-4 text-orange-400" />
                    <span>ޕްރިވިއު (Preview)</span>
                  </button>
                  <a
                    href="/portal/club-rules"
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>ޤަވާޢިދު މޮޑިއުލަށް ވަޑައިގަންނަވާ</span>
                  </a>
                </div>
              </div>

              {/* Upload PDF Section */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span>ރަސްމީ ޤަވާޢިދުގެ ޕީޑީއެފް ފައިލް (Official Constitution PDF)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {rules.pdfFileName ? `Current: ${rules.pdfFileName} (${rules.pdfFileSize || 'Ready'})` : 'No official PDF document uploaded yet.'}
                  </p>
                </div>

                <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span>{rules.pdfFileName ? 'ފައިލް ބަދަލުކުރައްވާ (Change PDF)' : 'ޕީޑީއެފް އަޕްލޯޑު (Upload PDF)'}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

        ) : (

          /* =========================================================
             TAB 8: DATABASE & CLOUD FIRESTORE
             ========================================================= */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                      <span>ޑޭޓާބޭސް އަދި ކްލައުޑް ސިންކު (Database Management & Sync)</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                        Connected & Active
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ޕޯޓަލްގެ ހުރިހާ ޑޭޓާބޭސް ކަލެކްޝަންތަކާއި، ރެކޯޑުތަކުގެ އަދަދު އަދި ބެކްއަޕް.
                    </p>
                  </div>
                </div>

                {/* Quick DB Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={dbSyncing}
                    className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin' : ''}`} />
                    <span>{dbSyncing ? 'ސިންކުވަނީ...' : 'ޑޭޓާބޭސް ސިންކު'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-orange-400" />
                    <span>ބެކްއަޕް (Export JSON)</span>
                  </button>

                  {isAdmin && (
                    <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>{importingDb ? 'ރީސްޓޯވަނީ...' : 'ރީސްޓޯ (Import JSON)'}</span>
                      <input
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportJson}
                        disabled={importingDb}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">ޖުމްލަ ޓޭބަލްތައް (Total Tables)</span>
                  <div className="text-2xl font-black font-mono text-white">{dbTables.length || 18}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">ޖުމްލަ ރެކޯޑު (Total Live Records)</span>
                  <div className="text-2xl font-black font-mono text-orange-400">{dbTotalRecords || 120}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">ފަހުން ސިންކުކުރި (Last Synced)</span>
                  <div className="text-xs font-mono text-emerald-400 truncate mt-1">
                    {dbLastSynced ? new Date(dbLastSynced).toLocaleString('en-GB') : 'Just now'}
                  </div>
                </div>
              </div>

              {/* Table List Grid */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-300 uppercase">
                  ޑޭޓާބޭސް ކަލެކްޝަންތަކުގެ ތަފްޞީލް (Collections Overview)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {dbTables.map(t => (
                    <div
                      key={t.key}
                      onClick={() => setSelectedTable(t)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selectedTable?.key === t.key
                          ? 'bg-slate-950 border-orange-500 shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{t.nameDh}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">{t.schema}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-mono font-bold shrink-0">
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Club Rules Preview Modal */}
        {isPreviewModalOpen && (
          <ClubRulesModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            rules={rules}
          />
        )}

      </div>
    </PortalLayout>
  );
};
