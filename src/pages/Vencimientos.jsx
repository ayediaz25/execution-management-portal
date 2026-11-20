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
  CalendarClock,
  Clock3,
  CheckCircle2,
  HelpCircle,
  Building2,
  UserRound,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "../lib/supabase";


const PAGE_SIZE = 30;


function getEstadoVisual(item) {
  const dias =
    item?.dias_restantes;

  if (
    dias === null ||
    dias === undefined ||
    Number.isNaN(Number(dias))
  ) {
    return {
      key: "unknown",
      label: "Sin información de vencimiento",
      helper: "No hay datos suficientes para estimar",
      icon: HelpCircle,
    };
  }

  const numero =
    Number(dias);

  if (numero === 0) {
    return {
      key: "today",
      label: "Próximo a vencer",
      helper:
        "La fecha estimada coincide con hoy",
      icon: Clock3,
    };
  }

  if (numero < 0) {
    return {
      key: "unregistered",
      label: "Sin actualización registrada",
      helper:
        "La fecha estimada ya pasó, pero no hay un cambio posterior registrado",
      icon: HelpCircle,
    };
  }

  return {
    key: "estimated",
    label: "Vigencia estimada",
    helper:
      "La fecha estimada todavía es futura",
    icon: CheckCircle2,
  };
}


export default function Vencimientos() {
  const navigate =
    useNavigate();

  const [
    registros,
    setRegistros,
  ] =
    useState([]);

  const [
    empresas,
    setEmpresas,
  ] =
    useState([]);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    estado,
    setEstado,
  ] =
    useState("todos");

  const [
    empresa,
    setEmpresa,
  ] =
    useState("todas");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    totalFiltrado,
    setTotalFiltrado,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    stats,
    setStats,
  ] =
    useState({
      vigencia: 0,
      hoy: 0,
      sinActualizacion: 0,
      sinInfo: 0,
    });


  useEffect(() => {
    cargarEmpresas();
    cargarStats();
  }, []);


  useEffect(() => {
    cargarRegistros();
  }, [
    page,
    search,
    estado,
    empresa,
  ]);


  useEffect(() => {
    setPage(1);
  }, [
    search,
    estado,
    empresa,
  ]);


  async function cargarEmpresas() {
    const {
      data,
      error,
    } =
      await supabase
        .from("empresas")
        .select("id, nombre")
        .order(
          "nombre",
          {
            ascending: true,
          }
        );

    if (error) {
      console.error(
        "Error cargando empresas:",
        error
      );
      return;
    }

    setEmpresas(
      data || []
    );
  }


  async function cargarStats() {
    try {
      const [
        vigenciaResult,
        hoyResult,
        sinActualizacionResult,
        sinInfoResult,
      ] =
        await Promise.all([
          supabase
            .from("v_credenciales_portal")
            .select("*", {
              count: "exact",
              head: true,
            })
            .gt(
              "dias_restantes",
              0
            ),

          supabase
            .from("v_credenciales_portal")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq(
              "dias_restantes",
              0
            ),

          supabase
            .from("v_credenciales_portal")
            .select("*", {
              count: "exact",
              head: true,
            })
            .lt(
              "dias_restantes",
              0
            ),

          supabase
            .from("v_credenciales_portal")
            .select("*", {
              count: "exact",
              head: true,
            })
            .is(
              "dias_restantes",
              null
            ),
        ]);

      const resultados = [
        vigenciaResult,
        hoyResult,
        sinActualizacionResult,
        sinInfoResult,
      ];

      const conError =
        resultados.find(
          (item) =>
            item.error
        );

      if (conError) {
        throw conError.error;
      }

      setStats({
        vigencia:
          vigenciaResult.count || 0,
        hoy:
          hoyResult.count || 0,
        sinActualizacion:
          sinActualizacionResult.count || 0,
        sinInfo:
          sinInfoResult.count || 0,
      });

    } catch (err) {
      console.error(
        "Error cargando estadísticas de vencimientos:",
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


  async function cargarRegistros() {
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
        supabase
          .from(
            "v_credenciales_portal"
          )
          .select(
            "*",
            {
              count: "exact",
            }
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

      setRegistros(
        data || []
      );

      setTotalFiltrado(
        count || 0
      );

    } catch (err) {
      console.error(
        "Error cargando control de vencimientos:",
        err
      );

      setRegistros([]);
      setTotalFiltrado(0);

      setError(
        "No se pudo cargar el control de vencimientos."
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
    <div className="vencimientos-page">

      <div className="dashboard-hero">

        <div>
          <div className="eyebrow">
            CONTROL DE VENCIMIENTOS
          </div>

          <h1>
            Vencimientos
          </h1>

          <p>
            Control de fechas estimadas de credenciales.
            Una fecha ya superada no se considera un
            vencimiento confirmado si no existe una
            actualización posterior registrada.
          </p>
        </div>


        <div className="dashboard-update">
          <span>
            Criterio de estimación
          </span>

          <strong>
            Último cambio + 40 días
          </strong>

          <small>
            Referencia operativa
          </small>
        </div>

      </div>


      <section className="expiration-summary-grid expiration-summary-grid-four">

        <ExpirationSummary
          icon={CheckCircle2}
          value={
            stats.vigencia
          }
          label="Vigencia estimada"
          description="fecha futura"
          type="success"
        />

        <ExpirationSummary
          icon={Clock3}
          value={
            stats.hoy
          }
          label="Próximo a vencer"
          description="fecha estimada: hoy"
          type="warning"
        />

        <ExpirationSummary
          icon={HelpCircle}
          value={
            stats.sinActualizacion
          }
          label="Sin actualización registrada"
          description="estimación ya superada"
          type="medium"
        />

        <ExpirationSummary
          icon={CalendarClock}
          value={
            stats.sinInfo
          }
          label="Sin información"
          description="sin fecha estimable"
          type="medium"
        />

      </section>


      <section className="glass-card expiration-search-panel">

        <div className="personal-search-main">
          <Search size={19} />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por ejecutante, empresa o usuario..."
          />
        </div>


        <div className="expiration-filters">

          <div className="filter-field">
            <CalendarClock
              size={17}
            />

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
          </div>


          <div className="filter-field">
            <Building2
              size={17}
            />

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
          </div>

        </div>

      </section>



      <section className="credential-explanation-grid">

        <article className="glass-card credential-explanation-card">
          <div className="credential-explanation-icon">
            <HelpCircle size={18} />
          </div>

          <div>
            <strong>
              Sin actualización registrada
            </strong>

            <p>
              Cuando la duración registrada supera los 40 días, la fecha
              estimada de vencimiento ya fue alcanzada o superada. Esto no
              confirma que la credencial haya vencido: significa que no existe
              en Soporte un nuevo cambio o inconveniente posterior registrado.
            </p>
          </div>
        </article>


        <article className="glass-card credential-explanation-card">
          <div className="credential-explanation-icon">
            <CheckCircle2 size={18} />
          </div>

          <div>
            <strong>
              Vigencia estimada
            </strong>

            <p>
              Mientras la duración registrada sea menor a 40 días, el sistema
              la considera dentro de la vigencia estimada. Si supera esa fecha
              sin novedades registradas, pasa a “Sin actualización registrada”.
            </p>
          </div>
        </article>

      </section>

      <div className="credential-estimation-note">
        <strong>*</strong>
        Fecha calculada por el sistema a partir del último cambio registrado
        + 40 días. Es una referencia estimada y no confirma un vencimiento real.
      </div>

      <section className="personal-results-header">

        <div>
          <strong>
            {totalFiltrado}
          </strong>

          <span>
            {" "}
            registros encontrados
          </span>
        </div>

        <span>
          La estimación no confirma un vencimiento real
        </span>

      </section>


      <section className="glass-card expiration-table-card">

        <div className="card-header">

          <div>
            <span className="card-kicker">
              SEGUIMIENTO PREVENTIVO
            </span>

            <h2>
              Estado estimado de credenciales
            </h2>
          </div>


          <div className="expiration-header-note">
            <ShieldCheck
              size={15}
            />

            <span>
              No se utiliza el estado “Vencida”
            </span>
          </div>

        </div>


        {loading ? (
          <div className="expiration-state-panel">
            <RefreshCcw
              size={22}
              className="expiration-spin"
            />

            <strong>
              Cargando información...
            </strong>
          </div>

        ) : error ? (
          <div className="expiration-state-panel error">
            <HelpCircle
              size={22}
            />

            <strong>
              {error}
            </strong>
          </div>

        ) : registros.length === 0 ? (
          <div className="expiration-state-panel success">
            <CheckCircle2
              size={25}
            />

            <strong>
              Sin registros para este filtro
            </strong>
          </div>

        ) : (
          <div className="table-wrapper">

            <table className="expiration-real-table">

              <thead>
                <tr>
                  <th>
                    Estado
                  </th>

                  <th>
                    Ejecutante
                  </th>

                  <th>
                    Empresa
                  </th>

                  <th>
                    Usuario
                  </th>

                  <th>
                    Último cambio registrado
                  </th>

                  <th>
                    Fecha estimada de vencimiento según sistema *
                  </th>

                  <th>
                    Duración registrada
                  </th>

                  <th>
                    Acción
                  </th>
                </tr>
              </thead>


              <tbody>

                {registros.map(
                  (item) => {
                    const visual =
                      getEstadoVisual(
                        item
                      );

                    const StatusIcon =
                      visual.icon;

                    return (
                      <tr
                        key={item.id}
                      >

                        <td>
                          <div
                            className={`expiration-estimated-status ${visual.key}`}
                            title={
                              visual.helper
                            }
                          >
                            <StatusIcon
                              size={14}
                            />

                            <span>
                              {visual.label}
                            </span>
                          </div>
                        </td>


                        <td>
                          <div className="expiration-person-cell">

                            <div className="mini-avatar">
                              <UserRound
                                size={15}
                              />
                            </div>

                            <strong>
                              {nombrePersona(
                                item
                              )}
                            </strong>
                          </div>
                        </td>


                        <td>
                          {nombreEmpresa(
                            item
                          )}
                        </td>


                        <td>
                          <strong className="ibm-user">
                            {item.usuario ||
                              "—"}
                          </strong>
                        </td>


                        <td>
                          {formatFecha(
                            item.ultimo_cambio_argentina,
                            true
                          )}
                        </td>


                        <td>
                          <strong>
                            {formatFecha(
                              item.fecha_vencimiento_estimada
                            )}
                          </strong>
                        </td>


                        <td>
                          <strong>
                            {getDuracionRegistrada(
                              item.ultimo_cambio_argentina
                            )}
                          </strong>
                        </td>


                        <td>
                          {item.ejecutante_id ? (
                            <button
                              type="button"
                              className="table-icon-button"
                              onClick={() =>
                                navigate(
                                  `/personal/${item.ejecutante_id}`
                                )
                              }
                              title="Ver ficha"
                            >
                              <UserRound
                                size={15}
                              />
                            </button>
                          ) : (
                            <span>
                              Sin vincular
                            </span>
                          )}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

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


function ExpirationSummary({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article
      className={`glass-card expiration-summary-card ${type}`}
    >
      <div className="expiration-summary-icon">
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
