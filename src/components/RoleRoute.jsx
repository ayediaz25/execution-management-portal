import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  ShieldAlert,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";


export default function RoleRoute({
  children,
  roles = [],
}) {
  const location =
    useLocation();

  const {
    user,
    profile,
    role,
    loading,
  } =
    useAuth();


  /* =========================================================
     CARGANDO SESIÓN
     ========================================================= */

  if (loading) {
    return (
      <div className="role-route-loading">

        <div className="role-route-spinner" />

        <span>
          Verificando permisos...
        </span>

      </div>
    );
  }


  /* =========================================================
     SIN SESIÓN
     ========================================================= */

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }


  /* =========================================================
     PERFIL INVÁLIDO
     ========================================================= */

  if (
    !profile ||
    profile.activo === false
  ) {
    return (
      <div className="role-access-denied">

        <ShieldAlert
          size={31}
        />

        <strong>
          Acceso no habilitado
        </strong>

        <span>
          Tu perfil no se encuentra activo.
        </span>

      </div>
    );
  }


  /* =========================================================
     CONTROL DE ROL
     ========================================================= */

  if (
    roles.length > 0 &&
    !roles.includes(role)
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }


  return children;
}