import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  History,
  Search,
  Building2,
  UserRound,
  Database,
  ShieldCheck,
  ArrowUpRight,
  CalendarDays,
  RefreshCcw,
  Activity,
} from "lucide-react";

import { supabase } from "../lib/supabase";


export default function Historial() {
  const navigate = useNavigate();

  const [eventos, setEventos] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("todas");
  const [fuente, setFuente] = useState("todas");
  const [tipo, setTipo] = useState("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =========================================================
     CARGA
     ========================================================= */

  useEffect(() => {
    cargarHistorial();
  }, []);


  async function cargarHistorial() {
    setLoading(true);
    setError("");

    try {

      const [
        historialResult,
        empresasResult,
      ] = await Promise.all([

        supabase
          .from("v_historial_general")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("empresas")
          .select("id, nombre")
          .order(
            "nombre",
            {
              ascending: true,
            }
          ),
      ]);


      if (historialResult.error) {
        throw historialResult.error;
      }

      if (empresasResult.error) {
        throw empresasResult.error;
      }


      setEventos(
        historialResult.data || []
      );

      setEmpresas(
        empresasResult.data || []
      );

      setLoading(false);

    } catch (err) {

      console.error(
        "Error cargando historial:",
        err
      );

      setError(
        "No se pudo cargar el historial."
      );

      setLoading(false);
    }
  }


  /* =========================================================
     TIPOS DISPONIBLES
     ========================================================= */

  const tiposDisponibles =
    useMemo(() => {

      const tipos =
        eventos
          .map(
            (evento) =>
              evento.tipo_evento
          )
          .filter(Boolean);

      return [
        ...new Set(tipos),
      ].sort();

    }, [eventos]);


  /* =========================================================
     FILTRO
     ========================================================= */

  const eventosFiltrados =
    useMemo(() => {

      const termino =
        search
          .trim()
          .toLowerCase();


      return eventos.filter(
        (evento) => {

          const coincideBusqueda =
            !termino ||
            evento.ejecutante
              ?.toLowerCase()
              .includes(termino) ||
            evento.email
              ?.toLowerCase()
              .includes(termino) ||
            evento.empresa
              ?.toLowerCase()
              .includes(termino) ||
            evento.descripcion
              ?.toLowerCase()
              .includes(termino) ||
            evento.tipo_evento
              ?.toLowerCase()
              .includes(termino) ||
            evento.usuario_nombre
              ?.toLowerCase()
              .includes(termino);


          const coincideEmpresa =
            empresa === "todas" ||
            evento.empresa_id ===
              empresa;


          const coincideFuente =
            fuente === "todas" ||
            evento.fuente ===
              fuente;


          const coincideTipo =
            tipo === "todos" ||
            evento.tipo_evento ===
              tipo;


          return (
            coincideBusqueda &&
            coincideEmpresa &&
            coincideFuente &&
            coincideTipo
          );
        }
      );

    }, [
      eventos,
      search,
      empresa,
      fuente,
      tipo,
    ]);


  /* =========================================================
     CONTADORES
     ========================================================= */

  const resumen =
    useMemo(() => {

      return eventos.reduce(
        (acc, evento) => {

          acc.total += 1;

          if (
            evento.fuente ===
            "auditoria"
          ) {
            acc.auditoria += 1;
          }

          if (
            evento.fuente ===
            "historial_credenciales"
          ) {
            acc.credenciales += 1;
          }

          return acc;
        },
        {
          total: 0,
          auditoria: 0,
          credenciales: 0,
        }
      );

    }, [eventos]);


  /* =========================================================
     HELPERS
     ========================================================= */

  function formatFecha(fecha) {

    if (!fecha) {
      return "Sin fecha";
    }


    const date =
      new Date(fecha);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Sin fecha";
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


  function getFuenteClass(
    fuenteEvento
  ) {

    if (
      fuenteEvento ===
      "auditoria"
    ) {
      return "history-source-audit";
    }

    return "history-source-credential";
  }


  function getFuenteLabel(
    fuenteEvento
  ) {

    if (
      fuenteEvento ===
      "auditoria"
    ) {
      return "Auditoría";
    }

    return "Credencial";
  }


  function getInitial(nombre) {

    return nombre
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "E";
  }


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="page history-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="history-hero">

        <div>

          <span className="history-eyebrow">
            TRAZABILIDAD · CILC
          </span>

          <h1>
            Historial
          </h1>

          <p>
            Eventos operativos,
            modificaciones y movimientos
            asociados a ejecutantes.
          </p>

        </div>


        <div className="history-hero-actions">

          <button
            type="button"
            className="history-refresh-button"
            onClick={
              cargarHistorial
            }
          >
            <RefreshCcw size={15} />

            Actualizar
          </button>


          <div className="history-source-badge">

            <History size={16} />

            <div>

              <span>
                Registro
              </span>

              <strong>
                Historial general
              </strong>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          KPIs
          ===================================================== */}

      <section className="history-summary-grid">

        <article className="glass-card history-summary-card">

          <div className="history-summary-icon">
            <Activity size={19} />
          </div>

          <div>

            <span>
              Eventos
            </span>

            <strong>
              {resumen.total}
            </strong>

            <small>
              registrados
            </small>

          </div>

        </article>


        <article className="glass-card history-summary-card">

          <div className="history-summary-icon audit">
            <ShieldCheck size={19} />
          </div>

          <div>

            <span>
              Auditoría
            </span>

            <strong>
              {resumen.auditoria}
            </strong>

            <small>
              cambios trazados
            </small>

          </div>

        </article>


        <article className="glass-card history-summary-card">

          <div className="history-summary-icon credential">
            <Database size={19} />
          </div>

          <div>

            <span>
              Credenciales
            </span>

            <strong>
              {resumen.credenciales}
            </strong>

            <small>
              eventos registrados
            </small>

          </div>

        </article>

      </section>


      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="glass-card history-filter-panel">

        <div className="history-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Buscar por ejecutante, empresa, evento o usuario..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <select
          value={empresa}
          onChange={(e) =>
            setEmpresa(
              e.target.value
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
          value={fuente}
          onChange={(e) =>
            setFuente(
              e.target.value
            )
          }
        >

          <option value="todas">
            Todas las fuentes
          </option>

          <option value="auditoria">
            Auditoría
          </option>

          <option value="historial_credenciales">
            Credenciales
          </option>

        </select>


        <select
          value={tipo}
          onChange={(e) =>
            setTipo(
              e.target.value
            )
          }
        >

          <option value="todos">
            Todos los eventos
          </option>

          {tiposDisponibles.map(
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

      </section>


      {/* =====================================================
          RESULTADO
          ===================================================== */}

      <div className="history-result-heading">

        <strong>
          {
            eventosFiltrados.length
          }
          {" "}
          {eventosFiltrados.length === 1
            ? "evento encontrado"
            : "eventos encontrados"}
        </strong>

        <span>
          Trazabilidad del portal
        </span>

      </div>


      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      {loading ? (

        <section className="glass-card history-empty">
          Cargando historial...
        </section>

      ) : error ? (

        <section className="glass-card history-empty history-error">
          {error}
        </section>

      ) : eventosFiltrados.length === 0 ? (

        <section className="glass-card history-empty">

          <History size={28} />

          <strong>
            Todavía no hay movimientos registrados
          </strong>

          <span>
            El historial se completará automáticamente
            a medida que se realicen cambios,
            actualizaciones de credenciales y acciones
            dentro del portal.
          </span>

        </section>

      ) : (

        <section className="glass-card history-list-card">

          <div className="history-list">

            {eventosFiltrados.map(
              (evento) => (

                <article
                  className="history-row"
                  key={
                    `${evento.fuente}-${evento.evento_id}`
                  }
                >

                  <div className="history-avatar">
                    {
                      getInitial(
                        evento.ejecutante
                      )
                    }
                  </div>


                  <div className="history-person">

                    <strong>
                      {
                        evento.ejecutante ||
                        "Sin ejecutante asociado"
                      }
                    </strong>

                    <span>
                      <Building2 size={11} />

                      {
                        evento.empresa ||
                        "Sin empresa"
                      }
                    </span>

                  </div>


                  <div className="history-event">

                    <span>
                      Evento
                    </span>

                    <strong>
                      {
                        evento.tipo_evento ||
                        "Sin tipo"
                      }
                    </strong>

                    {evento.descripcion && (
                      <small>
                        {evento.descripcion}
                      </small>
                    )}

                  </div>


                  <div className="history-change">

                    {evento.campo ? (

                      <>
                        <span>
                          {
                            evento.campo
                          }
                        </span>

                        <div>

                          {evento.valor_anterior && (
                            <small className="history-old-value">
                              {
                                evento.valor_anterior
                              }
                            </small>
                          )}

                          {evento.valor_nuevo && (
                            <small className="history-new-value">
                              {
                                evento.valor_nuevo
                              }
                            </small>
                          )}

                        </div>
                      </>

                    ) : (

                      <span className="history-no-change">
                        Sin cambio de campo
                      </span>

                    )}

                  </div>


                  <div className="history-user">

                    <span>
                      Usuario
                    </span>

                    <strong>
                      {
                        evento.usuario_nombre ||
                        "Sistema"
                      }
                    </strong>

                  </div>


                  <div className="history-date">

                    <CalendarDays
                      size={12}
                    />

                    <span>
                      {
                        formatFecha(
                          evento.created_at
                        )
                      }
                    </span>

                  </div>


                  <span
                    className={`history-source ${getFuenteClass(
                      evento.fuente
                    )}`}
                  >
                    {
                      getFuenteLabel(
                        evento.fuente
                      )
                    }
                  </span>


                  {evento.ejecutante_id ? (

                    <button
                      type="button"
                      className="history-open-button"
                      onClick={() =>
                        navigate(
                          `/personal/${evento.ejecutante_id}`
                        )
                      }
                    >
                      <ArrowUpRight
                        size={14}
                      />
                    </button>

                  ) : (

                    <div />

                  )}

                </article>

              )
            )}

          </div>

        </section>

      )}

    </div>
  );
}