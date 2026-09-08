import React, { useState, useEffect } from 'react';
import { ContributionPaymentRequest } from '../../../types';
import { api } from '../../../services/api';
import { useToast } from '../../common/Toast';
import { PaymentSlipViewerModal } from './PaymentSlipViewerModal';
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
  Users
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface ContributionSlipsApprovalTabProps {
  onRefreshContributions: () => void;
  lang?: 'english' | 'dhivehi';
}

export const ContributionSlipsApprovalTab: React.FC<ContributionSlipsApprovalTabProps> = ({
  onRefreshContributions,
  lang = 'english'
}) => {
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [requests, setRequests] = useState<ContributionPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<ContributionPaymentRequest | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getContributionPaymentRequests();
      const list = Array.isArray(res) ? res : (res?.requests || []);
      setRequests(list);
    } catch (err) {
      console.error('Failed to load contribution payment requests:', err);
      showToast('error', 'Failed to load payment slips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleApprove = async (id: string, options?: { approvalNote?: string; referenceNumber?: string; approvedAmount?: number; noReferenceException?: boolean }) => {
    const res = await api.approveContributionPaymentRequest(id, options);
    if (res?.request) {
      setRequests(prev => prev.map(r => r.id === id ? res.request : r));
    } else {
      await loadRequests();
    }
    showToast('success', 'Payment slip approved and ledger credited!');
    onRefreshContributions();
  };

  const handleReject = async (id: string, reason: string) => {
    const res = await api.rejectContributionPaymentRequest(id, { rejectionReason: reason });
    if (res?.request) {
      setRequests(prev => prev.map(r => r.id === id ? res.request : r));
    } else {
      await loadRequests();
    }
    showToast('info', 'Payment slip marked as rejected');
  };

  // Filter requests
  const filtered = requests.filter(req => {
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.memberName?.toLowerCase().includes(q);
      const matchNum = req.memberNumber?.toLowerCase().includes(q);
      const matchReq = req.requestNumber?.toLowerCase().includes(q);
      const matchRef = req.referenceNumber?.toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchReq && !matchRef) return false;
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      
      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-amber-400">
              {isDh ? 'ވެރިފައިކުރަންޖެހޭ (Pending)' : 'Awaiting Review'}
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pendingCount}</span>
            <span className="text-xs text-slate-400">slips pending</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'approved'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-emerald-400">
              {isDh ? 'އެޕްރޫވް ކުރެވިފައި (Approved)' : 'Approved & Credited'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{approvedCount}</span>
            <span className="text-xs text-slate-400">slips approved</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-5 rounded-2xl border transition cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/40'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-rose-400">
              {isDh ? 'ރިޖެކްޓް ކުރެވިފައި (Rejected)' : 'Rejected Slips'}
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{rejectedCount}</span>
            <span className="text-xs text-slate-400">slips rejected</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold mr-1">Status:</span>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st} {st === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, number, ref..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50 cursor-pointer"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <span>Loading payment slips...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No member payment slips found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Target Period</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Slip / Ref</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(req => {
                  const monthsStr = (req.months || [])
                    .sort((a, b) => a - b)
                    .map(m => MONTH_NAMES[m - 1]?.slice(0, 3) || `M${m}`)
                    .join(', ');

                  return (
                    <tr key={req.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {req.requestNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{req.memberName}</div>
                        <div className="text-[11px] font-mono text-emerald-400">{req.memberNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="font-semibold text-white">{req.year}</span>: {monthsStr}
                        {req.paymentType === 'annual' && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                            Annual Advance
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {req.totalAmount} MVR
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(req.submittedAt).toLocaleDateString()} {new Date(req.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse">
                            <Clock className="w-3 h-3" /> Awaiting Review
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
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
                      <td className="py-3 px-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          {req.referenceNumber && (
                            <span className="font-mono text-[11px] text-slate-300">
                              {req.referenceNumber}
                            </span>
                          )}
                          {req.slipDownloadUrl && (
                            <a
                              href={req.slipDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-slate-800"
                              title="Open slip in new window"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                            req.status === 'pending'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{req.status === 'pending' ? 'Review & Verify' : 'View Details'}</span>
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

      {/* Slip Review / Verification Modal */}
      {selectedRequest && (
        <PaymentSlipViewerModal
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
          request={selectedRequest}
          canApprove={true}
          isCurrentUserOwner={false}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

    </div>
  );
};
