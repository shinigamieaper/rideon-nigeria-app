'use client';

import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps extends React.ComponentPropsWithoutRef<'div'> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, ...props }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl \
        border border-white/40 dark:border-slate-700 \
        shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden"
        {...props}
      >
        <div className="p-6 sm:p-8">
          <div className="min-w-0">
            <h3 id="modal-title" className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h3>
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
