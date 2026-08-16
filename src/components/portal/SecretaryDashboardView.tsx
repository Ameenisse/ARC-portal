import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  FileText,
  Calendar,
  Users,
  Mail,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
  Send,
  AlertCircle,
  Inbox,
  Award
} from 'lucide-react';
import { MeetingItem, InboxMessage } from '../../types';

interface SecretaryDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const SecretaryDashboardView: React.FC<SecretaryDashboardViewProps> = ({ user }) => {
  const { lang } = usePortalLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [meetingList, msgRes, dashStats] = await Promise.all([
          api.getMeetingItems().catch(() => []),
          api.getMessages().catch(() => ({ inbox: [] })),
          api.getDashboardStats().catch(() => null)
        ]);
        setMeetings(meetingList || []);
        setMessages((msgRes as any)?.inbox || (msgRes as any)?.messages || []);
        setMemberCount(dashStats?.membersCount ?? 0);
      } catch (err: any) {
        showToast('error', 'Failed to load secretarial data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const unreadMessages = messages.filter(m => m.status === 'pending' || m.status === 'in_progress');
  const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');

  return (
    <div className="space-y-6">
      {/* Secretary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>Office of the Secretary General</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Administration, Minutes & Official Correspondence
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {lang === 'english' ? "Secretary General's Secretariat Deck" : 'ސެކްރެޓަރީ ޖެނެރަލްގެ އިދާރީ ކޮމާންޑް ޕެނަލް'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {lang === 'english'
              ? 'Draft meeting agendas, record official minutes, publish executive resolutions, manage formal correspondence, and maintain member registry records.'
              : 'ބައްދަލުވުންތަކުގެ އެޖެންޑާއާއި ޔައުމިއްޔާ ލިޔެ ބެލެހެއްޓުމާއި، ކްލަބްގެ ސިޓީ މުޢާމަލާތްތަކާއި މެންބަރުންގެ ރަޖިސްޓްރީ ބެލެހެއްޓުމުގެ މައި މަރުކަޒު.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/portal/events-meetings"
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'english' ? 'New Meeting & Minutes' : 'އައު ބައްދަލުވުން / ޔައުމިއްޔާ'}</span>
          </a>
          <a
            href="/portal/messages"
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <Inbox className="w-4 h-4 text-indigo-400" />
            <span>{lang === 'english' ? 'Inbox & Mail' : 'އިންބޮކްސް'}</span>
          </a>
        </div>
      </div>

      {/* Secretarial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Meeting Minutes' : 'ޖުމްލަ ޔައުމިއްޔާތައް'}</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {meetings.length}
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">
            {scheduledMeetings.length} {lang === 'english' ? 'Upcoming Sessions' : 'ކުރިއަށް އޮތް ބައްދަލުވުން'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Unread Inquiries' : 'ނުކިޔާ މެސެޖުތައް'}</span>
            <Mail className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {unreadMessages.length}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {messages.length} {lang === 'english' ? 'Total Correspondence' : 'ޖުމްލަ ލިބުނު މެސެޖް'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Official Members Registry' : 'މެންބަރުންގެ ދަފްތަރު'}</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {memberCount}
          </div>
          <span className="text-[11px] text-blue-400 font-medium">
            {lang === 'english' ? 'Active Records' : 'ރަޖިސްޓްރީ ޞައްޙަ މެންބަރުން'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === 'english' ? 'Administrative Status' : 'އިދާރީ ހާލަތު'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            100%
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">
            {lang === 'english' ? 'Records & Archives Synced' : 'ރެކޯޑުތައް ފުރިހަމަކުރެވިފައި'}
          </span>
        </div>
      </div>

      {/* Secretarial Tools & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>{lang === 'english' ? 'Administrative Operations' : 'އިދާރީ މަސައްކަތްތަކާއި ލިޔެކިޔުން'}</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/portal/events-meetings"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Meeting Minutes & Resolutions' : 'ބައްދަލުވުންތަކާއި ޔައުމިއްޔާ'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Record attendee list, formal minutes, agenda items, and voting outcomes.'
                  : 'ބައްދަލުވުމުގެ އެޖެންޑާ، ޙާޟިރީ، އަދި ނިންމުންތައް ލިޔެ ރައްކާކުރުން.'}
              </p>
            </a>

            <a
              href="/portal/messages"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-rose-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <Mail className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Official Inquiries & Mailbox' : 'އިންބޮކްސް މެސެޖުތައް ބެލެހެއްޓުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Review incoming messages from public portal and track response status.'
                  : 'ޕޯޓަލް މެދުވެރިކޮށް ލިބޭ ސިޓީ މުޢާމަލާތްތަކަށް ޖަވާބުދާރީވުން.'}
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
                {lang === 'english' ? 'Members Registry Records' : 'މެންބަރުންގެ މަޢުލޫމާތު އަދާހަމަކުރުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'Add new members, issue membership IDs, and link user profiles.'
                  : 'އައު މެންބަރުން އިތުރުކުރުމާއި، މެންބަރ ނަންބަރާއި ޕްރޮފައިލް ގުޅުވުން.'}
              </p>
            </a>

            <a
              href="/portal/settings"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition transform group-hover:translate-x-1" />
              </div>
              <h4 className="font-bold text-white text-sm">
                {lang === 'english' ? 'Club Bylaws & Regulations' : 'ކްލަބް ޤަވާޢިދު ބެލެހެއްޓުން'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'english'
                  ? 'View and update articles of ARC official constitution and amendments.'
                  : 'ޤަވާޢިދުގެ ބާބުތަކާއި މާއްދާތައް ބަލަހައްޓައި އަދާހަމަކުރުން.'}
              </p>
            </a>
          </div>
        </div>

        {/* Recent Inquiries Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <span>{lang === 'english' ? 'Latest Inquiries' : 'އެންމެ ފަހުގެ މެސެޖުތައް'}</span>
            </h3>

            {messages.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                <p>{lang === 'english' ? 'No messages received yet' : 'އެއްވެސް މެސެޖެއް ނެތް'}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.slice(0, 3).map(msg => (
                  <div key={msg.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{msg.senderName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${msg.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                        {msg.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] line-clamp-1">
                      {msg.subject || (msg as any).message || (msg as any).body || ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a
            href="/portal/messages"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center flex items-center justify-center gap-2 transition"
          >
            <span>{lang === 'english' ? 'Open Inbox' : 'އިންބޮކްސް ހުޅުވާލުމަށް'}</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
