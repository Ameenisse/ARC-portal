import React from 'react';
import { Target, Compass, Sparkles } from 'lucide-react';

interface VisionMissionSectionProps {
  data: {
    heading?: string;
    introduction?: string;
    visionTitle?: string;
    visionContent?: string;
    missionTitle?: string;
    missionContent?: string;
    bgImage?: string;
  };
}

export const VisionMissionSection: React.FC<VisionMissionSectionProps> = ({ data }) => {
  return (
    <section id="vision-mission" className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>އަޅުގަނޑުމެންގެ މަޤްޞަދު</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
            {data.heading || 'ވިޝަން އާއި މިޝަން'}
          </h2>
          {data.introduction && (
            <p className="mt-4 text-base text-slate-300 leading-relaxed font-normal">
              {data.introduction}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Vision Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 shadow-xl hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold font-heading text-white mb-4">
                {data.visionTitle || 'އަޅުގަނޑުމެންގެ ވިޝަން'}
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">
                {data.visionContent || 'ޒުވާނުންނާއި މުޖުތަމަޢުގެ އެންމެހައި ފަރާތްތަކަށް ކުޅިވަރާއި، ދީނީ އަދި އިޖުތިމާއީ ކަންކަމުގައި ކުރިއެރުން ހޯދައިދީ، އެކުވެރި ބަދަހި މުޖުތަމަޢެއް ބިނާކުރުން.'}
              </p>
            </div>
          </div>

          {/* Mission Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 shadow-xl hover:border-red-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold font-heading text-white mb-4">
                {data.missionTitle || 'އަޅުގަނޑުމެންގެ މިޝަން'}
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">
                {data.missionContent || 'ރޭވިގެން ހިންގޭ ދީނީ، ކުޅިވަރު އަދި އިޖުތިމާއީ ޕްރޮގްރާމްތަކުގެ ޒަރީޢާއިން ޒުވާނުންގެ ހުނަރު އިތުރުކޮށް، ގައުމީ އަދި އިޖުތިމާއީ ރޫޙު އާލާކުރުން.'}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

