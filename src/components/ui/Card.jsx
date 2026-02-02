import { cn } from "../../utils/cn";

export const Card = ({ children, className }) => (
  <div className={cn("bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 transition-colors duration-300", className)}>
    {children}
  </div>
);

export const CardHeader = ({ title, description }) => (
  <div className="mb-6 text-center">
    {title && <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>}
    {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>}
  </div>
);

export const Form = ({ onSubmit, children, className }) => (
  <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
    {children}
  </form>
);