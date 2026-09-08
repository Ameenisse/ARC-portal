import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import { api } from '../../services/api';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { usePublicSiteData } from '../../hooks/usePublicSiteData';
import { PageLoader } from '../../components/common/PageLoader';
import { PageTransition } from '../../components/common/PageTransition';
import { HealthAwarenessItem, PublicSiteData } from '../../types';
import { 
  HeartPulse, Search, BookOpen, Clock, Calendar, Share2, ArrowRight, ArrowLeft, 
  ChevronRight, ExternalLink, Sparkles, AlertCircle, CheckCircle2, Home, Layers, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CACHED_HEALTH_KEY = 'arc_cached_health_items_v1';

const CATEGORY_ICONS: Record<string, string> = {
  'ޢާންމު ޞިއްޙަތު': '💧',
  'ކަސްރަތު': '🏃‍♂️',
  'ކެއިންބުއިން': '🥗',
  'ނަފްސާނީ ދުޅަހެޔޮކަން': '🧠',
  'ދިރިއުޅުމުގެ އާދަތައް': '🌿',
  'ހަމަނިދި': '🌙'
};

const isHtmlContent = (str?: string): boolean => {
  if (!str) return false;
  return /<[a-z][\s\S]*>/i.test(str);
};

const sanitizeHtmlContent = (html: string): string => {
  if (typeof window === 'undefined') return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const forbidden = ['script', 'iframe', 'object', 'embed'];
    forbidden.forEach(tag => doc.querySelectorAll(tag).forEach(el => el.remove()));
    doc.querySelectorAll('*').forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.toLowerCase().startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

export const HealthAwarenessPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: siteData } = usePublicSiteData();
  const [items, setItems] = useState<HealthAwarenessItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHED_HEALTH_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return !sessionStorage.getItem(CACHED_HEALTH_KEY);
      } catch (e) {
        return true;
      }
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  const topicParam = searchParams.get('topic');

  const fetchData = async (silent = false) => {
    if (!silent && items.length === 0) setLoading(true);
    try {
      const healthRes = await api.getPublicHealthAwareness().catch(() => []);
      if (Array.isArray(healthRes)) {
        setItems(healthRes);
        try {
          sessionStorage.setItem(CACHED_HEALTH_KEY, JSON.stringify(healthRes));
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Failed to load health awareness data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(items.length > 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Real-time updates when admin publishes or modifies topics in portal
  useTableSync(['health_awareness'], () => {
    fetchData(true);
  });

  const activeItems = useMemo(() => {
    return items.filter(i => i.status === 'active');
  }, [items]);

  // All distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeItems.forEach(i => {
      if (i.category && i.category.trim()) set.add(i.category.trim());
    });
    return Array.from(set);
  }, [activeItems]);

  // Filter items by search & category
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.title && item.title.toLowerCase().includes(q)) ||
        item.message.toLowerCase().includes(q) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [activeItems, selectedCategory, searchQuery]);

  // Active selected item (by topic param or first available)
  const activeItem = useMemo(() => {
    if (topicParam) {
      const found = activeItems.find(i => i.id === topicParam);
      if (found) return found;
    }
    return filteredItems[0] || activeItems[0] || null;
  }, [topicParam, activeItems, filteredItems]);

  const selectTopic = (id: string) => {
    setSearchParams({ topic: id }, { replace: true });
    // If mobile, scroll down to content
    if (window.innerWidth < 1024) {
      const el = document.getElementById('blog-main-content');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Find index of current item in list for next/prev navigation
  const currentIndex = activeItem ? activeItems.findIndex(i => i.id === activeItem.id) : -1;
  const prevItem = currentIndex > 0 ? activeItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < activeItems.length - 1 ? activeItems[currentIndex + 1] : null;

  // Other related topics (exclude active item)
  const relatedTopics = useMemo(() => {
    if (!activeItem) return [];
    return activeItems
      .filter(i => i.id !== activeItem.id)
      .slice(0, 3);
  }, [activeItems, activeItem]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
        <PublicHeader 
          branding={siteData?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} 
          activePath="/health-awareness" 
          hasEvents={Boolean(siteData?.events && siteData.events.length > 0)} 
        />

        <main className="flex-1 pb-16">
          {/* Hero Header Section */}
          <section className="bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border-b border-emerald-500/20 py-10 sm:py-14 relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-96 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-64 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 relative z-10">
              {/* Breadcrumbs */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-2">
                <Link to="/" className="hover:text-emerald-400 flex items-center gap-1 transition-colors">
                  <Home className="w-3.5 h-3.5" />
                  <span>ފެށުން</span>
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 rotate-180" />
                <span className="text-emerald-400 font-semibold">ޞިއްޙީ ހޭލުންތެރިކަމުގެ ބްލޮގް</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <HeartPulse className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>ޞިއްޙީ ހޭލުންތެރިކަން & ދުޅަހެޔޮކަން</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white font-heading tracking-tight">
                ޞިއްޙީ ހޭލުންތެރިކަމުގެ ބްލޮގް
              </h1>

              <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                ދުޅަހެޔޮ، ހަށިހެޔޮ ދިރިއުޅުމަކަށް ބޭނުންތެރި އިރުޝާދުތަކާއި ކާނާއާއި ކަސްރަތާ ގުޅޭ މުހިންމު މަޢުލޫމާތުތައް.
              </p>
            </div>
          </section>

          {loading ? (
            <div className="py-24 text-center max-w-md mx-auto">
              <PageLoader fullscreen={false} message="ޞިއްޙީ މަޢުލޫމާތުތައް ލޯޑުވަނީ..." />
            </div>
          ) : activeItems.length === 0 ? (
          <div className="py-24 text-center space-y-4 max-w-md mx-auto px-4">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
              <BookOpen className="w-8 h-8 text-emerald-500/50" />
            </div>
            <h3 className="text-xl font-bold text-white font-heading">އަދި އެއްވެސް ޞިއްޙީ މަޢުލޫމާތެއް ޝާއިޢުކުރެވިފައެއް ނެތެވެ</h3>
            <p className="text-xs text-slate-400">
              އިތުރު މަޢުލޫމާތު ވަރަށް އަވަހަށް އަޕްޑޭޓްކުރެވޭނެއެވެ.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all"
            >
              <span>ފެށޭ ޞަފްޙާއަށް އެނބުރި ވަޑައިގަންނަވާ</span>
            </Link>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* SIDEBAR: Topics List (In RTL, this appears on the right or can be browsed) */}
              <aside className="lg:col-span-4 space-y-5 order-2 lg:order-1">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm sticky top-24">
                  
                  <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <h2 className="font-heading font-extrabold text-white text-base">
                        ހުރިހާ މަޢުޟޫޢުތައް ({activeItems.length})
                      </h2>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      އިޚްތިޔާރު ކުރައްވާ
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="މަޢުޟޫޢު ހޯއްދަވާ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* Category Chips */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          selectedCategory === 'all'
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        ހުރިހާ
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            selectedCategory === cat
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          <span>{CATEGORY_ICONS[cat] || '📌'}</span>
                          <span>{cat}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Topics List */}
                  <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 select-none custom-scrollbar">
                    {filteredItems.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        މި ހޯއްދެވި ބަހަކަށް އެއްވެސް މަޢުޟޫޢެއް ނުފެނުނު
                      </div>
                    ) : (
                      filteredItems.map(item => {
                        const isSelected = activeItem?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => selectTopic(item.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group relative ${
                              isSelected
                                ? 'bg-gradient-to-r from-emerald-950/80 to-slate-900 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                                : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                            }`}
                          >
                            {/* Thumbnail Image */}
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60 relative">
                              <img
                                src={item.imageUrl || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80'}
                                alt={item.title || 'Health Tip'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                              />
                              {item.priority === 'urgent' && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {item.category && (
                                  <span className="text-[10px] text-emerald-400 font-semibold truncate">
                                    {item.category}
                                  </span>
                                )}
                                {item.priority === 'urgent' && (
                                  <span className="text-[9px] bg-red-950 text-red-300 px-1.5 py-0.2 rounded font-bold">
                                    މުހިންމު
                                  </span>
                                )}
                              </div>
                              <h3 className={`text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-emerald-300' : 'text-slate-200 group-hover:text-white'}`}>
                                {item.title || item.message.slice(0, 30)}
                              </h3>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {item.message}
                              </p>
                            </div>

                            {/* Active Indicator Arrow */}
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              </aside>

              {/* MAIN CONTENT AREA: Active Blog Post / Full Information */}
              <article id="blog-main-content" className="lg:col-span-8 space-y-6 order-1 lg:order-2">
                <AnimatePresence mode="wait">
                  {activeItem && (
                    <motion.div
                      key={activeItem.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                    >
                      {/* Hero Image */}
                      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-slate-950 overflow-hidden">
                        <img
                          src={activeItem.imageUrl || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80'}
                          alt={activeItem.title || 'Health Awareness'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          {activeItem.category && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-900/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-lg">
                              <Tag className="w-3 h-3 text-emerald-400" />
                              <span>{activeItem.category}</span>
                            </span>
                          )}
                          {activeItem.priority === 'urgent' && (
                            <span className="px-2.5 py-1 rounded-full bg-red-950/80 backdrop-blur-md border border-red-500/50 text-red-300 font-bold text-xs shadow-lg animate-pulse">
                              ޚާއްޞަ ސަމާލުކަމަށް
                            </span>
                          )}
                        </div>

                        {/* Share Button on Image */}
                        <div className="absolute top-4 left-4">
                          <button
                            type="button"
                            onClick={handleShare}
                            className="p-2.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-lg"
                            title="ލިންކު ކޮޕީކުރައްވާ"
                          >
                            <Share2 className="w-4 h-4 text-emerald-400" />
                            <span className="hidden sm:inline">{copiedLink ? 'ކޮޕީކުރެވިއްޖެ!' : 'ޙިއްޞާކުރައްވާ'}</span>
                          </button>
                        </div>

                        {/* Bottom Overlay Title Info */}
                        <div className="absolute bottom-4 right-4 left-4">
                          <div className="flex items-center gap-3 text-xs text-slate-300 mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>2 މިނެޓުގެ ކިޔުމެއް</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{new Date(activeItem.createdAt).toLocaleDateString('dv-MV')}</span>
                            </span>
                          </div>
                          <h1 className="text-xl sm:text-3xl font-extrabold text-white font-heading leading-tight drop-shadow-md">
                            {activeItem.title || 'ޞިއްޙީ އިރުޝާދު'}
                          </h1>
                        </div>
                      </div>

                      {/* Article Details & Text */}
                      <div className="p-6 sm:p-8 space-y-6">
                        
                        {/* Featured Advice Callout */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 text-emerald-100 flex items-start gap-3.5 shadow-sm">
                          <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
                            <HeartPulse className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                              މައިގަނޑު އިރުޝާދު (Primary Advice)
                            </span>
                            <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                              {activeItem.message}
                            </p>
                          </div>
                        </div>

                        {/* Detailed Content / Blog Story with Images & Rich Formatting */}
                        <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                          {activeItem.content ? (
                            isHtmlContent(activeItem.content) ? (
                              <div 
                                className="rich-article-content text-slate-200"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(activeItem.content) }}
                              />
                            ) : (
                              activeItem.content.split('\n\n').map((paragraph, pIdx) => {
                                if (paragraph.startsWith('•') || paragraph.includes('\n•')) {
                                  const bulletPoints = paragraph.split('\n').map(l => l.trim()).filter(Boolean);
                                  return (
                                    <div key={pIdx} className="space-y-2 my-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                                      {bulletPoints.map((b, bIdx) => (
                                        <div key={bIdx} className="flex items-start gap-2.5 text-slate-200">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                          <span>{b.replace(/^[•\-\*]\s*/, '')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <p key={pIdx} className="leading-relaxed">
                                    {paragraph}
                                  </p>
                                );
                              })
                            )
                          ) : (
                            <p className="text-slate-300 leading-relaxed">
                              {activeItem.message} ދުޅަހެޔޮ ޞިއްޙަތެއްގައި ހުރުމަށްޓަކައި މި އިރުޝާދަށް ޢަމަލުކުރުމަކީ ނުހަނު ބޭނުންތެރި ކަމެކެވެ. އާދަކާދައިގެ ތެރެއަށް މިކަންކަން ގެނައުމަކީ ދިގުމުއްދަތުގައި އޭގެ ފައިދާ ތިބާއަށާއި މުޅި ޢާއިލާއަށްވެސް ލިބިގެންދާނެ ކަމެކެވެ.
                            </p>
                          )}
                        </div>

                        {/* External reference link if provided */}
                        {activeItem.linkUrl && (
                          <div className="pt-2">
                            <a
                              href={activeItem.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 text-xs font-bold transition-all"
                            >
                              <span>{activeItem.linkLabel || 'އިތުރު މަޢުލޫމާތު ކިޔުއްވުމަށް (ރަސްމީ މަސްދަރު)'}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        {/* Navigation Between Topics */}
                        <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {prevItem ? (
                            <button
                              type="button"
                              onClick={() => selectTopic(prevItem.id)}
                              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-right transition-all group flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  ކުރީގެ މަޢުޟޫޢު
                                </span>
                                <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate block">
                                  {prevItem.title || prevItem.message}
                                </span>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                            </button>
                          ) : (
                            <div />
                          )}

                          {nextItem && (
                            <button
                              type="button"
                              onClick={() => selectTopic(nextItem.id)}
                              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group flex items-center justify-between gap-3"
                            >
                              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                              <div className="min-w-0 text-right">
                                <span className="text-[10px] text-slate-500 font-semibold block">
                                  ދެން އޮތް މަޢުޟޫޢު
                                </span>
                                <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate block">
                                  {nextItem.title || nextItem.message}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Related Topics Section */}
                {relatedTopics.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>އެހެނިހެން މަޢުޟޫޢުތައް</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {relatedTopics.map(rel => (
                        <div
                          key={rel.id}
                          onClick={() => selectTopic(rel.id)}
                          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden cursor-pointer group transition-all shadow-md hover:-translate-y-1"
                        >
                          <div className="h-32 bg-slate-950 overflow-hidden relative">
                            <img
                              src={rel.imageUrl || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80'}
                              alt={rel.title || 'Related'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                            {rel.category && (
                              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold">
                                {rel.category}
                              </span>
                            )}
                          </div>
                          <div className="p-3.5 space-y-1">
                            <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                              {rel.title || rel.message}
                            </h4>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {rel.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </article>

            </div>
          </div>
        )}
      </main>

        <PublicFooter branding={siteData?.branding || { clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', clubAbbreviation: 'ARC' }} />
      </div>
    </PageTransition>
  );
};
export default HealthAwarenessPage;
