import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Radio, 
  Zap, 
  Cpu, 
  Minimize2, 
  Maximize2, 
  X, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';

/**
 * SaFuturisticWidget: Widget futurista y minimalista de telemetría en tiempo real
 * Exclusivo para SuperAdmin (Sa).
 * Características:
 * - Gráfica de pulso y onda en tiempo real (SVG Bezier Spline reactivo)
 * - Matriz abstracta de nodos (puntos luminosos sin nombres de usuario)
 * - Mínimo texto, métricas puras y micro-iconos
 * - Modo flotante con soporte para minimizar/expandir y cerrar
 */
export const SaFuturisticWidget = ({ embedded = false }) => {
  const {
    isSuperAdmin,
    isHudOpen,
    toggleHud,
    isMinimized,
    toggleMinimize,
    onlineCount,
    offlineCount,
    totalCount,
    ping,
    history,
    loading,
    refreshIntervalMs,
    setRefreshIntervalMs,
    refetch
  } = useTelemetry();

  // Generación matemática de la curva SVG suave (Catmull-Rom o Bezier)
  const svgPath = useMemo(() => {
    if (!history || history.length < 2) return { line: '', area: '' };
    const width = 280;
    const height = 64;
    const padding = 4;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;
    const step = usableWidth / (history.length - 1);

    const points = history.map((val, idx) => {
      const x = padding + idx * step;
      // Invertir Y (0 arriba, height abajo)
      const y = height - padding - (val / 100) * usableHeight;
      return { x, y };
    });

    // Construcción de la curva Bezier suave
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const area = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    return { line: path, area };
  }, [history]);

  // Abstract Node Constellation: Lista de nodos anónimos para la matriz visual
  const abstractNodes = useMemo(() => {
    const list = [];
    const maxNodes = Math.min(totalCount > 0 ? totalCount : 16, 24);
    for (let i = 0; i < maxNodes; i++) {
      list.push({
        id: i,
        online: i < onlineCount
      });
    }
    return list;
  }, [totalCount, onlineCount]);

  // Si no es SuperAdmin, no renderizar nada
  if (!isSuperAdmin) return null;

  // Si no está abierto y no está embebido, no renderizar
  if (!embedded && !isHudOpen) return null;

  // Modo Minimized flotante
  if (!embedded && isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        className="fixed bottom-6 right-6 z-50 select-none"
      >
        <button
          onClick={toggleMinimize}
          className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full hud-panel border border-teal-500/30 text-teal-300 shadow-xl shadow-teal-500/10 hover:border-teal-400 hover:shadow-teal-500/20 transition-all duration-300"
          title="Expandir Telemetría Sa"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
          </span>
          <Activity className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
          <span className="font-mono text-[11px] font-bold tracking-widest text-slate-200">
            {onlineCount}/{totalCount || 0}
          </span>
          <span className="font-mono text-[10px] text-teal-400/80">
            {ping}ms
          </span>
          <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </motion.div>
    );
  }

  // Contenido principal del widget (embebido o flotante)
  const widgetContent = (
    <div className={`select-none overflow-hidden rounded-2xl hud-panel border border-teal-500/25 transition-all duration-300 ${
      embedded ? 'w-full shadow-lg' : 'w-[320px] sm:w-[350px] shadow-2xl shadow-teal-500/15'
    }`}>
      {/* HUD Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-teal-500/15 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
          </span>
          <Activity className="w-3.5 h-3.5 text-teal-400" />
          <span className="font-mono text-[11px] font-bold tracking-widest text-teal-200 uppercase">
            SYS.PULSE
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            Sa
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1 rounded-lg hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          </button>
          {!embedded && (
            <>
              <button
                onClick={toggleMinimize}
                className="p-1 rounded-lg hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
                title="Minimizar HUD"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              <button
                onClick={toggleHud}
                className="p-1 rounded-lg hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cerrar HUD"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Real-time Oscilloscope Wave Graph */}
      <div className="p-4 space-y-3">
        <div className="relative h-20 w-full rounded-xl overflow-hidden hud-grid border border-teal-500/15 bg-slate-950/70 p-1 flex items-center justify-center">
          {/* Subtle Scanline Effect */}
          <div className="absolute inset-0 pointer-events-none hud-scanline opacity-25"></div>

          {/* SVG Wave */}
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 280 64">
            <defs>
              <linearGradient id="hudWaveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill under wave */}
            <path d={svgPath.area} fill="url(#hudWaveGradient)" />

            {/* Glowing Spline Line */}
            <path
              d={svgPath.line}
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="drop-shadow(0 0 4px rgba(45,212,191,0.6))"
            />
          </svg>

          {/* Floating live badge in graph corner */}
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/80 border border-teal-500/20 text-[9px] font-mono text-teal-300">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span>{ping}ms</span>
          </div>
        </div>

        {/* Minimalist Metrics Badges (Zero user names, strict metrics only) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Active Nodes */}
          <div className="p-2 rounded-xl bg-slate-900/50 border border-teal-500/15 text-center flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
              ON
            </span>
            <span className="font-mono text-base font-black text-emerald-300 mt-0.5">
              {onlineCount}
            </span>
          </div>

          {/* Inactive Nodes */}
          <div className="p-2 rounded-xl bg-slate-900/50 border border-teal-500/15 text-center flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              IDLE
            </span>
            <span className="font-mono text-base font-black text-slate-300 mt-0.5">
              {offlineCount}
            </span>
          </div>

          {/* Network Sync / Ping */}
          <div className="p-2 rounded-xl bg-slate-900/50 border border-teal-500/15 text-center flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-cyan-400" />
              SYNC
            </span>
            <span className="font-mono text-base font-black text-cyan-300 mt-0.5">
              {totalCount > 0 ? `${Math.round((onlineCount / totalCount) * 100)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Abstract Node Matrix Constellation (Pure visual nodes, no usernames) */}
        <div className="p-2.5 rounded-xl bg-slate-900/40 border border-teal-500/10 space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-teal-400" />
              NODE.MATRIX
            </span>
            <span>{totalCount} NODES</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap py-1">
            {abstractNodes.length === 0 ? (
              <span className="text-[10px] font-mono text-slate-500">Sin nodos activos</span>
            ) : (
              abstractNodes.map((n) => (
                <span
                  key={n.id}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    n.online
                      ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.9)] scale-110'
                      : 'bg-slate-700/80 hover:bg-slate-600'
                  }`}
                  title={n.online ? 'Nodo Conectado' : 'Nodo Desconectado'}
                />
              ))
            )}
          </div>
        </div>

        {/* Minimal Footer: Interval Rate Selector */}
        <div className="flex items-center justify-between pt-1 border-t border-teal-500/10 text-[9px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
            STREAM SECURE
          </span>
          <div className="flex items-center gap-1">
            {[1000, 2000, 5000].map(ms => (
              <button
                key={ms}
                onClick={() => setRefreshIntervalMs(ms)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  refreshIntervalMs === ms
                    ? 'bg-teal-500/25 text-teal-300 font-bold border border-teal-500/40'
                    : 'hover:text-slate-200'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Si está embebido en una página (ej. ProfilePage)
  if (embedded) {
    return widgetContent;
  }

  // Si es el HUD flotante global
  return (
    <AnimatePresence>
      <motion.aside
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-6 right-6 z-50"
        aria-label="Telemetría SuperAdmin"
      >
        {widgetContent}
      </motion.aside>
    </AnimatePresence>
  );
};

export default SaFuturisticWidget;
