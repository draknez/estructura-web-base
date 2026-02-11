import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card, CardHeader, Form } from '../../components/ui/Card';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return addToast("Completa todos los campos", "error");

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      addToast(`Bienvenido, ${username}`, "success");
      navigate('/profile');
    } else {
      addToast(result.error, "error");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader 
          title="BaLog" 
          description="Inicia sesión en tu cuenta" 
        />
        
        <Form onSubmit={handleSubmit}>
          <Input 
            label="Usuario" 
            placeholder="Introduce tu usuario"
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
          
          <Button type="submit" size="lg" className="w-full mt-4" disabled={loading}>
            {loading ? "Accediendo..." : "Entrar"}
          </Button>
        </Form>
        
        <div className="px-8 pb-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-teal-600 hover:underline">
            Regístrate
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
