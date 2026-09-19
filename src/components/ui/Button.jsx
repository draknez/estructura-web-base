import { cva } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold tracking-wide transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20 uppercase tracking-widest font-black",
        secondary: "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 font-black uppercase tracking-widest",
        ghost: "bg-transparent hover:bg-teal-50 text-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20",
      },
      size: {
        sm: "h-8 px-4 text-[10px] rounded-full",
        md: "h-10 px-6 text-xs rounded-xl",
        lg: "h-12 px-8 text-sm rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = ({ className, variant, size, children, disabled, ...props }) => {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
