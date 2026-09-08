import React from 'react';
import { usePublicSiteData } from '../../hooks/usePublicSiteData';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { HeroSlideshow } from '../../components/public/HeroSlideshow';
import { VisionMissionSection } from '../../components/public/VisionMissionSection';
import { QuizSection } from '../../components/public/QuizSection';
import { HealthAwarenessBanner } from '../../components/public/HealthAwarenessBanner';
import { EventsSection } from '../../components/public/EventsSection';
import { ExcoSection } from '../../components/public/ExcoSection';
import { ReachUsSection } from '../../components/public/ReachUsSection';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { PageLoader } from '../../components/common/PageLoader';
import { PageTransition } from '../../components/common/PageTransition';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data, loading, error, refresh } = usePublicSiteData();

  // Real-time table sync for Public Home Page
  useTableSync(
    ['slideshow', 'siteSettings', 'contacts', 'socialLinks', 'excoMembers', 'events', 'quiz_questions', 'health_awareness'],
    () => {
      refresh(true);
    }
  );

  if (loading && !data) {
    return <PageLoader message="އާނަންދާ ރީކްރިއޭޝަން ކްލަބް ވެބްސައިޓް ލޯޑުވަނީ..." />;
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto border border-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Database temporarily unavailable.</h2>
          <p className="text-sm text-slate-400 font-thaana leading-relaxed">
            ޑޭޓާބޭސްއާ ގުޅުމުގައި މައްސަލައެއް ދިމާވެއްޖެ. ކުޑައިރުކޮޅަކަށްފަހު އަލުން މަސައްކަތްކޮށްލައްވާ.
          </p>
          <button
            onClick={() => refresh(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors shadow-lg shadow-orange-600/20"
          >
            އަލުން މަސައްކަތްކުރައްވާ (Retry)
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { branding, sectionVisibility, slideshow, visionMission, contacts, socialLinks, excoMembers, events = [] } = data;
  const hasEvents = events.length > 0;

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicHeader branding={branding} activePath="/" hasEvents={hasEvents} />

        <main className="flex-1">
        
        {/* Section 1: Hero Slideshow with Overlaid Welcome Text & Buttons (No Solid Background) */}
        {sectionVisibility.slideshow && slideshow.length > 0 ? (
          <HeroSlideshow slides={slideshow}>
            {sectionVisibility.welcome && (
              <div className="space-y-4 sm:space-y-6 py-4 sm:py-6 animate-fade-in w-full px-2">
                <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 font-semibold text-[11px] sm:text-xs uppercase tracking-wider backdrop-blur-md shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>އަޅުގަނޑުމެންގެ ކްލަބް</span>
                </span>
                <h1 id="hero_welcome_heading" dir="auto" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-normal drop-shadow-lg max-w-4xl mx-auto leading-relaxed sm:leading-snug">
                  {branding.welcomeHeading || 'އާނަންދަ ރިކުރިއޭޝަން ކުލަބު (ARC) ގެ ވެބްސައިޓަށް މަރުޙަބާ!'}
                </h1>
                {branding.welcomeMessage && (
                  <p dir="auto" className="text-sm sm:text-lg lg:text-xl text-slate-100 leading-relaxed font-normal max-w-3xl mx-auto drop-shadow-md whitespace-pre-line px-1">
                    {branding.welcomeMessage}
                  </p>
                )}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
                  <a
                    href="/quiz"
                    className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 backdrop-blur-sm text-center"
                  >
                    <span>ރަމަޟާން ކުއިޒްގައި ބައިވެރިވެލައްވާ</span>
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                  <a
                    href="/about"
                    className="w-full sm:w-auto px-6 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:bg-slate-900 hover:border-slate-500 text-white font-semibold text-sm transition-all backdrop-blur-md hover:scale-105 active:scale-95 text-center flex items-center justify-center"
                  >
                    އަޅުގަނޑުމެންނާ ބެހޭ (About Us)
                  </a>
                </div>
              </div>
            )}
          </HeroSlideshow>
        ) : (
          sectionVisibility.welcome && (
            <section className="py-12 sm:py-20 bg-slate-900 border-b border-slate-800 relative">
              <div className="max-w-5xl mx-auto px-4 text-center space-y-4 sm:space-y-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>އަޅުގަނޑުމެންގެ ކްލަބް</span>
                </span>
                <h2 id="welcome_heading" dir="auto" className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-normal leading-relaxed sm:leading-snug">
                  {branding.welcomeHeading || 'އާނަންދަ ރިކުރިއޭޝަން ކުލަބު (ARC) ގެ ވެބްސައިޓަށް މަރުޙަބާ!'}
                </h2>
                {branding.welcomeMessage && (
                  <p dir="auto" className="text-sm sm:text-lg text-slate-300 leading-relaxed font-normal max-w-3xl mx-auto whitespace-pre-line">
                    {branding.welcomeMessage}
                  </p>
                )}
                {branding.aboutText && (
                  <p dir="auto" className="text-xs sm:text-base text-slate-400 leading-relaxed font-normal max-w-3xl mx-auto whitespace-pre-line pt-1">
                    {branding.aboutText}
                  </p>
                )}
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
                  <a
                    href="/quiz"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 text-center"
                  >
                    <span>ރަމަޟާން ކުއިޒްގައި ބައިވެރިވެލައްވާ</span>
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                  <a
                    href="/about"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-semibold text-sm transition-all text-center flex items-center justify-center"
                  >
                    އަޅުގަނޑުމެންނާ ބެހޭ (About Us)
                  </a>
                </div>
              </div>
            </section>
          )
        )}

        {/* Health Awareness News Banner with Scrolling Text (Above Quiz Section) */}
        <HealthAwarenessBanner initialItems={data?.healthAwareness} />

        {/* Section 3: Ramazan Quiz (Featured First) */}
        {sectionVisibility.ramazan_quiz && (
          <QuizSection />
        )}

        {/* Section 4: Events Section (Below Quiz, auto-hides if empty) */}
        <EventsSection events={events} />

        {/* About Us Block (Arranged on Landing Page) */}
        <div id="about-us-sections" className="border-t border-slate-800/80">
          {/* Section: About ARC Club (Linked with Portal Content Settings) */}
          {sectionVisibility.welcome && branding.aboutText && (
            <section id="about-arc-club" className="py-16 sm:py-20 bg-gradient-to-b from-slate-900/90 to-slate-950 border-b border-slate-800/80 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ކްލަބާ ބެހޭ މަޢުލޫމާތު (About ARC Club)</span>
                </span>
                
                <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-normal leading-relaxed" dir="auto">
                  {branding.clubName || 'އާނަންދަ ރިކުރިއޭޝަން ކުލަބު (ARC)'}
                </h2>

                <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal whitespace-pre-line max-w-3xl mx-auto text-justify sm:text-center" dir="auto">
                  {branding.aboutText}
                </p>

                <div className="pt-2 flex justify-center">
                  <a
                    href="/about"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white text-xs font-semibold transition-all shadow-md hover:scale-105 active:scale-95"
                  >
                    <span>އިތުރު ތަފްޞީލް (More Details)</span>
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  </a>
                </div>
              </div>
            </section>
          )}

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
  </PageTransition>
  );
};
