import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, X, Sparkles, BookOpen, Users, PhoneCall, Home, LogIn, 
  LayoutDashboard, Calendar, Package, HeartPulse, ExternalLink, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ServerTimeBadge } from '../common/ServerTimeBadge';
import { PrayerTimeWidget } from './PrayerTimeWidget';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const logoUrl = (branding?.logo && branding.logo.trim() !== '') ? branding.logo : '/arc-app-icon.png';
  const showLogoImage = branding?.useLogo !== false;

  // Lock background scrolling when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Close sidebar on escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Selected navigation items moved to the sidebar drawer
  const sidebarNavItems = [
    { 
      id: 'nav_quiz', 
      name: 'ރަމަޟާން ކުއިޒް', 
      href: '/quiz', 
      icon: BookOpen,
      desc: 'އިނާމު ލިބޭ ދީނީ ކުއިޒް މުބާރާތް'
    },
    ...(hasEvents ? [{ 
      id: 'nav_events', 
      name: 'ޙަރަކާތްތައް', 
      href: '/events', 
      icon: Calendar,
      desc: 'ކްލަބްގެ އިވެންޓްތަކާއި އަލްބަމް'
    }] : []),
    { 
      id: 'nav_rental', 
      name: 'ރެންޓަލް ސާވިސް', 
      href: '/rental', 
      icon: Package,
      desc: 'ތަކެތި ކުއްޔަށް ނެގުމަށް އެދޭ ފޯމު'
    },
    { 
      id: 'nav_about', 
      name: 'އަޅުގަނޑުމެންނާ ބެހޭ', 
      href: '/about', 
      icon: Sparkles,
      desc: 'ކްލަބްގެ ތާރީޚާއި ހިންގާ ކޮމިޓީ'
    },
    { 
      id: 'nav_health', 
      name: 'ޞިއްޙީ ހޭލުންތެރިކަން', 
      href: '/health-awareness', 
      icon: HeartPulse,
      desc: 'ދުޅަހެޔޮ ޞިއްޙަތާއި ޢާންމު އިރުޝާދު'
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            
            {/* Right Side: Navigation Controls (Sidebar Menu, Home Button, Prayer Time, Server Time) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* 1. Sidebar Button (OPENS SIDEBAR DRAWER WITH SELECTED BUTTONS) */}
              <button
                type="button"
                id="header_sidebar_toggle"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                aria-label="ސައިޑްބާ މެނޫ ހުޅުވާލައްވާ"
              >
                <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>މެނޫ</span>
              </button>

              {/* 2. Home Button (KEPT IN NAVBAR) */}
              <Link
                id="nav_home"
                to="/"
                className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                  activePath === '/'
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
                title="މައި ސަފްހާ"
              >
                <Home className="w-4 h-4 text-orange-400" />
                <span>ފެށުން</span>
              </Link>

              {/* 3. Prayer Time Widget (MOVED TO NAVBAR NEXT TO HOME BUTTON) */}
              <PrayerTimeWidget inNavbar={true} className="shrink-0" />

              {/* 4. Server Time Badge (DESKTOP ONLY: Wrapped in dedicated hidden lg:flex container to eliminate mobile display conflicts) */}
              <div className="hidden lg:flex shrink-0">
                <ServerTimeBadge className="border-slate-700/60 bg-slate-950/90" />
              </div>
            </div>

            {/* Left Side: Logo & Brand Name (Adaptive flex-1 to prevent left edge clipping on mobile) */}
            <Link to="/" id="header_brand_link" dir="ltr" className="flex items-center gap-2 sm:gap-3 group min-w-0 flex-1 justify-end sm:justify-start max-w-[65%] sm:max-w-none">
              {showLogoImage ? (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-800 border border-slate-700/80 p-0.5 overflow-hidden flex items-center justify-center shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform shrink-0">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg sm:rounded-xl" />
                </div>
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <span>{branding.clubAbbreviation || 'ARC'}</span>
                </div>
              )}
              <div className="min-w-0 flex-1" dir="rtl">
                <span className="font-heading font-extrabold text-sm sm:text-lg lg:text-xl tracking-tight text-white group-hover:text-orange-400 transition-colors block truncate">
                  {branding.clubName || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް'}
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-orange-400/90 font-medium block truncate">
                  އާނަންދާ ރީކްރިއޭޝަން ކްލަބް (ARC)
                </span>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Modern Slide-over Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-3">
                  {showLogoImage ? (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-0.5 overflow-hidden flex items-center justify-center">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      <span>{branding.clubAbbreviation || 'ARC'}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-extrabold font-heading text-white tracking-tight">
                      {branding.clubName || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް'}
                    </h3>
                    <p className="text-[10px] text-orange-400 font-medium tracking-wide">
                      ސައިޑްބާ މެނޫ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="sidebar_close_btn"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
                  aria-label="ސައިޑްބާ ލައްޕާލައްވާ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body - Selected Navigation Buttons */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
                {/* Main Home Quick Link */}
                <div>
                  <Link
                    to="/"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      activePath === '/'
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-slate-800/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                        <Home className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold block">ފެށުން</span>
                        <span className="text-[11px] text-slate-400">މައި ވެބްސައިޓަށް ދިއުމަށް</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 rotate-180" />
                  </Link>
                </div>

                {/* Section Header */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                    ޚިދުމަތްތަކާއި ޕޭޖްތައް
                  </span>

                  {/* Selected Buttons Group */}
                  <div className="space-y-2">
                    {sidebarNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePath === item.href;
                      return (
                        <Link
                          key={item.id}
                          id={item.id}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${
                            isActive
                              ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-sm'
                              : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              isActive
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-slate-800 text-orange-400 group-hover:scale-105 group-hover:bg-orange-500/15'
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold block">
                                  {item.name}
                                </span>
                                {item.id === 'nav_quiz' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ކުއިޒް
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {item.desc}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors rotate-180" />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Server Time in Drawer */}
                <div className="pt-2">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">ސަރވަރ ހޯސްޓިންގ ގަޑި:</span>
                    <ServerTimeBadge showIcon={false} className="border-slate-800 bg-slate-900 py-1 px-2.5 text-[11px]" />
                  </div>
                </div>
              </div>

              {/* Drawer Footer - Selected Portal / Login Button */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-2">
                {isAuthenticated ? (
                  <Link
                    to="/portal"
                    id="header_portal_btn"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>ޕޯޓަލް އަށް ވަޑައިގަންނަވާ ({(user?.fullName || user?.username || 'User').split(' ')[0]})</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    id="header_login_btn"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl bg-slate-800 border border-orange-500/40 text-orange-400 hover:bg-orange-500 hover:text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>ޕޯޓަލް އަށް ވަނުމަށް (ލޮގިން)</span>
                  </Link>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default PublicHeader;

