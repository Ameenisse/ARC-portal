import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, ShieldCheck, CreditCard, ChevronLeft, LogIn } from 'lucide-react';
import { RentalItem, RentalCustomer } from '../../types';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { CustomerProfileModal } from './CustomerProfileModal';
import { RentalRulesModal } from './RentalRulesModal';

interface RentalBookingModalProps {
  item: RentalItem;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const RentalBookingModal: React.FC<RentalBookingModalProps> = ({
  item,
  onClose,
  onSuccess
}) => {
  const { firebaseUser, customer, idToken, isProfileComplete, signInWithGoogle, previewDevLogin } = useCustomerAuth();

  // Date defaults: purely calendar date selection (no time selection needed)
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const todayStr = formatDateStr(today);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const minRentalDays = Math.max(1, item.minimumRentalDays || 1);
  const defaultReturn = new Date(tomorrow);
  defaultReturn.setDate(defaultReturn.getDate() + minRentalDays);

  const [startDate, setStartDate] = useState(formatDateStr(tomorrow));
  const [endDate, setEndDate] = useState(formatDateStr(defaultReturn));
  const [quantity, setQuantity] = useState(1);
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Availability check
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availResult, setAvailResult] = useState<{
    available: boolean;
    availableCount: number;
    operableUnits: number;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate rental duration in days purely by calendar dates
  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd);
    const eDate = new Date(ey, em - 1, ed);
    const diffTime = eDate.getTime() - sDate.getTime();
    if (diffTime < 0) return 1;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  };

  const rentalDays = calculateDays(startDate, endDate);
  const estimatedTotal = item.pricePer24Hours * quantity * rentalDays;

  // Build standard ISO datetime strings for server API compatibility
  const buildIsoStrings = (start: string, end: string) => {
    if (!start || !end) return { startIso: '', endIso: '' };
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const sDate = new Date(sy, sm - 1, sd, 10, 0, 0);
    const eDate = new Date(ey, em - 1, ed, 10, 0, 0);
    
    // If same calendar date, set end to evening (20:00) so end > start for 1 day
    if (start === end) {
      eDate.setHours(20, 0, 0, 0);
    }
    return {
      startIso: sDate.toISOString(),
      endIso: eDate.toISOString()
    };
  };

  const { startIso, endIso } = buildIsoStrings(startDate, endDate);
  const validDates = Boolean(startDate && endDate && startDate <= endDate);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate && val > endDate) {
      const [y, m, d] = val.split('-').map(Number);
      const nextDate = new Date(y, m - 1, d + minRentalDays);
      setEndDate(formatDateStr(nextDate));
    }
  };

  const handleEndDateChange = (val: string) => {
    if (val && startDate && val < startDate) {
      setEndDate(startDate);
    } else {
      setEndDate(val);
    }
  };

  // Live availability check
  useEffect(() => {
    if (!validDates || !startIso || !endIso) return;
    setCheckingAvail(true);
    const timer = setTimeout(() => {
      fetch(`/api/public/rental/availability?itemId=${item.id}&startAt=${encodeURIComponent(startIso)}&endAt=${encodeURIComponent(endIso)}&quantity=${quantity}`)
        .then(r => r.json())
        .then(data => {
          setAvailResult(data);
        })
        .catch(console.error)
        .finally(() => setCheckingAvail(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [item.id, startIso, endIso, quantity, validDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firebaseUser && !customer) {
      setError('ތަކެތި ކުއްޔަށް ނެގުމުގެ ރިކުއެސްޓް ފޮނުވުމަށް ގޫގުލް އެކައުންޓުން ލޮގިންވެލައްވާ.');
      return;
    }
    if (!isProfileComplete) {
      setShowProfileModal(true);
      return;
    }
    if (!agreedToRules) {
      setError('އޭއާރްސީގެ ތަކެތި ކުއްޔަށް ދިނުމުގެ ޤަވާޢިދަށް އެއްބަސްވެލައްވަން ޖެހޭނެއެވެ.');
      return;
    }
    if (availResult && !availResult.available) {
      setError(`ޚިޔާރުކުރެއްވި ތާރީޚުތަކަށް ލިބެންހުރީ އެންމެ ${availResult.availableCount} ޔުނިޓް.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/rental/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          itemId: item.id,
          customerName: customer?.fullName,
          customerPhone: customer?.phoneNumber,
          customerIdCard: customer?.idCardNumber,
          requestedQuantity: quantity,
          requestedStartAt: startIso,
          requestedEndAt: endIso,
          rulesVersionAccepted: 'v1.0'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ބުކިންގ ހުށަހެޅުމުގައި މައްސަލައެއް ދިމާވެއްޖެ');
      }

      const created = await res.json();
      onSuccess(created.id);
    } catch (err: any) {
      setError(err.message || 'ބުކިންގ ރިކުއެސްޓް ފޮނުވުމުގައި މައްސަލައެއް ދިމާވެއްޖެ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 text-right">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ތަކެތި ކުއްޔަށް ނެގުމަށް އެދުން</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {item.nameDh || item.name} ({item.itemCode})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Auth Banner if not logged in */}
            {!firebaseUser && !customer && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 text-xs">
                  <LogIn className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-semibold">ތަކެތި ކުއްޔަށް ނެގުމަށް ލޮގިންވާން ޖެހޭނެއެވެ</p>
                    <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                      ބުކިންގ ފޮނުވުމަށާއި، ބިލްތައް ބެލުމަށް ގޫގުލް އެކައުންޓުން ލޮގިންވެލައްވާ.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => signInWithGoogle().catch(() => {})}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    ގޫގުލް އެކައުންޓުން ލޮގިންވުން
                  </button>
                  <button
                    type="button"
                    onClick={() => previewDevLogin().catch(() => {})}
                    className="px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300 hover:underline font-medium"
                  >
                    (ޓެސްޓް ކަސްޓަމަރެއްގެ ގޮތުގައި ލޮގިންވުން)
                  </button>
                </div>
              </div>
            )}

            {/* Customer Profile Prompt if incomplete */}
            {customer && !isProfileComplete && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-center justify-between text-xs">
                <div className="text-blue-900 dark:text-blue-200">
                  <p className="font-semibold">އައިޑީ ކާޑާއި ފޯނު ނަންބަރު ބޭނުންވޭ</p>
                  <p className="text-blue-700 dark:text-blue-300 mt-0.5">ބުކިންގ ކުރިއަށް ގެންދިއުމަށް ތިޔަބޭފުޅާގެ މަޢުލޫމާތު ފުރިހަމަކުރައްވާ.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition shrink-0 mr-2"
                >
                  މަޢުލޫމާތު ފުރިހަމަކުރައްވާ
                </button>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ބޭނުންވާ އަދަދު (ޔުނިޓް)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max={item.totalStock || 5}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-28 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono text-center"
                />
                <span className="text-xs text-slate-500">
                  ޖުމްލަ ސްޓޮކް: {item.totalStock} ޔުނިޓް • 24 ގަޑިއިރަށް -/ {item.pricePer24Hours} ރުފިޔާ
                </span>
              </div>
            </div>

            {/* Dates: Start & End (Pure Date Selection - No Time Selection) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  ބޭނުން ކުރަން ފަށާ ތާރީޚު *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono dir-ltr text-right cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  އަނބުރާ ރައްދުކުރާ ތާރީޚު *
                </label>
                <input
                  type="date"
                  required
                  min={startDate || todayStr}
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white font-mono dir-ltr text-right cursor-pointer"
                />
              </div>
            </div>

            {/* Duration and Cost Breakdown */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>ކުއްޔަށް ހިފާ މުއްދަތު:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {rentalDays} ދުވަސް
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>ދުވަހު ރޭޓް:</span>
                <span>ރ. {item.pricePer24Hours} x {quantity} ޔުނިޓް {rentalDays > 1 ? `x ${rentalDays} ދުވަސް` : ''}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-bold">
                <span className="text-slate-800 dark:text-white">ޖުމްލަ އަގު:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  ރ. {estimatedTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Real-time Inventory Availability Status */}
            <div className="text-xs">
              {checkingAvail ? (
                <p className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  ކަލަންޑަރުން ތަކެތި ލިބެންހުރިތޯ ބަލަނީ...
                </p>
              ) : availResult ? (
                availResult.available ? (
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    މި ތާރީޚުތަކަށް ތަކެތި ލިބެން އެބަހުރި! ({availResult.availableCount} ޔުނިޓް ލިބެންހުރި)
                  </p>
                ) : (
                  <p className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    މި ތާރީޚުތަކަށް ތަކެތި ލިބެން ނެތް. މިހާރު ހުސްކޮށްހުރީ އެންމެ {availResult.availableCount} ޔުނިޓް.
                  </p>
                )
              ) : null}
            </div>

            {/* Terms & Regulations Agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreedToRules}
                  onChange={(e) => setAgreedToRules(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 shrink-0"
                />
                <span className="leading-relaxed">
                  އަޅުގަނޑު{' '}
                  <button
                    type="button"
                    onClick={() => setShowRulesModal(true)}
                    className="text-orange-600 dark:text-orange-400 font-semibold underline hover:text-orange-500"
                  >
                    އޭއާރްސީގެ ތަކެތި ކުއްޔަށް ދިނުމުގެ ޤަވާޢިދާއި އުޞޫލުތަކަށް (v1.0)
                  </button>
                  {' '}އެއްބަސްވަމެވެ. މީގެ ތެރޭގައި ތަކެއްޗަށް ރައްކާތެރިވުމާއި، ވަގުތަށް އަނބުރާ ހަވާލުކުރުމާއި، ގެއްލުމެއް ލިބިއްޖެނަމަ ބަދަލުދިނުމުގެ ޝަރުޠުތައް ހިމެނެއެވެ.
                </span>
              </label>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                ކެންސަލް
              </button>
              <button
                type="submit"
                disabled={submitting || (availResult !== null && !availResult.available)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                {submitting ? 'ހުށަހަޅަނީ...' : 'ބުކިންގ ރިކުއެސްޓް ފޮނުއްވާ'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showProfileModal && (
        <CustomerProfileModal
          onClose={() => setShowProfileModal(false)}
          onSuccess={() => setShowProfileModal(false)}
        />
      )}

      {showRulesModal && (
        <RentalRulesModal
          onClose={() => setShowRulesModal(false)}
          onAccept={() => {
            setAgreedToRules(true);
            setShowRulesModal(false);
          }}
          showAcceptButton
        />
      )}
    </>
  );
};
