import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { ExcoMember } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { useToast } from '../../components/common/Toast';
import { Plus, Edit, Trash2, Users, User } from 'lucide-react';

export const ExcoTeamMgmtPage: React.FC = () => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<ExcoMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExcoMember | null>(null);

  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.getExcoMembers();
      setMembers(res);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load EXCO members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFullName('');
    setDesignation('President');
    setIdCardNumber('');
    setImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80');
    setDescription('');
    setSocialLink('');
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ExcoMember) => {
    setEditingItem(item);
    setFullName(item.fullName);
    setDesignation(item.designation);
    setIdCardNumber(item.idCardNumber || '');
    setImage(item.image || '');
    setDescription(item.description || '');
    setSocialLink(item.socialLink || '');
    setStatus(item.status || 'active');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { fullName, designation, idCardNumber, image, description, socialLink, status };
      if (editingItem) {
        await api.updateExcoMember(editingItem.id, payload);
        showToast('success', 'EXCO member updated.');
      } else {
        await api.createExcoMember(payload);
        showToast('success', 'EXCO member created.');
      }
      setModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save EXCO member');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    try {
      await api.deleteExcoMember(id);
      showToast('success', 'EXCO member deleted.');
      fetchMembers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete EXCO member');
    }
  };

  return (
    <PortalLayout currentModule="exco_team" title="EXCO Team Management">
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Executive Committee Members</h2>
            <p className="text-xs text-slate-400">Manage leadership photos, names, titles, and public profile bios.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-orange-400"
          >
            <Plus className="w-4 h-4" />
            <span>Add EXCO Member</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading EXCO members...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {members.map(m => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all">
                <div className="h-32 sm:h-36 relative bg-slate-800 flex items-center justify-center overflow-hidden">
                  {m.image && m.image.trim() !== '' ? (
                    <img src={m.image} alt={m.fullName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-1">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold truncate max-w-[110px]">{m.fullName}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      m.status === 'active' ? 'bg-orange-950/90 text-orange-400 border border-orange-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-orange-400 block truncate">{m.designation}</span>
                    <h4 className="text-xs sm:text-sm font-bold text-white font-heading mt-0.5 truncate">{m.fullName}</h4>
                    {m.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-tight">{m.description}</p>
                    )}
                  </div>

                  <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="p-1 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit EXCO Member' : 'Add EXCO Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Ibrahim Ali"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Designation / Role *</label>
            <input
              type="text"
              required
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. President, Vice President, Treasurer, General Secretary"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">ID Card Number / NIN</label>
            <input
              type="text"
              value={idCardNumber}
              onChange={e => setIdCardNumber(e.target.value.toUpperCase())}
              placeholder="e.g. A100001"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
            />
          </div>

          <ImageUploadInput
            label="Photo Image"
            required
            value={image}
            onChange={setImage}
          />

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Short Bio</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief biography or background..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400"
            >
              Save EXCO Member
            </button>
          </div>
        </form>
      </Modal>

    </PortalLayout>
  );
};
