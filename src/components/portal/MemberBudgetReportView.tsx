import React, { useState } from 'react';
import { User, ClubMember, MemberContributionRecord } from '../../types';
import { Modal } from '../common/Modal';
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface MemberBudgetReportViewProps {
  user: User;
  budgetData?: {
    summary: {
      totalPaid: number;
      totalFines: number;
      totalPending: number;
      pendingCount: number;
      overdueCount: number;
      paidCount: number;
      waivedCount: number;
      totalMonths: number;
      isUpToDate: boolean;
      monthlyFee: number;
      dueDayOfMonth: number;
      annualAdvanceDiscountMonths: number;
      status: 'good_standing' | 'pending' | 'overdue';
      depositAccount?: {
        id: string;
        accountName: string;
        accountNumber: string;
        bankName: string;
        currency: string;
      };
    };
    contributions: MemberContributionRecord[];
    clubStats: {
      totalClubIncome: number;
      totalClubExpenses: number;
      netReserve: number;
      totalContributionsCollected: number;
      currentYear: number;
    };
  };
  linkedMember?: ClubMember;
  lang: 'dhivehi' | 'english';
}

const MONTH_NAMES = {
  dhivehi: [
    'ޖަނަވަރީ (Jan)', 'ފެބްރުވަރީ (Feb)', 'މާރިޗު (Mar)', 'އޭޕްރީލް (Apr)',
    'މެއި (May)', 'ޖޫން (Jun)', 'ޖުލައި (Jul)', 'އޯގަސްޓް (Aug)',
    'ސެޕްޓެމްބަރ (Sep)', 'އޮކްޓޯބަރ (Oct)', 'ނޮވެމްބަރ (Nov)', 'ޑިސެމްބަރ (Dec)'
  ],
  english: [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ]
};

export const MemberBudgetReportView: React.FC<MemberBudgetReportViewProps> = ({
  user,
  budgetData,
  linkedMember,
  lang
}) => {
  const isDh = lang === 'dhivehi';
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedReceipt, setSelectedReceipt] = useState<MemberContributionRecord | null>(null);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  const summary = budgetData?.summary;
  const clubStats = budgetData?.clubStats;
  const allContributions = budgetData?.contributions || [];

  // Filter contributions by selected year
  const filteredContributions = allContributions
    .filter(c => c.year === selectedYear)
    .sort((a, b) => a.month - b.month);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  // Deposit account fallback
  const depositAcc = summary?.depositAccount || {
    id: 'acc_main',
    accountName: 'Ananda Recreation Club',
    accountNumber: '7701123456001',
    bankName: 'Bank of Maldives (BML)',
    currency: 'MVR'
  };

  return (
    <div className="space-y-8" id="member-budget-section">
      
      {/* HEADER TITLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Wallet className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold font-heading text-white">
              {isDh ? 'ތިމާގެ މެންބަރޝިޕް ފީ އަދި ބަޖެޓް ރިޕޯޓް' : 'Personal Dues & Club Budget Report'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {isDh 
              ? 'މިއީ ތިބާގެ މެންބަރޝިޕް ފީގެ ހިސާބުތަކާއި ކްލަބުގެ މާލީ ދުޅަހެޔޮކަމުގެ ޚުލާޞާއެވެ. ވަކިވަކި އެހެން މެންބަރުންގެ މައުލޫމާތު މިތަނުން ނުފެންނާނެއެވެ.'
              : 'Detailed summary of your personal membership dues, fines, and club financial health. Individual information of other members remains strictly private.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          {/* Print Statement Button */}
          <button
            type="button"
            onClick={() => setShowStatementModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>{isDh ? 'ބަޔާން ޕްރިންޓް' : 'Print Statement'}</span>
          </button>
        </div>
      </div>

      {/* 1. PERSONAL DUES SUMMARY 4-CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Contributions Paid */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isDh ? 'ޖުމްލަ ދެއްކި ފީ' : 'Total Contributions Paid'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {(summary?.totalPaid || 0).toLocaleString()} <span className="text-xs text-emerald-400 font-bold">MVR</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <span>{summary?.paidCount || 0} {isDh ? 'މަހުގެ ފީ ދައްކާފައި' : 'Months Paid'}</span>
              {(summary?.waivedCount || 0) > 0 && (
                <span className="text-slate-400">({summary?.waivedCount} {isDh ? 'ދޫކޮށްލެވިފައި' : 'Waived'})</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Total Fine Incurred */}
        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isDh ? 'ޖުމްލަ ޖޫރިމަނާ' : 'Total Fines'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {(summary?.totalFines || 0).toLocaleString()} <span className="text-xs text-amber-400 font-bold">MVR</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isDh ? 'ގަވާއިދުން ފީ ދެއްކެވުމުން ޖޫރިމަނާއިން ސަލާމަތްވެވޭނެއެވެ.' : 'Late fines automatically waived if paid on time.'}
            </p>
          </div>
        </div>

        {/* Card 3: Pending Dues */}
        <div className={`bg-slate-900 border rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden transition-all ${
          (summary?.totalPending || 0) > 0 
            ? 'border-rose-500/40 bg-gradient-to-b from-slate-900 to-rose-950/20' 
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isDh ? 'ދައްކަންޖެހޭ ބާކީ' : 'Pending Dues'}
            </span>
            <div className={`p-2 rounded-xl border ${
              (summary?.totalPending || 0) > 0 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl sm:text-3xl font-black font-mono ${
              (summary?.totalPending || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(summary?.totalPending || 0).toLocaleString()} <span className="text-xs font-bold">MVR</span>
            </div>
            <div className="text-[11px] font-semibold">
              {(summary?.pendingCount || 0) > 0 ? (
                <span className="text-rose-300 flex items-center gap-1">
                  <span>{summary?.pendingCount} {isDh ? 'މަސް ދައްކަންޖެހޭ' : 'Months Pending'}</span>
                  {(summary?.overdueCount || 0) > 0 && (
                    <span className="text-rose-400 font-bold">({summary?.overdueCount} {isDh ? 'މުއްދަތު ހަމަވެފައި' : 'Overdue'})</span>
                  )}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{isDh ? 'ހުރިހާ މަހެއްގެ ފީ ދައްކާ ނިމިފައި' : 'All Dues Paid Up to Date'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Standing & Fee Rate */}
        <div className="bg-slate-900 border border-slate-800 hover:border-orange-500/40 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {isDh ? 'މެންބަރޝިޕް ޙާލަތު' : 'Membership Standing'}
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                summary?.status === 'good_standing' 
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : summary?.status === 'pending'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
              }`}>
                {summary?.status === 'good_standing'
                  ? (isDh ? 'ގަވާއިދުން ފީ ދައްކާފައި' : 'In Good Standing')
                  : summary?.status === 'pending'
                  ? (isDh ? 'ފީ ދައްކަންޖެހޭ' : 'Pending Dues')
                  : (isDh ? 'މުއްދަތު ހަމަވެފައި' : 'Overdue Dues')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              {isDh ? 'މަހު ފީ:' : 'Monthly Rate:'} <strong className="text-white font-mono">{summary?.monthlyFee || 100} MVR</strong> ({isDh ? `ސުންގަޑި: ކޮންމެ މަހެއްގެ ${summary?.dueDayOfMonth || 10}` : `Due: ${summary?.dueDayOfMonth || 10}th of month`})
            </p>
          </div>
        </div>

      </div>

      {/* 2. CLUB-WIDE FINANCIAL HEALTH OVERVIEW (AGGREGATE DISCLOSURE FOR MEMBERS) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-5 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isDh ? 'ކްލަބުގެ މާލީ ޚުލާޞާ' : 'Club Financial Health'}</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {clubStats?.currentYear || selectedYear}
                </span>
              </div>
              <h4 className="text-lg font-bold font-heading text-white">
                {isDh ? 'ކްލަބުގެ ބަޖެޓް ތަފާސްހިސާބު (Club Budget Overview)' : 'ARC Annual Budget Overview & Statistics'}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
              <Info className="w-4 h-4 text-orange-400 shrink-0" />
              <span>{isDh ? 'އާންމު ޚުލާޞާ މައުލޫމާތު' : 'General Aggregate Metrics for Club Transparency'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Metric 1: Club Total Revenue */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>{isDh ? 'ކްލަބުގެ ޖުމްލަ އާމްދަނީ' : 'Club Total Inflow'}</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                {(clubStats?.totalClubIncome || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">MVR</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isDh ? 'މެންބަރޝިޕް ފީ، ސްޕޮންސަރ އަދި އެހީ' : 'Contributions, Sponsorships & Grants'}
              </p>
            </div>

            {/* Metric 2: Club Total Expenditures */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>{isDh ? 'ކްލަބުގެ ޖުމްލަ ޚަރަދު' : 'Club Total Outflow'}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
                {(clubStats?.totalClubExpenses || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">MVR</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isDh ? 'އިވެންޓްތަކާއި އިދާރީ ހިންގުމުގެ ޚަރަދު' : 'Events logistics & clubhouse operations'}
              </p>
            </div>

            {/* Metric 3: Net Reserve Fund */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>{isDh ? 'ބާކީ ރިޒަރވް ފަންޑު' : 'Net Operating Reserve'}</span>
                <DollarSign className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${
                (clubStats?.netReserve || 0) >= 0 ? 'text-white' : 'text-rose-400'
              }`}>
                {(clubStats?.netReserve || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">MVR</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isDh ? 'ކްލަބުގެ މާލީ ރައްކާތެރިކަން' : 'Safe reserve balance for upcoming activities'}
              </p>
            </div>

            {/* Metric 4: Total Member Contributions Collected */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                <span>{isDh ? 'އެއްކުރެވުނު މެންބަރޝިޕް ފީ' : 'Dues Collected (Club)'}</span>
                <Wallet className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-sky-400">
                {(clubStats?.totalContributionsCollected || 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">MVR</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isDh ? 'މެންބަރުންގެ ޙިއްޞާ' : 'Direct member community contribution'}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* 3. PERSONAL MONTH-BY-MONTH CONTRIBUTIONS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <h4 className="text-base font-bold font-heading text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>
                {isDh 
                  ? `${selectedYear} ވަނަ އަހަރުގެ މެންބަރޝިޕް ފީގެ ތާވަލު (Monthly Contributions Ledger)` 
                  : `${selectedYear} Monthly Membership Contributions Ledger`}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {isDh ? 'ކޮންމެ މަހެއްގެ ފީ ދައްކާފައިވާ ޙާލަތާއި ރަސީދުތައް' : 'Track your monthly payment status and download official digital receipts'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-bold font-mono">
              {linkedMember?.memberNumber || user.username}
            </span>
          </div>
        </div>

        {filteredContributions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isDh ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                  <th className={`py-3.5 px-4 ${isDh ? 'text-right' : 'text-left'}`}>
                    {isDh ? 'މަސް' : 'Month'}
                  </th>
                  <th className={`py-3.5 px-3 ${isDh ? 'text-right' : 'text-left'}`}>
                    {isDh ? 'ސުންގަޑި' : 'Due Date'}
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    {isDh ? 'މަހު ފީ' : 'Base Fee'}
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    {isDh ? 'ޖޫރިމަނާ' : 'Fine'}
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    {isDh ? 'ދެއްކި / ދައްކަންޖެހޭ' : 'Paid / Total'}
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    {isDh ? 'ޙާލަތު' : 'Status'}
                  </th>
                  <th className={`py-3.5 px-3 ${isDh ? 'text-right' : 'text-left'}`}>
                    {isDh ? 'ދެއްކި ތާރީޚު & ގޮތް' : 'Payment Details'}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {isDh ? 'ރަސީދު' : 'Receipt'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredContributions.map((cont) => {
                  const mName = isDh ? MONTH_NAMES.dhivehi[cont.month - 1] : MONTH_NAMES.english[cont.month - 1];
                  const isPaid = cont.status === 'paid';
                  const isOverdue = cont.status === 'overdue';
                  const isPending = cont.status === 'pending';
                  const isWaived = cont.status === 'waived';

                  return (
                    <tr key={cont.id} className="hover:bg-slate-800/30 transition-colors">
                      
                      {/* Month */}
                      <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px] flex items-center justify-center font-bold">
                            {cont.month}
                          </span>
                          <span>{mName}</span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {cont.dueDate}
                      </td>

                      {/* Base Fee */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {cont.baseAmount} MVR
                      </td>

                      {/* Fine */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {cont.fineAmount > 0 ? (
                          <span className="text-rose-400 font-bold">+{cont.fineAmount} MVR</span>
                        ) : (
                          <span className="text-slate-500">0 MVR</span>
                        )}
                      </td>

                      {/* Paid / Total */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold">
                        {isPaid ? (
                          <span className="text-emerald-400">{cont.paidAmount} MVR</span>
                        ) : isWaived ? (
                          <span className="text-purple-400">0 MVR</span>
                        ) : (
                          <span className={isOverdue ? 'text-rose-400' : 'text-amber-300'}>
                            {cont.totalPayable || (cont.baseAmount + cont.fineAmount)} MVR
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isDh ? 'ދައްކާފައި' : 'Paid'}</span>
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px]">
                            <AlertCircle className="w-3 h-3" />
                            <span>{isDh ? 'މުއްދަތު ހަމަވެފައި' : 'Overdue'}</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>{isDh ? 'ދައްކަންޖެހޭ' : 'Pending'}</span>
                          </span>
                        )}
                        {isWaived && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold text-[10px]">
                            <span>{isDh ? 'ދޫކޮށްލެވިފައި' : 'Waived'}</span>
                          </span>
                        )}
                      </td>

                      {/* Payment Details */}
                      <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                        {isPaid && cont.paidDate ? (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-mono text-slate-300">{cont.paidDate}</div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              {cont.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}
                            </div>
                          </div>
                        ) : isWaived ? (
                          <span className="text-[10px] text-purple-300">{isDh ? 'އިމްތިޔާޒް ދެވިފައި' : 'Waived by Board'}</span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">-</span>
                        )}
                      </td>

                      {/* Receipt Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(cont)}
                            className="px-3 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-300 hover:text-white font-bold text-[11px] flex items-center gap-1.5 mx-auto transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isDh ? 'ރަސީދު' : 'Receipt'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-950/40 rounded-2xl text-slate-500 text-xs">
            {isDh ? 'މި އަހަރުގެ މެންބަރޝިޕް ފީގެ ރެކޯޑެއް ފެންނާކަށް ނެތެވެ.' : 'No contribution records generated for this year yet.'}
          </div>
        )}
      </div>

      {/* 4. CLUB BANK ACCOUNT DETAILS & HOW TO PAY DUES */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Building2 className="w-5 h-5" />
              </span>
              <h4 className="text-lg font-bold font-heading text-white">
                {isDh ? 'މެންބަރޝިޕް ފީ ދައްކަވާނެ ގޮތް (How to Pay)' : 'How to Pay Membership Contributions'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isDh 
                ? 'ބީއެމްއެލް އެޕް ނުވަތަ އިންޓަނެޓް ބޭންކިންގ މެދުވެރިކޮށް ތިރީގައިވާ ކްލަބުގެ އެކައުންޓަށް ޓްރާންސްފަރ ކުރައްވާ. ޓްރާންސްފަރ ރިމާކްސްގައި ތިބާގެ މެންބަރު ނަންބަރު (e.g. ARC-0001) އަދި ފީ ދައްކަވާ މަސް ޖެއްސެވުން އެދެމެވެ.'
                : 'Transfer via BML App or Internet Banking to the official club account below. Please state your Member Number (e.g. ARC-0001) and Month in the transfer remarks.'}
            </p>
          </div>

          {/* Account Details Box */}
          <div className="w-full md:w-auto p-4 rounded-2xl bg-slate-950 border border-slate-700/80 space-y-2.5 min-w-[280px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isDh ? 'ބޭންކް:' : 'Bank:'}</span>
              <span className="font-bold text-white">{depositAcc.bankName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{isDh ? 'އެކައުންޓް ނަން:' : 'Account Name:'}</span>
              <span className="font-bold text-slate-200">{depositAcc.accountName}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">{isDh ? 'އެކައުންޓް ނަންބަރު (MVR)' : 'Account Number (MVR)'}</div>
                <div className="text-base font-black font-mono text-orange-400">{depositAcc.accountNumber}</div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(depositAcc.accountNumber)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  copiedAccount 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isDh ? 'އެކައުންޓް ނަންބަރު ކޮޕީކުރައްވާ' : 'Copy Account Number'}
              >
                {copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. OFFICIAL RECEIPT MODAL */}
      {selectedReceipt && (
        <Modal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          title={isDh ? 'މެންބަރޝިޕް ފީގެ ރަސްމީ ރަސީދު (Official Receipt)' : 'Official Membership Dues Receipt'}
          maxWidth="2xl"
        >
          <div className="space-y-6" dir={isDh ? 'rtl' : 'ltr'}>
            
            {/* Receipt Paper UI */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 relative overflow-hidden text-slate-200">
              
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center font-heading">
                      ARC
                    </span>
                    <h4 className="text-base font-black font-heading text-white">
                      ANANDA RECREATION CLUB
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400">Official Membership Dues Payment Receipt</p>
                </div>

                <div className="text-right sm:text-left space-y-0.5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Receipt Number</div>
                  <div className="text-xs font-mono font-bold text-orange-400">
                    {selectedReceipt.receiptNumber || `REC-CONT-${selectedReceipt.year}-${selectedReceipt.memberNumber}-${selectedReceipt.month}`}
                  </div>
                </div>
              </div>

              {/* Member & Payment Information Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">{isDh ? 'މެންބަރުގެ ނަން' : 'Member Name'}</div>
                  <div className="font-bold text-white">{selectedReceipt.memberName || user.fullName}</div>
                  <div className="text-[11px] font-mono text-orange-400 font-bold">
                    {selectedReceipt.memberNumber || linkedMember?.memberNumber || user.username}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">{isDh ? 'މުއްދަތު / މަސް' : 'Period / Month'}</div>
                  <div className="font-bold text-white">
                    {isDh ? MONTH_NAMES.dhivehi[selectedReceipt.month - 1] : MONTH_NAMES.english[selectedReceipt.month - 1]} {selectedReceipt.year}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isDh ? 'ދެއްކި ތާރީޚު:' : 'Paid Date:'} <span className="font-mono text-slate-200">{selectedReceipt.paidDate || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className={`w-full ${isDh ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">{isDh ? 'ތަފްޞީލް' : 'Description'}</th>
                      <th className="p-3 text-center">{isDh ? 'އަދަދު' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="p-3 text-slate-300">
                        {isDh ? `މެންބަރޝިޕް މަހު ފީ (${selectedReceipt.year} Month ${selectedReceipt.month})` : `Monthly Membership Contribution (${selectedReceipt.year} Month ${selectedReceipt.month})`}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-white">
                        {selectedReceipt.baseAmount} MVR
                      </td>
                    </tr>
                    {selectedReceipt.discountAmount > 0 && (
                      <tr>
                        <td className="p-3 text-emerald-400">
                          {isDh ? 'އަހަރީ އެޑްވާންސް ޑިސްކައުންޓް' : 'Annual Advance Payment Discount'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-400">
                          -{selectedReceipt.discountAmount} MVR
                        </td>
                      </tr>
                    )}
                    {selectedReceipt.fineAmount > 0 && (
                      <tr>
                        <td className="p-3 text-rose-400">
                          {isDh ? `ލަސް ފީ ޖޫރިމަނާ (${selectedReceipt.fineDays} ދުވަސް)` : `Late Payment Fine (${selectedReceipt.fineDays} days)`}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-rose-400">
                          +{selectedReceipt.fineAmount} MVR
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-900/90 font-bold border-t border-slate-700">
                      <td className="p-3 text-white text-sm">{isDh ? 'ޖުމްލަ ދެއްކި ފައިސާ' : 'Total Amount Paid'}</td>
                      <td className="p-3 text-center text-sm font-mono text-emerald-400 font-black">
                        {selectedReceipt.paidAmount} MVR
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Verification Seal */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isDh ? 'ފައިސާ ލިބި ރެކޯޑްކުރެވިއްޖެ' : 'Payment Received & Verified'}</span>
                </div>
                <div className="text-slate-500 font-mono text-[10px]">
                  Authorized by ARC Finance Division
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isDh ? 'ރަސީދު ޕްރިންޓް' : 'Print Receipt'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                {isDh ? 'ލައްޕާލާ' : 'Close'}
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* 6. FULL PERSONAL DUES STATEMENT PRINTABLE MODAL */}
      {showStatementModal && (
        <Modal
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
          title={isDh ? `މެންބަރޝިޕް ފީގެ އަހަރީ ބަޔާން (${selectedYear})` : `Annual Membership Dues Statement (${selectedYear})`}
          maxWidth="3xl"
        >
          <div className="space-y-6" dir={isDh ? 'rtl' : 'ltr'}>
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 text-slate-200">
              
              {/* Statement Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <h3 className="text-lg font-black font-heading text-white">
                    ANANDA RECREATION CLUB
                  </h3>
                  <p className="text-xs text-orange-400 font-bold">
                    {isDh ? `މެންބަރޝިޕް ފީގެ ރަސްމީ ބަޔާން - ${selectedYear}` : `Official Statement of Membership Dues - ${selectedYear}`}
                  </p>
                </div>
                <div className="text-right sm:text-left space-y-0.5 text-xs">
                  <div className="text-slate-400">{isDh ? 'މެންބަރު ނަންބަރު:' : 'Member No:'} <strong className="font-mono text-white">{linkedMember?.memberNumber || user.username}</strong></div>
                  <div className="text-slate-400">{isDh ? 'މެންބަރުގެ ނަން:' : 'Member Name:'} <strong className="text-white">{linkedMember?.fullName || user.fullName}</strong></div>
                </div>
              </div>

              {/* Statement Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{isDh ? 'ޖުމްލަ ދެއްކި' : 'Total Paid'}</div>
                  <div className="text-lg font-black font-mono text-emerald-400">{(summary?.totalPaid || 0).toLocaleString()} MVR</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{isDh ? 'ޖުމްލަ ޖޫރިމަނާ' : 'Total Fines'}</div>
                  <div className="text-lg font-black font-mono text-amber-400">{(summary?.totalFines || 0).toLocaleString()} MVR</div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">{isDh ? 'ބާކީ ދައްކަންޖެހޭ' : 'Total Pending'}</div>
                  <div className="text-lg font-black font-mono text-rose-400">{(summary?.totalPending || 0).toLocaleString()} MVR</div>
                </div>
              </div>

              {/* 12 Months Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className={`w-full ${isDh ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">{isDh ? 'މަސް' : 'Month'}</th>
                      <th className="p-2.5 text-center">{isDh ? 'ސުންގަޑި' : 'Due Date'}</th>
                      <th className="p-2.5 text-center">{isDh ? 'ފީ' : 'Base Fee'}</th>
                      <th className="p-2.5 text-center">{isDh ? 'ޖޫރިމަނާ' : 'Fine'}</th>
                      <th className="p-2.5 text-center">{isDh ? 'ދެއްކި އަދަދު' : 'Paid Amount'}</th>
                      <th className="p-2.5 text-center">{isDh ? 'ޙާލަތު' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredContributions.map(c => (
                      <tr key={c.id}>
                        <td className="p-2.5 font-bold text-white">
                          {isDh ? MONTH_NAMES.dhivehi[c.month - 1] : MONTH_NAMES.english[c.month - 1]}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-400">{c.dueDate}</td>
                        <td className="p-2.5 text-center font-mono">{c.baseAmount} MVR</td>
                        <td className="p-2.5 text-center font-mono text-amber-400">{c.fineAmount} MVR</td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-400">{c.paidAmount} MVR</td>
                        <td className="p-2.5 text-center font-bold text-[10px]">
                          {c.status === 'paid' ? (
                            <span className="text-emerald-400">{isDh ? 'ދައްކާފައި' : 'Paid'}</span>
                          ) : c.status === 'overdue' ? (
                            <span className="text-rose-400">{isDh ? 'މުއްދަތު ހަމަވެފައި' : 'Overdue'}</span>
                          ) : (
                            <span className="text-amber-300">{isDh ? 'ދައްކަންޖެހޭ' : 'Pending'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Issued date: {new Date().toLocaleDateString()}</span>
                <span>ARC Official Financial System</span>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isDh ? 'ބަޔާން ޕްރިންޓް' : 'Print Statement'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                {isDh ? 'ލައްޕާލާ' : 'Close'}
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};
