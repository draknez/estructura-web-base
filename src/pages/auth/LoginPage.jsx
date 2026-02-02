import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card, CardHeader, Form } from '../../components/ui/Card';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirigir si ya está logueado
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username) return setError("El usuario es obligatorio");
    if (!password) return setError("La contraseña es obligatoria");

    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader 
          title="Bienvenido de nuevo" 
          description="Ingresa tus credenciales para acceder al panel." 
        />
        
        <Form onSubmit={handleSubmit}>
          <Input 
            label="Usuario" 
            placeholder="Ej: admin"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <Input 
            label="Contraseña" 
            type="password" 
            placeholder="••••••••"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-md flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full mt-2">
            Iniciar Sesión
          </Button>
        </Form>
        
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;