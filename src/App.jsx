import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";

import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Personal from "./pages/Personal";
import EjecutanteDetail from "./pages/EjecutanteDetail";
import EjecutanteForm from "./pages/EjecutanteForm";
import Empresas from "./pages/Empresas";
import EmpresaDetail from "./pages/EmpresaDetail";
import Credenciales from "./pages/Credenciales";
import CorreosCorporativos from "./pages/CorreosCorporativos";
import Aplicaciones from "./pages/Aplicaciones";
import Alertas from "./pages/Alertas";
import Historial from "./pages/Historial";
import Otros from "./pages/Otros";
import Auditoria from "./pages/Auditoria";
import Administracion from "./pages/Administracion";
import Login from "./pages/Login";
import { useAuth } from "./context/AuthContext";

import "./App.css";

function RutaPorRol({ allowedRoles, children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/empresas" element={<Empresas />} />

          <Route
            path="/personal"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte","auditor"]}>
                <Personal />
              </RutaPorRol>
            }
          />

          <Route
            path="/personal/:id"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte","auditor"]}>
                <EjecutanteDetail />
              </RutaPorRol>
            }
          />

          <Route
            path="/empresas/:id"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte","auditor"]}>
                <EmpresaDetail />
              </RutaPorRol>
            }
          />

          <Route
            path="/credenciales"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte","auditor"]}>
                <Credenciales />
              </RutaPorRol>
            }
          />

          <Route
            path="/personal/nuevo"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <EjecutanteForm />
              </RutaPorRol>
            }
          />

          <Route
            path="/personal/:id/editar"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <EjecutanteForm />
              </RutaPorRol>
            }
          />

          <Route
            path="/correos-corporativos"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <CorreosCorporativos />
              </RutaPorRol>
            }
          />

          <Route
            path="/aplicaciones"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <Aplicaciones />
              </RutaPorRol>
            }
          />

          <Route
            path="/alertas"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <Alertas />
              </RutaPorRol>
            }
          />

          <Route
            path="/historial"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <Historial />
              </RutaPorRol>
            }
          />

          <Route
            path="/otros"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <Otros />
              </RutaPorRol>
            }
          />

          <Route
            path="/auditoria"
            element={
              <RutaPorRol allowedRoles={["administrador","soporte"]}>
                <Auditoria />
              </RutaPorRol>
            }
          />

          <Route
            path="/administracion"
            element={
              <RutaPorRol allowedRoles={["administrador"]}>
                <Administracion />
              </RutaPorRol>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
