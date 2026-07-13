import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireRole = ({ roles, children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user.roles || [];
  const allowed = roles.some((r) => userRoles.includes(r));

  if (!allowed) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default RequireRole;