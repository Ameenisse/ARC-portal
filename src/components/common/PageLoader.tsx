import React from 'react';
import { motion } from 'motion/react';

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;
}

/**
 * PageLoader: A refined, branded loading indicator that gently fades in,
 * avoiding jarring spinning circles on quick transitions.
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'ލޯޑުވަނީ...',
  subMessage = 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް (ARC)',
  fullscreen = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center text-center p-6 ${
        fullscreen ? 'min-h-screen bg-slate-950 text-white' : 'py-20 text-slate-300'
      }`}
      dir="rtl"
    >
      <div className="relative mb-5 flex items-center justify-center">
        {/* Subtle breathing glow */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-orange-500/20 to-amber-500/10 rounded-2xl blur-lg animate-pulse" />
        
        {/* Outer subtle rotating ring */}
        <div className="w-14 h-14 rounded-2xl border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
        
        {/* Center club emblem / icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center overflow-hidden shadow-sm">
            <img
              src="/arc-app-icon.png"
              alt="ARC"
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                // Fallback text if icon fails
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-200 tracking-wide font-thaana">
        {message}
      </p>
      {subMessage && (
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {subMessage}
        </p>
      )}

      {/* Smooth animated linear bar */}
      <div className="w-36 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
};
