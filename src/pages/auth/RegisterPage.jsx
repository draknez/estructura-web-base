import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card, CardHeader, Form } from '../../components/ui/Card';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, register } = useAuth();
  const navigate = useNavigate();

  // Redirigir si ya está logueado
  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 4) return setError("La contraseña debe tener al menos 4 caracteres");

    const result = await register(username, password);
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md border-teal-100 dark:border-teal-900 shadow-teal-50 dark:shadow-none">
        <CardHeader 
          title="Crear Cuenta" 
          description="Únete a nosotros en segundos." 
        />
        
        <Form onSubmit={handleSubmit}>
          <Input 
            label="Elige un Usuario" 
            placeholder="Ej: usuario_pro"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <Input 
            label="Contraseña Segura" 
            type="password" 
            placeholder="••••••••"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            error={error && error.includes('contraseña') ? error : null}
          />
          
          {error && !error.includes('contraseña') && (
             <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-md">
               {error}
             </div>
          )}

          <Button type="submit" size="lg" className="w-full mt-2">
            Completar Registro
          </Button>
        </Form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
          ¿Ya tienes cuenta? <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">Inicia sesión</Link>
        </p>
      </Card>
    </div>
  );
};

export default RegisterPage;