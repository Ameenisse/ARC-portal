import React, { useState } from 'react';
import { Menu, X, Sparkles, BookOpen, Users, PhoneCall, Home, LogIn, LayoutDashboard, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ServerTimeBadge } from '../common/ServerTimeBadge';

interface PublicHeaderProps {
  branding: {
    clubName: string;
    clubAbbreviation: string;
    logo?: string;
    useLogo?: boolean;
    headerTitle?: string;
  };
  activePath?: string;
  hasEvents?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ branding, activePath = '/', hasEvents = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const showLogoImage = Boolean(branding?.useLogo && branding?.logo && branding.logo.trim() !== '');

  const navLinks = [
    { name: 'ފެށުން', href: '/', icon: Home },
    { name: 'ރަމަޟާން ކުއިޒް', href: '/quiz', icon: BookOpen },
    ...(hasEvents ? [{ name: 'ޙަރަކާތްތައް', href: '/events', icon: Calendar }] : []),
    { name: 'އަޅުގަނޑުމެންނާ ބެހޭ', href: '/about', icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Name */}
          <a href="/" id="header_brand_link" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 max-w-[60%] sm:max-w-none">
            {showLogoImage ? (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-slate-800 border border-slate-700/80 p-0.5 overflow-hidden flex items-center justify-center shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform shrink-0">
                <img src={branding.logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span>{branding.clubAbbreviation || 'ARC'}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-heading font-extrabold text-base sm:text-xl tracking-tight text-white group-hover:text-orange-400 transition-colors block truncate">
                {branding.clubName || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް'}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-orange-400/90 font-medium block truncate">
                އާނަންދާ ރީކްރިއޭޝަން ކްލަބް (ARC)
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {/* Server Hosting Time Badge */}
            <ServerTimeBadge className="mr-1 border-slate-700/60 bg-slate-950/90" />

            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = activePath === link.href;
              return (
                <a
                  key={link.name}
                  id={`nav_${(link?.href || '').replace('/', '') || 'home'}`}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 text-orange-400" />
                  <span>{link.name}</span>
                </a>
              );
            })}

            {/* Portal Login Button */}
            {isAuthenticated ? (
              <a
                href="/portal"
                id="header_portal_btn"
                className="mr-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>ޕޯޓަލް ({(user?.fullName || user?.username || 'User').split(' ')[0]})</span>
              </a>
            ) : (
              <a
                href="/login"
                id="header_login_btn"
                className="mr-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-orange-500/40 text-orange-400 text-xs font-bold hover:bg-orange-500 hover:text-white transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>ޕޯޓަލް އަށް ވަނުމަށް (ލޮގިން)</span>
              </a>
            )}
          </nav>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <ServerTimeBadge showIcon={false} className="border-slate-800 bg-slate-950 py-1 px-2 text-[11px]" />
            <button
              id="mobile_menu_toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 space-y-2 animate-slide-down">
          {navLinks.map(link => {
            const Icon = link.icon;
            return (
              <a
                key={link.name}
                id={`mobile_nav_${(link?.href || '').replace('/', '') || 'home'}`}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <Icon className="w-5 h-5 text-orange-400" />
                <span>{link.name}</span>
              </a>
            );
          })}

          <div className="pt-2 border-t border-slate-800">
            {isAuthenticated ? (
              <a
                href="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>ޕޯޓަލް އަށް ދިއުމަށް ({user?.fullName || user?.username || 'User'})</span>
              </a>
            ) : (
              <a
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-800 border border-orange-500/50 text-orange-400 font-bold text-sm"
              >
                <LogIn className="w-5 h-5" />
                <span>ޕޯޓަލް އަށް ވަނުމަށް (ލޮގިން)</span>
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

