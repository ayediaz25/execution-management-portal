import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Filter,
  ShieldCheck,
  Eye,
  Pencil,
  Download,
  KeyRound,
  UserRound,
  Clock3,
  Layers3,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  X,
  RefreshCcw,
} from "lucide-react";

import { supabase } from "../lib/supabase";


export default function Auditoria() {
  const [eventos, setEventos] = useState([]);
  const [perfiles, setPerfiles] = useState([]);

  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("Todos");
  const [modulo, setModulo] = useState("Todos");
  const [riesgo, setRiesgo] = useState("Todos");
  const [usuario, setUsuario] = useState("Todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedEvent, setSelectedEvent] = useState(null);


  useEffect(() => {
    cargarAuditoria();
  }, []);


  async function cargarAuditoria() {
    setLoading(true);
    setError("");

    try {
      const [
        auditoriaResult,
        perfilesResult,
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
          .limit(500),

        supabase
          .from("perfiles")
          .select(`
            id,
            nombre,
            email,
            rol,
            activo
          `)
          .order("nombre", {
            ascending: true,
          }),
      ]);


      if (auditoriaResult.error) {
        throw auditoriaResult.error;
      }

      if (perfilesResult.error) {
        throw perfilesResult.error;
      }


      const auditoriaData =
        auditoriaResult.data || [];

      const perfilesData =
        perfilesResult.data || [];


      const perfilMap =
        new Map(
          perfilesData.map(
            (item) => [
              item.id,
              item,
            ]
          )
        );


      const idsEjecutantes = [
        ...new Set(
          auditoriaData
            .map(
              (item) =>
                item.ejecutante_id
            )
            .filter(Boolean)
        ),
      ];


      const ejecutantesMap =
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
          const item of
            ejecutantesData || []
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


      const normalizados =
        auditoriaData.map(
          (item) => {
            const perfil =
              perfilMap.get(
                item.usuario_id
              );

            const ejecutante =
              ejecutantesMap.get(
                item.ejecutante_id
              );

            const tipoEvento =
              clasificarTipo(
                item
              );

            const moduloEvento =
              formatearModulo(
                item.entidad
              );

            const riesgoEvento =
              calcularRiesgo(
                item,
                tipoEvento,
                moduloEvento
              );


            return {
              ...item,

              usuario:
                item.usuario_nombre ||
                perfil?.nombre ||
                perfil?.email ||
                "Sistema",

              usuario_id:
                item.usuario_id ||
                null,

              rol:
                formatearRol(
                  perfil?.rol,
                  item.usuario_id
                ),

              tipo:
                tipoEvento,

              modulo:
                moduloEvento,

              riesgo:
                riesgoEvento,

              objetivo:
                construirObjetivo(
                  item,
                  ejecutante
                ),

              ejecutante_nombre:
                ejecutante?.ejecutante ||
                null,

              empresa:
                ejecutante?.empresa ||
                null,
            };
          }
        );


      setEventos(
        normalizados
      );

      setPerfiles(
        perfilesData.filter(
          (item) =>
            item.activo !== false
        )
      );

    } catch (err) {
      console.error(
        "Error cargando auditoría:",
        err
      );

      setError(
        "No se pudo cargar el registro de auditoría."
      );

      setEventos([]);
      setPerfiles([]);

    } finally {
      setLoading(false);
    }
  }


  const modulosDisponibles =
    useMemo(
      () => [
        "Todos",
        ...Array.from(
          new Set(
            eventos
              .map(
                (item) =>
                  item.modulo
              )
              .filter(Boolean)
          )
        ).sort(),
      ],
      [eventos]
    );


  const filtrados =
    useMemo(() => {
      const texto =
        search
          .trim()
          .toLowerCase();


      return eventos.filter(
        (item) => {
          const coincideBusqueda =
            !texto ||
            item.usuario
              ?.toLowerCase()
              .includes(texto) ||
            item.accion
              ?.toLowerCase()
              .includes(texto) ||
            item.modulo
              ?.toLowerCase()
              .includes(texto) ||
            item.objetivo
              ?.toLowerCase()
              .includes(texto) ||
            item.descripcion
              ?.toLowerCase()
              .includes(texto) ||
            item.campo
              ?.toLowerCase()
              .includes(texto);


          const coincideTipo =
            tipo === "Todos" ||
            item.tipo === tipo;


          const coincideModulo =
            modulo === "Todos" ||
            item.modulo === modulo;


          const coincideRiesgo =
            riesgo === "Todos" ||
            item.riesgo === riesgo;


          const coincideUsuario =
            usuario === "Todos" ||
            item.usuario_id === usuario ||
            (
              usuario === "Sistema" &&
              !item.usuario_id
            );


          return (
            coincideBusqueda &&
            coincideTipo &&
            coincideModulo &&
            coincideRiesgo &&
            coincideUsuario
          );
        }
      );

    }, [
      eventos,
      search,
      tipo,
      modulo,
      riesgo,
      usuario,
    ]);


  const modificaciones =
    eventos.filter(
      (item) =>
        item.tipo ===
        "Modificación"
    ).length;


  const altas =
    eventos.filter(
      (item) =>
        item.tipo ===
        "Alta"
    ).length;


  const sensibles =
    eventos.filter(
      (item) =>
        item.riesgo ===
        "Alto"
    ).length;


  const recuperaciones =
    eventos.filter(
      (item) =>
        item.modulo ===
        "Recuperaciones"
    ).length;


  function exportarCsv() {
    if (
      filtrados.length === 0
    ) {
      return;
    }


    const headers = [
      "Fecha",
      "Usuario",
      "Rol",
      "Tipo",
      "Acción",
      "Módulo",
      "Objetivo",
      "Riesgo",
      "Campo",
      "Valor anterior",
      "Valor nuevo",
      "Descripción",
    ];


    const rows =
      filtrados.map(
        (item) => [
          formatFechaHora(
            item.created_at
          ),
          item.usuario,
          item.rol,
          item.tipo,
          item.accion ||
            "",
          item.modulo,
          item.objetivo,
          item.riesgo,
          item.campo ||
            "",
          item.valor_anterior ||
            "",
          item.valor_nuevo ||
            "",
          item.descripcion ||
            "",
        ]
      );


    const escapeCsv =
      (value) =>
        `"${String(
          value ?? ""
        ).replace(
          /"/g,
          '""'
        )}"`;


    const csv = [
      headers,
      ...rows,
    ]
      .map(
        (row) =>
          row
            .map(
              escapeCsv
            )
            .join(";")
      )
      .join("\n");


    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href = url;

    link.download =
      `auditoria_portal_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;


    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }


  return (
    <div className="auditoria-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="dashboard-hero">

        <div>

          <div className="eyebrow">
            CONTROL Y SEGURIDAD
          </div>

          <h1>
            Auditoría
          </h1>

          <p>
            Trazabilidad real de altas, modificaciones,
            recuperaciones y acciones sensibles realizadas
            dentro del portal.
          </p>

        </div>


        <div className="dashboard-update">

          <span>
            Registro de auditoría
          </span>

          <strong>
            {eventos.length} eventos
          </strong>

          <small>
            trazabilidad de usuarios
          </small>

        </div>

      </div>


      {/* =====================================================
          KPI
          ===================================================== */}

      <section className="audit-summary-grid">

        <AuditSummary
          icon={FileSearch}
          value={
            eventos.length
          }
          label="Eventos"
          description="registrados"
          type="blue"
        />


        <AuditSummary
          icon={Plus}
          value={
            altas
          }
          label="Altas"
          description="registros creados"
          type="green"
        />


        <AuditSummary
          icon={Pencil}
          value={
            modificaciones
          }
          label="Modificaciones"
          description="cambios registrados"
          type="purple"
        />


        <AuditSummary
          icon={AlertTriangle}
          value={
            sensibles
          }
          label="Eventos sensibles"
          description="riesgo alto"
          type="warning"
        />

      </section>


      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="glass-card audit-search-panel">

        <div className="personal-search-main">

          <Search size={19} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Buscar por usuario, acción, ejecutante, módulo o detalle..."
          />

        </div>


        <div className="audit-filters">

          <div className="filter-field">

            <Filter size={17} />

            <select
              value={tipo}
              onChange={(e) =>
                setTipo(
                  e.target.value
                )
              }
            >
              <option>
                Todos
              </option>

              <option>
                Alta
              </option>

              <option>
                Modificación
              </option>

              <option>
                Baja
              </option>

              <option>
                Acción
              </option>
            </select>

          </div>


          <div className="filter-field">

            <Layers3 size={17} />

            <select
              value={modulo}
              onChange={(e) =>
                setModulo(
                  e.target.value
                )
              }
            >
              {modulosDisponibles.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

          </div>


          <div className="filter-field">

            <ShieldCheck size={17} />

            <select
              value={riesgo}
              onChange={(e) =>
                setRiesgo(
                  e.target.value
                )
              }
            >
              <option>
                Todos
              </option>

              <option>
                Bajo
              </option>

              <option>
                Medio
              </option>

              <option>
                Alto
              </option>
            </select>

          </div>


          <div className="filter-field">

            <UserRound size={17} />

            <select
              value={usuario}
              onChange={(e) =>
                setUsuario(
                  e.target.value
                )
              }
            >
              <option value="Todos">
                Todos los usuarios
              </option>

              <option value="Sistema">
                Sistema
              </option>

              {perfiles.map(
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
            {filtrados.length}
          </strong>

          <span>
            {" "}
            {filtrados.length === 1
              ? "evento encontrado"
              : "eventos encontrados"}
          </span>

        </div>


        <span>
          Registro real del portal
        </span>

      </section>


      {/* =====================================================
          TABLA
          ===================================================== */}

      <section className="glass-card audit-table-card">

        <div className="card-header">

          <div>

            <span className="card-kicker">
              ACTIVIDAD DE USUARIOS
            </span>

            <h2>
              Eventos auditados
            </h2>

          </div>


          <button
            type="button"
            className="secondary-profile-action"
            onClick={
              exportarCsv
            }
            disabled={
              filtrados.length === 0
            }
          >
            <Download size={15} />
            Exportar
          </button>

        </div>


        {loading ? (

          <div className="audit-real-state">

            <RefreshCcw
              size={22}
              className="audit-spin"
            />

            <strong>
              Cargando auditoría...
            </strong>

          </div>

        ) : error ? (

          <div className="audit-real-state error">

            <AlertTriangle
              size={22}
            />

            <strong>
              {error}
            </strong>

          </div>

        ) : filtrados.length === 0 ? (

          <div className="audit-real-state">

            <CheckCircle2
              size={23}
            />

            <strong>
              Sin eventos para mostrar
            </strong>

            <span>
              No hay registros que coincidan con los filtros seleccionados.
            </span>

          </div>

        ) : (

          <div className="table-wrapper">

            <table className="audit-real-table">

              <thead>

                <tr>
                  <th>
                    Fecha
                  </th>

                  <th>
                    Usuario
                  </th>

                  <th>
                    Rol
                  </th>

                  <th>
                    Acción
                  </th>

                  <th>
                    Módulo
                  </th>

                  <th>
                    Objetivo
                  </th>

                  <th>
                    Riesgo
                  </th>

                  <th>
                    Detalle
                  </th>
                </tr>

              </thead>


              <tbody>

                {filtrados.map(
                  (item) => (

                    <tr key={item.id}>

                      <td>

                        <span className="audit-date">

                          <Clock3
                            size={13}
                          />

                          {formatFechaHora(
                            item.created_at
                          )}

                        </span>

                      </td>


                      <td>

                        <div className="audit-user">

                          <div className="mini-avatar">
                            <UserRound
                              size={14}
                            />
                          </div>

                          <strong>
                            {item.usuario}
                          </strong>

                        </div>

                      </td>


                      <td>
                        {item.rol}
                      </td>


                      <td>
                        <AuditActionBadge
                          tipo={
                            item.tipo
                          }
                        />
                      </td>


                      <td>

                        <span className="audit-module">

                          <Layers3
                            size={13}
                          />

                          {item.modulo}

                        </span>

                      </td>


                      <td>
                        {item.objetivo}
                      </td>


                      <td>
                        <RiskBadge
                          value={
                            item.riesgo
                          }
                        />
                      </td>


                      <td>

                        <button
                          type="button"
                          className="link-button"
                          onClick={() =>
                            setSelectedEvent(
                              item
                            )
                          }
                        >
                          <Eye
                            size={13}
                          />

                          Ver
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


      {/* =====================================================
          PARTE INFERIOR
          ===================================================== */}

      <section className="audit-bottom-grid">

        <article className="glass-card">

          <div className="card-header">

            <div>

              <span className="card-kicker">
                EVENTOS SENSIBLES
              </span>

              <h2>
                Últimos eventos de riesgo
              </h2>

            </div>

          </div>


          <div className="audit-risk-list">

            {eventos
              .filter(
                (item) =>
                  item.riesgo !==
                  "Bajo"
              )
              .slice(0, 8)
              .map(
                (item) => (

                  <div
                    className="audit-risk-row"
                    key={item.id}
                  >

                    <div className="audit-risk-icon">
                      <ShieldCheck
                        size={17}
                      />
                    </div>


                    <div>

                      <strong>
                        {item.accion ||
                          item.tipo}
                      </strong>

                      <span>
                        {item.usuario}
                        {" · "}
                        {item.modulo}
                      </span>

                    </div>


                    <RiskBadge
                      value={
                        item.riesgo
                      }
                    />

                  </div>

                )
              )}


            {eventos.filter(
              (item) =>
                item.riesgo !==
                "Bajo"
            ).length === 0 && (

              <div className="audit-empty-small">
                No hay eventos sensibles registrados.
              </div>

            )}

          </div>

        </article>


        <article className="glass-card audit-info-card">

          <div className="card-header">

            <div>

              <span className="card-kicker">
                TRAZABILIDAD
              </span>

              <h2>
                Qué registramos hoy
              </h2>

            </div>

            <ShieldCheck
              size={21}
            />

          </div>


          <div className="audit-info-list">

            <span>
              <CheckCircle2
                size={14}
              />
              Altas de ejecutantes
            </span>

            <span>
              <CheckCircle2
                size={14}
              />
              Modificaciones de seguimiento
            </span>

            <span>
              <CheckCircle2
                size={14}
              />
              Cambios manuales de credenciales
            </span>

            <span>
              <CheckCircle2
                size={14}
              />
              Recuperaciones de acceso
            </span>

            <span>
              <CheckCircle2
                size={14}
              />
              Cambios auditados por usuario
            </span>

          </div>


          <div className="audit-info-note">
            <Eye size={14} />

            <span>
              Las simples consultas de pantalla no se cuentan
              como eventos salvo que exista un registro explícito
              en la tabla de auditoría.
            </span>
          </div>

        </article>

      </section>


      {/* =====================================================
          MODAL DETALLE
          ===================================================== */}

      {selectedEvent && (

        <div
          className="detail-modal-backdrop"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setSelectedEvent(
                null
              );
            }
          }}
        >

          <div className="audit-detail-modal">

            <button
              type="button"
              className="detail-modal-close"
              onClick={() =>
                setSelectedEvent(
                  null
                )
              }
            >
              <X size={18} />
            </button>


            <span className="card-kicker">
              EVENTO DE AUDITORÍA
            </span>

            <h2>
              {selectedEvent.accion ||
                selectedEvent.tipo}
            </h2>


            <div className="audit-detail-grid">

              <DetailField
                label="Fecha"
                value={formatFechaHora(
                  selectedEvent.created_at
                )}
              />

              <DetailField
                label="Usuario"
                value={
                  selectedEvent.usuario
                }
              />

              <DetailField
                label="Rol"
                value={
                  selectedEvent.rol
                }
              />

              <DetailField
                label="Módulo"
                value={
                  selectedEvent.modulo
                }
              />

              <DetailField
                label="Objetivo"
                value={
                  selectedEvent.objetivo
                }
              />

              <DetailField
                label="Riesgo"
                value={
                  selectedEvent.riesgo
                }
              />

              <DetailField
                label="Campo"
                value={
                  selectedEvent.campo ||
                  "—"
                }
              />

              <DetailField
                label="Valor anterior"
                value={
                  selectedEvent.valor_anterior ||
                  "—"
                }
              />

              <DetailField
                label="Valor nuevo"
                value={
                  selectedEvent.valor_nuevo ||
                  "—"
                }
              />

            </div>


            <div className="audit-detail-description">

              <span>
                Descripción
              </span>

              <p>
                {selectedEvent.descripcion ||
                  "Sin descripción adicional."}
              </p>

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

function AuditSummary({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article
      className={`audit-summary-card ${type}`}
    >

      <div className="audit-summary-icon">
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


function AuditActionBadge({
  tipo,
}) {
  const iconMap = {
    Alta: Plus,
    Modificación: Pencil,
    Baja: Trash2,
    Acción: KeyRound,
  };


  const Icon =
    iconMap[tipo] ||
    ShieldCheck;


  return (
    <span
      className={`audit-action-badge ${normalizarClase(
        tipo
      )}`}
    >
      <Icon size={12} />
      {tipo}
    </span>
  );
}


function RiskBadge({
  value,
}) {
  return (
    <span
      className={`risk-badge ${String(
        value
      )
        .toLowerCase()
        .replace(
          /\s+/g,
          "-"
        )}`}
    >
      {value}
    </span>
  );
}


function DetailField({
  label,
  value,
}) {
  return (
    <div className="audit-detail-field">

      <span>
        {label}
      </span>

      <strong>
        {value ||
          "—"}
      </strong>

    </div>
  );
}


/* =========================================================
   CLASIFICACIÓN
   ========================================================= */

function clasificarTipo(
  item
) {
  const accion =
    String(
      item.accion ||
      ""
    ).toUpperCase();


  if (
    accion.includes(
      "DELETE"
    ) ||
    accion.includes(
      "BAJA"
    ) ||
    accion.includes(
      "ELIMIN"
    )
  ) {
    return "Baja";
  }


  if (
    accion.includes(
      "INSERT"
    ) ||
    accion.includes(
      "ALTA"
    ) ||
    accion.includes(
      "CRE"
    )
  ) {
    return "Alta";
  }


  if (
    accion.includes(
      "UPDATE"
    ) ||
    accion.includes(
      "MODIFIC"
    ) ||
    accion.includes(
      "EDIT"
    )
  ) {
    return "Modificación";
  }


  return "Acción";
}


function formatearModulo(
  entidad
) {
  const value =
    String(
      entidad ||
      ""
    )
      .trim()
      .toLowerCase();


  if (
    value.includes(
      "recuper"
    )
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
    )
  ) {
    return "Seguimiento";
  }


  if (
    value.includes(
      "ejecutante"
    )
  ) {
    return "Personal";
  }


  if (
    value.includes(
      "empresa"
    )
  ) {
    return "Empresas";
  }


  if (
    value.includes(
      "perfil"
    ) ||
    value.includes(
      "usuario"
    )
  ) {
    return "Administración";
  }


  return capitalizar(
    value ||
    "Portal"
  );
}


function calcularRiesgo(
  item,
  tipo,
  modulo
) {
  const descripcion =
    String(
      item.descripcion ||
      ""
    ).toLowerCase();


  if (
    tipo === "Baja" ||
    modulo ===
      "Administración"
  ) {
    return "Alto";
  }


  if (
    modulo ===
      "Credenciales" ||
    modulo ===
      "Recuperaciones" ||
    descripcion.includes(
      "contraseña"
    ) ||
    descripcion.includes(
      "pin"
    ) ||
    descripcion.includes(
      "recuperación"
    )
  ) {
    return "Medio";
  }


  return "Bajo";
}


function construirObjetivo(
  item,
  ejecutante
) {
  if (
    ejecutante?.ejecutante
  ) {
    return [
      ejecutante.ejecutante,
      ejecutante.empresa,
    ]
      .filter(Boolean)
      .join(" · ");
  }


  if (
    item.entidad_id
  ) {
    return `${formatearModulo(
      item.entidad
    )} · ${String(
      item.entidad_id
    ).slice(
      0,
      8
    )}`;
  }


  return formatearModulo(
    item.entidad
  );
}


/* =========================================================
   HELPERS
   ========================================================= */

function formatearRol(
  rol,
  usuarioId
) {
  if (!usuarioId) {
    return "Sistema";
  }


  if (
    rol ===
    "administrador"
  ) {
    return "Administrador";
  }


  if (
    rol ===
    "soporte"
  ) {
    return "Soporte";
  }


  if (
    rol ===
    "consulta"
  ) {
    return "Consulta";
  }


  if (
    rol ===
    "auditor"
  ) {
    return "Auditor";
  }


  return rol ||
    "Usuario";
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


function normalizarClase(
  value
) {
  return String(
    value ||
    "accion"
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    );
}


function capitalizar(
  value
) {
  if (!value) {
    return "Portal";
  }


  return value
    .charAt(0)
    .toUpperCase() +
    value.slice(1);
}
