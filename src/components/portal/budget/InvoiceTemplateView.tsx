import React from 'react';
import { InvoiceRecord } from '../../../types';
import { Printer, CheckCircle, Clock, ShieldCheck, DollarSign, AlertCircle } from 'lucide-react';

interface InvoiceTemplateViewProps {
  invoice: InvoiceRecord;
  onPrint?: () => void;
  onApprove?: () => void;
  onCollectPayment?: () => void;
  canApprove?: boolean;
  canCollectPayment?: boolean;
  showActions?: boolean;
}

export const InvoiceTemplateView: React.FC<InvoiceTemplateViewProps> = ({
  invoice,
  onPrint,
  onApprove,
  onCollectPayment,
  canApprove = false,
  canCollectPayment = false,
  showActions = true
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const isQuotation = invoice.type === 'quotation';
  const isApproved = invoice.status === 'approved' || invoice.approvalStatus === 'approved' || invoice.status === 'paid';
  const isPending = invoice.status === 'pending_approval' || invoice.approvalStatus === 'pending';

  // Determine if payment status has been updated / collected
  const isPaid = invoice.status === 'paid' || (Number(invoice.amountPaid || 0) > 0 && Number(invoice.amountDue || 0) === 0);
  const isPartial = Number(invoice.amountPaid || 0) > 0 && Number(invoice.amountDue || 0) > 0;
  const isPaymentUpdated = isPaid || isPartial || Boolean(invoice.receivedBy && invoice.receivedDate);

  // Helper for single payment method label
  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'both':
        return 'Online Transfer & Cash';
      case 'online':
      default:
        return 'Online Transfer (BML)';
    }
  };

  return (
    <div className="flex flex-col items-center w-full" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate', textAlign: 'left' }}>
      {/* Top Controls (Hidden in Print) */}
      {showActions && (
        <div dir="ltr" style={{ direction: 'ltr' }} className="w-full max-w-4xl mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl print:hidden shadow-lg backdrop-blur text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Document Status:</span>
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="w-3.5 h-3.5" />
                Approved & Official
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                Pending Executive Approval
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
                {invoice.status.toUpperCase()}
              </span>
            )}

            {/* Payment Status Indicator */}
            {isPaymentUpdated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <DollarSign className="w-3.5 h-3.5" />
                {isPaid ? 'Payment Settled' : `Partially Paid (MVR ${Number(invoice.amountPaid || 0).toFixed(2)})`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertCircle className="w-3.5 h-3.5" />
                Payment Pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canApprove && !isApproved && onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                Approve as President / VP
              </button>
            )}

            {onCollectPayment && (
              <button
                type="button"
                onClick={onCollectPayment}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4" />
                {isPaymentUpdated ? 'Update Payment Details' : 'Collect Payment & Update Status'}
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      )}

      {/* Main Printable Document Page (A4 Aspect Ratio Standard) */}
      <div 
        id={`invoice-print-container-${invoice.id}`}
        dir="ltr"
        style={{ direction: 'ltr', unicodeBidi: 'isolate', textAlign: 'left', minHeight: '1050px' }}
        className="w-full max-w-[800px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-200 relative print:p-6 print:shadow-none print:border-none print:max-w-none print:w-full print:m-0 font-sans text-left"
      >
        {/* Pending Approval Watermark overlay if not approved */}
        {!isApproved && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-15 rotate-[-25deg]">
            <div className="border-8 border-dashed border-amber-600 text-amber-700 px-12 py-4 rounded-3xl text-4xl sm:text-5xl font-black uppercase tracking-widest text-center">
              Pending Approval<br />
              <span className="text-xl tracking-normal">Not Valid Until Approved</span>
            </div>
          </div>
        )}

        {/* 1. Header Row: Logo & Club Info on Left | Title & Meta on Right */}
        <div className="flex justify-between items-start gap-6 border-b border-slate-100 pb-6 mb-6">
          {/* Left: Club Logo & Address */}
          <div className="flex flex-col">
            {invoice.logoUrl ? (
              <div className="mb-2">
                <img
                  src={invoice.logoUrl}
                  alt="Club Invoice Logo"
                  className="max-h-16 max-w-[200px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-2">
                {/* ARC Emblem Graphic */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12">
                    <path d="M50,15 C55,30 75,35 70,60 C65,80 40,88 30,75 C20,60 35,45 35,35 C35,25 45,15 50,15 Z" fill="#DC2626" opacity="0.9" />
                    <path d="M55,25 C60,40 80,48 72,70 C65,88 45,95 38,82 C30,70 42,55 42,42 Z" fill="#F97316" opacity="0.85" />
                    <path d="M45,35 C50,48 65,55 60,75 C55,88 35,92 28,80 C22,68 32,55 35,45 Z" fill="#16A34A" opacity="0.9" />
                    <circle cx="48" cy="58" r="7" fill="#ffffff" />
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] font-bold text-slate-800 tracking-tight leading-none lowercase">aanandha recreation club</div>
                  <div className="text-[10px] font-extrabold text-red-600 tracking-wider uppercase">NGO • R. MADUVVARI</div>
                </div>
              </div>
            )}
            <div className="text-[13px] font-extrabold text-slate-900 tracking-wide mt-1">AANANDHA RECREATION CLUB</div>
            <div className="text-[11px] text-slate-600 leading-snug">
              {invoice.clubAddress || 'Raa.Maduvvari, 05110\nMaldives'}
            </div>
          </div>

          {/* Right: INVOICE / QUOTATION Title & Details */}
          <div className="text-right flex flex-col items-end">
            <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isQuotation ? 'text-blue-700' : 'text-red-600'} uppercase mb-3`}>
              {isQuotation ? 'QUOTATION' : 'INVOICE'}
            </h1>
            
            <div className="space-y-2 text-right">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isQuotation ? 'Quotation Number' : 'Invoice Number'}
                </div>
                <div className="text-[13px] font-bold text-slate-900 font-mono tracking-tight">
                  {invoice.invoiceNumber}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isQuotation ? 'Quotation Date' : 'Invoice Date'}
                </div>
                <div className="text-[13px] font-bold text-slate-900">
                  {formatDate(invoice.invoiceDate)}
                </div>
              </div>
              {invoice.dueDate && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Date</div>
                  <div className="text-[12px] font-semibold text-slate-700">
                    {formatDate(invoice.dueDate)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Bill To & Remark Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Bill To */}
          <div className="p-3 bg-slate-50/80 rounded border border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bill To;</div>
            <div className="text-[14px] font-bold text-slate-900">{invoice.billTo}</div>
            {invoice.customerAddress && (
              <div className="text-[11px] text-slate-600 whitespace-pre-line mt-0.5">{invoice.customerAddress}</div>
            )}
            {invoice.tin && (
              <div className="text-[11px] font-mono text-slate-600 mt-1 font-semibold">TIN: {invoice.tin}</div>
            )}
          </div>

          {/* Remark */}
          <div className="p-3 bg-slate-50/80 rounded border border-slate-100 flex flex-col justify-start">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Remark</div>
            <div className="text-[12px] text-slate-700 leading-relaxed italic">
              {invoice.remark || 'Thank you for your partnership with Aanandha Recreation Club.'}
            </div>
          </div>
        </div>

        {/* 3. Line Items Table */}
        <div className="mb-6 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-t-2 border-b-2 border-slate-800 text-[11px] font-black uppercase text-slate-900 tracking-wider">
                <th className="py-2.5 px-2 text-left">Description</th>
                <th className="py-2.5 px-2 text-right w-20">Qty</th>
                <th className="py-2.5 px-2 text-right w-28">Rate</th>
                <th className="py-2.5 px-2 text-right w-36">Amount MVR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[12px]">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index} className="hover:bg-slate-50/50">
                  <td className="py-3 px-2 font-medium text-slate-800">{item.description}</td>
                  <td className="py-3 px-2 text-right font-mono text-slate-700">{item.qty}</td>
                  <td className="py-3 px-2 text-right font-mono text-slate-700">{Number(item.rate).toFixed(2)}</td>
                  <td className="py-3 px-2 text-right font-mono font-semibold text-slate-900">{Number(item.amount).toFixed(2)}</td>
                </tr>
              ))}
              {invoice.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400 text-xs italic">
                    No line items recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-b border-slate-800"></div>
        </div>

        {/* 4. Totals Calculation Block (Right Aligned) */}
        <div className="flex justify-end mb-8">
          <div className="w-72 space-y-1.5 text-[12px]">
            <div className="flex justify-between py-1 text-slate-600">
              <span className="font-medium">Sub Total</span>
              <span className="font-mono">{Number(invoice.subTotal || 0).toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span className="font-medium">Discount</span>
                <span className="font-mono">-{Number(invoice.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 text-slate-900 font-bold border-t border-slate-200">
              <span>Total Net Payments MVR</span>
              <span className="font-mono">{Number(invoice.totalNetPayments || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span className="font-medium">Amount PAID</span>
              <span className="font-mono">{Number(invoice.amountPaid || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-900 font-black text-[14px] border-t-2 border-slate-800">
              <span className="uppercase">Amount Due MVR</span>
              <span className="font-mono text-red-600 font-black">{Number(invoice.amountDue || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 5. Payment Method & Acknowledgment / Settlement Block */}
        {/* Payment Method & Received By details appear cleanly once payment status is updated */}
        <div className="p-3.5 border border-slate-300 rounded-lg mb-6 text-[11px] bg-slate-50/70">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Single Selected Payment Method */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Payment Method:</span>
              {isPaymentUpdated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 text-white font-bold text-[11px] shadow-sm">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>{getPaymentMethodLabel(invoice.paymentMethod)}</span>
                </span>
              ) : (
                <span className="text-slate-400 font-mono text-[11px] italic">
                  Pending Payment
                </span>
              )}
            </div>

            {/* Receiver Name & Receipt Acknowledgment */}
            <div className="flex items-center gap-4 text-slate-800 flex-wrap sm:justify-end">
              <div>
                <span className="text-slate-500 font-medium">Received By: </span>
                {isPaymentUpdated && invoice.receivedBy ? (
                  <strong className="text-slate-900 font-bold underline decoration-slate-300 underline-offset-2">
                    {invoice.receivedBy}
                  </strong>
                ) : (
                  <span className="text-slate-400 font-mono">_______________________</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-medium">Date: </span>
                {isPaymentUpdated && (invoice.receivedDate || invoice.updatedAt) ? (
                  <strong className="text-slate-900 font-bold">
                    {formatDate(invoice.receivedDate || invoice.updatedAt)}
                  </strong>
                ) : (
                  <span className="text-slate-400 font-mono">____________</span>
                )}
              </div>

              {isPaymentUpdated && invoice.referenceNumber && (
                <div>
                  <span className="text-slate-500 font-medium">Ref / Slip: </span>
                  <strong className="text-slate-900 font-mono font-bold">{invoice.referenceNumber}</strong>
                </div>
              )}
            </div>
          </div>

          {/* If Payment has been collected / paid */}
          {isPaymentUpdated && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>
                  {isPaid || invoice.amountDue === 0
                    ? 'Payment Settled in Full'
                    : `Partial Payment of MVR ${Number(invoice.amountPaid || 0).toFixed(2)} Collected`}
                </span>
                <span className="text-slate-600 font-normal">
                  via {getPaymentMethodLabel(invoice.paymentMethod)}
                </span>
              </div>
              <div className="text-slate-600 font-medium italic">
                Authorized Receiver: <span className="font-bold text-slate-800 not-italic">{invoice.receivedBy || 'Finance Dept'}</span>
              </div>
            </div>
          )}
        </div>

        {/* 6. Payment Instructions Section (English & Dhivehi Side-by-Side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-100/70 rounded-lg border border-slate-200 mb-6 text-[11px]">
          {/* English Instructions */}
          <div className="space-y-1 text-slate-700">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Payment Instructions</div>
            <div className="text-[11px] leading-relaxed">Bank Transfer made payable to:</div>
            <div>Account Name: <strong className="text-slate-900 font-bold">{invoice.accountName || 'AANANDHA RECREATION CLUB'}</strong></div>
            <div>Account Number: <strong className="text-slate-900 font-mono font-bold">{invoice.accountNumber || 'BML | (MVR) 7730000308018'}</strong></div>
          </div>

          {/* Dhivehi Instructions (RTL) */}
          <div className="text-right space-y-1 text-slate-800" dir="rtl">
            <div className="font-bold text-slate-900 text-[12px]">ފައިސާ ދެއްކުމުގެ ގޮތް:</div>
            <div className="text-[11px] leading-relaxed text-slate-700">ބޭންކް ޓްރާންސްފަރ މެދުވެރިކޮށް ފައިސާދައްކާނީ ތިރީގައިވާ އެކައުންޓަށެވެ.</div>
            <div className="text-[11px]">އެކައުންޓުގެ ނަން: <strong className="text-slate-900 font-bold font-sans" dir="ltr">{invoice.accountName || 'AANANDHA RECREATION CLUB'}</strong></div>
            <div className="text-[11px]">އެކައުންޓް ނަންބަރު: <strong className="text-slate-900 font-bold font-sans" dir="ltr">{invoice.accountNumber || 'BML | (MVR) 7730000308018'}</strong></div>
          </div>
        </div>

        {/* Executive Approval Stamp & Certification */}
        {isApproved && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center justify-between gap-4 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow">
                ✓
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide">
                  Official Executive Certification
                </div>
                <div className="text-[11px] text-emerald-700">
                  Approved by {invoice.approvedByName || 'Executive Committee (President / Vice President)'} on {formatDate(invoice.approvedAt || invoice.updatedAt)}
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-[10px] text-emerald-800 font-bold tracking-tight">
              ARC-AUTH-{invoice.id.slice(-6).toUpperCase()}
            </div>
          </div>
        )}

        {/* 7. 24hr Notice */}
        <div className="text-center space-y-1 mb-6 text-[10px] text-slate-500 border-t border-slate-100 pt-4">
          <div dir="rtl" className="text-[11px] text-slate-600">
            {invoice.footerNoticeDhivehi || 'ބިލާމެދު އެއްވެސް މައްސަލައެއް އުޅޭނަމަ 24 ގަޑިއިރު ތެރޭގައި އެންގުން އެދެމެވެ.'}
          </div>
          <div>
            {invoice.footerNoticeEnglish || 'For any queries or issues related to the invoice, please notify us within 24hrs.'}
          </div>
        </div>

        {/* 8. Bottom Footer Branding Strip with colored flame ribbons */}
        <div className="border-t-2 border-slate-900 pt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-slate-700 tracking-wider uppercase">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div>
            <span className="text-slate-900 font-extrabold">AANANDHA RECREATION CLUB</span>
          </div>
          <div className="text-right font-semibold text-slate-600">
            PHONE: {invoice.clubPhone || '6580394'} | EMAIL: {invoice.clubEmail || 'arc.rmhc@gmail.com'}
          </div>
        </div>
      </div>
    </div>
  );
};
