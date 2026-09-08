import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { PresidentDashboardView } from './PresidentDashboardView';
import { VicePresidentDashboardView } from './VicePresidentDashboardView';
import { SecretaryDashboardView } from './SecretaryDashboardView';
import { TreasurerDashboardView } from './TreasurerDashboardView';
import { HealthPromotionOfficerDashboardView } from './HealthPromotionOfficerDashboardView';
import { ExcoMemberDashboardView } from './ExcoMemberDashboardView';
import { MemberDashboardView } from './MemberDashboardView';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { Shield, UserCheck, CreditCard } from 'lucide-react';

interface ExcoDashboardViewProps {
  user: User;
  onRefreshUser?: () => void;
}

export type ExcoViewType =
  | 'president'
  | 'vice_president'
  | 'secretary'
  | 'treasurer'
  | 'health_promotion'
  | 'general';

export const ExcoDashboardView: React.FC<ExcoDashboardViewProps> = ({ user, onRefreshUser }) => {
  const { lang } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const [viewMode, setViewMode] = useState<'exco_desk' | 'member_dashboard'>('exco_desk');

  // Determine role-based desk presentation strictly from user assigned role/designation
  const getRoleBasedDeck = (): ExcoViewType => {
    const roleId = (user.roleId || '').toLowerCase();
    const roleLower = (user.roleName || '').toLowerCase();
    const desigLower = (user.designation || '').toLowerCase();

    if (
      roleId === 'role_president' ||
      (roleLower.includes('president') && !roleLower.includes('vice')) ||
      (desigLower.includes('president') && !desigLower.includes('vice'))
    ) {
      return 'president';
    }
    if (
      roleId === 'role_vp' ||
      roleLower.includes('vice president') ||
      desigLower.includes('vice president') ||
      roleLower.includes('vp') ||
      desigLower.includes('vp')
    ) {
      return 'vice_president';
    }
    if (
      roleId === 'role_secretary' ||
      roleLower.includes('secretary') ||
      desigLower.includes('secretary')
    ) {
      return 'secretary';
    }
    if (
      roleId === 'role_treasurer' ||
      roleLower.includes('treasurer') ||
      desigLower.includes('treasurer')
    ) {
      return 'treasurer';
    }
    if (
      roleId === 'role_health_promotion' ||
      roleLower.includes('health') ||
      desigLower.includes('health') ||
      roleLower.includes('promotion') ||
      desigLower.includes('promotion')
    ) {
      return 'health_promotion';
    }
    return 'general';
  };

  const activeExcoView: ExcoViewType = getRoleBasedDeck();

  return (
    <div className="space-y-6">
      {/* Top Toggle Switcher: Executive Desk vs Personal Member Dashboard */}
      <div
        className="p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg"
        dir={isDh ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode('exco_desk')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'exco_desk'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-300" />
            <span>{isDh ? 'އެގްޒެކެޓިވް އޮފިސަރ ޑެސްކު' : 'Executive Officer Desk'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('member_dashboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'member_dashboard'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>{isDh ? 'މެންބަރުގެ އަމިއްލަ ޑޭޝްބޯޑު' : 'My Member Dashboard & Status'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/portal/budget"
            id="exco-bar-pay-fee-btn"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-950/40"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{isDh ? 'ފީ ދައްކަވާ' : 'Pay Fee'}</span>
          </Link>
          <div className="px-3 text-[11px] text-slate-400 font-mono hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{user.fullName || user.username}</span>
            <span className="text-amber-400">({user.designation || user.roleName})</span>
          </div>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'member_dashboard' ? (
        <MemberDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'president' ? (
        <PresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'vice_president' ? (
        <VicePresidentDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'secretary' ? (
        <SecretaryDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'treasurer' ? (
        <TreasurerDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : activeExcoView === 'health_promotion' ? (
        <HealthPromotionOfficerDashboardView user={user} onRefreshUser={onRefreshUser} />
      ) : (
        <ExcoMemberDashboardView user={user} onRefreshUser={onRefreshUser} />
      )}
    </div>
  );
};

