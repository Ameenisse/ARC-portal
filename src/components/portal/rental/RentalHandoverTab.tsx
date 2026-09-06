import React, { useState, useEffect } from 'react';
import {
  Package,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  CreditCard,
  PenTool,
  Check,
  X,
  AlertCircle,
  FileCheck2,
  Camera
} from 'lucide-react';
import { RentalRequest, RentalUnit } from '../../../types';
import { SignaturePad } from '../../rental/SignaturePad';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalHandoverTabProps {
  canApprove?: boolean;
  canEdit?: boolean;
  lang?: string;
}

export const RentalHandoverTab: React.FC<RentalHandoverTabProps> = ({
  canApprove = true,
  canEdit = true,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [readyRequests, setReadyRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Handover Flow
  const [activeReq, setActiveReq] = useState<RentalRequest | null>(null);
  const [checklist, setChecklist] = useState({
    canopyFabricClean: true,
    allPolesIncluded: true,
    pegsAndRopesComplete: true,
    storageBagProvided: true,
    customerVerifiedId: true
  });
  const [existingNotes, setExistingNotes] = useState('');
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchReady = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/portal/rental/requests');
      if (res.ok) {
        const data: RentalRequest[] = await res.json();
        setReadyRequests(data.filter(r => r.status === 'ready_for_collection'));
      }
    } catch (err) {
      console.error('Failed to load ready requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReady();
  }, []);

  const handleStartHandover = (req: RentalRequest) => {
    setActiveReq(req);
    setChecklist({
      canopyFabricClean: true,
      allPolesIncluded: true,
      pegsAndRopesComplete: true,
      storageBagProvided: true,
      customerVerifiedId: true
    });
    setExistingNotes('');
    setCustomerSignature(null);
  };

  const handleConfirmHandover = async () => {
    if (!activeReq) return;
    if (!customerSignature) {
      showToast('error', 'ކަސްޓަމަރުގެ ޑިޖިޓަލް ސޮއި ބޭނުންވެއެވެ (Customer signature required).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/portal/rental/requests/${activeReq.id}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist,
          existingDefectsNotes: existingNotes,
          customerSignatureUrl: customerSignature
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete handover');
      }

      showToast('success', 'ތަކެތި ކަސްޓަމަރާ ޙަވާލުކުރެވިއްޖެ! (Handover completed successfully)');
      setActiveReq(null);
      fetchReady();
    } catch (err: any) {
      showToast('error', err.message || 'Handover error');
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
          <FileCheck2 className="w-5 h-5 text-emerald-500" />
          {isEn ? 'Equipment Handover Station' : 'ތަކެތި ޙަވާލުކުރާ ސްޓޭޝަން'}
        </h3>
        <p className="text-xs text-slate-400">
          {isEn
            ? 'Process equipment pickups for bookings with verified payments. Perform condition check and obtain customer digital signature.'
            : 'ފައިސާ ދައްކާ ކަށަވަރުވެފައިވާ ބުކިންގްތަކަށް ތަކެތި ޙަވާލުކުރުން، ޗެކްލިސްޓް ފުރިހަމަކުރުން އަދި ކަސްޓަމަރުގެ ސޮއި ހޯދުން.'}
        </p>
      </div>

      {/* Ready Bookings List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading handover bookings...</div>
      ) : readyRequests.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-300">
            {isEn ? 'No bookings currently awaiting handover.' : 'މިވަގުތު ޙަވާލުކުރަންޖެހޭ އެއްވެސް ބުކިންގއެއް ނެތް.'}
          </p>
          <p className="text-slate-500">
            {isEn
              ? 'When rental requests are approved and customer payments are verified, they will appear here.'
              : 'ފައިސާ ވެރިފައިވުމުން މިތަނުން ފެންނާނެއެވެ.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {readyRequests.map((req) => (
            <div
              key={req.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-emerald-500/40 transition"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-orange-400">
                    #{req.requestNumber}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{req.itemName}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Ready for Pickup
                </span>
              </div>

              {/* Customer and unit details */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Customer:</span>
                  <div className="font-semibold text-white">{req.customerName}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{req.customerPhone}</div>
                  {req.customerIdCard && (
                    <div className="text-slate-400 font-mono text-[11px]">ID: {req.customerIdCard}</div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 block">Quantity & Units:</span>
                  <div className="font-bold text-white font-mono">{req.requestedQuantity} Unit(s)</div>
                  <div className="text-[11px] text-slate-400">
                    Assigned: {req.assignedUnitIds?.length || req.requestedQuantity} unit(s)
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono font-bold">
                    PAID: MVR {req.estimatedRentalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Return Due: {new Date(req.approvedEndAt || req.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  onClick={() => handleStartHandover(req)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Process Handover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Handover Process Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-500" />
                Equipment Handover & Verification: #{activeReq.requestNumber}
              </h3>
              <button
                onClick={() => setActiveReq(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Item Banner */}
            <div className="p-3.5 bg-slate-800/60 rounded-xl space-y-1 text-xs border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">{activeReq.customerName} ({activeReq.customerPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Equipment:</span>
                <span className="text-white font-semibold">{activeReq.itemName} ({activeReq.requestedQuantity} Units)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">National ID Card:</span>
                <span className="font-mono text-orange-400">{activeReq.customerIdCard || 'Verified on site'}</span>
              </div>
            </div>

            {/* Physical Verification Checklist */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Pre-Handover Verification Checklist
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.customerVerifiedId}
                    onChange={e => setChecklist({ ...checklist, customerVerifiedId: e.target.checked })}
                    className="rounded text-orange-500"
                  />
                  <span>Physical ID Card Verified</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.canopyFabricClean}
                    onChange={e => setChecklist({ ...checklist, canopyFabricClean: e.target.checked })}
                    className="rounded text-orange-500"
                  />
                  <span>Canopy / Fabric Clean & Intact</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.allPolesIncluded}
                    onChange={e => setChecklist({ ...checklist, allPolesIncluded: e.target.checked })}
                    className="rounded text-orange-500"
                  />
                  <span>All Structural Poles Included</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.pegsAndRopesComplete}
                    onChange={e => setChecklist({ ...checklist, pegsAndRopesComplete: e.target.checked })}
                    className="rounded text-orange-500"
                  />
                  <span>Pegs, Guy-Ropes & Accessories</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={checklist.storageBagProvided}
                    onChange={e => setChecklist({ ...checklist, storageBagProvided: e.target.checked })}
                    className="rounded text-orange-500"
                  />
                  <span>Original Carry / Storage Bag Provided</span>
                </label>
              </div>
            </div>

            {/* Notes on existing wear/scratches */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Existing Scratches or Condition Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={existingNotes}
                onChange={e => setExistingNotes(e.target.value)}
                placeholder="e.g. Minor scuff on pole joint 2; noted prior to release."
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
              />
            </div>

            {/* Signature Pad */}
            <div className="pt-2 border-t border-slate-800">
              {customerSignature ? (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Customer Digital Signature captured</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomerSignature(null)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Re-sign
                  </button>
                </div>
              ) : (
                <SignaturePad
                  onSave={(dataUrl) => setCustomerSignature(dataUrl)}
                  title="Customer Handover Signature"
                  subtitle="The customer must sign below confirming receipt of equipment in good working order."
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !customerSignature}
                onClick={handleConfirmHandover}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? 'Processing Handover...' : 'Finalize Handover & Release Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
