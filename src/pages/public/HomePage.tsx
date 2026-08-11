import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PublicSiteData } from '../../types';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { HeroSlideshow } from '../../components/public/HeroSlideshow';
import { VisionMissionSection } from '../../components/public/VisionMissionSection';
import { QuizSection } from '../../components/public/QuizSection';
import { EventsSection } from '../../components/public/EventsSection';
import { ExcoSection } from '../../components/public/ExcoSection';
import { ReachUsSection } from '../../components/public/ReachUsSection';
import { Sparkles, ArrowRight } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [data, setData] = useState<PublicSiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicSiteData()
      .then(res => setData(res))
      .catch(err => console.error('Failed to load public site data:', err))
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

  const { branding, sectionVisibility, slideshow, visionMission, contacts, socialLinks, excoMembers, events = [] } = data;
  const hasEvents = events.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <PublicHeader branding={branding} activePath="/" hasEvents={hasEvents} />

      <main className="flex-1">
        
        {/* Section 1: Hero Slideshow */}
        {sectionVisibility.slideshow && slideshow.length > 0 && (
          <HeroSlideshow slides={slideshow} />
        )}

        {/* Section 2: Welcome Section */}
        {sectionVisibility.welcome && (
          <section className="py-20 bg-slate-900 border-y border-slate-800 relative">
            <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>އަޅުގަނޑުމެންގެ ކްލަބް</span>
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
                {branding.welcomeHeading}
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed font-normal max-w-3xl mx-auto">
                {branding.welcomeMessage}
              </p>
              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <a
                  href="/quiz"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span>ރަމަޟާން ކުއިޒްގައި ބައިވެރިވެލައްވާ</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </a>
                <a
                  href="/about"
                  className="px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-semibold text-sm transition-all"
                >
                  އަޅުގަނޑުމެންނާ ބެހޭ (About Us)
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Ramazan Quiz (Featured First) */}
        {sectionVisibility.ramazan_quiz && (
          <QuizSection />
        )}

        {/* Section 4: Events Section (Below Quiz, auto-hides if empty) */}
        <EventsSection events={events} />

        {/* About Us Block (Arranged at the Last of Landing Page) */}
        <div id="about-us-sections" className="border-t border-slate-800/80">
          {/* Section 4: Vision & Mission */}
          {sectionVisibility.vision_mission && (
            <VisionMissionSection data={visionMission} />
          )}

          {/* Section 5: EXCO Team */}
          {sectionVisibility.exco_team && (
            <ExcoSection members={excoMembers} showViewAll={true} />
          )}

          {/* Section 6: Reach Us / Contact */}
          {sectionVisibility.reach_us && (
            <ReachUsSection contacts={contacts} />
          )}
        </div>

      </main>

      <PublicFooter branding={branding} socialLinks={socialLinks} hasEvents={hasEvents} />
    </div>
  );
};
