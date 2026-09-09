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
  ExternalLink
} from 'lucide-react';
import { ContributionPaymentRequest } from '../../../types';
import { resolveSlipUrl } from '../../../utils/slipReceiptGenerator';
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
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMsg, setUploadMsg] = useState<string>('');

  // Panning state for dragging when zoomed
  const [isDragging, setIsDragging] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync request prop
  useEffect(() => {
    setCurrentRequest(request);
    setImageError(false);
    setUploadMsg('');
  }, [request?.id, request?.slipDownloadUrl, request?.slipDataUrl]);

  // Reset viewport state on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setHighContrast(false);
      setImageError(false);
      setPanPosition({ x: 0, y: 0 });
      setUploadMsg('');
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
        setHighContrast(prev => !prev);
      } else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setPanPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentRequest) return null;

  // Prioritize member's original uploaded slip data URL first, then uploaded URL
  const rawSlipUrl =
    currentRequest.slipDataUrl ||
    currentRequest.slipDownloadUrl ||
    (currentRequest as any).paymentSlipUrl ||
    (currentRequest as any).slipUrl ||
    '';

  const slipUrl = resolveSlipUrl(rawSlipUrl);

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
    setHighContrast(false);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = () => {
    if (!slipUrl) return;
    const a = document.createElement('a');
    a.href = slipUrl;
    a.download = currentRequest.slipFileName || `payment-slip-${currentRequest.requestNumber || currentRequest.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 font-mono text-xs text-emerald-400 font-bold min-w-[50px] text-center select-none hover:bg-slate-700/50 rounded py-1 transition"
                title="Click to reset zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Rotate 90° (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setHighContrast(prev => !prev)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  highContrast
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Toggle High Contrast (C)"
              >
                <Contrast className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Download Original File */}
          {slipUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Download original slip file"
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
        className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
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
              onError={() => setImageError(true)}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl border border-slate-800 shadow-2xl transition-transform duration-150 ease-out"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                filter: highContrast ? 'contrast(170%) brightness(105%) invert(1)' : 'none'
              }}
              draggable={false}
            />
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
              {slipUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Original File</span>
                </button>
              )}
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Replacement Slip</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR: Subtle Metadata & Hotkey Hints */}
      <div className="h-10 px-4 sm:px-6 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
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
        </div>

        <div className="hidden md:flex items-center gap-3 font-mono text-[10px] text-slate-500">
          <span>Zoom: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">+</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">-</kbd></span>
          <span>Rotate: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">R</kbd></span>
          <span>Contrast: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">C</kbd></span>
          <span>Reset: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">0</kbd></span>
          <span>Close: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Esc</kbd></span>
        </div>

        <div>
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
