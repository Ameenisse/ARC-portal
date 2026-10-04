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
  Building2,
  Info,
  Coins,
  ArrowDown,
  Calendar,
  Sparkles,
  Eye,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw
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
  contributions?: MemberContributionRecord[];
  existingRequests?: ContributionPaymentRequest[];
}

export const PayContributionModal: React.FC<PayContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  member,
  settings,
  depositAccount
}) => {
  const monthlyFee = Number(settings?.monthlyFee || 50);
  const discountMonths = Number(settings?.annualAdvanceDiscountMonths || 1);
  const annualFee = Math.max(0, (12 - discountMonths) * monthlyFee);

  // Form states
  const [amountPaid, setAmountPaid] = useState<number>(100);
  const [memberNote, setMemberNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // File upload state
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [showSlipInspector, setShowSlipInspector] = useState(false);
  const [inspectorZoom, setInspectorZoom] = useState<number>(1);
  const [inspectorRotation, setInspectorRotation] = useState<number>(0);
  const [inspectorContrast, setInspectorContrast] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Waterfall Preview State
  const [waterfallPreview, setWaterfallPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSlipFile(null);
      setSlipPreview('');
      setIsDraggingFile(false);
      setShowSlipInspector(false);
      setInspectorZoom(1);
      setInspectorRotation(0);
      setInspectorContrast(false);
      setMemberNote('');
      setConfirmed(false);
      setErrorMessage('');
      setAmountPaid(100);
    }
  }, [isOpen]);

  // Fetch waterfall breakdown whenever amountPaid or member changes
  useEffect(() => {
    if (!isOpen || !member?.id || amountPaid <= 0) {
      setWaterfallPreview(null);
      return;
    }

    let active = true;
    const fetchPreview = async () => {
      try {
        setLoadingPreview(true);
        const res = await api.getContributionWaterfallPreview(member.id, amountPaid);
        if (active) {
          setWaterfallPreview(res);
        }
      } catch (e) {
        console.error('Failed to preview waterfall payment allocation:', e);
      } finally {
        if (active) setLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, member?.id, amountPaid]);

  if (!isOpen) return null;

  const targetBankName = depositAccount?.bankName || 'Bank of Maldives (BML)';
  const targetAccountName = depositAccount?.accountName || 'Aanandha Recreation Club';
  const targetAccountNumber = depositAccount?.accountNumber || '7730000308018';

  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(targetAccountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const processSelectedFile = (file: File) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
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

      // 1. Upload slip file to server storage
      const uploadRes = await api.uploadFile({
        fileName: slipFile.name,
        fileType: slipFile.type,
        fileData: slipPreview,
        folder: 'contribution-slips'
      });

      setUploading(false);

      // 2. Submit payment request - member sends slip info, uploaded URL, amountPaid and exact uploaded slip data
      const requestRes = await api.submitContributionPaymentRequest({
        slipDownloadUrl: uploadRes.url,
        slipDataUrl: slipPreview,
        slipStoragePath: uploadRes.storagePath || uploadRes.url,
        slipFileName: slipFile.name,
        slipMimeType: slipFile.type,
        slipFileSize: slipFile.size,
        memberNote: memberNote.trim(),
        amountPaid: Number(amountPaid) || 0
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
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
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

          {/* Member Identity Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Member
              </span>
              <div className="text-sm font-bold text-white mt-0.5">
                {member?.fullName || member?.name || 'ARC Member'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Member Number
              </span>
              <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 mt-0.5 inline-block">
                {member?.memberNumber || 'ARC-M-001'}
              </div>
            </div>
          </div>

          {/* Contribution Information & Amount Entry */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Payment Amount & Auto-Settlement</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Monthly Fee: MVR {monthlyFee}
              </span>
            </div>

            <div>
              <label htmlFor="amount-paid-input" className="text-xs font-semibold text-slate-300 block mb-1">
                Amount Paid (MVR) *
              </label>
              <div className="relative">
                <input
                  id="amount-paid-input"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="e.g. 100"
                  className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold text-base rounded-xl px-3.5 py-2.5 pl-12 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400 font-mono">MVR</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Quick select:</span>
                {[50, 100, 150, 200, 550, 600].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountPaid(amt)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                      amountPaid === amt
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Waterfall Auto-Settlement Breakdown */}
            {loadingPreview ? (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Calculating auto-settlement across fines and unpaid months...</span>
              </div>
            ) : waterfallPreview ? (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Allocation Preview</span>
                  </span>
                  <span className="font-mono text-slate-300">
                    MVR {waterfallPreview.totalApplied} applied
                  </span>
                </div>

                {waterfallPreview.allocations && waterfallPreview.allocations.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {waterfallPreview.allocations.map((alloc: any, idx: number) => (
                      <div
                        key={alloc.contributionId || idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/70 border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {alloc.monthName} {alloc.year}
                          </span>
                          {alloc.finePaid > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Fine: +MVR {alloc.finePaid}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Base: MVR {alloc.baseFeePaid}
                          </span>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-400">
                          MVR {alloc.totalPaid}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    No pending dues found. The full amount will be credited to your balance.
                  </p>
                )}

                {/* Carry Forward Credit Balance */}
                {waterfallPreview.carryForwardCredit > 0 && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Remaining Carry-Forward Credit Balance:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      MVR {waterfallPreview.carryForwardCredit}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
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

          {/* Payment Slip Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-400" />
                Payment Slip *
              </span>
              <span className="text-[10px] text-slate-400">PNG, JPG, PDF (Max {settings?.maxSlipFileSizeMb || 5}MB)</span>
            </label>

            {!slipPreview ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition text-center group cursor-pointer ${
                  isDraggingFile
                    ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                    : 'border-slate-800 hover:border-emerald-500/50 bg-slate-950/60'
                }`}
                onClick={() => document.getElementById('slip-file-input')?.click()}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition mb-3 ${
                    isDraggingFile
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30'
                  }`}
                >
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-white">
                  {isDraggingFile ? 'Drop your payment slip here' : 'Click or drag & drop slip here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-dhivehi">ބޭންކް ޓްރާންސްފަރ ސްލިޕް އަޕްލޯޑް ކުރައްވާ</p>
                <p className="text-[10px] text-slate-500 mt-1">Accepts PNG, JPG, or PDF</p>
                <input
                  id="slip-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div
                  onClick={() => setShowSlipInspector(true)}
                  className="flex items-center gap-3 overflow-hidden cursor-pointer group flex-1"
                  title="Click to inspect slip preview"
                >
                  {slipPreview.startsWith('data:image/') ? (
                    <div className="relative shrink-0">
                      <img
                        src={slipPreview}
                        alt="Slip Preview"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-800 group-hover:border-emerald-500/50 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0 group-hover:border-emerald-500/50 transition">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">{slipFile?.name}</p>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold shrink-0">
                        Ready
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {slipFile ? (slipFile.size / 1024).toFixed(1) + ' KB' : ''} • Click to verify & zoom
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSlipInspector(true)}
                    className="p-2 text-slate-300 hover:text-emerald-400 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                    title="Inspect & Verify Slip Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSlipFile(null);
                      setSlipPreview('');
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                    title="Remove slip and choose another file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Slip Inspection Overlay Dialog */}
            {showSlipInspector && slipPreview && (
              <div
                className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                onClick={() => setShowSlipInspector(false)}
              >
                <div
                  className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Inspector Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{slipFile?.name || 'Slip Document'}</p>
                        <p className="text-[10px] text-slate-400">Verify transfer details before submitting</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {slipPreview.startsWith('data:image/') && (
                        <>
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setInspectorZoom(prev => Math.max(0.75, prev - 0.25))}
                              disabled={inspectorZoom <= 0.75}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-1.5 font-mono text-[11px] text-emerald-400 font-bold min-w-[36px] text-center select-none">
                              {Math.round(inspectorZoom * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setInspectorZoom(prev => Math.min(3, prev + 0.25))}
                              disabled={inspectorZoom >= 3}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setInspectorRotation(prev => (prev + 90) % 360)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                            title="Rotate 90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectorContrast(prev => !prev)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              inspectorContrast
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                            }`}
                            title="Toggle High Contrast for faint receipt text"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowSlipInspector(false)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Inspector View Canvas */}
                  <div className="p-4 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950 flex-1 flex items-center justify-center min-h-[300px] max-h-[550px] overflow-auto">
                    {slipPreview.startsWith('data:image/') ? (
                      <img
                        src={slipPreview}
                        alt="Inspect Slip"
                        className="max-h-[500px] max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl transition-transform duration-150"
                        style={{
                          transform: `scale(${inspectorZoom}) rotate(${inspectorRotation}deg)`,
                          filter: inspectorContrast
                            ? 'contrast(170%) brightness(105%) saturate(1.2)'
                            : 'none'
                        }}
                      />
                    ) : (
                      <iframe
                        src={slipPreview}
                        title="Inspect PDF Slip"
                        className="w-full h-[500px] rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
                      />
                    )}
                  </div>

                  {/* Inspector Footer Verification Card */}
                  <div className="p-3.5 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Target Account: <strong className="text-white font-mono">{targetAccountNumber}</strong> ({targetAccountName})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSlipInspector(false)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
                    >
                      Looks Good
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Member Note (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="member-note-input" className="text-xs font-semibold text-slate-300">
              Optional Note
            </label>
            <input
              id="member-note-input"
              type="text"
              value={memberNote}
              onChange={(e) => setMemberNote(e.target.value)}
              placeholder="e.g. Any transfer reference or remarks"
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
