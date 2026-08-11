import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PublicSiteData } from '../../types';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { QuizSection } from '../../components/public/QuizSection';

export const QuizPage: React.FC = () => {
  const [data, setData] = useState<PublicSiteData | null>(null);

  useEffect(() => {
    api.getPublicSiteData().then(setData).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <PublicHeader branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} activePath="/quiz" />
      <main className="flex-1 py-8">
        <QuizSection />
      </main>
      <PublicFooter branding={data?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} socialLinks={data?.socialLinks} />
    </div>
  );
};
