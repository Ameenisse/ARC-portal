import React, { useState } from 'react';
import { X, CreditCard, Upload, CheckCircle, AlertCircle, Building2, Copy, Check } from 'lucide-react';
import { RentalBill } from '../../types';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

interface CustomerPaymentModalProps {
  bill: RentalBill;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  bill,
  onClose,
  onSuccess
}) => {
  const { idToken } = useCustomerAuth();
  const [transferRef, setTransferRef] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAcc, setCopiedAcc] = useState(false);

  const bankSnapshot = bill.paymentAccountSnapshot || {
    bankName: 'ބޭންކް އޮފް މޯލްޑިވްސް (BML)',
    accountName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް',
    accountNumber: '7730000123456',
    currency: 'MVR'
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(bankSnapshot.accountNumber);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transferRef.trim() && !slipPreview) {
      setError('ބީއެމްއެލް ޓްރާންސްފަރ ރެފަރެންސް ނަންބަރު ނުވަތަ ސްލިޕްގެ ފޮޓޯ އަޕްލޯޑް ކުރައްވާ.');
      return;
    }

    setSubmitting(true);
    try {
      let slipUrl = slipPreview;

      // If user uploaded a slip file, upload it through API
      if (slipFile && slipPreview) {
        try {
          const upRes = await fetch('/api/customer/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
              fileName: slipFile.name,
              fileType: slipFile.type,
              fileData: slipPreview,
              folder: 'rental/slips'
            })
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            slipUrl = upData.url;
          }
        } catch (uploadErr) {
          console.warn('Storage upload error, falling back to data URL:', uploadErr);
        }
      }

      const res = await fetch(`/api/customer/rental/bills/${bill.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          amount: bill.balanceDue,
          method: 'bank_transfer',
          transferReference: transferRef.trim(),
          slipUrl
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ފައިސާގެ މަޢުލޫމާތު ފޮނުވުމުގައި މައްސަލައެއް ދިމާވެއްޖެ');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'ފައިސާގެ މަޢުލޫމާތު ފޮނުވުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-orange-500" />
              <span>ފައިސާ ދެއްކި ސްލިޕް ހުށަހެޅުން</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ބިލް #{bill.billNumber} • ދައްކަންޖެހޭ ޖުމްލަ: ރ. {bill.balanceDue.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Official Bank Account Details Card */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                {bankSnapshot.bankName}
              </span>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                ރަސްމީ އެކައުންޓް
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              އެކައުންޓް ނަން: <span className="text-slate-900 dark:text-white font-semibold">{bankSnapshot.accountName}</span>
            </p>

            <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">އެކައުންޓް ނަންބަރު</span>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white dir-ltr">
                  {bankSnapshot.accountNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-1 transition"
              >
                {copiedAcc ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ކޮޕީވެއްޖެ
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    ކޮޕީ
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transfer Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ބީއެމްއެލް ޓްރާންސްފަރ ރެފަރެންސް ނަންބަރު (ޓްރާންސެކްޝަން އައިޑީ)
            </label>
            <input
              type="text"
              value={transferRef}
              onChange={(e) => setTransferRef(e.target.value)}
              placeholder="މިސާލަކަށް: TXN-892341"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono dir-ltr text-right"
            />
          </div>

          {/* Slip Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-orange-500" />
              ޓްރާންސްފަރ ސްލިޕް އަޕްލޯޑް ކުރައްވާ (ފޮޓޯ ނުވަތަ ސްކްރީންޝޮޓް)
            </label>
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500 rounded-xl p-4 text-center cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {slipPreview ? (
                <div className="space-y-2">
                  <img
                    src={slipPreview}
                    alt="Slip preview"
                    className="max-h-36 mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 object-contain"
                  />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ސްލިޕް ލެވިއްޖެ: {slipFile?.name} (ބަދަލުކުރުމަށް ފިއްތާލައްވާ)
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    ސްލިޕްގެ ފޮޓޯ މިތަނަށް އަޅުއްވާލައްވާ ނުވަތަ ފައިލް ނަންގަވާ
                  </p>
                  <p className="text-[11px] text-slate-400">PNG, JPG, ނުވަތަ JPEG (އެންމެ ބޮޑުވެގެން 10MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ކެންސަލް
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {submitting ? 'ފޮނުވަނީ...' : 'ފައިސާ ކަށަވަރުކުރުމަށް ފޮނުއްވާ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
