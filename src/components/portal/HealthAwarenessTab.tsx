import React, { useState, useEffect } from 'react';
import { HealthAwarenessItem } from '../../types';
import { api } from '../../services/api';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { Modal } from '../common/Modal';
import { RichDocEditor } from '../common/RichDocEditor';
import { 
  HeartPulse, Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, 
  Filter, AlertTriangle, ArrowUpDown, ExternalLink, Eye, RefreshCw, 
  Sparkles, Tag, AlertCircle, Info, ChevronUp, ChevronDown 
} from 'lucide-react';

interface HealthAwarenessTabProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const PRESET_CATEGORIES = [
  'ޢާންމު ޞިއްޙަތު',
  'ރޯދައާއި ޞިއްޙަތު',
  'ކަސްރަތު',
  'ކެއިންބުއިން',
  'ނަފްސާނީ ދުޅަހެޔޮކަން',
  'ބަލިތަކުން ރައްކާތެރިވުން',
  'ކުޑަކުދިންގެ ޞިއްޙަތު'
];

export const HealthAwarenessTab: React.FC<HealthAwarenessTabProps> = ({
  canCreate = true,
  canEdit = true,
  canDelete = true
}) => {
  const [items, setItems] = useState<HealthAwarenessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HealthAwarenessItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    content: '',
    imageUrl: '',
    category: 'ޢާންމު ޞިއްޙަތު',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    displayOrder: 1,
    status: 'active' as 'active' | 'inactive',
    linkUrl: '',
    linkLabel: ''
  });

  const fetchItems = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.getHealthAwareness();
      if (Array.isArray(data)) {
        setItems(data.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
      }
    } catch (err: any) {
      setError(err.message || 'ޞިއްޙީ ހޭލުންތެރިކަމުގެ މަޢުލޫމާތު ލޯޑުކުރެވޭ ގޮތް ނުވި');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Real-time listener for table changes
  useTableSync(['health_awareness'], () => {
    fetchItems(true);
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder || 0)) + 1 : 1;
    setFormData({
      title: '',
      message: '',
      content: '',
      imageUrl: '',
      category: 'ޢާންމު ޞިއްޙަތު',
      priority: 'normal',
      displayOrder: nextOrder,
      status: 'active',
      linkUrl: '',
      linkLabel: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: HealthAwarenessItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      message: item.message || '',
      content: item.content || '',
      imageUrl: item.imageUrl || '',
      category: item.category || 'ޢާންމު ޞިއްޙަތު',
      priority: item.priority || 'normal',
      displayOrder: item.displayOrder || 1,
      status: item.status || 'active',
      linkUrl: item.linkUrl || '',
      linkLabel: item.linkLabel || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      alert('އިރުޝާދު / މަޢުލޫމާތު ލިޔުއްވަން ޖެހޭނެއެވެ.');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await api.updateHealthAwareness(editingItem.id, formData);
      } else {
        await api.createHealthAwareness(formData);
      }
      setIsModalOpen(false);
      fetchItems(true);
    } catch (err: any) {
      alert(err.message || 'މަޢުލޫމާތު ރައްކާކުރެވޭ ގޮތް ނުވި');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: HealthAwarenessItem) => {
    if (!canEdit) return;
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateHealthAwareness(item.id, { status: newStatus });
      fetchItems(true);
    } catch (err: any) {
      alert('ޙާލަތު ބަދަލުކުރެވޭ ގޮތް ނުވި: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await api.deleteHealthAwareness(id);
      setDeleteConfirmId(null);
      fetchItems(true);
    } catch (err: any) {
      alert('މަޢުލޫމާތު ފޮހެލެވޭ ގޮތް ނުވި: ' + err.message);
    }
  };

  const handleMoveOrder = async (item: HealthAwarenessItem, direction: 'up' | 'down') => {
    if (!canEdit) return;
    const currentIndex = items.findIndex(i => i.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetItem = items[targetIndex];
    const currentOrder = item.displayOrder || 1;
    const targetOrder = targetItem.displayOrder || 1;

    try {
      await Promise.all([
        api.updateHealthAwareness(item.id, { displayOrder: targetOrder }),
        api.updateHealthAwareness(targetItem.id, { displayOrder: currentOrder })
      ]);
      fetchItems(true);
    } catch (err: any) {
      console.error('Reorder error:', err);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.message && item.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(items.map(i => i.category || 'ޢާންމު ޞިއްޙަތު')));

  const activeCount = items.filter(i => i.status === 'active').length;
  const inactiveCount = items.filter(i => i.status === 'inactive').length;

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Banner / Stats Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white font-heading">
                  ޞިއްޙީ ހޭލުންތެރިކަމުގެ މަޢުލޫމާތު
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ޢާންމު ވެބްސައިޓްގެ ކުއިޒް ސެކްޝަންގެ މަތީގައިވާ ނިއުސް ސްކްރޯލިންގ ބެނަރގައި ދައްކާނެ ޞިއްޙީ އިރުޝާދުތަކާއި މަޢުލޫމާތު މެނޭޖްކުރައްވާ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchItems()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="އަލުން ލޯޑުކުރައްވާ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canCreate && (
              <button
                type="button"
                id="btn-add-health-tip"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>އަލަށް އިތުރުކުރައްވާ</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">ޖުމްލަ މަޢުލޫމާތު:</span>
            <span className="font-bold text-white font-mono text-sm">{items.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-between">
            <span className="text-xs text-emerald-400">ދައްކާ މަޢުލޫމާތު (Active):</span>
            <span className="font-bold text-emerald-300 font-mono text-sm">{activeCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">ފޮރުވިފައި (Inactive):</span>
            <span className="font-bold text-slate-400 font-mono text-sm">{inactiveCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">ދާއިރާތައް:</span>
            <span className="font-bold text-teal-300 font-mono text-sm">{categories.length}</span>
          </div>
        </div>
      </div>

      {/* Live Preview of Scrolling News Banner */}
      {activeCount > 0 && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Eye className="w-3.5 h-3.5" />
              <span>ވެބްސައިޓުގައި ސްކްރޯލިންގ ބެނަރ ފެންނާނެ ގޮތުގެ ލައިވް ޕްރިވިއު:</span>
            </div>
            <span className="text-[10px] text-slate-400">މައުސް ޖެއްސުމުން ސްކްރޯލް މަޑުޖެހޭނެ</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 p-2.5 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold shrink-0 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <HeartPulse className="w-3 h-3 text-emerald-400" />
              <span>ޞިއްޙީ ހޭލުންތެރިކަން</span>
            </div>

            <div className="flex-1 overflow-hidden py-0.5">
              <div className="flex items-center gap-6 animate-marquee">
                {items.filter(i => i.status === 'active').map((item, idx) => (
                  <div key={idx} className="inline-flex items-center gap-2 whitespace-nowrap text-slate-200">
                    {item.category && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-semibold">
                        {item.category}
                      </span>
                    )}
                    {item.title && <span className="font-bold text-white">{item.title}:</span>}
                    <span className="text-slate-300">{item.message}</span>
                    <span className="text-emerald-500/50 mr-3">◆</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ހޯއްދަވާ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">ހުރިހާ ދާއިރާއެއް</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">ހުރިހާ ޙާލަތެއް</option>
            <option value="active">ދައްކާ (Active)</option>
            <option value="inactive">ފޮރުވިފައި (Inactive)</option>
          </select>
        </div>
      </div>

      {/* Items List / Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-emerald-400" />
          <p className="text-xs">މަޢުލޫމާތު ލޯޑުވަނީ...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Info className="w-10 h-10 mx-auto text-slate-500" />
          <p className="text-sm font-semibold text-slate-300">އެއްވެސް ޞިއްޙީ މަޢުލޫމާތެއް ނުފެނުނު</p>
          <p className="text-xs text-slate-500">އަލަށް މަޢުލޫމާތެއް އިތުރުކުރެއްވުމަށް މަތީގައިވާ "އަލަށް އިތުރުކުރައްވާ" ބަޓަނަށް ފިއްތަވާލައްވާ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.status === 'active'
                  ? 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40'
                  : 'bg-slate-950/60 border-slate-800/60 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                
                {/* Right Content Block */}
                <div className="flex items-start gap-3 flex-1">
                  
                  {/* Order Controls */}
                  {canEdit && (
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, 'up')}
                        disabled={index === 0}
                        className="hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="މައްޗަށް ޖައްސަވާ"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono font-bold text-slate-300">
                        {item.displayOrder || index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, 'down')}
                        disabled={index === filteredItems.length - 1}
                        className="hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="ތިރިއަށް ޖައްސަވާ"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Thumbnail if available */}
                  {item.imageUrl && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 hidden sm:block">
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Main text & pills */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.title && (
                        <h3 className="font-extrabold text-white text-sm sm:text-base font-heading">
                          {item.title}
                        </h3>
                      )}
                      
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{item.category}</span>
                        </span>
                      )}

                      {item.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-950 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>ޚާއްޞަ ސަމާލުކަމަށް</span>
                        </span>
                      )}
                      {item.priority === 'important' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                          މުހިންމު
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {item.message}
                    </p>

                    {item.linkUrl && (
                      <div className="pt-1">
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline font-semibold"
                        >
                          <span>{item.linkLabel || item.linkUrl}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Left Actions: Status Toggle, Edit, Delete */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                  
                  {/* Status Toggle Button */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        item.status === 'active'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                      title={item.status === 'active' ? 'ފޮރުވުމަށް ފިއްތަވާ' : 'ދެއްކުމަށް ފިއްތަވާ'}
                    >
                      {item.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ދައްކާ</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>ފޮރުވިފައި</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Edit Button */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="ބަދަލުކުރައްވާ"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/30 transition-colors"
                      title="ފޮހެލައްވާ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'ޞިއްޙީ އިރުޝާދު ބަދަލުކުރުން' : 'އަލަށް ޞިއްޙީ އިރުޝާދެއް އިތުރުކުރުން'}
        description="ވެބްސައިޓްގެ ސްކްރޯލިންގ ނިއުސް ބެނަރގައި އަދި ބްލޮގް ޕޭޖުގައި ދައްކާނެ މަޢުލޫމާތާއި ފޮޓޯތައް ފުރިހަމަކުރައްވާ"
        maxWidth="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2" dir="rtl">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              ސުރުޚީ / ކުރު ނަން (އިޚްތިޔާރީ)
            </label>
            <input
              type="text"
              placeholder="މިސާލަކަށް: ފެން ބުއިން، ކަސްރަތު"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Message / Advice Text */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              އިރުޝާދު / މަޢުލޫމާތު <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="ޞިއްޙީ ހޭލުންތެރިކަމުގެ އިރުޝާދު ތަފްޞީލުކޮށް ލިޔުއްވާ..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          {/* Category Selection with Quick Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              ދާއިރާ / ކެޓަގަރީ
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    formData.category === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="ނުވަތަ އަމިއްލަ ކެޓަގަރީއެއް ލިޔުއްވާ..."
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Priority & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                މުހިންމުކަން (Priority)
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="normal">ޢާދައިގެ (Normal)</option>
                <option value="important">މުހިންމު (Important)</option>
                <option value="urgent">ޚާއްޞަ ސަމާލުކަމަށް (Urgent)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ތަރުތީބު ނަންބަރު (Order)
              </label>
              <input
                type="number"
                min="1"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Status & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ޙާލަތު (Status)
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="active">ދައްކާ (Active)</option>
                <option value="inactive">ފޮރުވިފައި (Inactive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ލިންކުގެ ލޭބަލް (އިޚްތިޔާރީ)
              </label>
              <input
                type="text"
                placeholder="މިސާލަކަށް: އިތުރު މަޢުލޫމާތު"
                value={formData.linkLabel}
                onChange={(e) => setFormData({ ...formData, linkLabel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Image URL & Preview */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              ފޮޓޯ / އިމޭޖް ޔޫ.އާރް.އެލް (Image URL)
            </label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-left"
              dir="ltr"
            />
            {formData.imageUrl && (
              <div className="mt-2 w-full h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Extended Blog Content with Rich Text & Image Doc Editor */}
          <div className="pt-2 border-t border-slate-800/80">
            <RichDocEditor
              value={formData.content || ''}
              onChange={(newContent) => setFormData({ ...formData, content: newContent })}
              label="ބްލޮގް މަޒުމޫނު / ލިޔުން (Blog Article Content with Images & Formatting)"
              placeholder="މަޒުމޫނު ނުވަތަ ލިޔުން މިތަނުގައި ލިޔުއްވާ، ފޮޓޯ އަޅުއްވާ، ނުވަތަ އެމް.އެސް ވޯރޑް (MS Word) އިން ކޮޕީކޮށް ސީދާ ޕޭސްޓް (Paste) ކުރައްވާ..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              އިތުރު މަޢުލޫމާތުގެ ލިންކު / ޔޫ.އާރް.އެލް (އިޚްތިޔާރީ)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.linkUrl}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-left"
              dir="ltr"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ކެންސަލް
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ރައްކާވަނީ...</span>
                </>
              ) : (
                <span>{editingItem ? 'ބަދަލުތައް ރައްކާކުރައްވާ' : 'އިތުރުކުރައްވާ'}</span>
              )}
            </button>
          </div>

        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="މަޢުލޫމާތު ފޮހެލުން"
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2" dir="rtl">
          <p className="text-xs sm:text-sm text-slate-300">
            މި ޞިއްޙީ އިރުޝާދު ފޮހެލައްވަން ބޭނުންފުޅުކަން ޔަޤީންތޯއެވެ؟ މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެއެވެ.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ނޫން، ކެންސަލް
            </button>
            <button
              type="button"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md transition-colors"
            >
              އާދެ، ފޮހެލައްވާ
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
