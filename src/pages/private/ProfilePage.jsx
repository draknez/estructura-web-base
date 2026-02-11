import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import RoleBadge from '../../components/ui/RoleBadge';

const ProfilePage = () => {
  const { user, token, logout } = useAuth();
  const { appStyle, toggleAppStyle } = useTheme();
  const navigate = useNavigate();
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [seedCount, setSeedCount] = useState(10);

  // Verificar roles de forma segura
  const roles = user.roles || [];
  const isAdmin = roles.includes('adm');
  const isSuperAdmin = roles.includes('Sa');

  // Color del Contenedor Principal (Fondo Sólido o Gradiente)
  let containerClass = "bg-sky-500 shadow-lg shadow-sky-500/30";
  if (isAdmin) containerClass = "bg-emerald-600 shadow-lg shadow-emerald-600/30";
  if (isSuperAdmin) containerClass = "bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#AA771C] shadow-lg shadow-[#AA771C]/40";

  // Estilos dinámicos para el nombre de usuario según el rol
  let nameBadgeClass = "bg-white text-sky-600";
  if (isAdmin) nameBadgeClass = "bg-white text-emerald-700";
  if (isSuperAdmin) nameBadgeClass = "bg-white text-[#855a15]"; // Marrón dorado oscuro

  // Generar Usuarios Masivos
  const handleSeedUsers = async () => {
    if (!confirm(`¿Generar ${seedCount} usuarios aleatorios?`)) return;
    
    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/seed-users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-access-token': token 
        },
        body: JSON.stringify({ count: parseInt(seedCount) })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.message}`);
      } else {
        alert("Error al generar usuarios");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // Manejar Reset Total (Solo SuperAdmin)
  const handleSystemReset = async () => {
    const confirm1 = confirm("⛔ ¡PELIGRO CRÍTICO! ⛔\n\n¿Estás a punto de ELIMINAR TODOS LOS USUARIOS del sistema (incluido tú mismo)?\n\nEsta acción no se puede deshacer. El sistema volverá a estar vacío.");
    if (!confirm1) return;

    const confirm2 = confirm("¿Estás realmente seguro? \n\nEscribe 'SI' en tu mente y pulsa Aceptar para confirmar la DESTRUCCIÓN TOTAL de los datos.");
    if (!confirm2) return;

    try {
      const API_URL = `http://${window.location.hostname}:3000`;
      const res = await fetch(`${API_URL}/api/admin/system-reset`, {
        method: 'POST',
        headers: { 'x-access-token': token }
      });

      if (res.ok) {
        alert("♻️ El sistema ha sido reiniciado. Serás redirigido al inicio.");
        logout(); // Limpiar estado local
        navigate('/'); // Redirigir a home
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (error) {
      alert("Error de conexión crítico.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-2xl border-none p-8 flex flex-col items-center gap-6">
        
        {/* Contenedor Principal Estilo Pill Grande (Fondo Sólido) */}
        <div className={`flex items-center gap-4 p-1.5 pr-5 rounded-full ${containerClass}`}>
            
            {/* Badge Nombre de Usuario (Acorde al rol) */}
            <div className={`px-6 py-2.5 rounded-full shadow-md ${nameBadgeClass}`}>
                <span className="text-xl font-black tracking-tight">
                    {user.username}
                </span>
            </div>

            {/* Badges de Roles (Con sombra) */}
            <div className="flex gap-1.5">
                {roles.map(role => (
                    <RoleBadge key={role} role={role} className="!text-[11px] !px-3 !py-1 !shadow-md" />
                ))}
            </div>
        </div>

        {/* Status Badge (Monitor Style) */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"></span> 
            <span className="text-xs font-black uppercase tracking-[0.2em]">Online</span>
        </div>

        {/* Acciones */}
        <div className="w-full mt-4 space-y-4">
             {/* SUPERADMIN: Panel de Herramientas */}
             {isSuperAdmin && (
                <div className="pt-6 mt-2 border-t border-gray-100 dark:border-gray-800 w-full">
                   <button 
                     onClick={() => setShowAdminTools(!showAdminTools)}
                     className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-amber-500 transition-colors w-full text-center mb-4"
                   >
                     {showAdminTools ? 'OCULTAR TOOLS' : 'HERRAMIENTAS SA'}
                   </button>

                   {showAdminTools && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Switch de Estilo UI */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">UI Style</span>
                          <button 
                            onClick={toggleAppStyle}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                              appStyle === 'modern' 
                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' 
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {appStyle === 'modern' ? 'MODERN v2' : 'CLASSIC v1'}
                          </button>
                        </div>

                        {/* Generador */}
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seed Engine</p>
                          <div className="flex gap-2">
                            <Input 
                              type="number" 
                              value={seedCount} 
                              onChange={(e) => setSeedCount(e.target.value)}
                              className="w-20 text-center h-10 font-bold"
                              min="1"
                              max="500"
                            />
                            <Button size="sm" onClick={handleSeedUsers} className="flex-1 bg-[#AA771C] text-white h-10 font-bold hover:bg-[#8E6316]">
                              GENERAR
                            </Button>
                          </div>
                        </div>

                        {/* Reset */}
                        <Button 
                          size="sm"
                          variant="danger" 
                          onClick={handleSystemReset} 
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-black h-10 text-xs tracking-widest flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          SYSTEM RESET
                        </Button>
                     </div>
                   )}
                </div>
             )}
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
