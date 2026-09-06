import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, Building, ShieldCheck, Phone, MapPin, AlertCircle } from 'lucide-react';
import { RentalSettings } from '../../../types';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalSettingsTabProps {
  canManageSettings?: boolean;
  lang?: string;
}

export const RentalSettingsTab: React.FC<RentalSettingsTabProps> = ({
  canManageSettings = true,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RentalSettings>({
    id: 'current',
    publicRentalEnabled: true,
    defaultPaymentAccountId: '',
    pickupLocation: 'ARC Clubhouse, Dh. Meedhoo',
    pickupContactNumber: '+960 7991234',
    defaultGracePeriodHours: 2,
    defaultLateFeePer24Hours: 150,
    minimumAdvanceBookingHours: 24,
    defaultMinimumRentalDays: 1,
    defaultMaximumRentalDays: 14,
    allowCustomerCancellation: true,
    cancellationCutoffHours: 6,
    requireIdCardNumber: true,
    bmlAccountName: 'Aanandha Recreation Club',
    bmlAccountNumber: '7730000123456',
    bmlBankName: 'Bank of Maldives Plc',
    contactHotline: '+960 7991234',
    handoverLocation: 'ARC Clubhouse, Dh. Meedhoo',
    gracePeriodHours: 2,
    termsAndConditionsText: '1. All equipment must be returned in the original clean condition. 2. Late returns will be charged the standard 24-hour rate. 3. Borrower assumes full financial responsibility for any loss or severe damage.',
    termsAndConditionsTextDh: '1. ހުރިހާ އެއްޗެއް އަނބުރާ ޙަވާލުކުރަންވާނީ ސާފުތާހިރު ހާލަތުގައެވެ. 2. ގަޑިއަށް އަނބުރާ ނުގެނެސްފިނަމަ 24 ގަޑިއިރުގެ ފީ ނެގޭނެއެވެ.',
    updatedAt: new Date().toISOString()
  });

  useEffect(() => {
    authFetch('/api/public/rental/settings')
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setSettings(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch('/api/portal/rental/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update settings');
      }

      showToast('success', 'ސެޓިންގްސް ކާމިޔާބުކަމާއެކު ރައްކާކުރެވިއްޖެ');
    } catch (err: any) {
      showToast('error', err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const isEn = lang === 'english';

  if (loading) {
    return <div className="py-16 text-center text-slate-400 text-xs">Loading rental settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-500" />
          {isEn ? 'Rental Service Configuration & Banking Settings' : 'ކުއްޔަށްދޭ ޚިދުމަތުގެ ސެޓިންގްސް'}
        </h3>
        <p className="text-xs text-slate-400">
          Configure official bank transfer details displayed to customers, handover locations, and service terms.
        </p>
      </div>

      {/* Official Bank Transfer Account */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
          <Building className="w-4 h-4" />
          Official BML Transfer Account (Shown on Invoices & Customer Portal)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name *</label>
            <input
              type="text"
              required
              disabled={!canManageSettings}
              value={settings.bmlBankName}
              onChange={e => setSettings({ ...settings, bmlBankName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Name *</label>
            <input
              type="text"
              required
              disabled={!canManageSettings}
              value={settings.bmlAccountName}
              onChange={e => setSettings({ ...settings, bmlAccountName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number *</label>
            <input
              type="text"
              required
              disabled={!canManageSettings}
              value={settings.bmlAccountNumber}
              onChange={e => setSettings({ ...settings, bmlAccountNumber: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Operations & Location */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Operating Policy & Handover Location
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Handover & Return Location *</label>
            <input
              type="text"
              required
              disabled={!canManageSettings}
              value={settings.handoverLocation}
              onChange={e => setSettings({ ...settings, handoverLocation: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Support Hotline *</label>
            <input
              type="text"
              required
              disabled={!canManageSettings}
              value={settings.contactHotline}
              onChange={e => setSettings({ ...settings, contactHotline: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Grace Period (Hours) *</label>
            <input
              type="number"
              required
              min="0"
              disabled={!canManageSettings}
              value={settings.gracePeriodHours}
              onChange={e => setSettings({ ...settings, gracePeriodHours: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Hours after scheduled return before late fee kicks in.
            </span>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Rental Agreement Terms & Policies
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Terms (English)</label>
            <textarea
              rows={4}
              disabled={!canManageSettings}
              value={settings.termsAndConditionsText}
              onChange={e => setSettings({ ...settings, termsAndConditionsText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Terms (ދިވެހި)</label>
            <textarea
              rows={4}
              disabled={!canManageSettings}
              value={settings.termsAndConditionsTextDh}
              onChange={e => setSettings({ ...settings, termsAndConditionsTextDh: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-dhivehi rtl outline-none"
            />
          </div>
        </div>
      </div>

      {canManageSettings && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </form>
  );
};
