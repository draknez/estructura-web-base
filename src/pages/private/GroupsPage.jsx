import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TableDiv from '../../components/ui/TableDiv';

const GroupsPage = () => {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', description: '', parent_id: '' });

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/groups`, {
        headers: { 'x-access-token': token }
      });
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', description: '', parent_id: '' });
        fetchGroups();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (error) {
      alert("Error al crear grupo");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este grupo?")) return;
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/groups/${id}`, {
        method: 'DELETE',
        headers: { 'x-access-token': token }
      });
      
      if (res.ok) {
        fetchGroups();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { alert("Error de conexión"); }
  };

  const columns = [
    {
      key: 'name',
      label: 'Nombre',
      className: 'font-bold min-w-[150px]',
      render: (g) => (
        <div>
          <p className="text-gray-900 dark:text-gray-100 font-bold">{g.name}</p>
          <p className="text-xs text-gray-400">{g.description}</p>
        </div>
      )
    },
    {
      key: 'parent',
      label: 'Dependencia (Padre)',
      className: 'min-w-[150px]',
      render: (g) => (
        g.parent_name ? (
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-bold">
            ↳ {g.parent_name}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">Raíz</span>
        )
      )
    },
    {
      key: 'actions',
      label: 'Acciones',
      sticky: 'right',
      className: 'w-24 justify-center',
      headerClassName: 'text-center',
      render: (g) => (
        <Button variant="danger" size="sm" onClick={() => handleDelete(g.id)} className="px-2 py-1 text-xs">
          Borrar
        </Button>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Grupos</h1>
           <p className="text-gray-500 dark:text-gray-400">Organigrama y Jerarquías.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-violet-600 text-white">
          + Nuevo Grupo
        </Button>
      </div>

      <TableDiv columns={columns} data={groups} loading={loading} emptyMessage="No hay grupos creados." />

      {/* Modal Simple */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Crear Grupo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nombre</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Recursos Humanos" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Descripción</label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Breve descripción..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Grupo Padre (Opcional)</label>
                <select 
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white"
                  value={formData.parent_id}
                  onChange={e => setFormData({...formData, parent_id: e.target.value})}
                >
                  <option value="">-- Ninguno (Raíz) --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-violet-600 text-white">Guardar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
