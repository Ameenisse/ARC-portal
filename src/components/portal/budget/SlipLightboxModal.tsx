import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Contrast,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRight,
  Upload,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Maximize,
  Sparkles,
  SunMedium
} from 'lucide-react';
import { ContributionPaymentRequest } from '../../../types';
import { resolveSlipUrl, createDigitalSlipDataUrl } from '../../../utils/slipReceiptGenerator';
import { api } from '../../../services/api';

interface SlipLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ContributionPaymentRequest | null;
  canApprove?: boolean;
  onProceedToReview?: (request: ContributionPaymentRequest) => void;
  onSlipUpdated?: (updated: ContributionPaymentRequest) => void;
  lang?: 'english' | 'dhivehi';
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const SlipLightboxModal: React.FC<SlipLightboxModalProps> = ({
  isOpen,
  onClose,
  request,
  canApprove = false,
  onProceedToReview,
  onSlipUpdated
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentRequest, setCurrentRequest] = useState<ContributionPaymentRequest | null>(request);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<'normal' | 'clarity' | 'invert' | 'bw'>('normal');
  const [imageError, setImageError] = useState<boolean>(false);
  const [fallbackSlipUrl, setFallbackSlipUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMsg, setUploadMsg] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Panning state for dragging when zoomed
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync request prop
  useEffect(() => {
    setCurrentRequest(request);
    setImageError(false);
    setFallbackSlipUrl('');
    setUploadMsg('');
  }, [request?.id, request?.slipDownloadUrl, request?.slipDataUrl]);

  // Reset viewport state on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setFilterMode('normal');
      setImageError(false);
      setFallbackSlipUrl('');
      setPanPosition({ x: 0, y: 0 });
      setUploadMsg('');
      setCopiedRef(false);
    }
  }, [isOpen, request?.id]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(4, Number((prev + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setZoom(prev => {
          const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
          if (next <= 1) setPanPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key.toLowerCase() === 'r') {
        setRotation(prev => (prev + 90) % 360);
      } else if (e.key.toLowerCase() === 'c') {
        // Cycle filter mode
        setFilterMode(prev => {
          if (prev === 'normal') return 'clarity';
          if (prev === 'clarity') return 'invert';
          if (prev === 'invert') return 'bw';
          return 'normal';
        });
      } else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setFilterMode('normal');
        setPanPosition({ x: 0, y: 0 });
      } else if (e.key.toLowerCase() === 'd') {
        handleDownload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentRequest) return null;

  // Prioritize member's original uploaded slip data URL first, then uploaded URL, or generated voucher
  const rawSlipUrl =
    currentRequest.slipDataUrl ||
    currentRequest.slipDownloadUrl ||
    (currentRequest as any).paymentSlipUrl ||
    (currentRequest as any).slipUrl ||
    '';

  const slipUrl =
    fallbackSlipUrl ||
    resolveSlipUrl(rawSlipUrl) ||
    createDigitalSlipDataUrl(currentRequest);

  const isPdf = Boolean(
    slipUrl &&
      (slipUrl.includes('application/pdf') ||
        currentRequest.slipFileName?.toLowerCase().endsWith('.pdf') ||
        currentRequest.slipMimeType === 'application/pdf')
  );

  const handleZoomIn = () => setZoom(prev => Math.min(4, Number((prev + 0.25).toFixed(2))));
  const handleZoomOut = () =>
    setZoom(prev => {
      const next = Math.max(0.5, Number((prev - 0.25).toFixed(2)));
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });

  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setFilterMode('normal');
    setPanPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleCycleFilter = () => {
    setFilterMode(prev => {
      if (prev === 'normal') return 'clarity';
      if (prev === 'clarity') return 'invert';
      if (prev === 'invert') return 'bw';
      return 'normal';
    });
  };

  const handleToggleDoubleClickZoom = () => {
    if (zoom > 1.2) {
      setZoom(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setZoom(2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom(prev => {
      const next = Math.max(0.5, Math.min(4, Number((prev + delta).toFixed(2))));
      if (next <= 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleCopyReference = (refText: string) => {
    if (!refText) return;
    navigator.clipboard?.writeText(refText);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownload = () => {
    const urlToDownload = slipUrl || createDigitalSlipDataUrl(currentRequest);
    if (!urlToDownload) return;
    const isSvg = urlToDownload.startsWith('data:image/svg');
    const filename =
      currentRequest.slipFileName ||
      `payment-slip-${currentRequest.requestNumber || currentRequest.id}.${isPdf ? 'pdf' : (isSvg ? 'svg' : 'png')}`;

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
  };

  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panPosition.x, y: e.clientY - panPosition.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Replacement slip upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRequest) return;

    try {
      setIsUploading(true);
      setUploadMsg('Uploading replacement slip...');

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const uploadRes = await api.uploadFile({
            fileName: file.name,
            fileType: file.type,
            fileData,
            folder: 'contribution-slips'
          });

          const updated = await api.updateContributionPaymentRequestSlip(currentRequest.id, {
            slipDownloadUrl: uploadRes.url,
            slipDataUrl: fileData,
            slipStoragePath: uploadRes.storagePath || uploadRes.url,
            slipFileName: file.name,
            slipMimeType: file.type,
            slipFileSize: file.size
          });

          setCurrentRequest(updated);
          setImageError(false);
          setFallbackSlipUrl('');
          setUploadMsg('Slip updated successfully!');
          if (onSlipUpdated) onSlipUpdated(updated);
        } catch (err: any) {
          setUploadMsg(err.message || 'Failed to update slip.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadMsg(err.message || 'Failed to upload.');
      setIsUploading(false);
    }
  };

  const getCssFilter = () => {
    switch (filterMode) {
      case 'clarity':
        return 'contrast(160%) brightness(106%) saturate(1.15)';
      case 'invert':
        return 'contrast(165%) brightness(115%) invert(1)';
      case 'bw':
        return 'grayscale(100%) contrast(150%) brightness(105%)';
      default:
        return 'none';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden file input for replacement slip if needed */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* TOP BAR: Clean Minimal Header & Zoom Controls */}
      <div className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 z-10">
        {/* Left: Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                {currentRequest.memberName}
              </h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 shrink-0">
                {currentRequest.memberNumber}
              </span>
              {currentRequest.status === 'pending' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
              {currentRequest.status === 'approved' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              )}
              {currentRequest.status === 'rejected' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <XCircle className="w-3 h-3" /> Rejected
                </span>
              )}
              {currentRequest.status === 'cancelled' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
                  <Ban className="w-3 h-3" /> Cancelled
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {currentRequest.slipFileName || 'Bank Transfer Payment Slip'}
              {currentRequest.slipFileSize ? ` • ${formatBytes(currentRequest.slipFileSize)}` : ''}
              {currentRequest.referenceNumber ? ` • Ref: ${currentRequest.referenceNumber}` : ''}
            </p>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom & Rotation Controls for images */}
          {slipUrl && !isPdf && !imageError && (
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-0.5 shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                title="Zoom Out (-) or Scroll Down"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 font-mono text-xs text-emerald-400 font-bold min-w-[50px] text-center select-none hover:bg-slate-700/50 rounded py-1 transition cursor-pointer"
                title="Click to reset zoom & rotation (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                title="Zoom In (+) or Scroll Up"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Rotate 90° Clockwise (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleCycleFilter}
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs ${
                  filterMode !== 'normal'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={`Text Filter (C): ${filterMode.toUpperCase()}`}
              >
                <Contrast className="w-4 h-4" />
                {filterMode !== 'normal' && (
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">
                    {filterMode === 'clarity' ? 'Sharp' : filterMode === 'invert' ? 'Invert' : 'B&W'}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Copy Reference Number shortcut */}
          {currentRequest.referenceNumber && (
            <button
              type="button"
              onClick={() => handleCopyReference(currentRequest.referenceNumber || '')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs"
              title="Copy Bank Reference Number"
            >
              {copiedRef ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400 font-bold hidden sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-medium hidden sm:inline">Ref</span>
                </>
              )}
            </button>
          )}

          {/* Download Original File */}
          {slipUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Download original slip file (D)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          {/* Optional review button for administrators */}
          {canApprove && onProceedToReview && (
            <button
              type="button"
              onClick={() => onProceedToReview(currentRequest)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950 cursor-pointer"
              title="Open full approval & account allocation form"
            >
              <span>Review Request</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 transition cursor-pointer ml-1"
            title="Close preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CENTER: PURE SLIP IMAGE / DOCUMENT PREVIEW */}
      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] bg-slate-950/95"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleToggleDoubleClickZoom}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
        }}
        title={zoom > 1 ? 'Drag to pan across the slip • Double-click to reset' : 'Scroll wheel or double-click to zoom into slip details'}
      >
        {isPdf ? (
          /* PDF Viewer */
          <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center">
            <iframe
              src={slipUrl}
              title={`Payment Slip PDF - ${currentRequest.memberName}`}
              className="w-full h-[80vh] rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
            />
          </div>
        ) : slipUrl && !imageError ? (
          /* PURE SLIP IMAGE PREVIEW */
          <div className="relative flex items-center justify-center max-w-full max-h-full">
            <img
              id="slip-preview-image"
              src={slipUrl}
              alt={`Payment Slip for ${currentRequest.memberName}`}
              onError={() => {
                if (!fallbackSlipUrl) {
                  setFallbackSlipUrl(createDigitalSlipDataUrl(currentRequest));
                } else {
                  setImageError(true);
                }
              }}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl border border-slate-800 shadow-2xl transition-transform duration-150 ease-out select-none pointer-events-none"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                filter: getCssFilter()
              }}
              draggable={false}
            />

            {/* Subtle Zoom Badge on Center Canvas when Panning */}
            {zoom > 1 && (
              <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs font-mono text-emerald-400 font-bold shadow-lg pointer-events-none select-none flex items-center gap-1.5">
                <span>{Math.round(zoom * 100)}%</span>
                <span className="text-[10px] text-slate-400 font-normal">Pan Active</span>
              </div>
            )}
          </div>
        ) : (
          /* Image loading error / fallback card */
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Slip File Not Directly Renderable
              </h3>
              <p className="text-xs text-slate-400">
                {currentRequest.slipFileName || 'Uploaded file'} could not be previewed directly in the browser canvas.
              </p>
            </div>

            {uploadMsg && (
              <div className="text-xs px-3 py-2 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                {uploadMsg}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFallbackSlipUrl(createDigitalSlipDataUrl(currentRequest));
                  setImageError(false);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Show Digital Voucher</span>
              </button>
              {slipUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              )}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Replacement</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Subtle Metadata & Hotkey Hints */}
      <div className="h-10 px-4 sm:px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            Amount:{' '}
            <strong className="text-white font-mono">
              {currentRequest.totalAmount ? `MVR ${currentRequest.totalAmount}` : 'Pending calculation'}
            </strong>
          </span>
          <span className="hidden sm:inline">
            Submitted:{' '}
            <strong className="text-slate-200">
              {new Date(currentRequest.submittedAt).toLocaleDateString()}
            </strong>
          </span>
          {filterMode !== 'normal' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-amber-400 font-medium">
              <SunMedium className="w-3 h-3" /> Filter: {filterMode.toUpperCase()}
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] text-slate-500">
          <span>Wheel / <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">+</kbd> <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">-</kbd> Zoom</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Drag</kbd> Pan</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">R</kbd> Rotate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">C</kbd> Text Filter</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">0</kbd> Reset</span>
          <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Esc</kbd> Close</span>
        </div>

        <div className="flex items-center gap-2">
          {uploadMsg ? (
            <span className="text-emerald-400 font-semibold">{uploadMsg}</span>
          ) : (
            <span>ID: <strong className="text-slate-300 font-mono">{currentRequest.requestNumber || currentRequest.id}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};
