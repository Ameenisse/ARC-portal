import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, ShieldAlert, Calendar, Package } from 'lucide-react';
import { RentalRequest } from '../../types';

interface CancelBookingModalProps {
  request: RentalRequest;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  loading?: boolean;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  request,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConfirm(reason.trim() || 'ކަސްޓަމަރު ބުކިންގ ކެންސަލްކޮށްފި');
    } catch (err: any) {
      setError(err.message || 'ބުކިންގ ކެންސަލްކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.');
    }
  };

  const startDate = new Date(request.approvedStartAt || request.requestedStartAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const endDate = new Date(request.approvedEndAt || request.requestedEndAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50/80 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ބުކިންގ ކެންސަލްކުރުން ކަށަވަރުކުރުން
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">
                #{request.requestNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking Summary Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white font-dhivehi">
                  {request.itemName}
                </span>
              </div>
              <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                {request.requestedQuantity} ޔުނިޓް
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{startDate} އިން {endDate} އަށް</span>
              </div>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                ރ. {request.estimatedRentalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">މި ބުކިންގ ކެންސަލްކުރަން ބޭނުންފުޅުކަން ޔަޤީންތޯ؟</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                ކެންސަލްކުރުމުން ތިޔަބޭފުޅާއަށް ރިޒަވްކުރެވުނު ސާމާނު ދޫކޮށްލެވޭނެއެވެ. އަދި ބިލް ބާޠިލްކުރެވޭނެއެވެ.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ކެންސަލްކުރާ ސަބަބު (އިޚްތިޔާރީ):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="މިސާލަކަށް: ޕްލޭން ބަދަލުވުމުގެ ސަބަބުން / ތާރީޚު ކަމުނުދާތީ"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-900 dark:text-white text-right"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
            >
              ނޫން، ބަހައްޓާ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>ކެންސަލްކުރަނީ...</span>
                </>
              ) : (
                <span>އާނ، ބުކިންގ ކެންސަލްކުރޭ</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
