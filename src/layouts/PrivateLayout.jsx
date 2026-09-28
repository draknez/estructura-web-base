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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Navbar />

      {/* Contenido Principal Expansible con desplazamiento fluido */}
      <main className={`flex-1 container mx-auto px-4 md:px-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 transition-[padding] duration-320 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        navbarPosition === 'bottom' ? 'pt-6 pb-24 md:pt-8 md:pb-28' : 'pt-20 pb-8 md:pt-22 md:pb-10'
      }`}>
        <Outlet />
      </main>
    </div>
  );
};

export default PrivateLayout;