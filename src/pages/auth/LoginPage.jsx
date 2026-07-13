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
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(null); // { temp_token }
  const { user, login, verify2FA } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  if (user) return <Navigate to="/profile" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return addToast('Completa todos los campos', 'error');

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.requires_2fa) {
      setTwoFactor({ temp_token: result.temp_token });
      return;
    }
    if (result.success) {
      addToast(`Bienvenido, ${username}`, 'success');
      navigate('/profile');
    } else {
      addToast(result.error, 'error');
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      return addToast('Código de 6 dígitos requerido', 'error');
    }

    setLoading(true);
    const result = await verify2FA(twoFactor.temp_token, code);
    setLoading(false);

    if (result.success) {
      addToast(`Bienvenido, ${username}`, 'success');
      navigate('/profile');
    } else {
      addToast(result.error, 'error');
    }
  };

  const handleBack = () => {
    setTwoFactor(null);
    setCode('');
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4">
      <Card className="w-full max-w-sm">
        <CardHeader
          title="BaLog"
          description={
            twoFactor
              ? 'Introduce el código de tu app authenticator'
              : 'Inicia sesión en tu cuenta'
          }
        />

        {!twoFactor ? (
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
              {loading ? 'Accediendo…' : 'Entrar'}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleVerify2FA}>
            <Input
              label="Código 2FA"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="text-center tracking-[0.5em] font-mono text-lg"
            />
            <Button type="submit" size="lg" className="w-full mt-4" disabled={loading}>
              {loading ? 'Verificando…' : 'Verificar'}
            </Button>
            <button
              type="button"
              onClick={handleBack}
              className="block mx-auto mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-teal-600"
            >
              ← Volver
            </button>
          </Form>
        )}

        {!twoFactor && (
          <div className="px-8 pb-8 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-teal-600 hover:underline">
              Regístrate
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;
