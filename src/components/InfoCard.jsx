const InfoCard = ({ title, description, type }) => {
  // Estilo simple basado en el tipo de info
  const borderColors = {
    warning: 'orange',
    info: 'blue',
    success: 'green'
  };

  const style = {
    border: `2px solid ${borderColors[type] || 'gray'}`,
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    maxWidth: '300px'
  };

  return (
    <div style={style}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p>{description}</p>
      <small>Tipo: {type}</small>
    </div>
  );
};

export default InfoCard;