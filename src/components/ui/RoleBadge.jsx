import React from 'react';
import { ShieldAlert, ShieldCheck, UserCheck, User } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * RoleBadge: Sistema unificado de badges de rol para Neusit.
 * Estilo moderno tipo pill con micro-borde, fondo semitranslúcido y punto luminoso.
 */
const ROLE_CONFIG = {
  Sa: {
    label: 'SuperAdmin',
    shortLabel: 'Sa',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-amber-500/10',
    dotColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    icon: ShieldAlert,
  },
  adm: {
    label: 'Admin',
    shortLabel: 'Adm',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/10',
    dotColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]',
    icon: ShieldCheck,
  },
  enc: {
    label: 'Encargado',
    shortLabel: 'Enc',
    color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30 shadow-teal-500/10',
    dotColor: 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]',
    icon: UserCheck,
  },
  usr: {
    label: 'Usuario',
    shortLabel: 'Usr',
    color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700/80 shadow-slate-500/5',
    dotColor: 'bg-slate-400',
    icon: User,
  }
};

const RoleBadge = ({ role, short = false, showDot = true, showIcon = false, size = "md", className = "" }) => {
  const config = ROLE_CONFIG[role] || {
    label: role,
    shortLabel: role,
    color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    icon: User,
  };

  const Icon = config.icon;
  const displayText = short ? config.shortLabel : config.label;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-xs px-3.5 py-1.5 gap-2",
  }[size] || "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span 
      className={cn(
        "inline-flex items-center font-bold tracking-tight rounded-full border backdrop-blur-sm select-none shadow-sm transition-all",
        sizeClasses,
        config.color,
        className
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)} />
      )}
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{displayText}</span>
    </span>
  );
};

export const RoleBadgeList = ({ roles = [], short = true, size = "sm" }) => {
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {roles.map(r => (
        <RoleBadge key={r} role={r} short={short} size={size} />
      ))}
    </div>
  );
};

export default RoleBadge;
