import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  id?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'page' | 'fit';
}

export const Modal: React.FC<ModalProps> = ({
  id = 'modal_dialog',
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    xs: 'max-w-[360px]',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
    page: 'max-w-5xl',
    fit: 'max-w-fit'
  }[maxWidth] || 'max-w-md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        id={id}
        className={`relative ${maxWidth === 'fit' ? 'w-fit' : 'w-full'} ${maxWidthClass} bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 sm:p-6 z-10 my-2 sm:my-6 text-left transition-all animate-scale-in max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-heading">{title}</h3>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
          </div>
          <button
            id={`${id}_close_btn`}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 sm:py-4 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
