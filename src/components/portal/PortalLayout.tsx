import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { ServerTimeBadge } from '../common/ServerTimeBadge';
import { useToast } from '../common/Toast';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  FileText,
  Users,
  HelpCircle,
  Award,
  UserCheck,
  History,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Mail,
  BookOpen,
  CheckCheck,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { ModuleKey } from '../../types';

interface PortalLayoutProps {
  currentModule: ModuleKey | 'profile';
  title: string;
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ currentModule, title, children }) => {
  const { user, loading, logout, hasPermission } = useAuth();
  const { showToast } = useToast();
  const { lang, setLang, dir } = usePortalLanguage();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isExpanded = !sidebarCollapsed || isHovered;

  // Notification and Messages Badge State
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const fetchBadges = async () => {
      try {
        const [msgRes, notifRes] = await Promise.all([
          api.getMessages().catch(() => ({ unreadCount: 0 })),
          api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 }))
        ]);
        if (isMounted) {
          setUnreadMsgCount(msgRes.unreadCount || 0);
          setUnreadNotifCount(notifRes.unreadCount || 0);
          setRecentNotifs(notifRes.notifications?.slice(0, 5) || []);
        }
      } catch (e) {
        console.warn('Failed to fetch header badges', e);
      }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [user]);

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadNotifCount(0);
      setRecentNotifs(prev => prev.map(n => ({ ...n, readBy: user ? [...(n.readBy || []), user.id] : n.readBy })));
      showToast('success', 'All notifications marked as read');
    } catch (err) {
      showToast('error', 'Failed to update notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4" dir="rtl">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">އެޑްމިން ޕޯޓަލް ލޯޑުވަނީ...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userDisplayName = user.fullName || user.username || 'User';
  const userDisplayInitial = (userDisplayName || 'U').charAt(0).toUpperCase();
  const userRole = user.roleName || 'Member';
  const userDesignation = user.designation || '';

  const isClubMember = user.roleName === 'Club Member' || user.roleId === 'role_member';
  const isAdmin = Boolean(
    user && (
      user.roleName === 'Admin' ||
      user.roleId === 'role_admin' ||
      user.roleName?.toLowerCase().includes('admin')
    )
  );

  const menuItems: Array<{ key: ModuleKey; labelDv: string; labelEn: string; icon: any; href: string }> = [
    { key: 'dashboard', labelDv: 'ޑޭޝްބޯޑު', labelEn: 'Dashboard', icon: LayoutDashboard, href: '/portal' },
    { key: 'budget', labelDv: 'ބަޖެޓާއި ފައިސާ', labelEn: 'Budget & Finance', icon: Wallet, href: '/portal/budget' },
    { key: 'members', labelDv: 'މެންބަރުންގެ ލިސްޓް', labelEn: 'Members Directory', icon: UserCheck, href: '/portal/members' },
    { key: 'events_meetings', labelDv: 'ޙަރަކާތްތަކާއި ބައްދަލުވުން', labelEn: 'Events & Meetings', icon: Award, href: '/portal/events-meetings' },
    { key: 'ramazan_quiz', labelDv: 'ރަމަޟާން ކުއިޒް', labelEn: 'Ramadan Quiz', icon: HelpCircle, href: '/portal/ramazan-quiz' },
    { key: 'messages', labelDv: 'މެސެޖު އިންބޮކްސް', labelEn: 'Message Inbox', icon: Mail, href: '/portal/messages' },
    { key: 'content', labelDv: 'ޕަބްލިކް ސައިޓް', labelEn: 'Website Content', icon: FileText, href: '/portal/content' },
    { key: 'users', labelDv: 'ޔޫޒަރުން ބެލެހެއްޓުން', labelEn: 'Users & Roles', icon: Users, href: '/portal/users' },
    { key: 'audit_logs', labelDv: 'އޮޑިޓް ލޮގް', labelEn: 'Audit Logs', icon: History, href: '/portal/audit-logs' },
    { key: 'club_rules', labelDv: 'ކްލަބް ޤަވާޢިދު', labelEn: 'Club Rules', icon: BookOpen, href: '/portal/club-rules' },
    {
      key: 'settings',
      labelDv: isAdmin ? 'އެޑްމިން ކޮންޓްރޯލަރ' : 'އާންމު ސެޓިންގްސް',
      labelEn: isAdmin ? 'Admin Controller' : 'General Settings',
      icon: Settings,
      href: '/portal/settings'
    }
  ];

  // Filter allowed modules with fallback check for grouped modules
  const allowedMenuItems = menuItems.filter(item => {
    if (isClubMember) {
      return item.key === 'dashboard';
    }
    if (item.key === 'audit_logs') {
      return isAdmin;
    }
    if (item.key === 'ramazan_quiz') {
      return hasPermission('ramazan_quiz', 'canView') || hasPermission('quiz_participants', 'canView') || hasPermission('quiz_winners', 'canView');
    }
    if (item.key === 'content') {
      return hasPermission('content', 'canView') || hasPermission('slideshow', 'canView') || hasPermission('vision_mission', 'canView') || hasPermission('contact', 'canView') || hasPermission('social_media', 'canView') || hasPermission('exco_team', 'canView');
    }
    if (item.key === 'users') {
      return hasPermission('users', 'canView') || hasPermission('roles_permissions', 'canView');
    }
    return hasPermission(item.key, 'canView');
  });

  const getDisplayTitle = (rawTitle: string) => {
    if (lang !== 'english') return rawTitle;
    if (rawTitle === 'މެންބަރުގެ ޑޭޝްބޯޑު') return 'Members Dashboard';
    if (rawTitle === 'އެޑްމިން ޑޭޝްބޯޑު') return 'Admin Dashboard';
    if (rawTitle === 'ހިންގާ ކޮމިޓީގެ ޑޭޝްބޯޑު') return 'EXCO Dashboard';
    return rawTitle;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <ErrorBoundary fallbackTitle="Portal layout display error">
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans" dir={dir}>
        
        {/* Desktop Collapsible & Auto-Hiding Sidebar */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`hidden md:flex flex-col bg-slate-900 ${dir === 'rtl' ? 'border-l' : 'border-r'} border-slate-800 transition-all duration-300 z-30 ${
            isExpanded ? 'w-64 shadow-2xl' : 'w-20'
          }`}
        >
          
          {/* Sidebar Header */}
          <div className="h-20 px-4 flex items-center justify-between border-b border-slate-800">
            {isExpanded ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-base shrink-0">
                  ARC
                </div>
                <div className="truncate">
                  <span className="font-heading font-bold text-base text-white block truncate">ARC Portal</span>
                  <span className="text-[10px] uppercase text-orange-400 tracking-wider block font-semibold">
                    {userRole}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-base mx-auto">
                A
              </div>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={sidebarCollapsed ? "Pin sidebar open" : "Auto-hide sidebar"}
            >
              {dir === 'rtl' ? (
                sidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
              ) : (
                sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {allowedMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentModule === item.key;
              const label = lang === 'english' ? item.labelEn : item.labelDv;
              return (
                <a
                  key={item.key}
                  id={`sidebar_link_${item.key}`}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={!isExpanded ? label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {isExpanded && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{label}</span>
                      {item.key === 'messages' && unreadMsgCount > 0 && (
                        <span className="ml-auto px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                          {unreadMsgCount}
                        </span>
                      )}
                    </div>
                  )}
                  {!isExpanded && item.key === 'messages' && unreadMsgCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-slate-900" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* User Mini Profile / Controller Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80">
            {isAdmin ? (
              <a
                href="/portal/settings"
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors border border-orange-500/20 bg-orange-500/5"
                title={lang === 'english' ? 'Admin Controller & System Settings' : 'އެޑްމިން ކޮންޓްރޯލަރ އަދި ސިސްޓަމް ސެޓިންގްސް'}
              >
                <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                  <Shield className="w-4 h-4 text-orange-400" />
                </div>
                {isExpanded && (
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-white truncate">{userDisplayName}</p>
                    <p className="text-[10px] text-orange-400 font-semibold truncate">
                      {lang === 'english' ? 'Admin Controller' : 'އެޑްމިން ކޮންޓްރޯލަރ'}
                    </p>
                  </div>
                )}
              </a>
            ) : (
              <a
                href="/portal/profile"
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                  {userDisplayInitial}
                </div>
                {isExpanded && (
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-white truncate">{userDisplayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{userDesignation}</p>
                  </div>
                )}
              </a>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Header Bar */}
          <header className="h-16 sm:h-20 bg-slate-900 border-b border-slate-800 px-3 sm:px-8 flex items-center justify-between z-20 gap-2">
            
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 shrink-0 touch-manipulation"
                aria-label="Open portal navigation menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold font-heading text-white truncate">{getDisplayTitle(title)}</h1>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                  {lang === 'english'
                    ? `Logged in as ${userDisplayName} (${userRole})`
                    : `ލޮގިންވެފައިވަނީ ${userDisplayName} (${userRole})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              
              {/* Server Hosting Time Badge */}
              <div className="hidden lg:block">
                <ServerTimeBadge className="border-slate-800 bg-slate-950/90 py-1.5 px-3 text-xs" />
              </div>

              {/* Language Toggle Button */}
              <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded-xl p-0.5 gap-0.5 shadow-inner" dir="ltr">
                <button
                  type="button"
                  onClick={() => setLang('dhivehi')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-extrabold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                    lang === 'dhivehi'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ދިވެހި
                </button>
                <button
                  type="button"
                  onClick={() => setLang('english')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-extrabold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                    lang === 'english'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 relative transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-slate-900" />
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className={`absolute top-full mt-2 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-80 max-w-[90vw] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3`}>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-xs text-white">
                        {lang === 'english' ? 'Notifications' : 'ނޯޓިފިކޭޝަން'}
                      </span>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotifsRead}
                          className="text-[10px] text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>{lang === 'english' ? 'Mark all read' : 'ހުރިހާ ބެލި ކަމުގައި ހަދާ'}</span>
                        </button>
                      )}
                    </div>

                    {recentNotifs.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {recentNotifs.map(n => {
                          const isRead = user && (n.readBy || []).includes(user.id);
                          return (
                            <div key={n.id} className={`p-2 rounded-xl text-xs ${isRead ? 'bg-slate-950/40 text-slate-400' : 'bg-orange-500/10 text-orange-200 border border-orange-500/20'}`}>
                              <p className="font-bold text-white text-[11px]">{n.title}</p>
                              <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-slate-500 py-3">
                        {lang === 'english' ? 'No recent notifications' : 'އެއްވެސް ނޯޓިފިކޭޝަނެއް ނެތް'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* View Public Website Link */}
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
                title={lang === 'english' ? 'View Public Site' : 'މައި ވެބްސައިޓް ބައްލަވާ'}
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                <span>{lang === 'english' ? 'Public Site' : 'ވެބްސައިޓް'}</span>
              </a>

              {/* User Avatar / Controller link */}
              {isAdmin ? (
                <a
                  href="/portal/settings"
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-950 border border-orange-500/30 hover:border-orange-500/60 transition-colors"
                  title={lang === 'english' ? 'Admin Controller & System Settings' : 'އެޑްމިން ކޮންޓްރޯލަރ'}
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-bold text-xs">
                    <Shield className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-200 max-w-[120px] truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-[9px] text-orange-400 font-semibold">
                      {lang === 'english' ? 'Admin Controller' : 'އެޑްމިން ކޮންޓްރޯލަރ'}
                    </span>
                  </div>
                </a>
              ) : (
                <a
                  href="/portal/profile"
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs">
                    {userDisplayInitial}
                  </div>
                  <span className="text-xs font-bold text-slate-200 hidden md:block max-w-[120px] truncate">
                    {userDisplayName}
                  </span>
                </a>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title={lang === 'english' ? 'Logout' : 'ލޮގްއައުޓް'}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </header>

          {/* Page Children Container */}
          <main className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
            <ErrorBoundary fallbackTitle="Module error">
              {children}
            </ErrorBoundary>
          </main>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" dir={dir}>
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity" onClick={() => setMobileDrawerOpen(false)} />
            <div className={`relative w-80 max-w-[85vw] bg-slate-900 h-full p-4 flex flex-col z-10 ${dir === 'rtl' ? 'border-l' : 'border-r'} border-slate-800 shadow-2xl`}>
              
              {/* Top User Info & Close */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-base shrink-0 border border-orange-500/30">
                    {isAdmin ? <Shield className="w-5 h-5 text-orange-400" /> : userDisplayInitial}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-white text-sm block truncate">{userDisplayName}</span>
                    <span className="text-[11px] text-orange-400 font-semibold block truncate">
                      {isAdmin ? (lang === 'english' ? 'Admin Controller' : 'އެޑްމިން ކޮންޓްރޯލަރ') : userRole}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Server Time Display */}
              <div className="mb-3">
                <ServerTimeBadge className="w-full justify-center border-slate-800 bg-slate-950 py-1.5 text-xs" />
              </div>

              {/* Navigation links */}
              <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
                {allowedMenuItems.map(item => {
                  const Icon = item.icon;
                  const label = lang === 'english' ? item.labelEn : item.labelDv;
                  const isActive = currentModule === item.key;
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-orange-400'}`} />
                        <span>{label}</span>
                      </div>
                      {item.key === 'messages' && unreadMsgCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                          {unreadMsgCount}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>

              {/* Mobile Bottom Actions */}
              <div className="pt-3 border-t border-slate-800 space-y-2 mt-auto">
                {isAdmin ? (
                  <a
                    href="/portal/settings"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-orange-400 hover:text-white hover:bg-slate-800 transition-colors border border-orange-500/20"
                  >
                    <Settings className="w-4 h-4 text-orange-400" />
                    <span>{lang === 'english' ? 'Admin Controller Settings' : 'އެޑްމިން ކޮންޓްރޯލަރ ސެޓިންގްސް'}</span>
                  </a>
                ) : (
                  <a
                    href="/portal/profile"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-orange-400" />
                    <span>{lang === 'english' ? 'Profile Settings' : 'ޕްރޯފައިލް ސެޓިންގްސް'}</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{lang === 'english' ? 'Logout' : 'ލޮގްއައުޓް'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
};

export default PortalLayout;
