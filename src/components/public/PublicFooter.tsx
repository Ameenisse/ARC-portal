import React from 'react';
import { Heart } from 'lucide-react';
import { SocialLink } from '../../types';

interface PublicFooterProps {
  branding: {
    clubName: string;
    clubAbbreviation: string;
    logo?: string;
    useLogo?: boolean;
    footerDescription?: string;
    copyrightText?: string;
  };
  socialLinks?: SocialLink[];
  hasEvents?: boolean;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ branding, socialLinks = [], hasEvents = false }) => {
  const showLogoImage = Boolean(branding?.useLogo && branding?.logo && branding.logo.trim() !== '');

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-slate-800/60">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {showLogoImage ? (
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-0.5 overflow-hidden flex items-center justify-center">
                  <img src={branding.logo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  {branding.clubAbbreviation || 'ARC'}
                </div>
              )}
              <span className="font-heading font-bold text-xl text-white">
                {branding.clubName || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް'}
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {branding.footerDescription || 'އިޖުތިމާއީ ގުޅުން ބަދަހިކުރުމާއި، ޒުވާނުންނާއި ކުޅިވަރުގެ ކުރިއެރުމަށް މަސައްކަތްކުރާ ޖަމްޢިއްޔާއެއް.'}
            </p>
          </div>

          {/* Quick Nav Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-heading">
              އަވަސް ލިންކުތައް
            </h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-orange-400 transition-colors">ފެށުން</a></li>
              <li><a href="/about" className="hover:text-orange-400 transition-colors">އަޅުގަނޑުމެންނާ ބެހޭ (About Us)</a></li>
              {hasEvents && (
                <li><a href="/events" className="hover:text-orange-400 transition-colors">ޙަރަކާތްތައް (Events)</a></li>
              )}
              <li><a href="/about#vision-mission" className="hover:text-orange-400 transition-colors">ވިޝަން އާއި މިޝަން</a></li>
              <li><a href="/quiz" className="hover:text-orange-400 transition-colors">ރަމަޟާން ކުއިޒް</a></li>
              <li><a href="/quiz/results" className="hover:text-orange-400 transition-colors">ކުރީގެ ނަތީޖާތަކާއި ކާމިޔާބީތައް</a></li>
              <li><a href="/about#exco-team" className="hover:text-orange-400 transition-colors">ހިންގާ ކޮމިޓީ (އެކްސްކޯ)</a></li>
              <li><a href="/about#contact" className="hover:text-orange-400 transition-colors">ގުޅުއްވުމަށް</a></li>
              <li><a href="/login" className="text-orange-400 hover:underline font-bold transition-colors">ޕޯޓަލް އަށް ވަނުމަށް (ލޮގިން)</a></li>
            </ul>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 font-heading">
              އަޅުގަނޑުމެންނާ ގުޅުންބަދަހިކުރައްވާ
            </h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {socialLinks.map(soc => (
                <a
                  key={soc.id}
                  href={soc.url}
                  target={soc.openInNewTab ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-orange-500/50 hover:bg-slate-800 transition-all capitalize flex items-center gap-2"
                >
                  <span>{soc.platform}</span>
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              ރަސްމީ މައުލޫމާތު ސާފުކުރެއްވުމަށް އަޅުގަނޑުމެންގެ ސިޓީ/ގުޅުއްވުމުގެ ޞަފްޙާ ބޭނުންކުރައްވާ.
            </p>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>{branding.copyrightText || `© ${new Date().getFullYear()} އާނަންދާ ރީކްރިއޭޝަން ކްލަބް (ARC). ހުރިހާ ހައްޤެއް މަޙްފޫޡްވެގެންވެއެވެ.`}</p>
          <div className="flex items-center gap-1">
            <span>އިޖުތިމާއީ އެއްބައިވަންތަކަމާއެކު</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};

