import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Card, CardHeader, Form } from '../../components/ui/Card';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { user, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/profile" replace />;

  // Validación cliente alineada con backend
  const validate = () => {
    setError('');
    if (!username) return 'El usuario es requerido.';
    if (username.length < 3 || username.length > 30) return 'El usuario debe tener entre 3 y 30 caracteres.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Sólo letras, números y guion bajo.';
    if (!password) return 'La contraseña es requerida.';
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const localError = validate();
    if (localError) {
      setError(localError);
      return;
    }

    const result = await register(username, password);
    if (result.success) {
      addToast('Cuenta creada con éxito', 'success');
      navigate('/profile');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-md border-teal-100 dark:border-teal-900 shadow-teal-50 dark:shadow-none">
        <CardHeader title="Crear Cuenta" description="Únete a nosotros en segundos." />

        <Form onSubmit={handleSubmit}>
          <Input
            label="Elige un Usuario"
            placeholder="Ej: usuario_pro"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            maxLength={30}
          />
          <Input
            label="Contraseña Segura"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            error={error && /contraseña|password|caracteres/i.test(error) ? error : null}
            maxLength={200}
          />
          <Input
            label="Confirmar Contraseña"
            type="password"
            placeholder="Repite la contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={error && /coinciden/i.test(error) ? error : null}
            maxLength={200}
          />

          {error && !/contraseña|password|caracteres|coinciden/i.test(error) && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full mt-2">
            Completar Registro
          </Button>
        </Form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default RegisterPage;