import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/Button';
import NavLink from './ui/NavLink';

const RoleDot = ({ role }) => {
  let colorClass = "bg-gray-400";
  if (role === 'usr') colorClass = "bg-sky-500";
  if (role === 'adm') colorClass = "bg-orange-500";
  if (role === 'Sa') colorClass = "bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]"; // Gold glow

  return (
    <span 
      className={`block w-2.5 h-2.5 rounded-full ${colorClass}`} 
      title={`Rol: ${role}`} 
    />
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Cerrar menú al cambiar de ruta
  const handleLinkClick = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        
        {/* LOGO */}
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-tighter flex items-center gap-2 transition-transform hover:scale-105 dark:text-white" onClick={handleLinkClick}>
            <span className="bg-violet-600 text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">B</span>
            BaLog
          </Link>

          {/* Desktop Navigation (Solo si logueado) */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              <NavLink to="/dashboard">Panel</NavLink>
              <NavLink to="/">Estado</NavLink>
              {(user.roles?.includes('adm') || user.roles?.includes('Sa')) && (
                <NavLink to="/admin">Admin</NavLink>
              )}
            </nav>
          )}
        </div>

        {/* ACCIONES DERECHA */}
        <div className="flex items-center gap-4">
           {/* Dark Mode */}
           <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

           {user ? (
             <>
               {/* User Info (Desktop) - Puntos de Roles */}
               <div className="hidden md:flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-bold leading-none dark:text-gray-200">{user.username}</p>
                    <div className="flex gap-1 mt-1">
                      {user.roles?.map(r => <RoleDot key={r} role={r} />)}
                    </div>
                  </div>
                  
                  {/* Logout Pill */}
                  <button 
                    onClick={logout}
                    className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                  >
                    Salir
                  </button>
               </div>

               {/* Mobile Hamburger */}
               <button 
                  className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg ml-2"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     {isMenuOpen ? (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     ) : (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                     )}
                   </svg>
                </button>
             </>
           ) : (
             // No Logueado
             <div className="flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20">
                    Acceder
                  </Button>
                </Link>
             </div>
           )}
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {user && isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
           {/* User Header Mobile */}
           <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                 <div className="flex flex-col">
                    <span className="text-lg font-bold dark:text-white">{user.username}</span>
                    <div className="flex gap-1.5 mt-1">
                      {user.roles?.map(r => <RoleDot key={r} role={r} />)}
                    </div>
                 </div>
              </div>
              <button 
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors"
                >
                  Salir
              </button>
           </div>

           <nav className="flex flex-col gap-1">
              <NavLink to="/dashboard" className="block py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg" onClick={handleLinkClick}>
                 Panel Principal
              </NavLink>
              <NavLink to="/" className="block py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg" onClick={handleLinkClick}>
                 Estado Monitor
              </NavLink>
              {(user.roles?.includes('adm') || user.roles?.includes('Sa')) && (
                 <NavLink to="/admin" className="block py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg" onClick={handleLinkClick}>
                    Administración
                 </NavLink>
              )}
           </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
