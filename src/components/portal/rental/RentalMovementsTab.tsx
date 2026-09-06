import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldCheck, ArrowUpDown, Tag, User, Calendar } from 'lucide-react';
import { RentalStockMovement } from '../../../types';
import { authFetch } from '../../../services/api';

interface RentalMovementsTabProps {
  lang?: string;
}

export const RentalMovementsTab: React.FC<RentalMovementsTabProps> = ({ lang = 'dv' }) => {
  const [movements, setMovements] = useState<RentalStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    authFetch('/api/portal/rental/movements')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMovements(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = movements.filter(m => {
    if (typeFilter !== 'all' && m.movementType !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        m.itemName.toLowerCase().includes(s) ||
        (m.unitNumber && m.unitNumber.toLowerCase().includes(s)) ||
        (m.assetTag && m.assetTag.toLowerCase().includes(s)) ||
        (m.reason && m.reason.toLowerCase().includes(s)) ||
        m.performedByName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const isEn = lang === 'english';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search movement logs...' : 'މޫވްމަންޓް ލޮގް ހޯދާ...'}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">All Movement Types</option>
          <option value="handover">Handover to Customer</option>
          <option value="return_completed">Return Inspection</option>
          <option value="stock_added">Stock Added</option>
          <option value="reserved">Reserved</option>
          <option value="adjustment">Manual Adjustment</option>
          <option value="maintenance">Maintenance</option>
          <option value="damaged">Damage Logged</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading movements...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No stock movements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Item & Unit</th>
                  <th className="px-4 py-3">Condition Before → After</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                      {new Date(m.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-orange-400 border border-slate-700">
                        {m.movementType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{m.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {m.unitNumber || 'Batch'} {m.assetTag ? `[${m.assetTag}]` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-300">
                      {m.conditionBefore && m.conditionAfter ? (
                        <span>
                          <span className="capitalize text-slate-400">{m.conditionBefore}</span>
                          <span className="mx-1 text-slate-600">→</span>
                          <span className="capitalize font-semibold text-emerald-400">{m.conditionAfter}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-300 max-w-xs truncate">
                      {m.reason || 'Normal operation'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.performedByName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
