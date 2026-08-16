import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { ClubRulesData, ClubRuleChapter, ClubRuleArticle } from '../../types';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
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
  Check
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

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'security' | 'database' | 'hosting_time' | 'widgets'>('hosting_time');

  // Check if current user is Admin
  const isAdmin = Boolean(
    user && (
      user.roleName === 'Admin' ||
      user.roleId === 'role_admin' ||
      user.roleName.toLowerCase().includes('admin')
    )
  );

  // Member Dashboard Widgets Configuration State
  const [widgetSettings, setWidgetSettings] = useState<MemberDashboardWidgetSettings>(DEFAULT_WIDGET_SETTINGS);
  const [widgetsSaving, setWidgetsSaving] = useState(false);

  // Hosting Time & Timezone State
  const [selectedTimezone, setSelectedTimezone] = useState('Indian/Maldives (GMT+05:00)');
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);
  const [timeSaving, setTimeSaving] = useState(false);
  const [liveServerTime, setLiveServerTime] = useState<Date>(new Date());

  // Security Settings State
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(15);
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState(12);
  const [secSaving, setSecSaving] = useState(false);

  // Database Management & Sync State
  const [dbTables, setDbTables] = useState<Array<{ key: string; name: string; nameDh: string; count: number; schema: string; sample: any[] }>>([]);
  const [dbTotalRecords, setDbTotalRecords] = useState(0);
  const [dbLastSynced, setDbLastSynced] = useState<string>('');
  const [dbSyncing, setDbSyncing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [importingDb, setImportingDb] = useState(false);

  // Club Rules State
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

  // Chapter / Article Editor States
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapTitleDh, setNewChapTitleDh] = useState('');
  const [newChapTitleEn, setNewChapTitleEn] = useState('');
  const [newChapSummary, setNewChapSummary] = useState('');

  // Article Modal State
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);
  const [newArtNum, setNewArtNum] = useState('');
  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtContent, setNewArtContent] = useState('');

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
      api.getClubRules().catch(() => null),
      api.getDbTables().catch(() => null)
    ])
      .then(([secRes, rulesRes, dbRes]) => {
        // Parse Security Settings
        const settings = secRes.settings || [];
        const getVal = (g: string, k: string, def: any) =>
          settings.find((s: any) => s.group === g && s.key === k)?.value ?? def;

        setMaxLoginAttempts(Number(getVal('security', 'maxLoginAttempts', 5)));
        setLockoutDurationMinutes(Number(getVal('security', 'lockoutDurationMinutes', 15)));
        setSessionTimeoutHours(Number(getVal('security', 'sessionTimeoutHours', 12)));

        // Parse Timezone & Hosting Time
        const tzVal = getVal('system', 'timezone', getVal('quiz', 'timezone', 'Indian/Maldives (GMT+05:00)'));
        const offsetVal = getVal('system', 'timeOffsetMinutes', 0);
        setSelectedTimezone(tzVal);
        setTimeOffsetMinutes(Number(offsetVal));

        // Parse Club Rules
        if (rulesRes) {
          setRules(rulesRes);
          if (rulesRes.chapters) {
            const exp: Record<string, boolean> = {};
            rulesRes.chapters.forEach((c: any) => { exp[c.id] = true; });
            setExpandedChapters(exp);
          }
        }

        // Parse Database tables
        if (dbRes && Array.isArray(dbRes.tables)) {
          setDbTables(dbRes.tables);
          setDbTotalRecords(dbRes.totalRecords || 0);
          setDbLastSynced(dbRes.lastSyncedAt || new Date().toISOString());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveServerTime(new Date(Date.now() + (timeOffsetMinutes * 60 * 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeOffsetMinutes]);

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

  // Sync Database Handler
  const handleManualSync = async () => {
    try {
      setDbSyncing(true);
      const res = await api.syncDb();
      showToast('success', 'ޑޭޓާބޭސް ކާމިޔާބުކަމާއެކު ސިންކު ކުރެވިއްޖެ! (Database synced successfully)');
      await fetchDbTables();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to sync database.');
    } finally {
      setDbSyncing(false);
    }
  };

  // Export DB Backup JSON Handler
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

  // Import DB Snapshot Handler
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setImportingDb(true);
        const parsed = JSON.parse(reader.result as string);
        const payload = parsed.data || parsed;
        await api.importDbSnapshot(payload);
        showToast('success', 'ޑޭޓާބޭސް ރީސްޓޯ ކުރެވިއްޖެ! (Database imported & restored successfully)');
        await fetchDbTables();
      } catch (err: any) {
        showToast('error', err.message || 'Failed to parse or import database JSON.');
      } finally {
        setImportingDb(false);
      }
    };
    reader.readAsText(file);
  };

  // Handle Document (PDF Only) File Upload via FileReader
  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('error', 'ޤަވާޢިދު އަޕްލޯޑް ކުރެވޭނީ ހަމައެކަނި PDF ފައިލް (Only PDF files allowed).');
      return;
    }

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const reader = new FileReader();
    reader.onload = () => {
      const base64DataUrl = reader.result as string;
      setRules(prev => ({
        ...prev,
        pdfUrl: base64DataUrl,
        pdfFileName: file.name,
        pdfFileSize: `${sizeMb} MB`
      }));
      showToast('success', `PDF document file uploaded: ${file.name} (${sizeMb} MB)`);
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded document
  const handleRemoveDoc = () => {
    if (!window.confirm('އަޕްލޯޑްކޮށްފައިވާ ޤަވާޢިދު ފައިލް ފޮހެލަންވީތޯ؟')) return;
    setRules(prev => ({
      ...prev,
      pdfUrl: '',
      pdfFileName: '',
      pdfFileSize: ''
    }));
    showToast('success', 'ޤަވާޢިދު ފައިލް ފޮހެލެވިއްޖެ');
  };

  // Save Club Rules
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('error', 'Only Admin users can edit club rules.');
      return;
    }

    try {
      setRulesSaving(true);
      const updated = await api.updateClubRules(rules);
      setRules(updated);
      showToast('success', 'ކްލަބް ޤަވާޢިދު ކާމިޔާބުކަމާއެކު ސޭވްކުރެވިއްޖެ! (Club Rules saved successfully.)');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save club rules.');
    } finally {
      setRulesSaving(false);
    }
  };

  // Save Security Settings
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('error', 'Only Admin users can edit security settings.');
      return;
    }

    try {
      setSecSaving(true);
      const payload = [
        { group: 'security', key: 'maxLoginAttempts', value: Number(maxLoginAttempts) },
        { group: 'security', key: 'lockoutDurationMinutes', value: Number(lockoutDurationMinutes) },
        { group: 'security', key: 'sessionTimeoutHours', value: Number(sessionTimeoutHours) }
      ];

      await api.updateContentSettings(payload);
      showToast('success', 'Security settings updated successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update security settings.');
    } finally {
      setSecSaving(false);
    }
  };

  // Add Chapter Handler
  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapTitleDh.trim()) {
      showToast('error', 'Chapter title in Dhivehi is required.');
      return;
    }

    const nextChapNum = (rules.chapters?.length || 0) + 1;
    const newChap: ClubRuleChapter = {
      id: `chap_${Date.now()}`,
      chapterNumber: nextChapNum,
      titleDhivehi: newChapTitleDh.trim(),
      titleEnglish: newChapTitleEn.trim() || `Chapter ${nextChapNum}`,
      summary: newChapSummary.trim(),
      articles: []
    };

    setRules(prev => ({
      ...prev,
      chapters: [...(prev.chapters || []), newChap]
    }));

    setExpandedChapters(prev => ({ ...prev, [newChap.id]: true }));
    setShowAddChapterModal(false);
    setNewChapTitleDh('');
    setNewChapTitleEn('');
    setNewChapSummary('');
    showToast('success', `ބާބު ${nextChapNum} އިތުރުކުރެވިއްޖެ!`);
  };

  // Delete Chapter Handler
  const handleDeleteChapter = (chapId: string) => {
    if (!window.confirm('މި ބާބު އަދި މި ބާބުގައިވާ ހުރިހާ މާއްދާތަކެއް ޑިލީޓް ކުރަންވީތޯ؟')) return;

    setRules(prev => ({
      ...prev,
      chapters: prev.chapters.filter(c => c.id !== chapId)
    }));
    showToast('success', 'ބާބު ޑިލީޓްކުރެވިއްޖެ');
  };

  // Add Article Handler
  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetChapterId || !newArtNum.trim() || !newArtTitle.trim() || !newArtContent.trim()) {
      showToast('error', 'All article fields are required.');
      return;
    }

    const newArticle: ClubRuleArticle = {
      articleNumber: newArtNum.trim(),
      title: newArtTitle.trim(),
      content: newArtContent.trim()
    };

    setRules(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => {
        if (c.id === targetChapterId) {
          return {
            ...c,
            articles: [...c.articles, newArticle]
          };
        }
        return c;
      })
    }));

    setShowAddArticleModal(false);
    setTargetChapterId(null);
    setNewArtNum('');
    setNewArtTitle('');
    setNewArtContent('');
    showToast('success', `މާއްދާ ${newArticle.articleNumber} އިތުރުކުރެވިއްޖެ!`);
  };

  // Delete Article Handler
  const handleDeleteArticle = (chapId: string, artNum: string) => {
    setRules(prev => ({
      ...prev,
      chapters: prev.chapters.map(c => {
        if (c.id === chapId) {
          return {
            ...c,
            articles: c.articles.filter(a => a.articleNumber !== artNum)
          };
        }
        return c;
      })
    }));
    showToast('success', `މާއްދާ ${artNum} ޑިލީޓްކުރެވިއްޖެ`);
  };

  const toggleChapterExpand = (chapId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapId]: !prev[chapId]
    }));
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
      <div className="space-y-6 max-w-5xl" dir="rtl">
        
        {/* Tab Header Navigation Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto shadow-lg">
          <button
            onClick={() => setActiveTab('security')}
            className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>ސެކިއުރިޓީ އަދި ޕޯޓަލް ސެޓިންގްސް (Security & Limits)</span>
          </button>

          <button
            onClick={() => { setActiveTab('database'); fetchDbTables(); }}
            className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>ފަޔަރބޭސް ޑޭޓާބޭސް (Firebase Firestore DB)</span>
          </button>

          <button
            onClick={() => setActiveTab('hosting_time')}
            className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'hosting_time'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>ހޯސްޓިންގް ޓައިމް (Hosting Time)</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>ކްލަބް ޤަވާޢިދު (Club Rules)</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">ސެޓިންގްސް ލޯޑުވަނީ...</p>
          </div>
        ) : activeTab === 'hosting_time' ? (

          /* TAB: SYSTEM HOSTING TIME & TIMEZONE */
          <form onSubmit={handleSaveTimezoneSettings} className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <span>ސިސްޓަމް ހޯސްޓިންގް ޓައިމް އަދި ޓައިމްޒޯން (Server Hosting Time & Timezone)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ކުއިޒް ޓައިމަރުތަކާއި، ސުވާލު ހުޅުވޭ ގަޑިތަކާއި، އަދި ގުރާތައް އެއްހަމައެއްގައި ހިންގުމަށް ބޭނުންކުރާ ރަސްމީ ސާވަރު ގަޑި.
                  </p>
                </div>
              </div>

              {/* Live Official Clock Display Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">ރަސްމީ ހޯސްޓިންގް ގަޑި (Official Hosting Clock)</span>
                  <div className="text-2xl font-black font-mono text-white flex items-center gap-2 justify-center sm:justify-start">
                    <Clock className="w-6 h-6 text-emerald-400 animate-pulse" />
                    <span>
                      {liveServerTime.toLocaleTimeString('en-GB', { hour12: false })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {liveServerTime.toLocaleDateString('en-GB')} — {selectedTimezone}
                  </p>
                </div>

                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono text-center shrink-0">
                  ● Synced Server Clock
                </div>
              </div>

              {/* Timezone Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
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
                <span className="text-[10px] text-slate-500 mt-1 block">
                  މި ޓައިމްޒޯނަކީ ޕަބްލިކް ސައިޓުގެ ނެވިގޭޝަން ބާގައި އަދި ކުއިޒް މޮޑިއުލްގައި ދައްކާނެ ރަސްމީ ގަޑިއެވެ.
                </span>
              </div>

              {/* Clock Offset (Minutes) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  ގަޑި އެޖަސްޓްމަންޓް - މިނެޓުން (Server Time Adjustment Offset in Minutes)
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={timeOffsetMinutes}
                  onChange={e => setTimeOffsetMinutes(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ސާވަރުގެ ގަޑި އަވަސްކުރުމަށް ނުވަތަ ލަސްކުރުމަށްޓަކައި (+/-) މިނެޓު ޖައްސަވާ. ނޯމަލްކޮށް ހުންނާނީ 0 ގައެވެ.
                </span>
              </div>

              {isAdmin && (
                <div className="pt-2 flex justify-start">
                  <button
                    type="submit"
                    disabled={timeSaving}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{timeSaving ? 'ސޭވްވަނީ...' : 'ސެޓިންގްސް ސޭވްކުރައްވާ (Save Hosting Time)'}</span>
                  </button>
                </div>
              )}
            </div>
          </form>
        ) : activeTab === 'rules' ? (
          
          /* TAB: REDIRECT CARD TO DEDICATED CLUB RULES MODULE */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto shadow-inner">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white font-heading">
                ކްލަބުގެ ހިންގާ ޤަވާޢިދު ވަނީ ވަކި މޮޑިއުލަކަށް ބަދަލުކުރެވިފައި
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ކްލަބުގެ ބާބުތަކާއި، މާއްދާތައް އަދި އިދާރީ އުޞޫލުތައް އިޞްލާޙުކޮށް ބެލެހެއްޓެވުމަށް ޚާއްޞަ މޮޑިއުލް ބޭނުންކުރައްވާ.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/portal/club-rules"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>ކްލަބް ޤަވާޢިދު މޮޑިއުލަށް ވަޑައިގަންނަވާ</span>
              </a>
            </div>
          </div>

        ) : activeTab === 'security' ? (

          /* TAB 2: SECURITY & GENERAL PORTAL LIMITS */
          <form onSubmit={handleSaveSecurity} className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Shield className="w-5 h-5 text-orange-400" />
                <span>އޮތެންޓިކޭޝަން އަދި ސެކިއުރިޓީ އުޞޫލުތައް</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
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
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ކަނޑައެޅިފައިވާ އަދަދަށްވުރެ ގިނައިން ނުބައި ޕިން ކޯޑު ޖެހުމުން އެކައުންޓް ވަގުތީގޮތުން ލޮކްވާނެއެވެ.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>

            {isAdmin && (
              <div>
                <button
                  type="submit"
                  disabled={secSaving}
                  className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 flex items-center gap-2 shadow-lg shadow-orange-500/20 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{secSaving ? 'ސޭވްވަނީ...' : 'ސެކިއުރިޓީ ސެޓިންގްސް ސޭވްކުރައްވާ'}</span>
                </button>
              </div>
            )}
          </form>
        ) : (

          /* TAB 3: FIREBASE CLOUD FIRESTORE DATABASE COLLECTIONS, RECORDS & SYNC */
          <div className="space-y-6">
            
            {/* Firebase Firestore Connection Overview Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white font-heading flex items-center gap-2">
                        <span>ފަޔަރބޭސް ކްލައުޑް ފަޔަރސްޓޯރ (Firebase Cloud Firestore)</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono font-bold">
                          Firestore Active
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        ޕޯޓަލްގެ ހުރިހާ ފަޔަރސްޓޯރ ކަލެކްޝަންތަކާއި، ރެކޯޑުތަކުގެ އަދަދު އަދި ލައިވް ޑޭޓާބޭސް ޙާލަތު.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Database Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={dbSyncing}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${dbSyncing ? 'animate-spin' : ''}`} />
                    <span>{dbSyncing ? 'ސިންކުވަނީ...' : 'ފަޔަރސްޓޯރ ސިންކު (Sync Firestore)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>ބެކްއަޕް JSON (Backup)</span>
                  </button>

                  {isAdmin && (
                    <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>{importingDb ? 'ރީސްޓޯވަނީ...' : 'ރީސްޓޯ (Restore JSON)'}</span>
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

              {/* Status Badges Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>ޖުމްލަ ކަލެކްޝަންތައް (Collections)</span>
                    <Table className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {dbTables.length}
                  </div>
                  <p className="text-[10px] text-slate-500">Firestore Collections Active</p>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>ޖުމްލަ ލިޔުންތައް (Total Documents)</span>
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {dbTotalRecords}
                  </div>
                  <p className="text-[10px] text-slate-500">Live Firestore Documents Stored</p>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>ޑޭޓާބޭސް އިންޖީނު (DB Engine)</span>
                    <HardDrive className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-xs font-bold text-orange-400 font-mono flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Cloud Firestore NoSQL</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Google Cloud Managed</p>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>ކްލައުޑް ޙާލަތު (Cloud Status)</span>
                    <Cloud className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1 mt-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Live Connected</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {dbLastSynced ? new Date(dbLastSynced).toLocaleTimeString() : 'Connected'}
                  </p>
                </div>
              </div>
            </div>

            {/* Firestore Collections Catalog Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                      ފަޔަރސްޓޯރ ކަލެކްޝަންތަކުގެ ތަފްޞީލު (Firestore Collections Grid)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Cloud Firestore document schema & active record tallies
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
                  {dbTables.length} Collections
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dbTables.map(tbl => (
                  <div
                    key={tbl.key}
                    className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 space-y-3 transition shadow-lg flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                          {tbl.count} Records
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {tbl.key}
                        </span>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-white font-heading">
                          {tbl.nameDh}
                        </h5>
                        <p className="text-xs text-slate-400">
                          {tbl.name}
                        </p>
                      </div>

                      <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono truncate">
                        Columns: {tbl.schema}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTable(tbl)}
                      className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ރެކޯޑުތައް ބައްލަވާ (View Sample)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Modal: Selected Table Sample Record Inspector */}
        {selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                    <Table className="w-5 h-5 text-orange-400" />
                    <span>{selectedTable.nameDh} ({selectedTable.name})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Key: <code className="text-orange-400">{selectedTable.key}</code> • Total Records: {selectedTable.count}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>Sample Record Inspection (Top Rows)</span>
                </h4>

                {(!selectedTable.sample || selectedTable.sample.length === 0) ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                    No sample records available in this collection yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTable.sample.map((rec: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="text-[10px] text-orange-400 font-mono font-bold border-b border-slate-800 pb-1">
                          Record #{idx + 1} ID: {rec.id || rec.titleDhivehi || idx}
                        </div>
                        <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-48 p-2 bg-slate-900 rounded-lg">
                          {JSON.stringify(rec, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition"
                >
                  ލައްޕަވާ (Close)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Club Rules Preview Modal */}
        <ClubRulesModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
        />

      </div>
    </PortalLayout>
  );
};
