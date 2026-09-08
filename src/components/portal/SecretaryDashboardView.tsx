import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  FileText,
  Mail,
  Calendar,
  Users,
  Plus,
  ArrowRight,
  RefreshCw,
  Trash2,
  CheckCircle2,
  BookOpen,
  Send,
  Building2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { User, OfficialCircular, MeetingItem, InboxMessage, ClubMember } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ExcoMemberProfileCard } from './ExcoMemberProfileCard';

interface SecretaryDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

export const SecretaryDashboardView: React.FC<SecretaryDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [circulars, setCirculars] = useState<OfficialCircular[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);

  // Circular Modal State
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [circularForm, setCircularForm] = useState({
    title: '',
    refNumber: '',
    targetAudience: 'all_members' as 'all_members' | 'exco' | 'public' | 'committee',
    signedBy: user.fullName || user.username || 'Secretary General',
    summary: '',
    content: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [circData, meetData, msgData, memData] = await Promise.all([
        api.getOfficialCirculars().catch(() => []),
        api.getMeetingItems().catch(() => []),
        api.getMessages().catch(() => ({ inbox: [] })),
        api.getMembers().catch(() => [])
      ]);
      setCirculars(circData || []);
      setMeetings(meetData || []);
      setMessages((msgData as any)?.inbox || (msgData as any)?.messages || []);
      setMembers(memData || []);
    } catch (err: any) {
      showToast('error', isDh ? 'ސެކްރެޓަރީގެ މައުލޫމާތު ލޯޑުނުކުރެވުނު: ' + err.message : 'Failed to load secretarial data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isDh]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circularForm.title.trim()) {
      showToast('error', isDh ? 'ސާކިއުލާގެ ސުރުޚީ ލިޔުއްވާ.' : 'Please enter a circular title.');
      return;
    }

    try {
      const newCirc = await api.createOfficialCircular({
        title: circularForm.title.trim(),
        refNumber: circularForm.refNumber.trim() || undefined,
        targetAudience: circularForm.targetAudience,
        signedBy: circularForm.signedBy.trim(),
        summary: circularForm.summary.trim(),
        status: 'published'
      });
      setCirculars(prev => [newCirc, ...prev]);
      setShowCircularModal(false);
      setCircularForm({
        title: '',
        refNumber: '',
        targetAudience: 'all_members',
        signedBy: user.fullName || user.username || 'Secretary General',
        summary: '',
        content: ''
      });
      showToast('success', isDh ? 'ރަސްމީ ސާކިއުލާ ކާމިޔާބުކަމާއެކު ޝާއިޢުކުރެވިއްޖެ.' : 'Official circular published successfully.');
    } catch (err: any) {
      showToast('error', isDh ? 'ސާކިއުލާ ޝާއިޢެއް ނުކުރެވުނު: ' + err.message : 'Failed to publish circular: ' + err.message);
    }
  };

  const handleDeleteCircular = async (id: string) => {
    if (!window.confirm(isDh ? 'މި ރަސްމީ ސާކިއުލާ ފޮހެލަން ބޭނުންފުޅުތޯ؟' : 'Are you sure you want to delete this official circular?')) return;
    try {
      await api.deleteOfficialCircular(id);
      setCirculars(prev => prev.filter(c => c.id !== id));
      showToast('success', isDh ? 'ސާކިއުލާ ފޮހެލެވިއްޖެ.' : 'Circular deleted.');
    } catch (err: any) {
      showToast('error', isDh ? 'ސާކިއުލާ ފޮހެލުމުގައި މައްސަލައެއް ދިމާވެއްޖެ: ' + err.message : 'Failed to delete circular: ' + err.message);
    }
  };

  const pendingMessages = messages.filter(m => m.status === 'pending');

  return (
    <div className="space-y-6" dir={dir}>
      {/* Secretary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>{isDh ? 'ސެކްރެޓަރީ ޖެނެރަލްގެ އޮފީސް' : 'Office of the Secretary General'}</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {isDh ? 'އިދާރީ ހިންގުން، ސާކިއުލާތައް އަދި ރަސްމީ ރެކޯޑުތައް' : 'Secretariat, Circulars & Official Records'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {isDh ? 'ސެކްރެޓަރީ ޖެނެރަލްގެ އިދާރީ ޕެނަލް' : "Secretary General's Secretariat Deck"}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ ރަސްމީ އެންގުންތަކާއި (Circulars)، ބައްދަލުވުންތަކުގެ ޔައުމިއްޔާތައް ލިޔެ ބެލެހެއްޓުމާއި، އަދި އިދާރީ މުޢާމަލާތްތައް ހިންގުން.'
              : 'Administer official club notices, publish circulars, record meeting agendas and minutes, and process incoming official correspondence.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={() => setShowCircularModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isDh ? 'ސާކިއުލާއެއް ނެރުއްވާ' : 'Publish Circular'}</span>
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{isDh ? 'އާކޮށްލާ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Official Club Member Profile & Personal Standing */}
      <ExcoMemberProfileCard
        user={user}
        onRefreshUser={onRefreshUser || fetchData}
        accentColor="indigo"
      />

      {/* Secretarial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ރަސްމީ ސާކިއުލާތައް' : 'Official Circulars'}</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {circulars.length}
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">
            {isDh ? 'ޝާއިޢުކުރެވިފައިވާ އެންގުންތައް' : 'Published Club Notices'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ރެކޯޑުކުރެވުނު ބައްދަލުވުންތައް' : 'Recorded Meetings'}</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {meetings.length}
          </div>
          <span className="text-[11px] text-slate-400">
            {isDh ? 'ޔައުމިއްޔާއާއި ޙާޟިރީ ރެކޯޑުކުރެވިފައި' : 'Minutes & Attendance Logged'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ސިޓީތަކާއި ސުވާލުތައް' : 'Inquiries & Letters'}</span>
            <Mail className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono">
            {pendingMessages.length}
          </div>
          <span className="text-[11px] text-sky-300 font-medium">
            {isDh ? 'ޖަވާބުނުދެވިހުރި ސުވާލުތައް' : 'Pending Visitor / Member Inquiries'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ކްލަބުގެ މެންބަރުން' : 'Club Members'}</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {members.filter(m => m.status === 'active').length}
          </div>
          <span className="text-[11px] text-slate-400">
            {isDh ? 'ދަފްތަރުގައިވާ އެކްޓިވް މެންބަރުން' : 'In Active Good Standing'}
          </span>
        </div>
      </div>

      {/* Official Circulars Management Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>{isDh ? 'ރަސްމީ އެންގުންތަކާއި ސާކިއުލާތައް' : 'Official Circulars & Executive Notices'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isDh
                ? 'މެންބަރުންނަށް، ހިންގާ ކޮމިޓީއަށް ނުވަތަ ޢާންމުކޮށް ނެރެފައިވާ ރަސްމީ ސާކިއުލާތައް.'
                : 'Formally issued circulars to all club members, executive committee, or public bulletins.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCircularModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDh ? 'އާ ސާކިއުލާއެއް' : 'New Circular'}</span>
          </button>
        </div>

        {circulars.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto opacity-30 text-indigo-400" />
            <p className="text-sm font-medium">
              {isDh ? 'އަދި އެއްވެސް ރަސްމީ ސާކިއުލާއެއް ޝާއިޢުކުރެވިފައެއް ނެތް.' : 'No official circulars published yet.'}
            </p>
            <button
              type="button"
              onClick={() => setShowCircularModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold transition cursor-pointer"
            >
              {isDh ? '+ ފުރަތަމަ ރަސްމީ ސާކިއުލާ ނެރުއްވާ' : '+ Create First Official Circular'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {circulars.map(circ => (
              <div
                key={circ.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {circ.refNumber || 'ARC/CIR/2026/01'}
                    </span>
                    <span className="text-sm font-bold text-white font-heading">{circ.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase">
                      {circ.status === 'published' ? (isDh ? 'ޝާއިޢުކުރެވިފައި' : 'Published') : circ.status}
                    </span>
                  </div>

                  {circ.summary && (
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{circ.summary}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>
                      {isDh ? 'އަމާޒު: ' : 'Audience: '}
                      <strong className="text-slate-200 capitalize">
                        {circ.targetAudience === 'all_members'
                          ? (isDh ? 'ހުރިހާ މެންބަރުން' : 'All Members')
                          : circ.targetAudience === 'exco'
                          ? (isDh ? 'ހިންގާ ކޮމިޓީ' : 'Executive Committee')
                          : circ.targetAudience === 'public'
                          ? (isDh ? 'ޢާންމުކޮށް' : 'Public')
                          : (circ.targetAudience?.replace(/_/g, ' ') || 'All Members')}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>{isDh ? 'ތާރީޚު: ' : 'Date: '}{formatDate(circ.publishedDate || circ.createdAt)}</span>
                    <span>•</span>
                    <span>{isDh ? 'ސޮއިކުރީ: ' : 'Signatory: '}<strong className="text-slate-200">{circ.signedBy || (isDh ? 'ސެކްރެޓަރީ ޖެނެރަލް' : 'Secretary General')}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteCircular(circ.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    title={isDh ? 'ސާކިއުލާ ފޮހެލާ' : 'Delete Circular'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secretarial Tools Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/portal/events-meetings"
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 w-fit group-hover:scale-110 transition">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ބައްދަލުވުންތަކުގެ އެޖެންޑާއާއި ޔައުމިއްޔާ' : 'Meeting Agendas & Minutes'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ހިންގާ ކޮމިޓީ ބައްދަލުވުންތަކުގެ ޔައުމިއްޔާ ލިޔުމާއި، އެޖެންޑާ އެކުލަވާލުމާއި ވޯޓު ރެކޯޑުކުރުން.'
              : 'Record minutes of executive meetings, formulate agendas, and conduct member voting rolls.'}
          </p>
          <span className="text-xs font-bold text-indigo-400 block pt-1">
            {isDh ? 'ބައްދަލުވުންތަކުގެ ޑެސްކް ހުޅުވާލައްވާ ←' : 'Open Meetings & Minutes →'}
          </span>
        </a>

        <a
          href="/portal/messages"
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit group-hover:scale-110 transition">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ސިޓީތަކާއި އިދާރީ މުޢާމަލާތް' : 'Inquiries & Correspondence'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? `ޢާންމުންނާއި މެންބަރުންގެ ސިޓީތަކަށް ޖަވާބުދިނުމާއި، އިދާރީ މުޢާމަލާތް ބެލެހެއްޓުން (${pendingMessages.length} އިންތިޒާރުގައި).`
              : `Process incoming public letters, answer inquiries, and record action responses (${pendingMessages.length} pending).`}
          </p>
          <span className="text-xs font-bold text-sky-400 block pt-1">
            {isDh ? 'މެސެޖް އިންބޮކްސް ހުޅުވާލައްވާ ←' : 'Open Messages Inbox →'}
          </span>
        </a>

        <a
          href="/portal/members"
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'މެންބަރުންގެ ދަފްތަރާއި ތަފާސްހިސާބު' : 'Members Register & Census'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ ރަސްމީ މެންބަރުންގެ ދަފްތަރު ބެލެހެއްޓުމާއި، މެންބަރު ނަންބަރާއި އަދި ސެންސަސް މަޢުލޫމާތު.'
              : 'Maintain official membership register, ID numbers, joined dates, and member census data.'}
          </p>
          <span className="text-xs font-bold text-emerald-400 block pt-1">
            {isDh ? 'މެންބަރުންގެ ދަފްތަރު ހުޅުވާލައްވާ ←' : 'Open Members Register →'}
          </span>
        </a>
      </div>

      {/* New Circular Modal */}
      {showCircularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir={dir}>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white font-heading">
                  {isDh ? 'ރަސްމީ ސާކިއުލާއެއް ޝާއިޢުކުރުން' : 'Publish Official Circular'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCircularModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCircular} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'ސާކިއުލާގެ ސުރުޚީ *' : 'Circular Title *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isDh ? 'މިސާލަކަށް: 2026 ވަނަ އަހަރުގެ އަހަރީ ޢާންމު ޖަލްސާއާ ގުޅޭ' : 'e.g. Notice of 2026 Annual General Meeting'}
                  value={circularForm.title}
                  onChange={e => setCircularForm({ ...circularForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isDh ? 'ނަންބަރު' : 'Reference Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={`ARC/CIR/${new Date().getFullYear()}/${String(circulars.length + 1).padStart(2, '0')}`}
                    value={circularForm.refNumber}
                    onChange={e => setCircularForm({ ...circularForm, refNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {isDh ? 'އަމާޒުވާ ފަރާތް' : 'Target Audience'}
                  </label>
                  <select
                    value={circularForm.targetAudience}
                    onChange={e => setCircularForm({ ...circularForm, targetAudience: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all_members">{isDh ? 'ހުރިހާ މެންބަރުން' : 'All Club Members'}</option>
                    <option value="exco">{isDh ? 'ހިންގާ ކޮމިޓީ (EXCO)' : 'Executive Committee (EXCO)'}</option>
                    <option value="public">{isDh ? 'ޢާންމު ރައްޔިތުން' : 'General Public'}</option>
                    <option value="committee">{isDh ? 'ސަބް ކޮމިޓީތައް' : 'Sub-Committees'}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'ސޮއިކުރާ ފަރާތް / މަޤާމް' : 'Signatory Name / Designation'}
                </label>
                <input
                  type="text"
                  value={circularForm.signedBy}
                  onChange={e => setCircularForm({ ...circularForm, signedBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {isDh ? 'ސާކިއުލާގެ ބަޔާން ނުވަތަ ޚުލާޞާ' : 'Circular Text & Summary'}
                </label>
                <textarea
                  rows={4}
                  placeholder={isDh ? 'ރަސްމީ ބަޔާން، އިރުޝާދު، ނުވަތަ އެޖެންޑާގެ ތަފްޞީލު...' : 'Official statement, directives, agenda details, or instructions...'}
                  value={circularForm.summary}
                  onChange={e => setCircularForm({ ...circularForm, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCircularModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  {isDh ? 'ކެންސަލް' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition cursor-pointer"
                >
                  {isDh ? 'ސާކިއުލާ ޝާއިޢުކުރޭ' : 'Publish Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
