import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { SocialLink } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { Plus, Edit, Trash2, Share2 } from 'lucide-react';

export const SocialMediaMgmtPage: React.FC = () => {
  const { showToast } = useToast();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialLink | null>(null);

  const [platform, setPlatform] = useState('facebook');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('Facebook');
  const [openInNewTab, setOpenInNewTab] = useState(true);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.getSocialLinks();
      setLinks(res);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load social links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setPlatform('facebook');
    setUrl('');
    setIcon('Facebook');
    setOpenInNewTab(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: SocialLink) => {
    setEditingItem(item);
    setPlatform(item.platform);
    setUrl(item.url);
    setIcon(item.icon || '');
    setOpenInNewTab(item.openInNewTab ?? true);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateSocialLink(editingItem.id, { platform, url, icon, openInNewTab });
        showToast('success', 'Social link updated.');
      } else {
        await api.createSocialLink({ platform, url, icon, openInNewTab });
        showToast('success', 'Social link created.');
      }
      setModalOpen(false);
      fetchLinks();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save social link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this social link?')) return;
    try {
      await api.deleteSocialLink(id);
      showToast('success', 'Social link deleted.');
      fetchLinks();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete social link');
    }
  };

  return (
    <PortalLayout currentModule="social_media" title="Social Media Management">
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Social Media Profiles</h2>
            <p className="text-xs text-slate-400">Configure Facebook, Instagram, Twitter/X, YouTube, TikTok links for footer and contact section.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-orange-400"
          >
            <Plus className="w-4 h-4" />
            <span>Add Social Link</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading social links...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.map(s => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                    {s.platform}
                  </span>
                  <p className="text-xs font-mono text-slate-300 mt-2 truncate">{s.url}</p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
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
        title={editingItem ? 'Edit Social Link' : 'Add Social Link'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Platform Name *</label>
            <input
              type="text"
              required
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              placeholder="e.g. Facebook, Instagram, Twitter, YouTube"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Target Profile URL *</label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://facebook.com/arcclub"
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
              Save Social Link
            </button>
          </div>
        </form>
      </Modal>

    </PortalLayout>
  );
};
