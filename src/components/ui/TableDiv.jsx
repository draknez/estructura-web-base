import React, { useState, useEffect, useRef } from 'react';

/**
 * Componente TableDiv (Adaptado para BaLog)
 * Tabla responsiva basada en Flexbox con columnas fijas (Sticky) y animaciones.
 */
const TableDiv = ({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  loading = false,
  emptyMessage = 'No hay datos para mostrar',
  className = ''
}) => {
  const [displayData, setDisplayData] = useState([]);
  const isFirstRender = useRef(true);

  // Sincronización de datos con animaciones
  useEffect(() => {
    if (isFirstRender.current) {
      setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
      isFirstRender.current = false;
      return;
    }

    const currentIds = data.map(d => d[keyField]);
    
    // Detectar eliminaciones
    const deleted = displayData.filter(d => !d._isDeleting && !currentIds.includes(d[keyField]));
    
    if (deleted.length > 0) {
      // Marcar eliminados para animar salida
      setDisplayData(prev => prev.map(item => {
        if (deleted.find(d => d[keyField] === item[keyField])) {
          return { ...item, _isDeleting: true };
        }
        return item;
      }));

      // Eliminar físicamente después de la animación (300ms)
      setTimeout(() => {
        setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
      }, 300);
    } else {
      // Si son adiciones o actualizaciones, actualizar directo
      setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
    }
  }, [data, keyField]);

  if (!loading && (!displayData || displayData.length === 0)) {
    return (
      <div className="text-center p-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // Estilos Base (Adaptados a Gray/Violet)
  const rowBaseClass = "flex border-b border-gray-100 dark:border-gray-800 transition-all duration-300 items-center";
  // REMOVIDO: flex-1 para evitar estiramiento automático desalineado. El ancho lo controla la config de la columna.
  const cellBaseClass = "py-3 px-4 flex items-center shrink-0 text-sm"; 
  // AÑADIDO: flex items-center shrink-0 para que la cabecera se comporte igual que la celda
  const headerBaseClass = "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase tracking-wider py-3 px-4 flex items-center shrink-0";

  // Agrupar columnas por posición Sticky
  const leftStickyCols = columns.filter(c => c.sticky === 'left');
  const rightStickyCols = columns.filter(c => c.sticky === 'right');
  const centerCols = columns.filter(c => !c.sticky);

  const renderCellGroup = (cols, row, isHeader = false) => {
    return cols.map((col) => {
      const key = isHeader ? col.key : `${row[keyField]}-${col.key}`;
      const content = isHeader ? col.label : (col.render ? col.render(row) : row[col.key]);
      
      // Clases dinámicas
      let classes = `${cellBaseClass} ${col.className || ''}`;
      if (isHeader) classes = `${headerBaseClass} ${col.headerClassName || ''}`;
      
      // Ancho mínimo para columnas centrales (para forzar scroll)
      if (!col.sticky && !classes.includes('w-') && !classes.includes('min-w-')) {
        classes += ' min-w-[150px]';
      }

      return (
        <div key={key} className={classes}>
          {content}
        </div>
      );
    });
  };

  return (
    <div className={`relative rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Contenedor Scrollable */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        <div className="min-w-full inline-block align-middle">
          
          {/* HEADER ROW */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {leftStickyCols.length > 0 && (
              <div className="sticky left-0 z-20 flex bg-gray-50 dark:bg-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                {renderCellGroup(leftStickyCols, null, true)}
              </div>
            )}
            
            <div className="flex flex-1 bg-gray-50 dark:bg-gray-800">
              {renderCellGroup(centerCols, null, true)}
            </div>

            {rightStickyCols.length > 0 && (
              <div className="sticky right-0 z-20 flex bg-gray-50 dark:bg-gray-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                {renderCellGroup(rightStickyCols, null, true)}
              </div>
            )}
          </div>

          {/* DATA ROWS */}
          {displayData.map((row, idx) => {
            const isDeleting = row._isDeleting;
            const animClass = isDeleting ? 'opacity-0 scale-95 h-0 py-0 border-none' : 'opacity-100 scale-100';
            const bgClass = idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/50';
            const hoverClass = onRowClick ? 'cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30';

            return (
              <div 
                key={row[keyField]} 
                onClick={() => !isDeleting && onRowClick && onRowClick(row)}
                className={`${rowBaseClass} ${animClass} ${bgClass} ${hoverClass}`}
              >
                {/* Left Sticky Cells */}
                {leftStickyCols.length > 0 && (
                  <div className={`sticky left-0 z-10 flex bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
                    {renderCellGroup(leftStickyCols, row)}
                  </div>
                )}

                {/* Center Cells */}
                <div className="flex flex-1 bg-inherit">
                  {renderCellGroup(centerCols, row)}
                </div>

                {/* Right Sticky Cells */}
                {rightStickyCols.length > 0 && (
                  <div className={`sticky right-0 z-10 flex bg-inherit shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]`}>
                    {renderCellGroup(rightStickyCols, row)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TableDiv;
