import React, { useState } from 'react';
import { CategoryBudgetAllocation, ExpenseCategory } from '../../../types';
import { Target, TrendingDown, AlertTriangle, CheckCircle2, AlertOctagon, Plus, Edit2, Trash2, PieChart } from 'lucide-react';
import { Modal } from '../../common/Modal';

interface CategoryAllocationsTabProps {
  year: number;
  allocations: CategoryBudgetAllocation[];
  onSaveAllocation: (data: Partial<CategoryBudgetAllocation>) => Promise<void>;
  onDeleteAllocation: (id: string) => Promise<void>;
  lang: string;
}

const CATEGORY_META: Record<ExpenseCategory, { labelEn: string; labelDv: string; color: string }> = {
  prizes_awards: { labelEn: 'Prizes, Trophies & Awards', labelDv: 'އިނާމާއި ޓްރޮފީ', color: 'amber' },
  event_logistics: { labelEn: 'Event Operations & Logistics', labelDv: 'އިވެންޓް އޮޕަރޭޝަންސް', color: 'blue' },
  venue_rent: { labelEn: 'Venue & Pitch Rental', labelDv: 'ދަނޑާއި ހޯލު ކުލި', color: 'purple' },
  catering: { labelEn: 'Catering & Refreshments', labelDv: 'ކެއިންބުއިމުގެ ޚަރަދު', color: 'emerald' },
  marketing_pr: { labelEn: 'Marketing & Media Coverage', labelDv: 'މާކެޓިންގ އަދި މީޑިއާ', color: 'rose' },
  equipment: { labelEn: 'Sports & Sound Equipment', labelDv: 'ކުޅިވަރު ސާމާނު', color: 'teal' },
  office_admin: { labelEn: 'Office Administration & Printing', labelDv: 'އިދާރީ ޚަރަދުތައް', color: 'slate' },
  utilities: { labelEn: 'Electricity, Water & Internet', labelDv: 'ޔޫޓިލިޓީސް', color: 'cyan' },
  travel: { labelEn: 'Travel & Island Logistics', labelDv: 'ދަތުރުފަތުރު', color: 'indigo' },
  maintenance: { labelEn: 'Repairs & Grounds Maintenance', labelDv: 'މަރާމާތު', color: 'orange' },
  other: { labelEn: 'Miscellaneous Contingency', labelDv: 'އެހެނިހެން', color: 'slate' }
};

export const CategoryAllocationsTab: React.FC<CategoryAllocationsTabProps> = ({
  year,
  allocations,
  onSaveAllocation,
  onDeleteAllocation,
  lang
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlloc, setEditingAlloc] = useState<CategoryBudgetAllocation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formCategory, setFormCategory] = useState<ExpenseCategory>('prizes_awards');
  const [formAmount, setFormAmount] = useState<number>(10000);
  const [formNotes, setFormNotes] = useState<string>('');

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.allocatedAmount || 0), 0);
  const totalSpent = allocations.reduce((sum, a) => sum + (a.spentAmount || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallUsagePct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0;

  const openCreateModal = () => {
    setEditingAlloc(null);
    setFormCategory('prizes_awards');
    setFormAmount(10000);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEditModal = (alloc: CategoryBudgetAllocation) => {
    setEditingAlloc(alloc);
    setFormCategory(alloc.category);
    setFormAmount(alloc.allocatedAmount);
    setFormNotes(alloc.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSaveAllocation({
        id: editingAlloc?.id,
        year,
        category: formCategory,
        categoryLabel: CATEGORY_META[formCategory]?.labelEn || formCategory,
        allocatedAmount: Number(formAmount),
        notes: formNotes
      });
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Fiscal Budget</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalAllocated.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
          </div>
          <span className="text-[11px] text-slate-400">Approved allocations for {year}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Utilized</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {totalSpent.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
          </div>
          <span className="text-[11px] text-slate-400">Actual expenses recorded</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Remaining Ceiling</span>
            <PieChart className="w-4 h-4 text-teal-400" />
          </div>
          <div className={`text-2xl font-extrabold font-mono ${totalRemaining >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
            {totalRemaining.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
          </div>
          <span className="text-[11px] text-slate-400">Available spending capacity</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Overall Utilization</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {overallUsagePct}%
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${overallUsagePct}%` }}
              className={`h-full ${overallUsagePct > 90 ? 'bg-rose-500' : overallUsagePct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      </div>

      {/* Header Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h3 className="font-bold text-white text-sm">
            {lang === 'english' ? 'Departmental & Category Budget Ceilings' : 'ބަޖެޓް ކެޓަގަރީތަކާއި ލިމިޓްތައް'}
          </h3>
          <p className="text-slate-400 text-xs">
            Manage spending limits by category and track real-time variance for {year}.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Set Category Target</span>
        </button>
      </div>

      {/* Allocation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocations.map(alloc => {
          const meta = CATEGORY_META[alloc.category] || { labelEn: alloc.categoryLabel || alloc.category, labelDv: '', color: 'slate' };
          const spent = alloc.spentAmount || 0;
          const limit = alloc.allocatedAmount || 1;
          const pct = Math.round((spent / limit) * 100);
          const remaining = limit - spent;
          const isOverBudget = spent > limit;
          const isWarning = pct >= 80 && !isOverBudget;

          return (
            <div
              key={alloc.id}
              className={`bg-slate-900 border rounded-3xl p-5 space-y-4 relative overflow-hidden transition hover:border-slate-700 ${
                isOverBudget ? 'border-rose-500/50 bg-rose-950/10' : isWarning ? 'border-amber-500/40' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[10px] uppercase tracking-wider block w-fit mb-1.5">
                    {alloc.category.replace(/_/g, ' ')}
                  </span>
                  <h4 className="font-extrabold text-white text-sm">
                    {meta.labelEn}
                  </h4>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(alloc)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                    title="Edit Allocation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAllocation(alloc.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs transition"
                    title="Delete Allocation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress and Numbers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Spent to Date:</span>
                  <span className="font-mono font-bold text-white">
                    {spent.toLocaleString()} / <span className="text-slate-400">{limit.toLocaleString()} MVR</span>
                  </span>
                </div>

                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    style={{ width: `${Math.min(100, pct)}%` }}
                    className={`h-full transition-all ${
                      isOverBudget ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold font-mono ${isOverBudget ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pct}% Consumed
                  </span>
                  <span className="text-slate-400 font-mono">
                    {remaining >= 0 ? `${remaining.toLocaleString()} MVR left` : `${Math.abs(remaining).toLocaleString()} MVR over limit`}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {isOverBudget ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                    <AlertOctagon className="w-3.5 h-3.5" /> Over Budget
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3.5 h-3.5" /> Near Ceiling
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3.5 h-3.5" /> On Target
                  </span>
                )}

                {alloc.notes && (
                  <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]" title={alloc.notes}>
                    {alloc.notes}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Set / Edit Allocation Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingAlloc ? 'Edit Budget Ceiling' : 'Set Category Budget Target'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Expense Category
              </label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                disabled={!!editingAlloc}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                {Object.entries(CATEGORY_META).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Allocation Limit for {year} (MVR)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={formAmount}
                onChange={e => setFormAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notes & Executive Justification (Optional)
              </label>
              <textarea
                rows={2}
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g. Approved in AGM 2026 for Inter-Club Ramadan Tournament."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                {submitting ? 'Saving...' : 'Save Allocation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
