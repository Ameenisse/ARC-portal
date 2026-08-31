import React, { useState } from 'react';
import { ExpenseRecord, BankAccount, User } from '../../../types';
import { api } from '../../../services/api';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Clock,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  CreditCard,
  UserCheck
} from 'lucide-react';

interface BillViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: ExpenseRecord | null;
  accounts: BankAccount[];
  user: User | null;
  onExpenseUpdated: (updated: ExpenseRecord) => void;
}

export const BillViewerModal: React.FC<BillViewerModalProps> = ({
  isOpen,
  onClose,
  expense,
  accounts,
  user,
  onExpenseUpdated
}) => {
  const [approving, setApproving] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !expense) return null;

  const isPresidentOrVP = (user?.roleName || user?.roleId || '').toLowerCase().includes('president') ||
    (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') ||
    user?.permissions?.some(p => p.moduleKey === 'budget' && p.canApprove);

  const isPaid = expense.status === 'paid';
  const isApproved = expense.approvalStatus === 'approved' || expense.status === 'paid' || expense.paymentReleaseApproved;
  const isPending = expense.status === 'pending_approval' || expense.approvalStatus === 'pending';

  const hasDocument = Boolean(expense.billDocumentUrl);
  const isPdf = expense.billDocumentUrl?.startsWith('data:application/pdf') ||
    expense.billDocumentName?.toLowerCase().endsWith('.pdf');

  const handleApprovePaymentRelease = async () => {
    try {
      setApproving(true);
      setError(null);

      const targetAccount = selectedAccountId || expense.accountId || accounts[0]?.id;
      const updated = await api.approveExpensePayment(expense.id, {
        status: 'approved',
        releasePayment: true,
        accountId: targetAccount,
        remarks: remarks || `Approved for payment release by ${user?.fullName || user?.username}`
      });

      onExpenseUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment release');
    } finally {
      setApproving(false);
    }
  };

  const handleDownload = () => {
    if (!expense.billDocumentUrl) return;
    const a = document.createElement('a');
    a.href = expense.billDocumentUrl;
    a.download = expense.billDocumentName || `bill_${expense.billNumber || expense.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const accountObj = accounts.find(a => a.id === (expense.accountId || selectedAccountId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Attached Bill / Receipt
                {expense.billNumber && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    #{expense.billNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {expense.title} • {Number(expense.amount).toFixed(2)} MVR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasDocument && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Download original document"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Bill Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Vendor / Supplier:</span>
              <strong className="text-white text-sm">{expense.vendorName || expense.payee || 'Not Specified'}</strong>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Bill Number:</span>
              <strong className="text-white font-mono">{expense.billNumber || expense.receiptNumber || 'N/A'}</strong>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Bill Date:</span>
              <strong className="text-white">{expense.billDate || expense.date?.slice(0, 10) || 'N/A'}</strong>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Bill Total:</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {Number(expense.billTotal || expense.amount).toFixed(2)} MVR
              </strong>
            </div>
          </div>

          {/* Document Viewer Container */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[340px] max-h-[500px] relative">
            {hasDocument ? (
              isPdf ? (
                <iframe
                  src={expense.billDocumentUrl}
                  title="Uploaded Bill Document"
                  className="w-full h-[450px] border-none"
                />
              ) : (
                <div className="p-4 overflow-auto max-h-[450px] flex items-center justify-center">
                  <img
                    src={expense.billDocumentUrl}
                    alt={expense.billDocumentName || 'Uploaded Bill'}
                    className="max-h-[420px] max-w-full rounded object-contain shadow-lg"
                  />
                </div>
              )
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm font-medium text-slate-400">No Document Attached</p>
                <p className="text-xs">This expense record has metadata details but no physical file uploaded.</p>
              </div>
            )}
          </div>

          {/* Payment & Approval Status Section */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Payment Release & Approval State
              </span>
              <div>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Payment Released & Paid
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Pending Executive Approval (President / VP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Rejected
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-400">
              <div>
                <span>Disbursing Account: </span>
                <strong className="text-slate-200 block mt-0.5">
                  {accountObj ? `${accountObj.accountName} (${accountObj.bankName})` : 'ARC Primary BML Account'}
                </strong>
              </div>
              <div>
                <span>Approved By: </span>
                <strong className="text-slate-200 block mt-0.5">
                  {expense.approvedBy || expense.paymentReleasedBy || 'Pending Executive Review'}
                </strong>
              </div>
              <div>
                <span>Release Date: </span>
                <strong className="text-slate-200 block mt-0.5">
                  {expense.paymentReleasedAt ? new Date(expense.paymentReleasedAt).toLocaleDateString() : 'Pending'}
                </strong>
              </div>
            </div>

            {/* Executive Payment Release Action Box */}
            {isPresidentOrVP && !isPaid && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>President / Vice President Approval Action</span>
                </div>
                <p className="text-slate-300 text-xs">
                  Review the attached bill details above. Approving will authorize the payment release, mark the status as <strong>Paid</strong>, and adjust the designated bank account balance.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Disburse From Account</label>
                    <select
                      value={selectedAccountId || expense.accountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountName} - Balance: {Number(acc.currentBalance ?? (acc as any).balance ?? 0).toFixed(2)} MVR
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Approval Remarks</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. Verified goods received, approved for online BML release"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApprovePaymentRelease}
                    disabled={approving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {approving ? 'Authorizing...' : 'Approve & Release Payment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
