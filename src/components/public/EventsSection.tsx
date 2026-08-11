import React, { useState } from 'react';
import { ClubEvent } from '../../types';
import { Modal } from '../common/Modal';
import { Calendar, MapPin, Image as ImageIcon, ChevronLeft, ChevronRight, X, ExternalLink, Sparkles } from 'lucide-react';

interface EventsSectionProps {
  events?: ClubEvent[];
}

export const EventsSection: React.FC<EventsSectionProps> = ({ events }) => {
  const [selectedEvent, setSelectedEvent] = useState<ClubEvent | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!events || events.length === 0) {
    return null;
  }

  const handleOpenEvent = (evt: ClubEvent) => {
    setSelectedEvent(evt);
    setLightboxIndex(null);
  };

  const handleNextPhoto = () => {
    if (!selectedEvent || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % selectedEvent.photoAlbum.length);
  };

  const handlePrevPhoto = () => {
    if (!selectedEvent || lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + selectedEvent.photoAlbum.length) % selectedEvent.photoAlbum.length);
  };

  return (
    <section id="events" className="py-20 bg-slate-900/60 border-t border-b border-slate-800/80 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ކްލަބްގެ ޙަރަކާތްތައް</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading tracking-tight">
            ޙަރަކާތްތަކާއި ފޮޓޯ އަލްބަމް
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            އާނަންދާ ރީކްރިއޭޝަން ކްލަބުން އިންތިޒާމުކޮށްގެން ހިންގާފައިވާ ޚާއްޞަ ހަރަކާތްތަކާއި ފޮޓޯ އަލްބަމްތައް.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((evt) => {
            const coverImg = evt.coverImage || (evt.photoAlbum && evt.photoAlbum[0]) || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80';
            const albumCount = evt.photoAlbum ? evt.photoAlbum.length : 0;

            return (
              <div
                key={evt.id}
                className="group bg-slate-950 border border-slate-800 hover:border-orange-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  {/* Event Thumbnail */}
                  <div className="relative h-52 overflow-hidden bg-slate-900">
                    <img
                      src={coverImg}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Photo Album Badge */}
                    {albumCount > 0 && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                        <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                        <span>{albumCount} ފޮޓޯ</span>
                      </div>
                    )}

                    {/* Date Badge */}
                    {evt.eventDate && (
                      <div className="absolute bottom-3 right-3 px-3 py-1 bg-orange-500/90 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{evt.eventDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-3">
                    {evt.location && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-white font-heading group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {evt.summary}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEvent(evt)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-orange-500 text-slate-300 hover:text-white border border-slate-800 hover:border-orange-500 font-bold text-xs transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-orange-500/20"
                  >
                    <span>ބައްލަވާ & ފޮޓޯ އަލްބަމް</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EVENT DETAIL & ALBUM MODAL */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            setLightboxIndex(null);
          }}
          title={selectedEvent.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 text-right" dir="rtl">
            {/* Event Header Stats */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300 pb-3 border-b border-slate-800">
              {selectedEvent.eventDate && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-orange-400 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedEvent.eventDate}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-amber-400 font-bold">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.photoAlbum && selectedEvent.photoAlbum.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>ޖުމްލަ {selectedEvent.photoAlbum.length} ފޮޓޯ</span>
                </div>
              )}
            </div>

            {/* Event Summary & Description */}
            <div className="space-y-3 bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800/80">
              <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wide">ޙުލާޞާ</h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {selectedEvent.summary}
              </p>
              {selectedEvent.description && (
                <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/60">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            {/* Photo Album Grid */}
            {selectedEvent.photoAlbum && selectedEvent.photoAlbum.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>ފޮޓޯ އަލްބަމް</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedEvent.photoAlbum.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-orange-500 transition-all focus:outline-none"
                    >
                      <img
                        src={imgUrl}
                        alt={`${selectedEvent.title} - Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>ބޮޑުކުރައްވާ</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                މި ހަރަކާތަށް އެއްވެސް ފޮޓޯއެއް އަޕްލޯޑު ކުރެވިފައެއް ނެތެވެ.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* FULLSCREEN LIGHTBOX VIEWER */}
      {selectedEvent && lightboxIndex !== null && selectedEvent.photoAlbum && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-8 animate-fadeIn" dir="ltr">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white z-10">
            <div className="text-sm font-medium text-slate-300">
              <span className="font-bold text-orange-400">{selectedEvent.title}</span> — Photo {lightboxIndex + 1} of {selectedEvent.photoAlbum.length}
            </div>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Lightbox Image Container */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {selectedEvent.photoAlbum.length > 1 && (
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-2 sm:left-6 p-3 rounded-full bg-slate-900/80 hover:bg-orange-500 text-white transition-colors z-10 shadow-lg border border-slate-700/50"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={selectedEvent.photoAlbum[lightboxIndex]}
              alt={`Full view ${lightboxIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            {selectedEvent.photoAlbum.length > 1 && (
              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-2 sm:right-6 p-3 rounded-full bg-slate-900/80 hover:bg-orange-500 text-white transition-colors z-10 shadow-lg border border-slate-700/50"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Thumbnails */}
          {selectedEvent.photoAlbum.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {selectedEvent.photoAlbum.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                    lightboxIndex === idx ? 'border-orange-500 scale-105' : 'border-slate-800 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={thumb} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
