import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { formatDate } from '../../utils/formatters';
import {
  Crown,
  ShieldCheck,
  Award,
  Users,
  Building2,
  Calendar,
  Vote,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  Check,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import { User, PresidentialDirective, BudgetStats, MeetingItem, ClubMember } from '../../types';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { ExcoMemberProfileCard } from './ExcoMemberProfileCard';

interface PresidentDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

export const PresidentDashboardView: React.FC<PresidentDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [directives, setDirectives] = useState<PresidentialDirective[]>([]);
  const [budgetStats, setBudgetStats] = useState<BudgetStats | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);

  // Directive Modal
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'urgent' | 'completed'>('all');
  const [directiveForm, setDirectiveForm] = useState({
    title: '',
    targetOfficer: 'Vice President & Executive Committee',
    priority: 'high' as 'low' | 'normal' | 'routine' | 'high' | 'urgent',
    targetDate: '',
    description: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [directivesData, budgetData, meetingsData, membersData] = await Promise.all([
        api.getPresidentialDirectives().catch(() => []),
        api.getBudgetStats().catch(() => null),
        api.getMeetingItems().catch(() => []),
        api.getMembers().catch(() => [])
      ]);
      setDirectives(directivesData || []);
      setBudgetStats(budgetData);
      setMeetings(meetingsData || []);
      setMembers(membersData || []);
    } catch (err: any) {
      showToast('error', 'Failed to load presidential data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveForm.title.trim()) {
      showToast('error', 'Please enter a directive title.');
      return;
    }
    try {
      const newDir = await api.createPresidentialDirective({
        title: directiveForm.title.trim(),
        targetOfficer: directiveForm.targetOfficer.trim(),
        priority: directiveForm.priority,
        targetDate: directiveForm.targetDate || undefined,
        description: directiveForm.description.trim(),
        status: 'issued',
        issuedBy: user.fullName || user.username
      });
      setDirectives(prev => [newDir, ...prev]);
      setShowDirectiveModal(false);
      setDirectiveForm({
        title: '',
        targetOfficer: 'Vice President & Executive Committee',
        priority: 'high',
        targetDate: '',
        description: ''
      });
      showToast('success', 'Presidential Directive issued successfully.');
    } catch (err: any) {
      showToast('error', 'Failed to issue directive: ' + err.message);
    }
  };

  const handleToggleDirectiveStatus = async (directive: PresidentialDirective) => {
    const nextStatus = directive.status === 'completed' ? 'active' : 'completed';
    try {
      const updated = await api.updatePresidentialDirective(directive.id, {
        status: nextStatus,
        completionNotes: nextStatus === 'completed' ? `Completed under President's review on ${new Date().toLocaleDateString()}` : undefined
      });
      setDirectives(prev => prev.map(d => (d.id === directive.id ? updated : d)));
      showToast('success', `Directive marked as ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', 'Failed to update directive: ' + err.message);
    }
  };

  const handleDeleteDirective = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this directive?')) return;
    try {
      await api.deletePresidentialDirective(id);
      setDirectives(prev => prev.filter(d => d.id !== id));
      showToast('success', 'Directive deleted.');
    } catch (err: any) {
      showToast('error', 'Failed to delete directive: ' + err.message);
    }
  };

  const activeDirectives = directives.filter(d => d.status !== 'completed' && d.status !== 'archived');
  const urgentDirectives = directives.filter(d => (d.priority === 'urgent' || d.priority === 'high') && d.status !== 'completed');

  const filteredDirectives = directives.filter(d => {
    if (selectedFilter === 'active') return d.status !== 'completed' && d.status !== 'archived';
    if (selectedFilter === 'urgent') return (d.priority === 'urgent' || d.priority === 'high') && d.status !== 'completed';
    if (selectedFilter === 'completed') return d.status === 'completed';
    return true;
  });

  const activeMembersCount = members.filter(m => m.status === 'active').length;
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress');

  return (
    <div className="space-y-6">
      {/* President Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>{isDh ? 'ރައީސްގެ އޮފީސް' : 'Office of the President'}</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {isDh ? 'ސްޓްރެޓީޖިކް ލީޑަރޝިޕް އަދި ވެރިކަން' : 'Strategic Leadership & Governance'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {isDh ? 'ރައީސްގެ ރިޔާސީ ކޮމާންޑް ޕެނަލް' : "President's Executive Command"}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ އިސްތިރާތީޖީ މިސްރާބު ހިފެހެއްޓުމާއި، ހިންގާ ކޮމިޓީއަށް ރިޔާސީ އިރުޝާދު (Directives) ދިނުމާއި، މާލީ އަދި އިދާރީ ހިންގުން ބެލެހެއްޓުން.'
              : 'Oversee club vision, issue executive presidential directives to committee officers, and review high-level organizational and financial health.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={() => setShowDirectiveModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isDh ? 'އިރުޝާދު ނެރުއްވާ' : 'Issue Directive'}</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{isDh ? 'އާކޮށްލާ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Official Club Member Profile & Personal Standing */}
      <ExcoMemberProfileCard
        user={user}
        onRefreshUser={onRefreshUser || fetchData}
        accentColor="amber"
      />

      {/* Strategic High-Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ޖުމްލަ ކްލަބް މެންބަރުން' : 'Total Club Members'}</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {activeMembersCount} <span className="text-xs text-sky-400 font-sans">{isDh ? 'އެކްޓިވް' : 'Active'}</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {members.length} {isDh ? 'ރަޖިސްޓްރީވެފައިވާ މެންބަރުން' : 'Registered in Club Roster'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ޚަޒާނާގެ ލިކުއިޑް ފައިސާ' : 'Treasury Liquid Reserves'}</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {budgetStats ? budgetStats.totalAccountsBalance.toLocaleString() : '0'} <span className="text-xs font-sans">{isDh ? 'ރުފިޔާ' : 'MVR'}</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 font-medium">
            {isDh ? 'ނެޓް ޙާލަތު:' : 'Net Position:'} {budgetStats && budgetStats.netBalance >= 0 ? `+${budgetStats.netBalance.toLocaleString()}` : budgetStats?.netBalance.toLocaleString() || '0'} {isDh ? 'ރުފިޔާ' : 'MVR'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ހިނގަމުންދާ އިރުޝާދުތައް' : 'Active Directives'}</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {activeDirectives.length}
          </div>
          <span className="text-[11px] text-amber-300/80 font-medium">
            {urgentDirectives.length} {isDh ? 'މުހިންމު / އަވަސް އިރުޝާދު' : 'High / Urgent Priority'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ތާވަލުކުރެވިފައިވާ ބައްދަލުވުން' : 'Scheduled Meetings'}</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {upcomingMeetings.length}
          </div>
          <span className="text-[11px] text-slate-400">
            {isDh ? 'ހިންގާ ކޮމިޓީ އަދި ޢާންމު ޖަލްސާތައް' : 'EXCO & General Assembly Sessions'}
          </span>
        </div>
      </div>

      {/* Pending Invoices & Bills Executive Approvals Deck */}
      <PendingApprovalsSection
        user={user}
        onUpdated={fetchData}
        themeColor="amber"
      />

      {/* Presidential Directives Management Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
              <Crown className="w-5 h-5 text-amber-400" />
              <span>{isDh ? 'ރިޔާސީ އިރުޝާދުތައް އަދި ފިޔަވަޅުތައް' : 'Presidential Directives & Action Items'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isDh
                ? 'ރައީސްގެ ފަރާތްޕުޅުން ހިންގާ ކޮމިޓީގެ އޮފިސަރުންނަށާއި ކޮމިޓީތަކަށް ނެރުއްވާފައިވާ އިރުޝާދުތައް.'
                : 'Directives issued by the President to EXCO officers, departments, and working committees.'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 'all', label: isDh ? 'ހުރިހާ' : 'All' },
              { id: 'active', label: isDh ? 'ހިނގަމުންދާ' : 'Active' },
              { id: 'urgent', label: isDh ? 'އަވަސް' : 'Urgent' },
              { id: 'completed', label: isDh ? 'ނިމިފައި' : 'Completed' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedFilter === f.id
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDirectives.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <Crown className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
            <p className="text-sm font-medium">
              {isDh ? 'ޚިޔާރުކުރެވުނު ފިލްޓަރުގެ ދަށުން އެއްވެސް އިރުޝާދެއް ފެންނާކަށް ނެތް.' : 'No directives found under the selected filter.'}
            </p>
            <button
              type="button"
              onClick={() => setShowDirectiveModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition cursor-pointer"
            >
              {isDh ? '+ ފުރަތަމަ ރިޔާސީ އިރުޝާދު ނެރުއްވާ' : '+ Issue First Presidential Directive'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDirectives.map(dir => {
              const isCompleted = dir.status === 'completed';
              return (
                <div
                  key={dir.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isCompleted
                      ? 'bg-slate-950/60 border-slate-800/60 opacity-75'
                      : dir.priority === 'urgent'
                      ? 'bg-rose-950/20 border-rose-500/30 shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white font-heading">{dir.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          dir.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : dir.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dir.priority === 'urgent' ? (isDh ? 'އަވަސް އިސްކަން' : 'Urgent Priority') : dir.priority === 'high' ? (isDh ? 'މުހިންމު އިސްކަން' : 'High Priority') : (isDh ? 'ޢާންމު' : `${dir.priority} Priority`)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {isCompleted ? (isDh ? 'ނިމިފައި' : 'COMPLETED') : (isDh ? 'ހިނގަމުންދާ' : 'ACTIVE')}
                      </span>
                    </div>

                    {dir.description && (
                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{dir.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>{isDh ? 'އަމާޒުވާ ފަރާތް:' : 'Target:'} <strong className="text-slate-200">{dir.targetOfficer || (isDh ? 'ހިންގާ ކޮމިޓީ' : 'EXCO Committee')}</strong></span>
                      <span>•</span>
                      <span>{isDh ? 'ނެރުނު ތާރީޚު:' : 'Issued:'} {formatDate(dir.issueDate || dir.createdAt)}</span>
                      {dir.targetDate && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400">{isDh ? 'ނިންމަންޖެހޭ ތާރީޚު:' : 'Target Date:'} {dir.targetDate}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleDirectiveStatus(dir)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isCompleted
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isCompleted ? (isDh ? 'އަލުން ހުޅުވާ' : 'Reopen') : (isDh ? 'ނިމުނު ކަމަށް ހަދާ' : 'Mark Done')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDirective(dir.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                      title={isDh ? 'އިރުޝާދު ފޮހެލާ' : 'Delete Directive'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Governance & Strategic Portals Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/portal/budget"
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit group-hover:scale-110 transition">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'މާލީ ހިންގުމާއި ރިޒާވް ބެލެހެއްޓުން' : 'Financial Governance & Reserves'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ ބޭންކު ބެލެންސްތަކާއި، އަހަރީ ފީ ބަލައިގަތުމުގެ ރޭޓާއި، އަދި ބޮޑެތި ޙަރަކާތްތަކުގެ ބަޖެޓް ފާސްކުރުން.'
              : 'Review club bank balances, annual contributions collection rate, and approve major event budget allocations.'}
          </p>
          <span className="text-xs font-bold text-amber-400 block pt-1">
            {isDh ? 'ބަޖެޓް ބައްލަވާ ←' : 'Open Budget Oversight →'}
          </span>
        </a>

        <a
          href="/portal/events-meetings"
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit group-hover:scale-110 transition">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ހިންގާ ކޮމިޓީގެ ބައްދަލުވުންތަކާއި ވޯޓުތައް' : 'Executive Meetings & Votings'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'އެގްޒެކެޓިވް ބައްދަލުވުންތަކުގެ ރިޔާސަތު ބެލެހެއްޓެވުމާއި، ވޯޓު އެއްވަރުވާ ހާލަތުގައި ރައީސްގެ ވޯޓު ދެއްވުން.'
              : 'Preside over EXCO meetings, cast presidential tie-breaker votes, and inspect resolution archives.'}
          </p>
          <span className="text-xs font-bold text-sky-400 block pt-1">
            {isDh ? 'ބައްދަލުވުންތަކަށް ވަޑައިގަންނަވާ ←' : 'Open Meetings Deck →'}
          </span>
        </a>

        <a
          href="/portal/settings"
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 w-fit group-hover:scale-110 transition">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ކްލަބް އަސާސީ ޤަވާޢިދު' : 'Constitution & Club Rules'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ކްލަބް ހިންގާ ޤަވާޢިދުތަކާއި، ރިޔާސީ ބާރުތަކާއި، މެންބަރުންގެ ޙައްޤުތައް ބަލައި އިޞްލާޙުކުރުން.'
              : 'Review governing articles, executive powers, member bylaws, and amend official club policies.'}
          </p>
          <span className="text-xs font-bold text-rose-400 block pt-1">
            {isDh ? 'ޤަވާޢިދު ބައްލަވާ ←' : 'View Constitutional Bylaws →'}
          </span>
        </a>
      </div>

      {/* Directive Issue Modal */}
      {showDirectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir={dir}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white font-heading">
                  {isDh ? 'ރިޔާސީ އިރުޝާދު ނެރުއްވުން' : 'Issue Presidential Directive'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectiveModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDirective} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'އިރުޝާދުގެ ސުރުޚީ *' : 'Directive Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isDh ? 'މިސާލަކަށް: ރަމަޟާން ކުއިޒް ސްޕޮންސަރުން ހޯދުން އަވަސްކުރުން' : 'e.g. Expedite Ramadan Quiz Sponsor Onboarding'}
                  value={directiveForm.title}
                  onChange={e => setDirectiveForm({ ...directiveForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isDh ? 'އަމާޒުވާ އޮފިސަރު / ޓީމު' : 'Target Officer / Team'}
                  </label>
                  <input
                    type="text"
                    value={directiveForm.targetOfficer}
                    onChange={e => setDirectiveForm({ ...directiveForm, targetOfficer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isDh ? 'އިސްކަންދޭ މިންވަރު' : 'Priority Level'}
                  </label>
                  <select
                    value={directiveForm.priority}
                    onChange={e => setDirectiveForm({ ...directiveForm, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="urgent">{isDh ? 'އަވަސް (Urgent)' : 'Urgent'}</option>
                    <option value="high">{isDh ? 'މުހިންމު (High)' : 'High'}</option>
                    <option value="normal">{isDh ? 'ޢާންމު (Normal)' : 'Normal'}</option>
                    <option value="routine">{isDh ? 'އާދައިގެ (Routine)' : 'Routine'}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'ނިންމަންޖެހޭ ތާރީޚު' : 'Target Completion Date'}
                </label>
                <input
                  type="date"
                  value={directiveForm.targetDate}
                  onChange={e => setDirectiveForm({ ...directiveForm, targetDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'ތަފްޞީލީ އިރުޝާދު' : 'Executive Details & Instructions'}
                </label>
                <textarea
                  rows={4}
                  placeholder={isDh ? 'މަސައްކަތުގެ މަޤްޞަދާއި، އަމާޒުތައް އަދި އިރުޝާދުތައް ލިޔުއްވާ...' : 'Detail the mandate, specific goals, and expectations for the assigned officer...'}
                  value={directiveForm.description}
                  onChange={e => setDirectiveForm({ ...directiveForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectiveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                >
                  {isDh ? 'ކެންސަލް' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  {isDh ? 'އިރުޝާދު ނެރުއްވާ' : 'Issue Directive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
