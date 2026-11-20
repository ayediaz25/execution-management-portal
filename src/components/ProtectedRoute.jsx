import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";


export default function ProtectedRoute({
  children,
}) {
  const {
    user,
    profile,
    loading,
  } = useAuth();


  if (loading) {

    return (
      <div className="auth-loading-page">
        Cargando portal...
      </div>
    );
  }


  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (
    !profile ||
    profile.activo === false
  ) {

    return (
      <div className="auth-disabled-page">

        <strong>
          Acceso no habilitado
        </strong>

        <span>
          Tu usuario no tiene acceso
          habilitado al portal.
        </span>

      </div>
    );
  }


  return children;
}