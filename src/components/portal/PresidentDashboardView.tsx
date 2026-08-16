import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  Crown,
  Users,
  Calendar,
  Wallet,
  Vote,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  FileText
} from 'lucide-react';
import { MeetingItem, EventItem, BudgetStats } from '../../types';

interface PresidentDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const PresidentDashboardView: React.FC<PresidentDashboardViewProps> = ({ user }) => {
  const { lang } = usePortalLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [budgetStats, setBudgetStats] = useState<BudgetStats | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashStats, bStats, meetingList, eventList] = await Promise.all([
          api.getDashboardStats().catch(() => null),
          api.getBudgetStats().catch(() => null),
          api.getMeetingItems().catch(() => []),
          api.getEventItems().catch(() => [])
        ]);
        setStats(dashStats);
        setBudgetStats(bStats);
        setMeetings(meetingList || []);
        setEvents(eventList || []);
      } catch (err: any) {
        showToast('error', 'Failed to load presidential data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingMeetings = meetings.filter(m => m.status === 'scheduled');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  return (
    <div className="space-y-6">
      {/* President Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>Office of the President</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Executive Leadership & Strategic Direction
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {lang === 'english' ? "President's Executive Deck" : 'ރައީސްގެ އެގްޒެކެޓިވް ކޮމާންޑް ޕެނަލް'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {lang === 'english'
              ? 'Lead club governance, oversee executive committee resolutions, monitor strategic financial health, and ensure alignment with Aanandha Recreation Club constitution and bylaws.'
              : 'ކްލަބްގެ އިސް ލީޑަރޝިޕާއި، އެގްޒެކެޓިވް ކޮމިޓީގެ ނިންމުންތަކާއި، މާލީ އަދި އިދާރީ ސްޓްރެޓީޖިކް ކަންކަން ވިލަރެސްކުރާ ޚާއްސަ ޕެނަލް.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/portal/events-meetings"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Vote className="w-4 h-4" />
            <span>{lang === 'english' ? 'EXCO Meetings & Votes' : 'ބައްދަލުވުންތަކާއި ވޯޓުތައް'}</span>
          </a>
          <a
            href="/portal/budget"
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'english' ? 'Club Treasury' : 'މާލީ ހާލަތު'}</span>
          </a>
        </div>
      </div>

      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Registered Members' : 'ރަޖިސްޓްރީ މެންބަރުން'}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats?.membersCount ?? 0}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{lang === 'english' ? 'Full voting & active rights' : 'ކްލަބްގެ ޢާންމު ދަފްތަރު'}</span>
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Scheduled Meetings' : 'ތާވަލުކުރެވިފައިވާ ބައްދަލުވުންތައް'}</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {pendingMeetings.length}
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            {meetings.length} {lang === 'english' ? 'Total EXCO Sessions' : 'ޖުމްލަ ސެޝަން'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Active Events & Activities' : 'ހިނގަމުންދާ ހަރަކާތްތައް'}</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {upcomingEvents.length}
          </div>
          <span className="text-[11px] text-purple-400 font-medium">
            {lang === 'english' ? 'Community initiatives' : 'ކްލަބްގެ ޙަރަކާތްތައް'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Liquid Reserves (MVR)' : 'މާލީ ރިޒާވް (ރުފިޔާ)'}</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {budgetStats ? budgetStats.totalAccountsBalance.toLocaleString() : '0'}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            {lang === 'english' ? 'Solvent & Operationally Ready' : 'ބީއެމްއެލް / ކޭޝް ބެލެންސް'}
          </span>
        </div>
      </div>

      {/* Leadership Action & Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presidential Priorities */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white font-heading">
                {lang === 'english' ? 'Presidential Action Center' : 'ރައީސްގެ އިސް އިދާރީ ފިޔަވަޅުތައް'}
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              Constitution & Bylaws
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/portal/events-meetings"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Vote className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'EXCO Voting & Resolutions' : 'ވޯޓުތަކާއި ނިންމުންތައް'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Call a meeting, review quorum, and track voting results on club policies.'
                  : 'ބައްދަލުވުންތަކުގެ ވޯޓުތަކާއި ނިންމުންތައް ފާސްކުރުން.'}
              </p>
            </a>

            <a
              href="/portal/members"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Users className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Member Register & EXCO Directory' : 'މެންބަރުންނާއި ހިންގާ ކޮމިޓީ'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Review registered member data, status, and committee performance.'
                  : 'މެންބަރުންގެ މަޢުލޫމާތާއި ހިންގާ ކޮމިޓީގެ ދައުރު.'}
              </p>
            </a>

            <a
              href="/portal/budget"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Financial Approvals & Auditing' : 'މާލީ ހިސާބުތަކާއި ބަޖެޓް'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Approve major expenditures, monitor dues collection and budget allocations.'
                  : 'ޚަރަދުތަކާއި، އާމްދަނީ އަދި ބަޖެޓް ތަންފީޒުކުރެވޭ މިންވަރު ބެލުން.'}
              </p>
            </a>

            <a
              href="/portal/settings"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Constitution & Club Rules' : 'ކްލަބްގެ އަސާސީ ޤަވާޢިދު'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Access the comprehensive 14-chapter club bylaws and regulations.'
                  : '14 ބާބުގެ މައްޗަށް އެކުލެވޭ ކްލަބްގެ ޤަވާޢިދު ބައްލަވާލެއްވުން.'}
              </p>
            </a>
          </div>
        </div>

        {/* Upcoming EXCO Agenda */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{lang === 'english' ? 'Upcoming EXCO Meetings' : 'ކުރިއަށް އޮތް ބައްދަލުވުންތައް'}</span>
              </h3>
            </div>

            {pendingMeetings.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <p>{lang === 'english' ? 'No pending meetings scheduled' : 'ތާވަލުކުރެވިފައިވާ ބައްދަލުވުމެއް ނެތް'}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingMeetings.slice(0, 3).map(m => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="font-bold text-slate-200">{m.title}</div>
                    <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                      <span>{m.heldDate || 'TBD'}</span>
                      <span>•</span>
                      <span>{m.startTime || ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a
            href="/portal/events-meetings"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center flex items-center justify-center gap-2 transition"
          >
            <span>{lang === 'english' ? 'Manage Meetings' : 'ހުރިހާ ބައްދަލުވުމެއް'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
