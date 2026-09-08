import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  Users,
  Calendar,
  Vote,
  Sparkles,
  Mail,
  BookOpen,
  RefreshCw,
  FolderLock,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  MeetingItem,
  ClubEvent,
  InboxMessage,
  ModuleKey,
  Role,
  ModulePermission
} from '../../types';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { ClubRulesModal } from './ClubRulesModal';
import { ExcoMemberProfileCard } from './ExcoMemberProfileCard';

interface ExcoMemberDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const ExcoMemberDashboardView: React.FC<ExcoMemberDashboardViewProps> = ({
  user,
  onRefreshUser
}) => {
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [rolePermissions, setRolePermissions] = useState<ModulePermission[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Voting state for resolutions
  const [userVotes, setUserVotes] = useState<Record<string, 'yes' | 'no' | 'abstain'>>({});
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [meetData, evData, msgData, rolesData] = await Promise.all([
        api.getMeetingItems().catch(() => []),
        api.getEvents().catch(() => []),
        api.getMessages().catch(() => ({ inbox: [] })),
        api.getRoles().catch(() => [])
      ]);

      setMeetings(meetData || []);
      setEvents(evData || []);
      setMessages((msgData as any)?.inbox || (msgData as any)?.messages || []);

      if (user.roleId && Array.isArray(rolesData)) {
        const foundRole = rolesData.find((r: Role) => r.id === user.roleId);
        if (foundRole && foundRole.defaultPermissions) {
          setRolePermissions(foundRole.defaultPermissions as any);
        }
      }
    } catch (err: any) {
      showToast('error', isDh ? 'ހިންގާ ކޮމިޓީގެ ޑެސްކުގެ މަޢުލޫމާތު ލޯޑުނުކުރެވުނު: ' + err.message : 'Failed to load EXCO desk data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.roleId, isDh]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCastVote = async (meetingId: string, votingId: string, choice: 'in_favor' | 'against' | 'abstain') => {
    try {
      setSubmittingVote(votingId);
      setUserVotes(prev => ({ ...prev, [votingId]: choice === 'in_favor' ? 'yes' : choice === 'against' ? 'no' : 'abstain' }));

      // Find meeting & voting item to increment
      const meeting = meetings.find(m => m.id === meetingId);
      const voting = meeting?.votings?.find(v => v.id === votingId);
      if (meeting && voting) {
        const currentVotes = voting.votes || { inFavor: 0, against: 0, abstain: 0 };
        const updatedVotes = {
          inFavor: choice === 'in_favor' ? currentVotes.inFavor + 1 : currentVotes.inFavor,
          against: choice === 'against' ? currentVotes.against + 1 : currentVotes.against,
          abstain: choice === 'abstain' ? currentVotes.abstain + 1 : currentVotes.abstain
        };
        await api.updateMeetingVoting(meetingId, votingId, {
          ...voting,
          votes: updatedVotes,
          votedMembers: [
            ...(voting.votedMembers || []),
            {
              memberId: user.linkedMemberId || user.id,
              memberName: user.fullName || user.username,
              choice
            }
          ]
        }).catch(() => null);
      }

      showToast('success', isDh ? 'ވޯޓު ރެކޯޑުކުރެވިއްޖެ' : 'Vote recorded successfully');
      fetchData();
    } catch (err: any) {
      showToast('error', isDh ? 'ވޯޓު ރެކޯޑުކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ: ' + err.message : 'Failed to record vote: ' + err.message);
    } finally {
      setSubmittingVote(null);
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'in_progress');
  const meetingsWithVoting = meetings.filter(m => m.status !== 'completed' && m.status !== 'cancelled' && Array.isArray(m.votings) && m.votings.length > 0);

  const checkPermission = (modKey: ModuleKey, perm: 'canView' | 'canEdit'): boolean => {
    if (user.roleName === 'Admin') return true;
    const direct = user.permissions?.find((p: any) => p.moduleKey === modKey);
    if (direct && direct[perm] !== undefined) return Boolean(direct[perm]);
    const fromRole = rolePermissions.find(p => p.moduleKey === modKey);
    if (fromRole && fromRole[perm] !== undefined) return Boolean(fromRole[perm]);
    return false;
  };

  const excoModules = [
    {
      key: 'events_meetings' as ModuleKey,
      titleDh: 'ބައްދަލުވުންތަކާއި ޙަރަކާތްތައް',
      titleEn: 'Meetings & Events',
      path: '/portal/events',
      icon: Calendar,
      canView: checkPermission('events_meetings', 'canView'),
      canEdit: checkPermission('events_meetings', 'canEdit')
    },
    {
      key: 'members' as ModuleKey,
      titleDh: 'ކްލަބް މެންބަރުންގެ ދަފްތަރު',
      titleEn: 'Club Members Registry',
      path: '/portal/members',
      icon: Users,
      canView: checkPermission('members', 'canView'),
      canEdit: checkPermission('members', 'canEdit')
    },
    {
      key: 'budget' as ModuleKey,
      titleDh: 'ބަޖެޓާއި މާލީ ރިޕޯޓުތައް',
      titleEn: 'Budget & Financial Reports',
      path: '/portal/budget',
      icon: FolderLock,
      canView: checkPermission('budget', 'canView'),
      canEdit: checkPermission('budget', 'canEdit')
    },
    {
      key: 'messages' as ModuleKey,
      titleDh: 'ސިޓީއާއި މެސެޖުތައް',
      titleEn: 'Official Correspondence',
      path: '/portal/messages',
      icon: Mail,
      canView: checkPermission('messages', 'canView'),
      canEdit: checkPermission('messages', 'canEdit')
    },
    {
      key: 'ramazan_quiz' as ModuleKey,
      titleDh: 'ރަމަޟާން ކުއިޒް މެނޭޖްމަންޓް',
      titleEn: 'Ramazan Quiz System',
      path: '/portal/quiz',
      icon: Sparkles,
      canView: checkPermission('ramazan_quiz', 'canView'),
      canEdit: checkPermission('ramazan_quiz', 'canEdit')
    }
  ];

  return (
    <div className="space-y-6" dir={dir}>
      {/* Desk Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                  {isDh ? 'ހިންގާ އޮފީސް • އެގްޒެކެޓިވް ޑެސްކް' : 'Executive Office • EXCO Desk'}
                </span>
                <span className="text-xs text-slate-400">
                  {user.fullName || user.username}
                </span>
                {user.designation && (
                  <span className="text-xs font-mono text-amber-400">
                    ({user.designation})
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                {isDh ? 'ހިންގާ ކޮމިޓީގެ މެންބަރުގެ ޑެސްކު' : 'EXCO Member Executive Desk'}
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {isDh
                  ? 'ކްލަބްގެ ހިންގާ ކޮމިޓީގެ ބައްދަލުވުންތަކުގައި ބައިވެރިވެވަޑައިގަތުމާއި، ނިންމުންތަކަށް ވޯޓު ދެއްވުމާއި، މޮޑިއުލްތައް ބެއްލެވުން.'
                  : 'Executive participation, committee resolutions, meeting agendas, and institutional oversight.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>{isDh ? 'ކްލަބް ޤަވާޢިދު' : 'Club Rules'}</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{isDh ? 'އާކޮށްލާ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Club Member Profile & Standing */}
      <ExcoMemberProfileCard
        user={user}
        onRefreshUser={onRefreshUser || fetchData}
        accentColor="amber"
      />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ކުރިއަށް އޮތް ބައްދަލުވުން' : 'Upcoming Meetings'}
            </span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{upcomingMeetings.length}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ތާވަލުކުރެވިފައިވާ ބައްދަލުވުން' : 'Scheduled meetings'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ހުޅުވިފައިވާ ވޯޓުތައް' : 'Active Votings'}
            </span>
            <Vote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{meetingsWithVoting.length}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ބައިވެރިވެވަޑައިގަންނަވާ ވޯޓު' : 'Open committee ballots'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ޙަރަކާތްތައް' : 'Club Events'}
            </span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">{events.length}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ރޭވިފައިވާ ޙަރަކާތްތައް' : 'Planned activities'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ސިޓީ / މެސެޖު' : 'Inward Messages'}
            </span>
            <Mail className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
            {messages.filter(m => m.status === 'pending').length}
          </p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ބައްލަވާލައްވަންޖެހޭ މެސެޖް' : 'Pending correspondence'}
          </p>
        </div>
      </div>

      {/* Pending Invoices & Bills Executive Approvals Deck */}
      <div>
        <PendingApprovalsSection
          user={user}
          onUpdated={fetchData}
          themeColor="amber"
        />
      </div>

      {/* Active Resolutions & Voting Hub */}
      {meetingsWithVoting.length > 0 && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 font-heading">
              <Vote className="w-5 h-5 text-emerald-400" />
              <span>{isDh ? 'ކޮމިޓީގެ ނިންމުންތަކަށް ވޯޓު ދެއްވުން' : 'Committee Resolutions & Ballots'}</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {meetingsWithVoting.length} {isDh ? 'ބައްދަލުވުމުގައި ވޯޓު އެބައޮތް' : 'Meeting(s) with open ballots'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetingsWithVoting.map(meet => {
              return (
                <div
                  key={meet.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4"
                >
                  <div className="border-b border-slate-800/80 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {meet.meetingType === 'exco' ? (isDh ? 'ހިންގާ ކޮމިޓީގެ ބައްދަލުވުން' : 'EXCO Meeting') : (isDh ? 'ޢާންމު ޖަލްސާ' : 'General Assembly')} • {meet.heldDate}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{meet.title}</h4>
                    {meet.summary && (
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                        {meet.summary}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {meet.votings.map(voting => {
                      const currentChoice = userVotes[voting.id];
                      return (
                        <div key={voting.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-sm font-bold text-white">{voting.topic}</h5>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                {voting.status === 'open' ? (isDh ? 'ހުޅުވިފައި' : 'Open') : (isDh ? 'ބަންދުވެފައި' : 'Closed')}
                              </span>
                            </div>
                            {voting.description && (
                              <p className="text-xs text-slate-400 mt-1">{voting.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                            <span className="text-emerald-400">{isDh ? 'ތާއީދު: ' : 'In Favor: '}{voting.votes?.inFavor ?? 0}</span>
                            <span className="text-rose-400">{isDh ? 'ދެކޮޅު: ' : 'Against: '}{voting.votes?.against ?? 0}</span>
                            <span className="text-slate-400">{isDh ? 'ވަކިކޮޅެއްނެތް: ' : 'Abstain: '}{voting.votes?.abstain ?? 0}</span>
                          </div>

                          {voting.status === 'open' && (
                            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCastVote(meet.id, voting.id, 'in_favor')}
                                disabled={submittingVote === voting.id}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  currentChoice === 'yes'
                                    ? 'bg-emerald-600 text-white shadow'
                                    : 'bg-slate-950 text-slate-300 hover:bg-emerald-600/20 hover:text-emerald-300 border border-slate-800'
                                }`}
                              >
                                {isDh ? 'ތާއީދު' : 'In Favor'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCastVote(meet.id, voting.id, 'against')}
                                disabled={submittingVote === voting.id}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  currentChoice === 'no'
                                    ? 'bg-rose-600 text-white shadow'
                                    : 'bg-slate-950 text-slate-300 hover:bg-rose-600/20 hover:text-rose-300 border border-slate-800'
                                }`}
                              >
                                {isDh ? 'ދެކޮޅު' : 'Against'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCastVote(meet.id, voting.id, 'abstain')}
                                disabled={submittingVote === voting.id}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  currentChoice === 'abstain'
                                    ? 'bg-amber-600 text-white shadow'
                                    : 'bg-slate-950 text-slate-300 hover:bg-amber-600/20 hover:text-amber-300 border border-slate-800'
                                }`}
                              >
                                {isDh ? 'ވަކިކޮޅެއްނެތް' : 'Abstain'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXCO Module Access Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold font-heading text-white flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-amber-400" />
            <span>{isDh ? 'ހިންގާ ކޮމިޓީގެ މޮޑިއުލްތައް' : 'EXCO Module Access'}</span>
          </h3>
          <span className="text-xs text-slate-400">
            {isDh ? 'ދެވިފައިވާ ހުއްދައިގެ ދަށުން މޮޑިއުލްތަކަށް ވަދެވަޑައިގަންނަވާ' : 'Access granted modules directly'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {excoModules.map(mod => {
            const Icon = mod.icon;
            const hasAccess = mod.canView;
            return (
              <div
                key={mod.key}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 ${
                  hasAccess
                    ? 'border-slate-800 hover:border-slate-700 hover:bg-slate-850 shadow-md'
                    : 'border-slate-800/50 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/50">
                      <Icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      {hasAccess ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {mod.canEdit ? (isDh ? 'މެނޭޖްކުރުން' : 'Manage') : (isDh ? 'ބެލުން' : 'View')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">
                          {isDh ? 'ހުއްދައެއް ނެތް' : 'Restricted'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white font-heading">{isDh ? mod.titleDh : mod.titleEn}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{isDh ? mod.titleEn : mod.titleDh}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">{mod.path}</span>
                  {hasAccess ? (
                    <a
                      href={mod.path}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs flex items-center gap-1 transition"
                    >
                      <span>{isDh ? 'ވަދެވަޑައިގަންނަވާ' : 'Open'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600 cursor-not-allowed">
                      {isDh ? 'ވަނުމުގެ ހުއްދައެއް ނެތް' : 'No Access'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Club Rules Modal */}
      {showRulesModal && (
        <ClubRulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />
      )}
    </div>
  );
};
