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
  ChevronDown,
  Edit3,
  Globe 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTelemetry } from '../context/TelemetryContext';
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
  const { isHudOpen, toggleHud } = useTelemetry();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Estados de animación secuencial: 'idle' | 'rotating' | 'exiting' | 'entering'
  const [animPhase, setAnimPhase] = useState('idle');
  const timeoutsRef = useRef([]);

  const isBottom = navbarPosition === 'bottom';

  // Limpiar temporizadores si se desmonta
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

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

  const handleTogglePosition = () => {
    if (animPhase !== 'idle') return;
    setIsDropdownOpen(false);

    // 1. La flecha empieza a girar 180° en su sitio (la barra permanece inmóvil)
    setAnimPhase('rotating');

    // 2. Al completar el giro (350ms), la flecha apunta hacia el nuevo destino y sale junto con la barra
    const t1 = setTimeout(() => {
      setAnimPhase('exiting');

      // 3. Tras salir de pantalla (280ms), cambiamos la posición en ThemeContext
      // y la barra entra por el extremo opuesto con la flecha ya en su lugar y orientada
      const t2 = setTimeout(() => {
        toggleNavbarPosition();
        setAnimPhase('entering');

        // 4. Tras la animación de entrada (320ms), vuelve al estado de reposo
        const t3 = setTimeout(() => {
          setAnimPhase('idle');
        }, 320);
        timeoutsRef.current.push(t3);
      }, 280);
      timeoutsRef.current.push(t2);
    }, 350);
    timeoutsRef.current.push(t1);
  };

  return (
    <motion.header 
      key={navbarPosition}
      initial={animPhase === 'entering' ? { y: isBottom ? 90 : -90, opacity: 0 } : false}
      animate={{ 
        y: animPhase === 'exiting' ? (isBottom ? 90 : -90) : 0, 
        opacity: animPhase === 'exiting' ? 0 : 1 
      }}
      transition={{ 
        duration: animPhase === 'exiting' ? 0.28 : 0.32, 
        ease: animPhase === 'exiting' ? [0.4, 0, 0.8, 1] : [0.16, 1, 0.3, 1] 
      }}
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
          
          {/* Botón Mover Barra (Arriba / Abajo) con coreografía secuencial */}
          <motion.button
            whileHover={animPhase === 'idle' ? { scale: 1.12 } : {}}
            whileTap={animPhase === 'idle' ? { scale: 0.92 } : {}}
            onClick={handleTogglePosition}
            disabled={animPhase !== 'idle'}
            className={`flex p-2 rounded-xl text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors ${
              animPhase !== 'idle' ? 'cursor-default pointer-events-none' : ''
            }`}
            title={isBottom ? "Mover barra arriba" : "Mover barra abajo"}
            aria-label={isBottom ? "Mover barra arriba" : "Mover barra abajo"}
          >
            <motion.div
              initial={false}
              animate={{ 
                rotate: (animPhase === 'rotating' || animPhase === 'exiting') ? 180 : 0 
              }}
              transition={{ 
                duration: 0.35, 
                ease: [0.34, 1.3, 0.64, 1] 
              }}
              className="flex items-center justify-center"
            >
              {isBottom ? (
                <ArrowUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              ) : (
                <ArrowDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
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

            {/* Acceso Rápido Telemetría HUD (Exclusivo SuperAdmin) */}
            {user?.roles?.includes('Sa') && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleHud}
                className={`relative p-2 rounded-xl transition-all ${
                  isHudOpen 
                    ? 'text-teal-400 bg-teal-500/15 border border-teal-500/30 shadow-sm shadow-teal-500/20' 
                    : 'text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                }`}
                title="HUD Telemetría en Tiempo Real (Sa)"
                aria-label="Alternar HUD Telemetría Sa"
              >
                <Activity className="w-4 h-4" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"></span>
                </span>
              </motion.button>
            )}

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
                      <div className="px-3 py-2 mb-1 flex items-center bg-gray-50/50 dark:bg-gray-800/40">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Menú Neusit</p>
                      </div>

                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                      >
                        <User className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Mi Perfil
                      </Link>

                      {user.roles?.includes('Sa') && (
                        <button 
                          onClick={() => { toggleHud(); setIsDropdownOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2.5">
                            <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Telemetría Sa
                          </span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isHudOpen ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]' : 'bg-gray-400'}`} />
                        </button>
                      )}

                      {(user.roles?.includes('adm') || user.roles?.includes('Sa')) && (
                        <Link 
                          to="/users" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                        >
                          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Usuarios
                        </Link>
                      )}

                      {(user.roles?.includes('Sa') || user.roles?.includes('adm')) && (
                        <Link 
                          to="/groups" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                        >
                          <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Grupos
                        </Link>
                      )}

                      {(user.roles?.includes('Sa') || user.roles?.includes('adm') || user.roles?.includes('enc')) && (
                        <Link 
                          to="/studio" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Content Studio
                        </Link>
                      )}

                      <Link 
                        to="/posts" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                      >
                        <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Publicaciones
                      </Link>

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
  );
};

export default Navbar;