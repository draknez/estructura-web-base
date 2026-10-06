import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SaFuturisticWidget from '../components/SaFuturisticWidget';

const BaseLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300">
      <Navbar />

      {/* Contenido Principal con espaciado constante y posición fija e independiente del movimiento de la barra */}
      <main className="container mx-auto px-4 md:px-8 flex-1 w-full pt-20 pb-24 md:pt-22 md:pb-28">
        <Outlet />
      </main>

      {/* Widget Futurista de Telemetría Exclusivo para SuperAdmin (Sa) */}
      <SaFuturisticWidget />
    </div>
  );
};

export default BaseLayout;