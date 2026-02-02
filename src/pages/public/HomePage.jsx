import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';

const HomePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      // Detección automática de IP
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/users/status`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Monitor de Usuarios</h1>
        <p className="text-gray-500 dark:text-gray-400">Estado de conexión en tiempo real.</p>
      </div>

      {loading && users.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">Cargando estado...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id} className="p-4 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${u.online ? 'bg-violet-600 dark:bg-violet-700' : 'bg-gray-400 dark:bg-gray-600'}`}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{u.username}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">ID: #{u.id}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                   <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${u.online ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                     <span className={`w-2 h-2 rounded-full ${u.online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                     {u.online ? 'Online' : 'Offline'}
                   </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;