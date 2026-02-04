import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TableDiv from '../../components/ui/TableDiv';

const AdminPanel = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar usuarios
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      console.log("Fetching users with token:", token ? "Present" : "Missing"); // Debug
      
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'x-access-token': token }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: ${res.statusText}`);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  // Manejar cambio de Rol
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
        setUsers(users.map(u => 
          u.id === targetId ? { ...u, isAdmin: !currentIsAdmin } : u
        ));
      } else {
         alert("Error al cambiar rol");
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  // Manejar Ban/Unban
  const toggleStatus = async (targetId, currentStatus) => {
    if (targetId === user.id) return alert("No puedes desactivarte a ti mismo");
    
    if (!confirm(`¿Estás seguro de que deseas ${currentStatus === 1 ? 'desactivar' : 'activar'} a este usuario?`)) return;

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
        setUsers(users.map(u => 
          u.id === targetId ? { ...u, is_active: data.newStatus } : u
        ));
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      alert("Error al cambiar estado");
    }
  };

  // Manejar Eliminación (Solo SuperAdmin)
  const deleteUser = async (targetId) => {
    if (!confirm("⚠️ ¿ESTÁS SEGURO? Esta acción es irreversible y borrará al usuario permanentemente.")) return;

    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/user/${targetId}`, {
        method: 'DELETE',
        headers: { 
            'x-access-token': token 
        }
      });

      if (res.ok) {
        setUsers(users.filter(u => u.id !== targetId));
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar");
      }
    } catch (err) {
      alert("Error de conexión al eliminar");
    }
  };

  if (error) return (
    <div className="text-center p-8">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg inline-block">
        <p className="font-bold">Error al cargar usuarios</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchUsers} className="mt-4 bg-red-600 text-white">Reintentar</Button>
      </div>
    </div>
  );

  const isSuperAdmin = user.roles && user.roles.includes('Sa');

  // CONFIGURACIÓN DE COLUMNAS DE LA TABLA
  const columns = [
    {
      key: 'username',
      label: 'Usuario',
      className: 'w-40 font-bold text-gray-900 dark:text-white justify-center', 
      headerClassName: 'w-40 justify-center', // text-center -> justify-center (flex)
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
      key: 'status',
      label: 'Estado',
      className: 'w-40 justify-center',
      headerClassName: 'w-40 justify-center', // text-center -> justify-center (flex)
      render: (u) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          u.is_active 
            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
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
      headerClassName: 'w-72 justify-center', // text-center -> justify-center (flex)
      render: (u) => (
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Toggle Admin */}
          <div className="flex items-center gap-2" title="Conceder permisos de Administrador">
            <span className="text-[10px] uppercase font-bold text-gray-400">Admin</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={u.isAdmin}
                onChange={() => toggleRole(u.id, u.isAdmin)}
                disabled={u.id === user.id}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
            </label>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2 border-l border-gray-200 dark:border-gray-700 pl-4">
            <Button 
              size="sm" 
              variant={u.is_active ? "danger" : "secondary"}
              onClick={() => toggleStatus(u.id, u.is_active)}
              disabled={u.id === user.id}
              className={`text-xs px-3 py-1 ${u.is_active ? "" : "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600"}`}
            >
              {u.is_active ? 'Ban' : 'Unban'}
            </Button>
            
            {isSuperAdmin && (
              <Button
                size="sm"
                variant="danger"
                className="bg-red-800 hover:bg-red-900 text-white px-3 py-1"
                onClick={() => deleteUser(u.id)}
                disabled={u.id === user.id}
                title="Eliminar permanentemente"
              >
                🗑️
              </Button>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
           <p className="text-gray-500 dark:text-gray-400">Gestión de usuarios y permisos.</p>
        </div>
        <div className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-4 py-2 rounded-lg text-sm font-bold">
          Total Usuarios: {users.length}
        </div>
      </div>

      <TableDiv 
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No se encontraron usuarios."
      />
    </div>
  );
};

export default AdminPanel;