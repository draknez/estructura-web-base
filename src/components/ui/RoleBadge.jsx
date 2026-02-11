import React from 'react';

/**
 * RoleBadge: Componente unificado para mostrar roles con colores SÓLIDOS.
 * 
 * Colores:
 * - usr: Sky (Celeste sólido)
 * - adm: Emerald (Esmeralda sólido)
 * - Sa:  Amber/Gold (Dorado sólido)
 * - enc: Teal (Teal sólido)
 */
const RoleBadge = ({ role, className = "" }) => {
  let badgeStyle = "bg-gray-500 text-white"; // Fallback
  let label = role;

  if (role === 'usr') {
    badgeStyle = "bg-sky-500 text-white";
    label = "Usr";
  } else if (role === 'adm') {
    badgeStyle = "bg-emerald-600 text-white";
    label = "Adm";
  } else if (role === 'Sa') {
    badgeStyle = "bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#AA771C] text-[#5B3A08] shadow-md border border-white/20";
    label = "Sa";
  } else if (role === 'enc') {
    badgeStyle = "bg-teal-600 text-white";
    label = "Enc";
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border-none shadow-sm ${badgeStyle} ${className}`}>
      {label}
    </span>
  );
};

export const RoleBadgeList = ({ roles = [] }) => {
  return (
    <div className="flex gap-1">
      {roles.map(r => <RoleBadge key={r} role={r} />)}
    </div>
  );
};

export default RoleBadge;
