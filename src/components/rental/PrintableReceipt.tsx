import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { RentalReceipt } from '../../types';

interface PrintableReceiptProps {
  receipt: RentalReceipt;
  onClose: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden print:m-0 print:p-0 print:shadow-none print:max-w-none print:w-full">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-100 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Official Receipt</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold">
              {receipt.receiptNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Document Body */}
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xl mb-3 shadow-md">
              ARC
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">AANANDHA RECREATION CLUB</h2>
            <p className="text-xs text-slate-500">Boduthakurufaanu Magu, Male, Republic of Maldives</p>
            <p className="text-xs text-slate-500">Official Equipment Rental Service</p>
          </div>

          {/* Title & Status Badge */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Receipt</p>
              <h3 className="text-base font-bold font-mono text-slate-800">{receipt.receiptNumber}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Date: {new Date(receipt.receivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="border-2 border-emerald-600 text-emerald-700 px-3 py-1 rounded-lg font-bold text-sm tracking-wider uppercase rotate-[-3deg] shadow-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              PAID
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Customer Name:</span>
              <span className="font-semibold text-slate-800">{receipt.customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-slate-800">{receipt.paymentMethod}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Bank Reference / Tx ID:</span>
                <span className="font-mono text-slate-700">{receipt.referenceNumber}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Verification Officer:</span>
              <span className="font-semibold text-slate-800">{receipt.receivedBy}</span>
            </div>
          </div>

          {/* Total Amount Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Total Amount Paid</span>
            <span className="text-2xl font-black text-emerald-700 font-mono">
              MVR {receipt.amount.toLocaleString()}
            </span>
          </div>

          {/* Footer Note & Seal */}
          <div className="pt-4 border-t border-slate-200 text-center space-y-1">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              This is an authentic computer-generated official receipt issued by ARC Portal.
            </p>
            <p className="text-[10px] text-slate-400">Keep this receipt as proof of payment for equipment collection.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
