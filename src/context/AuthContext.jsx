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

  // Cualquier 401 = sesión inválida/revocada/expirada. Forzar logout.
  if (res.status === 401) {
    const onLogout = AuthContext._on401;
    if (typeof onLogout === 'function') onLogout();
    throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
  }

  return res;
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
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar');
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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, API_URL, authFetch }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};