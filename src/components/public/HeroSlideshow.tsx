import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { SlideshowItem } from '../../types';

interface HeroSlideshowProps {
  slides: SlideshowItem[];
  settings?: {
    autoplay: boolean;
    slideDuration: number;
    showArrows: boolean;
    showDots: boolean;
    pauseOnHover: boolean;
  };
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  slides,
  settings = { autoplay: true, slideDuration: 5000, showArrows: true, showDots: true, pauseOnHover: true }
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!settings.autoplay || isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, settings.slideDuration || 5000);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, slides.length, settings]);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  const alignClasses = {
    left: 'text-right items-end',
    center: 'text-center items-center',
    right: 'text-left items-start'
  }[currentSlide.textAlignment || 'center'];

  return (
    <div
      id="hero_slideshow"
      className="relative w-full h-[520px] sm:h-[600px] lg:h-[660px] bg-slate-950 overflow-hidden"
      onMouseEnter={() => settings.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => settings.pauseOnHover && setIsPaused(false)}
    >
      {/* Background Image with Fade Transition */}
      <div className="absolute inset-0 transition-all duration-700 ease-out">
        <picture>
          {currentSlide.mobileImage && (
            <source media="(max-width: 640px)" srcSet={currentSlide.mobileImage} />
          )}
          <img
            src={currentSlide.desktopImage}
            alt={currentSlide.title}
            className="w-full h-full object-cover scale-105 animate-pulse-subtle"
          />
        </picture>
        {/* Dynamic Overlay Level */}
        <div
          className="absolute inset-0 bg-slate-950"
          style={{ opacity: (currentSlide.overlayLevel ?? 45) / 100 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      </div>

      {/* Slide Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className={`max-w-3xl flex flex-col ${alignClasses} space-y-4 animate-fade-in`}>
          
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 font-medium text-xs tracking-wider uppercase backdrop-blur-md">
            އާނަންދާ ރީކްރިއޭޝަން ކްލަބް (ARC)
          </span>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white font-heading leading-tight tracking-tight drop-shadow-md">
            {currentSlide.title}
          </h1>

          {currentSlide.subtitle && (
            <p className="text-base sm:text-xl text-slate-200 leading-relaxed font-normal max-w-2xl drop-shadow">
              {currentSlide.subtitle}
            </p>
          )}

          {currentSlide.buttonText && currentSlide.buttonLink && (
            <div className="pt-4">
              <a
                id={`slide_cta_${currentSlide.id}`}
                href={currentSlide.buttonLink}
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-base shadow-xl shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                <span>{currentSlide.buttonText}</span>
                <ArrowLeft className="w-5 h-5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {settings.showArrows && slides.length > 1 && (
        <>
          <button
            id="slide_prev_btn"
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-900/60 hover:bg-slate-900 text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            id="slide_next_btn"
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-slate-900/60 hover:bg-slate-900 text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicator Dots */}
      {settings.showDots && slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              id={`slide_dot_${idx}`}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all ${
                currentIndex === idx
                  ? 'w-8 bg-orange-400'
                  : 'w-2.5 bg-slate-500/60 hover:bg-slate-300'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

