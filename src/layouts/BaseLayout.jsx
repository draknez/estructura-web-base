import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const BaseLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <Navbar />

      {/* Contenido Principal */}
      <main className="container mx-auto p-4 md:p-8 animate-in fade-in duration-500 flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default BaseLayout;