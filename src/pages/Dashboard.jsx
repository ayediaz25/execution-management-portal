import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Users,
  CircleCheckBig,
  Clock3,
  TriangleAlert,
  UserRoundX,
  Database,
  Building2,
  ArrowUpRight,
  CheckCircle2,
  LogIn,
  RefreshCcw,
  Activity,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";


export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isConsulta = role === "consulta";

  const [stats, setStats] = useState({
    total: 0,
    ok: 0,
    enCurso: 0,
    problemas: 0,
    bajas: 0,
    petra: 0,
    ingreso: 0,
  });

  const [empresas, setEmpresas] = useState([]);
  const [ultimos, setUltimos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =========================================================
     CARGA GENERAL
     ========================================================= */

  useEffect(() => {
    if (role) {
      cargarDashboard();
    }
  }, [role]);


  async function cargarDashboard() {
    setLoading(true);
    setError("");

    try {

      /*
       * Rol consulta / contratistas:
       * solo se solicitan métricas generales.
       * No se descargan personas, CAU, PETRA, notas
       * ni últimas actualizaciones.
       */
      if (isConsulta) {

        const [
          habilitadosResult,
          empresasResult,
        ] = await Promise.all([

          supabase
            .from("v_ejecutantes_seguimiento")
            .select("ejecutante_id", {
              count: "exact",
              head: true,
            })
            .eq(
              "estado_operacional",
              "OK"
            ),

          supabase
            .from("v_empresas_resumen")
            .select(`
              id,
              nombre,
              personal_activo
            `)
            .gt(
              "personal_activo",
              0
            )
            .order(
              "nombre",
              {
                ascending: true,
              }
            ),
        ]);


        if (habilitadosResult.error) {
          throw habilitadosResult.error;
        }

        if (empresasResult.error) {
          throw empresasResult.error;
        }


        setStats({
          total: 0,
          ok:
            habilitadosResult.count || 0,
          enCurso: 0,
          problemas: 0,
          bajas: 0,
          petra: 0,
          ingreso: 0,
        });

        setEmpresas(
          empresasResult.data || []
        );

        setUltimos([]);

        setLoading(false);

        return;
      }

      const [
        totalResult,
        okResult,
        enCursoResult,
        problemasResult,
        bajasResult,
        petraResult,
        ingresoResult,
        empresasResult,
        ultimosResult,
      ] = await Promise.all([

        /* TOTAL */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          }),


        /* OK */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "estado_operacional",
            "OK"
          ),


        /* EN CURSO */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "estado_operacional",
            "En curso"
          ),


        /* PROBLEMAS */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "estado_operacional",
            "Problema"
          ),


        /* BAJAS */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq(
            "estado_operacional",
            "Baja"
          ),


        /* PETRA */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .ilike(
            "petra_estado",
            "si"
          ),


        /* INGRESO */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*", {
            count: "exact",
            head: true,
          })
          .ilike(
            "ingreso_estado",
            "confirmado"
          ),


        /* EMPRESAS */

        supabase
          .from("v_empresas_resumen")
          .select("*")
          .gt(
            "personal_activo",
            0
          )
          .order(
            "personal_activo",
            {
              ascending: false,
            }
          )
          .limit(6),


        /* ÚLTIMAS ACTUALIZACIONES */

        supabase
          .from("v_ejecutantes_seguimiento")
          .select("*")
          .order(
            "updated_at",
            {
              ascending: false,
              nullsFirst: false,
            }
          )
          .limit(7),
      ]);


      const resultados = [
        totalResult,
        okResult,
        enCursoResult,
        problemasResult,
        bajasResult,
        petraResult,
        ingresoResult,
        empresasResult,
        ultimosResult,
      ];


      const resultadoConError =
        resultados.find(
          (resultado) =>
            resultado.error
        );


      if (resultadoConError) {
        throw resultadoConError.error;
      }


      setStats({
        total:
          totalResult.count || 0,

        ok:
          okResult.count || 0,

        enCurso:
          enCursoResult.count || 0,

        problemas:
          problemasResult.count || 0,

        bajas:
          bajasResult.count || 0,

        petra:
          petraResult.count || 0,

        ingreso:
          ingresoResult.count || 0,
      });


      setEmpresas(
        empresasResult.data || []
      );


      setUltimos(
        ultimosResult.data || []
      );


      setLoading(false);

    } catch (err) {

      console.error(
        "Error cargando dashboard:",
        err
      );

      setError(
        "No se pudo cargar la información del dashboard."
      );

      setLoading(false);
    }
  }


  /* =========================================================
     PORCENTAJES
     ========================================================= */

  const porcentajes =
    useMemo(() => {

      const base =
        stats.total || 1;


      return {
        ok:
          Math.round(
            (
              stats.ok /
              base
            ) * 100
          ),

        petra:
          Math.round(
            (
              stats.petra /
              base
            ) * 100
          ),

        ingreso:
          Math.round(
            (
              stats.ingreso /
              base
            ) * 100
          ),
      };

    }, [stats]);


  /* =========================================================
     EMPRESA MÁXIMA
     ========================================================= */

  const maxEmpresa =
    useMemo(() => {

      return Math.max(
        ...empresas.map(
          (empresa) =>
            Number(
              empresa.personal_activo ||
              0
            )
        ),
        1
      );

    }, [empresas]);


  /* =========================================================
     HELPERS
     ========================================================= */

  function getStatusClass(status) {

    if (status === "OK") {
      return "dashboard-status-ok";
    }

    if (
      status === "En curso"
    ) {
      return "dashboard-status-warning";
    }

    if (
      status === "Problema"
    ) {
      return "dashboard-status-danger";
    }

    if (
      status === "Baja"
    ) {
      return "dashboard-status-neutral";
    }

    return "dashboard-status-neutral";
  }


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


    return date.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }


  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <section className="glass-card dashboard-loading">
        <RefreshCcw
          size={20}
          className="dashboard-loading-icon"
        />

        Cargando dashboard...
      </section>
    );
  }


  /* =========================================================
     ERROR
     ========================================================= */

  if (error) {
    return (
      <section className="glass-card dashboard-loading dashboard-error">

        <TriangleAlert size={21} />

        <strong>
          {error}
        </strong>


        <button
          type="button"
          onClick={
            cargarDashboard
          }
        >
          Reintentar
        </button>

      </section>
    );
  }


  /* =========================================================
     DASHBOARD PARA CONTRATISTAS / CONSULTA
     ========================================================= */

  if (isConsulta) {

    return (
      <div className="page dashboard-page">

        <section className="dashboard-hero">

          <div>

            <span className="dashboard-eyebrow">
              PORTAL DE PERSONAL DE EJECUCIÓN · CILC
            </span>

            <h1>
              Portal para contratistas
            </h1>

            <p>
              Consulta y descarga del personal habilitado
              por empresa. La información visible en este
              acceso está limitada a datos operativos
              necesarios para contratistas.
            </p>

          </div>


          <div className="dashboard-hero-actions">

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={
                cargarDashboard
              }
            >
              <RefreshCcw size={15} />

              Actualizar
            </button>


            <div className="dashboard-source-badge">

              <Database size={16} />

              <div>

                <span>
                  Acceso
                </span>

                <strong>
                  Consulta
                </strong>

              </div>

            </div>

          </div>

        </section>


        <section className="dashboard-kpi-grid">

          <article className="glass-card dashboard-kpi dashboard-kpi-ok">

            <div className="dashboard-kpi-icon">
              <CircleCheckBig size={20} />
            </div>

            <div className="dashboard-kpi-content">

              <span>
                Ejecutantes habilitados
              </span>

              <strong>
                {stats.ok}
              </strong>

              <small>
                disponibles para envío
              </small>

            </div>

          </article>


          <article
            className="glass-card dashboard-kpi dashboard-kpi-total"
            onClick={() =>
              navigate(
                "/empresas"
              )
            }
          >

            <div className="dashboard-kpi-icon">
              <Building2 size={20} />
            </div>

            <div className="dashboard-kpi-content">

              <span>
                Empresas
              </span>

              <strong>
                {empresas.length}
              </strong>

              <small>
                con personal activo
              </small>

            </div>

          </article>

        </section>


        <section className="glass-card dashboard-access-card">

          <div className="dashboard-section-header">

            <div>

              <span>
                DESCARGAS
              </span>

              <h2>
                Personal habilitado por empresa
              </h2>

            </div>

            <Building2 size={18} />

          </div>


          <div className="dashboard-progress-list">

            <div className="dashboard-progress-item">

              <div className="dashboard-progress-heading">

                <div>

                  <div className="dashboard-progress-icon operativo">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>

                    <strong>
                      Listados disponibles
                    </strong>

                    <span>
                      Ingresá a Empresas para seleccionar
                      una contratista y descargar su listado.
                    </span>

                  </div>

                </div>

              </div>


              <button
                type="button"
                className="dashboard-refresh-button"
                onClick={() =>
                  navigate(
                    "/empresas"
                  )
                }
              >
                Ver empresas

                <ArrowUpRight size={14} />
              </button>

            </div>

          </div>

        </section>

      </div>
    );
  }


  return (
    <div className="page dashboard-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="dashboard-hero">

        <div>

          <span className="dashboard-eyebrow">
            PORTAL DE PERSONAL DE EJECUCIÓN · CILC
          </span>

          <h1>
            Seguimiento general
          </h1>

          <p>
            Estado operativo de ejecutantes,
            empresas contratistas, accesos
            PETRA e ingresos.
          </p>

        </div>


        <div className="dashboard-hero-actions">

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={
              cargarDashboard
            }
          >
            <RefreshCcw size={15} />

            Actualizar
          </button>


          <div className="dashboard-source-badge">

            <Database size={16} />

            <div>
              <span>
                Fuente
              </span>

              <strong>
                Seguimiento CILC
              </strong>
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          KPI PRINCIPALES
          ===================================================== */}

      <section className="dashboard-kpi-grid">

        <article
          className="glass-card dashboard-kpi dashboard-kpi-total"
          onClick={() =>
            navigate(
              "/personal"
            )
          }
        >

          <div className="dashboard-kpi-icon">
            <Users size={20} />
          </div>

          <div className="dashboard-kpi-content">

            <span>
              Ejecutantes
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              registros totales
            </small>

          </div>

        </article>


        <article
          className="glass-card dashboard-kpi dashboard-kpi-ok"
          onClick={() =>
            navigate(
              "/personal"
            )
          }
        >

          <div className="dashboard-kpi-icon">
            <CircleCheckBig size={20} />
          </div>

          <div className="dashboard-kpi-content">

            <span>
              OK
            </span>

            <strong>
              {stats.ok}
            </strong>

            <small>
              {porcentajes.ok}% del total
            </small>

          </div>

        </article>


        <article
          className="glass-card dashboard-kpi dashboard-kpi-warning"
          onClick={() =>
            navigate(
              "/personal"
            )
          }
        >

          <div className="dashboard-kpi-icon">
            <Clock3 size={20} />
          </div>

          <div className="dashboard-kpi-content">

            <span>
              En curso
            </span>

            <strong>
              {stats.enCurso}
            </strong>

            <small>
              requieren seguimiento
            </small>

          </div>

        </article>


        <article
          className="glass-card dashboard-kpi dashboard-kpi-danger"
          onClick={() =>
            navigate(
              "/personal"
            )
          }
        >

          <div className="dashboard-kpi-icon">
            <TriangleAlert size={20} />
          </div>

          <div className="dashboard-kpi-content">

            <span>
              Problemas
            </span>

            <strong>
              {stats.problemas}
            </strong>

            <small>
              requieren revisión
            </small>

          </div>

        </article>


        <article
          className="glass-card dashboard-kpi dashboard-kpi-neutral"
          onClick={() =>
            navigate(
              "/personal"
            )
          }
        >

          <div className="dashboard-kpi-icon">
            <UserRoundX size={20} />
          </div>

          <div className="dashboard-kpi-content">

            <span>
              Bajas
            </span>

            <strong>
              {stats.bajas}
            </strong>

            <small>
              registros históricos
            </small>

          </div>

        </article>

      </section>


      {/* =====================================================
          SEGUNDA FILA
          ===================================================== */}

      <section className="dashboard-main-grid">

        {/* ESTADO DE ACCESOS */}

        <article className="glass-card dashboard-access-card">

          <div className="dashboard-section-header">

            <div>

              <span>
                ACCESOS
              </span>

              <h2>
                Estado general
              </h2>

            </div>


            <Activity size={18} />

          </div>


          <div className="dashboard-progress-list">

            {/* PETRA */}

            <div className="dashboard-progress-item">

              <div className="dashboard-progress-heading">

                <div>

                  <div className="dashboard-progress-icon petra">
                    <Database size={16} />
                  </div>

                  <div>
                    <strong>
                      PETRA
                    </strong>

                    <span>
                      Usuarios creados
                    </span>
                  </div>

                </div>


                <div className="dashboard-progress-value">

                  <strong>
                    {stats.petra}
                  </strong>

                  <span>
                    {porcentajes.petra}%
                  </span>

                </div>

              </div>


              <div className="dashboard-progress-track">

                <div
                  className="dashboard-progress-bar"
                  style={{
                    width:
                      `${porcentajes.petra}%`,
                  }}
                />

              </div>

            </div>


            {/* INGRESO */}

            <div className="dashboard-progress-item">

              <div className="dashboard-progress-heading">

                <div>

                  <div className="dashboard-progress-icon ingreso">
                    <LogIn size={16} />
                  </div>

                  <div>
                    <strong>
                      Ingreso
                    </strong>

                    <span>
                      Ingreso confirmado
                    </span>
                  </div>

                </div>


                <div className="dashboard-progress-value">

                  <strong>
                    {stats.ingreso}
                  </strong>

                  <span>
                    {porcentajes.ingreso}%
                  </span>

                </div>

              </div>


              <div className="dashboard-progress-track">

                <div
                  className="dashboard-progress-bar ingreso"
                  style={{
                    width:
                      `${porcentajes.ingreso}%`,
                  }}
                />

              </div>

            </div>


            {/* OPERATIVO */}

            <div className="dashboard-progress-item">

              <div className="dashboard-progress-heading">

                <div>

                  <div className="dashboard-progress-icon operativo">
                    <CheckCircle2 size={16} />
                  </div>

                  <div>
                    <strong>
                      Estado OK
                    </strong>

                    <span>
                      Seguimiento operativo
                    </span>
                  </div>

                </div>


                <div className="dashboard-progress-value">

                  <strong>
                    {stats.ok}
                  </strong>

                  <span>
                    {porcentajes.ok}%
                  </span>

                </div>

              </div>


              <div className="dashboard-progress-track">

                <div
                  className="dashboard-progress-bar operativo"
                  style={{
                    width:
                      `${porcentajes.ok}%`,
                  }}
                />

              </div>

            </div>

          </div>

        </article>


        {/* EMPRESAS */}

        <article className="glass-card dashboard-companies-card">

          <div className="dashboard-section-header">

            <div>

              <span>
                CONTRATISTAS
              </span>

              <h2>
                Mayor personal activo
              </h2>

            </div>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/empresas"
                )
              }
            >
              Ver todas

              <ArrowUpRight
                size={14}
              />
            </button>

          </div>


          <div className="dashboard-company-list">

            {empresas.map(
              (empresa) => {

                const activos =
                  Number(
                    empresa.personal_activo ||
                    0
                  );


                const porcentaje =
                  Math.round(
                    (
                      activos /
                      maxEmpresa
                    ) * 100
                  );


                return (
                  <button
                    type="button"
                    className="dashboard-company-row"
                    key={empresa.id}
                    onClick={() =>
                      navigate(
                        `/empresas/${empresa.id}`
                      )
                    }
                  >

                    <div className="dashboard-company-icon">
                      <Building2
                        size={15}
                      />
                    </div>


                    <div className="dashboard-company-info">

                      <div className="dashboard-company-title">

                        <strong>
                          {
                            empresa.nombre
                          }
                        </strong>

                        <span>
                          {activos}
                        </span>

                      </div>


                      <div className="dashboard-company-track">

                        <div
                          style={{
                            width:
                              `${porcentaje}%`,
                          }}
                        />

                      </div>

                    </div>


                    <ArrowUpRight
                      size={14}
                      className="dashboard-company-arrow"
                    />

                  </button>
                );
              }
            )}

          </div>

        </article>

      </section>


      {/* =====================================================
          ÚLTIMOS MOVIMIENTOS
          ===================================================== */}

      <section className="glass-card dashboard-recent-card">

        <div className="dashboard-section-header">

          <div>

            <span>
              ACTIVIDAD
            </span>

            <h2>
              Últimas actualizaciones
            </h2>

          </div>


          <button
            type="button"
            onClick={() =>
              navigate(
                "/personal"
              )
            }
          >
            Ver personal

            <ArrowUpRight
              size={14}
            />
          </button>

        </div>


        {ultimos.length === 0 ? (

          <div className="dashboard-empty">
            No hay actualizaciones registradas.
          </div>

        ) : (

          <div className="dashboard-recent-list">

            {ultimos.map(
              (persona) => (

                <button
                  type="button"
                  className="dashboard-recent-row"
                  key={
                    persona.seguimiento_id
                  }
                  onClick={() =>
                    navigate(
                      `/personal/${persona.ejecutante_id}`
                    )
                  }
                >

                  <div className="dashboard-recent-avatar">

                    {persona.ejecutante
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "E"}

                  </div>


                  <div className="dashboard-recent-person">

                    <strong>
                      {
                        persona.ejecutante
                      }
                    </strong>

                    <span>
                      {
                        persona.empresa ||
                        "Sin empresa"
                      }
                    </span>

                  </div>


                  <div className="dashboard-recent-meta">

                    <span>
                      CAU / REQ
                    </span>

                    <strong>
                      {
                        persona.cau_req ||
                        "—"
                      }
                    </strong>

                  </div>


                  <div className="dashboard-recent-meta">

                    <span>
                      PETRA
                    </span>

                    <strong>
                      {
                        persona.petra_estado ||
                        "—"
                      }
                    </strong>

                  </div>


                  <div className="dashboard-recent-meta">

                    <span>
                      Actualización
                    </span>

                    <strong>
                      {
                        formatFecha(
                          persona.updated_at
                        )
                      }
                    </strong>

                  </div>


                  <span
                    className={`dashboard-status ${getStatusClass(
                      persona.estado_operacional
                    )}`}
                  >
                    {
                      persona.estado_operacional
                    }
                  </span>


                  <ArrowUpRight
                    size={14}
                    className="dashboard-recent-arrow"
                  />

                </button>

              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}