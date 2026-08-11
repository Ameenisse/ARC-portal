import React, { useEffect, useState } from 'react';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { EventsSection } from '../../components/public/EventsSection';
import { api } from '../../services/api';
import { PublicSiteData } from '../../types';
import { Calendar, ArrowRight, Home } from 'lucide-react';

export const EventsPage: React.FC = () => {
  const [data, setData] = useState<PublicSiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicSiteData()
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const events = data?.events || [];
  const hasEvents = events.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white" dir="rtl">
      <PublicHeader branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} activePath="/events" hasEvents={hasEvents} />

      <main className="flex-1">
        {/* Banner */}
        <section className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>ކްލަބްގެ ޙަރަކާތްތައް</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-heading tracking-tight">
              ޙަރަކާތްތަކާއި ފޮޓޯ އަލްބަމް
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
              އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ އިޖުތިމާއީ، ކުޅިވަރު އަދި ދީނީ އެކިއެކި ހަރަކާތްތަކުގެ ފޮޓޯ އަލްބަމްތައް.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <span>ޙަރަކާތްތައް ލޯޑުވަނީ...</span>
          </div>
        ) : hasEvents ? (
          <EventsSection events={events} />
        ) : (
          <div className="py-24 text-center space-y-4 max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white font-heading">އަދި އެއްވެސް ޙަރަކާތެއް ނެތެވެ</h3>
            <p className="text-xs text-slate-400">
              އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ އެއްވެސް ޙަރަކާތެއް އަދި ޝާޢިއުކުރެވިފައެއް ނެތެވެ.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Home className="w-4 h-4" />
              <span>ފެށޭ ޞަފްޙާއަށް އެނބުރި ވަޑައިގަންނަވާ</span>
            </a>
          </div>
        )}
      </main>

      <PublicFooter
        branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }}
        contacts={data?.contacts}
        socialLinks={data?.socialLinks}
        hasEvents={hasEvents}
      />
    </div>
  );
};
