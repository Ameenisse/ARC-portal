import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HealthAwarenessItem } from '../../types';
import { api } from '../../services/api';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { HeartPulse, ArrowLeft } from 'lucide-react';

interface HealthAwarenessBannerProps {
  initialItems?: HealthAwarenessItem[];
  className?: string;
}

export const HealthAwarenessBanner: React.FC<HealthAwarenessBannerProps> = ({
  initialItems,
  className = ''
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<HealthAwarenessItem[]>(initialItems || []);
  const [loading, setLoading] = useState(!initialItems);

  // Fetch health awareness items from public API
  const fetchItems = async () => {
    try {
      const data = await api.getPublicHealthAwareness();
      if (Array.isArray(data)) {
        setItems(data.filter(i => i.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
      }
    } catch (err) {
      console.error('Failed to fetch health awareness items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialItems || initialItems.length === 0) {
      fetchItems();
    } else {
      setItems(initialItems.filter(i => i.status === 'active').sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
    }
  }, [initialItems]);

  // Real-time synchronization whenever changes occur in portal
  useTableSync(['health_awareness'], () => {
    fetchItems();
  });

  const activeItems = items.filter(i => i.status === 'active');

  if (loading || activeItems.length === 0) {
    return null;
  }

  // Duplicate items to ensure a wide, continuous, seamless infinite marquee crawl
  const marqueeItems = activeItems.length < 3
    ? [...activeItems, ...activeItems, ...activeItems, ...activeItems]
    : [...activeItems, ...activeItems];

  // Slow crawl calculation: allows ample time to read the 20px Thaana text comfortably
  const crawlDuration = Math.max(50, marqueeItems.length * 14);

  return (
    <section 
      id="health-awareness-section"
      className={`w-full bg-slate-950/60 border-y border-emerald-500/20 py-4 sm:py-5 ${className}`}
      dir="rtl"
    >
      {/* 1. Section Header & Read More Button ABOVE the banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-3 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Right Side: Section Header */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40 flex items-center justify-center shrink-0">
            <HeartPulse className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="font-heading font-extrabold text-sm sm:text-xl text-white tracking-tight truncate">
                ޞިއްޙީ ހޭލުންތެރިކަން
              </h2>
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-400"></span>
              </span>
            </div>
            <p className="hidden sm:block text-[11px] sm:text-xs text-emerald-400/85 font-medium truncate">
              ދުޅަހެޔޮ ޞިއްޙަތަކަށް މުހިންމު އިރުޝާދުތަކާއި މަޢުލޫމާތު
            </p>
          </div>
        </div>

        {/* Left Side: Read More Button ABOVE the banner */}
        <button
          type="button"
          id="banner-read-more-btn"
          onClick={() => navigate('/health-awareness')}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/50 hover:shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          title="ޞިއްޙީ ހޭލުންތެރިކަމުގެ ބްލޮގަށް ވަޑައިގަންނަވާ"
        >
          <span>އިތުރަށް ވިދާޅުވޭ</span>
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100" />
        </button>
      </div>

      {/* 2. Banner with TEXT ONLY Crawling Text Animation (Left to Right, Non-clickable) */}
      <div 
        id="health-awareness-banner"
        className="w-full bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-y border-emerald-500/30 shadow-inner relative overflow-hidden py-2.5 sm:py-3.5 group cursor-default select-none"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 right-1/4 w-56 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Left & Right gradient edge masks for broadcast ticker fade effect */}
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-28 bg-gradient-to-l from-slate-950/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-28 bg-gradient-to-r from-slate-950/90 to-transparent z-10 pointer-events-none" />

        {/* Crawling Marquee: Text moving smoothly from Left to Right */}
        <div className="w-full overflow-hidden flex" dir="ltr">
          <div 
            className="flex items-center whitespace-nowrap select-none group-hover:[animation-play-state:paused]"
            style={{
              display: 'flex',
              width: 'max-content',
              animation: `marqueeScrollLTR ${crawlDuration}s linear infinite`
            }}
          >
            {marqueeItems.map((tip, idx) => (
              <div 
                key={`${tip.id}-${idx}`}
                dir="rtl"
                className="inline-flex items-center text-xs sm:text-base md:text-[18px] leading-relaxed shrink-0 text-slate-100"
              >
                {/* Headline Title */}
                {tip.title && (
                  <span className="font-extrabold text-white ml-2">
                    {tip.title}:
                  </span>
                )}

                {/* Main Tip Text */}
                <span className="font-normal text-slate-100">
                  {tip.message}
                </span>

                {/* Elegant separator between items */}
                <span className="text-emerald-400/60 mx-4 sm:mx-8 select-none text-xs sm:text-[16px]">
                  ✦
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
