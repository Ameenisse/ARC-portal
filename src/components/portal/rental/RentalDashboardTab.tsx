import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FileText,
  RotateCcw,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { RentalStats } from '../../../types';
import { authFetch } from '../../../services/api';

interface RentalDashboardTabProps {
  onNavigateTab: (tab: string) => void;
  lang?: string;
}

export const RentalDashboardTab: React.FC<RentalDashboardTabProps> = ({ onNavigateTab, lang = 'dv' }) => {
  const [stats, setStats] = useState<RentalStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/portal/rental/stats');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setStats(data);
      } else if (res.ok) {
        // Fallback endpoint if needed
        const altRes = await authFetch('/api/portal/rental/dashboard');
        const altType = altRes.headers.get('content-type') || '';
        if (altRes.ok && altType.includes('application/json')) {
          const data = await altRes.json();
          setStats(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load rental stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        ލޯޑުވަނީ... (Loading rental statistics...)
      </div>
    );
  }

  const rawStats = stats as any;
  const s = {
    totalItems: Number(rawStats?.totalItems ?? rawStats?.activeRentalItems ?? 0),
    totalUnits: Number(rawStats?.totalUnits ?? rawStats?.totalInventoryUnits ?? 0),
    availableUnits: Number(rawStats?.availableUnits ?? rawStats?.availableNow ?? 0),
    rentedUnits: Number(rawStats?.rentedUnits ?? rawStats?.currentlyRented ?? 0),
    maintenanceUnits: Number(rawStats?.maintenanceUnits ?? 0),
    damagedUnits: Number(rawStats?.damagedUnits ?? 0),
    pendingRequests: Number(rawStats?.pendingRequests ?? 0),
    pendingPayments: Number(rawStats?.pendingPayments ?? 0),
    readyForHandover: Number(rawStats?.readyForHandover ?? 0),
    activeRentals: Number(rawStats?.activeRentals ?? rawStats?.currentlyRented ?? 0),
    returnInspectionsPending: Number(rawStats?.returnInspectionsPending ?? 0),
    overdueRentals: Number(rawStats?.overdueRentals ?? 0),
    monthlyRevenue: Number(rawStats?.monthlyRevenue ?? rawStats?.rentalIncomeThisMonth ?? 0),
    totalRevenue: Number(rawStats?.totalRevenue ?? rawStats?.rentalIncomeThisMonth ?? 0),
    maintenanceOrDamaged: Number(rawStats?.maintenanceOrDamaged ?? 0)
  };

  const isEn = lang === 'english';

  return (
    <div className="space-y-6">
      {/* Urgent Action Alerts */}
      {(s.overdueRentals > 0 || s.pendingPayments > 0 || s.pendingRequests > 0 || s.readyForHandover > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {s.overdueRentals > 0 && (
            <div
              onClick={() => onNavigateTab('returns')}
              className="cursor-pointer p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-300">
                    {isEn ? 'Overdue Rentals' : 'މުއްދަތު ހަމަވެފައިވާ ކުލިތައް'}
                  </h4>
                  <p className="text-lg font-black text-white font-mono">{s.overdueRentals}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400" />
            </div>
          )}

          {s.pendingPayments > 0 && (
            <div
              onClick={() => onNavigateTab('payments')}
              className="cursor-pointer p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    {isEn ? 'Unverified Payments' : 'ފައިސާ ކަށަވަރުކުރުން'}
                  </h4>
                  <p className="text-lg font-black text-white font-mono">{s.pendingPayments}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </div>
          )}

          {s.pendingRequests > 0 && (
            <div
              onClick={() => onNavigateTab('requests')}
              className="cursor-pointer p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-300">
                    {isEn ? 'Pending Requests' : 'އައު ރިކުއެސްޓްތައް'}
                  </h4>
                  <p className="text-lg font-black text-white font-mono">{s.pendingRequests}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </div>
          )}

          {s.readyForHandover > 0 && (
            <div
              onClick={() => onNavigateTab('handover')}
              className="cursor-pointer p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">
                    {isEn ? 'Ready for Handover' : 'ޙަވާލުކުރަން ތައްޔާރު'}
                  </h4>
                  <p className="text-lg font-black text-white font-mono">{s.readyForHandover}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </div>
          )}
        </div>
      )}

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'Total Fleet Units' : 'ޖުމްލަ ޔުނިޓްތައް'}
          </span>
          <div className="text-2xl font-black font-mono text-white">{s.totalUnits}</div>
          <span className="text-[10px] text-slate-500">{s.totalItems} catalog items</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'Available Units' : 'ލިބެންހުރި ޔުނިޓް'}
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400">{s.availableUnits}</div>
          <span className="text-[10px] text-emerald-500/80">Ready for booking</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'Active in Field' : 'ކުއްޔަށް ދޫކޮށްފައި'}
          </span>
          <div className="text-2xl font-black font-mono text-orange-400">{s.activeRentals}</div>
          <span className="text-[10px] text-slate-500">Currently in customer use</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'Maintenance / Damaged' : 'މަރާމާތުގައި / ހަލާކުވެފައި'}
          </span>
          <div className="text-2xl font-black font-mono text-amber-400">
            {s.maintenanceOrDamaged > 0 ? s.maintenanceOrDamaged : (s.maintenanceUnits + s.damagedUnits)}
          </div>
          <span className="text-[10px] text-amber-500/80">{s.damagedUnits} damaged</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'This Month Revenue' : 'މި މަހުގެ އާމްދަނީ'}
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {(s.monthlyRevenue || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">MVR (Linked to Budget)</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block">
            {isEn ? 'Total Rental Revenue' : 'ޖުމްލަ އާމްދަނީ'}
          </span>
          <div className="text-2xl font-black font-mono text-white">
            {(s.totalRevenue || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">MVR All time</span>
        </div>
      </div>

      {/* Action Shortcut Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => onNavigateTab('handover')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-orange-500/40 cursor-pointer transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition">
            <Package className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition">
            {isEn ? 'Equipment Handover Station' : 'ތަކެތި ޙަވާލުކުރާ ސްޓޭޝަން'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn
              ? 'Complete pre-handover checklist, verify accessories, and capture digital customer signature.'
              : 'ޗެކްލިސްޓް ފުރިހަމަކޮށް ކަސްޓަމަރުގެ ޑިޖިޓަލް ސޮއި ހޯދުމާއެކު ތަކެތި ޙަވާލުކުރުން.'}
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('returns')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-orange-500/40 cursor-pointer transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition">
            <RotateCcw className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition">
            {isEn ? 'Return & Condition Inspection' : 'ތަކެތި ބަލައިގަތުމާއި އިންސްޕެކްޝަން'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn
              ? 'Inspect returned gear, automatically compute late hours/fines, assess damages, and issue settlement bills.'
              : 'އަނބުރާ ގެނައި ތަކެތި ޗެކްކުރުން، ލަސްވި ގަޑިތަކުގެ ޖޫރިމަނާ ހިސާބުކުރުން، އަދި ގެއްލުން ބެލުން.'}
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('payments')}
          className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 hover:border-orange-500/40 cursor-pointer transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition">
            {isEn ? 'Payment Verification & Receipts' : 'ފައިސާ ވެރިފައިކުރުމާއި ރަސީދު'}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isEn
              ? 'Verify BML slips, generate official numbered receipts, and auto-sync income to the club budget account.'
              : 'ފައިސާގެ ސްލިޕްތައް ކަށަވަރުކުރުން، ރަސްމީ ރަސީދު ދޫކުރުން، އަދި ބަޖެޓަށް އާމްދަނީ ވެއްދުން.'}
          </p>
        </div>
      </div>
    </div>
  );
};
