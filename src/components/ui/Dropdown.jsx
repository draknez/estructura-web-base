import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../utils/cn';

const Dropdown = ({ options, value, onChange, placeholder = "Seleccionar...", className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 h-10 bg-white dark:bg-gray-900 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="absolute z-50 w-full mt-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-xl shadow-black/10 dark:shadow-2xl dark:shadow-black/70 max-h-60 overflow-auto border border-gray-100 dark:border-gray-800"
          >
            {options.map((opt) => (
              <motion.button
                key={opt.value}
                type="button"
                whileHover={{ x: 2 }}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  value === opt.value 
                    ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 font-bold" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {opt.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
