import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ username: false, password: false });
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasUserError = !username.trim();
    const hasPassError = !password;

    if (hasUserError || hasPassError) {
      setErrors({
        username: hasUserError,
        password: hasPassError
      });
      return;
    }

    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);

    if (result.success) {
      addToast(`Bienvenido a Neusit, ${username.trim()}`, "success");
      navigate('/profile');
    } else {
      // Activar aviso sutil en los inputs sin texto
      setErrors({ username: true, password: true });
    }
  };

  return (
    <div className="relative flex justify-center items-center min-h-[82vh] px-4 py-8 overflow-hidden">
      {/* Halo ambiental de fondo (Glow Effect) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-gradient-to-tr from-teal-500/15 via-emerald-500/10 to-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="relative rounded-[2rem] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Header & Identidad de Marca Neusit */}
          <div className="pt-9 pb-3 px-8 text-center flex flex-col items-center">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: [0, -6, 6, 0] }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-600 to-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-teal-500/30 mb-3 cursor-pointer"
            >
              N
            </motion.div>
            
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
              Neusit
            </h1>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-8 pt-4 pb-6 space-y-4">
            <Input
              label="Usuario"
              icon={User}
              placeholder="Tu nombre de usuario"
              value={username}
              error={errors.username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors(prev => ({ ...prev, username: false }));
              }}
              autoComplete="username"
            />

            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              icon={Lock}
              placeholder="••••••••"
              value={password}
              error={errors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: false }));
              }}
              autoComplete="current-password"
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

            <Button
              type="submit"
              size="lg"
              className="w-full mt-3 group"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accediendo...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Entrar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer del Card */}
          <div className="px-8 pb-8 pt-1 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              ¿No tienes cuenta?{' '}
              <Link 
                to="/register" 
                className="font-bold text-teal-600 dark:text-teal-400 hover:underline hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
              >
                Regístrate aquí
              </Link>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
