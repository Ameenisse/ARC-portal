import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileText,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  AlertTriangle,
  Loader2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ContributionPaymentRequest } from '../../../types';

interface PaymentSlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ContributionPaymentRequest | null;
  canApprove: boolean;
  onApprove?: (id: string, options: { approvalNote?: string; referenceNumber?: string; approvedAmount?: number; noReferenceException?: boolean }) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  isCurrentUserOwner?: boolean;
}

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentSlipViewerModal: React.FC<PaymentSlipViewerModalProps> = ({
  isOpen,
  onClose,
  request,
  canApprove,
  onApprove,
  onReject,
  onCancel,
  isCurrentUserOwner
}) => {
  const [activeAction, setActiveAction] = useState<'none' | 'approve' | 'reject' | 'cancel'>('none');
  const [approvalNote, setApprovalNote] = useState('');
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState(request?.referenceNumber || '');
  const [approvedAmount, setApprovedAmount] = useState<string>(request ? String(request.totalAmount || 50) : '50');
  const [noReferenceException, setNoReferenceException] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (request) {
      setPaymentReferenceNumber(request.referenceNumber || '');
      setApprovedAmount(String(request.totalAmount || 50));
      setNoReferenceException(false);
    }
  }, [request?.id, request?.referenceNumber, request?.totalAmount]);

  if (!isOpen || !request) return null;

  const handleApproveSubmit = async () => {
    if (!onApprove) return;
    const cleanRef = paymentReferenceNumber.trim();
    if (!cleanRef && !noReferenceException) {
      setErrorMsg('Payment Reference Number is required before approval. If no reference is visible on the slip, check the exception box.');
      return;
    }

    try {
      setProcessing(true);
      setErrorMsg('');
      const parsedApproved = parseFloat(approvedAmount);
      await onApprove(request.id, {
        approvalNote: approvalNote.trim(),
        referenceNumber: cleanRef,
        approvedAmount: !isNaN(parsedApproved) && parsedApproved > 0 ? parsedApproved : undefined,
        noReferenceException
      });
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve payment request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!onReject) return;
    if (!rejectionReason.trim()) {
      setErrorMsg('Please specify the reason for rejecting this payment.');
      return;
    }
    try {
      setProcessing(true);
      setErrorMsg('');
      await onReject(request.id, rejectionReason.trim());
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject payment request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!onCancel) return;
    try {
      setProcessing(true);
      setErrorMsg('');
      await onCancel(request.id);
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel payment request.');
    } finally {
      setProcessing(false);
    }
  };

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isCancelled = request.status === 'cancelled';

  const monthsFormatted = (request.months || [])
    .sort((a, b) => a - b)
    .map(m => MONTH_NAMES[m] || `M${m}`)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="payment-slip-viewer-card"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Payment Request: {request.requestNumber}
                </h2>
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending Review
                  </span>
                )}
                {isApproved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                )}
                {isRejected && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Rejected
                  </span>
                )}
                {isCancelled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Cancelled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Submitted on {new Date(request.submittedAt).toLocaleDateString()} at {new Date(request.submittedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Member Details */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Member Information
              </div>
              <div className="text-sm font-bold text-white">{request.memberName}</div>
              <div className="text-xs text-slate-400">
                Member No: <span className="font-mono text-slate-200">{request.memberNumber}</span>
              </div>
              {request.referenceNumber && (
                <div className="text-xs text-slate-400">
                  Bank Reference: <span className="font-mono text-emerald-400">{request.referenceNumber}</span>
                </div>
              )}
              {request.memberNote && (
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-850">
                  Note: <span className="text-slate-300 italic">{request.memberNote}</span>
                </div>
              )}
            </div>

            {/* Payment & Account Details */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Payment & Account Info
              </div>
              <div className="text-xs text-slate-400">
                Period: <span className="font-bold text-white">{request.year} ({monthsFormatted})</span>
                {request.paymentType === 'annual' && (
                  <span className="ml-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    Annual Package
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">
                Deposited To: <span className="text-slate-200">{request.bankName} - {request.accountName}</span>
              </div>
              <div className="text-xs text-slate-400">
                Account Number: <span className="font-mono text-slate-200">{request.accountNumber}</span>
              </div>
              <div className="text-sm font-extrabold text-emerald-400 pt-1">
                Total Amount: {request.totalAmount} MVR
              </div>
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Financial Allocation Breakdown</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Base Contribution ({request.months.length} month(s)):</span>
                <span>{request.baseAmount} MVR</span>
              </div>
              {request.fineAmount > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>Late Fines:</span>
                  <span>+{request.fineAmount} MVR</span>
                </div>
              )}
              {request.discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Advance Discount:</span>
                  <span>-{request.discountAmount} MVR</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                <span>Total Verified Amount:</span>
                <span className="text-base text-emerald-400">{request.totalAmount} MVR</span>
              </div>
            </div>
          </div>

          {/* Bank Slip Image / Document Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                Bank Transfer Slip
              </span>
              {request.slipDownloadUrl && (
                <a
                  href={request.slipDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  <span>Open Full Size</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center min-h-[260px] overflow-hidden">
              {request.slipDownloadUrl ? (
                request.slipDownloadUrl.includes('application/pdf') || request.slipFileName?.endsWith('.pdf') ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="w-16 h-16 text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-white">{request.slipFileName || 'Payment Slip PDF'}</p>
                    <a
                      href={request.slipDownloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View PDF Document</span>
                    </a>
                  </div>
                ) : (
                  <img
                    src={request.slipDownloadUrl}
                    alt="Payment Slip"
                    className="max-h-[420px] max-w-full object-contain rounded-xl border border-slate-800"
                  />
                )
              ) : (
                <div className="text-xs text-slate-500">No slip image attached</div>
              )}
            </div>
          </div>

          {/* Review Details (if already reviewed) */}
          {(isApproved || isRejected) && (
            <div className={`p-4 rounded-2xl border ${
              isApproved
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs mb-1">
                {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>
                  {isApproved ? 'Approved by' : 'Rejected by'} {request.reviewedByName || 'Treasurer/Admin'}
                </span>
                {request.reviewedAt && (
                  <span className="text-[11px] opacity-75 font-normal">
                    • {new Date(request.reviewedAt).toLocaleString()}
                  </span>
                )}
              </div>
              {request.approvalNote && (
                <p className="text-xs text-slate-300 mt-1">
                  Note: {request.approvalNote}
                </p>
              )}
              {request.rejectionReason && (
                <p className="text-xs text-rose-200 mt-1 font-semibold">
                  Reason for Rejection: {request.rejectionReason}
                </p>
              )}
              {request.incomeRecordId && (
                <div className="mt-2 text-[11px] text-slate-400">
                  Linked Financial Income Record: <span className="font-mono text-emerald-400">{request.incomeRecordId}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Confirmation Forms */}
          {activeAction === 'approve' && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Contribution Payment Approval</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Approving this request will automatically:
                <br />• Split the verified slip amount across unpaid months (deducting fines, applying discounts if eligible, and rolling excess to future months).
                <br />• Credit the exact amount to bank account <em>{request.accountName}</em> and record in Income.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="approve-verified-amount-input" className="text-[11px] font-bold text-slate-200 flex items-center justify-between mb-1">
                    <span>Verified Slip Amount:</span>
                    <span className="text-[10px] text-emerald-400 font-normal">From Transfer Slip</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="approve-verified-amount-input"
                      min="1"
                      step="any"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      placeholder="50"
                      className="w-full bg-slate-950 border border-slate-700 font-mono font-bold text-emerald-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 pr-12"
                    />
                    <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-bold">MVR</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="approve-payment-reference-number-input" className="text-[11px] font-bold text-slate-200 flex items-center justify-between mb-1">
                    <span>Slip Ref / Transaction No: <span className="text-amber-400">*</span></span>
                    <span className="text-[10px] text-emerald-400 font-normal">Official Bank Ref</span>
                  </label>
                  <input
                    type="text"
                    id="approve-payment-reference-number-input"
                    value={paymentReferenceNumber}
                    onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                    placeholder="e.g. BML Slip Ref Number"
                    disabled={noReferenceException}
                    className="w-full bg-slate-950 border border-slate-700 font-mono text-emerald-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  <label className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noReferenceException}
                      onChange={(e) => setNoReferenceException(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span>No reference visible on slip (exception)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Approval Notes (Optional):
                </label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Verified against BML statement"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-approve-payment-btn"
                  onClick={handleApproveSubmit}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Confirm & Credit Ledger</span>
                </button>
              </div>
            </div>
          )}

          {activeAction === 'reject' && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>Reject Payment Submission</span>
              </div>
              <p className="text-xs text-slate-300">
                The member will be notified with this rejection reason and financial ledgers will not be updated.
              </p>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Rejection Reason *
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Amount does not match bank slip, unreadable image, or invalid account"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-reject-payment-btn"
                  onClick={handleRejectSubmit}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow transition"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {activeAction === 'cancel' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Ban className="w-4 h-4 text-amber-400" />
                <span>Cancel Payment Request</span>
              </div>
              <p className="text-xs text-slate-400">
                Are you sure you want to cancel this pending payment request? You can submit a new slip anytime.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  id="confirm-cancel-request-btn"
                  onClick={handleCancelSubmit}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>Yes, Cancel Request</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {isPending && isCurrentUserOwner && activeAction === 'none' && (
              <button
                type="button"
                id="cancel-payment-request-btn"
                onClick={() => setActiveAction('cancel')}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPending && canApprove && activeAction === 'none' && (
              <>
                <button
                  type="button"
                  id="reject-payment-request-btn"
                  onClick={() => setActiveAction('reject')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/15 hover:bg-rose-600 transition flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  id="approve-payment-request-btn"
                  onClick={() => setActiveAction('approve')}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Credit Account</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
