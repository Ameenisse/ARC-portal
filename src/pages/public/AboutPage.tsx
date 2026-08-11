import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PublicSiteData } from '../../types';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { VisionMissionSection } from '../../components/public/VisionMissionSection';
import { ExcoSection } from '../../components/public/ExcoSection';
import { ReachUsSection } from '../../components/public/ReachUsSection';
import { Info, Sparkles } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [data, setData] = useState<PublicSiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicSiteData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ޕޯޓަލް ލޯޑުވަނީ...</p>
        </div>
      </div>
    );
  }

  const { branding, sectionVisibility, visionMission, contacts, socialLinks, excoMembers } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <PublicHeader branding={branding} activePath="/about" />

      <main className="flex-1">
        {/* Page Banner Header */}
        <section className="py-12 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-widest shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>އަޅުގަނޑުމެންގެ މަޢުލޫމާތު</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
              އަޅުގަނޑުމެންނާ ބެހޭ (About Us)
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
              {branding.aboutText || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބްގެ ވިޝަން، މިޝަން، ހިންގާ ކޮމިޓީ އަދި ގުޅުއްވާނެ މަޢުލޫމާތު'}
            </p>
          </div>
        </section>

        {/* Section 1: Vision & Mission */}
        {sectionVisibility.vision_mission && (
          <VisionMissionSection data={visionMission} />
        )}

        {/* Section 2: EXCO Team */}
        {sectionVisibility.exco_team && (
          <div id="exco-team">
            <ExcoSection members={excoMembers} showViewAll={false} />
          </div>
        )}

        {/* Section 3: Reach Us / Contact */}
        {sectionVisibility.reach_us && (
          <div id="contact">
            <ReachUsSection contacts={contacts} />
          </div>
        )}
      </main>

      <PublicFooter branding={branding} socialLinks={socialLinks} />
    </div>
  );
};
