import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Users,
  Building2,
  KeyRound,
  Mail,
  Layers3,
  Bell,
  History,
  NotebookTabs,
  ShieldCheck,
  Settings,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador","soporte","consulta","auditor"] },
  { to: "/personal", label: "Personal", icon: Users, roles: ["administrador","soporte","auditor"] },
  { to: "/empresas", label: "Empresas", icon: Building2, roles: ["administrador","soporte","consulta","auditor"] },
  { to: "/credenciales", label: "Credenciales", icon: KeyRound, roles: ["administrador","soporte","auditor"] },
  { to: "/correos-corporativos", label: "Correos corporativos", icon: Mail, roles: ["administrador","soporte"] },
  { to: "/aplicaciones", label: "Aplicaciones", icon: Layers3, roles: ["administrador","soporte"] },
  { to: "/alertas", label: "Alertas", icon: Bell, roles: ["administrador","soporte"] },
  { to: "/historial", label: "Historial", icon: History, roles: ["administrador","soporte"] },
];

export default function Sidebar() {
  const { role, canEdit } = useAuth();

  const linksVisibles = links.filter((item) =>
    item.roles.includes(role)
  );

  const puedeVerAuditoria =
    role === "administrador" ||
    role === "soporte";

  const puedeVerAdministracion =
    role === "administrador";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">YPF</div>

        <div>
          <strong>Portal de Personal</strong>
          <span>de Ejecución</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {linksVisibles.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        {canEdit && (
          <NavLink
            to="/otros"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <NotebookTabs size={18} />
            <span>Otros</span>
          </NavLink>
        )}
      </nav>

      {(puedeVerAuditoria || puedeVerAdministracion) && (
        <div className="sidebar-bottom">
          {puedeVerAuditoria && (
            <NavLink
              to="/auditoria"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <ShieldCheck size={18} />
              <span>Auditoría</span>
            </NavLink>
          )}

          {puedeVerAdministracion && (
            <NavLink
              to="/administracion"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Settings size={18} />
              <span>Administración</span>
            </NavLink>
          )}
        </div>
      )}
    </aside>
  );
}
