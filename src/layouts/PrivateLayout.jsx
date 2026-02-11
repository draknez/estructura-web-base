import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';

const PrivateLayout = () => {
  const { user } = useAuth();
  const { navbarPosition } = useTheme();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300 ${navbarPosition === 'bottom' ? 'pb-20' : ''}`}>
      <Navbar />

      {/* Contenido Principal Expansible */}
      <main className="flex-1 container mx-auto p-4 md:p-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Outlet />
      </main>
    </div>
  );
};

export default PrivateLayout;