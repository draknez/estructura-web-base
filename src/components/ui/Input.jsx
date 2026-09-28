import { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "../../utils/cn";

const Input = forwardRef(({ label, error, icon: Icon, rightElement, className, type = "text", ...props }, ref) => {
  const hasError = Boolean(error);

  return (
    <motion.div 
      animate={hasError ? { x: [0, -5, 5, -4, 4, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.38, ease: "easeInOut" }}
      className="space-y-1.5 w-full text-left"
    >
      {label && (
        <label className={cn(
          "block text-[11px] font-bold uppercase tracking-wider ml-1 transition-colors duration-200",
          hasError ? "text-red-500/90 dark:text-red-400/90" : "text-gray-500 dark:text-gray-400"
        )}>
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className={cn(
            "absolute left-3.5 pointer-events-none flex items-center justify-center transition-colors duration-200",
            hasError ? "text-red-500/80 dark:text-red-400/80" : "text-gray-400 dark:text-gray-500"
          )}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-gray-100 transition-all duration-200",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError
              ? "bg-red-500/[0.04] dark:bg-red-500/[0.07] placeholder:text-red-400/50 dark:placeholder:text-red-400/40 focus:outline-none focus:ring-2 focus:ring-red-500/25 shadow-[0_0_18px_rgba(239,68,68,0.22)] dark:shadow-[0_0_20px_rgba(248,113,113,0.28)]"
              : "bg-white dark:bg-gray-900/90 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] focus:shadow-[0_4px_16px_rgba(20,184,166,0.18)] dark:focus:shadow-[0_4px_16px_rgba(20,184,166,0.25)]",
            Icon && "pl-10",
            rightElement && "pr-11",
            className
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </motion.div>
  );
});

Input.displayName = "Input";

export default Input;
