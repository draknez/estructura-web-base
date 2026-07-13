import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const API_URL = '';

export const useAuth = () => useContext(AuthContext);

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    const onLogout = AuthContext._on401;
    if (typeof onLogout === 'function') onLogout();
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }

  return res;
}

async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handle401 = () => {
    setUser(null);
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    AuthContext._on401 = handle401;
    return () => { AuthContext._on401 = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/me`, { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        /* offline o sin sesión */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (username, password) => {
    try {
      const { ok, data } = await postJSON('/api/login', { username, password });
      if (!ok) throw new Error(data.error || 'Error al iniciar sesión');

      if (data.requires_2fa) {
        return { success: true, requires_2fa: true, temp_token: data.temp_token };
      }
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const verify2FA = async (temp_token, code) => {
    try {
      const { ok, data } = await postJSON('/api/auth/2fa/verify', { temp_token, code });
      if (!ok) throw new Error(data.error || 'Código inválido');
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (username, password) => {
    try {
      const { ok, data } = await postJSON('/api/register', { username, password });
      if (!ok) throw new Error(data.error || 'Error al registrar');
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await authFetch(`${API_URL}/api/logout`, { method: 'POST' });
    } catch {
      /* el backend puede estar caído; el estado local se limpia igual */
    }
    setUser(null);
  };

  const get2FAStatus = async () => {
    const { ok, data } = await authFetch(`${API_URL}/api/auth/2fa/status`);
    if (!ok) throw new Error(data?.error || 'No se pudo obtener el estado 2FA');
    return data;
  };

  const setup2FA = async () => {
    const res = await authFetch(`${API_URL}/api/auth/2fa/setup`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el setup 2FA');
    return data;
  };

  const enable2FA = async (code) => {
    const res = await authFetch(`${API_URL}/api/auth/2fa/enable`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo activar 2FA');
    return data;
  };

  const disable2FA = async (password, code) => {
    const res = await authFetch(`${API_URL}/api/auth/2fa/disable`, {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo desactivar 2FA');
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      verify2FA,
      register,
      logout,
      loading,
      API_URL,
      authFetch,
      get2FAStatus,
      setup2FA,
      enable2FA,
      disable2FA,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
