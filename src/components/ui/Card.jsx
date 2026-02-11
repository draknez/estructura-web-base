import { cn } from "../../utils/cn";

export const Card = ({ children, className }) => (
  <div className={cn(
    "bg-white dark:bg-gray-950 rounded-[2rem] border border-gray-100 dark:border-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden",
    className
  )}>
    {children}
  </div>
);

export const CardHeader = ({ title, description, className }) => (
  <div className={cn("p-8 pb-4 text-center", className)}>
    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">
      {title}
    </h2>
    {description && (
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {description}
      </p>
    )}
  </div>
);

export const Form = ({ children, onSubmit, className }) => (
  <form onSubmit={onSubmit} className={cn("p-8 pt-4 space-y-5", className)}>
    {children}
  </form>
);
