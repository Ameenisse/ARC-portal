import React, { useState, useEffect } from 'react';
import { InvoiceRecord, InvoiceLineItem, InvoiceType, InvoiceStatus, User } from '../../../types';
import { api } from '../../../services/api';
import { InvoiceTemplateView } from './InvoiceTemplateView';
import {
  X,
  Plus,
  Trash2,
  FileText,
  Eye,
  Edit3,
  CheckCircle,
  Clock,
  ShieldCheck,
  Building,
  Calendar,
  CreditCard,
  Percent,
  Sparkles,
  Printer
} from 'lucide-react';

interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (invoice: InvoiceRecord) => void;
  invoiceToEdit?: InvoiceRecord | null;
  user: User | null;
}

export const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  invoiceToEdit,
  user
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [loading, setLoading] = useState(false);
  const [fetchingNumber, setFetchingNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [type, setType] = useState<InvoiceType>('invoice');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [billTo, setBillTo] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [tin, setTin] = useState('');
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: '1', description: 'Supply / Service Description', qty: 1, rate: 0, amount: 0 }
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'both'>('online');
  const [receivedBy, setReceivedBy] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [bankName, setBankName] = useState('Bank of Maldives (BML)');
  const [accountName, setAccountName] = useState('AANANDHA RECREATION CLUB');
  const [accountNumber, setAccountNumber] = useState('BML | (MVR) 7730000308018');
  const [logoUrl, setLogoUrl] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('pending_approval');

  const isPresidentOrVP = (user?.roleName || user?.roleId || '').toLowerCase().includes('president') ||
    (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') ||
    user?.permissions?.some(p => p.moduleKey === 'budget' && p.canApprove);

  // Initialize or fetch next number
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceToEdit) {
      setType(invoiceToEdit.type || 'invoice');
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setInvoiceDate(invoiceToEdit.invoiceDate || new Date().toISOString().slice(0, 10));
      setDueDate(invoiceToEdit.dueDate || '');
      setBillTo(invoiceToEdit.billTo || '');
      setCustomerAddress(invoiceToEdit.customerAddress || '');
      setTin(invoiceToEdit.tin || '');
      setRemark(invoiceToEdit.remark || '');
      setItems(invoiceToEdit.items && invoiceToEdit.items.length > 0 ? invoiceToEdit.items : [
        { id: '1', description: '', qty: 1, rate: 0, amount: 0 }
      ]);
      setDiscount(invoiceToEdit.discount || 0);
      setAmountPaid(invoiceToEdit.amountPaid || 0);
      setPaymentMethod(invoiceToEdit.paymentMethod || 'online');
      setReceivedBy(invoiceToEdit.receivedBy || '');
      setReceivedDate(invoiceToEdit.receivedDate || '');
      setBankName(invoiceToEdit.bankName || 'Bank of Maldives (BML)');
      setAccountName(invoiceToEdit.accountName || 'AANANDHA RECREATION CLUB');
      setAccountNumber(invoiceToEdit.accountNumber || 'BML | (MVR) 7730000308018');
      setLogoUrl(invoiceToEdit.logoUrl || '');
      setStatus(invoiceToEdit.status || 'pending_approval');
    } else {
      // New Invoice: Fetch auto-sequence & settings
      fetchNextNumber(type);
      setBillTo('');
      setCustomerAddress('');
      setTin('');
      setRemark('');
      setItems([
        { id: '1', description: 'Fuel / Goods / Logistics Service', qty: 1, rate: 100, amount: 100 }
      ]);
      setDiscount(0);
      setAmountPaid(0);
      setPaymentMethod('online');
      setStatus(isPresidentOrVP ? 'approved' : 'pending_approval');

      // Fetch latest configured budget/invoice settings
      api.getContentSettings()
        .then(res => {
          const settings = res.settings || [];
          const getVal = (g: string, k: string, def: any) =>
            settings.find((s: any) => s.group === g && s.key === k)?.value ?? def;

          setBankName(getVal('budget', 'bankName', 'Bank of Maldives (BML)'));
          setAccountName(getVal('budget', 'accountName', 'AANANDHA RECREATION CLUB'));
          setAccountNumber(getVal('budget', 'accountNumber', 'BML | (MVR) 7730000308018'));
          setLogoUrl(getVal('budget', 'invoiceLogo', ''));
        })
        .catch(() => {});
    }
  }, [isOpen, invoiceToEdit]);

  const fetchNextNumber = async (selectedType: InvoiceType) => {
    try {
      setFetchingNumber(true);
      const res = await api.getNextInvoiceNumber(selectedType);
      if (res && res.nextNumber) {
        setInvoiceNumber(res.nextNumber);
      }
    } catch (e) {
      const year = new Date().getFullYear();
      setInvoiceNumber(selectedType === 'invoice' ? `ARC/INV/${year}/0001` : `ARC/QUO/${year}/0001`);
    } finally {
      setFetchingNumber(false);
    }
  };

  const handleTypeChange = (newType: InvoiceType) => {
    setType(newType);
    if (!invoiceToEdit) {
      fetchNextNumber(newType);
    }
  };

  // Line item handlers
  const handleItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      if (field === 'qty' || field === 'rate') {
        const q = field === 'qty' ? Number(value) : target.qty;
        const r = field === 'rate' ? Number(value) : target.rate;
        target.amount = Number((q * r).toFixed(2));
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: `item_${Date.now()}`, description: '', qty: 1, rate: 0, amount: 0 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subTotal = Number(items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toFixed(2));
  const totalNetPayments = Number(Math.max(0, subTotal - (Number(discount) || 0)).toFixed(2));
  const amountDue = Number(Math.max(0, totalNetPayments - (Number(amountPaid) || 0)).toFixed(2));

  // Current preview object
  const currentInvoiceData: InvoiceRecord = {
    id: invoiceToEdit?.id || 'temp_preview',
    type,
    invoiceNumber,
    invoiceDate,
    dueDate,
    billTo: billTo || 'Client / Customer Organization',
    customerAddress,
    tin,
    remark,
    items,
    subTotal,
    discount,
    totalNetPayments,
    amountPaid,
    amountDue,
    paymentMethod,
    receivedBy,
    receivedDate,
    bankName,
    accountName,
    accountNumber,
    logoUrl,
    status,
    approvalStatus: status === 'approved' ? 'approved' : 'pending',
    approvedByName: isPresidentOrVP && status === 'approved' ? (user?.fullName || user?.username) : invoiceToEdit?.approvedByName,
    approvedAt: isPresidentOrVP && status === 'approved' ? new Date().toISOString() : invoiceToEdit?.approvedAt,
    createdBy: invoiceToEdit?.createdBy || user?.id || 'System',
    createdByName: invoiceToEdit?.createdByName || user?.fullName || user?.username,
    createdAt: invoiceToEdit?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!billTo.trim()) {
      setError('Please specify the recipient client or organization in "Bill To".');
      return;
    }
    if (items.length === 0 || !items.some(i => i.description.trim())) {
      setError('Please add at least one line item with description and rate.');
      return;
    }

    try {
      setLoading(true);
      const payload: Partial<InvoiceRecord> = {
        type,
        invoiceNumber,
        invoiceDate,
        dueDate: dueDate || undefined,
        billTo: billTo.trim(),
        customerAddress: customerAddress.trim() || undefined,
        tin: tin.trim() || undefined,
        remark: remark.trim() || undefined,
        items,
        subTotal,
        discount,
        totalNetPayments,
        amountPaid: invoiceToEdit ? amountPaid : 0,
        amountDue: invoiceToEdit ? amountDue : totalNetPayments,
        paymentMethod,
        receivedBy: receivedBy.trim() || undefined,
        receivedDate: receivedDate || undefined,
        bankName,
        accountName,
        accountNumber,
        logoUrl: logoUrl || undefined,
        status: invoiceToEdit ? invoiceToEdit.status : 'pending_approval',
        approvalStatus: invoiceToEdit ? invoiceToEdit.approvalStatus : 'pending'
      };

      let result: InvoiceRecord;
      if (invoiceToEdit) {
        result = await api.updateInvoice(invoiceToEdit.id, payload);
      } else {
        result = await api.createInvoice(payload);
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice/quotation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="ltr" style={{ direction: 'ltr' }}>
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col" dir="ltr">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80" dir="ltr">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {invoiceToEdit ? `Edit ${invoiceToEdit.type === 'quotation' ? 'Quotation' : 'Invoice'}` : 'Generate Invoice / Quotation'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {invoiceNumber || '...'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aanandha Recreation Club Official Finance & Billing Generator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex items-center p-1 bg-slate-800/80 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'editor' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Form Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Print Preview
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {activeTab === 'preview' ? (
            <div className="py-4">
              <InvoiceTemplateView
                invoice={currentInvoiceData}
                canApprove={isPresidentOrVP}
                showActions={true}
              />
            </div>
          ) : (
            <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Top Row: Type Selection & Document Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                {/* Document Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Document Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('invoice')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold text-center border transition-all ${
                        type === 'invoice'
                          ? 'bg-red-600 text-white border-red-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('quotation')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold text-center border transition-all ${
                        type === 'quotation'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      Quotation
                    </button>
                  </div>
                </div>

                {/* Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Document Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-red-500"
                    placeholder="ARC/INV/2026/0001"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Client & Bill To Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bill To */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Bill To (Client / Entity Name) *
                  </label>
                  <input
                    type="text"
                    value={billTo}
                    onChange={e => setBillTo(e.target.value)}
                    required
                    placeholder="e.g. R.Maduvvari Health Center, STELCO, Youth Ministry"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* TIN */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    TIN / Tax Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={tin}
                    onChange={e => setTin(e.target.value)}
                    placeholder="e.g. 1054321GST001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Client Address / Location
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="e.g. R.Maduvvari, 05110, Maldives"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Remark */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Remark / Purpose Note
                  </label>
                  <input
                    type="text"
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                    placeholder="e.g. Supply of fuel for emergency generator facility"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Line Items Table Builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Line Items & Quantities
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 w-28 text-right">Qty</th>
                        <th className="py-2.5 px-3 w-32 text-right">Rate (MVR)</th>
                        <th className="py-2.5 px-3 w-36 text-right">Amount (MVR)</th>
                        <th className="py-2.5 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-slate-900/40">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={e => handleItemChange(index, 'description', e.target.value)}
                              placeholder="e.g. Petrol, Sound system rental, Banner printing..."
                              required
                              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.qty}
                              onChange={e => handleItemChange(index, 'qty', e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-right text-white focus:outline-none focus:border-red-500"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={item.rate}
                              onChange={e => handleItemChange(index, 'rate', e.target.value)}
                              required
                              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs font-mono text-right text-white focus:outline-none focus:border-red-500"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-white px-3">
                            {Number(item.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              disabled={items.length <= 1}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Calculations & Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Left: Payment Method & Bank Info */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Payment Method & Banking
                  </h4>
                  
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['online', 'cash', 'both'] as const).map(pm => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPaymentMethod(pm)}
                          className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                            paymentMethod === pm
                              ? 'bg-slate-800 text-white border-red-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Received By</label>
                      <input
                        type="text"
                        value={receivedBy}
                        onChange={e => setReceivedBy(e.target.value)}
                        placeholder="Name of recipient"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Receipt Date</label>
                      <input
                        type="date"
                        value={receivedDate}
                        onChange={e => setReceivedDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-slate-300">Bank Transfer Details (ARC Official):</div>
                    <div>Account: <strong className="text-white">AANANDHA RECREATION CLUB</strong></div>
                    <div>Account Number: <strong className="text-white font-mono">BML | (MVR) 7730000308018</strong></div>
                  </div>
                </div>

                {/* Right: Totals & Executive Approval Status */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Financial Summary
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Sub Total:</span>
                      <span className="font-mono font-bold text-white text-sm">{subTotal.toFixed(2)} MVR</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Discount (MVR):</span>
                      <div className="w-32">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={discount}
                          onChange={e => setDiscount(Number(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-right text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-300 font-bold border-t border-slate-800 pt-2">
                      <span>Total Net Payments:</span>
                      <span className="font-mono text-base text-white">{totalNetPayments.toFixed(2)} MVR</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Amount Paid (MVR):</span>
                      <div className="w-32">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={amountPaid}
                          onChange={e => setAmountPaid(Number(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-right text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-red-400 font-black border-t-2 border-slate-800 pt-2 text-sm">
                      <span>Amount Due:</span>
                      <span className="font-mono text-lg text-red-500 font-black">{amountDue.toFixed(2)} MVR</span>
                    </div>
                  </div>

                  {/* Executive Approval & Payment Collection Workflow Banner */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Approval & Collection Workflow</span>
                      <span className="text-[10px] text-amber-400 font-medium">Policy Requirement</span>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-300 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 font-bold">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Submitted as Pending Approval</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        To maintain financial separation of duties, newly created invoices cannot be self-approved immediately. They will be submitted for Executive Review (President / Vice President). Once approved, the Treasurer can record payment collection into club accounts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {activeTab === 'editor' && (
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Live Preview
              </button>
            )}

            <button
              type="submit"
              form="invoice-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Saving...' : invoiceToEdit ? 'Update Document' : 'Generate & Save Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
