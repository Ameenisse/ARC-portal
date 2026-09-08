import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition: Smoothly animates pages upon mounting and unmounting,
 * ensuring seamless visual transitions without layout jumps.
 * Also performs instant or smooth scroll restoration to top.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const location = useLocation();

  useEffect(() => {
    // Only scroll to top if not an anchor hash navigation
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.22,
        ease: [0.22, 1, 0.36, 1], // Custom smooth cubic-bezier
      }}
      className={`w-full min-h-screen flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
};
