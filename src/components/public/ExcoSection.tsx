import React, { useState } from 'react';
import { Users, ArrowLeft, User } from 'lucide-react';
import { ExcoMember } from '../../types';

interface ExcoSectionProps {
  members: ExcoMember[];
  showViewAll?: boolean;
}

export const ExcoSection: React.FC<ExcoSectionProps> = ({ members, showViewAll = false }) => {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  // Show all members in a single compact row
  const displayMembers = members;

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  if (!displayMembers || displayMembers.length === 0) return null;

  return (
    <section id="team" className="py-16 bg-slate-900 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider mb-2.5">
            <Users className="w-3.5 h-3.5" />
            <span>ހިންގާ ކޮމިޓީ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            އަޅުގަނޑުމެންގެ ހިންގާ ކޮމިޓީ
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5">
            ކްލަބުގެ އިޖުތިމާއީ، ދީނީ އަދި ކުޅިވަރު ހަރަކާތްތައް އިސްވެ ރާވާ ހިންގާ އިސްވެރިން.
          </p>
        </div>

        {/* Fit ALL EXCO Members in a single compact row */}
        <div className="flex lg:grid lg:grid-flow-col lg:auto-cols-fr gap-3 sm:gap-4 overflow-x-auto pb-4 lg:pb-0 scrollbar-thin scrollbar-thumb-slate-700">
          {displayMembers.map(m => {
            const hasValidImage = !!m.image && m.image.trim() !== '' && !imageErrors[m.id];

            return (
              <div
                key={m.id}
                className="min-w-[200px] sm:min-w-[220px] lg:min-w-0 bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:border-orange-500/50 hover:scale-[1.02] transition-all flex flex-col justify-between group shrink-0 lg:shrink text-right"
              >
                {/* Small Compact Image / Fallback Container */}
                <div className="h-40 sm:h-44 overflow-hidden relative bg-slate-800 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={m.image}
                      alt={m.fullName}
                      onError={() => handleImageError(m.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    /* Compact Default Fallback Avatar */
                    <div className="w-full h-full bg-gradient-to-b from-slate-700/80 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-3 relative group-hover:scale-105 transition-transform duration-500">
                      <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md mb-1.5">
                        <User className="w-7 h-7 text-amber-400" />
                      </div>
                      <span className="text-[11px] text-slate-300 font-bold px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/60 truncate max-w-[150px]">
                        {m.fullName}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70 pointer-events-none" />
                  <div className="absolute bottom-2.5 right-2.5 left-2.5 z-10">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-extrabold text-[10px] sm:text-xs tracking-wider uppercase shadow-sm">
                      {m.designation}
                    </span>
                  </div>
                </div>

                {/* Compact Details */}
                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-heading text-white group-hover:text-orange-400 transition-colors truncate">
                      {m.fullName}
                    </h3>
                    {m.description && (
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
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
          <div className="text-center mt-8">
            <a
              id="view_all_team_btn"
              href="/about#exco-team"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-orange-500 text-white text-xs font-semibold transition-all hover:bg-slate-700"
            >
              <span>ހިންގާ ކޮމިޓީގެ އެންމެހައި މެންބަރުން</span>
              <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
            </a>
          </div>
        )}

      </div>
    </section>
  );
};

