import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { SlideshowItem } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { useToast } from '../../components/common/Toast';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, CheckCircle, Eye } from 'lucide-react';

export const SlideshowMgmtPage: React.FC = () => {
  const { showToast } = useToast();
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SlideshowItem | null>(null);

  // Form State
  const [desktopImage, setDesktopImage] = useState('');
  const [mobileImage, setMobileImage] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [overlayLevel, setOverlayLevel] = useState(45);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const res = await api.getSlideshow();
      setSlides(res);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load slides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleOpenCreate = () => {
    setEditingSlide(null);
    setDesktopImage('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80');
    setMobileImage('');
    setTitle('');
    setSubtitle('');
    setButtonText('Explore Event');
    setButtonLink('#quiz');
    setTextAlignment('center');
    setOverlayLevel(45);
    setStatus('active');
    setModalOpen(true);
  };

  const handleOpenEdit = (slide: SlideshowItem) => {
    setEditingSlide(slide);
    setDesktopImage(slide.desktopImage);
    setMobileImage(slide.mobileImage || '');
    setTitle(slide.title);
    setSubtitle(slide.subtitle || '');
    setButtonText(slide.buttonText || '');
    setButtonLink(slide.buttonLink || '');
    setTextAlignment(slide.textAlignment || 'center');
    setOverlayLevel(slide.overlayLevel ?? 45);
    setStatus(slide.status || 'active');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopImage || !title) {
      showToast('error', 'Desktop image URL and title are required.');
      return;
    }

    const payload = {
      desktopImage,
      mobileImage,
      title,
      subtitle,
      buttonText,
      buttonLink,
      textAlignment,
      overlayLevel: Number(overlayLevel),
      status
    };

    try {
      if (editingSlide) {
        await api.updateSlide(editingSlide.id, payload);
        showToast('success', 'Slide updated successfully');
      } else {
        await api.createSlide(payload);
        showToast('success', 'Slide created successfully');
      }
      setModalOpen(false);
      fetchSlides();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save slide');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slideshow photo?')) return;
    try {
      await api.deleteSlide(id);
      showToast('success', 'Slide deleted.');
      fetchSlides();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete slide');
    }
  };

  return (
    <PortalLayout currentModule="slideshow" title="Photo Slideshow Management">
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Landing Page Hero Slides</h2>
            <p className="text-xs text-slate-400">Manage hero photos, headlines, overlays, and CTA buttons.</p>
          </div>
          <button
            id="add_slide_btn"
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slide</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading slideshow items...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map(slide => (
              <div key={slide.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
                <div className="h-44 relative bg-slate-950">
                  <img src={slide.desktopImage} alt={slide.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950" style={{ opacity: (slide.overlayLevel || 45) / 100 }} />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                    <span className="text-[10px] uppercase font-bold text-orange-400">Order: #{slide.displayOrder}</span>
                    <h4 className="text-base font-bold font-heading line-clamp-1">{slide.title}</h4>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-400 line-clamp-2">{slide.subtitle}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      slide.status === 'active' ? 'bg-orange-950 text-orange-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {slide.status}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(slide)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(slide.id)}
                        className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <Modal
        id="slide_modal"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSlide ? 'Edit Slideshow Photo' : 'Add New Slideshow Photo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadInput
            label="Desktop Image"
            required
            value={desktopImage}
            onChange={setDesktopImage}
          />

          <ImageUploadInput
            label="Mobile Image (Optional)"
            value={mobileImage}
            onChange={setMobileImage}
          />

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Heading Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Welcome to ARC Club"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Subtitle Description</label>
            <textarea
              rows={2}
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="e.g. Empowering youth through community activities"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">CTA Button Text</label>
              <input
                type="text"
                value={buttonText}
                onChange={e => setButtonText(e.target.value)}
                placeholder="e.g. Join Ramazan Quiz"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">CTA Button Link</label>
              <input
                type="text"
                value={buttonLink}
                onChange={e => setButtonLink(e.target.value)}
                placeholder="e.g. /quiz"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Text Alignment</label>
              <select
                value={textAlignment}
                onChange={e => setTextAlignment(e.target.value as any)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dark Overlay % ({overlayLevel}%)</label>
              <input
                type="range"
                min="0"
                max="80"
                value={overlayLevel}
                onChange={e => setOverlayLevel(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400"
            >
              Save Slide
            </button>
          </div>
        </form>
      </Modal>

    </PortalLayout>
  );
};
