import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TableDiv from '../../components/ui/TableDiv';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingUser, setEditingUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      
      const resUsers = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'x-access-token': token }
      });
      if (!resUsers.ok) throw new Error("Error cargando usuarios");
      setUsers(await resUsers.json());

      const resGroups = await fetch(`${API_URL}/api/groups`, {
        headers: { 'x-access-token': token }
      });
      if (resGroups.ok) {
        setGroups(await resGroups.json());
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const openEditModal = (u) => {
    setEditingUser(u);
    setSelectedGroup(u.group_id || "");
  };

  const handleSaveUser = async () => {
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/user/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ group_id: selectedGroup })
      });

      if (res.ok) {
        setEditingUser(null);
        fetchData();
      } else {
        alert("Error al actualizar usuario");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  const toggleRole = async (targetId, currentIsAdmin) => {
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/toggle-role`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-access-token': token 
        },
        body: JSON.stringify({ targetUserId: targetId, roleName: 'adm' })
      });
      
      if (res.ok) {
        setUsers(users.map(u => u.id === targetId ? { ...u, isAdmin: !currentIsAdmin } : u));
      }
    } catch (err) { alert("Error de conexión"); }
  };

  const toggleStatus = async (targetId, currentStatus) => {
    if (targetId === user.id) return alert("No puedes desactivarte a ti mismo");
    if (!confirm(`¿Estás seguro?`)) return;

    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/toggle-status`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-access-token': token 
        },
        body: JSON.stringify({ targetUserId: targetId })
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(users.map(u => u.id === targetId ? { ...u, is_active: data.newStatus } : u));
      }
    } catch (err) { alert("Error al cambiar estado"); }
  };

  const deleteUser = async (targetId) => {
    if (!confirm("⚠️ ¿BORRAR PERMANENTEMENTE?")) return;
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/user/${targetId}`, {
        method: 'DELETE',
        headers: { 'x-access-token': token }
      });
      if (res.ok) setUsers(users.filter(u => u.id !== targetId));
    } catch (err) { alert("Error al eliminar"); }
  };

  const isSuperAdmin = user.roles && user.roles.includes('Sa');

  const columns = [
    {
      key: 'username',
      label: 'Usuario',
      className: 'w-40 font-bold text-gray-900 dark:text-white justify-center', 
      headerClassName: 'w-40 justify-center',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.isAdmin ? 'bg-purple-600' : 'bg-gray-400'}`}>
            {u.username.charAt(0).toUpperCase()}
          </div>
          <p className="font-bold truncate">{u.username}</p>
        </div>
      )
    },
    {
      key: 'group',
      label: 'Grupo',
      className: 'w-40 justify-center',
      headerClassName: 'w-40 justify-center',
      render: (u) => (
        u.group_name ? (
          <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs px-2 py-1 rounded font-medium truncate max-w-full">
            {u.group_name}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">--</span>
        )
      )
    },
    {
      key: 'status',
      label: 'Estado',
      className: 'w-40 justify-center',
      headerClassName: 'w-40 justify-center',
      render: (u) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          u.is_active ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {u.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Controles',
      sticky: 'right',
      className: 'w-72 justify-center', 
      headerClassName: 'w-72 justify-center',
      render: (u) => (
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-gray-400">Admin</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={u.isAdmin} onChange={() => toggleRole(u.id, u.isAdmin)} disabled={u.id === user.id} />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
            </label>
          </div>

          <div className="flex gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
            <Button size="sm" variant="secondary" onClick={() => openEditModal(u)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              ✏️
            </Button>
            <Button size="sm" variant={u.is_active ? "danger" : "secondary"} onClick={() => toggleStatus(u.id, u.is_active)} disabled={u.id === user.id} className="text-xs px-3 py-1">
              {u.is_active ? 'Ban' : 'Unban'}
            </Button>
            {isSuperAdmin && (
              <Button size="sm" variant="danger" className="bg-red-800 hover:bg-red-900 text-white px-3 py-1" onClick={() => deleteUser(u.id)} disabled={u.id === user.id}>
                🗑️
              </Button>
            )}
          </div>
        </div>
      )
    }
  ];

  if (error) return <div className="text-center p-8"><Button onClick={fetchData}>Reintentar</Button></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administración</h1>
        <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 px-4 py-2 rounded-lg text-sm font-bold">Total: {users.length}</div>
      </div>

      <TableDiv columns={columns} data={users} loading={loading} />

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm bg-white dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Asignar Grupo</h2>
            <p className="text-sm text-gray-500 mb-4 font-bold uppercase">{editingUser.username}</p>
            <select 
              className="w-full p-2.5 rounded-lg border dark:bg-gray-800 dark:text-white mb-6"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">-- Sin Grupo --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button onClick={handleSaveUser} className="bg-violet-600 text-white">Guardar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
