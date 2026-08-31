import React, { useState, useRef } from 'react';
import { Users, ArrowLeft, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExcoMember } from '../../types';

interface ExcoSectionProps {
  members: ExcoMember[];
  showViewAll?: boolean;
}

export const ExcoSection: React.FC<ExcoSectionProps> = ({ members, showViewAll = false }) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const displayMembers = members;

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!displayMembers || displayMembers.length === 0) return null;

  return (
    <section id="team" className="py-12 bg-slate-900 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-[11px] uppercase tracking-wider mb-2">
              <Users className="w-3 h-3" />
              <span>ހިންގާ ކޮމިޓީ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white tracking-tight">
              އަޅުގަނޑުމެންގެ ހިންގާ ކޮމިޓީ
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              ކްލަބުގެ އިޖުތިމާއީ، ދީނީ އަދި ކުޅިވަރު ހަރަކާތްތައް އިސްވެ ރާވާ ހިންގާ އިސްވެރިން.
            </p>
          </div>

          {/* Side Scrolling Controls */}
          {displayMembers.length > 2 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                id="exco_scroll_right"
                onClick={() => handleScroll('right')}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
                title="Scroll Right"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="exco_scroll_left"
                onClick={() => handleScroll('left')}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shadow-sm"
                title="Scroll Left"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Single Row with Side Scrolling */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto pb-4 pt-1 gap-3 sm:gap-4 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/40"
          style={{ scrollbarWidth: 'thin' }}
        >
          {displayMembers.map(m => {
            const hasValidImage = !!m.image && m.image.trim() !== '' && !imageErrors[m.id];

            return (
              <div
                key={m.id}
                className="flex-none w-[170px] sm:w-[195px] md:w-[215px] snap-start bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-1 transition-all flex flex-col justify-between group text-right"
              >
                {/* Small Compact Image / Fallback Container */}
                <div className="h-36 sm:h-40 overflow-hidden relative bg-slate-800 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={m.image}
                      alt={m.fullName}
                      onError={() => handleImageError(m.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    /* Compact Default Fallback Avatar */
                    <div className="w-full h-full bg-gradient-to-b from-slate-700/70 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-2 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm mb-1">
                        <User className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 truncate max-w-[130px]">
                        {m.fullName}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-85 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 left-2 z-10">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-orange-500/95 text-white font-bold text-[9px] sm:text-[10px] tracking-wide uppercase shadow-sm truncate max-w-full">
                      {m.designation}
                    </span>
                  </div>
                </div>

                {/* Compact Details */}
                <div className="p-3 space-y-1 flex-1 flex flex-col justify-between bg-slate-850">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold font-heading text-white group-hover:text-orange-400 transition-colors truncate">
                      {m.fullName}
                    </h3>
                    {m.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showViewAll && members.length > 6 && (
          <div className="text-center mt-6">
            <a
              id="view_all_team_btn"
              href="/about#exco-team"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-orange-500 text-white text-xs font-semibold transition-all hover:bg-slate-700"
            >
              <span>ހިންގާ ކޮމިޓީގެ އެންމެހައި މެންބަރުން</span>
              <ArrowLeft className="w-3 h-3 text-orange-400" />
            </a>
          </div>
        )}

      </div>
    </section>
  );
};


