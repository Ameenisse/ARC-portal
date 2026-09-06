import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  Search,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Building2,
  Receipt
} from 'lucide-react';
import { RentalBill, RentalPayment, RentalReceipt, BudgetAccount } from '../../../types';
import { PrintableReceipt } from '../../rental/PrintableReceipt';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalPaymentsTabProps {
  canApprove?: boolean;
  canEdit?: boolean;
  lang?: string;
}

export const RentalPaymentsTab: React.FC<RentalPaymentsTabProps> = ({
  canApprove = true,
  canEdit = true,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [bills, setBills] = useState<RentalBill[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [budgetAccounts, setBudgetAccounts] = useState<BudgetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'payments' | 'bills'>('payments');
  const [search, setSearch] = useState('');

  // Approve Payment Modal
  const [approvingPayment, setApprovingPayment] = useState<RentalPayment | null>(null);
  const [selectedBudgetAccId, setSelectedBudgetAccId] = useState<string>('');
  const [approving, setApproving] = useState(false);

  // Reject Payment Modal
  const [rejectingPayment, setRejectingPayment] = useState<RentalPayment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Slip preview modal
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  // Receipt modal
  const [activeReceipt, setActiveReceipt] = useState<RentalReceipt | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsRes, paysRes, accRes] = await Promise.all([
        authFetch('/api/portal/rental/bills'),
        authFetch('/api/portal/rental/payments'),
        authFetch('/api/budget/accounts').catch(() => null)
      ]);

      if (billsRes.ok) setBills(await billsRes.json());
      if (paysRes.ok) setPayments(await paysRes.json());
      if (accRes && accRes.ok) {
        const accs = await accRes.json();
        setBudgetAccounts(accs);
        if (accs.length > 0) setSelectedBudgetAccId(accs[0].id);
      }
    } catch (err) {
      console.error('Failed to load payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmApprovePayment = async () => {
    if (!approvingPayment) return;
    setApproving(true);
    try {
      const res = await authFetch(`/api/portal/rental/payments/${approvingPayment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetAccountId: selectedBudgetAccId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve payment');
      }

      const receipt = await res.json();
      showToast('success', 'ފައިސާ ކަށަވަރުކުރެވި، ބަޖެޓަށް އާމްދަނީ ޖަމާކުރެވިއްޖެ!');
      setApprovingPayment(null);
      fetchData();
      if (receipt && receipt.receiptNumber) {
        setActiveReceipt(receipt);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Approval error');
    } finally {
      setApproving(false);
    }
  };

  const handleConfirmRejectPayment = async () => {
    if (!rejectingPayment || !rejectReason.trim()) return;
    setApproving(true);
    try {
      const res = await authFetch(`/api/portal/rental/payments/${rejectingPayment.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject payment');
      }

      showToast('success', 'ފައިސާގެ މުޢާމަލާތް ރިޖެކްޓް ކުރެވިއްޖެ');
      setRejectingPayment(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Reject error');
    } finally {
      setApproving(false);
    }
  };

  const isEn = lang === 'english';

  const pendingPayments = payments.filter(p => p.status === 'submitted');

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-500" />
            {isEn ? 'Rental Payments & Financial Billing' : 'ފައިސާގެ މުޢާމަލާތްތަކާއި ބިލިންގް'}
          </h3>
          <p className="text-xs text-slate-400">
            {isEn
              ? 'Verify customer bank transfer slips, auto-post income into club budget accounts, and issue official receipts.'
              : 'ބޭންކް ޓްރާންސްފަރ ސްލިޕްތައް ކަށަވަރުކުރުން، ބަޖެޓަށް އާމްދަނީ ވެއްދުން އަދި ރަސީދު ދޫކުރުން.'}
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setViewTab('payments')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewTab === 'payments' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Payments ({pendingPayments.length} pending)
          </button>
          <button
            onClick={() => setViewTab('bills')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewTab === 'bills' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Invoices & Bills ({bills.length})
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewTab === 'payments' ? (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">Loading payment transactions...</div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">No payments submitted yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Method & Tx Ref</th>
                      <th className="px-4 py-3">Transfer Slip</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3 text-[11px] font-mono text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{p.customerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.customerPhone}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-400 text-sm">
                          MVR {p.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          <div>{p.method}</div>
                          {p.transferReference && (
                            <span className="text-orange-400">Ref: {p.transferReference}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.slipUrl ? (
                            <button
                              onClick={() => setPreviewSlipUrl(p.slipUrl || null)}
                              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-orange-400 rounded flex items-center gap-1 border border-slate-700"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Slip
                            </button>
                          ) : (
                            <span className="text-slate-500">None attached</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'verified' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            p.status === 'submitted' ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' :
                            'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.status === 'submitted' && canApprove && (
                              <>
                                <button
                                  onClick={() => setApprovingPayment(p)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm transition"
                                >
                                  <Check className="w-3 h-3" />
                                  Verify & Approve
                                </button>
                                <button
                                  onClick={() => setRejectingPayment(p)}
                                  className="px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bills / Invoices View */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">Bill #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Amount Paid</th>
                  <th className="px-4 py-3">Balance Due</th>
                  <th className="px-4 py-3">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {bills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3 font-mono font-bold text-orange-400">
                      {b.billNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{b.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-300">
                      {b.billType.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      MVR {b.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-400">
                      MVR {b.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-400">
                      MVR {b.balanceDue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.paymentStatus === 'paid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        b.paymentStatus === 'pending' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slip Preview Modal */}
      {previewSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">Bank Transfer Slip Preview</h4>
              <button onClick={() => setPreviewSlipUrl(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewSlipUrl}
              alt="Slip"
              referrerPolicy="no-referrer"
              className="max-h-[75vh] mx-auto rounded-xl object-contain border border-slate-800"
            />
          </div>
        </div>
      )}

      {/* Approve Payment Modal */}
      {approvingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Approve Payment & Sync to Budget
              </h3>
              <button onClick={() => setApprovingPayment(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{approvingPayment.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Credit:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  MVR {approvingPayment.amount.toLocaleString()}
                </span>
              </div>
              {approvingPayment.transferReference && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Reference:</span>
                  <span className="font-mono text-slate-200">{approvingPayment.transferReference}</span>
                </div>
              )}
            </div>

            {/* Select Budget Account */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Deposit into Club Budget Account:
              </label>
              {budgetAccounts.length > 0 ? (
                <select
                  value={selectedBudgetAccId}
                  onChange={e => setSelectedBudgetAccId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                >
                  {budgetAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({a.bankName} - {a.accountNumber})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-400">Default general operating budget account will be used.</p>
              )}
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-900 rounded-xl text-[11px] text-emerald-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Automatic Accounting & Billing Actions:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-emerald-400/90">
                <li>Issues Official Numbered Receipt (ARC-RR-2026-XXXX)</li>
                <li>Creates categorized IncomeRecord in Budget & Finance module</li>
                <li>Marks request as "Ready for Handover / Collection"</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingPayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleConfirmApprovePayment}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {approving ? 'Verifying...' : 'Confirm & Post to Budget'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                Reject Payment Submission
              </h3>
              <button onClick={() => setRejectingPayment(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Rejection Reason (e.g. invalid transfer slip, amount mismatch) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Describe reason for payment rejection..."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving || !rejectReason.trim()}
                onClick={handleConfirmRejectPayment}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow transition"
              >
                {approving ? 'Rejecting...' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {activeReceipt && (
        <PrintableReceipt
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};
