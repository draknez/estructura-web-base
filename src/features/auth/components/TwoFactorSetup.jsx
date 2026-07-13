import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

/**
 * Wizard de activación 2FA:
 *   1. Genera secret + otpauth URL vía /api/auth/2fa/setup
 *   2. Muestra QR + secret en claro (para entrada manual)
 *   3. Pide código TOTP → /api/auth/2fa/enable
 *   4. Muestra 10 backup codes (una sola vez) con copy-to-clipboard
 *
 * Props:
 *   onClose: () => void   — cerrar el modal contenedor
 *   onEnabled: () => void — callback cuando el usuario confirma 2FA activo
 */
const TwoFactorSetup = ({ onClose, onEnabled }) => {
  const { setup2FA, enable2FA } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState('init');
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const data = await setup2FA();
        if (cancelled) return;
        setSecret(data.secret);
        setOtpauthUrl(data.otpauth_url);
        const svg = await QRCode.toString(data.otpauth_url, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 220,
        });
        if (!cancelled) setQrSvg(svg);
        setStep('scan');
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setup2FA]);

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast(`${label} copiado al portapapeles`, 'success');
    } catch {
      addToast('No se pudo copiar', 'error');
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('El código debe ser de 6 dígitos');
      return;
    }
    try {
      setBusy(true);
      const data = await enable2FA(code);
      setBackupCodes(data.backup_codes);
      setStep('backup');
      addToast('2FA activado correctamente', 'success');
      if (onEnabled) onEnabled();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {step === 'init' && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {busy ? 'Generando secreto…' : error || 'Iniciando…'}
        </p>
      )}

      {step === 'scan' && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Escanea este QR con tu app authenticator (Google Authenticator,
            Authy, Bitwarden…) o introduce el secreto manualmente.
          </p>

          <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            {qrSvg ? (
              <div
                className="w-[220px] h-[220px]"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                aria-label="Código QR para 2FA"
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-xs text-gray-400">
                Cargando QR…
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
              Secreto (entrada manual)
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs font-mono break-all">
                {secret}
              </code>
              <Button size="sm" variant="secondary" onClick={() => handleCopy(secret, 'Secreto')}>
                Copiar
              </Button>
            </div>
          </div>

          <form onSubmit={handleConfirm} className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Input
              label="Código de 6 dígitos"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              error={error}
              className="text-center tracking-[0.5em] font-mono text-lg"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Verificando…' : 'Activar 2FA'}
              </Button>
            </div>
          </form>
        </>
      )}

      {step === 'backup' && backupCodes && (
        <>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              ⚠️ Guarda estos códigos en un lugar seguro.
              Solo se muestran UNA vez y sirven para entrar si pierdes tu app.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((c) => (
              <code
                key={c}
                className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-mono text-center"
              >
                {c}
              </code>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => handleCopy(backupCodes.join('\n'), 'Códigos')}>
              Copiar todos
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default TwoFactorSetup;
