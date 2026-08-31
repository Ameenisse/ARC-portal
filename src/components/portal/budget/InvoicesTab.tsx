import React, { useState, useEffect } from 'react';
import { InvoiceRecord, User, BankAccount } from '../../../types';
import { api } from '../../../services/api';
import { InvoiceGeneratorModal } from './InvoiceGeneratorModal';
import { InvoiceTemplateView } from './InvoiceTemplateView';
import { CollectPaymentModal } from './CollectPaymentModal';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  Building,
  DollarSign,
  ArrowUpDown,
  RefreshCw,
  CreditCard,
  X
} from 'lucide-react';

interface InvoicesTabProps {
  user: User | null;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({ user, showToast }) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'quotation'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending_approval' | 'paid'>('all');

  // Modals state
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceRecord | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [collectingInvoice, setCollectingInvoice] = useState<InvoiceRecord | null>(null);

  const isPresidentOrVP = (user?.roleName || user?.roleId || '').toLowerCase().includes('president') ||
    (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') ||
    user?.permissions?.some(p => p.moduleKey === 'budget' && p.canApprove);

  const isTreasurerOrAdmin = (user?.roleName || user?.roleId || '').toLowerCase().includes('treasurer') ||
    (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') ||
    isPresidentOrVP ||
    user?.permissions?.some(p => p.moduleKey === 'budget' && (p.canCreate || p.canEdit));

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const [invoicesData, accountsData] = await Promise.all([
        api.getInvoices(),
        api.getBankAccounts().catch(() => [])
      ]);
      setInvoices(invoicesData || []);
      setBankAccounts(accountsData || []);
    } catch (err: any) {
      showToast('error', 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleApproveInvoice = async (invoice: InvoiceRecord) => {
    try {
      const updated = await api.approveInvoice(invoice.id, {
        status: 'approved',
        remarks: `Approved by ${user?.fullName || user?.username}`
      });
      setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
      if (viewingInvoice?.id === updated.id) {
        setViewingInvoice(updated);
      }
      showToast('success', `${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} "${invoice.invoiceNumber}" approved successfully! Treasurer can now collect payment.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve invoice');
    }
  };

  const handleDeleteInvoice = async (invoice: InvoiceRecord) => {
    if (!window.confirm(`Delete ${invoice.type} "${invoice.invoiceNumber}" for "${invoice.billTo}"?`)) return;
    try {
      await api.deleteInvoice(invoice.id);
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      showToast('success', `${invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} deleted`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete invoice');
    }
  };

  // Filtered list
  const filteredInvoices = invoices.filter(inv => {
    if (typeFilter !== 'all' && inv.type !== typeFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'approved' && inv.status !== 'approved' && inv.approvalStatus !== 'approved') return false;
      if (statusFilter === 'pending_approval' && inv.status !== 'pending_approval' && inv.approvalStatus !== 'pending') return false;
      if (statusFilter === 'paid' && inv.status !== 'paid') return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchClient = inv.billTo.toLowerCase().includes(q);
      const matchRemark = inv.remark?.toLowerCase().includes(q);
      const matchItems = inv.items?.some(i => i.description.toLowerCase().includes(q));
      return matchNum || matchClient || matchRemark || matchItems;
    }
    return true;
  });

  // Calculate Metrics
  const totalInvoiced = invoices
    .filter(i => i.type === 'invoice')
    .reduce((sum, i) => sum + (Number(i.totalNetPayments) || 0), 0);

  const totalCollected = invoices
    .filter(i => i.type === 'invoice')
    .reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);

  const totalOutstanding = invoices
    .filter(i => i.type === 'invoice')
    .reduce((sum, i) => sum + (Number(i.amountDue) || 0), 0);

  const pendingApprovalsCount = invoices.filter(i => i.status === 'pending_approval' || i.approvalStatus === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 rounded-lg bg-red-600/20 text-red-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">
            {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-sans">MVR</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total revenue billed through ARC invoices</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount Collected</span>
            <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
            {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-sans">MVR</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Added to Club Income records</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding Due</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 font-mono">
            {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400 font-sans">MVR</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending collection by Treasurer</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400 font-mono">
            {pendingApprovalsCount} <span className="text-xs text-slate-400 font-sans">documents</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires President / VP approval</div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client, invoice number, line item description..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Types</option>
            <option value="invoice">Invoices Only</option>
            <option value="quotation">Quotations Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved & Official</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="paid">Fully Paid</option>
          </select>

          <button
            type="button"
            onClick={loadInvoices}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => {
              setInvoiceToEdit(null);
              setGeneratorOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice / Quotation
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Document #</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Bill To (Client)</th>
                <th className="py-3.5 px-4 text-right">Net Amount</th>
                <th className="py-3.5 px-4 text-right">Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredInvoices.map(inv => {
                const isApproved = inv.status === 'approved' || inv.approvalStatus === 'approved' || inv.status === 'paid';
                const isPending = inv.status === 'pending_approval' || inv.approvalStatus === 'pending';
                const isFullyPaid = inv.status === 'paid' || (Number(inv.amountDue || 0) === 0 && Number(inv.amountPaid || 0) > 0);

                return (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      {inv.type === 'quotation' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                          Quotation
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 uppercase">
                          Invoice
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {inv.invoiceDate}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{inv.billTo}</div>
                      {inv.receivedBy && (
                        <div className="text-[11px] text-slate-400">
                          Receiver: <span className="text-slate-300 font-medium">{inv.receivedBy}</span>
                        </div>
                      )}
                      {inv.remark && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{inv.remark}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {Number(inv.totalNetPayments || 0).toFixed(2)} MVR
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-red-400">
                      {Number(inv.amountDue || 0).toFixed(2)} MVR
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isFullyPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" />
                          Paid ({inv.paymentMethod || 'Settled'})
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <CheckCircle className="w-3 h-3" />
                          Approved (Ready to Collect)
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          Pending Review
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
                          {inv.status}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Approve for President / VP */}
                        {isPresidentOrVP && isPending && (
                          <button
                            type="button"
                            onClick={() => handleApproveInvoice(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow transition-all"
                            title="Approve as President / Vice President"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Collect Payment / Update Status (Treasurer & Admin, only after approval) */}
                        {isTreasurerOrAdmin && isApproved && !isFullyPaid && (
                          <button
                            type="button"
                            onClick={() => setCollectingInvoice(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                            title="Collect Payment & Record into Club Income"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        )}

                        {/* If already paid, allow viewing/re-collecting */}
                        {isTreasurerOrAdmin && isApproved && isFullyPaid && (
                          <button
                            type="button"
                            onClick={() => setCollectingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors"
                            title="Update Payment Details / Receiver"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        {/* View & Print */}
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                          title="View Official Template & Print"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceToEdit(inv);
                            setGeneratorOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Edit Document"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No Invoices or Quotations Found</p>
                    <p className="text-xs">Click "Generate Invoice / Quotation" to create your first official document.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Generator / Editor Modal */}
      {generatorOpen && (
        <InvoiceGeneratorModal
          isOpen={generatorOpen}
          onClose={() => {
            setGeneratorOpen(false);
            setInvoiceToEdit(null);
          }}
          onSaved={saved => {
            loadInvoices();
            setViewingInvoice(saved);
            showToast('success', `${saved.type === 'quotation' ? 'Quotation' : 'Invoice'} "${saved.invoiceNumber}" saved and submitted for Executive Review!`);
          }}
          invoiceToEdit={invoiceToEdit}
          user={user}
        />
      )}

      {/* Collect Payment Modal (Treasurer) */}
      {collectingInvoice && (
        <CollectPaymentModal
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          invoice={collectingInvoice}
          user={user}
          accounts={bankAccounts}
          onSuccess={(updatedInvoice, incomeRecord) => {
            setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
            if (viewingInvoice?.id === updatedInvoice.id) {
              setViewingInvoice(updatedInvoice);
            }
            showToast(
              'success',
              `Collected MVR ${incomeRecord?.amount || updatedInvoice.amountPaid} for #${updatedInvoice.invoiceNumber}. Receiver updated to "${updatedInvoice.receivedBy}" & recorded in Club Income!`
            );
          }}
        />
      )}

      {/* Official Template View Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto" dir="ltr" style={{ direction: 'ltr' }}>
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col" dir="ltr">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950" dir="ltr">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-white">
                  Official {viewingInvoice.type === 'quotation' ? 'Quotation' : 'Invoice'} Preview
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {isTreasurerOrAdmin && (viewingInvoice.status === 'approved' || viewingInvoice.approvalStatus === 'approved') && Number(viewingInvoice.amountDue) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const inv = viewingInvoice;
                      setViewingInvoice(null);
                      setCollectingInvoice(inv);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <DollarSign className="w-4 h-4" />
                    Collect Payment & Update Status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/60" dir="ltr" style={{ direction: 'ltr' }}>
              <InvoiceTemplateView
                invoice={viewingInvoice}
                canApprove={isPresidentOrVP}
                onApprove={() => handleApproveInvoice(viewingInvoice)}
                onCollectPayment={isTreasurerOrAdmin && (viewingInvoice.status === 'approved' || viewingInvoice.approvalStatus === 'approved' || viewingInvoice.status === 'paid') ? () => {
                  const inv = viewingInvoice;
                  setViewingInvoice(null);
                  setCollectingInvoice(inv);
                } : undefined}
                showActions={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
