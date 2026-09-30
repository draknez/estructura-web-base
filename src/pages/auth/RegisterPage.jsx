import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      return setError("Por favor completa todos los campos.");
    }
    
    if (password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }

    setLoading(true);
    const result = await register(username.trim(), password);
    setLoading(false);

    if (result.success) {
      addToast(`¡Cuenta creada con éxito! Bienvenido a Neusit.`, "success");
      navigate('/profile');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="relative flex justify-center items-center min-h-[82vh] px-4 py-8 overflow-hidden">
      {/* Halo ambiental de fondo (Glow Effect) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="relative rounded-[2rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Header */}
          <div className="pt-9 pb-3 px-8 text-center flex flex-col items-center">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: [0, -6, 6, 0] }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-teal-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/30 mb-3 cursor-pointer"
            >
              N
            </motion.div>
            
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Crear Cuenta
            </h1>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-8 pt-4 pb-6 space-y-4">
            <Input
              label="Elige un Usuario"
              icon={User}
              placeholder="Ej: usuario_pro"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />

            <Input
              label="Contraseña Segura"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              rightElement={
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded-md text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none"
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  tabIndex={-1}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={showPassword ? 'eye-off' : 'eye-on'}
                      initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
                      transition={{ duration: 0.15 }}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              }
            />

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="p-3 bg-red-50 dark:bg-red-950/40 shadow-sm shadow-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full mt-3 group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Completar Registro
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 pt-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link 
                to="/login" 
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                Inicia sesión
              </Link>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;