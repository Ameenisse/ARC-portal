import React, { useState, useEffect } from 'react';
import { ContributionPaymentRequest, BankAccount } from '../../../types';
import { api } from '../../../services/api';
import { useToast } from '../../common/Toast';
import { useAuth } from '../../../context/AuthContext';
import { PaymentSlipViewerModal } from './PaymentSlipViewerModal';
import { SlipLightboxModal } from './SlipLightboxModal';
import { resolveSlipUrl, createDigitalSlipDataUrl } from '../../../utils/slipReceiptGenerator';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Search,
  RefreshCw,
  Eye,
  FileCheck,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Users,
  Building2,
  Filter,
  X,
  FileText
} from 'lucide-react';

interface ContributionSlipsApprovalTabProps {
  onRefreshContributions: () => void;
  lang?: 'english' | 'dhivehi';
}

function formatSubmittedDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

export const ContributionSlipsApprovalTab: React.FC<ContributionSlipsApprovalTabProps> = ({
  onRefreshContributions,
  lang = 'english'
}) => {
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canApprove = hasPermission('budget', 'canApprove');

  const [requests, setRequests] = useState<ContributionPaymentRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchMember, setSearchMember] = useState('');
  const [searchMemberNumber, setSearchMemberNumber] = useState('');
  const [submittedDateFilter, setSubmittedDateFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'monthly' | 'annual'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');

  const [selectedRequest, setSelectedRequest] = useState<ContributionPaymentRequest | null>(null);
  const [inspectingSlipRequest, setInspectingSlipRequest] = useState<ContributionPaymentRequest | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resRequests, resAccounts] = await Promise.all([
        api.getContributionPaymentRequests(),
        api.getBankAccounts()
      ]);
      const list = Array.isArray(resRequests) ? resRequests : (resRequests?.requests || []);
      setRequests(list);

      const accList = Array.isArray(resAccounts) ? resAccounts : [];
      setBankAccounts(accList.filter((a: BankAccount) => a.status === 'active'));
    } catch (err) {
      console.error('Failed to load contribution payment requests:', err);
      showToast('error', 'Failed to load membership fee payment slips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (id: string, data: {
    referenceNumber: string;
    paymentType: 'monthly' | 'annual' | 'waterfall';
    month?: number;
    accountId: string;
    approvalNote?: string;
    amountPaid?: number;
    approvedAmount?: number;
  }) => {
    const res = await api.approveContributionPaymentRequest(id, data);
    if (res?.request) {
      setRequests(prev => prev.map(r => r.id === id ? res.request : r));
    } else {
      await loadData();
    }
    showToast('success', isDh ? 'ފީ ބަލައިގަނެ އެޕްރޫވް ކުރެވިއްޖެ!' : 'Membership fee approved and ledger credited!');
    onRefreshContributions();
  };

  const handleReject = async (id: string, reason: string) => {
    const res = await api.rejectContributionPaymentRequest(id, { rejectionReason: reason });
    if (res?.request) {
      setRequests(prev => prev.map(r => r.id === id ? res.request : r));
    } else {
      await loadData();
    }
    showToast('info', isDh ? 'ފީގެ ސްލިޕް ރިޖެކްޓް ކުރެވިއްޖެ' : 'Payment slip marked as rejected');
  };

  const handleSlipUpdated = (updated: ContributionPaymentRequest) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (selectedRequest?.id === updated.id) setSelectedRequest(updated);
    if (inspectingSlipRequest?.id === updated.id) setInspectingSlipRequest(updated);
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('all');
    setSearchMember('');
    setSearchMemberNumber('');
    setSubmittedDateFilter('');
    setPaymentTypeFilter('all');
    setAccountFilter('all');
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    searchMember.trim() !== '' ||
    searchMemberNumber.trim() !== '' ||
    submittedDateFilter !== '' ||
    paymentTypeFilter !== 'all' ||
    accountFilter !== 'all';

  // Apply filters
  const filtered = requests.filter(req => {
    // Status filter
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    // Member Name filter
    if (searchMember.trim()) {
      const q = searchMember.toLowerCase();
      if (!req.memberName?.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Member Number filter
    if (searchMemberNumber.trim()) {
      const q = searchMemberNumber.toLowerCase();
      if (!req.memberNumber?.toLowerCase().includes(q)) {
        return false;
      }
    }

    // Submitted Date filter (YYYY-MM-DD match)
    if (submittedDateFilter) {
      const reqDate = req.submittedAt ? req.submittedAt.split('T')[0] : '';
      if (reqDate !== submittedDateFilter) {
        return false;
      }
    }

    // Payment Type filter (Applies after review: monthly or annual)
    if (paymentTypeFilter !== 'all') {
      if (req.paymentType !== paymentTypeFilter) {
        return false;
      }
    }

    // Receiving Account filter
    if (accountFilter !== 'all') {
      if (req.accountId !== accountFilter) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalCount = requests.length;

  return (
    <div className="space-y-6">

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div
          id="summary-card-pending"
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-amber-400">
              {isDh ? 'ވެރިފައިކުރަންޖެހޭ' : 'Pending'}
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{pendingCount}</span>
            <span className="text-xs text-slate-400">{isDh ? 'ސްލިޕް' : 'requests'}</span>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium block mt-1">
            {pendingCount > 0 ? (isDh ? 'އެޕްރޫވަލް ބޭނުންވޭ' : 'Requires review') : (isDh ? 'ހުރިހާ ސްލިޕެއް ބެލިއްޖެ' : 'All caught up')}
          </span>
        </div>

        {/* Approved Card */}
        <div
          id="summary-card-approved"
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/15 border-emerald-500/60 ring-2 ring-emerald-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-emerald-400">
              {isDh ? 'އެޕްރޫވް ކުރެވިފައި' : 'Approved'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{approvedCount}</span>
            <span className="text-xs text-slate-400">{isDh ? 'ސްލިޕް' : 'requests'}</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 font-medium block mt-1">
            {isDh ? 'ފައިސާ ވަދެފައި' : 'Credited to ledger'}
          </span>
        </div>

        {/* Rejected Card */}
        <div
          id="summary-card-rejected"
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-500/15 border-rose-500/60 ring-2 ring-rose-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-rose-400">
              {isDh ? 'ރިޖެކްޓް ކުރެވިފައި' : 'Rejected'}
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{rejectedCount}</span>
            <span className="text-xs text-slate-400">{isDh ? 'ސްލިޕް' : 'requests'}</span>
          </div>
          <span className="text-[11px] text-rose-400/90 font-medium block mt-1">
            {isDh ? 'ޞައްޙަނޫން ސްލިޕް' : 'Unverified or rejected'}
          </span>
        </div>

        {/* Total Submitted Card */}
        <div
          id="summary-card-total"
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-800/80 border-slate-600 ring-1 ring-slate-600'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-slate-300">
              {isDh ? 'ޖުމްލަ ލިބުނު' : 'Total Submitted'}
            </span>
            <FileCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{totalCount}</span>
            <span className="text-xs text-slate-400">{isDh ? 'ޖުމްލަ' : 'total'}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">
            {isDh ? 'ހުރިހާ ސްލިޕެއް' : 'Lifetime submissions'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>{isDh ? 'ފިލްޓަރުތައް' : 'Approval Queue Filters'}</span>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{isDh ? 'ފިލްޓަރ ފޮހެލާ' : 'Clear Filters'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'ސްޓޭޓަސް' : 'Status'}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isDh ? 'ހުރިހާ ސްޓޭޓަސް' : 'All Statuses'}</option>
              <option value="pending">{isDh ? 'ވެރިފައިކުރަންޖެހޭ (Pending)' : 'Pending Review'}</option>
              <option value="approved">{isDh ? 'އެޕްރޫވް ކުރެވިފައި (Approved)' : 'Approved'}</option>
              <option value="rejected">{isDh ? 'ރިޖެކްޓް ކުރެވިފައި (Rejected)' : 'Rejected'}</option>
            </select>
          </div>

          {/* Search Member Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'މެންބަރުގެ ނަން' : 'Search Member'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder={isDh ? 'ނަން ޖައްސަވާ...' : 'Ahmed Ali...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Member Number */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'މެންބަރު ނަންބަރު' : 'Member Number'}
            </label>
            <input
              type="text"
              value={searchMemberNumber}
              onChange={(e) => setSearchMemberNumber(e.target.value)}
              placeholder={isDh ? 'މިސާލު: ARC-M-025' : 'ARC-M-025'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Submitted Date */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'ހުށަހެޅި ތާރީޚް' : 'Submitted Date'}
            </label>
            <input
              type="date"
              value={submittedDateFilter}
              onChange={(e) => setSubmittedDateFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'ޕޭމަންޓް ބާވަތް' : 'Payment Type'}
            </label>
            <select
              value={paymentTypeFilter}
              onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isDh ? 'ހުރިހާ ބާވަތެއް' : 'All Types'}</option>
              <option value="monthly">{isDh ? 'މަހު ފީ (Monthly)' : 'Monthly'}</option>
              <option value="annual">{isDh ? 'އަހަރީ ފީ (Annual)' : 'Annual'}</option>
            </select>
          </div>

          {/* Receiving Account */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
              {isDh ? 'ލިބުނު އެކައުންޓް' : 'Receiving Account'}
            </label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">{isDh ? 'ހުރިހާ އެކައުންޓެއް' : 'All Accounts'}</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pending / Review Request Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {isDh ? 'މެންބަރޝިޕް ފީ އެޕްރޫވަލް ލިސްޓް' : 'Membership Fee Payment Requests'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {!canApprove && (
            <div className="text-[11px] text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{isDh ? 'ބެއްލެވުމުގެ ހުއްދަ އެކަނި' : 'Read-only view (Approval requires budget.canApprove)'}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <span>Loading payment requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-400">
              {hasActiveFilters
                ? 'No payment requests match the selected filters.'
                : 'No membership fee payment slips found in the queue.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/40 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Request No.</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Member No.</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Slip</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(req => {
                  const isPendingReq = req.status === 'pending';
                  const isApprovedReq = req.status === 'approved';
                  const isRejectedReq = req.status === 'rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-850/50 transition">
                      {/* 1. Request No. */}
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {req.requestNumber}
                      </td>

                      {/* 2. Member */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{req.memberName}</div>
                        {(req.memberNote || req.payerNote) && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs" title={req.memberNote || req.payerNote}>
                            Note: {req.memberNote || req.payerNote}
                          </div>
                        )}
                      </td>

                      {/* 3. Member No. */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {req.memberNumber || 'N/A'}
                        </span>
                      </td>

                      {/* 4. Submitted */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap font-mono">
                        {formatSubmittedDate(req.submittedAt)}
                      </td>

                      {/* 5. Slip */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {(() => {
                          const rawSlipUrl =
                            req.slipDataUrl ||
                            req.slipDownloadUrl ||
                            (req as any).paymentSlipUrl ||
                            (req as any).slipUrl ||
                            '';
                          const slipUrl = resolveSlipUrl(rawSlipUrl) || createDigitalSlipDataUrl(req);
                          const isPdf = Boolean(
                            slipUrl &&
                              (slipUrl.includes('application/pdf') ||
                                req.slipFileName?.toLowerCase().endsWith('.pdf'))
                          );

                          return (
                            <div className="flex items-center gap-2">
                              {slipUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setInspectingSlipRequest(req)}
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-400 bg-slate-950 transition shrink-0 cursor-pointer shadow-sm group flex items-center justify-center"
                                  title="Inspect slip file"
                                >
                                  {isPdf ? (
                                    <div className="w-full h-full flex items-center justify-center bg-rose-500/10 text-rose-400">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <img
                                      src={slipUrl}
                                      alt="Slip thumbnail"
                                      className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                                      onError={(e) => {
                                        const fallback = createDigitalSlipDataUrl(req);
                                        if (e.currentTarget.src !== fallback) {
                                          e.currentTarget.src = fallback;
                                        } else {
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.parentElement?.classList.add('bg-slate-900');
                                        }
                                      }}
                                    />
                                  )}
                                </button>
                              ) : (
                                <div className="w-8 h-8 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-500">
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <button
                                type="button"
                                id={`view-slip-btn-${req.id}`}
                                onClick={() => setInspectingSlipRequest(req)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition shadow-sm cursor-pointer"
                                title="Open interactive slip viewer"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span>VIEW SLIP</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isPendingReq && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {isApprovedReq && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {isRejectedReq && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400" title={req.rejectionReason}>
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {req.status === 'cancelled' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
                            <Ban className="w-3 h-3" /> Cancelled
                          </span>
                        )}
                      </td>

                      {/* 7. Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                            isPendingReq
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isPendingReq ? (canApprove ? 'REVIEW' : 'VIEW') : 'VIEW'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slip Review / Verification Modal (Reusing existing PaymentSlipViewerModal) */}
      {selectedRequest && (
        <PaymentSlipViewerModal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          canApprove={canApprove}
          isCurrentUserOwner={false}
          onApprove={handleApprove}
          onReject={handleReject}
          onSlipUpdated={handleSlipUpdated}
        />
      )}

      {/* Dedicated Interactive Slip Lightbox Inspector */}
      {inspectingSlipRequest && (
        <SlipLightboxModal
          isOpen={Boolean(inspectingSlipRequest)}
          onClose={() => setInspectingSlipRequest(null)}
          request={inspectingSlipRequest}
          canApprove={canApprove}
          onSlipUpdated={handleSlipUpdated}
          onProceedToReview={(req) => {
            setInspectingSlipRequest(null);
            setSelectedRequest(req);
          }}
          lang={lang}
        />
      )}

    </div>
  );
};
