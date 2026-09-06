import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Package,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { RentalItem, RentalRequest } from '../../../types';
import { authFetch } from '../../../services/api';

interface RentalAvailabilityTabProps {
  lang?: string;
}

export const RentalAvailabilityTab: React.FC<RentalAvailabilityTabProps> = ({ lang = 'dv' }) => {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const formatLocal = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [startAt, setStartAt] = useState(formatLocal(tomorrow));
  const [endAt, setEndAt] = useState(formatLocal(dayAfter));
  const [quantity, setQuantity] = useState(1);

  const [checking, setChecking] = useState(false);
  const [availResult, setAvailResult] = useState<any>(null);

  // Active bookings list
  const [upcomingRequests, setUpcomingRequests] = useState<RentalRequest[]>([]);

  useEffect(() => {
    authFetch('/api/portal/rental/items')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
          if (data.length > 0) setSelectedItemId(data[0].id);
        }
      });

    authFetch('/api/portal/rental/requests')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUpcomingRequests(data.filter(r => r.status === 'active_rental' || r.status === 'ready_for_collection' || r.status === 'approved_payment_pending'));
        }
      });
  }, []);

  const handleCheck = () => {
    if (!selectedItemId) return;
    setChecking(true);
    authFetch(`/api/public/rental/availability?itemId=${selectedItemId}&startAt=${startAt}&endAt=${endAt}&quantity=${quantity}`)
      .then(r => r.json())
      .then(setAvailResult)
      .catch(console.error)
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    if (selectedItemId) {
      handleCheck();
    }
  }, [selectedItemId, startAt, endAt, quantity]);

  const isEn = lang === 'english';

  return (
    <div className="space-y-6">
      {/* Availability Checker Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" />
          {isEn ? 'Date-Range Availability & Overlap Checker' : 'ތާރީޚުގެ ލިބެންހުރި މިންވަރު ބެލުން'}
        </h3>
        <p className="text-xs text-slate-400">
          Simulate prospective customer bookings to prevent double-booking across serialized units.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Equipment</label>
            <select
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
            >
              {items.map(it => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.itemCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date & Time</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={e => setStartAt(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">End Date & Time</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={e => setEndAt(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity (Units)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
            />
          </div>
        </div>

        {/* Live Result Box */}
        {availResult && (
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            availResult.available
              ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/30 border-rose-800/80 text-rose-300'
          }`}>
            <div className="flex items-center gap-3">
              {availResult.available ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <h4 className="text-sm font-bold">
                  {availResult.available ? 'Units Fully Available' : 'Insufficient Available Units'}
                </h4>
                <p className="text-xs text-slate-400">
                  {availResult.availableCount} of {availResult.operableUnits} operable units free for this window.
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-2xl font-black">{availResult.availableCount}</span>
              <span className="text-xs block text-slate-400">Units Open</span>
            </div>
          </div>
        )}
      </div>

      {/* Active & Upcoming Schedule */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-400" />
          Active & Approved Reservations Timeline
        </h4>

        {upcomingRequests.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No active or approved bookings scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcomingRequests.map(r => (
              <div
                key={r.id}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-orange-400">#{r.requestNumber}</span>
                  <div>
                    <span className="font-semibold text-white">{r.itemName}</span>
                    <span className="text-slate-500 font-mono ml-2">({r.requestedQuantity} units)</span>
                    <div className="text-[11px] text-slate-400">Customer: {r.customerName}</div>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono">
                  <div className="text-slate-300">
                    {new Date(r.approvedStartAt || r.requestedStartAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    {' → '}
                    {new Date(r.approvedEndAt || r.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  <span className="text-emerald-400 uppercase text-[10px] font-bold">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
