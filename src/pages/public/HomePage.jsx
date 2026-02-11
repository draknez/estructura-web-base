import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';

const HomePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tighter">MONITOR</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Estado en Tiempo Real</p>
      </div>

      {loading && users.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Conectando...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map((u) => (
            <Card key={u.id} className="p-4 flex items-center justify-between group hover:border-teal-500/30 transition-all duration-300">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md transition-colors ${u.online ? 'bg-teal-600' : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'}`}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800 dark:text-gray-200 leading-tight group-hover:text-teal-600 transition-colors">
                    {u.username}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    ID: {u.id}
                  </span>
                </div>
              </div>
              
              {/* Status Pill */}
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${
                u.online 
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.online ? 'bg-white animate-pulse' : 'bg-gray-400 dark:bg-gray-600'}`}></span>
                {u.online ? 'ON' : 'OFF'}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
