import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  children?: React.ReactNode;
}

export const HeroSlideshow: React.FC<HeroSlideshowProps> = ({
  slides,
  settings = { autoplay: true, slideDuration: 5000, showArrows: true, showDots: true, pauseOnHover: true },
  children
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

  const currentSlide = slides[currentIndex] || slides[0];
  if (!currentSlide) return null;

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  return (
    <div
      id="hero_slideshow"
      className={`relative w-full ${children ? 'min-h-[500px] sm:h-[580px] lg:h-[640px]' : 'h-[380px] sm:h-[480px] lg:h-[560px]'} bg-slate-950 overflow-hidden group`}
      onMouseEnter={() => settings.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => settings.pauseOnHover && setIsPaused(false)}
    >
      {/* Background Image with Fade Transition */}
      <div className="absolute inset-0 transition-all duration-700 ease-out">
        {currentSlide.buttonLink ? (
          <a
            href={currentSlide.buttonLink}
            className="block w-full h-full cursor-pointer"
            id={`slide_link_${currentSlide.id}`}
          >
            <picture>
              {currentSlide.mobileImage && (
                <source media="(max-width: 640px)" srcSet={currentSlide.mobileImage} />
              )}
              <img
                src={currentSlide.desktopImage}
                alt={currentSlide.title || 'Hero Slide'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </picture>
          </a>
        ) : (
          <picture>
            {currentSlide.mobileImage && (
              <source media="(max-width: 640px)" srcSet={currentSlide.mobileImage} />
            )}
            <img
              src={currentSlide.desktopImage}
              alt={currentSlide.title || 'Hero Slide'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </picture>
        )}
        {/* Subtle vignette/contrast overlay for clean legibility without solid backgrounds */}
        <div className={`absolute inset-0 ${children ? 'bg-slate-950/45 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/50' : 'bg-gradient-to-t from-slate-950/60 via-transparent to-transparent'} pointer-events-none`} />
      </div>

      {/* Floating Content Overlaid on Slide Images */}
      {children && (
        <div className="relative z-10 h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center">
          {children}
        </div>
      )}

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

