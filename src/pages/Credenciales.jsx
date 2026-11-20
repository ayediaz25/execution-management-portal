import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Search,
  KeyRound,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Link2,
  Link2Off,
  Building2,
  Pencil,
  ArrowUpRight,
  RefreshCcw,
  Info,
} from "lucide-react";

import { supabase } from "../lib/supabase";


const PAGE_SIZE = 30;


function getEstadoVisual(item) {
  const dias = item?.dias_restantes;

  if (
    dias === null ||
    dias === undefined ||
    Number.isNaN(Number(dias))
  ) {
    return {
      key: "unknown",
      label: "Sin información de vencimiento",
      helper: "No hay datos suficientes para estimar",
      rowClass: "credential-row-neutral",
      iconClass: "credential-status-neutral",
      badgeClass: "credential-status-badge neutral",
      icon: HelpCircle,
    };
  }

  const numero = Number(dias);

  if (numero === 0) {
    return {
      key: "today",
      label: "Próximo a vencer",
      helper: "La fecha estimada coincide con hoy",
      rowClass: "credential-row-warning",
      iconClass: "credential-status-warning",
      badgeClass: "credential-status-badge warning",
      icon: Clock3,
    };
  }

  if (numero < 0) {
    return {
      key: "unregistered",
      label: "Sin actualización registrada",
      helper:
        "La fecha estimada ya pasó, pero no hay un cambio posterior registrado",
      rowClass: "credential-row-neutral",
      iconClass: "credential-status-neutral",
      badgeClass: "credential-status-badge neutral",
      icon: HelpCircle,
    };
  }

  return {
    key: "estimated",
    label: "Vigencia estimada",
    helper:
      "Según el último cambio registrado, continúa dentro del período estimado",
    rowClass: "credential-row-ok",
    iconClass: "credential-status-ok",
    badgeClass: "credential-status-badge success",
    icon: CheckCircle2,
  };
}


export default function Credenciales() {
  const navigate = useNavigate();

  const [credenciales, setCredenciales] =
    useState([]);

  const [empresas, setEmpresas] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [empresa, setEmpresa] =
    useState("todas");

  const [estado, setEstado] =
    useState("todos");

  const [vinculo, setVinculo] =
    useState("todos");

  const [page, setPage] =
    useState(1);

  const [totalFiltrado, setTotalFiltrado] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [stats, setStats] =
    useState({
      total: 0,
      vigenciaEstimada: 0,
      proximoHoy: 0,
      sinActualizacion: 0,
      sinVincular: 0,
    });


  useEffect(() => {
    cargarEmpresas();
    cargarStats();
  }, []);


  useEffect(() => {
    cargarCredenciales();
  }, [
    page,
    search,
    empresa,
    estado,
    vinculo,
  ]);


  useEffect(() => {
    setPage(1);
  }, [
    search,
    empresa,
    estado,
    vinculo,
  ]);


  async function cargarEmpresas() {
    const {
      data,
      error,
    } =
      await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre", {
          ascending: true,
        });

    if (error) {
      console.error(
        "Error cargando empresas:",
        error
      );
      return;
    }

    setEmpresas(data || []);
  }


  function soloEjecutantesExternos(
    query
  ) {
    /*
     * Los usuarios IBM internos de YPF utilizan identificador RY.
     * Credenciales está destinada a ejecutantes externos, por lo
     * que estos registros no deben aparecer ni contabilizarse.
     */
    return query.not(
      "usuario",
      "ilike",
      "RY%"
    );
  }


  async function cargarStats() {
    try {
      const [
        totalResult,
        vigenciaResult,
        hoyResult,
        sinActualizacionResult,
        sinVincularResult,
      ] =
        await Promise.all([
          soloEjecutantesExternos(
            supabase
              .from("v_credenciales_portal")
              .select("*", {
                count: "exact",
                head: true,
              })
          ),

          soloEjecutantesExternos(
            supabase
              .from("v_credenciales_portal")
              .select("*", {
                count: "exact",
                head: true,
              })
          )
            .gt(
              "dias_restantes",
              0
            ),

          soloEjecutantesExternos(
            supabase
              .from("v_credenciales_portal")
              .select("*", {
                count: "exact",
                head: true,
              })
          )
            .eq(
              "dias_restantes",
              0
            ),

          soloEjecutantesExternos(
            supabase
              .from("v_credenciales_portal")
              .select("*", {
                count: "exact",
                head: true,
              })
          )
            .lt(
              "dias_restantes",
              0
            ),

          soloEjecutantesExternos(
            supabase
              .from("v_credenciales_portal")
              .select("*", {
                count: "exact",
                head: true,
              })
          )
            .is(
              "ejecutante_id",
              null
            ),
        ]);

      const resultados = [
        totalResult,
        vigenciaResult,
        hoyResult,
        sinActualizacionResult,
        sinVincularResult,
      ];

      const conError =
        resultados.find(
          (item) => item.error
        );

      if (conError) {
        throw conError.error;
      }

      setStats({
        total:
          totalResult.count || 0,
        vigenciaEstimada:
          vigenciaResult.count || 0,
        proximoHoy:
          hoyResult.count || 0,
        sinActualizacion:
          sinActualizacionResult.count || 0,
        sinVincular:
          sinVincularResult.count || 0,
      });

    } catch (err) {
      console.error(
        "Error cargando estadísticas de credenciales:",
        err
      );
    }
  }


  function aplicarEstado(
    query
  ) {
    if (
      estado === "vigencia"
    ) {
      return query.gt(
        "dias_restantes",
        0
      );
    }

    if (
      estado === "hoy"
    ) {
      return query.eq(
        "dias_restantes",
        0
      );
    }

    if (
      estado === "sin-actualizacion"
    ) {
      return query.lt(
        "dias_restantes",
        0
      );
    }

    if (
      estado === "sin-info"
    ) {
      return query.is(
        "dias_restantes",
        null
      );
    }

    return query;
  }


  async function cargarCredenciales() {
    setLoading(true);
    setError("");

    try {
      const desde =
        (page - 1) *
        PAGE_SIZE;

      const hasta =
        desde +
        PAGE_SIZE -
        1;

      let query =
        soloEjecutantesExternos(
          supabase
            .from(
              "v_credenciales_portal"
            )
            .select(
              "*",
              {
                count: "exact",
              }
            )
        );

      const termino =
        search
          .trim()
          .replace(
            /[,%()]/g,
            " "
          );

      if (termino) {
        query =
          query.or(
            [
              `ejecutante.ilike.%${termino}%`,
              `empresa.ilike.%${termino}%`,
              `usuario.ilike.%${termino}%`,
            ].join(",")
          );
      }

      if (
        empresa !== "todas"
      ) {
        query =
          query.eq(
            "empresa_id",
            empresa
          );
      }

      query =
        aplicarEstado(
          query
        );

      if (
        vinculo === "vinculados"
      ) {
        query =
          query.not(
            "ejecutante_id",
            "is",
            null
          );
      }

      if (
        vinculo === "sin-vincular"
      ) {
        query =
          query.is(
            "ejecutante_id",
            null
          );
      }

      const {
        data,
        error,
        count,
      } =
        await query
          .order(
            "dias_restantes",
            {
              ascending: true,
              nullsFirst: false,
            }
          )
          .order(
            "ejecutante",
            {
              ascending: true,
              nullsFirst: false,
            }
          )
          .range(
            desde,
            hasta
          );

      if (error) {
        throw error;
      }

      setCredenciales(
        data || []
      );

      setTotalFiltrado(
        count || 0
      );

    } catch (err) {
      console.error(
        "Error cargando credenciales:",
        err
      );

      setCredenciales([]);
      setTotalFiltrado(0);

      setError(
        "No se pudieron cargar las credenciales."
      );

    } finally {
      setLoading(false);
    }
  }


  const totalPaginas =
    useMemo(
      () =>
        Math.max(
          1,
          Math.ceil(
            totalFiltrado /
              PAGE_SIZE
          )
        ),
      [totalFiltrado]
    );


  function formatFecha(
    fecha,
    includeTime = false
  ) {
    if (!fecha) {
      return "Sin información";
    }

    const value =
      String(fecha);

    /*
     * Las columnas DATE de PostgreSQL llegan como YYYY-MM-DD.
     * No deben convertirse con new Date(), porque el navegador
     * las interpreta como UTC y en Argentina puede mostrarlas
     * como el día anterior.
     */
    if (
      !includeTime &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      const [
        year,
        month,
        day,
      ] =
        value.split("-");

      return `${day}/${month}/${year}`;
    }

    const date =
      new Date(value);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toLocaleString(
        "es-AR",
        includeTime
          ? {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }
          : {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }
      );
    }

    return value;
  }



  function getDuracionRegistrada(
    fecha
  ) {
    if (!fecha) {
      return "Sin información";
    }

    const value =
      String(fecha);

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Sin información";
    }

    const hoy =
      new Date();

    const inicioHoy =
      new Date(
        hoy.getFullYear(),
        hoy.getMonth(),
        hoy.getDate()
      );

    const inicioCambio =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

    const diff =
      Math.floor(
        (
          inicioHoy.getTime() -
          inicioCambio.getTime()
        ) /
        86400000
      );

    if (diff < 0) {
      return "0 días";
    }

    return `${diff} ${
      diff === 1
        ? "día"
        : "días"
    }`;
  }

  function nombrePersona(
    item
  ) {
    return (
      item.ejecutante ||
      "Sin nombre"
    );
  }


  function nombreEmpresa(
    item
  ) {
    return (
      item.empresa ||
      "Sin empresa"
    );
  }


  return (
    <div className="credentials-page">

      <section className="credentials-hero">

        <div>
          <span className="credentials-eyebrow">
            CREDENCIALES IBM · CILC
          </span>

          <h1>
            Credenciales
          </h1>

          <p>
            Seguimiento basado en el último cambio registrado.
            La fecha de vencimiento es una estimación del sistema
            y no confirma que la credencial haya dejado de funcionar.
          </p>
        </div>


        <div className="credentials-source-badge">
          <Info size={18} />

          <div>
            <span>
              Criterio de estimación
            </span>

            <strong>
              Último cambio registrado + 40 días
            </strong>
          </div>
        </div>

      </section>


      <section className="credentials-kpi-grid">

        <CredentialKpi
          icon={KeyRound}
          value={stats.total}
          label="Credenciales"
          description="registros"
          type="total"
        />

        <CredentialKpi
          icon={CheckCircle2}
          value={
            stats.vigenciaEstimada
          }
          label="Vigencia estimada"
          description="fecha estimada futura"
          type="success"
        />

        <CredentialKpi
          icon={Clock3}
          value={
            stats.proximoHoy
          }
          label="Próximo a vencer"
          description="fecha estimada: hoy"
          type="warning"
        />

        <CredentialKpi
          icon={HelpCircle}
          value={
            stats.sinActualizacion
          }
          label="Sin actualización"
          description="estimación ya superada"
          type="unlinked"
        />

        <CredentialKpi
          icon={Link2Off}
          value={
            stats.sinVincular
          }
          label="Sin vincular"
          description="pendientes"
          type="unlinked"
        />

      </section>


      <section className="glass-card credentials-filter-panel">

        <div className="credentials-search">
          <Search size={18} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por persona, usuario o empresa..."
          />
        </div>


        <select
          value={empresa}
          onChange={(event) =>
            setEmpresa(
              event.target.value
            )
          }
        >
          <option value="todas">
            Todas las empresas
          </option>

          {empresas.map(
            (item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.nombre}
              </option>
            )
          )}
        </select>


        <select
          value={estado}
          onChange={(event) =>
            setEstado(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los estados
          </option>

          <option value="vigencia">
            Vigencia estimada
          </option>

          <option value="hoy">
            Próximo a vencer hoy
          </option>

          <option value="sin-actualizacion">
            Sin actualización registrada
          </option>

          <option value="sin-info">
            Sin información de vencimiento
          </option>
        </select>


        <select
          value={vinculo}
          onChange={(event) =>
            setVinculo(
              event.target.value
            )
          }
        >
          <option value="todos">
            Todos los vínculos
          </option>

          <option value="vinculados">
            Vinculados
          </option>

          <option value="sin-vincular">
            Sin vincular
          </option>
        </select>

      </section>



      <section className="credential-explanation-grid">

        <article className="glass-card credential-explanation-card credential-explanation-card--warning">
          <div className="credential-explanation-icon credential-explanation-icon--warning">
            <HelpCircle size={20} />
          </div>

          <div>
            <strong>
              Sin actualización registrada
            </strong>

            <p>
              Si la duración supera los 40 días, significa que según el sistema
              ya se alcanzó o superó la fecha estimada de vencimiento. Esto no
              confirma un vencimiento real: indica que Soporte no tiene
              registrado un nuevo cambio de contraseña o un inconveniente
              posterior.
            </p>
          </div>
        </article>


        <article className="glass-card credential-explanation-card credential-explanation-card--success">
          <div className="credential-explanation-icon credential-explanation-icon--success">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <strong>
              Vigencia estimada
            </strong>

            <p>
              Indica que todavía no se alcanzaron los 40 días desde el último
              cambio registrado. Si pasa la fecha estimada y no se registra un
              problema o un nuevo cambio, el estado pasa automáticamente a
              “Sin actualización registrada”.
            </p>
          </div>
        </article>

      </section>

      <div className="credential-estimation-note">
        <strong>*</strong>
        Fecha calculada por el sistema a partir del último cambio registrado
        + 40 días. Es una referencia estimada y no confirma un vencimiento real.
      </div>

      <section className="credentials-result-heading">

        <div>
          <strong>
            {totalFiltrado} credenciales encontradas
          </strong>

          <span>
            Las fechas son estimadas; no equivalen a un vencimiento confirmado.
          </span>
        </div>


        <div className="credentials-legend">
          <span>
            <i className="legend-dot success" />
            Vigencia estimada
          </span>

          <span>
            <i className="legend-dot warning" />
            Próximo a vencer hoy
          </span>

          <span>
            <i className="legend-dot neutral" />
            Sin actualización registrada
          </span>
        </div>

      </section>


      <section className="glass-card credentials-list-card">

        {loading ? (
          <div className="credentials-empty">
            <RefreshCcw
              size={22}
              className="expiration-spin"
            />

            <strong>
              Cargando credenciales...
            </strong>
          </div>

        ) : error ? (
          <div className="credentials-empty credentials-error">
            <strong>
              {error}
            </strong>
          </div>

        ) : credenciales.length === 0 ? (
          <div className="credentials-empty">
            <strong>
              No hay credenciales para este filtro
            </strong>

            <span>
              Probá con otro estado, empresa o término de búsqueda.
            </span>
          </div>

        ) : (
          <div className="credentials-list">

            {credenciales.map(
              (item) => {
                const estadoVisual =
                  getEstadoVisual(
                    item
                  );

                const StatusIcon =
                  estadoVisual.icon;

                const vinculado =
                  Boolean(
                    item.ejecutante_id
                  );

                return (
                  <article
                    key={item.id}
                    className={`credential-row credential-row-editable ${estadoVisual.rowClass}`}
                  >

                    <div
                      className={`credential-status-icon ${estadoVisual.iconClass}`}
                      title={
                        estadoVisual.helper
                      }
                    >
                      <StatusIcon
                        size={17}
                      />
                    </div>


                    <div className="credential-person">

                      <div className="credential-person-title">

                        <strong>
                          {nombrePersona(
                            item
                          )}
                        </strong>

                        <span
                          className={`credential-link-badge ${
                            vinculado
                              ? "linked"
                              : "unlinked"
                          }`}
                        >
                          {vinculado ? (
                            <Link2 size={10} />
                          ) : (
                            <Link2Off size={10} />
                          )}

                          {vinculado
                            ? "Vinculado"
                            : "Sin vincular"}
                        </span>

                      </div>

                      <span>
                        <Building2
                          size={11}
                        />

                        {nombreEmpresa(
                          item
                        )}
                      </span>

                    </div>


                    <div className="credential-column">
                      <span>
                        Usuario
                      </span>

                      <strong>
                        {item.usuario ||
                          "Sin información"}
                      </strong>
                    </div>


                    <div className="credential-column">
                      <span>
                        Último cambio registrado
                      </span>

                      <strong>
                        {formatFecha(
                          item.ultimo_cambio_argentina,
                          true
                        )}
                      </strong>
                    </div>


                    <div className="credential-column">
                      <span>
                        Fecha estimada de vencimiento según sistema *
                      </span>

                      <strong>
                        {formatFecha(
                          item.fecha_vencimiento_estimada
                        )}
                      </strong>
                    </div>


                    <div className="credential-event credential-column">
                      <span>
                        Evento guía
                      </span>

                      <strong>
                        {item.evento_guia_cambio ===
                        "PasswordChanged"
                          ? "Cambio de contraseña"
                          : item.evento_guia_cambio ===
                            "LocalizationSettingsChangedEvent"
                            ? "Evento guía"
                            : "Sin evento"}
                      </strong>
                    </div>


                    <div className="credential-days credential-duration">
                      <div>
                        <span>
                          Duración registrada
                        </span>

                        <strong>
                          {getDuracionRegistrada(
                            item.ultimo_cambio_argentina
                          )}
                        </strong>
                      </div>
                    </div>


                    <span
                      className={
                        estadoVisual.badgeClass
                      }
                      title={
                        estadoVisual.helper
                      }
                    >
                      {estadoVisual.label}
                    </span>


                    <div className="credential-actions">

                      {/*
                        Conservamos el espacio de edición sin cambiar
                        la lógica de datos. La edición operativa de la
                        credencial sigue realizándose desde la ficha.
                      */}
                      {vinculado && (
                        <button
                          type="button"
                          className="credential-edit-button"
                          onClick={() =>
                            navigate(
                              `/personal/${item.ejecutante_id}`
                            )
                          }
                          title="Abrir ficha para actualizar"
                        >
                          <Pencil
                            size={15}
                          />
                        </button>
                      )}


                      {vinculado ? (
                        <button
                          type="button"
                          className="credential-open-button"
                          onClick={() =>
                            navigate(
                              `/personal/${item.ejecutante_id}`
                            )
                          }
                          title="Abrir ficha"
                        >
                          <ArrowUpRight
                            size={15}
                          />
                        </button>
                      ) : (
                        <span
                          className="credential-no-profile"
                          title="Sin perfil vinculado"
                        >
                          <Link2Off
                            size={15}
                          />
                        </span>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>


      <div className="credentials-pagination">

        <span>
          Página {page} de {totalPaginas}
        </span>

        <div>
          <button
            type="button"
            disabled={
              page <= 1 ||
              loading
            }
            onClick={() =>
              setPage(
                (prev) =>
                  Math.max(
                    1,
                    prev - 1
                  )
              )
            }
          >
            Anterior
          </button>

          <button
            type="button"
            disabled={
              page >=
                totalPaginas ||
              loading
            }
            onClick={() =>
              setPage(
                (prev) =>
                  Math.min(
                    totalPaginas,
                    prev + 1
                  )
              )
            }
          >
            Siguiente
          </button>
        </div>

      </div>

    </div>
  );
}


function CredentialKpi({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article className="glass-card credentials-kpi">

      <div
        className={`credentials-kpi-icon ${type}`}
      >
        <Icon size={20} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {description}
        </small>
      </div>

    </article>
  );
}
