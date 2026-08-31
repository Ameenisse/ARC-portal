import React, { useState, useEffect } from 'react';
import { InvoiceRecord, BankAccount, User, IncomeCategory } from '../../../types';
import { api } from '../../../services/api';
import {
  DollarSign,
  CheckCircle,
  X,
  CreditCard,
  Building,
  User as UserIcon,
  Calendar,
  FileText,
  AlertCircle,
  ShieldCheck,
  Tag
} from 'lucide-react';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord;
  user: User | null;
  accounts?: BankAccount[];
  onSuccess: (updatedInvoice: InvoiceRecord, incomeRecord: any) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  user,
  accounts: propAccounts,
  onSuccess
}) => {
  const [accounts, setAccounts] = useState<BankAccount[]>(propAccounts || []);
  const [amount, setAmount] = useState<number>(
    Number(invoice.amountDue !== undefined ? invoice.amountDue : invoice.totalNetPayments || 0)
  );
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash' | 'both'>(
    invoice.paymentMethod || 'online'
  );
  const [accountId, setAccountId] = useState<string>('acc_primary_001');
  const [category, setCategory] = useState<IncomeCategory>('service_fee');
  const [receivedBy, setReceivedBy] = useState<string>(
    invoice.receivedBy || user?.fullName || user?.username || 'Treasurer'
  );
  const [receivedDate, setReceivedDate] = useState<string>(
    invoice.receivedDate || new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState<string>(
    invoice.referenceNumber || ''
  );
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load bank accounts if not passed
  useEffect(() => {
    if (!propAccounts || propAccounts.length === 0) {
      api.getBankAccounts()
        .then(data => {
          if (data && data.length > 0) {
            setAccounts(data);
            const primary = data.find(a => (a as any).isPrimary) || data[0];
            setAccountId(primary.id);
          }
        })
        .catch(() => {});
    } else {
      setAccounts(propAccounts);
      const primary = propAccounts.find(a => (a as any).isPrimary) || propAccounts[0];
      if (primary) setAccountId(primary.id);
    }
  }, [propAccounts]);

  useEffect(() => {
    const due = Number(invoice.amountDue !== undefined ? invoice.amountDue : invoice.totalNetPayments || 0);
    setAmount(due > 0 ? due : Number(invoice.totalNetPayments || 0));
    setPaymentMethod(invoice.paymentMethod || 'online');
    setReceivedBy(invoice.receivedBy || user?.fullName || user?.username || 'Treasurer');
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setReferenceNumber(invoice.referenceNumber || '');
    setError(null);
  }, [invoice, user]);

  if (!isOpen) return null;

  const totalDue = Number(invoice.amountDue !== undefined ? invoice.amountDue : invoice.totalNetPayments || 0);
  const isFullPayment = amount >= totalDue && totalDue > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const collectAmount = Number(amount);
    if (isNaN(collectAmount) || collectAmount <= 0) {
      setError('Please enter a valid collection amount greater than 0.');
      return;
    }

    if (!receivedBy.trim()) {
      setError('Please provide the Receiver / Collector name.');
      return;
    }

    if (!accountId) {
      setError('Please select a bank/cash account to deposit the funds.');
      return;
    }

    try {
      setLoading(true);
      const finalStatus = isFullPayment ? 'paid' : 'sent';
      const result = await api.collectInvoicePayment(invoice.id, {
        amount: collectAmount,
        paymentMethod,
        accountId,
        category,
        receivedBy: receivedBy.trim(),
        receivedDate,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        status: finalStatus
      });

      onSuccess(result.invoice, result.incomeRecord);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process payment collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="ltr" style={{ direction: 'ltr' }}>
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col" dir="ltr">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Collect Payment & Record Income
              </h3>
              <p className="text-xs text-slate-400">
                Update payment status for {invoice.type === 'quotation' ? 'Quotation' : 'Invoice'} #{invoice.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="collect-payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Summary Card */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client / Organization</span>
                <div className="text-sm font-bold text-white">{invoice.billTo}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Document No</span>
                <div className="text-xs font-mono font-bold text-red-400">{invoice.invoiceNumber}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Net:</span>
                <span className="font-mono font-bold text-white">{Number(invoice.totalNetPayments || 0).toFixed(2)} MVR</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Already Paid:</span>
                <span className="font-mono font-bold text-emerald-400">{Number(invoice.amountPaid || 0).toFixed(2)} MVR</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Remaining Due:</span>
                <span className="font-mono font-black text-amber-400">{Number(totalDue).toFixed(2)} MVR</span>
              </div>
            </div>
          </div>

          {/* Collection Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Amount to Collect (MVR) <span className="text-red-400">*</span>
              </label>
              {totalDue > 0 && amount !== totalDue && (
                <button
                  type="button"
                  onClick={() => setAmount(totalDue)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Collect Full Balance ({totalDue.toFixed(2)} MVR)
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                MVR
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Payment Method (Appears on Invoice) <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'online'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Online Transfer (BML)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('both')}
                className={`p-3 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'both'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Online & Cash</span>
              </button>
            </div>
          </div>

          {/* Deposit Account & Income Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Deposit to Account <span className="text-red-400">*</span>
              </label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.bankName || 'BML'}) - {Number(acc.currentBalance ?? (acc as any).balance ?? 0).toFixed(2)} MVR
                  </option>
                ))}
                {accounts.length === 0 && (
                  <option value="acc_primary_001">ARC Primary Account (BML)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Income Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as IncomeCategory)}
                required
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="service_fee">Service Fee / Direct Billing</option>
                <option value="sponsorship">Sponsorship</option>
                <option value="donation">Donation / Contribution</option>
                <option value="event_fee">Event Registration Fee</option>
                <option value="rental">Equipment / Space Rental</option>
                <option value="merchandise">Merchandise Sales</option>
                <option value="grant">Grant / Subsidy</option>
                <option value="other">Other Income</option>
              </select>
            </div>
          </div>

          {/* Receiver Name & Received Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Receiver Name (Updates on Invoice) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={e => setReceivedBy(e.target.value)}
                  placeholder="e.g. Treasurer Name"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Received Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={e => setReceivedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Reference Number & Receipt Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Reference / Slip Number (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. BML Slip # / Cheque #"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Receipt Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Fuel supply settlement"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Automated System Integration Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Automated Financial Integration</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Recording this payment will update the invoice payment status, mark the selected payment method, update the receiver name (<strong>{receivedBy || 'Treasurer'}</strong>), and automatically generate an entry in the Income Tracker under <strong>{accounts.find(a => a.id === accountId)?.accountName || 'Primary Account'}</strong>.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="collect-payment-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {loading ? 'Processing...' : `Collect MVR ${Number(amount || 0).toFixed(2)} & Add to Income`}
          </button>
        </div>
      </div>
    </div>
  );
};
