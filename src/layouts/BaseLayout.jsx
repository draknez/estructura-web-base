import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const BaseLayout = () => {
  const { navbarPosition } = useTheme();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <Navbar />

      {/* Contenido Principal con desplazamiento fluido */}
      <main className={`container mx-auto px-4 md:px-8 animate-in fade-in duration-500 flex-1 w-full transition-[padding] duration-320 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        navbarPosition === 'bottom' ? 'pt-6 pb-24 md:pt-8 md:pb-28' : 'pt-20 pb-8 md:pt-22 md:pb-10'
      }`}>
        <Outlet />
      </main>
    </div>
  );
};

export default BaseLayout;