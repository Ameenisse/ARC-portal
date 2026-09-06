import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Sliders,
  Sparkles
} from 'lucide-react';
import { RentalItem, RentalUnit } from '../../../types';
import { useToast } from '../../common/Toast';
import { authFetch } from '../../../services/api';

interface RentalInventoryTabProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  lang?: string;
}

export const RentalInventoryTab: React.FC<RentalInventoryTabProps> = ({
  canCreate = true,
  canEdit = true,
  canDelete = false,
  lang = 'dv'
}) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [itemUnits, setItemUnits] = useState<Record<string, RentalUnit[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<string | null>(null);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [showAddUnitModal, setShowAddUnitModal] = useState<RentalItem | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<RentalUnit | null>(null);
  const [saving, setSaving] = useState(false);

  // Item form state
  const [itemFormData, setItemFormData] = useState({
    itemCode: '',
    name: '',
    nameDh: '',
    description: '',
    shortDescription: '',
    category: 'camping',
    pricePer24Hours: 150,
    lateFeePer24Hours: 150,
    minimumRentalDays: 1,
    coverImageUrl: '',
    depositAmount: 0,
    featuresText: ''
  });

  // Unit form state
  const [unitFormData, setUnitFormData] = useState({
    unitNumber: '',
    assetTag: '',
    serialNumber: '',
    barcode: '',
    condition: 'excellent' as RentalUnit['condition'],
    purchaseCost: 0,
    notes: ''
  });

  // Adjustment state
  const [adjustData, setAdjustData] = useState({
    newStatus: 'available' as RentalUnit['status'],
    newCondition: 'good' as RentalUnit['condition'],
    reason: ''
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/portal/rental/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        if (data.length > 0 && !expandedItemId) {
          handleToggleExpand(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleExpand = async (itemId: string) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      return;
    }
    setExpandedItemId(itemId);
    if (!itemUnits[itemId]) {
      setLoadingUnits(itemId);
      try {
        const res = await authFetch(`/api/portal/rental/items/${itemId}/units`);
        if (res.ok) {
          const units = await res.json();
          setItemUnits(prev => ({ ...prev, [itemId]: units }));
        }
      } catch (err) {
        console.error('Failed to load item units:', err);
      } finally {
        setLoadingUnits(null);
      }
    }
  };

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setItemFormData({
      itemCode: `ARC-RNT-${String(items.length + 1).padStart(3, '0')}`,
      name: '',
      nameDh: '',
      description: '',
      shortDescription: '',
      category: 'camping',
      pricePer24Hours: 150,
      lateFeePer24Hours: 150,
      minimumRentalDays: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
      depositAmount: 0,
      featuresText: 'Waterproof fabric, Heavy-duty poles, Easy assembly, Carry bag'
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setItemFormData({
      itemCode: item.itemCode,
      name: item.name,
      nameDh: item.nameDh || '',
      description: item.description,
      shortDescription: item.shortDescription || '',
      category: item.category || 'camping',
      pricePer24Hours: item.pricePer24Hours,
      lateFeePer24Hours: item.lateFeePer24Hours,
      minimumRentalDays: item.minimumRentalDays,
      coverImageUrl: item.coverImageUrl || '',
      depositAmount: item.depositAmount || 0,
      featuresText: (item.features || []).join(', ')
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...itemFormData,
        features: itemFormData.featuresText.split(',').map(f => f.trim()).filter(Boolean)
      };

      const url = editingItem
        ? `/api/portal/rental/items/${editingItem.id}`
        : '/api/portal/rental/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save item');
      }

      showToast('success', editingItem ? 'އައިޓަމް އަޕްޑޭޓް ކުރެވިއްޖެ' : 'އައު އައިޓަމް އިތުރުކުރެވިއްޖެ');
      setShowItemModal(false);
      fetchItems();
    } catch (err: any) {
      showToast('error', err.message || 'Error saving item');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddUnit = (item: RentalItem) => {
    const existing = itemUnits[item.id] || [];
    const nextNum = existing.length + 1;
    setShowAddUnitModal(item);
    setUnitFormData({
      unitNumber: `${item.itemCode}-${String(nextNum).padStart(2, '0')}`,
      assetTag: `TAG-${nextNum}`,
      serialNumber: '',
      barcode: `ARC-${item.itemCode}-${nextNum}`,
      condition: 'excellent',
      purchaseCost: 1500,
      notes: ''
    });
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddUnitModal) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/portal/rental/items/${showAddUnitModal.id}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitFormData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add unit');
      }

      showToast('success', 'އައު ޔުނިޓް އިތުރުކުރެވިއްޖެ');
      setShowAddUnitModal(null);
      // Refresh units
      const uRes = await authFetch(`/api/portal/rental/items/${showAddUnitModal.id}/units`);
      if (uRes.ok) {
        const units = await uRes.json();
        setItemUnits(prev => ({ ...prev, [showAddUnitModal.id]: units }));
      }
      fetchItems();
    } catch (err: any) {
      showToast('error', err.message || 'Error adding unit');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustmentModal || !adjustData.reason.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/portal/rental/units/${showAdjustmentModal.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustData)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update unit');
      }

      showToast('success', 'ޔުނިޓްގެ ސްޓޭޓަސް އަޕްޑޭޓް ކުރެވިއްޖެ');
      const targetItemId = showAdjustmentModal.itemId;
      setShowAdjustmentModal(null);
      // Refresh units for that item
      const uRes = await authFetch(`/api/portal/rental/items/${targetItemId}/units`);
      if (uRes.ok) {
        const units = await uRes.json();
        setItemUnits(prev => ({ ...prev, [targetItemId]: units }));
      }
      fetchItems();
    } catch (err: any) {
      showToast('error', err.message || 'Adjustment error');
    } finally {
      setSaving(false);
    }
  };

  const isEn = lang === 'english';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {isEn ? 'Equipment Catalog & Serialized Units' : 'ތަކެތީގެ ކެޓަލޮގާއި ޔުނިޓްތައް'}
          </h3>
          <p className="text-xs text-slate-400">
            {isEn
              ? 'Manage equipment fleet, serialized asset tags, barcode tracking, and condition statuses.'
              : 'އެކުއިޕްމެންޓް ފްލީޓް، ބާކޯޑް، އަދި ކޮންޑިޝަން ބެލެހެއްޓުން.'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenNewItem}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            {isEn ? 'Add Equipment Model' : 'އައު އައިޓަމެއް އިތުރުކުރޭ'}
          </button>
        )}
      </div>

      {/* Catalog items accordion */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading inventory catalog...</div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
          No equipment items configured yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const isExpanded = expandedItemId === item.id;
            const units = itemUnits[item.id] || [];

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition"
              >
                {/* Item Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60">
                  <div className="flex items-center gap-4">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-400">
                          {item.itemCode}
                        </span>
                        <h4 className="text-base font-bold text-white">{item.name}</h4>
                        {item.nameDh && (
                          <span className="text-xs font-dhivehi text-orange-400/90">
                            ({item.nameDh})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{item.shortDescription || item.description}</p>
                    </div>
                  </div>

                  {/* Badges & Meta */}
                  <div className="flex items-center flex-wrap gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Rate / 24h</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        MVR {item.pricePer24Hours}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Late Fee / 24h</span>
                      <span className="font-mono text-slate-300 text-sm">
                        MVR {item.lateFeePer24Hours}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Total Stock</span>
                      <span className="font-mono font-bold text-white text-sm">
                        {item.totalStock} Units
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                          title="Edit Item Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleExpand(item.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <span>{isExpanded ? 'Hide Units' : `View Units (${units.length || item.totalStock})`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Serialized Units Sub-Table */}
                {isExpanded && (
                  <div className="p-5 bg-slate-950/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-orange-400" />
                        Serialized Inventory Units for {item.name}
                      </h5>

                      {canCreate && (
                        <button
                          onClick={() => handleOpenAddUnit(item)}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          Add Serialized Unit
                        </button>
                      )}
                    </div>

                    {loadingUnits === item.id ? (
                      <div className="py-6 text-center text-slate-500 text-xs">Loading units...</div>
                    ) : units.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        No serialized units registered for this equipment.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                              <th className="px-3.5 py-2.5 font-mono">Unit #</th>
                              <th className="px-3.5 py-2.5">Asset Tag</th>
                              <th className="px-3.5 py-2.5">Barcode / Serial</th>
                              <th className="px-3.5 py-2.5">Condition</th>
                              <th className="px-3.5 py-2.5">Operational Status</th>
                              <th className="px-3.5 py-2.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {units.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-800/20 transition">
                                <td className="px-3.5 py-2.5 font-mono font-bold text-orange-400">
                                  {u.unitNumber}
                                </td>
                                <td className="px-3.5 py-2.5 font-mono text-slate-300">
                                  {u.assetTag}
                                </td>
                                <td className="px-3.5 py-2.5 text-[11px] text-slate-400 font-mono">
                                  <div>{u.barcode || '—'}</div>
                                  {u.serialNumber && <div className="text-[10px] text-slate-500">SN: {u.serialNumber}</div>}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <span className="capitalize font-medium text-slate-300">
                                    {u.condition}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    u.status === 'available' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                    u.status === 'rented' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                                    u.status === 'reserved' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                                    u.status === 'maintenance' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                    'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-right">
                                  {canEdit && (
                                    <button
                                      onClick={() => {
                                        setShowAdjustmentModal(u);
                                        setAdjustData({
                                          newStatus: u.status,
                                          newCondition: u.condition,
                                          reason: ''
                                        });
                                      }}
                                      className="px-2 py-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded text-[11px] transition flex items-center gap-1 ml-auto"
                                    >
                                      <Sliders className="w-3 h-3" />
                                      Adjust Status
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Item Modal (Add/Edit) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Edit Equipment Model' : 'Add New Equipment Model'}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.itemCode}
                    onChange={e => setItemFormData({ ...itemFormData, itemCode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={itemFormData.category}
                    onChange={e => setItemFormData({ ...itemFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                    placeholder="e.g. Picnic Camping Tent (4-6 Person)"
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Name (ދިވެހި)</label>
                  <input
                    type="text"
                    value={itemFormData.nameDh}
                    onChange={e => setItemFormData({ ...itemFormData, nameDh: e.target.value })}
                    placeholder="ދަތުރުދާ ޓެންޓް"
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-dhivehi rtl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price / 24h (MVR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={itemFormData.pricePer24Hours}
                    onChange={e => setItemFormData({ ...itemFormData, pricePer24Hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Late Fee / 24h (MVR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemFormData.lateFeePer24Hours}
                    onChange={e => setItemFormData({ ...itemFormData, lateFeePer24Hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min Days</label>
                  <input
                    type="number"
                    min="1"
                    value={itemFormData.minimumRentalDays}
                    onChange={e => setItemFormData({ ...itemFormData, minimumRentalDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={itemFormData.coverImageUrl}
                  onChange={e => setItemFormData({ ...itemFormData, coverImageUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={itemFormData.shortDescription}
                  onChange={e => setItemFormData({ ...itemFormData, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Features (comma separated)</label>
                <input
                  type="text"
                  value={itemFormData.featuresText}
                  onChange={e => setItemFormData({ ...itemFormData, featuresText: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow transition"
                >
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                Add Serialized Unit for {showAddUnitModal.name}
              </h3>
              <button onClick={() => setShowAddUnitModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Number *</label>
                <input
                  type="text"
                  required
                  value={unitFormData.unitNumber}
                  onChange={e => setUnitFormData({ ...unitFormData, unitNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Tag *</label>
                  <input
                    type="text"
                    required
                    value={unitFormData.assetTag}
                    onChange={e => setUnitFormData({ ...unitFormData, assetTag: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={unitFormData.barcode}
                    onChange={e => setUnitFormData({ ...unitFormData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Condition</label>
                  <select
                    value={unitFormData.condition}
                    onChange={e => setUnitFormData({ ...unitFormData, condition: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="maintenance_needed">Maintenance Needed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Cost (MVR)</label>
                  <input
                    type="number"
                    value={unitFormData.purchaseCost}
                    onChange={e => setUnitFormData({ ...unitFormData, purchaseCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow transition"
                >
                  {saving ? 'Adding...' : 'Add Unit to Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Unit Status Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" />
                Adjust Unit {showAdjustmentModal.unitNumber}
              </h3>
              <button onClick={() => setShowAdjustmentModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Status</label>
                <select
                  value={adjustData.newStatus}
                  onChange={e => setAdjustData({ ...adjustData, newStatus: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                >
                  <option value="available">Available (Ready for Booking)</option>
                  <option value="maintenance">Maintenance (Out of Service)</option>
                  <option value="damaged">Damaged (Under Inspection/Repair)</option>
                  <option value="lost">Lost / Decommissioned</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Condition</label>
                <select
                  value={adjustData.newCondition}
                  onChange={e => setAdjustData({ ...adjustData, newCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="maintenance_needed">Maintenance Needed</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment (Logged in audit trail) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjustData.reason}
                  onChange={e => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="e.g. Sent for deep cleaning and zipper repair."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !adjustData.reason.trim()}
                  className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
