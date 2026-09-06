import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Calendar,
  Clock,
  Check,
  X,
  CreditCard,
  User,
  Phone,
  ShieldCheck,
  Package
} from 'lucide-react';
import { RentalRequest, RentalUnit } from '../../../types';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalRequestsTabProps {
  canApprove?: boolean;
  canEdit?: boolean;
  lang?: string;
}

export const RentalRequestsTab: React.FC<RentalRequestsTabProps> = ({
  canApprove = true,
  canEdit = true,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [approvingReq, setApprovingReq] = useState<RentalRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<RentalRequest | null>(null);
  const [cancellingReq, setCancellingReq] = useState<RentalRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [availableUnits, setAvailableUnits] = useState<RentalUnit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/portal/rental/requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load rental requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // When opening approve modal, fetch units for that item
  const handleOpenApprove = async (req: RentalRequest) => {
    setApprovingReq(req);
    setSelectedUnitIds([]);
    setProcessing(true);
    try {
      const res = await authFetch(`/api/portal/rental/items/${req.itemId}/units`);
      if (res.ok) {
        const units: RentalUnit[] = await res.json();
        const avail = units.filter(u => u.status === 'available');
        setAvailableUnits(avail);
        // Pre-select first N units according to requestedQuantity
        const preselect = avail.slice(0, req.requestedQuantity).map(u => u.id);
        setSelectedUnitIds(preselect);
      }
    } catch (err) {
      console.error('Failed to load item units:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approvingReq) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/portal/rental/requests/${approvingReq.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedUnitIds: selectedUnitIds,
          securityDeposit
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve request');
      }

      showToast('success', 'ރިކުއެސްޓް ފާސްކުރެވި، ބިލް ތައްޔާރުކުރެވިއްޖެ');
      setApprovingReq(null);
      fetchRequests();
    } catch (err: any) {
      showToast('error', err.message || 'Approval error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingReq || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/portal/rental/requests/${rejectingReq.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject request');
      }

      showToast('success', 'ރިކުއެސްޓް ރިޖެކްޓް ކުރެވިއްޖެ');
      setRejectingReq(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err: any) {
      showToast('error', err.message || 'Reject error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingReq) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/portal/rental/requests/${cancellingReq.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || 'Cancelled by admin staff' })
      });
      if (res.ok) {
        showToast('success', 'ރިކުއެސްޓް ކެންސަލް ކުރެވިއްޖެ');
        setCancellingReq(null);
        setCancelReason('');
        fetchRequests();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to cancel');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        r.requestNumber.toLowerCase().includes(s) ||
        r.customerName.toLowerCase().includes(s) ||
        r.itemName.toLowerCase().includes(s) ||
        (r.customerPhone && r.customerPhone.includes(s))
      );
    }
    return true;
  });

  const isEn = lang === 'english';

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search by request #, customer, item...' : 'ރިކުއެސްޓް ނަންބަރު، ކަސްޓަމަރު ހޯދާ...'}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">{isEn ? 'All Statuses' : 'ހުރިހާ ސްޓޭޓަސްއެއް'}</option>
            <option value="requested">{isEn ? 'Pending Review' : 'ރިވިއުކުރަންޖެހޭ'}</option>
            <option value="approved_payment_pending">{isEn ? 'Payment Pending' : 'ފައިސާ ނުދައްކާ'}</option>
            <option value="payment_submitted">{isEn ? 'Payment Submitted' : 'ފައިސާ ދައްކާފައި'}</option>
            <option value="ready_for_collection">{isEn ? 'Ready for Handover' : 'ޙަވާލުކުރަން ތައްޔާރު'}</option>
            <option value="active_rental">{isEn ? 'Active Rental' : 'ކުއްޔަށް ދޫކޮށްފައި'}</option>
            <option value="return_inspection_pending">{isEn ? 'Inspection Pending' : 'އިންސްޕެކްޝަން'}</option>
            <option value="completed">{isEn ? 'Completed' : 'ނިމިފައި'}</option>
            <option value="rejected">{isEn ? 'Rejected' : 'ރިޖެކްޓް'}</option>
            <option value="cancelled">{isEn ? 'Cancelled' : 'ކެންސަލް'}</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {isEn ? 'No rental requests match your criteria.' : 'އެއްވެސް ރިކުއެސްޓެއް ފެންނާކަށް ނެތް.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-mono">REQ #</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Dates & Qty</th>
                  <th className="px-4 py-3">Estimated Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono font-bold text-orange-400">
                      {req.requestNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{req.itemName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{req.requestedQuantity} unit(s)</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{req.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {req.customerPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] space-y-0.5">
                      <div>
                        <span className="text-slate-500">From: </span>
                        {new Date(req.requestedStartAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <span className="text-slate-500">To: </span>
                        {new Date(req.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        ({req.rentalDays} Days)
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      MVR {req.estimatedRentalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'requested' && canApprove && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(req)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 shadow-sm transition"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingReq(req)}
                              className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg font-semibold flex items-center gap-1 transition"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {(req.status === 'requested' || req.status === 'approved_payment_pending' || req.status === 'payment_submitted' || req.status === 'payment_verified' || req.status === 'ready_for_collection') && canEdit && (
                          <button
                            onClick={() => {
                              setCancellingReq(req);
                              setCancelReason('');
                            }}
                            className="px-2 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-[11px] transition"
                          >
                            Cancel
                          </button>
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

      {/* Approve Modal */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Approve Rental Booking Request
              </h3>
              <button
                onClick={() => setApprovingReq(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Request:</span>
                <span className="font-mono font-bold text-white">#{approvingReq.requestNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{approvingReq.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Equipment:</span>
                <span className="text-white">{approvingReq.itemName} ({approvingReq.requestedQuantity} units)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rental Fee:</span>
                <span className="font-mono font-bold text-emerald-400">
                  MVR {approvingReq.estimatedRentalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Select Units */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Select Units to Reserve ({selectedUnitIds.length}/{approvingReq.requestedQuantity} selected)
              </label>
              {availableUnits.length === 0 ? (
                <p className="text-xs text-rose-400">No units currently marked as 'available' in inventory.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {availableUnits.map((u) => {
                    const isSelected = selectedUnitIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUnitIds(selectedUnitIds.filter(id => id !== u.id));
                          } else {
                            if (selectedUnitIds.length < approvingReq.requestedQuantity) {
                              setSelectedUnitIds([...selectedUnitIds, u.id]);
                            }
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition border ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-400">{u.unitNumber}</span>
                          <span className="text-slate-300 font-mono">[{u.assetTag}]</span>
                          {u.serialNumber && <span className="text-slate-500">SN: {u.serialNumber}</span>}
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-emerald-400">{u.condition}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmApprove}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {processing ? 'Processing...' : 'Confirm & Issue Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-500" />
                Reject Booking Request
              </h3>
              <button
                onClick={() => setRejectingReq(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Rejection Reason (Visible to customer) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Requested dates overlap with club maintenance window."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow transition disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Confirm Booking Cancellation
              </h3>
              <button
                onClick={() => setCancellingReq(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Request Number:</span>
                <span className="font-mono font-bold text-white">#{cancellingReq.requestNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{cancellingReq.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Item:</span>
                <span className="text-white">{cancellingReq.itemName} ({cancellingReq.requestedQuantity} units)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rental Total:</span>
                <span className="font-mono font-bold text-emerald-400">MVR {cancellingReq.estimatedRentalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              Cancelling this booking will release any reserved inventory units and cancel associated bills.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Cancelled upon customer request"
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmCancel}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow transition disabled:opacity-50"
              >
                {processing ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
