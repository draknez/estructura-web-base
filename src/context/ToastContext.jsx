import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

const ToastContext = createContext();

const ToastContainer = ({ toasts, removeToast }) => {
  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4 sm:p-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 40, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto cursor-pointer flex items-center p-4 rounded-2xl backdrop-blur-xl shadow-xl transition-colors ${
              toast.type === 'success' ? 'bg-white/95 dark:bg-gray-900/95 text-teal-700 dark:text-teal-400 border border-teal-500/20 shadow-teal-500/10 dark:shadow-black/70' :
              toast.type === 'error' ? 'bg-white/95 dark:bg-gray-900/95 text-red-700 dark:text-red-400 border border-red-500/20 shadow-red-500/10 dark:shadow-black/70' :
              'bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 shadow-black/5 dark:shadow-black/70'
            }`}
          >
            <div className={`mr-3 shrink-0 ${toast.type === 'success' ? 'text-teal-500' : 'text-red-500'}`}>
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <p className="text-xs font-black tracking-tight">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
