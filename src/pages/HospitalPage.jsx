import InfoCard from '../components/InfoCard';

const HospitalPage = () => {
  return (
    <div>
      <h2>Panel del Hospital</h2>
      <p>Vista general de los departamentos y avisos.</p>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <InfoCard 
          title="Urgencias" 
          description="Tiempo de espera: 15 mins" 
          type="warning" 
        />
        <InfoCard 
          title="Pediatría" 
          description="Doctores disponibles: 4" 
          type="success" 
        />
        <InfoCard 
          title="Administración" 
          description="Cierre fiscal en proceso" 
          type="info" 
        />
      </div>
    </div>
  );
};

export default HospitalPage;