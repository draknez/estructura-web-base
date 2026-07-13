import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import RoleBadge from '../../components/ui/RoleBadge';
import TwoFactorSetup from '../../features/auth/components/TwoFactorSetup';
import TwoFactorDisable from '../../features/auth/components/TwoFactorDisable';

const ProfilePage = () => {
  const { user, authFetch, API_URL, logout, get2FAStatus } = useAuth();
  const { addToast } = useToast();
  const { appStyle, toggleAppStyle } = useTheme();
  const navigate = useNavigate();
  const [showAdminTools, setShowAdminTools] = useState(false);
  const [seedCount, setSeedCount] = useState(10);
  const [seedPassword, setSeedPassword] = useState('');
  const [twoFAEnabled, setTwoFAEnabled] = useState(null);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  useEffect(() => {
    let cancelled = false;
    get2FAStatus()
      .then((s) => { if (!cancelled) setTwoFAEnabled(!!s.enabled); })
      .catch(() => { if (!cancelled) setTwoFAEnabled(false); });
    return () => { cancelled = true; };
  }, [get2FAStatus]);

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
  if (isSuperAdmin) nameBadgeClass = "bg-white text-[#855a15]";

  // Generar Usuarios Masivos
  const handleSeedUsers = async () => {
    const parsed = parseInt(seedCount, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500) {
      return addToast('Cantidad debe estar entre 1 y 500', 'error');
    }
    if (!seedPassword || seedPassword.length < 8) {
      return addToast('La contraseña debe tener al menos 8 caracteres.', 'error');
    }
    if (seedPassword === '123456') {
      return addToast('La contraseña es demasiado débil.', 'error');
    }
    if (!window.confirm(`¿Generar ${parsed} usuarios con la contraseña indicada?`)) return;

    try {
      const res = await authFetch(`${API_URL}/api/admin/seed-users`, {
        method: 'POST',
        body: JSON.stringify({ count: parsed, password: seedPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        window.alert(`✅ ${data.message}`);
      } else {
        const err = await res.json().catch(() => ({}));
        window.alert(`Error: ${err.error || 'desconocido'}`);
      }
    } catch (error) {
      window.alert(`Error de conexión: ${error.message}`);
    }
  };

  // Manejar Reset Total (Solo SuperAdmin) — typed-string 'RESET' + re-auth con contraseña
  const handleSystemReset = async () => {
    const typed = window.prompt(
      "⛔ PELIGRO CRÍTICO ⛔\n\nVas a ELIMINAR TODOS LOS USUARIOS del sistema (incluido tú mismo).\nEsta acción NO se puede deshacer.\n\nEscribe RESET (en mayúsculas) para confirmar:"
    );
    if (typed !== 'RESET') {
      if (typed !== null) window.alert('Confirmación incorrecta. Reset cancelado.');
      return;
    }

    const confirmPassword = window.prompt(
      "🔐 STEP-UP AUTH\n\nPor seguridad, re-ingresa tu contraseña actual de SuperAdmin:"
    );
    if (!confirmPassword) {
      window.alert('Operación cancelada.');
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/admin/system-reset`, {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'RESET', confirmPassword }),
      });

      if (res.ok) {
        window.alert('♻️ Sistema reiniciado. Serás redirigido al inicio.');
        logout();
        navigate('/');
      } else {
        const err = await res.json().catch(() => ({}));
        window.alert(`Error: ${err.error || 'desconocido'}`);
      }
    } catch (error) {
      window.alert(`Error de conexión crítico: ${error.message}`);
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
             {/* Sección 2FA — disponible para cualquier usuario logueado */}
             <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                      twoFAEnabled ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200">
                        Verificación 2FA
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {twoFAEnabled === null
                          ? 'Cargando…'
                          : twoFAEnabled
                          ? 'Activada'
                          : 'Desactivada'}
                      </p>
                    </div>
                  </div>

                  {twoFAEnabled ? (
                    <Button size="sm" variant="danger" onClick={() => setShowDisable2FA(true)}>
                      Desactivar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setShowSetup2FA(true)} disabled={twoFAEnabled === null}>
                      Activar
                    </Button>
                  )}
                </div>
             </div>

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
                          <Input
                            type="password"
                            value={seedPassword}
                            onChange={(e) => setSeedPassword(e.target.value)}
                            placeholder="Contraseña para usuarios generados (≥8 chars)"
                            className="h-10 text-sm"
                            maxLength={200}
                          />
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

      {/* Modales 2FA */}
      <Modal
        isOpen={showSetup2FA}
        onClose={() => setShowSetup2FA(false)}
        title="Activar verificación 2FA"
      >
        <TwoFactorSetup
          onClose={() => setShowSetup2FA(false)}
          onEnabled={() => setTwoFAEnabled(true)}
        />
      </Modal>

      <Modal
        isOpen={showDisable2FA}
        onClose={() => setShowDisable2FA(false)}
        title="Desactivar verificación 2FA"
      >
        <TwoFactorDisable
          onClose={() => setShowDisable2FA(false)}
          onDisabled={() => setTwoFAEnabled(false)}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;
