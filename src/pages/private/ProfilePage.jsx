import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wrench, 
  ChevronDown, 
  Users, 
  AlertTriangle, 
  Radio, 
  ShieldCheck, 
  RotateCcw, 
  Loader2, 
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import RoleBadge from '../../components/ui/RoleBadge';

const ProfilePage = () => {
  const { user, token, logout } = useAuth();
  const { appStyle, toggleAppStyle } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [showAdminTools, setShowAdminTools] = useState(false);
  const [seedCount, setSeedCount] = useState(10);
  const [seeding, setSeeding] = useState(false);
  const [resetConfirming, setResetConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 3D Tilt & Lighting State
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const roles = user?.roles || [];
  const isAdmin = roles.includes('adm');
  const isSuperAdmin = roles.includes('Sa');

  // Manejador del movimiento 3D y luz dinámica
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Inclinación 3D suave (máximo 8 grados para elegancia)
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  // Generador masivo de usuarios
  const handleSeedUsers = async () => {
    const count = parseInt(seedCount, 10);
    if (!count || count < 1) {
      return addToast("Ingresa un número válido de usuarios", "error");
    }

    setSeeding(true);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/seed-users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ count })
      });

      const data = await res.json();
      if (res.ok) {
        addToast(data.message || `Se generaron ${count} usuarios con éxito`, "success");
      } else {
        addToast(data.error || "Error al generar usuarios", "error");
      }
    } catch (error) {
      addToast("Error de conexión con el servidor", "error");
    } finally {
      setSeeding(false);
    }
  };

  // Reset crítico del sistema
  const handleSystemReset = async () => {
    setResetting(true);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/system-reset`, {
        method: 'POST',
        headers: { 'x-access-token': token }
      });

      if (res.ok) {
        addToast("Sistema reiniciado con éxito. Redirigiendo...", "success");
        setTimeout(() => {
          logout();
          navigate('/');
        }, 1200);
      } else {
        const err = await res.json();
        addToast(err.error || "Error al reiniciar sistema", "error");
        setResetting(false);
        setResetConfirming(false);
      }
    } catch (error) {
      addToast("Error crítico de conexión", "error");
      setResetting(false);
      setResetConfirming(false);
    }
  };

  return (
    <div className="relative flex justify-center items-center min-h-[75vh] px-4 py-8">
      {/* Halo ambiental de fondo reactivo al rol */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[520px] h-[380px] sm:h-[520px] rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-700 ${
          isSuperAdmin 
            ? 'bg-gradient-to-tr from-amber-500/15 via-yellow-500/10 to-teal-500/15'
            : isAdmin 
            ? 'bg-gradient-to-tr from-emerald-500/15 via-teal-500/15 to-cyan-500/10'
            : 'bg-gradient-to-tr from-teal-500/15 via-sky-500/10 to-slate-500/10'
        }`}
      />

      {/* Tarjeta con efecto 3D Tilt y Spotlight Iluminado */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
          transformPerspective: 1000,
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 22,
        }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full max-w-lg rounded-[2.5rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] p-7 sm:p-9 overflow-hidden"
      >
        {/* Spotlight dinámico que sigue el cursor */}
        <div
          className="pointer-events-none absolute -inset-px rounded-[2.5rem] transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(360px circle at ${mousePos.x}px ${mousePos.y}px, ${
              isSuperAdmin ? 'rgba(245, 158, 11, 0.16)' : 'rgba(20, 184, 166, 0.18)'
            }, transparent 80%)`,
          }}
        />

        {/* Borde superior con brillo iridiscente */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 dark:via-teal-400/50 to-transparent" />

        {/* Contenido Principal con Parallax 3D */}
        <div style={{ transform: "translateZ(20px)" }} className="flex flex-col items-center gap-6 text-center">
          
          {/* Avatar moderno con halo y anillo */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-xl ${
                isSuperAdmin
                  ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 shadow-amber-500/30'
                  : isAdmin
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30'
                  : 'bg-gradient-to-tr from-teal-600 to-cyan-600 shadow-teal-500/30'
              }`}
            >
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </motion.div>

            {/* Badge Online flotante */}
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center bg-white dark:bg-gray-950 p-1 rounded-full shadow-sm">
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
            </div>
          </div>

          {/* Información del Usuario */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              {user?.username}
            </h1>
            
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {roles.map(r => (
                <RoleBadge key={r} role={r} size="md" showIcon={true} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-1 text-xs text-gray-400 dark:text-gray-500 font-medium">
              <span>ID #{user?.id || '1'}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Sesión Activa
              </span>
            </div>
          </div>

          {/* Herramientas SuperAdmin (Acordeón sofisticado) */}
          {isSuperAdmin && (
            <div className="w-full pt-4">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowAdminTools(!showAdminTools)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                  showAdminTools
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-500/20'
                    : 'bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 shadow-sm dark:shadow-md dark:shadow-black/30 hover:shadow-md'
                }`}
              >
                <span className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Herramientas SuperAdmin
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdminTools ? 'rotate-180 text-amber-500' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showAdminTools && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden space-y-4 pt-4 text-left"
                  >
                    {/* Tool 1: Selector de Estilo de UI */}
                    <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 shadow-sm dark:shadow-md dark:shadow-black/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-teal-600" /> Estilo de UI
                        </span>
                        <div className="inline-flex rounded-xl p-0.5 bg-gray-200/80 dark:bg-gray-800">
                          <button
                            onClick={toggleAppStyle}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              appStyle === 'modern'
                                ? 'bg-white dark:bg-gray-950 text-teal-600 dark:text-teal-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Modern v2
                          </button>
                          <button
                            onClick={toggleAppStyle}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                              appStyle === 'classic'
                                ? 'bg-white dark:bg-gray-950 text-teal-600 dark:text-teal-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Classic v1
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tool 2: Seed Engine (Generador de Usuarios Masivos) */}
                    <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 shadow-sm dark:shadow-md dark:shadow-black/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-500" /> Generador de Usuarios
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Seed Engine</span>
                      </div>

                      {/* Botones de preset rápido */}
                      <div className="flex items-center gap-2">
                        {[10, 25, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSeedCount(val)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                              seedCount === val
                                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 shadow-sm dark:shadow-md dark:shadow-black/30 hover:shadow-md'
                            }`}
                          >
                            +{val}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={seedCount}
                          onChange={(e) => setSeedCount(e.target.value)}
                          className="w-24 text-center font-bold"
                          min="1"
                          max="500"
                        />
                        <Button
                          size="md"
                          onClick={handleSeedUsers}
                          disabled={seeding}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black shadow-amber-500/25"
                        >
                          {seeding ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Generando...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Generar Usuarios
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Tool 3: Zona de Peligro / Reset Crítico */}
                    <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 shadow-sm shadow-red-500/10 space-y-3">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" /> Zona de Peligro Crítico
                      </div>

                      {!resetConfirming ? (
                        <Button
                          size="md"
                          variant="danger"
                          onClick={() => setResetConfirming(true)}
                          className="w-full text-xs font-black tracking-wider flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reiniciar Todo el Sistema
                        </Button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2 p-3 bg-red-100/70 dark:bg-red-950/50 rounded-xl shadow-sm text-center"
                        >
                          <p className="text-xs font-bold text-red-700 dark:text-red-300">
                            ¿Confirmas eliminar todos los usuarios y reiniciar Neusit?
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setResetConfirming(false)}
                              className="flex-1 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={resetting}
                              onClick={handleSystemReset}
                              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-wider shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirmar Reset"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
