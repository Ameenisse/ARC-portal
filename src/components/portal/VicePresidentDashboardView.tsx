import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Mail,
  AlertCircle,
  Award,
  Plus
} from 'lucide-react';
import { EventItem, MeetingItem } from '../../types';

interface VicePresidentDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const VicePresidentDashboardView: React.FC<VicePresidentDashboardViewProps> = ({ user }) => {
  const { lang } = usePortalLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [quizStats, setQuizStats] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventList, meetingList, quizRes] = await Promise.all([
          api.getEventItems().catch(() => []),
          api.getMeetingItems().catch(() => []),
          api.getQuizQuestions().catch(() => [])
        ]);
        setEvents(eventList || []);
        setMeetings(meetingList || []);
        setQuizStats({
          questionsCount: Array.isArray(quizRes) ? quizRes.length : 0
        });
      } catch (err: any) {
        showToast('error', 'Failed to load VP operational data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const completedEvents = events.filter(e => e.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Vice President Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Office of the Vice President</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Operations, Activities & Committee Oversight
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {lang === 'english' ? "Vice President's Operations Deck" : 'ނައިބު ރައީސްގެ އޮޕަރޭޝަނަލް ޕެނަލް'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {lang === 'english'
              ? 'Supervise club activities, community sports events, Ramadan quiz logistics, sub-committee projects, and member engagement initiatives.'
              : 'ކްލަބްގެ ހަރަކާތްތަކާއި، ކުޅިވަރު މުބާރާތްތަކާއި، ރަމަޟާން ކުއިޒް އަދި ސަބް ކޮމިޓީތަކުގެ ހިންގުން ސީދާ ވިލަރެސްކުރާ ޕެނަލް.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/portal/events-meetings"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 transition"
          >
            <Calendar className="w-4 h-4" />
            <span>{lang === 'english' ? 'Club Activities' : 'ހަރަކާތްތައް ރޭވުން'}</span>
          </a>
          <a
            href="/portal/ramazan-quiz"
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>{lang === 'english' ? 'Ramadan Quiz' : 'ރަމަޟާން ކުއިޒް'}</span>
          </a>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Upcoming Activities' : 'ކުރިއަށް އޮތް ހަރަކާތްތައް'}</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {upcomingEvents.length}
          </div>
          <span className="text-[11px] text-sky-400 font-medium">
            {events.length} {lang === 'english' ? 'Total Club Events' : 'ޖުމްލަ ހަރަކާތް'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Completed Events' : 'ނިމިފައިވާ ހަރަކާތްތައް'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {completedEvents.length}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            {lang === 'english' ? 'Successfully Delivered' : 'ކާމިޔާބުކަމާއެކު ހިންގުނު'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Ramadan Quiz Rounds' : 'ރަމަޟާން ކުއިޒް ސުވާލު'}</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {quizStats?.questionsCount ?? 0}
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            {lang === 'english' ? 'Active Questions & Draws' : 'ސުވާލާއި ޤުރުޢަތުތައް'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'EXCO Meetings Quorum' : 'ބައްދަލުވުންތަކުގެ ޙާޟިރީ'}</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {meetings.length}
          </div>
          <span className="text-[11px] text-purple-400 font-medium">
            {lang === 'english' ? 'Committee sessions held' : 'ކޮމިޓީ ބައްދަލުވުން'}
          </span>
        </div>
      </div>

      {/* Operational Task Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span>{lang === 'english' ? 'Operations & Activity Management' : 'އޮޕަރޭޝަން އަދި ޙަރަކާތްތައް ހިންގުން'}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/portal/events-meetings"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Plan New Club Activity' : 'އައު ޙަރަކާތެއް ރޭވުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Coordinate community events, venue bookings, and member attendance lists.'
                  : 'ޙަރަކާތްތަކާއި، ކުޅިވަރު މުބާރާތްތަކާއި ޙާޟިރީ ރެކޯޑުކުރުން.'}
              </p>
            </a>

            <a
              href="/portal/ramazan-quiz"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Ramadan Quiz Supervisions' : 'ރަމަޟާން ކުއިޒް ބެލެހެއްޓުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Publish daily quiz questions, check eligibility, and perform random lucky draws.'
                  : 'ސުވާލުތައް ޝާއިޢުކުރުމާއި، ބައިވެރިންގެ ޞައްޙަކަން ކަށަވަރުކުރުން.'}
              </p>
            </a>

            <a
              href="/portal/messages"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Community Feedback & Inquiries' : 'ޢާންމުންގެ މެސެޖުތަކާއި ސުވާލުތައް'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Address public messages, feedback, and community event inquiries.'
                  : 'ވެބްސައިޓް މެދުވެރިކޮށް ލިބޭ މެސެޖުތަކަށް ޖަވާބުދާރީވުން.'}
              </p>
            </a>

            <a
              href="/portal/members"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Users className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Volunteer & Member Engagement' : 'މެންބަރުންގެ ޝާމިލުވުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Track active participation in recreation programs and community projects.'
                  : 'ހަރަކާތްތަކުގައި މެންބަރުން ބައިވެރިވާ މިންވަރު ބެލުން.'}
              </p>
            </a>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>{lang === 'english' ? 'Upcoming Activities' : 'ތާވަލުކުރެވިފައިވާ ޙަރަކާތްތައް'}</span>
            </h3>

            {upcomingEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <p>{lang === 'english' ? 'No upcoming activities' : 'ކުރިއަށް އޮތް ހަރަކާތެއް ނެތް'}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.slice(0, 3).map(ev => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="font-bold text-slate-200">{ev.title}</div>
                    <div className="text-slate-400 flex items-center gap-2 text-[11px]">
                      <span>{ev.heldDate || 'TBD'}</span>
                      <span>•</span>
                      <span>{ev.venue || 'Aanandha Club Center'}</span>
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
            <span>{lang === 'english' ? 'Manage Activities' : 'ހުރިހާ ޙަރަކާތްތައް ބެއްލެވުމަށް'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
