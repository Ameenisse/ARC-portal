import React, { useEffect, useState } from 'react';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  CreditCard,
  Percent,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { BudgetStats } from '../../types';

interface TreasurerDashboardViewProps {
  user: any;
  onRefreshUser?: () => void;
}

export const TreasurerDashboardView: React.FC<TreasurerDashboardViewProps> = ({ user }) => {
  const { lang } = usePortalLanguage();
  const { showToast } = useToast();

  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, accountsData] = await Promise.all([
          api.getBudgetStats(),
          api.getBankAccounts()
        ]);
        setStats(statsData);
        setAccounts(accountsData);
      } catch (err: any) {
        showToast('error', 'Failed to load treasury data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Treasurer Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>Office of the Treasurer</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Financial Command & Treasury Operations
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
            {lang === 'english' ? "Treasurer's Financial Deck" : 'ޚަޒާންދާރުގެ މާލީ ކޮމާންޑް ޕެނަލް'}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {lang === 'english'
              ? 'Complete treasury management: oversee member monthly fees, enforce overdue fines, administer 1-year advance discounts, and disburse event expenditure.'
              : 'މެންބަރުންގެ މަހު ފީ ބަލައިގަތުމާއި، ލަސްވާ ފީގެ ޖޫރިމަނާއާއި، އެއްއަހަރުގެ އެޑްވާންސް ޑިސްކައުންޓް އަދި ޚަރަދުތައް ބަލަހައްޓާ ޕެނަލް.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/portal/budget"
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <span>Open Full Budget Module</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Treasury KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Liquid Reserves</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats ? stats.totalAccountsBalance.toLocaleString() : '0'} <span className="text-xs text-blue-400">MVR</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{accounts.length} Active Bank / Petty Accounts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Contributions Collected</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {stats ? stats.totalContributionsCollected.toLocaleString() : '0'} <span className="text-xs">MVR</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">Fines: {stats ? stats.totalFinesCollected.toLocaleString() : 0} MVR</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending & Overdue Dues</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {stats ? stats.overdueContributionsAmount.toLocaleString() : '0'} <span className="text-xs">MVR</span>
          </div>
          <span className="text-[11px] text-rose-400/90 font-medium">{stats ? stats.overdueContributionsCount : 0} Overdue Members</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Net Operating Balance</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats && stats.netBalance >= 0 ? `+${stats.netBalance.toLocaleString()}` : stats?.netBalance.toLocaleString() || '0'} <span className="text-xs text-amber-400">MVR</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">Fiscal Surplus Position</span>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/portal/budget"
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 w-fit group-hover:scale-110 transition">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Members Fund Manager</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Record monthly member payments, collect daily late fines ({stats ? stats.overdueContributionsCount : 0} overdue), and apply 1-year advance 1-month discounts.
          </p>
          <span className="text-xs font-bold text-emerald-400 block pt-1">Open Fund Manager →</span>
        </a>

        <a
          href="/portal/budget"
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 w-fit group-hover:scale-110 transition">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Bank Accounts & Transfers</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Manage BML, MIB, and petty cash repositories with real-time balance tracking and inter-account transfers.
          </p>
          <span className="text-xs font-bold text-blue-400 block pt-1">Manage Bank Accounts →</span>
        </a>

        <a
          href="/portal/budget"
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-3xl p-6 space-y-3 transition group"
        >
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 w-fit group-hover:scale-110 transition">
            <TrendingDown className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">Expenditure & Disbursements</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Review event budgets, Ramadan Quiz cash prize payouts, hall rent, and logistics reimbursements.
          </p>
          <span className="text-xs font-bold text-rose-400 block pt-1">Disburse Expenses →</span>
        </a>
      </div>

    </div>
  );
};
