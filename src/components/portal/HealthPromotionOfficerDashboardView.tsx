import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  HeartPulse,
  Activity,
  Calendar,
  Sparkles,
  BookOpen,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Tag,
  Users,
  Eye,
  ArrowRight,
  ExternalLink,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { HealthAwarenessItem, ClubEvent } from '../../types';
import { HealthAwarenessTab } from './HealthAwarenessTab';
import { ClubRulesModal } from './ClubRulesModal';
import { ExcoMemberProfileCard } from './ExcoMemberProfileCard';

interface HealthPromotionOfficerDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const HealthPromotionOfficerDashboardView: React.FC<HealthPromotionOfficerDashboardViewProps> = ({
  user,
  onRefreshUser
}) => {
  const { lang, dir } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthItems, setHealthItems] = useState<HealthAwarenessItem[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'events' | 'resources'>('campaigns');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, eventsData] = await Promise.all([
        api.getHealthAwareness().catch(() => []),
        api.getEvents().catch(() => [])
      ]);
      setHealthItems(itemsData || []);
      setEvents(eventsData || []);
    } catch (err: any) {
      showToast('error', isDh ? 'ޞިއްޙަތު ކުރިއަރުވާ ޑެސްކުގެ މަޢުލޫމާތު ލޯޑުނުކުރެވުނު: ' + err.message : 'Failed to load health promotion data: ' + err.message);
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

  const activeCount = healthItems.filter(i => i.status === 'active').length;
  const urgentCount = healthItems.filter(i => i.priority === 'urgent' || i.priority === 'important').length;

  // Filter events related to sports, health, running, or fitness
  const healthEvents = events.filter(e => {
    const title = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const sum = (e.summary || '').toLowerCase();
    return (
      title.includes('run') ||
      title.includes('health') ||
      title.includes('sport') ||
      title.includes('fitness') ||
      title.includes('marathon') ||
      title.includes('blood') ||
      title.includes('medical') ||
      title.includes('ކަސްރަތު') ||
      title.includes('ޞިއްޙަތު') ||
      title.includes('ދުވުން') ||
      desc.includes('health') ||
      desc.includes('sport') ||
      sum.includes('health') ||
      sum.includes('sport')
    );
  });

  return (
    <div className="space-y-6" dir={dir}>
      {/* Desk Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 shrink-0">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                  {isDh ? 'ހިންގާ އޮފީސް • އޮފިސަރުގެ ޑެސްކް' : 'Executive Office • Officer Desk'}
                </span>
                <span className="text-xs text-slate-400">
                  {user.fullName || user.username}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-heading">
                {isDh ? 'ޞިއްޙަތާއި ދުޅަހެޔޮކަން ކުރިއަރުވާ އޮފީސް' : 'Health Promotion Officer Desk'}
              </h1>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                {isDh
                  ? 'ކްލަބްގެ މެންބަރުންނާއި މުޖުތަމަޢުގެ ދުޅަހެޔޮކަން އިތުރުކުރުމަށް ކެމްޕޭންތަކާއި، ކަސްރަތު ޙަރަކާތްތައް ރާވައި ހިންގުން.'
                  : 'Public health awareness initiatives, wellness campaigns, fitness programs, and healthy lifestyle promotion.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-rose-400" />
              <span>{isDh ? 'ކްލަބް ޤަވާޢިދު' : 'Club Rules'}</span>
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-rose-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{isDh ? 'އާކޮށްލާ' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Club Member Profile & Personal Standing */}
      <ExcoMemberProfileCard
        user={user}
        onRefreshUser={onRefreshUser || fetchData}
        accentColor="rose"
      />

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ޖުމްލަ ކެމްޕޭން' : 'Total Campaigns'}
            </span>
            <Tag className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">{healthItems.length}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ރެކޯޑުކުރެވިފައިވާ ކެމްޕޭން' : 'Health awareness topics'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ދައްކާ ކެމްޕޭން' : 'Active Live'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">{activeCount}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ޕޯޓަލްގައި ޢާންމުކޮށް ފެންނަ' : 'Live on Portal & Home'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ޚާއްޞަ ސަމާލުކަން' : 'Priority Alerts'}
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{urgentCount}</p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'މުހިންމު ނުވަތަ އަވަސް' : 'Important / Urgent items'}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {isDh ? 'ކަސްރަތު / ދުޅަހެޔޮކަން' : 'Wellness Events'}
            </span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono">
            {healthEvents.length > 0 ? healthEvents.length : events.length}
          </p>
          <p className="text-[11px] text-slate-400">
            {isDh ? 'ރޭވިފައިވާ ކުޅިވަރު ޙަރަކާތް' : 'Sports & wellness drives'}
          </p>
        </div>
      </div>

      {/* Desk Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>{isDh ? 'ޞިއްޙީ ކެމްޕޭންތައް މެނޭޖްކުރުން' : 'Health Campaigns & Advisories'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'events'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isDh ? 'ކުޅިވަރާއި ދުޅަހެޔޮކަމުގެ ޙަރަކާތްތައް' : 'Fitness & Sports Events'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {healthEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isDh ? 'ޞިއްޙީ އިރުޝާދާއި ވަސީލަތްތައް' : 'Wellness Resources & Guidelines'}</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'campaigns' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
          <HealthAwarenessTab canCreate={true} canEdit={true} canDelete={true} />
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-400" />
              <span>{isDh ? 'ރޭވިފައިވާ ކުޅިވަރާއި ކަސްރަތު ޙަރަކާތްތައް' : 'Scheduled Sports & Wellness Activities'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {events.length} {isDh ? 'ޙަރަކާތް' : 'events scheduled in ARC'}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">
                {isDh ? 'ކުޅިވަރާއި ދުޅަހެޔޮކަމުގެ އެއްވެސް ޙަރަކާތެއް ރޭވިފައެއް ނެތް' : 'No sports or wellness events found'}
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isDh
                  ? 'އައު ދުވުމުގެ ޙަރަކާތްތަކާއި، ކަސްރަތު ކްލާސްތައް އިވެންޓްސް މޮޑިއުލް މެދުވެރިކޮށް ރާއްވަވާ'
                  : 'You can organize marathons, fitness sessions, and screening camps from the Events & Meetings module.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-5 space-y-3 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {ev.location || (isDh ? 'ކްލަބް ޙަރަކާތް' : 'Club Activity')}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ev.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ev.status === 'active' ? (isDh ? 'ހިނގަމުންދާ' : 'Active') : (isDh ? 'ނިމިފައި' : 'Inactive')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug">{ev.title}</h4>
                    {(ev.summary || ev.description) && (
                      <p className="text-xs text-slate-400 line-clamp-2">{ev.summary || ev.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {ev.eventDate || 'TBD'}
                      </span>
                      {ev.location && (
                        <span className="truncate max-w-[140px] text-slate-300">{ev.location}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Wellness Standards */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {isDh ? 'ކްލަބްގެ ދުޅަހެޔޮކަމުގެ މިންގަނޑުތައް' : 'Club Health & Safety Protocols'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isDh
                ? 'އާނަންދާ ރެކްރިއޭޝަން ކްލަބުގެ ހުރިހާ ޙަރަކާތްތަކެއްގައި މެންބަރުންގެ ޞިއްޙީ ރައްކާތެރިކަން ކަށަވަރުކުރުމާއި، ކުޅިވަރު ޙަރަކާތްތަކުގައި ފުރަތަމަ އެހީ ފޯރުކޮށްދިނުމުގެ އިންތިޒާމުތައް ހަމަޖެއްސުން.'
                : 'Protocols for athlete first-aid preparedness, hydration management during endurance activities, and health disclosures prior to tournaments.'}
            </p>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isDh ? 'ޙަރަކާތްތައް ހިންގާއިރު ފަސްޓް އެއިޑް ކިޓް ތައްޔާރަށް ބެހެއްޓުން' : 'Maintain emergency First-Aid kits ready during all club events'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isDh ? 'މެންބަރުންނަށް ކާނާއާއި ކަސްރަތުގެ ދުޅަހެޔޮ މަޢުލޫމާތު ފޯރުކޮށްދިނުން' : 'Disseminate verified nutritional and fitness guidance to members'}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isDh ? 'ޤައުމީ ޞިއްޙީ ދުވަސްތައް ފާހަގަކުރުމާއި ހޭލުންތެރިކަން އިތުރުކުރުން' : 'Commemorate national health days with public outreach and walks'}</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Recommended Health Themes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Flame className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {isDh ? 'މުހިންމު ޞިއްޙީ މައުޟޫޢުތައް' : 'Active Health Campaign Pillars'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-rose-300 block mb-1">
                  {isDh ? 'ޢާންމު ޞިއްޙަތު' : 'Public Health'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isDh ? 'ދިރިއުޅުމުގެ ޞިއްޙީ ޢާދަތަކާއި ބަލިތަކުން ރައްކާތެރިވުން' : 'Lifestyle habits and prevention of non-communicable diseases'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-sky-300 block mb-1">
                  {isDh ? 'ކަސްރަތާއި ކުޅިވަރު' : 'Fitness & Sports'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isDh ? 'ދުވަހުން ދުވަހަށް ހަރަކާތްތެރިވެ އުޅުމާއި ދުވުން' : 'Daily active movement, cardio stamina, and organized runs'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-emerald-300 block mb-1">
                  {isDh ? 'ދުޅަހެޔޮ ކެއިންބުއިން' : 'Healthy Nutrition'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isDh ? 'ހަކުރާއި ލޮނު މަދުކުރުމާއި ތާޒާ ކާނާ ބޭނުންކުރުން' : 'Lowering sugar/salt and choosing fresh hydration & balanced diet'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-purple-300 block mb-1">
                  {isDh ? 'ނަފްސާނީ ދުޅަހެޔޮކަން' : 'Mental Well-being'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isDh ? 'ސްޓްރެސް ކުޑަކުރުމާއި ނަފްސާނީ ހަމަޖެހުން' : 'Stress mitigation, team camaraderie, and mindfulness'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
