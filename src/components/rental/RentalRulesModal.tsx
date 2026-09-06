import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, ShieldAlert, MapPin, Clock, Calendar, AlertTriangle } from 'lucide-react';
import { RentalRule } from '../../types';

interface RentalRulesModalProps {
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const RentalRulesModal: React.FC<RentalRulesModalProps> = ({
  onClose,
  onAccept,
  showAcceptButton = false
}) => {
  const [rules, setRules] = useState<RentalRule | null>(null);
  const [lang, setLang] = useState<'dv' | 'en'>('dv');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/rental/rules')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRules(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isDhivehi = lang === 'dv';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto" dir={isDhivehi ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
              <FileText className="w-5 h-5" />
            </div>
            <div className={isDhivehi ? 'text-right' : 'text-left'}>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isDhivehi ? 'ތަކެތި ކުއްޔަށް ދޫކުރުމުގެ ޤަވާޢިދު' : 'Rental Terms & Regulations'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isDhivehi ? `އާނަންދާ ރީކްރިއޭޝަން ކްލަބް • ވާޝަން ${rules?.version || 'v1.0'}` : `Aanandha Recreation Club • Version ${rules?.version || 'v1.0'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setLang('dv')}
                className={`px-2.5 py-1 rounded-md transition ${isDhivehi ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                ދިވެހި
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition ${!isDhivehi ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
              >
                English
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {isDhivehi ? 'ޤަވާޢިދު ލޯޑްވަނީ...' : 'Loading regulations...'}
            </div>
          ) : rules ? (
            <div className={isDhivehi ? 'rtl text-right font-dhivehi' : 'ltr text-left font-sans'}>
              {/* Introduction Box */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl text-xs text-orange-950 dark:text-orange-200 leading-relaxed">
                {isDhivehi ? rules.contentDhivehi : rules.contentEnglish}
              </div>

              {/* Key Rules Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                      {isDhivehi ? 'ތަކެތި ޙަވާލުކުރާ ތަން' : 'Pickup & Handover'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {rules.pickupLocation || (isDhivehi ? 'އޭއާރްސީ މަރުކަޒު، ބޮޑުތަކުރުފާނު މަގު، މާލެ' : 'ARC Headquarters, Boduthakurufaanu Magu, Male')}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                      {isDhivehi ? 'ގަޑި ޖެހުމުގެ ޖޫރިމަނާ' : 'Late Return Policy'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {isDhivehi
                        ? `${rules.gracePeriodHours} ގަޑިއިރުގެ ގްރޭސް ޕީރިއަޑަކަށްފަހު، ކޮންމެ 24 ގަޑިއިރަކަށް -/ ${rules.defaultLateFeePer24Hours}ރ`
                        : `${rules.gracePeriodHours}hr grace period; MVR ${rules.defaultLateFeePer24Hours} per 24 hours late block`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section Details */}
              <div className="space-y-4 mt-6">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    {isDhivehi ? '1. ތަކެތި ޙަވާލުވުމާއި އަނބުރާ ޙަވާލުކުރުން' : '1. Handover & Return Protocol'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rules.handoverPolicy} {rules.returnPolicy}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    {isDhivehi ? '2. ފައިސާ ދެއްކުމާއި ކެންސަލްކުރުން' : '2. Payment & Cancellation'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rules.paymentPolicy} {rules.cancellationPolicy}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                    {isDhivehi ? '3. ގެއްލުމާއި ހަލާކުވުމުގެ ޒިންމާ' : '3. Damage & Loss Liability'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rules.damagePolicy} {rules.lostItemPolicy}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isDhivehi ? `އާނަންދާ ރީކްރިއޭޝަން ކްލަބް © ${new Date().getFullYear()}` : `Aanandha Recreation Club © ${new Date().getFullYear()}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              {isDhivehi ? 'ލައްޕާލައްވާ' : 'Close'}
            </button>
            {showAcceptButton && onAccept && (
              <button
                type="button"
                onClick={onAccept}
                className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isDhivehi ? 'އެއްބަސްވެ ބަލައިގަންނަން' : 'I Agree & Accept Terms'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
