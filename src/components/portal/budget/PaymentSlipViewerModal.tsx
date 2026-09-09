import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileText,
  ExternalLink,
  Calendar,
  CreditCard,
  User,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Building2,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Contrast,
  Download,
  Maximize2,
  Eye,
  Upload,
  Sparkles,
  Check,
  Coins
} from 'lucide-react';
import {
  ContributionPaymentRequest,
  MemberContributionSetting,
  MemberContributionRecord,
  BankAccount
} from '../../../types';
import { api } from '../../../services/api';
import { resolveSlipUrl, createDigitalSlipDataUrl } from '../../../utils/slipReceiptGenerator';
import { SlipLightboxModal } from './SlipLightboxModal';

interface PaymentSlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ContributionPaymentRequest | null;
  canApprove: boolean;
  onApprove?: (id: string, data: {
    referenceNumber: string;
    paymentType: 'monthly' | 'annual' | 'waterfall';
    month?: number;
    accountId: string;
    approvalNote?: string;
    amountPaid?: number;
    approvedAmount?: number;
  }) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onCancel?: (id: string) => Promise<void>;
  onSlipUpdated?: (updated: ContributionPaymentRequest) => void;
  isCurrentUserOwner?: boolean;
}

const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const PaymentSlipViewerModal: React.FC<PaymentSlipViewerModalProps> = ({
  isOpen,
  onClose,
  request,
  canApprove,
  onApprove,
  onReject,
  onCancel,
  onSlipUpdated,
  isCurrentUserOwner
}) => {
  const activeYear = request?.contributionYear || request?.year || new Date().getFullYear();

  const [currentRequest, setCurrentRequest] = useState<ContributionPaymentRequest | null>(request);
  const [slipImageError, setSlipImageError] = useState(false);
  const [fallbackSlipUrl, setFallbackSlipUrl] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  // Identification & Review state
  const [activeAction, setActiveAction] = useState<'none' | 'approve' | 'reject' | 'cancel'>('none');
  const [paymentReferenceNumber, setPaymentReferenceNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'waterfall' | 'monthly' | 'annual'>('waterfall');
  const [approvedAmount, setApprovedAmount] = useState<number>(request?.amountPaid || 100);
  const [waterfallPreview, setWaterfallPreview] = useState<any>(null);
  const [loadingWaterfall, setLoadingWaterfall] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Slip interactive inspection state
  const [slipZoom, setSlipZoom] = useState<number>(1);
  const [slipRotation, setSlipRotation] = useState<number>(0);
  const [slipContrast, setSlipContrast] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Loaded context data for review
  const [activeAccounts, setActiveAccounts] = useState<BankAccount[]>([]);
  const [settings, setSettings] = useState<MemberContributionSetting | null>(null);
  const [memberContributions, setMemberContributions] = useState<MemberContributionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep currentRequest in sync
  useEffect(() => {
    setCurrentRequest(request);
    setSlipImageError(false);
    setFallbackSlipUrl('');
    setUploadSuccessMsg('');
    if (request) {
      const initialAmt = request.amountPaid || (request.paymentType === 'annual' ? 550 : 100);
      setApprovedAmount(initialAmt);
      if (request.paymentType === 'annual') {
        setPaymentType('annual');
      } else {
        setPaymentType('waterfall');
      }
    }
  }, [request?.id, request?.slipDownloadUrl]);

  // Real-time preview of waterfall settlement whenever approvedAmount or member changes
  useEffect(() => {
    const memberId = currentRequest?.memberId || request?.memberId;
    if (!isOpen || !memberId || approvedAmount <= 0) {
      setWaterfallPreview(null);
      return;
    }

    let active = true;
    const fetchWaterfall = async () => {
      try {
        setLoadingWaterfall(true);
        const res = await api.getContributionWaterfallPreview(memberId, approvedAmount);
        if (active) setWaterfallPreview(res);
      } catch (err) {
        console.error('Failed to preview waterfall allocation in approval modal:', err);
      } finally {
        if (active) setLoadingWaterfall(false);
      }
    };

    const timer = setTimeout(fetchWaterfall, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, currentRequest?.memberId, request?.memberId, approvedAmount]);

  // Handle generating and saving a digital receipt voucher
  const handleGenerateDigitalVoucher = async () => {
    const target = currentRequest || request;
    if (!target) return;
    try {
      setIsUploadingSlip(true);
      setErrorMsg('');
      const dataUrl = createDigitalSlipDataUrl(target);
      const filename = `Digital_Receipt_${target.requestNumber || target.id}.svg`;

      const updated = await api.updateContributionPaymentRequestSlip(target.id, {
        slipDownloadUrl: dataUrl,
        slipStoragePath: dataUrl,
        slipFileName: filename,
        slipMimeType: 'image/svg+xml',
        slipFileSize: dataUrl.length,
        referenceNumber: target.referenceNumber || `BML-${Date.now().toString().slice(-8)}`
      });

      setCurrentRequest(updated);
      setSlipImageError(false);
      setUploadSuccessMsg('Official digital payment voucher generated & attached successfully!');
      if (onSlipUpdated) onSlipUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate digital receipt voucher.');
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Handle uploading and replacing slip
  const handleInlineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = currentRequest || request;
    if (!file || !target) return;

    try {
      setIsUploadingSlip(true);
      setErrorMsg('');
      setUploadSuccessMsg('');

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileData = await base64Promise;

      const uploadRes = await api.uploadFile({
        fileName: file.name,
        fileType: file.type,
        fileData,
        folder: 'contribution-slips'
      });

      const updated = await api.updateContributionPaymentRequestSlip(target.id, {
        slipDownloadUrl: uploadRes.url,
        slipDataUrl: fileData,
        slipStoragePath: uploadRes.storagePath || uploadRes.url,
        slipFileName: file.name,
        slipMimeType: file.type,
        slipFileSize: file.size
      });

      setCurrentRequest(updated);
      setSlipImageError(false);
      setUploadSuccessMsg('New transfer slip uploaded and attached successfully!');
      if (onSlipUpdated) onSlipUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload slip file.');
    } finally {
      setIsUploadingSlip(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    }
  };

  // Load active accounts, settings, and member contribution records when modal opens for reviewer
  useEffect(() => {
    if (isOpen && request) {
      setActiveAction('none');
      setErrorMsg('');
      setRejectionReason('');
      setApprovalNote('');
      setPaymentReferenceNumber(request.referenceNumber || '');
      setSlipZoom(1);
      setSlipRotation(0);
      setSlipContrast(false);
      setLightboxOpen(false);

      if (canApprove && request.status === 'pending') {
        const loadReviewerContext = async () => {
          try {
            setLoadingData(true);
            const [accountsRes, settingsRes, contribsRes] = await Promise.all([
              api.getBankAccounts(),
              api.getContributionSettings(),
              api.getMemberContributions({ memberId: request.memberId, year: activeYear })
            ]);

            const accountsList = Array.isArray(accountsRes) ? accountsRes : [];
            const activeOnly = accountsList.filter((a: any) => a.status === 'active');
            setActiveAccounts(activeOnly);
            setSettings(settingsRes);

            const contribsList = Array.isArray(contribsRes) ? contribsRes : [];
            setMemberContributions(contribsList);

            // Auto-select account if only 1 active account
            if (activeOnly.length === 1) {
              setSelectedAccountId(activeOnly[0].id);
            } else if (settingsRes?.defaultDepositAccountId && activeOnly.some((a: any) => a.id === settingsRes.defaultDepositAccountId)) {
              setSelectedAccountId(settingsRes.defaultDepositAccountId);
            } else if (activeOnly.length > 0) {
              setSelectedAccountId(activeOnly[0].id);
            }

            // Find first unpaid month for default selection
            const paidMonths = new Set(
              contribsList.filter((c: any) => c.status === 'paid').map((c: any) => c.month)
            );
            const firstUnpaid = Array.from({ length: 12 }, (_, i) => i + 1).find(m => !paidMonths.has(m));
            if (firstUnpaid) {
              setSelectedMonth(firstUnpaid);
            }
          } catch (err) {
            console.error('Failed to load review context:', err);
          } finally {
            setLoadingData(false);
          }
        };

        loadReviewerContext();
      }
    }
  }, [isOpen, request?.id, canApprove, activeYear]);

  if (!isOpen || !request) return null;

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isCancelled = request.status === 'cancelled';

  // Paid months set for the active year
  const paidMonthsSet = new Set(
    memberContributions.filter(c => c.status === 'paid').map(c => c.month)
  );

  // Financial calculations
  const monthlyFee = Number(settings?.monthlyFee || 50);
  const annualDiscountMonths = Number(settings?.annualAdvanceDiscountMonths || 1);
  const annualDiscountAmount = annualDiscountMonths * monthlyFee;
  const annualBaseAmount = monthlyFee * 12;
  const annualExpected = Math.max(0, annualBaseAmount - annualDiscountAmount);

  let fineAmount = 0;
  if (paymentType === 'monthly' && settings?.enableAutoFines && selectedMonth) {
    const dueDay = settings.dueDayOfMonth || 10;
    const grace = settings.gracePeriodDays || 5;
    const dueDate = new Date(activeYear, selectedMonth - 1, dueDay);
    dueDate.setDate(dueDate.getDate() + grace);
    const now = new Date();
    if (now > dueDate) {
      const diffDays = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
      fineAmount = Math.min(diffDays * (settings.finePerDay || 5), monthlyFee * 2);
    }
  }

  const expectedAmount = paymentType === 'waterfall'
    ? (Number(approvedAmount) || 0)
    : paymentType === 'monthly'
    ? (monthlyFee + fineAmount)
    : annualExpected;

  const selectedAccount = activeAccounts.find(a => a.id === selectedAccountId) || activeAccounts[0] || null;

  const handleApproveSubmit = async () => {
    if (!onApprove) return;
    const cleanRef = paymentReferenceNumber.trim();
    if (!cleanRef) {
      setErrorMsg('Bank Reference Number is mandatory for contribution approval.');
      return;
    }

    if (!selectedAccountId) {
      setErrorMsg('Please select the receiving bank account.');
      return;
    }

    if (paymentType === 'monthly') {
      if (!selectedMonth || selectedMonth < 1 || selectedMonth > 12) {
        setErrorMsg('Please select a valid month for the monthly contribution.');
        return;
      }
      if (paidMonthsSet.has(selectedMonth)) {
        setErrorMsg(`Month ${MONTH_FULL_NAMES[selectedMonth - 1]} is already paid. Please select an unpaid month.`);
        return;
      }
    } else if (paymentType === 'waterfall') {
      if (!approvedAmount || approvedAmount <= 0) {
        setErrorMsg('Please enter a valid approved payment amount.');
        return;
      }
    }

    try {
      setProcessing(true);
      setErrorMsg('');
      await onApprove(request.id, {
        referenceNumber: cleanRef,
        paymentType,
        month: paymentType === 'monthly' ? selectedMonth : undefined,
        accountId: selectedAccountId,
        approvalNote: approvalNote.trim(),
        amountPaid: Number(approvedAmount) || 0,
        approvedAmount: Number(approvedAmount) || 0
      });
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve contribution payment.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!onReject) return;
    if (!rejectionReason.trim()) {
      setErrorMsg('Please specify the reason for rejecting this payment.');
      return;
    }
    try {
      setProcessing(true);
      setErrorMsg('');
      await onReject(request.id, rejectionReason.trim());
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject payment request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!onCancel) return;
    try {
      setProcessing(true);
      setErrorMsg('');
      await onCancel(request.id);
      setActiveAction('none');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel payment request.');
    } finally {
      setProcessing(false);
    }
  };

  // Format months for display if approved or identified
  const displayMonths = (request.months || [])
    .map(m => MONTH_SHORT_NAMES[m - 1] || `M${m}`)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div
        id="payment-slip-viewer-card"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Payment Request: {request.requestNumber}
                </h2>
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Awaiting Review
                  </span>
                )}
                {isApproved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Approved & Credited
                  </span>
                )}
                {isRejected && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Rejected
                  </span>
                )}
                {isCancelled && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center gap-1">
                    <Ban className="w-3 h-3" /> Cancelled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Submitted on {new Date(request.submittedAt).toLocaleDateString()} at {new Date(request.submittedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member Details */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Member Information
              </div>
              <div className="text-sm font-bold text-white">{request.memberName}</div>
              <div className="text-xs text-slate-400">
                Member No: <span className="font-mono text-emerald-400 font-bold">{request.memberNumber}</span>
              </div>
            </div>

            {request.memberNote && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-sm">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Member Note:</span>
                <p className="italic">{request.memberNote}</p>
              </div>
            )}
          </div>

          {/* Bank Slip Image / Document Preview with Inspection Controls */}
          {(() => {
            const activeReq = currentRequest || request;
            const rawSlipUrl =
              activeReq.slipDataUrl ||
              activeReq.slipDownloadUrl ||
              (activeReq as any).paymentSlipUrl ||
              (activeReq as any).slipUrl ||
              (activeReq as any).receiptUrl ||
              '';
            const slipUrl = fallbackSlipUrl || resolveSlipUrl(rawSlipUrl) || createDigitalSlipDataUrl(activeReq);

            const isPdf = Boolean(
              slipUrl &&
                (slipUrl.includes('application/pdf') ||
                  activeReq.slipFileName?.toLowerCase().endsWith('.pdf') ||
                  activeReq.slipMimeType === 'application/pdf')
            );

            const handleDownloadSlip = () => {
              const urlToDownload = slipUrl || createDigitalSlipDataUrl(activeReq);
              const filename =
                activeReq.slipFileName ||
                `ARC_Slip_${activeReq.requestNumber || activeReq.id}_${activeReq.memberNumber || 'member'}.${isPdf ? 'pdf' : (urlToDownload.startsWith('data:image/svg') ? 'svg' : 'png')}`;
              try {
                if (urlToDownload.startsWith('data:') || urlToDownload.startsWith('blob:')) {
                  const a = document.createElement('a');
                  a.href = urlToDownload;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  return;
                }
                fetch(urlToDownload)
                  .then(res => res.blob())
                  .then(blob => {
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
                  })
                  .catch(() => {
                    const a = document.createElement('a');
                    a.href = urlToDownload;
                    a.download = filename;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  });
              } catch (err) {
                console.error('Download error:', err);
              }
            };

            return (
              <div className="space-y-2">
                <input
                  type="file"
                  ref={inlineFileInputRef}
                  onChange={handleInlineFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {uploadSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {uploadSuccessMsg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadSuccessMsg('')}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Uploaded Transfer Slip & Verification
                  </span>

                  {/* Inspection Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {slipUrl && !isPdf && !slipImageError && (
                      <>
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setSlipZoom(prev => Math.max(0.5, prev - 0.25))}
                            disabled={slipZoom <= 0.5}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                            title="Zoom Out (-)"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-1.5 font-mono text-[11px] text-emerald-400 font-bold min-w-[36px] text-center select-none">
                            {Math.round(slipZoom * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setSlipZoom(prev => Math.min(3, prev + 0.25))}
                            disabled={slipZoom >= 3}
                            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                            title="Zoom In (+)"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSlipRotation(prev => (prev + 90) % 360)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSlipContrast(prev => !prev)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            slipContrast
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                          }`}
                          title="Toggle High Contrast for faint receipt text"
                        >
                          <Contrast className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Quick upload / re-upload button */}
                    <button
                      type="button"
                      onClick={() => inlineFileInputRef.current?.click()}
                      disabled={isUploadingSlip}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer flex items-center gap-1 text-xs"
                      title="Upload or Replace Slip File"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline text-[11px] font-medium">Upload</span>
                    </button>

                    {/* Generate Digital Voucher button */}
                    <button
                      type="button"
                      onClick={handleGenerateDigitalVoucher}
                      disabled={isUploadingSlip}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer flex items-center gap-1 text-xs"
                      title="Generate Official Digital Receipt Voucher"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline text-[11px] font-medium">Voucher</span>
                    </button>

                    {(slipUrl || activeReq) && (
                      <button
                        type="button"
                        onClick={handleDownloadSlip}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 transition cursor-pointer"
                        title="Download Slip File or Voucher"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      id="expand-slip-inspector-btn"
                      onClick={() => setLightboxOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Inspect slip in full-screen interactive lightbox"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Full Inspector</span>
                    </button>
                  </div>
                </div>

                {/* Preview Box Container */}
                <div className="relative p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center min-h-[220px] max-h-[420px] overflow-hidden group">
                  {slipUrl && !slipImageError ? (
                    isPdf ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <FileText className="w-14 h-14 text-emerald-400 mb-2" />
                        <p className="text-xs font-bold text-white mb-1">{activeReq.slipFileName || 'Payment Slip PDF'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setLightboxOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Document</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadSlip}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setLightboxOpen(true)}
                        className="cursor-zoom-in relative overflow-auto max-h-[380px] w-full flex items-center justify-center"
                        title="Click to open Full Lightbox Inspector"
                      >
                        <img
                          src={slipUrl}
                          alt={`Payment Slip for ${activeReq.memberName}`}
                          onError={() => {
                            if (!fallbackSlipUrl) {
                              setFallbackSlipUrl(createDigitalSlipDataUrl(activeReq));
                            } else {
                              setSlipImageError(true);
                            }
                          }}
                          className="max-h-[360px] max-w-full object-contain rounded-xl border border-slate-800 transition-transform duration-200"
                          style={{
                            transform: `scale(${slipZoom}) rotate(${slipRotation}deg)`,
                            filter: slipContrast
                              ? 'contrast(200%) brightness(125%) invert(0.9) saturate(1.2)'
                              : 'none'
                          }}
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <Maximize2 className="w-3 h-3 text-emerald-400" />
                          <span>Click to Enlarge</span>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Digital Payment Voucher Fallback when file is missing or broken */
                    <div className="w-full max-w-lg p-5 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-mono font-bold tracking-wider uppercase">
                          Official Digital Contribution Voucher
                        </span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 grid grid-cols-2 gap-2 text-left text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Member</span>
                          <span className="font-bold text-white truncate block">{activeReq.memberName}</span>
                          <span className="text-[11px] text-emerald-400 font-mono">#{activeReq.memberNumber}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Claimed Amount</span>
                          <span className="font-mono font-black text-sm text-emerald-400">
                            {activeReq.totalAmount ? `${activeReq.totalAmount} MVR` : 'Verified'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target Period</span>
                          <span className="font-medium text-slate-200">
                            {activeReq.month ? `Month ${activeReq.month}, ` : ''}{activeReq.contributionYear || activeReq.year}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-800/60 text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Bank Ref</span>
                          <span className="font-mono text-xs font-bold text-amber-300">
                            {activeReq.referenceNumber || 'Awaiting Entry'}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {slipImageError
                          ? 'Physical slip storage link is unreachable or restricted. You can view or generate the verified digital receipt voucher, or re-upload the slip image.'
                          : 'No image file was attached. You can generate an official digital payment voucher or upload a slip file.'}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleGenerateDigitalVoucher}
                          disabled={isUploadingSlip}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Attach Digital Voucher</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => inlineFileInputRef.current?.click()}
                          disabled={isUploadingSlip}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-sky-400" />
                          <span>Upload Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Full Inspector</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Identification & Review Form (Awaiting Review & canApprove) */}
          {isPending && canApprove && activeAction === 'approve' && (
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PAYMENT IDENTIFICATION & VERIFICATION</span>
                </div>
                {loadingData && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Loading ledger...</span>
                  </div>
                )}
              </div>

              {/* Bank Reference Number * */}
              <div>
                <label htmlFor="approve-payment-reference-number-input" className="text-[11px] font-bold text-slate-200 flex items-center justify-between mb-1">
                  <span>Bank Reference Number * <span className="text-amber-400 font-normal">(Mandatory)</span></span>
                  <span className="text-[10px] text-emerald-400 font-normal">From Transfer Slip</span>
                </label>
                <input
                  type="text"
                  id="approve-payment-reference-number-input"
                  value={paymentReferenceNumber}
                  onChange={(e) => setPaymentReferenceNumber(e.target.value)}
                  placeholder="e.g. BML260908001245"
                  className="w-full bg-slate-900 border border-slate-700 font-mono text-emerald-400 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Payment Type Selection & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  paymentType === 'waterfall'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="waterfall"
                    checked={paymentType === 'waterfall'}
                    onChange={() => setPaymentType('waterfall')}
                    className="text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-bold block">Auto Waterfall</span>
                    <span className="text-[9px] text-emerald-400 font-normal">Fines & Due Months</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  paymentType === 'monthly'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="monthly"
                    checked={paymentType === 'monthly'}
                    onChange={() => setPaymentType('monthly')}
                    className="text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-bold block">Single Month</span>
                    <span className="text-[9px] text-slate-400 font-normal">Select Month</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  paymentType === 'annual'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="paymentType"
                    value="annual"
                    checked={paymentType === 'annual'}
                    onChange={() => setPaymentType('annual')}
                    className="text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-bold block">Annual Package</span>
                    <span className="text-[9px] text-emerald-400 font-normal">12 Mo Discount</span>
                  </div>
                </label>
              </div>

              {/* Waterfall Amount & Auto-Settlement Preview */}
              {paymentType === 'waterfall' && (
                <div className="space-y-3 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <label htmlFor="approve-approved-amount-input" className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>Approved Payment Amount (MVR) *</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Member Base: MVR {monthlyFee}/mo
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="approve-approved-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(Math.max(1, Number(e.target.value) || 0))}
                      placeholder="e.g. 100"
                      className="w-full bg-slate-950 border border-slate-700 font-mono text-emerald-400 font-bold text-sm rounded-xl px-3.5 py-2.5 pl-12 focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono">MVR</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Quick Select:</span>
                    {[50, 100, 150, 200, 550, 600].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setApprovedAmount(amt)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                          approvedAmount === amt
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>

                  {loadingWaterfall ? (
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Calculating waterfall allocation across unpaid months & fines...</span>
                    </div>
                  ) : waterfallPreview ? (
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Smart Allocation Preview:</span>
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          MVR {waterfallPreview.totalApplied} applied of MVR {waterfallPreview.amountPaid}
                        </span>
                      </div>

                      {waterfallPreview.allocations && waterfallPreview.allocations.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {waterfallPreview.allocations.map((alloc: any, idx: number) => (
                            <div
                              key={alloc.contributionId || idx}
                              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/80 border border-slate-800"
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
                              <span className="font-mono font-bold text-emerald-400">
                                MVR {alloc.totalPaid}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          No pending dues found. Full amount will carry forward to member credit balance.
                        </p>
                      )}

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
              )}

              {/* Monthly vs Annual Period Selector */}
              {paymentType === 'monthly' && (
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label htmlFor="approve-month-select" className="text-[11px] font-bold text-slate-200">
                      Month * <span className="text-slate-400 font-normal">(Paid months are disabled)</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {paidMonthsSet.size}/12 Paid in {activeYear}
                    </span>
                  </div>

                  <select
                    id="approve-month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isPaid = paidMonthsSet.has(m);
                      return (
                        <option key={m} value={m} disabled={isPaid}>
                          {MONTH_FULL_NAMES[m - 1]} {isPaid ? '(Paid ✓)' : '(Unpaid)'}
                        </option>
                      );
                    })}
                  </select>

                  {/* Visual Month Status Tracker */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isPaid = paidMonthsSet.has(m);
                      const isCurrentSelected = paymentType === 'monthly' && selectedMonth === m;
                      return (
                        <button
                          type="button"
                          key={m}
                          disabled={isPaid}
                          onClick={() => setSelectedMonth(m)}
                          className={`p-1.5 rounded-lg text-center text-[10px] font-bold border transition ${
                            isPaid
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 opacity-60 cursor-not-allowed'
                              : isCurrentSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white cursor-pointer'
                          }`}
                        >
                          <span>{MONTH_SHORT_NAMES[m - 1]}</span>
                          <span className="block text-[8px] font-normal opacity-80">
                            {isPaid ? 'Paid ✓' : isCurrentSelected ? 'Select' : 'Due'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {paymentType === 'annual' && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-300 block">Annual Contribution Period</span>
                  <p className="text-xs text-white font-semibold">
                    January – December {activeYear} (12 Months Package)
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Backend will automatically credit eligible unpaid months of {activeYear} with the official {annualDiscountMonths}-month advance discount. Months already marked as paid will not be overwritten.
                  </p>
                </div>
              )}

              {/* Receiving Account Selection */}
              <div>
                {activeAccounts.length === 1 ? (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Received In Account *
                    </span>
                    <p className="text-xs font-bold text-emerald-400 font-mono">
                      {activeAccounts[0].bankName} — {activeAccounts[0].accountName} ({activeAccounts[0].accountNumber})
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="approve-account-select" className="text-[11px] font-bold text-slate-200 block mb-1">
                      Received In Account *
                    </label>
                    <select
                      id="approve-account-select"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select receiving account...</option>
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.accountName} ({acc.accountNumber || 'No Acc#'}) [{acc.currency || 'MVR'}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* System Calculated Amount (Read-only) */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  PAYMENT CALCULATION (Official Policy)
                </span>
                {paymentType === 'waterfall' ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Total Payment Received / Approved:</span>
                      <span className="font-mono text-emerald-400 font-bold">MVR {approvedAmount}</span>
                    </div>
                    {waterfallPreview && (
                      <>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Applied to Unpaid Base Fees:</span>
                          <span className="font-mono text-white">MVR {waterfallPreview.totalBasePaid || 0}</span>
                        </div>
                        {waterfallPreview.totalFinesPaid > 0 && (
                          <div className="flex items-center justify-between text-rose-400">
                            <span>Applied to Late Fines (Priority):</span>
                            <span className="font-mono">MVR {waterfallPreview.totalFinesPaid}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Carry-Forward to Member Credit Balance:</span>
                          <span className="font-mono">+MVR {waterfallPreview.carryForwardCredit || 0}</span>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                      <span>TOTAL APPROVED:</span>
                      <span className="text-base text-emerald-400 font-mono">MVR {expectedAmount}</span>
                    </div>
                  </div>
                ) : paymentType === 'monthly' ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Base Contribution ({MONTH_FULL_NAMES[selectedMonth - 1]}):</span>
                      <span className="font-mono">MVR {monthlyFee}</span>
                    </div>
                    {fineAmount > 0 && (
                      <div className="flex items-center justify-between text-rose-400">
                        <span>Late Fine:</span>
                        <span className="font-mono">+MVR {fineAmount}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                      <span>TOTAL EXPECTED:</span>
                      <span className="text-base text-emerald-400 font-mono">MVR {expectedAmount}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Annual Base (12 months):</span>
                      <span className="font-mono">MVR {annualBaseAmount}</span>
                    </div>
                    {annualDiscountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span>Annual Advance Discount ({annualDiscountMonths} mo):</span>
                        <span className="font-mono">-MVR {annualDiscountAmount}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
                      <span>TOTAL EXPECTED:</span>
                      <span className="text-base text-emerald-400 font-mono">MVR {expectedAmount}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Approval Note (Optional) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Approval Notes (Optional):
                </label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Verified against bank statement"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Approval Summary Verification Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approval Summary Verification</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Member</span>
                    <span className="font-bold text-white">{request.memberName} ({request.memberNumber})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Bank Reference</span>
                    <span className="font-mono font-bold text-emerald-400">{paymentReferenceNumber.trim() || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Payment Type</span>
                    <span className="font-bold text-white">
                      {paymentType === 'monthly' ? 'Monthly Contribution' : 'Annual Contribution'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Period</span>
                    <span className="font-bold text-amber-300">
                      {paymentType === 'monthly'
                        ? `${MONTH_FULL_NAMES[selectedMonth - 1]} ${activeYear}`
                        : `${activeYear} (Jan – Dec)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Expected Amount</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">MVR {expectedAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Receiving Account</span>
                    <span className="font-bold text-slate-200 truncate block">
                      {selectedAccount ? `${selectedAccount.bankName} - ${selectedAccount.accountName}` : 'None selected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-approve-payment-btn"
                  onClick={handleApproveSubmit}
                  disabled={processing || !paymentReferenceNumber.trim() || !selectedAccountId}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg transition cursor-pointer"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Approve & Credit Ledger</span>
                </button>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {activeAction === 'reject' && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>Reject Payment Submission</span>
              </div>
              <p className="text-xs text-slate-300">
                The member will be notified with this rejection reason. Financial ledgers and contribution statuses will not be modified.
              </p>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Rejection Reason *
                </label>

                {/* Quick reason pills */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Unable to verify bank transaction',
                    'Duplicate slip',
                    'Wrong account',
                    'Slip unreadable',
                    'Payment not found'
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectionReason(r)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                        rejectionReason === r
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Unable to verify bank transaction, duplicate slip, etc."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-reject-payment-btn"
                  onClick={handleRejectSubmit}
                  disabled={processing || !rejectionReason.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow transition cursor-pointer"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {/* Cancellation Form */}
          {activeAction === 'cancel' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Ban className="w-4 h-4 text-amber-400" />
                <span>Cancel Payment Request</span>
              </div>
              <p className="text-xs text-slate-400">
                Are you sure you want to cancel this pending payment request? You can submit a new slip anytime.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  disabled={processing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  id="confirm-cancel-request-btn"
                  onClick={handleCancelSubmit}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white transition cursor-pointer"
                >
                  {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>Yes, Cancel Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Historical Review Details (if already approved or rejected) */}
          {(isApproved || isRejected) && (
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isApproved
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>
                  {isApproved ? 'Approved by' : 'Rejected by'} {request.reviewedByName || 'Treasurer/Admin'}
                </span>
                {request.reviewedAt && (
                  <span className="text-[11px] opacity-75 font-normal">
                    • {new Date(request.reviewedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {isApproved && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Reference Number:</span>
                    <span className="font-mono text-emerald-400 font-bold">{request.referenceNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Verified Amount:</span>
                    <span className="font-mono font-bold text-white">MVR {request.totalAmount ?? request.calculatedAmount ?? '0'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Payment Type & Period:</span>
                    <span className="text-slate-200">
                      {request.paymentType === 'annual' ? 'Annual Package' : 'Monthly'} ({displayMonths || `${activeYear}`})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Credited Account:</span>
                    <span className="text-slate-200">{request.bankName} - {request.accountName}</span>
                  </div>
                  {request.incomeRecordId && (
                    <div className="sm:col-span-2 text-[11px] text-slate-400">
                      Linked Income Record: <span className="font-mono text-emerald-400">{request.incomeRecordId}</span>
                    </div>
                  )}
                </div>
              )}

              {request.approvalNote && (
                <p className="text-xs text-slate-300 mt-1">
                  Note: {request.approvalNote}
                </p>
              )}
              {request.rejectionReason && (
                <p className="text-xs text-rose-200 mt-1 font-semibold">
                  Reason for Rejection: {request.rejectionReason}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {isPending && isCurrentUserOwner && activeAction === 'none' && (
              <button
                type="button"
                id="cancel-payment-request-btn"
                onClick={() => setActiveAction('cancel')}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel Request</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPending && canApprove && activeAction === 'none' && (
              <>
                <button
                  type="button"
                  id="reject-payment-request-btn"
                  onClick={() => setActiveAction('reject')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/15 hover:bg-rose-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  type="button"
                  id="approve-payment-request-btn"
                  onClick={() => setActiveAction('approve')}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Review & Approve Payment</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Fullscreen Slip Lightbox Modal */}
      {lightboxOpen && (
        <SlipLightboxModal
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          request={currentRequest || request}
          canApprove={canApprove}
          onSlipUpdated={(up) => {
            setCurrentRequest(up);
            if (onSlipUpdated) onSlipUpdated(up);
          }}
          onProceedToReview={() => {
            setLightboxOpen(false);
            setActiveAction('approve');
          }}
        />
      )}
    </div>
  );
};
