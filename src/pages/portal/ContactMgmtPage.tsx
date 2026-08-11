import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { ContactInfo } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { Plus, Edit, Trash2, PhoneCall } from 'lucide-react';

export const ContactMgmtPage: React.FC = () => {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactInfo | null>(null);

  const [type, setType] = useState('email');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.getContacts();
      setContacts(res);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setType('email');
    setLabel('Official Email');
    setValue('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ContactInfo) => {
    setEditingItem(item);
    setType(item.type);
    setLabel(item.label);
    setValue(item.value);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateContact(editingItem.id, { type, label, value });
        showToast('success', 'Contact updated.');
      } else {
        await api.createContact({ type, label, value });
        showToast('success', 'Contact created.');
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact detail?')) return;
    try {
      await api.deleteContact(id);
      showToast('success', 'Contact deleted.');
      fetchContacts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete contact');
    }
  };

  return (
    <PortalLayout currentModule="contact" title="Reach Us Contact Management">
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Contact Info & Hotline Details</h2>
            <p className="text-xs text-slate-400">Configure phone numbers, email addresses, WhatsApp hotline, and office location.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-orange-400"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact Detail</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading contacts...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map(c => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-950 px-2 py-0.5 rounded-md">
                    {c.type}
                  </span>
                  <h4 className="text-base font-bold text-white font-heading mt-2">{c.label}</h4>
                  <p className="text-sm font-mono text-slate-300 mt-1 break-all">{c.value}</p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Contact Info' : 'Add Contact Info'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Contact Type *</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="email">Email Address</option>
              <option value="primary_phone">Primary Phone</option>
              <option value="secondary_phone">Secondary Phone</option>
              <option value="whatsapp">WhatsApp Hotline</option>
              <option value="address">Headquarters Address</option>
              <option value="working_hours">Working Hours</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Display Label *</label>
            <input
              type="text"
              required
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Official Email Address"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Value / Address / Number *</label>
            <textarea
              rows={2}
              required
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. info@arcclub.org or +960 777 4321"
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
              Save Detail
            </button>
          </div>
        </form>
      </Modal>

    </PortalLayout>
  );
};
