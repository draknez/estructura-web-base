import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

/**
 * Desactivación de 2FA con step-up: password + código TOTP.
 */
const TwoFactorDisable = ({ onClose, onDisabled }) => {
  const { disable2FA } = useAuth();
  const { addToast } = useToast();

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) return setError('Contraseña requerida');
    if (!/^\d{6}$/.test(code)) return setError('Código de 6 dígitos requerido');

    try {
      setBusy(true);
      await disable2FA(password, code);
      addToast('2FA desactivado', 'success');
      if (onDisabled) onDisabled();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Para desactivar la verificación en dos pasos confirma tu contraseña
        y un código actual de tu app authenticator.
      </p>

      <Input
        label="Contraseña actual"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />

      <Input
        label="Código 2FA"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className="text-center tracking-[0.5em] font-mono text-lg"
        error={error}
      />

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? 'Desactivando…' : 'Desactivar 2FA'}
        </Button>
      </div>
    </form>
  );
};

export default TwoFactorDisable;
