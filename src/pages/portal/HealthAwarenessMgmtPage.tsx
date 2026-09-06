import React from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { HealthAwarenessTab } from '../../components/portal/HealthAwarenessTab';
import { useAuth } from '../../context/AuthContext';
import { HeartPulse, ExternalLink, Sparkles, ShieldCheck, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HealthAwarenessMgmtPage: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const isAdmin = user?.roleName === 'Admin' || user?.roleId === 'role_admin' || user?.roleName?.toLowerCase().includes('admin');
  
  const canCreate = isAdmin || hasPermission('health_awareness', 'canCreate') || hasPermission('content', 'canCreate');
  const canEdit = isAdmin || hasPermission('health_awareness', 'canEdit') || hasPermission('content', 'canEdit');
  const canDelete = isAdmin || hasPermission('health_awareness', 'canDelete') || hasPermission('content', 'canDelete');

  return (
    <PortalLayout currentModule="health_awareness" title="ޞިއްޙީ ހޭލުންތެރިކަމުގެ މޮޑިއުލް (Health Awareness Module)">
      <div className="space-y-6">
        
        {/* Dedicated Module Header */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          {/* Subtle decorative background accent */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Health Awareness Module
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                    ވަކި ޚާއްޞަ މޮޑިއުލެއް
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight">
                  ޞިއްޙީ ހޭލުންތެރިކަމުގެ މޮޑިއުލް
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  ވެބްސައިޓްގެ މަތީގައި އޮޓޯ-ސްކްރޯލްވާ ޞިއްޙީ އިރުޝާދުތަކާއި، ދުޅަހެޔޮކަމުގެ މަޢުލޫމާތާއި، ބްލޮގް ލިޔުންތަކާއި ފޮޓޯތައް މި މޮޑިއުލް މެދުވެރިކޮށް ބަލަހައްޓަވާ.
                </p>
              </div>
            </div>

            {/* Public Page Link Button */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <Link
                to="/health-awareness"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/40 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md group"
              >
                <Newspaper className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>ޢާންމު ބްލޮގް ޕޭޖް ބައްލަވާ</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Health Awareness Core Management Component */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
          <HealthAwarenessTab
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </div>

      </div>
    </PortalLayout>
  );
};
export default HealthAwarenessMgmtPage;
