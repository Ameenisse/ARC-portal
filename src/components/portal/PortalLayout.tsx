import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { ServerTimeBadge } from '../common/ServerTimeBadge';
import { RealtimeSyncBadge } from '../common/RealtimeSyncBadge';
import { useToast } from '../common/Toast';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  Image,
  FileText,
  Compass,
  PhoneCall,
  Share2,
  Users,
  HelpCircle,
  Award,
  UserCheck,
  ShieldAlert,
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
  const { user, loading, logout, hasPermission, refreshUser } = useAuth();
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
    const interval = setInterval(fetchBadges, 30000); // refresh every 30s
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

  const menuItems: Array<{ key: ModuleKey; labelDv: string; labelEn: string; icon: any; href: string }> = [
    { key: 'dashboard', labelDv: 'ޑޭޝްބޯޑު', labelEn: 'Dashboard', icon: LayoutDashboard, href: '/portal' },
    { key: 'members', labelDv: 'މެންބަރުންގެ ލިސްޓް', labelEn: 'Members Directory', icon: UserCheck, href: '/portal/members' },
    { key: 'budget', labelDv: 'މާލީ ބަޖެޓް', labelEn: 'Budget & Finance', icon: Wallet, href: '/portal/budget' },
    { key: 'events_meetings', labelDv: 'ޙަރަކާތްތަކާއި ބައްދަލުވުން', labelEn: 'Events & Meetings', icon: Award, href: '/portal/events-meetings' },
    { key: 'ramazan_quiz', labelDv: 'ރަމަޟާން ކުއިޒް', labelEn: 'Ramadan Quiz', icon: HelpCircle, href: '/portal/ramazan-quiz' },
    { key: 'messages', labelDv: 'މެސެޖު އިންބޮކްސް', labelEn: 'Message Inbox', icon: Mail, href: '/portal/messages' },
    { key: 'content', labelDv: 'ޕަބްލިކް ސައިޓް', labelEn: 'Website Content', icon: FileText, href: '/portal/content' },
    { key: 'users', labelDv: 'ޔޫޒަރުން ބެލެހެއްޓުން', labelEn: 'Users & Roles', icon: Users, href: '/portal/users' },
    { key: 'audit_logs', labelDv: 'އޮޑިޓް ލޮގް', labelEn: 'Audit Logs', icon: History, href: '/portal/audit-logs' },
    { key: 'club_rules', labelDv: 'ކްލަބް ޤަވާޢިދު', labelEn: 'Club Rules', icon: BookOpen, href: '/portal/club-rules' },
    { key: 'settings', labelDv: 'އާންމު ސެޓިންގްސް', labelEn: 'General Settings', icon: Settings, href: '/portal/settings' }
  ];

  const isClubMember = user.roleName === 'Club Member' || user.roleId === 'role_member';

  // Filter allowed modules with fallback check for grouped modules
  const allowedMenuItems = menuItems.filter(item => {
    if (isClubMember) {
      return item.key === 'dashboard';
    }
    if (item.key === 'audit_logs') {
      const isAdmin = user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName?.toLowerCase().includes('admin');
      return isAdmin;
    }
    if (item.key === 'budget') {
      const isAdmin = user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName?.toLowerCase().includes('admin');
      const isTreasurer = user.roleName === 'Treasurer' || user.roleId === 'role_treasurer' || user.roleName?.toLowerCase().includes('treasurer') || user.designation?.toLowerCase().includes('treasurer');
      const isExco = user.roleName === 'EXCO Member' || user.roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(user.roleId);
      return isAdmin || isTreasurer || isExco || hasPermission('budget', 'canView');
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
                  {user.roleName}
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

        {/* User Mini Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <a
            href="/portal/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
              {user.fullName.charAt(0)}
            </div>
            {isExpanded && (
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-white truncate">{user.fullName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.designation}</p>
              </div>
            )}
          </a>
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
                  ? `Logged in as ${user.fullName} (${user.roleName})`
                  : `ލޮގިންވެފައިވަނީ ${user.fullName} (${user.roleName})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Realtime Database Sync Badge */}
            <div className="hidden sm:block">
              <RealtimeSyncBadge theme="dark" />
            </div>

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
                className={`px-2 sm:px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-[11px] transition-all cursor-pointer ${
                  lang === 'english'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ENG
              </button>
            </div>

            {/* Messages Inbox Button */}
            <a
              href="/portal/messages"
              className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title={lang === 'english' ? "Message Inbox" : "މެސެޖު އިންބޮކްސް"}
            >
              <Mail className="w-4 h-4 text-orange-400" />
              {unreadMsgCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[9px] font-bold animate-pulse">
                  {unreadMsgCount}
                </span>
              )}
            </a>

            {/* Notifications Popover Bell Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                title={lang === 'english' ? "Notifications" : "ނޮޓިފިކޭޝަން"}
              >
                <Bell className="w-4 h-4 text-purple-400" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[9px] font-bold">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notifDropdownOpen && (
                <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} mt-2 w-72 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">
                        {lang === 'english' ? 'Notifications' : 'ނޮޓިފިކޭޝަން'}
                      </span>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotifsRead}
                        className="text-[10px] text-orange-400 hover:underline font-semibold"
                      >
                        {lang === 'english' ? 'Mark all as read' : 'ހުރިހާ އެއްޗެއް ކިޔުނު ކަމަށް ހަދާ'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {recentNotifs.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-4">
                        {lang === 'english' ? 'No recent notifications' : 'އެއްވެސް ނޮޓިފިކޭޝަނެއް ނެތެވެ'}
                      </p>
                    ) : (
                      recentNotifs.map(n => {
                        const isRead = user && (n.readBy || []).includes(user.id);
                        return (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl border text-xs transition-colors ${
                              isRead
                                ? 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                                : 'bg-slate-800/80 border-purple-500/40 text-white'
                            }`}
                          >
                            <p className="font-bold text-slate-200 truncate">{n.title}</p>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-center">
                    <a
                      href="/portal/messages"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs font-bold text-orange-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{lang === 'english' ? 'View All Inbox & Notifications' : 'ހުރިހާ މެސެޖުތައް ބައްލަވާ'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <a
              href="/portal/profile"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Profile Settings"
            >
              <UserIcon className="w-4 h-4 text-orange-400" />
              <span className="hidden md:inline">
                {lang === 'english' ? 'Profile' : 'ޕްރޯފައިލް'}
              </span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title={lang === 'english' ? "Logout" : "ލޮގްއައުޓް"}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">
                {lang === 'english' ? 'Logout' : 'ލޮގްއައުޓް'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Children Container */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
          {children}
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
                  {user.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-white text-sm block truncate">{user.fullName}</span>
                  <span className="text-[11px] text-orange-400 font-semibold block truncate">{user.roleName}</span>
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
              <a
                href="/portal/profile"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <UserIcon className="w-4 h-4 text-orange-400" />
                <span>{lang === 'english' ? 'Profile Settings' : 'ޕްރޯފައިލް ސެޓިންގްސް'}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'english' ? 'Logout' : 'ލޮގްއައުޓް'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
