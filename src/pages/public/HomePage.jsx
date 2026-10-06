import React from 'react';
import { motion } from 'motion/react';
import { Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTelemetry } from '../../context/TelemetryContext';

/**
 * HomePage: Vista minimalista limpia (Calm UI).
 * El monitor público ha sido completamente ocultado y migrado al widget futurista exclusivo de Sa.
 */
const HomePage = () => {
  const { user } = useAuth();
  const { isSuperAdmin, isHudOpen, toggleHud } = useTelemetry();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[72vh] px-4 select-none">
      {/* Halo ambiental sutil de fondo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] rounded-full blur-3xl pointer-events-none -z-10 bg-gradient-to-tr from-teal-500/10 via-cyan-500/5 to-slate-500/5 transition-opacity duration-1000" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center max-w-md mx-auto space-y-4"
      >
        {/* Isotipo minimalista */}
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20 flex items-center justify-center backdrop-blur-md shadow-lg shadow-teal-500/5">
            <span className="text-2xl font-black bg-gradient-to-br from-teal-500 to-emerald-500 bg-clip-text text-transparent">
              N
            </span>
          </div>
        </div>

        {/* Wordmark limpio sin saturación ni ruido */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Neusit
          </h1>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Core Platform
          </p>
        </div>

        {/* Acceso discreto para SuperAdmin al Widget de Telemetría */}
        {isSuperAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <button
              onClick={toggleHud}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hud-panel border border-teal-500/25 text-teal-400 hover:text-teal-300 text-[11px] font-mono tracking-wider shadow-sm hover:shadow-teal-500/20 transition-all duration-300"
            >
              <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span>{isHudOpen ? "HUD Telemetría Activo" : "Abrir HUD Telemetría (Sa)"}</span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default HomePage;
