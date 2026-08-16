import React, { useState } from 'react';
import { MemberContributionRecord } from '../../../types';
import { Check, AlertCircle, Clock, Sparkles, CreditCard, Receipt, Search, Filter } from 'lucide-react';

interface AnnualContributionMatrixProps {
  year: number;
  membersList: any[];
  contributions: MemberContributionRecord[];
  onOpenPayModal: (member: any, defaultMonth?: number) => void;
  onOpenReceipt: (record: MemberContributionRecord, linkedMember: any) => void;
  onExportCsv: () => void;
  lang: string;
}

export const AnnualContributionMatrix: React.FC<AnnualContributionMatrixProps> = ({
  year,
  membersList,
  contributions,
  onOpenPayModal,
  onOpenReceipt,
  onExportCsv,
  lang
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'has_overdue' | 'all_paid' | 'pending'>('all');

  const months = [
    { num: 1, label: 'Jan' },
    { num: 2, label: 'Feb' },
    { num: 3, label: 'Mar' },
    { num: 4, label: 'Apr' },
    { num: 5, label: 'May' },
    { num: 6, label: 'Jun' },
    { num: 7, label: 'Jul' },
    { num: 8, label: 'Aug' },
    { num: 9, label: 'Sep' },
    { num: 10, label: 'Oct' },
    { num: 11, label: 'Nov' },
    { num: 12, label: 'Dec' }
  ];

  const filteredMembers = membersList.filter(member => {
    const memberName = member.fullName || member.full_name || '';
    const memberNo = member.memberNumber || member.member_number || '';
    const matchesSearch = !searchTerm || 
      memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      memberNo.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const memberContribs = contributions.filter(c => c.memberId === member.id && c.year === year);
    const hasOverdue = memberContribs.some(c => c.status === 'overdue');
    const allPaid = memberContribs.length >= 12 && memberContribs.every(c => c.status === 'paid');
    const hasPending = memberContribs.some(c => c.status === 'pending');

    if (filterType === 'has_overdue') return hasOverdue;
    if (filterType === 'all_paid') return allPaid;
    if (filterType === 'pending') return hasPending;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls & Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member name or ARC No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-emerald-500 w-56 sm:w-72"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 font-bold"
            >
              <option value="all">All Members ({membersList.length})</option>
              <option value="has_overdue">With Overdue Fines</option>
              <option value="pending">Pending Payments</option>
              <option value="all_paid">Fully Paid (12 Months)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 border-r border-slate-800 pr-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Advance Free
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Overdue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Pending
            </span>
          </div>

          <button
            type="button"
            onClick={onExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            Export Matrix CSV
          </button>
        </div>
      </div>

      {/* 12-Month Matrix Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
              <tr>
                <th className="p-3.5 sticky left-0 bg-slate-950/95 z-10 min-w-[200px]">Member</th>
                {months.map(m => (
                  <th key={m.num} className="p-2.5 text-center min-w-[56px] border-l border-slate-800/60 font-mono font-bold">
                    {m.label}
                  </th>
                ))}
                <th className="p-3 text-right font-mono min-w-[90px] border-l border-slate-800">Total Paid</th>
                <th className="p-3 text-center min-w-[110px] border-l border-slate-800">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500">
                    No members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => {
                  const memberContribs = contributions.filter(c => c.memberId === member.id && c.year === year);
                  const totalPaidAmount = memberContribs
                    .filter(c => c.status === 'paid')
                    .reduce((sum, c) => sum + (c.paidAmount || c.totalPayable || 0), 0);
                  const hasPendingOrOverdue = memberContribs.some(c => c.status === 'pending' || c.status === 'overdue');
                  const isFullyPaid = memberContribs.length === 12 && memberContribs.every(c => c.status === 'paid');

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition group">
                      {/* Member Info Sticky Column */}
                      <td className="p-3.5 sticky left-0 bg-slate-900 group-hover:bg-slate-850 z-10 border-r border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {(member.fullName || member.full_name || 'M').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate text-xs">
                              {member.fullName || member.full_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {member.memberNumber || member.member_number || member.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 12 Months Cells */}
                      {months.map(m => {
                        const rec = memberContribs.find(c => c.month === m.num);
                        const isPaid = rec?.status === 'paid';
                        const isOverdue = rec?.status === 'overdue';
                        const isAdvanceFree = isPaid && rec?.discountAmount && rec.discountAmount > 0 && (rec.paidAmount === 0 || rec.month === 12);

                        if (!rec) {
                          return (
                            <td key={m.num} className="p-1.5 text-center border-l border-slate-800/50">
                              <button
                                type="button"
                                onClick={() => onOpenPayModal(member, m.num)}
                                className="w-full py-1 rounded bg-slate-950 hover:bg-emerald-500/20 text-[10px] text-slate-500 hover:text-emerald-400 font-mono transition"
                                title={`Record payment for ${m.label}`}
                              >
                                —
                              </button>
                            </td>
                          );
                        }

                        if (isAdvanceFree) {
                          return (
                            <td key={m.num} className="p-1.5 text-center border-l border-slate-800/50">
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(rec, member)}
                                className="w-full py-1 px-1 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-extrabold flex items-center justify-center gap-0.5"
                                title="Annual Advance Free Month!"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-teal-400" />
                                <span>FREE</span>
                              </button>
                            </td>
                          );
                        }

                        if (isPaid) {
                          return (
                            <td key={m.num} className="p-1.5 text-center border-l border-slate-800/50">
                              <button
                                type="button"
                                onClick={() => onOpenReceipt(rec, member)}
                                className="w-full py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center justify-center gap-0.5 hover:bg-emerald-500/30 transition"
                                title={`Paid on ${rec.paidDate || 'Recorded'}. Click to view receipt.`}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </button>
                            </td>
                          );
                        }

                        if (isOverdue) {
                          return (
                            <td key={m.num} className="p-1.5 text-center border-l border-slate-800/50">
                              <button
                                type="button"
                                onClick={() => onOpenPayModal(member, m.num)}
                                className="w-full py-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-bold flex flex-col items-center justify-center hover:bg-rose-500/30 transition"
                                title={`Overdue with +${rec.fineAmount} MVR late fine (${rec.fineDays} days late). Click to collect.`}
                              >
                                <span>+{rec.fineAmount}</span>
                              </button>
                            </td>
                          );
                        }

                        // Pending
                        return (
                          <td key={m.num} className="p-1.5 text-center border-l border-slate-800/50">
                            <button
                              type="button"
                              onClick={() => onOpenPayModal(member, m.num)}
                              className="w-full py-1 rounded-md bg-slate-950 hover:bg-emerald-500/20 text-[10px] text-slate-400 hover:text-emerald-300 font-mono transition"
                              title={`Pending due date: ${rec.dueDate}. Click to collect.`}
                            >
                              100
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Paid Column */}
                      <td className="p-3 text-right font-mono font-bold text-slate-200 border-l border-slate-800">
                        <span className={totalPaidAmount > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                          {totalPaidAmount.toLocaleString()} MVR
                        </span>
                      </td>

                      {/* Quick Action Button */}
                      <td className="p-3 text-center border-l border-slate-800">
                        {isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Fully Paid
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenPayModal(member)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm transition"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
