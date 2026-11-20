import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  UserCog,
  ShieldCheck,
  Users,
  Plus,
  Pencil,
  CheckCircle2,
  CircleAlert,
  X,
  Save,
  UserRound,
} from "lucide-react";

import { supabase } from "../lib/supabase";


const ROLE_CONFIG = {
  administrador: {
    label: "Administrador",
    description:
      "Acceso completo al portal, auditoría y administración.",
    permissions: [
      "Ver todos los módulos",
      "Editar personal",
      "Gestionar credenciales",
      "Registrar recuperaciones",
      "Ver auditoría",
      "Administrar usuarios",
    ],
  },

  soporte: {
    label: "Soporte",
    description:
      "Gestión operativa de ejecutantes, credenciales y recuperaciones.",
    permissions: [
      "Ver Dashboard",
      "Ver y editar Personal",
      "Ver Empresas",
      "Gestionar Credenciales",
      "Ver Vencimientos",
      "Ver Aplicaciones",
      "Ver Alertas",
      "Ver Historial",
    ],
  },

  consulta: {
    label: "Contratistas",
    description:
      "Acceso genérico de consulta para empresas contratistas.",
    permissions: [
      "Ver Dashboard para contratistas",
      "Ver Empresas",
      "Descargar personal habilitado",
      "Sin acceso a datos sensibles",
      "Sin permisos de edición",
    ],
  },

  auditor: {
    label: "Visualizador interno",
    description:
      "Acceso interno de solo lectura a información operativa, sin gestión ni credenciales sensibles.",
    permissions: [
      "Ver Dashboard",
      "Ver Personal",
      "Ver Empresas",
      "Ver Credenciales",
      "Ver Vencimientos",
      "Sin permisos de edición",
      "Sin acceso a contraseñas ni PIN",
    ],
  },
};


export default function Administracion() {
  const [tab, setTab] =
    useState("usuarios");

  const [usuarios, setUsuarios] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    editingUser,
    setEditingUser,
  ] =
    useState(null);

  const [
    editName,
    setEditName,
  ] =
    useState("");

  const [
    editRole,
    setEditRole,
  ] =
    useState("consulta");

  const [
    editActive,
    setEditActive,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    modalError,
    setModalError,
  ] =
    useState("");

  const [
    showNewInfo,
    setShowNewInfo,
  ] =
    useState(false);


  useEffect(() => {
    cargarUsuarios();
  }, []);


  async function cargarUsuarios() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from("perfiles")
          .select(`
            id,
            nombre,
            email,
            rol,
            activo,
            created_at,
            updated_at
          `)
          .order("nombre", {
            ascending: true,
          });


      if (error) {
        throw error;
      }


      setUsuarios(
        data || []
      );

    } catch (err) {
      console.error(
        "Error cargando usuarios:",
        err
      );

      setUsuarios([]);

      setError(
        "No se pudieron cargar los usuarios del portal."
      );

    } finally {
      setLoading(false);
    }
  }


  const usuariosFiltrados =
    useMemo(() => {
      const texto =
        search
          .trim()
          .toLowerCase();


      return usuarios.filter(
        (usuario) => {
          if (!texto) {
            return true;
          }


          const rolLabel =
            ROLE_CONFIG[
              usuario.rol
            ]?.label ||
            usuario.rol ||
            "";


          return (
            usuario.nombre
              ?.toLowerCase()
              .includes(texto) ||
            usuario.email
              ?.toLowerCase()
              .includes(texto) ||
            rolLabel
              .toLowerCase()
              .includes(texto)
          );
        }
      );

    }, [
      usuarios,
      search,
    ]);


  const activos =
    usuarios.filter(
      (item) =>
        item.activo === true
    );


  const adminCount =
    activos.filter(
      (item) =>
        item.rol ===
        "administrador"
    ).length;


  const soporteCount =
    activos.filter(
      (item) =>
        item.rol ===
        "soporte"
    ).length;


  const lecturaCount =
    activos.filter(
      (item) =>
        item.rol ===
          "consulta" ||
        item.rol ===
          "auditor"
    ).length;


  function abrirEdicion(
    usuario
  ) {
    setEditingUser(
      usuario
    );

    setEditName(
      usuario.nombre || ""
    );

    setEditRole(
      usuario.rol ||
        "consulta"
    );

    setEditActive(
      usuario.activo !== false
    );

    setModalError("");
  }


  function cerrarEdicion() {
    if (saving) {
      return;
    }

    setEditingUser(null);
    setEditName("");
    setEditRole("consulta");
    setEditActive(true);
    setModalError("");
  }


  async function guardarUsuario() {
    if (!editingUser) {
      return;
    }


    setSaving(true);
    setModalError("");


    try {
      const {
        error,
      } =
        await supabase.rpc(
          "actualizar_perfil_admin",
          {
            p_user_id:
              editingUser.id,

            p_nombre:
              editName.trim() ||
              null,

            p_rol:
              editRole,

            p_activo:
              editActive,
          }
        );


      if (error) {
        throw error;
      }


      setEditingUser(null);

      await cargarUsuarios();

    } catch (err) {
      console.error(
        "Error actualizando usuario:",
        err
      );

      setModalError(
        err?.message ||
        "No se pudo actualizar el usuario."
      );

    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="administracion-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="dashboard-hero">

        <div>

          <div className="eyebrow">
            CONFIGURACIÓN DEL PORTAL
          </div>

          <h1>
            Administración
          </h1>

          <p>
            Gestión de usuarios, roles y permisos de acceso
            al Portal de Personal de Ejecución.
          </p>

        </div>


        <div className="dashboard-update">

          <span>
            Usuarios habilitados
          </span>

          <strong>
            {activos.length}
          </strong>

          <small>
            4 roles configurados
          </small>

        </div>

      </div>


      {/* =====================================================
          KPIs REALES
          ===================================================== */}

      <section className="admin-summary-grid">

        <AdminSummary
          icon={Users}
          value={activos.length}
          label="Usuarios activos"
          description="con acceso"
          type="blue"
        />


        <AdminSummary
          icon={ShieldCheck}
          value={adminCount}
          label="Administradores"
          description="acceso completo"
          type="purple"
        />


        <AdminSummary
          icon={UserCog}
          value={soporteCount}
          label="Soporte"
          description="gestión operativa"
          type="green"
        />


        <AdminSummary
          icon={UserRound}
          value={lecturaCount}
          label="Solo lectura"
          description="contratistas + visualizador"
          type="warning"
        />

      </section>


      {/* =====================================================
          TABS
          ===================================================== */}

      <div className="admin-tabs">

        <AdminTab
          active={
            tab === "usuarios"
          }
          onClick={() =>
            setTab("usuarios")
          }
          icon={Users}
        >
          Usuarios
        </AdminTab>


        <AdminTab
          active={
            tab === "roles"
          }
          onClick={() =>
            setTab("roles")
          }
          icon={ShieldCheck}
        >
          Roles y permisos
        </AdminTab>

      </div>


      {/* =====================================================
          USUARIOS
          ===================================================== */}

      {tab === "usuarios" && (

        <>

          <section className="glass-card admin-toolbar">

            <div className="personal-search-main">

              <Search
                size={19}
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Buscar usuario por nombre, email o rol..."
              />

            </div>


            <button
              type="button"
              className="new-executant-button"
              onClick={() =>
                setShowNewInfo(
                  true
                )
              }
            >
              <Plus
                size={16}
              />

              Nuevo usuario
            </button>

          </section>


          <section className="glass-card admin-table-card">

            <div className="card-header">

              <div>

                <span className="card-kicker">
                  USUARIOS DEL PORTAL
                </span>

                <h2>
                  Accesos configurados
                </h2>

              </div>


              <span className="admin-table-count">
                {usuariosFiltrados.length}
                {" "}
                {usuariosFiltrados.length === 1
                  ? "usuario"
                  : "usuarios"}
              </span>

            </div>


            {loading ? (

              <div className="admin-real-state">
                Cargando usuarios...
              </div>

            ) : error ? (

              <div className="admin-real-state error">
                {error}
              </div>

            ) : usuariosFiltrados.length === 0 ? (

              <div className="admin-real-state">
                No hay usuarios que coincidan con la búsqueda.
              </div>

            ) : (

              <div className="table-wrapper">

                <table className="admin-real-table">

                  <thead>

                    <tr>
                      <th>
                        Usuario
                      </th>

                      <th>
                        Email
                      </th>

                      <th>
                        Rol
                      </th>

                      <th>
                        Estado
                      </th>

                      <th>
                        Creado
                      </th>

                      <th>
                        Última actualización
                      </th>

                      <th>
                        Acción
                      </th>
                    </tr>

                  </thead>


                  <tbody>

                    {usuariosFiltrados.map(
                      (usuario) => (

                        <tr key={usuario.id}>

                          <td>

                            <div className="admin-user-cell">

                              <div className="mini-avatar">
                                <UserCog
                                  size={14}
                                />
                              </div>

                              <strong>
                                {usuario.nombre ||
                                  "Sin nombre"}
                              </strong>

                            </div>

                          </td>


                          <td>
                            {usuario.email ||
                              "—"}
                          </td>


                          <td>

                            <RoleBadge
                              value={
                                usuario.rol
                              }
                            />

                          </td>


                          <td>

                            <span
                              className={`status-badge ${
                                usuario.activo
                                  ? "active"
                                  : "inactive"
                              }`}
                            >
                              {usuario.activo ? (
                                <CheckCircle2
                                  size={12}
                                />
                              ) : (
                                <CircleAlert
                                  size={12}
                                />
                              )}

                              {usuario.activo
                                ? "Activo"
                                : "Inactivo"}
                            </span>

                          </td>


                          <td>
                            {formatFecha(
                              usuario.created_at
                            )}
                          </td>


                          <td>
                            {formatFecha(
                              usuario.updated_at
                            )}
                          </td>


                          <td>

                            <button
                              type="button"
                              className="admin-edit-user"
                              onClick={() =>
                                abrirEdicion(
                                  usuario
                                )
                              }
                              title="Editar usuario"
                            >
                              <Pencil
                                size={14}
                              />

                              Editar
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </>

      )}


      {/* =====================================================
          ROLES
          ===================================================== */}

      {tab === "roles" && (

        <section className="admin-role-grid">

          {Object.entries(
            ROLE_CONFIG
          ).map(
            ([
              roleKey,
              config,
            ]) => {

              const roleCount =
                activos.filter(
                  (item) =>
                    item.rol ===
                    roleKey
                ).length;


              return (
                <article
                  className="glass-card admin-role-card"
                  key={roleKey}
                >

                  <div className="admin-role-header">

                    <div className="admin-role-icon">
                      <ShieldCheck
                        size={21}
                      />
                    </div>


                    <div>

                      <h3>
                        {config.label}
                      </h3>

                      <span>
                        {roleCount}
                        {" "}
                        {roleCount === 1
                          ? "usuario activo"
                          : "usuarios activos"}
                      </span>

                    </div>

                  </div>


                  <p>
                    {config.description}
                  </p>


                  <div className="admin-permissions">

                    <span>
                      Permisos
                    </span>


                    {config.permissions.map(
                      (permiso) => (

                        <div
                          key={permiso}
                        >
                          <CheckCircle2
                            size={13}
                          />

                          {permiso}
                        </div>

                      )
                    )}

                  </div>

                </article>
              );
            }
          )}

        </section>

      )}


      {/* =====================================================
          MODAL EDITAR USUARIO
          ===================================================== */}

      {editingUser && (

        <div
          className="detail-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              cerrarEdicion();
            }
          }}
        >

          <div className="admin-user-modal">

            <button
              type="button"
              className="detail-modal-close"
              onClick={
                cerrarEdicion
              }
              disabled={saving}
            >
              <X size={18} />
            </button>


            <span className="card-kicker">
              USUARIO DEL PORTAL
            </span>

            <h2>
              Editar acceso
            </h2>


            <div className="admin-user-modal-email">
              {editingUser.email}
            </div>


            <div className="admin-user-form">

              <label>

                <span>
                  Nombre
                </span>

                <input
                  value={editName}
                  onChange={(e) =>
                    setEditName(
                      e.target.value
                    )
                  }
                  placeholder="Nombre del usuario"
                />

              </label>


              <label>

                <span>
                  Rol
                </span>

                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(
                      e.target.value
                    )
                  }
                >
                  <option value="administrador">
                    Administrador
                  </option>

                  <option value="soporte">
                    Soporte
                  </option>

                  <option value="consulta">
                    Contratistas
                  </option>

                  <option value="auditor">
                    Visualizador interno
                  </option>
                </select>

              </label>


              <label className="admin-user-active-control">

                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) =>
                    setEditActive(
                      e.target.checked
                    )
                  }
                />

                <div>
                  <strong>
                    Usuario activo
                  </strong>

                  <span>
                    Si se desactiva, el perfil dejará de considerarse habilitado.
                  </span>
                </div>

              </label>

            </div>


            {modalError && (
              <div className="admin-user-error">
                {modalError}
              </div>
            )}


            <div className="admin-user-modal-actions">

              <button
                type="button"
                className="cancel"
                onClick={
                  cerrarEdicion
                }
                disabled={saving}
              >
                Cancelar
              </button>


              <button
                type="button"
                className="save"
                onClick={
                  guardarUsuario
                }
                disabled={saving}
              >
                <Save
                  size={14}
                />

                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          NUEVO USUARIO - ESTADO SEGURO ACTUAL
          ===================================================== */}

      {showNewInfo && (

        <div
          className="detail-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setShowNewInfo(
                false
              );
            }
          }}
        >

          <div className="admin-user-modal">

            <button
              type="button"
              className="detail-modal-close"
              onClick={() =>
                setShowNewInfo(
                  false
                )
              }
            >
              <X size={18} />
            </button>


            <span className="card-kicker">
              NUEVO USUARIO
            </span>

            <h2>
              Crear acceso
            </h2>


            <div className="admin-create-info">

              <ShieldCheck
                size={20}
              />

              <div>

                <strong>
                  Creación segura pendiente de integrar
                </strong>

                <p>
                  La creación de usuarios de Supabase Auth requiere
                  una función segura del servidor. No debe hacerse
                  desde el navegador con una clave administrativa.
                </p>

                <p>
                  Por ahora, creá el usuario desde Authentication
                  → Users en Supabase. El trigger del proyecto crea
                  automáticamente su perfil y luego podés asignarle
                  el rol desde esta pantalla.
                </p>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}


/* =========================================================
   COMPONENTES
   ========================================================= */

function AdminTab({
  active,
  onClick,
  icon: Icon,
  children,
}) {
  return (
    <button
      type="button"
      className={`admin-tab ${
        active
          ? "active"
          : ""
      }`}
      onClick={onClick}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}


function AdminSummary({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article
      className={`admin-summary-card ${type}`}
    >

      <div className="admin-summary-icon">
        <Icon size={22} />
      </div>

      <div>

        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>

        <small>
          {description}
        </small>

      </div>

    </article>
  );
}


function RoleBadge({
  value,
}) {
  const label =
    ROLE_CONFIG[
      value
    ]?.label ||
    value ||
    "Sin rol";


  return (
    <span
      className={`admin-role-badge ${String(
        value ||
        "sin-rol"
      ).toLowerCase()}`}
    >
      {label}
    </span>
  );
}


function formatFecha(
  value
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }


  return date.toLocaleString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}
