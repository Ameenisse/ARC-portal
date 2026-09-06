import React, { useState } from 'react';
import { X, User, Phone, CreditCard, MapPin, Save, AlertCircle } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

interface CustomerProfileModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  forceComplete?: boolean;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  onClose,
  onSuccess,
  forceComplete = false
}) => {
  const { customer, updateProfile } = useCustomerAuth();

  const [fullName, setFullName] = useState(customer?.fullName || customer?.googleName || '');
  const [phoneNumber, setPhoneNumber] = useState(customer?.phoneNumber || '');
  const [idCardNumber, setIdCardNumber] = useState(customer?.idCardNumber || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [island, setIsland] = useState(customer?.island || 'މާލެ');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('އައިޑީ ކާޑުގައިވާ ގޮތަށް ފުރިހަމަ ނަން ލިޔުއްވާ.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 7) {
      setError('ޞައްޙަ ފޯނު ނަންބަރެއް ލިޔުއްވާ (މަދުވެގެން 7 އަދަދު).');
      return;
    }
    if (!idCardNumber.trim()) {
      setError('ދިވެހިރައްޔިތެއްކަން އަންގައިދޭ ކާޑު ނަންބަރު ލިޔުއްވާ (މިސާލަކަށް: A123456).');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        idCardNumber: idCardNumber.trim().toUpperCase(),
        address: address.trim(),
        island: island.trim()
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'މަޢުލޫމާތު ރައްކާކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {forceComplete ? 'ކަސްޓަމަރުގެ މަޢުލޫމާތު ފުރިހަމަކުރުން' : 'ކަސްޓަމަރުގެ ޕްރޮފައިލް ބަދަލުކުރުން'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ތަކެތި ޙަވާލުކުރުމާއި ބުކިންގ ކަށަވަރުކުރުމަށް މިއީ ކޮންމެހެން ބޭނުންވާ މަޢުލޫމާތެކެވެ
            </p>
          </div>
          {!forceComplete && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-orange-500" />
              ފުރިހަމަ ނަން (އައިޑީ ކާޑުގައިވާ ގޮތަށް) *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="މިސާލަކަށް: ޢަލީ އަޙްމަދު"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white text-right"
            />
          </div>

          {/* National ID Card */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              ދިވެހިރައްޔިތެއްކަން އަންގައިދޭ ކާޑު ނަންބަރު *
            </label>
            <input
              type="text"
              required
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value)}
              placeholder="މިސާލަކަށް: A012345"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white uppercase font-mono dir-ltr text-right"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-orange-500" />
              ގުޅޭނެ ފޯނު ނަންބަރު *
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="މިސާލަކަށް: 7771234"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono dir-ltr text-right"
            />
          </div>

          {/* Island / City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                ރަށް / ސިޓީ
              </label>
              <input
                type="text"
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                placeholder="މާލެ"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ދިރިއުޅޭ އެޑްރެސް
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ގޭގެ ނަން / ފްލެޓް"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white text-right"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            {!forceComplete && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                ކެންސަލް
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'ރައްކާކުރަނީ...' : 'މަޢުލޫމާތު ރައްކާކުރައްވާ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
