import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

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

  if (loading) return <div className="text-center p-8 dark:text-gray-400">Cargando administración...</div>;

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

      <Card className="overflow-hidden border-0 shadow-lg dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm uppercase">Usuario</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm uppercase">Estado</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm uppercase text-center">Admin</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${u.isAdmin ? 'bg-purple-600' : 'bg-gray-400'}`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{u.username}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">ID: #{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                       u.is_active 
                         ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30' 
                         : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                     }`}>
                       {u.is_active ? 'Activo' : 'Desactivado'}
                     </span>
                  </td>
                  <td className="p-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={u.isAdmin}
                        onChange={() => toggleRole(u.id, u.isAdmin)}
                        disabled={u.id === user.id} // No quitarse admin a uno mismo accidentalmente
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
                    </label>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant={u.is_active ? "danger" : "secondary"}
                      onClick={() => toggleStatus(u.id, u.is_active)}
                      disabled={u.id === user.id}
                      className={u.is_active ? "" : "bg-green-600 hover:bg-green-700 text-white dark:bg-green-600"}
                    >
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        size="sm"
                        variant="danger" // Usamos danger, pero quizás un rojo más oscuro sería mejor o un icono de basura
                        className="bg-red-800 hover:bg-red-900 text-white"
                        onClick={() => deleteUser(u.id)}
                        disabled={u.id === user.id}
                        title="Eliminar permanentemente"
                      >
                        🗑️
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminPanel;