import React from 'react';
import { usePublicSiteData } from '../../hooks/usePublicSiteData';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { VisionMissionSection } from '../../components/public/VisionMissionSection';
import { ExcoSection } from '../../components/public/ExcoSection';
import { ReachUsSection } from '../../components/public/ReachUsSection';
import { PageLoader } from '../../components/common/PageLoader';
import { PageTransition } from '../../components/common/PageTransition';
import { Sparkles } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { data, loading } = usePublicSiteData();

  if (loading && !data) {
    return <PageLoader message="އަޅުގަނޑުމެންނާ ބެހޭ މަޢުލޫމާތު ލޯޑުވަނީ..." />;
  }

  if (!data) return null;

  const { branding, sectionVisibility, visionMission, contacts, socialLinks, excoMembers } = data;

  return (
    <PageTransition>
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
              <p dir="auto" className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal whitespace-pre-line">
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
    </PageTransition>
  );
};
