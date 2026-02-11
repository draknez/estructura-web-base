import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-teal-500/20",
  {
    variants: {
      variant: {
        primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-500/20 font-black uppercase tracking-widest",
        secondary: "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 font-black uppercase tracking-widest",
        ghost: "bg-transparent hover:bg-teal-50 text-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/20 font-bold",
      },
      size: {
        sm: "h-8 px-4 text-[10px] rounded-full",
        md: "h-10 px-6 text-xs rounded-xl",
        lg: "h-12 px-8 text-sm rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

const Button = ({ className, variant, size, children, ...props }) => {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
};

export default Button;
