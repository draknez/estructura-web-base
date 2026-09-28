import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Activity, 
  Users, 
  Layers, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/Button';

// Puntos de rol coherentes con el nuevo RoleBadge
const RoleDot = ({ role }) => {
  let colorClass = "bg-slate-400";
  if (role === 'usr') colorClass = "bg-sky-400";
  if (role === 'adm') colorClass = "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]";
  if (role === 'enc') colorClass = "bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]";
  if (role === 'Sa') colorClass = "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]";

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
    <AnimatePresence mode="wait">
      <motion.header 
        key={navbarPosition}
        initial={{ y: isBottom ? 70 : -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: isBottom ? 70 : -70, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed left-0 right-0 z-50 w-full bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl transition-colors duration-300 ${
          isBottom 
            ? 'bottom-0 shadow-[0_-4px_25px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_-4px_rgba(0,0,0,0.5)]' 
            : 'top-0 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_-4px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          
          {/* IZQUIERDA: Logo compacto Neusit */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <span className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white w-7 h-7 flex items-center justify-center rounded-lg shadow-sm shadow-teal-500/30 text-sm font-black tracking-tight group-hover:scale-105 transition-transform">
                N
              </span>
              <span className="text-base font-black tracking-tight text-gray-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                Neusit
              </span>
            </Link>
          </div>

          {/* DERECHA: Controles y Menú */}
          <div className="flex items-center gap-2.5">
            
            {/* Botón Mover Barra (Arriba / Abajo) con coreografía de 3 giros y entrada escalonada */}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.88 }}
              onClick={toggleNavbarPosition}
              className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
              title={isBottom ? "Mover barra arriba" : "Mover barra abajo"}
            >
              <motion.div
                key={navbarPosition}
                initial={{ 
                  opacity: 0, 
                  scale: 0.2, 
                  y: isBottom ? -22 : 22, 
                  rotate: isBottom ? 0 : 1080 
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0, 
                  rotate: isBottom ? 1080 : 0 
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.2, 
                  rotate: isBottom ? 0 : 1080 
                }}
                whileHover={{ 
                  scale: 1.25, 
                  y: isBottom ? 3 : -3,
                  transition: { type: "spring", stiffness: 450, damping: 15 } 
                }}
                transition={{ 
                  delay: 0.28, 
                  duration: 0.65, 
                  ease: [0.16, 1, 0.3, 1] 
                }}
              >
                {isBottom ? (
                  <ArrowDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                ) : (
                  <ArrowUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                )}
              </motion.div>
            </motion.button>

            {/* Botón Tema Oscuro / Claro con giro y escala */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
              title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -8, opacity: 0, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 8, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-teal-600" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                {/* Botón de usuario en forma de Pill */}
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full shadow-sm dark:shadow-md dark:shadow-black/40 hover:shadow-md hover:scale-[1.02] transition-all bg-white dark:bg-gray-900"
                >
                  {/* Badge Nombre */}
                  <div className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                      {user.username}
                    </span>
                  </div>

                  {/* Puntos Roles */}
                  <div className="flex gap-1 items-center h-full">
                    {user.roles?.map(r => <RoleDot key={r} role={r} />)}
                  </div>
                  
                  {/* Flecha indicadora */}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown flotante animado */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: isBottom ? 10 : -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: isBottom ? 10 : -10 }}
                      transition={{ duration: 0.18 }}
                      className={`absolute right-0 w-52 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/10 dark:shadow-2xl dark:shadow-black/70 py-1.5 overflow-hidden z-50 ${
                        isBottom ? 'bottom-full mb-2 origin-bottom-right' : 'top-full mt-2 origin-top-right'
                      }`}
                    >
                      <div className="px-3 py-2 mb-1 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Menú Neusit</p>
                        
                        {/* Mobile Position Toggle */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleNavbarPosition(); setIsDropdownOpen(false); }}
                          className="sm:hidden p-1 text-gray-400 hover:text-teal-600 rounded-md"
                        >
                          {isBottom ? <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                        </button>
                      </div>

                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                      >
                        <User className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Mi Perfil
                      </Link>

                      <Link 
                        to="/" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                      >
                        <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Monitor en Vivo
                      </Link>

                      {(user.roles?.includes('adm') || user.roles?.includes('Sa')) && (
                        <Link 
                          to="/users" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                        >
                          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Usuarios
                        </Link>
                      )}

                      {user.roles?.includes('Sa') && (
                        <Link 
                          to="/groups" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                        >
                          <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Grupos
                        </Link>
                      )}

                      <div className="my-1.5 h-px bg-gray-100 dark:bg-gray-800/60 mx-2"></div>

                      <div className="px-3 py-1">
                        <button 
                          onClick={() => { logout(); setIsDropdownOpen(false); }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Salir
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="pl-1">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20">
                    Acceder
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.header>
    </AnimatePresence>
  );
};

export default Navbar;