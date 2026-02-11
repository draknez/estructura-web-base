import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/Button';

// --- ICONS (Simple SVGs) ---
const Icons = {
  Profile: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Monitor: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Users: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Groups: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Moon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  Sun: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Logout: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  ChevronDown: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>,
  ArrowDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7m14-8l-7 7-7-7" /></svg>,
  ArrowUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7M5 18l7-7 7 7" /></svg>
};

const RoleDot = ({ role }) => {
  let colorClass = "bg-gray-400";
  if (role === 'usr') colorClass = "bg-sky-500";
  if (role === 'adm') colorClass = "bg-orange-500";
  if (role === 'Sa') colorClass = "bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]";

  return (
    <span 
      className={`block w-2 h-2 rounded-full ${colorClass}`} 
      title={`Rol: ${role}`} 
    />
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, navbarPosition, toggleNavbarPosition } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isBottom = navbarPosition === 'bottom';

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={`z-50 w-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-md transition-all duration-300 ${
      isBottom 
        ? 'fixed bottom-0 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' 
        : 'sticky top-0 border-b border-gray-200 dark:border-gray-800'
    }`}>
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        
        {/* IZQUIERDA: Logo compacto */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="bg-teal-600 text-white w-6 h-6 flex items-center justify-center rounded-md shadow-sm text-sm font-bold group-hover:bg-teal-700 transition-colors">
              B
            </span>
            <span className="text-base font-bold tracking-tight text-gray-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              BaLog
            </span>
          </Link>
        </div>

        {/* DERECHA: User Menu & Controls */}
        <div className="flex items-center gap-3">
           
           {/* Position Toggle */}
           <button
              onClick={toggleNavbarPosition}
              className="hidden sm:flex p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isBottom ? "Mover Arriba" : "Mover Abajo"}
            >
              {isBottom ? <Icons.ArrowUp /> : <Icons.ArrowDown />}
            </button>

           {/* Theme Toggle */}
           <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
            </button>

           {user ? (
             <div className="relative" ref={dropdownRef}>
               {/* USER CONTAINER (Bordered Pill) */}
               <button 
                 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                 className="flex items-center gap-2 pl-1 pr-2 py-1 border border-gray-200 dark:border-gray-700 rounded-full hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-900"
               >
                  {/* Badge Nombre */}
                  <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {user.username}
                    </span>
                  </div>

                  {/* Puntos Roles */}
                  <div className="flex gap-1 items-center h-full">
                    {user.roles?.map(r => <RoleDot key={r} role={r} />)}
                  </div>
                  
                  {/* Flecha pequeña indicador */}
                  <div className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                  </div>
               </button>

               {/* DROPDOWN MENU */}
               {isDropdownOpen && (
                 <div className={`absolute right-0 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${
                   isBottom ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'
                 }`}>
                    
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1 flex justify-between items-center">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Menú</p>
                      
                      {/* Mobile Position Toggle (Inside Menu) */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleNavbarPosition(); setIsDropdownOpen(false); }}
                        className="sm:hidden text-gray-400 hover:text-teal-600"
                      >
                        {isBottom ? <Icons.ArrowUp /> : <Icons.ArrowDown />}
                      </button>
                    </div>

                    <Link 
                      to="/profile" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                    >
                      <Icons.Profile /> Mi Perfil
                    </Link>

                    <Link 
                      to="/" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                    >
                      <Icons.Monitor /> Estado Monitor
                    </Link>

                    {(user.roles?.includes('adm') || user.roles?.includes('Sa')) && (
                       <Link 
                         to="/users" 
                         onClick={() => setIsDropdownOpen(false)}
                         className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                       >
                         <Icons.Users /> Usuarios
                       </Link>
                    )}

                    {user.roles?.includes('Sa') && (
                       <Link 
                         to="/groups" 
                         onClick={() => setIsDropdownOpen(false)}
                         className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                       >
                         <Icons.Groups /> Grupos
                       </Link>
                    )}

                    <div className="my-1 border-t border-gray-100 dark:border-gray-800"></div>

                    <div className="px-4 py-2">
                      <button 
                        onClick={() => { logout(); setIsDropdownOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
                      >
                        <Icons.Logout /> Salir
                      </button>
                    </div>
                 </div>
               )}
             </div>
           ) : (
             // No Logueado
             <div className="pl-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                    Acceder
                  </Button>
                </Link>
             </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;