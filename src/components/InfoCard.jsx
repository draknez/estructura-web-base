const InfoCard = ({ title, description, type }) => {

  const style = {
    padding: '16px',
    borderRadius: '16px',
    marginBottom: '10px',
    maxWidth: '300px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
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