import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import BaseLayout from './layouts/PublicLayout';
import PrivateLayout from './layouts/PrivateLayout';
import RequireRole from './components/RequireRole';

// Pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/private/ProfilePage';
import UsersPage from './pages/private/UsersPage';
import GroupsPage from './pages/private/GroupsPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Rutas Públicas */}
              <Route path="/" element={<BaseLayout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
              </Route>

              {/* Rutas Privadas */}
              <Route element={<PrivateLayout />}>
                <Route path="profile" element={
                  <RequireRole roles={['usr', 'adm', 'Sa']}>
                    <ProfilePage />
                  </RequireRole>
                } />
                <Route path="users" element={
                  <RequireRole roles={['adm', 'Sa']}>
                    <UsersPage />
                  </RequireRole>
                } />
                <Route path="groups" element={
                  <RequireRole roles={['Sa']}>
                    <GroupsPage />
                  </RequireRole>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
