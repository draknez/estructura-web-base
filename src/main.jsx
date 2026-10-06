import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { TelemetryProvider } from './context/TelemetryContext';

// Layouts
import BaseLayout from './layouts/BaseLayout';
import PrivateLayout from './layouts/PrivateLayout';

// Pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/private/ProfilePage';
import UsersPage from './pages/private/UsersPage';
import GroupsPage from './pages/private/GroupsPage';
import ContentStudioPage from './pages/private/ContentStudioPage';
import PostViewPage from './pages/public/PostViewPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <TelemetryProvider>
            <BrowserRouter>
              <Routes>
              {/* Layout Base persistente para toda la aplicación */}
              <Route element={<BaseLayout />}>
                {/* Rutas Públicas */}
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="posts" element={<PostViewPage />} />
                <Route path="posts/:slug" element={<PostViewPage />} />

                {/* Rutas Privadas protegidas */}
                <Route element={<PrivateLayout />}>
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="groups" element={<GroupsPage />} />
                  <Route path="studio" element={<ContentStudioPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </TelemetryProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
