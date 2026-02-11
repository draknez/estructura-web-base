import React, { useState, useEffect, useRef } from 'react';
import Input from './Input';

/**
 * TableDiv (Componente Inteligente)
 * Maneja visualmente: Listado, Selección, Ordenamiento y Paginación.
 * 
 * Props:
 * - columns: Array de columnas. { key, label, render, sortable: true/false, sticky: 'left'/'right', className }
 * - data: Array de datos a mostrar.
 * - keyField: Campo único (default: 'id').
 * - onRowClick: Función al hacer click en fila.
 * - loading: Boolean.
 * - emptyMessage: Texto si no hay datos.
 * - sort: { key, direction, onSort(key) } - Opcional.
 * - pagination: { currentPage, totalPages, itemsPerPage, onPageChange(page), onLimitChange(limit) } - Opcional.
 * - selection: { selectedIds (Set), onSelectAll(bool), onSelectOne(id) } - Opcional.
 */
const TableDiv = ({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  loading = false,
  emptyMessage = 'No hay datos.',
  className = '',
  sort,       // Configuración de ordenamiento
  pagination, // Configuración de paginación
  selection   // Configuración de selección
}) => {
  const [displayData, setDisplayData] = useState([]);
  const isFirstRender = useRef(true);

  // --- 1. Gestión de Columnas (Inyección de Checkbox) ---
  const finalColumns = React.useMemo(() => {
    let cols = [...columns];
    
    // Si hay configuración de selección, inyectamos la columna 0
    if (selection) {
      const isAllSelected = data.length > 0 && data.every(item => selection.selectedIds.has(item[keyField]));
      const isIndeterminate = selection.selectedIds.size > 0 && !isAllSelected;

      cols.unshift({
        key: '_selection',
        sticky: 'left',
        className: 'w-10 justify-center',
        headerClassName: 'w-10 justify-center',
        label: (
          <input 
            type="checkbox" 
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            checked={isAllSelected}
            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
            onChange={(e) => selection.onSelectAll(e.target.checked)}
          />
        ),
        render: (row) => (
          <input 
            type="checkbox" 
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            checked={selection.selectedIds.has(row[keyField])}
            onChange={(e) => { e.stopPropagation(); selection.onSelectOne(row[keyField]); }}
          />
        )
      });
    }
    return cols;
  }, [columns, selection, data, keyField]);

  // --- 2. Sincronización de Datos y Animaciones ---
  useEffect(() => {
    if (isFirstRender.current) {
      setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
      isFirstRender.current = false;
      return;
    }
    const currentIds = data.map(d => d[keyField]);
    const displayIds = displayData.map(d => d[keyField]);
    const isFullSwap = data.length > 0 && !data.some(d => displayIds.includes(d[keyField]));

    if (isFullSwap) {
      setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
      return;
    }
    
    const deleted = displayData.filter(d => !d._isDeleting && !currentIds.includes(d[keyField]));
    
    if (deleted.length > 0) {
      setDisplayData(prev => prev.map(item => {
        if (deleted.find(d => d[keyField] === item[keyField])) return { ...item, _isDeleting: true };
        return item;
      }));
      setTimeout(() => setDisplayData(data.map(item => ({ ...item, _isDeleting: false }))), 300);
    } else {
      setDisplayData(data.map(item => ({ ...item, _isDeleting: false })));
    }
  }, [data, keyField]);

  // --- 3. Renderizado de Helpers (Paginación) ---
  const getPageNumbers = () => {
    if (!pagination) return [];
    const { currentPage, totalPages } = pagination;
    const pages = [];
    if (totalPages <= 5) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
    else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  // --- 4. Renderizado Principal ---
  if (!loading && (!displayData || displayData.length === 0)) {
    return (
      <div className="text-center p-12 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 shadow-sm">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{emptyMessage}</p>
      </div>
    );
  }

  const rowBaseClass = "flex border-b border-gray-50 dark:border-gray-800/50 transition-colors duration-200 items-center last:border-none";
  const cellBaseClass = "py-4 px-4 flex items-center shrink-0 text-sm";
  const headerBaseClass = "bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 font-black text-[10px] uppercase tracking-[0.15em] py-3 px-4 flex items-center shrink-0 backdrop-blur-sm";

  const leftStickyCols = finalColumns.filter(c => c.sticky === 'left');
  const rightStickyCols = finalColumns.filter(c => c.sticky === 'right');
  const centerCols = finalColumns.filter(c => !c.sticky);

  const renderCellGroup = (cols, row, isHeader = false) => {
    return cols.map((col) => {
      const key = isHeader ? col.key : `${row[keyField]}-${col.key}`;
      let content;

      if (isHeader) {
        // Render Header con Sort
        content = (
          <div 
            className={`flex items-center gap-1 ${col.sortable && sort ? 'cursor-pointer hover:text-teal-600 transition-colors select-none' : ''}`}
            onClick={() => col.sortable && sort && sort.onSort(col.key)}
          >
            {col.label}
            {col.sortable && sort && (
              <span className={`text-[8px] flex flex-col leading-none ml-1 ${sort.key === col.key ? 'opacity-100' : 'opacity-20'}`}>
                <span className={sort.key === col.key && sort.direction === 'asc' ? 'text-teal-600' : ''}>▲</span>
                <span className={sort.key === col.key && sort.direction === 'desc' ? 'text-teal-600' : ''}>▼</span>
              </span>
            )}
          </div>
        );
      } else {
        content = col.render ? col.render(row) : row[col.key];
      }
      
      let classes = `${cellBaseClass} ${col.className || ''}`;
      if (isHeader) classes = `${headerBaseClass} ${col.headerClassName || ''}`;
      
      if (!col.sticky && !classes.includes('w-') && !classes.includes('min-w-')) {
        classes += ' min-w-[150px]';
      }

      return <div key={key} className={classes}>{content}</div>;
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-900">
        
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
          <div className="min-w-full inline-block align-middle">
            {/* HEADER */}
            <div className="flex border-b border-gray-100 dark:border-gray-800">
              {leftStickyCols.length > 0 && (
                <div className="sticky left-0 z-20 flex bg-white dark:bg-gray-950 shadow-[2px_0_10px_-2px_rgba(0,0,0,0.1)]">
                  {renderCellGroup(leftStickyCols, null, true)}
                </div>
              )}
              <div className="flex flex-1 bg-white dark:bg-gray-950">
                {renderCellGroup(centerCols, null, true)}
              </div>
              {rightStickyCols.length > 0 && (
                <div className="sticky right-0 z-20 flex bg-white dark:bg-gray-950 shadow-[-2px_0_10px_-2px_rgba(0,0,0,0.1)]">
                  {renderCellGroup(rightStickyCols, null, true)}
                </div>
              )}
            </div>

            {/* ROWS */}
            {displayData.map((row, idx) => {
              const isDeleting = row._isDeleting;
              const animClass = isDeleting ? 'transition-all duration-300 opacity-0 scale-95 h-0 py-0 border-none' : 'opacity-100 scale-100';
              const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
              const darkBgClass = idx % 2 === 0 ? 'dark:bg-gray-950' : 'dark:bg-gray-900';
              const hoverClass = onRowClick ? 'cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40';

              return (
                <div 
                  key={row[keyField]} 
                  onClick={() => !isDeleting && onRowClick && onRowClick(row)}
                  className={`${rowBaseClass} ${animClass} ${bgClass} ${darkBgClass} ${hoverClass}`}
                >
                  {leftStickyCols.length > 0 && (
                    <div className={`sticky left-0 z-10 flex ${bgClass} ${darkBgClass} shadow-[2px_0_10px_-2px_rgba(0,0,0,0.05)]`}>
                      {renderCellGroup(leftStickyCols, row)}
                    </div>
                  )}
                  <div className="flex flex-1 bg-inherit">
                    {renderCellGroup(centerCols, row)}
                  </div>
                  {rightStickyCols.length > 0 && (
                    <div className={`sticky right-0 z-10 flex ${bgClass} ${darkBgClass} shadow-[-2px_0_10px_-2px_rgba(0,0,0,0.05)]`}>
                      {renderCellGroup(rightStickyCols, row)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PAGINATION FOOTER */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 select-none">
          <div className="flex items-center gap-2">
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 disabled:opacity-30 font-black" 
              onClick={() => pagination.onPageChange(Math.max(pagination.currentPage - 1, 1))} 
              disabled={pagination.currentPage === 1}
            >
              ←
            </button>
            <div className="flex gap-1.5">
              {getPageNumbers().map((p, i) => (
                <button 
                  key={i} 
                  disabled={p === '...'} 
                  onClick={() => typeof p === 'number' && pagination.onPageChange(p)} 
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-xs font-black transition-all shadow-sm ${
                    p === pagination.currentPage 
                      ? 'bg-teal-600 text-white scale-110' 
                      : p === '...' 
                        ? 'bg-transparent text-gray-400 cursor-default' 
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-teal-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 disabled:opacity-30 font-black" 
              onClick={() => pagination.onPageChange(Math.min(pagination.currentPage + 1, pagination.totalPages))} 
              disabled={pagination.currentPage === pagination.totalPages}
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ver:</span>
             <Input 
               type="number" 
               min="1" 
               value={pagination.itemsPerPage} 
               onChange={(e) => pagination.onLimitChange(Math.max(1, parseInt(e.target.value) || 1))} 
               className="w-12 bg-transparent text-center text-xs font-black outline-none border-none shadow-none focus:ring-0 p-0 h-auto"
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableDiv;
