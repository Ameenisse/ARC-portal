import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Vote,
  Target,
  FileCheck,
  Check,
  Award
} from 'lucide-react';
import { User, EventItem, MeetingItem, PresidentialDirective, ClubMember } from '../../types';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { ExcoMemberProfileCard } from './ExcoMemberProfileCard';

interface VicePresidentDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

export const VicePresidentDashboardView: React.FC<VicePresidentDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [directives, setDirectives] = useState<PresidentialDirective[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsData, meetingsData, directivesData, membersData] = await Promise.all([
        api.getEventItems().catch(() => []),
        api.getMeetingItems().catch(() => []),
        api.getPresidentialDirectives().catch(() => []),
        api.getMembers().catch(() => [])
      ]);
      setEvents(eventsData || []);
      setMeetings(meetingsData || []);
      setDirectives(directivesData || []);
      setMembers(membersData || []);
    } catch (err: any) {
      showToast('error', isDh ? 'ނައިބު ރައީސްގެ މައުލޫމާތު ލޯޑުނުކުރެވުނު: ' + err.message : 'Failed to load vice president data: ' + err.message);
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

  const handleToggleDirective = async (directive: PresidentialDirective) => {
    const nextStatus = directive.status === 'completed' ? 'in_progress' : 'completed';
    try {
      const updated = await api.updatePresidentialDirective(directive.id, {
        status: nextStatus,
        completionNotes: nextStatus === 'completed' ? `Executed under Vice President supervision on ${new Date().toLocaleDateString()}` : undefined
      });
      setDirectives(prev => prev.map(d => (d.id === directive.id ? updated : d)));
      showToast('success', isDh ? 'އިރުޝާދުގެ ޙާލަތު ބަދަލުކުރެވިއްޖެ' : `Directive updated to ${nextStatus}.`);
    } catch (err: any) {
      showToast('error', isDh ? 'އިރުޝާދު އަޕްޑޭޓެއް ނުކުރެވުނު: ' + err.message : 'Failed to update directive: ' + err.message);
    }
  };

  const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
  const assignedDirectives = directives.filter(d => d.status !== 'completed');

  return (
    <div className="space-y-6" dir={dir}>
      {/* Vice President Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isDh ? 'ނައިބު ރައީސްގެ އޮފީސް' : 'Office of the Vice President'}</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
              {isDh ? 'އޮޕަރޭޝަންސް އަދި ޕްރޮގްރާމް މެނޭޖްމަންޓް' : 'Operations & Program Management'}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {isDh ? 'ނައިބު ރައީސްގެ އޮޕަރޭޝަންސް ޕެނަލް' : "Vice President's Operations Deck"}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ ހަރަކާތްތަކާއި ޕްރޮގްރާމްތައް ވިލަރެސްކުރުމާއި، ކޮމިޓީތަކުގެ ހިންގުން ބެލެހެއްޓުމާއި، އަދި ރިޔާސީ އިރުޝާދުތައް ތަންފީޒުކުރުން.'
              : 'Direct club operations, supervise community programs and events, coordinate sub-committees, and oversee implementation of presidential directives.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <a
            href="/portal/events-meetings"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>{isDh ? 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތައް' : 'Manage Events & Meetings'}</span>
          </a>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{isDh ? 'އާކޮށްލާ' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Official Club Member Profile & Personal Standing */}
      <ExcoMemberProfileCard
        user={user}
        onRefreshUser={onRefreshUser || fetchData}
        accentColor="sky"
      />

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ތާވަލުކުރެވިފައިވާ ޙަރަކާތް' : 'Scheduled Events'}</span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {events.length}
          </div>
          <span className="text-[11px] text-sky-400 font-medium">
            {upcomingEvents.length} {isDh ? 'އެކްޓިވް / ކުރިއަށްހުރި' : 'Active / Upcoming'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ކޮމިޓީ ބައްދަލުވުންތައް' : 'Committee Meetings'}</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {meetings.length}
          </div>
          <span className="text-[11px] text-slate-400">
            {upcomingMeetings.length} {isDh ? 'ތާވަލުކުރެވިފައި' : 'Scheduled'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ތަންފީޒުވަމުންދާ އިރުޝާދު' : 'Directives In Execution'}</span>
            <Target className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-extrabold text-orange-400 font-mono">
            {assignedDirectives.length}
          </div>
          <span className="text-[11px] text-orange-300 font-medium">
            {isDh ? 'ހިނގަމުންދާ އޮޕަރޭޝަނަލް އިރުޝާދު' : 'Active Operational Directives'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isDh ? 'ދަފްތަރުގައިވާ މެންބަރުން' : 'Enrolled Members'}</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {members.filter(m => m.status === 'active').length}
          </div>
          <span className="text-[11px] text-slate-400">
            {isDh ? 'ޖުމްލަ އެކްޓިވް މެންބަރުން' : 'Total Active Roster'}
          </span>
        </div>
      </div>

      {/* Pending Invoices & Bills Executive Approvals Deck */}
      <PendingApprovalsSection
        user={user}
        onUpdated={fetchData}
        themeColor="sky"
      />

      {/* Operations Overview & Directives Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Operational Directives Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <Target className="w-5 h-5 text-orange-400" />
              <span>{isDh ? 'އޮޕަރޭޝަނަލް އިރުޝާދުތައް ބަލަހައްޓާ ބައި' : 'Operational Directives Tracker'}</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-bold">
              {assignedDirectives.length} {isDh ? 'ހިނގަމުންދާ' : 'Active'}
            </span>
          </div>

          {assignedDirectives.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
              <p>{isDh ? 'ހުރިހާ އޮޕަރޭޝަނަލް އިރުޝާދުތަކެއް ވަނީ ފުރިހަމަކުރެވިފައި.' : 'All operational directives are currently completed.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedDirectives.map(dir => (
                <div key={dir.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{dir.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        dir.priority === 'urgent' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {dir.priority === 'urgent' ? (isDh ? 'އަވަސް' : 'Urgent') : (isDh ? 'މުހިންމު' : dir.priority)}
                    </span>
                  </div>
                  {dir.description && <p className="text-xs text-slate-400 leading-relaxed">{dir.description}</p>}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{isDh ? 'އަމާޒު:' : 'Target:'} {dir.targetDate || (isDh ? 'ވަގުތުން' : 'Immediate')}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleDirective(dir)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>{isDh ? 'ނިންމާ' : 'Complete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events & Programs Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
              <Calendar className="w-5 h-5 text-sky-400" />
              <span>{isDh ? 'ޕްރޮގްރާމް އަދި ޙަރަކާތްތަކުގެ ތާވަލު' : 'Program & Event Schedules'}</span>
            </h3>
            <a href="/portal/events-meetings" className="text-xs text-sky-400 hover:underline">
              {isDh ? 'ހުރިހާ ޕްރޮގްރާމެއް ބައްލަވާ' : 'View All Programs'}
            </a>
          </div>

          {events.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-2">
              <Calendar className="w-8 h-8 mx-auto opacity-40 text-slate-600" />
              <p>{isDh ? 'އަދި އެއްވެސް ޕްރޮގްރާމެއް ނުވަތަ ޙަރަކާތެއް ތާވަލުކުރެވިފައެއް ނެތް.' : 'No programs or events scheduled yet.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 4).map(evt => (
                <div key={evt.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white">{evt.title}</h5>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{evt.heldDate || (evt as any).eventDate} — {evt.startTime}</span>
                      <span className="text-slate-600">•</span>
                      <span>{evt.venue || (isDh ? 'ތަން ކަނޑަނޭޅޭ' : 'TBA')}</span>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 text-[11px] font-bold shrink-0">
                    {evt.status === 'upcoming' ? (isDh ? 'ކުރިއަށްއޮތް' : 'Upcoming') : evt.status === 'ongoing' ? (isDh ? 'ހިނގަމުންދާ' : 'Ongoing') : (evt.status || '').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Program Oversight Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/portal/events-meetings"
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 w-fit group-hover:scale-110 transition">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތަކުގެ ޑެސްކް' : 'Events & Meetings Desk'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ކްލަބުގެ ޙަރަކާތްތައް ރޭވުމާއި، ކޮމިޓީ ބައްދަލުވުންތައް އިންތިޒާމުކުރުމާއި، އަދި ޙާޟިރީ ރެކޯޑު ބެލެހެއްޓުން.'
              : 'Create club events, organize committee assemblies, and record attendance logs.'}
          </p>
          <span className="text-xs font-bold text-sky-400 block pt-1">
            {isDh ? 'ޕްރޮގްރާމްތައް ބަލަހައްޓަވާ ←' : 'Manage Programs →'}
          </span>
        </a>

        <a
          href="/portal/ramazan-quiz"
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit group-hover:scale-110 transition">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'ރަމަޟާން ކުއިޒް ހިންގުން' : 'Ramadan Quiz Operations'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'ކޮންމެ ދުވަހެއްގެ ކުއިޒް ޝާއިޢުކުރުމާއި، ބައިވެރިން ކަށަވަރުކުރުމާއި އަދި ގުރުއަތު ނެގުން ބެލެހެއްޓުން.'
              : 'Oversee daily quiz publishing, participant verification, and lucky draw executions.'}
          </p>
          <span className="text-xs font-bold text-emerald-400 block pt-1">
            {isDh ? 'ރަމަޟާން ކުއިޒް ހުޅުވާލައްވާ ←' : 'Open Ramadan Quiz →'}
          </span>
        </a>

        <a
          href="/portal/members"
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 w-fit group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">
            {isDh ? 'މެންބަރުންގެ ދަފްތަރާއި ބައިވެރިވުން' : 'Members Roster & Engagement'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {isDh
              ? 'މެންބަރުންގެ ބައިވެރިވުމުގެ ރެކޯޑުތަކާއި، ޕަރފޯމަންސް ސްކޯތައް އަދި ކޮމިޓީ މަސައްކަތްތައް ބެލުން.'
              : 'Track member participation records, engagement scores, and committee assignments.'}
          </p>
          <span className="text-xs font-bold text-amber-400 block pt-1">
            {isDh ? 'މެންބަރުންގެ ދަފްތަރު ބައްލަވާ ←' : 'View Members Roster →'}
          </span>
        </a>
      </div>
    </div>
  );
};
