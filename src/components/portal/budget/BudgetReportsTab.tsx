import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  ShieldCheck,
  Percent,
  FileCheck,
  Scale
} from 'lucide-react';
import {
  BankAccount,
  IncomeRecord,
  ExpenseRecord,
  MemberContributionRecord,
  MemberContributionSetting,
  CategoryBudgetAllocation,
  ClubMember
} from '../../../types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

interface BudgetReportsTabProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  accounts: BankAccount[];
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  contributions: MemberContributionRecord[];
  allocations: CategoryBudgetAllocation[];
  settings: MemberContributionSetting | null;
  membersList: ClubMember[];
  canExport?: boolean;
}

const INCOME_CATEGORY_NAMES: Record<string, string> = {
  member_contribution: 'Member Contributions (މެންބަރޝިޕް ފީ)',
  sponsorship: 'Sponsorships (ސްޕޮންސަރޝިޕް)',
  donation: 'Donations (ހެޔޮއެދޭ ފަރާތްތަކުގެ އެހީ)',
  event_fee: 'Event Participation Fees (އިވެންޓް ފީ)',
  merchandise: 'Merchandise & Sales (ތަކެތި ވިއްކުން)',
  grant: 'Grants & Aid (އެހީ/ގްރާންޓް)',
  other: 'Other Revenue (އެހެނިހެން)'
};

const EXPENSE_CATEGORY_NAMES: Record<string, string> = {
  event_logistics: 'Event Logistics (އިވެންޓް ސާމާނު)',
  venue_rent: 'Venue & Hall Rent (ހޯލް ކުލި)',
  catering: 'Catering & Refreshments (ކެއިންބުއިން)',
  marketing_pr: 'Marketing & Media (މީޑިއާ އިޝްތިހާރު)',
  prizes_awards: 'Prizes & Awards (އިނާމު)',
  office_admin: 'Admin & Office Operations (އޮފީސް އިދާރީ)',
  utilities: 'Utilities & Bills (ބިލްތައް)',
  equipment: 'Sports & Clubhouse Gear (ކުޅިވަރު ސާމާނު)',
  travel: 'Travel & Transport (ދަތުރުފަތުރު)',
  maintenance: 'Repairs & Maintenance (މަރާމާތު)',
  other: 'Other Expenditures (އެހެނިހެން)'
};

export const BudgetReportsTab: React.FC<BudgetReportsTabProps> = ({
  selectedYear,
  onYearChange,
  accounts,
  incomeRecords,
  expenseRecords,
  contributions,
  allocations,
  settings,
  membersList,
  canExport = true
}) => {
  const [reportType, setReportType] = useState<'income_statement' | 'dues_audit' | 'variance' | 'reconciliation'>('income_statement');

  // Filter records for the selected year
  const yearIncome = incomeRecords.filter(r => new Date(r.date).getFullYear() === selectedYear);
  const yearExpense = expenseRecords.filter(r => new Date(r.date).getFullYear() === selectedYear);
  const yearContributions = contributions.filter(c => c.year === selectedYear);

  // Income summary
  const totalIncome = yearIncome.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const incomeByCategory: Record<string, number> = {};
  yearIncome.forEach(r => {
    incomeByCategory[r.category] = (incomeByCategory[r.category] || 0) + Number(r.amount || 0);
  });

  // Expense summary
  const totalExpense = yearExpense.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const expenseByCategory: Record<string, number> = {};
  yearExpense.forEach(r => {
    expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + Number(r.amount || 0);
  });

  // Net surplus / deficit
  const netBalance = totalIncome - totalExpense;

  // Total cash & bank balance
  const totalLiquidAssets = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

  // Member dues analysis
  const activeMembersCount = membersList.filter(m => m.status === 'active').length || membersList.length || 1;
  const monthlyFeeRate = (settings as any)?.monthlyFee || (settings as any)?.monthlyAmount || 100;
  const expectedAnnualDues = activeMembersCount * monthlyFeeRate * 12;
  const collectedDues = yearContributions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.paidAmount || c.totalPayable || c.baseAmount || 0), 0);
  const totalFinesCollected = yearContributions
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + Number(c.fineAmount || 0), 0);
  const advancePaymentsCount = yearContributions.filter(c => c.isAdvancePayment).length;
  const collectionRate = expectedAnnualDues > 0 ? Math.min(100, Math.round((collectedDues / expectedAnnualDues) * 100)) : 0;

  // Print report handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV statement handler
  const handleExportStatementCSV = () => {
    let csvRows: string[][] = [];

    if (reportType === 'income_statement') {
      csvRows = [
        ['ANANDA RECREATION CLUB (ARC)'],
        [`ANNUAL FINANCIAL STATEMENT - FISCAL YEAR ${selectedYear}`],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['SECTION 1: REVENUE & INFLOWS'],
        ['Category', 'Amount (MVR)'],
        ...Object.entries(incomeByCategory).map(([cat, amt]) => [INCOME_CATEGORY_NAMES[cat] || cat.toUpperCase().replace('_', ' '), amt.toFixed(2)]),
        ['TOTAL REVENUE', totalIncome.toFixed(2)],
        [],
        ['SECTION 2: EXPENDITURES & OUTFLOWS'],
        ['Category', 'Amount (MVR)'],
        ...Object.entries(expenseByCategory).map(([cat, amt]) => [EXPENSE_CATEGORY_NAMES[cat] || cat.toUpperCase().replace('_', ' '), amt.toFixed(2)]),
        ['TOTAL EXPENDITURES', totalExpense.toFixed(2)],
        [],
        ['SECTION 3: NET PERFORMANCE'],
        ['NET OPERATING SURPLUS / (DEFICIT)', netBalance.toFixed(2)],
        ['TOTAL BANK & CASH LIQUID ASSETS', totalLiquidAssets.toFixed(2)]
      ];
    } else if (reportType === 'dues_audit') {
      csvRows = [
        ['ANANDA RECREATION CLUB (ARC)'],
        [`MEMBER CONTRIBUTIONS RECOVERY AUDIT - YEAR ${selectedYear}`],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Metric', 'Value'],
        ['Active Club Members Count', activeMembersCount.toString()],
        ['Monthly Subscription Fee', `MVR ${monthlyFeeRate}`],
        ['Total Expected Annual Dues', `MVR ${expectedAnnualDues.toFixed(2)}`],
        ['Total Dues Collected to Date', `MVR ${collectedDues.toFixed(2)}`],
        ['Late Fines Recovered', `MVR ${totalFinesCollected.toFixed(2)}`],
        ['Advance Prepayment Subscriptions', advancePaymentsCount.toString()],
        ['Dues Recovery Efficiency Rate', `${collectionRate}%`]
      ];
    } else {
      csvRows = [
        ['ANANDA RECREATION CLUB (ARC)'],
        [`BUDGET CEILINGS & VARIANCE AUDIT - YEAR ${selectedYear}`],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Category', 'Allocated Ceiling (MVR)', 'Actual Incurred (MVR)', 'Remaining Balance (MVR)', 'Burn Rate (%)'],
        ...allocations.map(a => {
          const actual = expenseByCategory[a.category] || 0;
          const diff = Number(a.allocatedAmount) - actual;
          const pct = a.allocatedAmount > 0 ? ((actual / a.allocatedAmount) * 100).toFixed(1) : '0';
          return [a.categoryLabel || a.category, a.allocatedAmount.toFixed(2), actual.toFixed(2), diff.toFixed(2), `${pct}%`];
        })
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ARC_Financial_Report_${reportType}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-heading">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            މާލީ ރިޕޯޓްތަކާއި އޮޑިޓް ބަޔާން (Financial Reports & Statements)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ކްލަބުގެ އަހަރީ އާމްދަނީ، ޚަރަދު، މެންބަރޝިޕް ފީގެ އޮޑިޓް އަދި ބަޖެޓް ޓާގެޓްތަކުގެ ތަފާސްހިސާބު
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-400">އަހަރު:</span>
            <select
              value={selectedYear}
              onChange={e => onYearChange(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {canExport && (
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5" />
                ޕްރިންޓް / Print
              </button>

              <button
                type="button"
                onClick={handleExportStatementCSV}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                CSV އެކްސްޕޯޓް
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'income_statement', label: 'އާމްދަނީ އާއި ޚަރަދުގެ ބަޔާން (Income & Expenses)', icon: Scale },
          { id: 'dues_audit', label: 'މެންބަރޝިޕް ފީގެ އޮޑިޓް (Member Dues Audit)', icon: Users },
          { id: 'variance', label: 'ބަޖެޓް ޓާގެޓް އަދި ޚަރަދުގެ ތަފާތު (Ceiling Variance)', icon: Percent },
          { id: 'reconciliation', label: 'ބޭންކް އެކައުންޓްތަކުގެ ބާކީ (Vault Balances)', icon: Building2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT VIEW */}
      {reportType === 'income_statement' && (
        <div className="space-y-6">
          {/* Top High-level Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ޖުމްލަ އާމްދަނީ (Total Income)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-[11px] text-slate-500">
                {yearIncome.length} އެންޓްރީ ރެކޯޑްކުރެވިފައި
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ޖުމްލަ ޚަރަދު (Total Expenses)</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl font-bold text-rose-400 font-mono">
                {formatCurrency(totalExpense)}
              </p>
              <p className="text-[11px] text-slate-500">
                {yearExpense.length} ވައުޗަރ ރެކޯޑްކުރެވިފައި
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ނެޓް ސާޕްލަސް / ޑެފިސިޓް</span>
                <Scale className="w-4 h-4 text-sky-400" />
              </div>
              <p className={`text-xl font-bold font-mono ${netBalance >= 0 ? 'text-sky-400' : 'text-rose-400'}`}>
                {formatCurrency(netBalance)}
              </p>
              <p className="text-[11px] text-slate-500">
                {netBalance >= 0 ? 'ކްލަބުގެ މާލީ ހާލަތު ޕޮޒިޓިވް' : 'ޚަރަދުތައް އާމްދަނީއަށްވުރެ އިތުރު'}
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>މިވަގުތުގެ ޖުމްލަ ބާކީ (Liquid Assets)</span>
                <Building2 className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-400 font-mono">
                {formatCurrency(totalLiquidAssets)}
              </p>
              <p className="text-[11px] text-slate-500">
                ބޭންކް އެކައުންޓްތަކާއި ޕެޓީ ކޭޝްގައި ހުރި ފައިސާ
              </p>
            </div>
          </div>

          {/* Breakdown Tables Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income by Category */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  އާމްދަނީ ބެހިފައިވާ ގޮތް (Revenue Breakdown)
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <div className="divide-y divide-slate-800/60">
                {Object.keys(incomeByCategory).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">މި އަހަރު އަދި އާމްދަނީއެއް ރެކޯޑްކުރެވިފައެއް ނުވޭ</div>
                ) : (
                  Object.entries(incomeByCategory).map(([cat, amt]) => {
                    const pct = totalIncome > 0 ? Math.round((amt / totalIncome) * 100) : 0;
                    return (
                      <div key={cat} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-200">
                            {INCOME_CATEGORY_NAMES[cat] || cat.replace(/_/g, ' ')}
                          </span>
                          <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-bold text-white">{formatCurrency(amt)}</p>
                          <p className="text-[10px] text-slate-500">{pct}%</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  ޚަރަދުތައް ބެހިފައިވާ ގޮތް (Expense Breakdown)
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
              <div className="divide-y divide-slate-800/60">
                {Object.keys(expenseByCategory).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">މި އަހަރު އަދި ޚަރަދެއް ރެކޯޑްކުރެވިފައެއް ނުވޭ</div>
                ) : (
                  Object.entries(expenseByCategory).map(([cat, amt]) => {
                    const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                    return (
                      <div key={cat} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-200">
                            {EXPENSE_CATEGORY_NAMES[cat] || cat.replace(/_/g, ' ')}
                          </span>
                          <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <p className="font-bold text-white">{formatCurrency(amt)}</p>
                          <p className="text-[10px] text-slate-500">{pct}%</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DUES AUDIT TAB */}
      {reportType === 'dues_audit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400">އެކްޓިވް މެންބަރުންގެ އަދަދު</span>
              <p className="text-2xl font-bold text-white font-mono">{activeMembersCount}</p>
              <p className="text-[11px] text-slate-500">މަހު ފީ: MVR {monthlyFeeRate}</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400">އަހަރުގެ ލަފާކުރެވޭ ފީ</span>
              <p className="text-2xl font-bold text-amber-400 font-mono">{formatCurrency(expectedAnnualDues)}</p>
              <p className="text-[11px] text-slate-500">12 މަހަށް ޖުމްލަ ލަފާކުރެވޭ މިންވަރު</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400">ލިބުނު މެންބަރޝިޕް ފީ</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{formatCurrency(collectedDues)}</p>
              <p className="text-[11px] text-emerald-500/80">ޖޫރިމަނާ ލިބުނު: {formatCurrency(totalFinesCollected)}</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400">ފީ ދެއްކުމުގެ ރޭޓް (Collection Rate)</span>
              <p className="text-2xl font-bold text-sky-400 font-mono">{collectionRate}%</p>
              <p className="text-[11px] text-slate-500">{advancePaymentsCount} މެންބަރުން އަހަރު ދުރާލާ ދައްކާފައި</p>
            </div>
          </div>

          {/* Detailed Members Audit Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                މެންބަރުން ފީ ދައްކާފައިވާ އަހަރީ ރިޕޯޓް ({selectedYear})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-right">މެންބަރުގެ ނަން</th>
                    <th className="p-3 text-right">މެންބަރު ނަންބަރު</th>
                    <th className="p-3 text-right">ދެއްކި މަސްތަކުގެ އަދަދު</th>
                    <th className="p-3 text-right">ޖުމްލަ ދެއްކި އަދަދު</th>
                    <th className="p-3 text-right">ދުރާލާ ދެއްކުން</th>
                    <th className="p-3 text-right">ހާލަތު</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {membersList.map(member => {
                    const memberPayments = yearContributions.filter(c => c.memberId === member.id && c.status === 'paid');
                    const paidMonthsCount = memberPayments.length;
                    const paidTotal = memberPayments.reduce((s, c) => s + Number(c.paidAmount || c.totalPayable || 0), 0);
                    const isAdvance = memberPayments.some(c => c.isAdvancePayment);

                    return (
                      <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-white">{member.fullName}</td>
                        <td className="p-3 font-mono text-slate-400">{member.memberNumber || member.id}</td>
                        <td className="p-3 font-mono text-slate-300">{paidMonthsCount} / 12 މަސް</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">{formatCurrency(paidTotal)}</td>
                        <td className="p-3">
                          {isAdvance ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              Advance Paid
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Monthly</span>
                          )}
                        </td>
                        <td className="p-3">
                          {paidMonthsCount >= 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Up to Date
                            </span>
                          ) : paidMonthsCount >= 4 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Partial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VARIANCE TAB */}
      {reportType === 'variance' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                ބަޖެޓް ލިމިޓާއި ހަގީގީ ޚަރަދުގެ ތަފާތު (Budget Target vs Incurred Variance)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-right">ކެޓަގަރީ</th>
                    <th className="p-3 text-right">ކަނޑައެޅި ބަޖެޓް (Allocated)</th>
                    <th className="p-3 text-right">ހަގީގީ ޚަރަދު (Actual Incurred)</th>
                    <th className="p-3 text-right">ބާކީ ޖާގަ (Variance)</th>
                    <th className="p-3 text-right">ބޭނުންކުރި %</th>
                    <th className="p-3 text-right">ހާލަތު</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allocations.map(alloc => {
                    const actual = expenseByCategory[alloc.category] || 0;
                    const diff = Number(alloc.allocatedAmount) - actual;
                    const burnPct = alloc.allocatedAmount > 0 ? Math.round((actual / alloc.allocatedAmount) * 100) : 0;
                    const isOver = diff < 0;

                    return (
                      <tr key={alloc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-white">{alloc.categoryLabel || alloc.category}</td>
                        <td className="p-3 font-mono text-slate-300">{formatCurrency(alloc.allocatedAmount)}</td>
                        <td className="p-3 font-mono font-bold text-rose-400">{formatCurrency(actual)}</td>
                        <td className={`p-3 font-mono font-bold ${isOver ? 'text-rose-500' : 'text-emerald-400'}`}>
                          {formatCurrency(diff)}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>{burnPct}%</span>
                            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${burnPct > 100 ? 'bg-rose-500' : burnPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, burnPct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {isOver ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" /> ބަޖެޓަށްވުރެ އިތުރު
                            </span>
                          ) : burnPct >= 80 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
                              ލިމިޓާ ކައިރިވެފައި
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> ކޮންޓްރޯލްގައި
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECONCILIATION TAB */}
      {reportType === 'reconciliation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{acc.accountName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acc.type === 'bank' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {acc.type === 'bank' ? 'Bank Account' : 'Cash Drawer'}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">އެކައުންޓް ނަންބަރު: <span className="font-mono text-slate-200">{acc.accountNumber}</span></p>
                  <p className="text-xs text-slate-400">ބޭންކް: <span className="text-slate-200">{acc.bankName}</span></p>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">މިވަގުތުގެ ބާކީ:</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{formatCurrency(acc.currentBalance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certified Print Footer Signature Block */}
      <div className="hidden print:block pt-12 border-t border-slate-700 mt-12 text-slate-900 text-xs">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="h-16 border-b border-slate-400 mb-2" />
            <p className="font-bold">Ibrahim Rasheed</p>
            <p className="text-slate-500">President, ARC</p>
          </div>
          <div>
            <div className="h-16 border-b border-slate-400 mb-2" />
            <p className="font-bold">Mohamed Shifaz</p>
            <p className="text-slate-500">Treasurer, ARC</p>
          </div>
          <div>
            <div className="h-16 border-b border-slate-400 mb-2" />
            <p className="font-bold">Aishath Niyaz</p>
            <p className="text-slate-500">Secretary General, ARC</p>
          </div>
        </div>
      </div>
    </div>
  );
};
