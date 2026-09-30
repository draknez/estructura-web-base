import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';

const Modal = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop con Blur y Fade suave */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" 
            onClick={onClose}
          />
          
          {/* Card Animada con Spring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
              "relative bg-white dark:bg-gray-900 rounded-[2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden z-10",
              className
            )}
          >
            {/* Header */}
            {(title || onClose) && (
              <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-gray-50/80 dark:bg-gray-800/40 shadow-sm">
                {title && (
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    {title}
                  </h3>
                )}
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            )}
            
            {/* Content Scrollable */}
            <div className="p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;