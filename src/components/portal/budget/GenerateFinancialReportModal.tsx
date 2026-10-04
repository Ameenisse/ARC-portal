import React, { useState, useMemo } from 'react';
import { Modal } from '../../common/Modal';
import {
  BankAccount,
  IncomeRecord,
  ExpenseRecord,
  CategoryBudgetAllocation,
  MemberContributionRecord,
  User
} from '../../../types';
import {
  MONTH_NAMES_EN,
  MONTH_NAMES_DV,
  formatReportCurrency,
  downloadFinancialSummaryPdf,
  previewFinancialSummaryPdfInNewTab
} from '../../../utils/financialPdfReportGenerator';
import {
  FileDown,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  Building2,
  Check,
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';

interface GenerateFinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  accounts: BankAccount[];
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
  allocations?: CategoryBudgetAllocation[];
  contributions?: MemberContributionRecord[];
  currentUser?: User | null;
  onSuccessToast?: (msg: string) => void;
}

export const GenerateFinancialReportModal: React.FC<GenerateFinancialReportModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  accounts,
  incomeRecords,
  expenseRecords,
  allocations = [],
  contributions = [],
  currentUser,
  onSuccessToast
}) => {
  // Report scope: 'monthly' or 'annual'
  const [reportScope, setReportScope] = useState<'monthly' | 'annual'>('monthly');
  const [year, setYear] = useState<number>(selectedYear || new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);

  // Customization options
  const [reportTitle, setReportTitle] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [includeItemizedIncome, setIncludeItemizedIncome] = useState(true);
  const [includeItemizedExpense, setIncludeItemizedExpense] = useState(true);
  const [includeBankBalances, setIncludeBankBalances] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);

  // Generating state
  const [generating, setGenerating] = useState(false);

  // Compute live preview metrics for the selected period
  const previewMetrics = useMemo(() => {
    const isMonthly = reportScope === 'monthly';
    const targetMonth = isMonthly ? month : null;

    const filteredIncome = incomeRecords.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (d.getFullYear() !== year) return false;
      if (targetMonth !== null && d.getMonth() + 1 !== targetMonth) return false;
      return r.status !== 'cancelled';
    });

    const filteredExpense = expenseRecords.filter(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      if (d.getFullYear() !== year) return false;
      if (targetMonth !== null && d.getMonth() + 1 !== targetMonth) return false;
      return r.status !== 'rejected' && r.approvalStatus !== 'rejected';
    });

    const totalIncome = filteredIncome.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalExpense = filteredExpense.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    const marginPct = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';
    const liquidTotal = accounts.reduce((sum, a) => sum + Number(a.currentBalance || 0), 0);

    return {
      incomeCount: filteredIncome.length,
      totalIncome,
      expenseCount: filteredExpense.length,
      totalExpense,
      netBalance,
      marginPct,
      liquidTotal
    };
  }, [reportScope, year, month, incomeRecords, expenseRecords, accounts]);

  const handleDownload = () => {
    try {
      setGenerating(true);
      const isMonthly = reportScope === 'monthly';
      const selectedMonth = isMonthly ? month : null;

      downloadFinancialSummaryPdf({
        year,
        month: selectedMonth,
        accounts,
        incomeRecords,
        expenseRecords,
        allocations,
        contributions,
        currentUser,
        reportTitle: reportTitle.trim() || undefined,
        notes: adminNotes.trim() || undefined,
        includeItemizedIncome,
        includeItemizedExpense,
        includeBankBalances,
        includeSignatures
      });

      if (onSuccessToast) {
        onSuccessToast(
          isMonthly
            ? `Monthly Financial Report for ${MONTH_NAMES_EN[month - 1]} ${year} downloaded as PDF!`
            : `Annual Financial Statement for Fiscal Year ${year} downloaded as PDF!`
        );
      }
      onClose();
    } catch (err: any) {
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewInTab = () => {
    try {
      setGenerating(true);
      const isMonthly = reportScope === 'monthly';
      const selectedMonth = isMonthly ? month : null;

      previewFinancialSummaryPdfInNewTab({
        year,
        month: selectedMonth,
        accounts,
        incomeRecords,
        expenseRecords,
        allocations,
        contributions,
        currentUser,
        reportTitle: reportTitle.trim() || undefined,
        notes: adminNotes.trim() || undefined,
        includeItemizedIncome,
        includeItemizedExpense,
        includeBankBalances,
        includeSignatures
      });
    } catch (err: any) {
      alert('Failed to preview PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Financial Summary Report (PDF) • މާލީ ރިޕޯޓް ޑައުންލޯޑް"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-200">
        
        {/* Intro Banner */}
        <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
          <FileDown className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-white text-sm">
              Official ARC Financial Statement Generator
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Export high-resolution, vector PDF reports of monthly income, expenditures, and liquid asset reserves for official executive sign-off, internal auditing, and offline archiving.
            </p>
          </div>
        </div>

        {/* Scope and Period Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
            1. Select Report Period & Scope (މުއްދަތު އިޚްތިޔާރުކުރައްވާ)
          </label>
          
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setReportScope('monthly')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                reportScope === 'monthly'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Monthly Summary (މަހުގެ ރިޕޯޓް)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportScope('annual')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                reportScope === 'annual'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Full Fiscal Year (އަހަރީ ބަޔާން)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Fiscal Year */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Fiscal Year (އަހަރު)
              </label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                {[2027, 2026, 2025, 2024, 2023].map(y => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y} Fiscal Year
                  </option>
                ))}
              </select>
            </div>

            {/* Month Selector (if monthly scope) */}
            {reportScope === 'monthly' && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Month (މަސް)
                </label>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  {MONTH_NAMES_EN.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                      {idx + 1}. {mName} ({MONTH_NAMES_DV[idx]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Live Period Preview KPI Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Report Data Snapshot ({reportScope === 'monthly' ? `${MONTH_NAMES_EN[month - 1]} ${year}` : `${year} Annual`})
              </span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              Live Preview
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Income */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-semibold">Total Revenue</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 block mt-0.5">
                {formatReportCurrency(previewMetrics.totalIncome)}
              </span>
              <span className="text-[10px] text-slate-500">
                {previewMetrics.incomeCount} inflows
              </span>
            </div>

            {/* Expenses */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-semibold">Total Outflows</span>
              <span className="text-xs sm:text-sm font-bold text-rose-400 block mt-0.5">
                {formatReportCurrency(previewMetrics.totalExpense)}
              </span>
              <span className="text-[10px] text-slate-500">
                {previewMetrics.expenseCount} disbursements
              </span>
            </div>

            {/* Net Position */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-semibold">
                {previewMetrics.netBalance >= 0 ? 'Net Surplus' : 'Net Deficit'}
              </span>
              <span className={`text-xs sm:text-sm font-bold block mt-0.5 ${
                previewMetrics.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {previewMetrics.netBalance >= 0 ? '+' : '-'} {formatReportCurrency(Math.abs(previewMetrics.netBalance))}
              </span>
              <span className="text-[10px] text-slate-500">
                Margin: {previewMetrics.marginPct}%
              </span>
            </div>

            {/* Bank Reserves */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block font-semibold">Liquid Reserves</span>
              <span className="text-xs sm:text-sm font-bold text-blue-400 block mt-0.5">
                {formatReportCurrency(previewMetrics.liquidTotal)}
              </span>
              <span className="text-[10px] text-slate-500">
                {accounts.length} bank vaults
              </span>
            </div>
          </div>
        </div>

        {/* Content Customization & Inclusions */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
            2. Report Content Sections (ހިމަނަންވީ ބައިތައް)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeItemizedIncome}
                onChange={e => setIncludeItemizedIncome(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">Itemized Inflow List</span>
                <span className="text-[10px] text-slate-400">Include detailed table of all income receipts</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeItemizedExpense}
                onChange={e => setIncludeItemizedExpense(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">Itemized Outflow List</span>
                <span className="text-[10px] text-slate-400">Include detailed table of all vendor payments</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBankBalances}
                onChange={e => setIncludeBankBalances(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">Bank Accounts Reconciliation</span>
                <span className="text-[10px] text-slate-400">Snapshot of active bank balances & cash in hand</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="font-semibold text-white block">Executive Sign-Off Lines</span>
                <span className="text-[10px] text-slate-400">Prepared, Verified & Approved signature blocks</span>
              </div>
            </label>
          </div>
        </div>

        {/* Optional Title & Audit Notes */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
            3. Optional Metadata & Audit Note
          </label>
          
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Custom Report Title (Optional)
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                placeholder={
                  reportScope === 'monthly'
                    ? `e.g. ARC Financial Summary - ${MONTH_NAMES_EN[month - 1]} ${year}`
                    : `e.g. ARC Annual Financial Audit - Fiscal Year ${year}`
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Official Remark / Executive Note (Optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Approved during the 14th Executive Committee Session. All payments reconciled against BML statements."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel (ކެންސަލް)
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreviewInTab}
              disabled={generating}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Preview / Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={generating}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>{generating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
};
