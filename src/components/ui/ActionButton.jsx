import React from 'react';
import { cn } from '../../utils/cn';

/**
 * ActionButton
 * Botón pequeño y estandarizado para acciones en tablas (Edit, Ban, Elim, etc.)
 * Altura fija: h-6
 * Texto: 10px, Uppercase, Bold
 */
const ActionButton = ({ 
  children, 
  onClick, 
  variant = 'sky', 
  className, 
  disabled = false,
  title
}) => {
  
  const baseStyles = "px-3 h-5 flex items-center justify-center rounded-full text-[9px] font-black uppercase transition-all shadow-sm disabled:opacity-50 whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-offset-1 tracking-wider hover:-translate-y-px";
  
  const variants = {
    // Edit / Info
    sky: "bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500",
    // Unban / Positive
    teal: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-600",
    // Light Teal (+ Usr)
    'teal-light': "bg-teal-100 text-teal-700 hover:bg-teal-200 focus:ring-teal-500",
    // Ban / Warning
    red: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    // Delete / Danger
    danger: "bg-red-800 text-white hover:bg-red-900 focus:ring-red-800",
    // Orange (ENC)
    orange: "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500",
    // Emerald (ADM)
    emerald: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600",
    // Inactive / Neutral
    gray: "bg-gray-200 text-gray-500 hover:bg-gray-300 focus:ring-gray-300",
    // Ghost (simple text)
    ghost: "bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(baseStyles, variants[variant] || variants.sky, className)}
    >
      {children}
    </button>
  );
};

export default ActionButton;
