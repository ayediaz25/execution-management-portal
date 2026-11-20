import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Bell,
  Search,
  Filter,
  AlertTriangle,
  KeyRound,
  Mail,
  Clock3,
  ShieldAlert,
  CheckCircle2,
  Building2,
  UserRound,
  Eye,
  History,
  Users,
  RefreshCcw,
} from "lucide-react";

import { supabase } from "../lib/supabase";


export default function Alertas() {
  const navigate = useNavigate();

  const [alertas, setAlertas] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todas");
  const [filtroResponsable, setFiltroResponsable] = useState("Todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    cargarAlertas();
  }, []);


  async function cargarAlertas() {
    setLoading(true);
    setError("");

    try {
      const [
        auditoriaResult,
        responsablesResult,
        vencimientosResult,
      ] = await Promise.all([
        supabase
          .from("auditoria")
          .select(`
            id,
            usuario_id,
            usuario_nombre,
            ejecutante_id,
            entidad,
            entidad_id,
            accion,
            campo,
            valor_anterior,
            valor_nuevo,
            descripcion,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("perfiles")
          .select("id, nombre, email, rol, activo")
          .in("rol", [
            "administrador",
            "soporte",
          ])
          .eq("activo", true)
          .order("nombre", {
            ascending: true,
          }),

        supabase
          .from("v_credenciales_portal")
          .select(`
            id,
            ejecutante_id,
            ejecutante,
            empresa,
            usuario,
            dias_restantes,
            fecha_vencimiento_estimada,
            estado_vencimiento,
            estado_manual
          `)
          .gte("dias_restantes", 0)
          .lte("dias_restantes", 7)
          .order("dias_restantes", {
            ascending: true,
          }),
      ]);


      if (auditoriaResult.error) {
        throw auditoriaResult.error;
      }

      if (responsablesResult.error) {
        throw responsablesResult.error;
      }

      if (vencimientosResult.error) {
        throw vencimientosResult.error;
      }


      const auditoria =
        auditoriaResult.data || [];

      const responsablesData =
        responsablesResult.data || [];

      const idsEjecutantes = [
        ...new Set(
          auditoria
            .map((item) => item.ejecutante_id)
            .filter(Boolean)
        ),
      ];


      let ejecutantesMap =
        new Map();


      if (idsEjecutantes.length > 0) {
        const {
          data: ejecutantesData,
          error: ejecutantesError,
        } =
          await supabase
            .from("v_ejecutantes_seguimiento")
            .select(`
              ejecutante_id,
              ejecutante,
              empresa,
              email
            `)
            .in(
              "ejecutante_id",
              idsEjecutantes
            );


        if (ejecutantesError) {
          throw ejecutantesError;
        }


        for (
          const item of ejecutantesData || []
        ) {
          if (
            !ejecutantesMap.has(
              item.ejecutante_id
            )
          ) {
            ejecutantesMap.set(
              item.ejecutante_id,
              item
            );
          }
        }
      }


      const alertasAuditoria =
        auditoria.map(
          (item) => {
            const persona =
              ejecutantesMap.get(
                item.ejecutante_id
              );

            const config =
              construirAlertaAuditoria(
                item
              );

            return {
              id: `audit-${item.id}`,
              sourceId: item.id,
              tipo: config.tipo,
              titulo: config.titulo,
              descripcion:
                item.descripcion ||
                config.descripcion,
              prioridad:
                config.prioridad,

              ejecutante_id:
                item.ejecutante_id,

              ejecutante:
                persona?.ejecutante ||
                null,

              empresa:
                persona?.empresa ||
                null,

              usuarioIbm:
                null,

              origen:
                nombreOrigen(
                  item.entidad
                ),

              responsable_id:
                item.usuario_id ||
                null,

              responsable:
                item.usuario_nombre ||
                "Sistema",

              fecha:
                item.created_at,

              automatico: false,
            };
          }
        );


      const alertasVencimientos =
        (
          vencimientosResult.data ||
          []
        ).map(
          (item) => ({
            id: `venc-${item.id}`,

            sourceId:
              item.id,

            tipo:
              "Vencimiento",

            titulo:
              tituloVencimiento(
                item.dias_restantes
              ),

            descripcion:
              descripcionVencimiento(
                item
              ),

            prioridad:
              prioridadVencimiento(
                item.dias_restantes
              ),

            ejecutante_id:
              item.ejecutante_id,

            ejecutante:
              item.ejecutante ||
              null,

            empresa:
              item.empresa ||
              null,

            usuarioIbm:
              item.usuario ||
              null,

            origen:
              "Portal",

            responsable_id:
              null,

            responsable:
              "Sistema",

            fecha:
              item.fecha_vencimiento_estimada,

            automatico: true,
          })
        );


      const todas = [
        ...alertasAuditoria,
        ...alertasVencimientos,
      ].sort(
        (a, b) =>
          fechaOrden(b.fecha) -
          fechaOrden(a.fecha)
      );


      setResponsables(
        responsablesData
      );

      setAlertas(
        todas
      );

    } catch (err) {
      console.error(
        "Error cargando alertas:",
        err
      );

      setError(
        "No se pudieron cargar las alertas del portal."
      );

      setAlertas([]);
      setResponsables([]);

    } finally {
      setLoading(false);
    }
  }


  const filtradas =
    useMemo(() => {
      const texto =
        search
          .trim()
          .toLowerCase();


      return alertas.filter(
        (alerta) => {
          const coincideBusqueda =
            !texto ||
            alerta.titulo
              ?.toLowerCase()
              .includes(texto) ||
            alerta.descripcion
              ?.toLowerCase()
              .includes(texto) ||
            alerta.ejecutante
              ?.toLowerCase()
              .includes(texto) ||
            alerta.empresa
              ?.toLowerCase()
              .includes(texto) ||
            alerta.usuarioIbm
              ?.toLowerCase()
              .includes(texto) ||
            alerta.responsable
              ?.toLowerCase()
              .includes(texto);


          const coincideTipo =
            filtroTipo === "Todas" ||
            alerta.tipo ===
              filtroTipo;


          const coincideResponsable =
            filtroResponsable ===
              "Todos" ||
            (
              filtroResponsable ===
                "Sistema" &&
              !alerta.responsable_id
            ) ||
            alerta.responsable_id ===
              filtroResponsable;


          return (
            coincideBusqueda &&
            coincideTipo &&
            coincideResponsable
          );
        }
      );

    }, [
      alertas,
      search,
      filtroTipo,
      filtroResponsable,
    ]);


  const altas =
    alertas.filter(
      (item) =>
        item.prioridad === "Alta"
    ).length;


  const medias =
    alertas.filter(
      (item) =>
        item.prioridad === "Media"
    ).length;


  const recuperaciones =
    alertas.filter(
      (item) =>
        item.tipo ===
        "Recuperación"
    ).length;


  const vencimientos =
    alertas.filter(
      (item) =>
        item.tipo ===
        "Vencimiento"
    ).length;


  return (
    <div className="alertas-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="dashboard-hero">

        <div>

          <div className="eyebrow">
            CENTRO DE NOTIFICACIONES
          </div>

          <h1>
            Alertas
          </h1>

          <p>
            Actividad operativa, cambios de credenciales,
            recuperaciones y próximos vencimientos.
          </p>

        </div>


        <div className="dashboard-update">

          <span>
            Equipo de soporte
          </span>

          <strong>
            {responsables.length} usuarios
          </strong>

          <small>
            administradores + soporte
          </small>

        </div>

      </div>


      {/* =====================================================
          KPI
          ===================================================== */}

      <section className="alerts-summary-grid">

        <AlertSummary
          icon={Bell}
          value={alertas.length}
          label="Movimientos"
          description="registrados"
          type="blue"
        />


        <AlertSummary
          icon={ShieldAlert}
          value={altas}
          label="Prioridad alta"
          description="requieren atención"
          type="danger"
        />


        <AlertSummary
          icon={Mail}
          value={recuperaciones}
          label="Recuperaciones"
          description="trazabilidad"
          type="warning"
        />


        <AlertSummary
          icon={Clock3}
          value={vencimientos}
          label="Vencimientos"
          description="próximos 7 días"
          type="success"
        />

      </section>


      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="glass-card alerts-search-panel">

        <div className="personal-search-main">

          <Search size={19} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Buscar por ejecutante, empresa, usuario IBM, evento o responsable..."
          />

        </div>


        <div className="alerts-filters">

          <div className="filter-field">

            <Filter size={17} />

            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(
                  e.target.value
                )
              }
            >
              <option>
                Todas
              </option>

              <option>
                Credencial
              </option>

              <option>
                Vencimiento
              </option>

              <option>
                Recuperación
              </option>

              <option>
                Personal
              </option>

              <option>
                Movimiento
              </option>
            </select>

          </div>


          <div className="filter-field">

            <Users size={17} />

            <select
              value={
                filtroResponsable
              }
              onChange={(e) =>
                setFiltroResponsable(
                  e.target.value
                )
              }
            >
              <option value="Todos">
                Todos los responsables
              </option>

              <option value="Sistema">
                Sistema
              </option>

              {responsables.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.nombre ||
                      item.email}
                  </option>
                )
              )}

            </select>

          </div>

        </div>

      </section>


      {/* =====================================================
          RESULTADOS
          ===================================================== */}

      <section className="personal-results-header">

        <div>
          <strong>
            {filtradas.length}
          </strong>

          <span>
            {" "}
            {filtradas.length === 1
              ? "alerta encontrada"
              : "alertas encontradas"}
          </span>
        </div>


        <span>
          Actividad real del portal
        </span>

      </section>


      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      <section className="alerts-layout">

        <div className="alerts-feed">

          {loading ? (

            <div className="glass-card alerts-real-state">

              <RefreshCcw
                size={22}
                className="alerts-spin"
              />

              <strong>
                Cargando actividad...
              </strong>

            </div>

          ) : error ? (

            <div className="glass-card alerts-real-state error">

              <AlertTriangle
                size={22}
              />

              <strong>
                {error}
              </strong>

            </div>

          ) : filtradas.length === 0 ? (

            <div className="glass-card alerts-real-state">

              <CheckCircle2
                size={23}
              />

              <strong>
                Sin alertas para mostrar
              </strong>

              <span>
                No hay movimientos que coincidan con los filtros seleccionados.
              </span>

            </div>

          ) : (

            filtradas.map(
              (alerta) => (
                <AlertCard
                  key={alerta.id}
                  alerta={alerta}
                  onDetail={() => {
                    if (
                      alerta.ejecutante_id
                    ) {
                      navigate(
                        `/personal/${alerta.ejecutante_id}`
                      );
                    }
                  }}
                />
              )
            )

          )}

        </div>


        <aside className="alerts-side">

          <section className="glass-card">

            <div className="card-header">

              <div>

                <span className="card-kicker">
                  PRIORIDAD
                </span>

                <h2>
                  Resumen
                </h2>

              </div>

            </div>


            <div className="alerts-priority-summary">

              <PriorityLine
                label="Alta"
                value={altas}
                type="high"
              />

              <PriorityLine
                label="Media"
                value={medias}
                type="medium"
              />

              <PriorityLine
                label="Baja"
                value={
                  Math.max(
                    0,
                    alertas.length -
                      altas -
                      medias
                  )
                }
                type="low"
              />

            </div>

          </section>


          <section className="glass-card alert-policy-card">

            <div className="card-header">

              <div>

                <span className="card-kicker">
                  EQUIPO
                </span>

                <h2>
                  Usuarios de soporte
                </h2>

              </div>

              <Users size={21} />

            </div>


            <div className="alerts-support-list">

              {responsables.length === 0 ? (

                <span className="alerts-support-empty">
                  No hay usuarios de soporte activos.
                </span>

              ) : (

                responsables.map(
                  (item) => (

                    <div
                      className="alerts-support-user"
                      key={item.id}
                    >

                      <div className="alerts-support-avatar">
                        {iniciales(
                          item.nombre ||
                            item.email
                        )}
                      </div>


                      <div>

                        <strong>
                          {item.nombre ||
                            item.email}
                        </strong>

                        <span>
                          {formatearRol(
                            item.rol
                          )}
                        </span>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>


          <section className="glass-card alert-policy-card">

            <div className="card-header">

              <div>

                <span className="card-kicker">
                  TRAZABILIDAD
                </span>

                <h2>
                  Registro operativo
                </h2>

              </div>

              <History size={21} />

            </div>


            <p>
              Las acciones registradas por administradores
              y soporte se identifican con el usuario real.
              Los vencimientos automáticos aparecen como
              generados por Sistema.
            </p>

          </section>

        </aside>

      </section>

    </div>
  );
}


/* =========================================================
   CARD
   ========================================================= */

function AlertCard({
  alerta,
  onDetail,
}) {
  const config =
    getAlertConfig(
      alerta.tipo
    );

  const Icon =
    config.icon;


  return (
    <article className="glass-card alert-card unread">

      <div
        className={`alert-type-icon ${config.className}`}
      >
        <Icon size={20} />
      </div>


      <div className="alert-card-content">

        <div className="alert-card-top">

          <div>

            <div className="alert-title-row">

              <h3>
                {alerta.titulo}
              </h3>

            </div>


            <div className="alert-badges">

              <PriorityBadge
                value={
                  alerta.prioridad
                }
              />

              <span className="alert-type-badge">
                {alerta.tipo}
              </span>


              {alerta.automatico && (
                <span className="alert-system-badge">
                  AUTOMÁTICA
                </span>
              )}

            </div>

          </div>

        </div>


        <p>
          {alerta.descripcion}
        </p>


        <div className="alert-context">

          {alerta.ejecutante && (

            <span>
              <UserRound
                size={13}
              />

              {alerta.ejecutante}
            </span>

          )}


          {alerta.empresa && (

            <span>
              <Building2
                size={13}
              />

              {alerta.empresa}
            </span>

          )}


          {alerta.usuarioIbm && (

            <span>
              <KeyRound
                size={13}
              />

              {alerta.usuarioIbm}
            </span>

          )}


          <span>
            <Clock3
              size={13}
            />

            {formatFechaHora(
              alerta.fecha
            )}
          </span>

        </div>


        <div className="alert-card-footer">

          <div className="alert-responsibility">

            <span>
              Origen:
              {" "}
              <strong>
                {alerta.origen}
              </strong>
            </span>


            <span>
              Responsable:
              {" "}
              <strong>
                {alerta.responsable}
              </strong>
            </span>

          </div>


          {alerta.ejecutante_id && (

            <div className="alert-actions">

              <button
                type="button"
                onClick={onDetail}
              >
                <Eye
                  size={14}
                />

                Ver detalle
              </button>

            </div>

          )}

        </div>

      </div>

    </article>
  );
}


/* =========================================================
   KPI
   ========================================================= */

function AlertSummary({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article
      className={`alert-summary-card ${type}`}
    >

      <div className="alert-summary-icon">
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


/* =========================================================
   PRIORIDAD
   ========================================================= */

function PriorityBadge({
  value,
}) {
  return (
    <span
      className={`priority-badge ${String(
        value
      ).toLowerCase()}`}
    >
      {value}
    </span>
  );
}


function PriorityLine({
  label,
  value,
  type,
}) {
  return (
    <div className="priority-line">

      <div>

        <span
          className={`priority-indicator ${type}`}
        />

        <span>
          {label}
        </span>

      </div>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =========================================================
   CONFIGURACIÓN DE EVENTOS
   ========================================================= */

function construirAlertaAuditoria(
  item
) {
  const entidad =
    String(
      item.entidad ||
      ""
    )
      .toLowerCase();


  const descripcion =
    String(
      item.descripcion ||
      ""
    )
      .toLowerCase();


  if (
    entidad ===
      "recuperaciones" ||
    descripcion.includes(
      "recuperación"
    )
  ) {
    const noResuelta =
      descripcion.includes(
        "no resuelta"
      );


    return {
      tipo:
        "Recuperación",

      titulo:
        noResuelta
          ? "Recuperación no resuelta"
          : "Gestión de recuperación",

      descripcion:
        "Se registró una gestión de recuperación de acceso.",

      prioridad:
        noResuelta
          ? "Alta"
          : "Media",
    };
  }


  if (
    entidad.includes(
      "credencial"
    ) ||
    descripcion.includes(
      "credencial"
    ) ||
    descripcion.includes(
      "contraseña"
    ) ||
    descripcion.includes(
      "pin"
    )
  ) {
    return {
      tipo:
        "Credencial",

      titulo:
        "Actualización de credencial",

      descripcion:
        "Se registró una modificación relacionada con la identidad del ejecutante.",

      prioridad:
        "Media",
    };
  }


  if (
    entidad ===
      "ejecutantes" ||
    entidad.includes(
      "seguimiento"
    )
  ) {
    return {
      tipo:
        "Personal",

      titulo:
        "Actualización de ejecutante",

      descripcion:
        "Se registró una modificación en la información del ejecutante.",

      prioridad:
        "Baja",
    };
  }


  return {
    tipo:
      "Movimiento",

    titulo:
      "Movimiento registrado",

    descripcion:
      "Se registró una nueva acción dentro del portal.",

    prioridad:
      "Baja",
  };
}


function getAlertConfig(
  tipo
) {
  switch (tipo) {
    case "Credencial":
      return {
        icon: KeyRound,
        className: "credential",
      };

    case "Vencimiento":
      return {
        icon: AlertTriangle,
        className: "warning",
      };

    case "Recuperación":
      return {
        icon: Mail,
        className: "recovery",
      };

    case "Personal":
      return {
        icon: UserRound,
        className: "company",
      };

    default:
      return {
        icon: Bell,
        className: "default",
      };
  }
}


/* =========================================================
   VENCIMIENTOS
   ========================================================= */

function tituloVencimiento(
  dias
) {
  const numero =
    Number(dias);


  if (numero === 0) {
    return "Credencial vence hoy";
  }


  if (numero === 1) {
    return "Credencial vence mañana";
  }


  return "Credencial próxima a vencer";
}


function descripcionVencimiento(
  item
) {
  const dias =
    Number(
      item.dias_restantes
    );


  const persona =
    item.ejecutante ||
    "El ejecutante";


  if (dias === 0) {
    return `${persona} tiene una credencial con vencimiento estimado para hoy.`;
  }


  if (dias === 1) {
    return `${persona} tiene una credencial con vencimiento estimado para mañana.`;
  }


  return `${persona} tiene una credencial con vencimiento estimado dentro de ${dias} días.`;
}


function prioridadVencimiento(
  dias
) {
  const numero =
    Number(dias);


  if (
    numero >= 0 &&
    numero <= 2
  ) {
    return "Alta";
  }


  if (
    numero >= 3 &&
    numero <= 7
  ) {
    return "Media";
  }


  return "Baja";
}


/* =========================================================
   HELPERS
   ========================================================= */

function nombreOrigen(
  entidad
) {
  const value =
    String(
      entidad ||
      ""
    ).toLowerCase();


  if (
    value ===
    "recuperaciones"
  ) {
    return "Recuperaciones";
  }


  if (
    value.includes(
      "credencial"
    )
  ) {
    return "Credenciales";
  }


  if (
    value.includes(
      "seguimiento"
    ) ||
    value ===
      "ejecutantes"
  ) {
    return "Personal";
  }


  return "Portal";
}


function formatFechaHora(
  value
) {
  if (!value) {
    return "Sin fecha";
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


function fechaOrden(
  value
) {
  if (!value) {
    return 0;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 0;
  }


  return date.getTime();
}


function iniciales(
  value
) {
  if (!value) {
    return "US";
  }


  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}


function formatearRol(
  rol
) {
  if (
    rol === "administrador"
  ) {
    return "Administrador";
  }


  if (
    rol === "soporte"
  ) {
    return "Soporte";
  }


  return rol ||
    "Usuario";
}
