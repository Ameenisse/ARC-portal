import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  CreditCard,
  X,
  Check,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { RentalRequest, RentalUnit, AdditionalChargeItem } from '../../../types';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalReturnsTabProps {
  canApprove?: boolean;
  canEdit?: boolean;
  lang?: string;
}

export const RentalReturnsTab: React.FC<RentalReturnsTabProps> = ({
  canApprove = true,
  canEdit = true,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [activeRentals, setActiveRentals] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Return inspection state
  const [inspectingReq, setInspectingReq] = useState<RentalRequest | null>(null);
  const [returnTime, setReturnTime] = useState(new Date().toISOString().slice(0, 16));
  const [unitsInfo, setUnitsInfo] = useState<RentalUnit[]>([]);
  const [unitDecisions, setUnitDecisions] = useState<Record<string, {
    condition: RentalUnit['condition'];
    nextStatus: RentalUnit['status'];
    notes: string;
  }>>({});

  // Charges
  const [charges, setCharges] = useState<AdditionalChargeItem[]>([]);
  const [isWaived, setIsWaived] = useState(false);
  const [waiverReason, setWaiverReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchActive = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/portal/rental/requests');
      if (res.ok) {
        const data: RentalRequest[] = await res.json();
        setActiveRentals(data.filter(r => r.status === 'active_rental' || r.status === 'additional_payment_required'));
      }
    } catch (err) {
      console.error('Failed to load active rentals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActive();
  }, []);

  const handleStartInspection = async (req: RentalRequest) => {
    setInspectingReq(req);
    const nowIso = new Date().toISOString().slice(0, 16);
    setReturnTime(nowIso);
    setIsWaived(false);
    setWaiverReason('');
    setInspectionNotes('');

    // Calculate initial late fee if overdue
    const dueTime = new Date(req.approvedEndAt || req.requestedEndAt).getTime();
    const returnMs = new Date().getTime();
    const initialCharges: AdditionalChargeItem[] = [];

    if (returnMs > dueTime) {
      const lateHours = (returnMs - dueTime) / (1000 * 60 * 60);
      const gracePeriod = 2; // hours
      if (lateHours > gracePeriod) {
        const lateDays = Math.ceil((lateHours - gracePeriod) / 24);
        const lateFeePerDay = 150;
        const totalLateFee = lateDays * lateFeePerDay * req.requestedQuantity;
        initialCharges.push({
          description: `Late return fine (${Math.round(lateHours)} hrs overdue; ${lateDays} x 24h block)`,
          amount: totalLateFee,
          type: 'late_fine'
        });
      }
    }
    setCharges(initialCharges);

    // Fetch assigned units
    try {
      const res = await authFetch(`/api/portal/rental/items/${req.itemId}/units`);
      if (res.ok) {
        const allUnits: RentalUnit[] = await res.json();
        const assigned = allUnits.filter(u => (req.assignedUnitIds || []).includes(u.id));
        setUnitsInfo(assigned);

        const initialDecisions: Record<string, any> = {};
        assigned.forEach(u => {
          initialDecisions[u.id] = {
            condition: 'good',
            nextStatus: 'available',
            notes: ''
          };
        });
        setUnitDecisions(initialDecisions);
      }
    } catch (e) {
      console.error('Error fetching units:', e);
    }
  };

  const handleAddChargeRow = () => {
    setCharges([...charges, { description: 'Damage / Repair fee', amount: 200, type: 'damage' }]);
  };

  const handleRemoveChargeRow = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
  };

  const totalChargesAmount = isWaived ? 0 : charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleConfirmReturn = async () => {
    if (!inspectingReq) return;
    if (isWaived && !waiverReason.trim()) {
      showToast('error', 'Please provide a mandatory reason for waiving return charges.');
      return;
    }

    setSubmitting(true);
    try {
      const unitOutcomes = Object.entries(unitDecisions).map(([unitId, val]) => ({
        unitId,
        condition: val.condition,
        status: val.nextStatus,
        notes: val.notes
      }));

      const res = await authFetch(`/api/portal/rental/requests/${inspectingReq.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualReturnAt: new Date(returnTime).toISOString(),
          inspectionNotes,
          unitOutcomes,
          additionalCharges: charges,
          isChargesWaived: isWaived,
          waiverReason: isWaived ? waiverReason.trim() : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete return inspection');
      }

      showToast('success', totalChargesAmount > 0
        ? 'އިންސްޕެކްޝަން ނިމި، އިތުރު ޚަރަދުގެ ބިލް ފޮނުވިއްޖެ'
        : 'ތަކެތި އަނބުރާ ބަލައިގަނެވިއްޖެ! ޔުނިޓްތައް އަލުން ތައްޔާރުކުރެވިއްޖެ');
      setInspectingReq(null);
      fetchActive();
    } catch (err: any) {
      showToast('error', err.message || 'Inspection error');
    } finally {
      setSubmitting(false);
    }
  };

  const isEn = lang === 'english';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-orange-500" />
          {isEn ? 'Returns & Inspection Station' : 'ތަކެތި ބަލައިގަތުމާއި އިންސްޕެކްޝަން'}
        </h3>
        <p className="text-xs text-slate-400">
          {isEn
            ? 'Inspect active rentals upon return. Calculate late fines automatically, log equipment condition, and settle return charges.'
            : 'ކުއްޔަށް ދޫކޮށްފައިވާ ތަކެތި އަނބުރާ ގެނައުމުން ޗެކްކުރުން، ލަސްވި ފީ ހިސާބުކުރުން، އަދި ނިންމުން.'}
        </p>
      </div>

      {/* Active Rentals Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading active rentals...</div>
      ) : activeRentals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-300">
            {isEn ? 'No active rentals currently in the field.' : 'މިވަގުތު ކުއްޔަށް ދޫކޮށްފައިވާ އެއްވެސް އެއްޗެއް ނެތް.'}
          </p>
          <p className="text-slate-500">
            {isEn ? 'When equipment is handed over, active bookings appear here.' : 'ތަކެތި ޙަވާލުކުރުމުން މިތަނަށް އިތުރުވާނެއެވެ.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRentals.map((req) => {
            const dueTime = new Date(req.approvedEndAt || req.requestedEndAt).getTime();
            const now = Date.now();
            const isOverdue = now > dueTime;
            const overdueHours = isOverdue ? Math.round((now - dueTime) / (1000 * 60 * 60)) : 0;

            return (
              <div
                key={req.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 transition ${
                  isOverdue
                    ? 'border-rose-500/40 bg-rose-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-orange-400">
                      #{req.requestNumber}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{req.itemName}</h4>
                  </div>
                  {isOverdue ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      {overdueHours}h Overdue
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-800">
                      Active Rental
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Customer:</span>
                    <div className="font-semibold text-white">{req.customerName}</div>
                    <div className="text-slate-400 font-mono">{req.customerPhone}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Return Due Date:</span>
                    <div className="font-semibold text-slate-200">
                      {new Date(req.approvedEndAt || req.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-slate-400">{req.requestedQuantity} Unit(s)</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Handed over on {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                  <button
                    onClick={() => handleStartInspection(req)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Process Return & Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Inspection Modal */}
      {inspectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                Return Inspection: #{inspectingReq.requestNumber}
              </h3>
              <button onClick={() => setInspectingReq(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Return Date & Due Comparison */}
            <div className="p-4 bg-slate-800/60 rounded-xl grid grid-cols-2 gap-3 text-xs border border-slate-800">
              <div>
                <span className="text-slate-400 block mb-1">Scheduled Return Deadline:</span>
                <span className="font-mono font-bold text-white">
                  {new Date(inspectingReq.approvedEndAt || inspectingReq.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Actual Return Date & Time:</label>
                <input
                  type="datetime-local"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            {/* Unit Condition & Next Status Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Unit Inspection & Fleet Routing
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unitsInfo.map(u => {
                  const dec = unitDecisions[u.id] || { condition: 'good', nextStatus: 'available', notes: '' };
                  return (
                    <div key={u.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-400">{u.unitNumber}</span>
                          <span className="text-slate-400 font-mono text-xs">[{u.assetTag}]</span>
                        </div>
                        <span className="text-xs text-slate-400">Previous: {u.condition}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">Return Condition:</label>
                          <select
                            value={dec.condition}
                            onChange={e => setUnitDecisions({
                              ...unitDecisions,
                              [u.id]: { ...dec, condition: e.target.value as any }
                            })}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none"
                          >
                            <option value="excellent">Excellent (Like New)</option>
                            <option value="good">Good (Normal Wear)</option>
                            <option value="fair">Fair</option>
                            <option value="maintenance_needed">Needs Maintenance / Cleaning</option>
                            <option value="damaged">Damaged</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-0.5">Fleet Destination:</label>
                          <select
                            value={dec.nextStatus}
                            onChange={e => setUnitDecisions({
                              ...unitDecisions,
                              [u.id]: { ...dec, nextStatus: e.target.value as any }
                            })}
                            className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white outline-none"
                          >
                            <option value="available">Return to Available Stock</option>
                            <option value="maintenance">Send to Maintenance</option>
                            <option value="damaged">Mark Damaged</option>
                            <option value="lost">Mark Lost</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Charges / Fines Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Late Fines & Damage Charges
                </h4>
                <button
                  type="button"
                  onClick={handleAddChargeRow}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  Add Charge Item
                </button>
              </div>

              {charges.length === 0 ? (
                <p className="text-xs text-slate-500">No extra charges or late fines applicable.</p>
              ) : (
                <div className="space-y-1.5">
                  {charges.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={c.description}
                        onChange={e => {
                          const copy = [...charges];
                          copy[idx].description = e.target.value;
                          setCharges(copy);
                        }}
                        placeholder="Description of charge..."
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white outline-none"
                      />
                      <div className="flex items-center gap-1 w-32">
                        <span className="text-xs text-slate-500 font-mono">MVR</span>
                        <input
                          type="number"
                          value={c.amount}
                          onChange={e => {
                            const copy = [...charges];
                            copy[idx].amount = Number(e.target.value);
                            setCharges(copy);
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-mono outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveChargeRow(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Fee Waiver option */}
              {charges.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isWaived}
                      onChange={e => setIsWaived(e.target.checked)}
                      className="rounded text-orange-500"
                    />
                    <span className="font-semibold text-amber-400">Waive return fees & charges</span>
                  </label>
                  {isWaived && (
                    <input
                      type="text"
                      required
                      value={waiverReason}
                      onChange={e => setWaiverReason(e.target.value)}
                      placeholder="Mandatory justification for waiver (e.g. Approved by EXCO due to bad weather delay)..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none"
                    />
                  )}
                </div>
              )}

              {/* Total Settlement Amount */}
              <div className="flex justify-between items-center p-3 bg-slate-800/80 rounded-xl">
                <span className="text-xs font-bold text-slate-300 uppercase">
                  Additional Amount Due from Customer:
                </span>
                <span className="text-base font-black font-mono text-emerald-400">
                  MVR {totalChargesAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* General Inspection Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">General Notes</label>
              <textarea
                rows={2}
                value={inspectionNotes}
                onChange={e => setInspectionNotes(e.target.value)}
                placeholder="Notes regarding return condition or client feedback..."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setInspectingReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReturn}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? 'Finalizing...' : (totalChargesAmount > 0 ? 'Generate Bill & Complete Inspection' : 'Finalize Return & Re-stock')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
