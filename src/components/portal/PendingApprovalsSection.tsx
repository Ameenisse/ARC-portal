import React, { useState, useEffect } from 'react';
import { InvoiceRecord, ExpenseRecord, BankAccount, User } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { BillViewerModal } from './budget/BillViewerModal';
import { InvoiceTemplateView } from './budget/InvoiceTemplateView';
import {
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Check,
  X,
  Building,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface PendingApprovalsSectionProps {
  user: User;
  themeColor?: 'amber' | 'sky' | 'emerald';
  onUpdated?: () => void;
  className?: string;
}

export const PendingApprovalsSection: React.FC<PendingApprovalsSectionProps> = ({
  user,
  themeColor = 'amber',
  onUpdated,
  className = ''
}) => {
  const { lang } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'invoices' | 'expenses'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals for inspection
  const [inspectingExpense, setInspectingExpense] = useState<ExpenseRecord | null>(null);
  const [inspectingInvoice, setInspectingInvoice] = useState<InvoiceRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invoicesData, expensesData, accountsData] = await Promise.all([
        api.getInvoices().catch(() => []),
        api.getExpenseRecords().catch(() => []),
        api.getBankAccounts().catch(() => [])
      ]);

      const allInvoices = (invoicesData || []) as InvoiceRecord[];
      const allExpenses = (expensesData || []) as ExpenseRecord[];

      // Filter for items pending approval
      const pendingInvoices = allInvoices.filter(
        inv => inv.status === 'pending_approval' || inv.approvalStatus === 'pending'
      );
      const pendingExpenses = allExpenses.filter(
        exp => exp.status === 'pending_approval' || exp.approvalStatus === 'pending' || (exp.billDocumentUrl && !exp.paymentReleaseApproved && exp.status !== 'paid')
      );

      setInvoices(pendingInvoices);
      setExpenses(pendingExpenses);
      setAccounts(accountsData || []);
    } catch (err: any) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    if (onUpdated) onUpdated();
  };

  const handleApproveInvoice = async (invoice: InvoiceRecord) => {
    try {
      setActionLoadingId(invoice.id);
      const updated = await api.approveInvoice(invoice.id, {
        status: 'approved',
        remarks: `Authorized and approved by ${user.fullName || user.username}`
      });
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      if (inspectingInvoice?.id === invoice.id) {
        setInspectingInvoice(null);
      }
      showToast(
        'success',
        `${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} "${invoice.invoiceNumber}" approved successfully!`
      );
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectInvoice = async (invoice: InvoiceRecord) => {
    const reason = window.prompt(`Please enter rejection remarks for ${invoice.type} "${invoice.invoiceNumber}":`);
    if (reason === null) return;
    try {
      setActionLoadingId(invoice.id);
      await api.approveInvoice(invoice.id, {
        status: 'rejected',
        remarks: reason || `Rejected by ${user.fullName || user.username}`
      });
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      if (inspectingInvoice?.id === invoice.id) {
        setInspectingInvoice(null);
      }
      showToast('info', `${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} rejected`);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveExpense = async (expense: ExpenseRecord) => {
    try {
      setActionLoadingId(expense.id);
      const targetAccount = expense.accountId || accounts[0]?.id;
      const updated = await api.approveExpensePayment(expense.id, {
        status: 'approved',
        releasePayment: true,
        accountId: targetAccount,
        remarks: `Payment release approved by ${user.fullName || user.username}`
      });
      setExpenses(prev => prev.filter(exp => exp.id !== expense.id));
      if (inspectingExpense?.id === expense.id) {
        setInspectingExpense(null);
      }
      showToast('success', `Payment released and expense bill "${expense.title}" approved!`);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectExpense = async (expense: ExpenseRecord) => {
    const reason = window.prompt(`Please enter rejection remarks for expense bill "${expense.title}":`);
    if (reason === null) return;
    try {
      setActionLoadingId(expense.id);
      await api.approveExpensePayment(expense.id, {
        status: 'rejected',
        releasePayment: false,
        remarks: reason || `Rejected by ${user.fullName || user.username}`
      });
      setExpenses(prev => prev.filter(exp => exp.id !== expense.id));
      if (inspectingExpense?.id === expense.id) {
        setInspectingExpense(null);
      }
      showToast('info', `Expense bill "${expense.title}" rejected`);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPendingInvoicesAmount = invoices.reduce(
    (sum, inv) => sum + (Number(inv.totalNetPayments) || 0),
    0
  );
  const totalPendingExpensesAmount = expenses.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );
  const totalPendingCount = invoices.length + expenses.length;
  const totalPendingAmount = totalPendingInvoicesAmount + totalPendingExpensesAmount;

  const accentStyles =
    themeColor === 'sky'
      ? {
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          btn: 'bg-sky-600 hover:bg-sky-500 text-white',
          border: 'border-sky-500/30',
          highlight: 'text-sky-400'
        }
      : {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          btn: 'bg-amber-600 hover:bg-amber-500 text-white',
          border: 'border-amber-500/30',
          highlight: 'text-amber-400'
        };

  return (
    <div
      id="pending-approvals-section"
      className={`bg-slate-900 border ${
        totalPendingCount > 0 ? accentStyles.border : 'border-slate-800'
      } rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl relative overflow-hidden transition-all ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                totalPendingCount > 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {totalPendingCount > 0 ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white font-heading tracking-wide flex items-center gap-2">
              <span>
                {isDh
                  ? 'ބިލްތަކާއި އިންވޮއިސްތަކުގެ ހުއްދަ'
                  : 'Pending Invoice & Bill Approvals'}
              </span>
              {totalPendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                  {totalPendingCount} {isDh ? 'ބޭނުންވޭ' : 'Pending'}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            {isDh
              ? 'ޚަޒާންދާރު ނުވަތަ ކޮމިޓީން ފޮނުވާފައިވާ އިންވޮއިސްތަކާއި ޚަރަދު ބިލްތަކަށް ރިޔާސީ / އިދާރީ ހުއްދަ ދިނުން.'
              : 'Review, authorize, and release payments for vendor bills, club expense vouchers, and official outbound invoices.'}
          </p>
        </div>

        {/* Right Action: Filters & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {totalPendingCount > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({totalPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('invoices')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeFilter === 'invoices'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Invoices ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('expenses')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeFilter === 'expenses'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Bills ({expenses.length})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh Pending Approvals"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Pills if pending */}
      {totalPendingCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Pending Value
              </span>
              <div className="text-xl font-bold text-white font-mono">
                {totalPendingAmount.toLocaleString()}{' '}
                <span className="text-xs text-amber-400 font-sans">MVR</span>
              </div>
            </div>
            <DollarSign className="w-6 h-6 text-amber-400/70" />
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pending Invoices / Quotes
              </span>
              <div className="text-xl font-bold text-indigo-400 font-mono">
                {invoices.length}{' '}
                <span className="text-xs text-slate-400 font-sans">
                  ({totalPendingInvoicesAmount.toLocaleString()} MVR)
                </span>
              </div>
            </div>
            <FileText className="w-6 h-6 text-indigo-400/70" />
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pending Bills / Expenses
              </span>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {expenses.length}{' '}
                <span className="text-xs text-slate-400 font-sans">
                  ({totalPendingExpensesAmount.toLocaleString()} MVR)
                </span>
              </div>
            </div>
            <Receipt className="w-6 h-6 text-amber-400/70" />
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 space-y-3">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs">Checking for pending approvals...</p>
        </div>
      ) : totalPendingCount === 0 ? (
        /* Empty State */
        <div className="py-8 px-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">
            {isDh ? 'ހުއްދައަށް އެދިފައިވާ ބިލެއް ނުވަތަ އިންވޮއިސެއް ނެތް' : 'All Clear — No Pending Approvals'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isDh
              ? 'މިވަގުތު ރިޔާސީ ނުވަތަ ނައިބު ރައީސްގެ ހުއްދައަށް އެދި ހުށަހަޅާފައިވާ އެއްވެސް ބިލެއް ނުވަތަ އިންވޮއިސެއް ނެތެވެ.'
              : 'There are currently no expense payment releases or client invoices awaiting executive signing.'}
          </p>
        </div>
      ) : (
        /* List of Pending Items */
        <div className="space-y-3">
          {/* Invoices List */}
          {(activeFilter === 'all' || activeFilter === 'invoices') &&
            invoices.map(invoice => {
              const isProcessing = actionLoadingId === invoice.id;
              const isQuote = invoice.type === 'quotation';
              return (
                <div
                  key={`inv-${invoice.id}`}
                  className="bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-xs">
                        {isQuote ? 'Quotation' : 'Outbound Invoice'}
                      </span>
                      <span className="text-sm font-extrabold text-white font-mono">
                        {invoice.invoiceNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        PENDING EXECUTIVE APPROVAL
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-400">Bill To / Client: </span>
                        <strong className="text-white">{invoice.billTo || 'General Client'}</strong>
                      </div>
                      {invoice.invoiceDate && (
                        <div>
                          <span className="text-slate-400">Date: </span>
                          <span>{invoice.invoiceDate}</span>
                        </div>
                      )}
                      {invoice.createdByName && (
                        <div>
                          <span className="text-slate-400">Prepared By: </span>
                          <span className="text-slate-300">{invoice.createdByName}</span>
                        </div>
                      )}
                    </div>

                    {((invoice as any).notes || invoice.footerNoticeEnglish) && (
                      <p className="text-xs text-slate-400 italic line-clamp-1">{(invoice as any).notes || invoice.footerNoticeEnglish}</p>
                    )}
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Total Amount
                      </span>
                      <span className="text-lg font-extrabold text-indigo-400 font-mono">
                        {Number(invoice.totalNetPayments || 0).toLocaleString()} MVR
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectingInvoice(invoice)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        title="Review Full Invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveInvoice(invoice)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isProcessing ? 'Approving...' : 'Approve'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectInvoice(invoice)}
                        disabled={isProcessing}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                        title="Reject Invoice"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

          {/* Expenses / Bills List */}
          {(activeFilter === 'all' || activeFilter === 'expenses') &&
            expenses.map(expense => {
              const isProcessing = actionLoadingId === expense.id;
              const hasBillDoc = Boolean(expense.billDocumentUrl);
              return (
                <div
                  key={`exp-${expense.id}`}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                        Expense Bill / Payment Release
                      </span>
                      {expense.billNumber && (
                        <span className="text-xs font-bold text-slate-300 font-mono">
                          #{expense.billNumber}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        PAYMENT RELEASE REQUIRED
                      </span>
                      {hasBillDoc && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Attached Document
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <div>
                        <strong className="text-white text-sm">{expense.title}</strong>
                      </div>
                      {expense.payee && (
                        <div>
                          <span className="text-slate-400">Payee / Vendor: </span>
                          <span className="text-amber-300 font-medium">{expense.payee}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">Category: </span>
                        <span className="text-slate-300">{expense.category}</span>
                      </div>
                      {expense.date && (
                        <div>
                          <span className="text-slate-400">Date: </span>
                          <span>{expense.date}</span>
                        </div>
                      )}
                    </div>

                    {expense.notes && (
                      <p className="text-xs text-slate-400 line-clamp-1">{expense.notes}</p>
                    )}
                  </div>

                  {/* Amount & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">
                        Payment Amount
                      </span>
                      <span className="text-lg font-extrabold text-amber-400 font-mono">
                        {Number(expense.amount || 0).toLocaleString()} MVR
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInspectingExpense(expense)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        title="Review Bill & Attachments"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Bill</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveExpense(expense)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isProcessing ? 'Releasing...' : 'Approve & Release'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectExpense(expense)}
                        disabled={isProcessing}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                        title="Reject Bill"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Quick Navigation Link to full Budget Module */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs text-slate-400">
        <span>
          {isDh
            ? 'މާލީ ހުރިހާ ތަފްޞީލުތަކާއި އެކައުންޓްތައް ބެލުމަށް'
            : 'Looking for full budget accounts, ledger statements & historical records?'}
        </span>
        <a
          href="/portal/budget"
          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
        >
          <span>{isDh ? 'ބަޖެޓް ޕޯޓަލް ހުޅުވާލައްވާ' : 'Open Budget Module'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Bill Viewer Modal for Expense inspection */}
      {inspectingExpense && (
        <BillViewerModal
          isOpen={Boolean(inspectingExpense)}
          onClose={() => setInspectingExpense(null)}
          expense={inspectingExpense}
          accounts={accounts}
          user={user}
          onExpenseUpdated={updated => {
            setExpenses(prev => prev.filter(e => e.id !== updated.id));
            setInspectingExpense(null);
            showToast('success', 'Expense updated successfully');
            if (onUpdated) onUpdated();
          }}
        />
      )}

      {/* Invoice Template Modal for Invoice inspection */}
      {inspectingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Executive Review: {inspectingInvoice.type === 'quotation' ? 'Quotation' : 'Invoice'} #{inspectingInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingInvoice(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InvoiceTemplateView
              invoice={inspectingInvoice}
              canApprove={true}
              onApprove={() => handleApproveInvoice(inspectingInvoice)}
              showActions={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
