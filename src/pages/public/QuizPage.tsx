import React from 'react';
import { usePublicSiteData } from '../../hooks/usePublicSiteData';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { QuizSection } from '../../components/public/QuizSection';
import { PageTransition } from '../../components/common/PageTransition';

export const QuizPage: React.FC = () => {
  const { data } = usePublicSiteData();

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicHeader branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} activePath="/quiz" />
        <main className="flex-1 py-8">
          <QuizSection />
        </main>
        <PublicFooter branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} socialLinks={data?.socialLinks} />
      </div>
    </PageTransition>
  );
};
