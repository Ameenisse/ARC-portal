import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Copy,
  Check,
  CreditCard,
  AlertCircle,
  FileText,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Building2
} from 'lucide-react';
import { api } from '../../../services/api';
import { MemberContributionSetting, MemberContributionRecord, ContributionPaymentRequest } from '../../../types';

interface PayContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRequest: ContributionPaymentRequest) => void;
  member: any;
  settings: MemberContributionSetting | null;
  depositAccount: any;
  contributions: MemberContributionRecord[];
  existingRequests: ContributionPaymentRequest[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PayContributionModal: React.FC<PayContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  member,
  settings,
  depositAccount,
  contributions = [],
  existingRequests = []
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthlyFee = Number(settings?.monthlyFee || 50);

  // Form states
  const [memberNote, setMemberNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // File upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Compute pending contribution record IDs so we don't display already pending ones
  const pendingRecordIds = new Set(
    (existingRequests || [])
      .filter(r => r.status === 'pending')
      .flatMap(r => r.contributionRecordIds || [])
  );

  // Sort unpaid/overdue contributions chronologically (oldest first)
  const unpaidContributions = (contributions || [])
    .filter(c => c.status !== 'paid' && !pendingRecordIds.has(c.id))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  // Selected contribution record ID: defaults automatically to the oldest unpaid record
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (unpaidContributions.length > 0) {
        setSelectedRecordId(unpaidContributions[0].id);
      } else {
        setSelectedRecordId('');
      }
      setSlipFile(null);
      setSlipPreview('');
      setMemberNote('');
      setConfirmed(false);
      setErrorMessage('');
    }
  }, [isOpen, unpaidContributions.length]);

  if (!isOpen) return null;

  const selectedRecord =
    unpaidContributions.find(c => c.id === selectedRecordId) ||
    unpaidContributions[0] ||
    null;

  const applicablePeriod = selectedRecord
    ? `${MONTH_NAMES[selectedRecord.month - 1]} ${selectedRecord.year}`
    : `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;

  const applicableStatus = selectedRecord
    ? (selectedRecord.status === 'overdue' ? 'Overdue (ފާއިތުވެފައި)' : 'Unpaid (ދައްކަންޖެހޭ)')
    : 'Current Period (ދައްކަންޖެހޭ)';

  const calculatedAmount = selectedRecord
    ? Number(selectedRecord.totalPayable ?? selectedRecord.baseAmount ?? monthlyFee)
    : monthlyFee;

  const targetBankName = depositAccount?.bankName || 'Bank of Maldives (BML)';
  const targetAccountName = depositAccount?.accountName || 'Aanandha Recreation Club';
  const targetAccountNumber = depositAccount?.accountNumber || '7730000308018';

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(targetAccountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    const maxSize = (settings?.maxSlipFileSizeMb || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMessage(`File size exceeds maximum allowed size of ${settings?.maxSlipFileSizeMb || 5}MB.`);
      return;
    }

    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!slipFile || !slipPreview) {
      setErrorMessage('Please upload your bank transfer slip or transaction receipt.');
      return;
    }

    if (!confirmed) {
      setErrorMessage('Please confirm that you have transferred your contribution to the official ARC account.');
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true);

      // 1. Upload slip file
      const uploadRes = await api.uploadFile({
        fileName: slipFile.name,
        fileType: slipFile.type,
        fileData: slipPreview,
        folder: 'contribution-slips'
      });

      setUploading(false);

      // 2. Submit payment request - server controls calculation based on targetContributionId
      const requestRes = await api.submitContributionPaymentRequest({
        targetContributionId: selectedRecord?.id,
        year: selectedRecord?.year || currentYear,
        paymentType: 'single_month',
        months: selectedRecord ? [selectedRecord.month] : [currentMonth],
        slipDownloadUrl: uploadRes.url,
        slipFileName: slipFile.name,
        slipMimeType: slipFile.type,
        slipFileSize: slipFile.size,
        memberNote: memberNote.trim()
      });

      onSuccess(requestRes);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit contribution payment. Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="pay-contribution-modal-card"
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                My Fund Contribution
              </h2>
              <p className="text-xs text-slate-400 font-dhivehi">
                މަހުފީ ދެއްކުމަށް ފަހު ޓްރާންސްފަރ ސްލިޕް ފޮނުއްވާ
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-pay-contribution-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Member & Contribution Summary Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Member
                </span>
                <div className="text-sm font-bold text-white truncate">
                  {member?.fullName || member?.name || 'ARC Member'}
                </div>
                <div className="text-xs font-mono text-emerald-400 mt-0.5">
                  {member?.memberNumber || 'ARC-M-001'}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Contribution Period
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{applicablePeriod}</span>
                </div>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedRecord?.status === 'overdue'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {applicableStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculated Amount Due (Read-only) */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Amount Due</span>
                <p className="text-[11px] text-slate-500">Calculated automatically by ARC policy</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  MVR {calculatedAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Official ARC Bank Account Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>PAY TO: ARC Official Account</span>
              </span>
              <span className="text-[11px] text-slate-400">{targetBankName}</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                {targetAccountName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Bank of Maldives (BML)
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-base font-bold text-emerald-400 tracking-wider bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 select-all">
                {targetAccountNumber}
              </span>
              <button
                type="button"
                id="copy-bank-account-btn"
                onClick={handleCopyAccountNumber}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white" />
                    <span>Copy Account Number</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Optional Outstanding Contributions List */}
          {unpaidContributions.length > 1 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Outstanding Contributions</span>
                <span className="text-[11px] text-slate-400 font-normal">Click to select month</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {unpaidContributions.map((rec) => {
                  const isSelected = selectedRecord?.id === rec.id;
                  const amt = Number(rec.totalPayable ?? rec.baseAmount ?? monthlyFee);
                  return (
                    <div
                      key={rec.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {MONTH_NAMES[rec.month - 1]} {rec.year}
                        </span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          rec.status === 'overdue' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {rec.status === 'overdue' ? 'Overdue' : 'Due'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold font-mono">MVR {amt.toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecordId(rec.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'PAY'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Slip Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-400" />
                Payment Slip *
              </span>
              <span className="text-[10px] text-slate-400">PNG, JPG, PDF (Max 5MB)</span>
            </label>

            {!slipPreview ? (
              <label
                htmlFor="slip-file-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-950/60 cursor-pointer transition text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white">Click or drag & drop slip here</p>
                <p className="text-[11px] text-slate-400 mt-1 font-dhivehi">ބޭންކް ޓްރާންސްފަރ ސްލިޕް އަޕްލޯޑް ކުރައްވާ</p>
                <input
                  id="slip-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  {slipPreview.startsWith('data:image/') ? (
                    <img
                      src={slipPreview}
                      alt="Slip Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-800"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{slipFile?.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {slipFile ? (slipFile.size / 1024).toFixed(1) + ' KB' : ''} • Ready for upload
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSlipFile(null);
                    setSlipPreview('');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition cursor-pointer"
                  title="Remove slip"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Member Note (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="member-note-input" className="text-xs font-semibold text-slate-300">
              Note for Finance Team (Optional)
            </label>
            <input
              id="member-note-input"
              type="text"
              value={memberNote}
              onChange={(e) => setMemberNote(e.target.value)}
              placeholder="e.g. Remarks or additional details"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
            <input
              id="confirm-transfer-checkbox"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-500 border-slate-700 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
            />
            <label htmlFor="confirm-transfer-checkbox" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
              I hereby confirm that I have transferred my contribution to the official ARC bank account and that the uploaded slip represents a valid transaction.
            </label>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-contribution-payment-btn"
              disabled={submitting || !slipPreview || !confirmed}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{uploading ? 'Uploading Slip...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Submit for Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
