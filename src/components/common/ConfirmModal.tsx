import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'ޑިލީޓް ކަށަވަރުކުރުން (Confirm Delete)',
  message,
  confirmText = 'ކަށަވަރުކޮށް ފޮހެލާ (Delete)',
  cancelText = 'ކެންސަލް (Cancel)',
  isDanger = true
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-2xl z-10 space-y-4 animate-scale-in" dir="rtl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDanger ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-heading">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">މި ޢަމަލަކީ އަނބުރާ ނެގޭނެ ޢަމަލެއް ނޫނެވެ.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed">
          {message}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 ${isDanger ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20'} text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
