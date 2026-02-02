import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const Dashboard = () => {
  const { user, logout } = useAuth();

  // Verificar roles de forma segura
  const roles = user.roles || [];
  const isAdmin = roles.includes('adm');

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-black/5 dark:ring-white/10">
        {/* Cabecera con Avatar */}
        <div className={`relative h-28 rounded-t-xl bg-gradient-to-r ${isAdmin ? 'from-purple-600 to-pink-600' : 'from-blue-500 to-cyan-500'}`}>
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-full p-1.5 shadow-xl">
              <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl font-bold ${isAdmin ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          {/* Botón de Retorno Discreto */}
          <Link to="/" className="absolute top-4 right-4 text-white/80 hover:text-white text-xs font-medium bg-black/20 hover:bg-black/30 px-3 py-1 rounded-full transition-colors backdrop-blur-sm">
            ← Ver Estados
          </Link>
        </div>
        
        {/* Contenido */}
        <div className="pt-16 pb-8 px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h2>
          
          {/* Badge de Rol Dinámico */}
          <div className="mt-2 flex justify-center gap-2">
            {roles.map(role => {
              let badgeStyle = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"; // Fallback
              let label = role;

              if (role === 'usr') {
                badgeStyle = "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
                label = "Usr";
              } else if (role === 'adm') {
                badgeStyle = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
                label = "Adm";
              } else if (role === 'Sa') {
                badgeStyle = "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-sm";
                label = "Sa";
              }

              return (
                <span key={role} className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wide border-none ${badgeStyle}`}>
                  {label}
                </span>
              );
            })}
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-100 dark:hover:border-violet-800 group">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider group-hover:text-violet-500 dark:group-hover:text-violet-400">ID Usuario</p>
              <p className="font-mono font-bold text-gray-800 dark:text-gray-200 text-lg">#{user.id}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-100 dark:hover:border-green-800 group">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider group-hover:text-green-500 dark:group-hover:text-green-400">Sistema</p>
              <p className="font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span> 
                Online
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3">
             {isAdmin && (
               <Link to="/admin">
                 <Button variant="secondary" className="w-full mb-3 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800">
                   🛠️ Panel de Administración
                 </Button>
               </Link>
             )}
             
             <Button variant="danger" onClick={logout} className="w-full py-2.5 shadow-red-100 dark:shadow-none rounded-xl">
               Cerrar Sesión
             </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;