import { Outlet, Link } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* --- HEADER (Fijo) --- */}
      <header style={{ padding: '20px', background: '#333', color: 'white' }}>
        <h1>🏥 Sistema de Gestión</h1>
        <nav>
          <Link to="/" style={{ color: 'white', marginRight: '10px' }}>Inicio</Link> | 
          <Link to="/hospital" style={{ color: 'white', marginLeft: '10px' }}>Hospital</Link>
        </nav>
      </header>

      {/* --- CONTENIDO DINÁMICO (Aquí cambian las páginas) --- */}
      <main style={{ padding: '20px', minHeight: '400px' }}>
        <Outlet />
      </main>

      {/* --- FOOTER (Fijo) --- */}
      <footer style={{ padding: '10px', background: '#eee', textAlign: 'center' }}>
        <p>© 2026 Organización Web - Estructura Base</p>
      </footer>
    </div>
  );
};

export default MainLayout;