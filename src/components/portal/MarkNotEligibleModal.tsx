import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface MarkNotEligibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantIdentifier?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  title?: string;
  subtitle?: string;
}

const PRESET_REASONS = [
  'ARC Club / EXCO / Committee Member or immediate family',
  'Invalid, unverified, or fake contact phone number',
  'Duplicate entry / Multiple submission violation',
  'Failed verification / Ineligible participant criteria',
  'Unreachable winner after contact attempts',
  'Other / Custom Reason'
];

export const MarkNotEligibleModal: React.FC<MarkNotEligibleModalProps> = ({
  isOpen,
  onClose,
  participantIdentifier,
  onConfirm,
  title = 'Confirm Mark as Not Eligible',
  subtitle = 'Please provide a valid reason for disqualifying/marking this participant as not eligible.'
}) => {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedPreset === 'Other / Custom Reason'
      ? customReason.trim()
      : (customReason.trim() ? `${selectedPreset} - ${customReason.trim()}` : selectedPreset);

    if (!finalReason) {
      alert('Please enter or select a valid reason.');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(finalReason);
      setCustomReason('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="mark_not_eligible_modal"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={subtitle}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-bold text-amber-400">Confirmation Required</p>
            {participantIdentifier && (
              <p>
                Target Entry: <strong className="font-mono text-white">{participantIdentifier}</strong>
              </p>
            )}
            <p className="text-slate-400">
              Marking this participant as Not Eligible will exclude them from the lucky draw draw pool and record the audit log with your stated reason.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Disqualification Reason *
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
          >
            {PRESET_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">
            Additional Details / Custom Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Type additional details or audit notes for this decision..."
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{submitting ? 'Updating...' : 'Confirm Mark Not Eligible'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
