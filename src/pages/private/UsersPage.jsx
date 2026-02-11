import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TableDiv from '../../components/ui/TableDiv';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import ActionButton from '../../components/ui/ActionButton';
import Dropdown from '../../components/ui/Dropdown';

const UsersPage = () => {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const { navbarPosition, appStyle } = useTheme(); 
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState('all'); 
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({ username: '', password: '' });

  // Permiso SuperAdmin
  const isSuperAdmin = user?.roles?.includes('Sa');

  const fetchData = async () => {
    setLoading(true);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'x-access-token': token }
      });
      if (!res.ok) throw new Error("Error al obtener usuarios");
      setUsers(await res.json());
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchData(); }, [token]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'default';
    setSortConfig({ key, direction });
  };

  const processedUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesStatus = true;
      if (filterStatus === 'active') matchesStatus = u.is_active === 1;
      if (filterStatus === 'banned') matchesStatus = u.is_active === 0;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.direction !== 'default' && sortConfig.key) {
      result.sort((a, b) => {
        let aV = a[sortConfig.key];
        let bV = b[sortConfig.key];
        if (sortConfig.key === 'status') { aV = a.is_active; bV = b.is_active; }
        if (sortConfig.key === 'group') { aV = a.group_name || ''; bV = b.group_name || ''; }
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [users, searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.ceil(processedUsers.length / itemsPerPage);
  const currentUsers = processedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [searchTerm, itemsPerPage, filterStatus, sortConfig]);

  const handleSelectAll = (checked) => {
    if (checked) setSelectedIds(new Set(currentUsers.map(u => u.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleStatus = (targetId, currentStatus) => {
    if (targetId === user.id) return addToast("No puedes desactivarte a ti mismo", 'error');
    const API_URL = `http://${window.location.hostname}:3000`;
    fetch(`${API_URL}/api/admin/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
        body: JSON.stringify({ targetUserId: targetId })
    }).then(res => {
        if(res.ok) { addToast("Estado actualizado", 'success'); fetchData(); }
        else addToast("Error al actualizar", 'error');
    });
  };

  const deleteUser = (targetId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Usuario",
      description: "¿Borrar permanentemente?",
      confirmText: "Eliminar",
      variant: "danger",
      onConfirm: async () => {
        const API_URL = `http://${window.location.hostname}:3000`;
        const res = await fetch(`${API_URL}/api/admin/user/${targetId}`, {
            method: 'DELETE',
            headers: { 'x-access-token': token }
        });
        if(res.ok) { addToast("Usuario eliminado", 'success'); fetchData(); }
        else addToast("Error al eliminar", 'error');
      }
    });
  };

  const openCreateModal = () => { setEditingUser(null); setUserFormData({ username: '', password: '' }); setIsUserModalOpen(true); };
  const openEditModal = (u) => { setEditingUser(u); setUserFormData({ username: u.username, password: '' }); setIsUserModalOpen(true); };

  const handleUserSubmit = async () => {
    const API_URL = `http://${window.location.hostname}:3000`;
    try {
      const url = editingUser ? `${API_URL}/api/admin/user/${editingUser.id}` : `${API_URL}/api/admin/users`;
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'x-access-token': token },
          body: JSON.stringify(userFormData)
      });
      if (res.ok) { setIsUserModalOpen(false); addToast("Éxito", 'success'); fetchData(); }
      else { const err = await res.json(); addToast(err.error, 'error'); }
    } catch (e) { addToast("Error de conexión", 'error'); }
  };

  const executeBulkAction = async (actionType) => {
    const idsToProcess = Array.from(selectedIds);
    if (idsToProcess.length === 0) return;

    setConfirmConfig({
      isOpen: true,
      title: `${actionType === 'delete' ? 'Eliminar' : actionType === 'ban' ? 'Bloquear' : 'Activar'} ${idsToProcess.length} usuarios`,
      description: "¿Estás seguro? Esta acción afectará a todos los usuarios seleccionados.",
      confirmText: "Proceder",
      variant: actionType === 'delete' ? "danger" : "primary",
      onConfirm: async () => {
        const API_URL = `http://${window.location.hostname}:3000`;
        try {
            const promises = idsToProcess.map(id => {
            if (actionType === 'delete') {
                return fetch(`${API_URL}/api/admin/user/${id}`, {
                    method: 'DELETE',
                    headers: { 'x-access-token': token }
                });
            } else {
                const currentUser = users.find(u => u.id === id);
                if (!currentUser) return Promise.resolve();
                const needsAction = (actionType === 'ban' && currentUser.is_active) || (actionType === 'unban' && !currentUser.is_active);
                if (needsAction) {
                    return fetch(`${API_URL}/api/admin/toggle-status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-access-token': token },
                        body: JSON.stringify({ targetUserId: id })
                    });
                }
                return Promise.resolve();
            }
            });
            await Promise.all(promises);
            addToast(`Acción masiva completada`, 'success');
            setSelectedIds(new Set());
            fetchData();
        } catch(e) {
            addToast("Error ejecutando acción masiva", 'error');
        }
      }
    });
  };

  // COLUMNS
  const columns = useMemo(() => [
    { key: 'username', label: 'Usuario', sortable: true, className: 'w-40 font-bold justify-center', render: (u) => <p className="truncate">{u.username}</p> },
    { key: 'group', label: 'Grupo', sortable: true, className: 'w-40 justify-center', render: (u) => u.group_name ? <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{u.group_name}</span> : <span className="bg-gray-200 text-gray-500 text-[9px] px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Sin Asignar</span> },
    { key: 'status', label: 'Estado', sortable: true, className: 'w-32 justify-center', render: (u) => <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm ${u.is_active ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span> },
    { key: 'actions', label: 'Controles', sticky: 'right', className: 'w-48 justify-center', render: (u) => <div className="flex gap-2 border-l border-gray-200 dark:border-gray-700 pl-4 items-center"><ActionButton onClick={() => openEditModal(u)} variant="sky">Edit</ActionButton><ActionButton onClick={() => toggleStatus(u.id, u.is_active)} disabled={u.id === user.id} variant={u.is_active ? 'red' : 'teal'}>{u.is_active ? 'Ban' : 'Unban'}</ActionButton>{isSuperAdmin && <ActionButton onClick={() => deleteUser(u.id)} disabled={u.id === user.id} variant="danger">Elim</ActionButton>}</div> }
  ], [isSuperAdmin, user.id]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Usuarios</h1><p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Gestión de Acceso</p></div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
           <div className="w-40">{appStyle === 'modern' ? <Dropdown options={[{ label: 'Todos', value: 'all' }, { label: 'Activos', value: 'active' }, { label: 'Bloqueados', value: 'banned' }]} value={filterStatus} onChange={setFilterStatus} /> : <select className="h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold focus:ring-2 focus:ring-teal-500 px-3 w-full outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">TODOS</option><option value="active">ACTIVOS</option><option value="banned">BLOQUEADOS</option></select>}</div>
           <div className="flex-1 md:w-64"><SearchInput value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." /></div>
           {appStyle === 'classic' && <Button onClick={openCreateModal}>USUARIO+</Button>}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-teal-600 p-2 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-lg">
          <span className="text-xs font-black text-white uppercase tracking-widest ml-4">{selectedIds.size} SELECCIONADOS</span>
          <div className="flex gap-2 mr-2">
            <ActionButton variant="gray" className="!bg-white !text-teal-700" onClick={() => executeBulkAction('ban')}>BAN</ActionButton>
            <ActionButton variant="gray" className="!bg-white !text-teal-700" onClick={() => executeBulkAction('unban')}>UNBAN</ActionButton>
            {isSuperAdmin && <ActionButton variant="danger" className="!bg-red-900" onClick={() => executeBulkAction('delete')}>ELIMINAR</ActionButton>}
          </div>
        </div>
      )}

      <TableDiv 
        columns={columns} 
        data={currentUsers} 
        loading={loading} 
        emptyMessage="No se encontraron usuarios." 
        sort={{ key: sortConfig.key, direction: sortConfig.direction, onSort: requestSort }}
        pagination={{ currentPage, totalPages, itemsPerPage, onPageChange: setCurrentPage, onLimitChange: setItemsPerPage }}
        selection={{ selectedIds, onSelectAll: handleSelectAll, onSelectOne: handleSelectOne }}
      />

      {appStyle === 'modern' && (
        <button onClick={openCreateModal} className={`fixed right-6 z-40 bg-teal-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${navbarPosition === 'bottom' ? 'bottom-20' : 'bottom-6'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      )}

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? "Editar" : "Nuevo"}>
        <div className="space-y-4">
          <Input label="Usuario" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} />
          <Input type="password" label="Clave" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} placeholder="******" />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>CANCELAR</Button>
            <Button onClick={handleUserSubmit}>GUARDAR</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} onConfirm={confirmConfig.onConfirm} title={confirmConfig.title} description={confirmConfig.description} confirmText={confirmConfig.confirmText} variant={confirmConfig.variant} />
    </div>
  );
};

export default UsersPage;