import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';

/**
 * Componente de enlace de navegación que detecta automáticamente si está activo
 * para aplicar estilos resaltados.
 */
const NavLink = ({ to, children, className }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "text-sm font-medium transition-colors hover:text-violet-600 dark:hover:text-violet-400",
        isActive ? "text-violet-600 dark:text-violet-400 font-bold" : "text-gray-500 dark:text-gray-400",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default NavLink;
