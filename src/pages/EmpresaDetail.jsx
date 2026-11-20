import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  UserRoundX,
  Search,
  Mail,
  FileText,
  CircleCheckBig,
  Clock3,
  TriangleAlert,
  ChevronRight,
} from "lucide-react";

import { supabase } from "../lib/supabase";


export default function EmpresaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState(null);
  const [personal, setPersonal] = useState([]);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("todos");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  /* =========================================================
     CARGA
     ========================================================= */

  useEffect(() => {
    cargarEmpresa();
  }, [id]);


  async function cargarEmpresa() {
    setLoading(true);
    setError("");

    try {

      /* EMPRESA */

      const empresaResult =
        await supabase
          .from("v_empresas_resumen")
          .select("*")
          .eq("id", id)
          .maybeSingle();


      if (empresaResult.error) {
        throw empresaResult.error;
      }


      if (!empresaResult.data) {
        setError(
          "No encontramos esta empresa."
        );

        setLoading(false);
        return;
      }


      setEmpresa(
        empresaResult.data
      );


      /* PERSONAL DE LA EMPRESA */

      const personalResult =
        await supabase
          .from(
            "v_ejecutantes_seguimiento"
          )
          .select("*")
          .eq(
            "empresa_id",
            id
          )
          .order(
            "fecha_solicitud",
            {
              ascending: false,
              nullsFirst: false,
            }
          );


      if (personalResult.error) {
        throw personalResult.error;
      }


      /*
        Si en el futuro una persona tiene varios
        seguimientos, mostramos solamente el más
        reciente en la ficha de empresa.
      */

      const personasUnicas = [];

      const idsVistos =
        new Set();


      for (
        const persona
        of personalResult.data || []
      ) {

        if (
          idsVistos.has(
            persona.ejecutante_id
          )
        ) {
          continue;
        }

        idsVistos.add(
          persona.ejecutante_id
        );

        personasUnicas.push(
          persona
        );
      }


      setPersonal(
        personasUnicas
      );

      setLoading(false);

    } catch (err) {

      console.error(
        "Error cargando empresa:",
        err
      );

      setError(
        "No se pudo cargar la empresa."
      );

      setLoading(false);
    }
  }


  /* =========================================================
     FILTROS
     ========================================================= */

  const personalFiltrado =
    useMemo(() => {

      const termino =
        search
          .trim()
          .toLowerCase();


      return personal.filter(
        (persona) => {

          const coincideBusqueda =
            !termino ||
            persona.ejecutante
              ?.toLowerCase()
              .includes(termino) ||
            persona.email
              ?.toLowerCase()
              .includes(termino) ||
            persona.cau_req
              ?.toLowerCase()
              .includes(termino);


          const coincideEstado =
            estado === "todos" ||
            persona.estado_operacional ===
              estado;


          return (
            coincideBusqueda &&
            coincideEstado
          );
        }
      );

    }, [
      personal,
      search,
      estado,
    ]);


  /* =========================================================
     CONTADORES
     ========================================================= */

  const resumen =
    useMemo(() => {

      return personal.reduce(
        (acc, persona) => {

          acc.total += 1;

          if (
            persona.estado_operacional ===
            "OK"
          ) {
            acc.ok += 1;
          }

          if (
            persona.estado_operacional ===
            "En curso"
          ) {
            acc.enCurso += 1;
          }

          if (
            persona.estado_operacional ===
            "Problema"
          ) {
            acc.problema += 1;
          }

          if (
            persona.estado_operacional ===
            "Baja"
          ) {
            acc.baja += 1;
          }

          return acc;
        },
        {
          total: 0,
          ok: 0,
          enCurso: 0,
          problema: 0,
          baja: 0,
        }
      );

    }, [personal]);


  /* =========================================================
     HELPERS
     ========================================================= */

  function getStatusClass(status) {
    if (status === "OK") {
      return "status-ok";
    }

    if (
      status === "En curso"
    ) {
      return "status-warning";
    }

    if (
      status === "Problema"
    ) {
      return "status-danger";
    }

    return "status-neutral";
  }


  function getRowClass(status) {
    if (status === "OK") {
      return "company-person-ok";
    }

    if (
      status === "En curso"
    ) {
      return "company-person-warning";
    }

    if (
      status === "Problema"
    ) {
      return "company-person-danger";
    }

    if (
      status === "Baja"
    ) {
      return "company-person-disabled";
    }

    return "";
  }


  function formatFecha(fecha) {
    if (!fecha) {
      return "Sin fecha";
    }

    const parts =
      String(fecha)
        .split("-");

    if (
      parts.length === 3
    ) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return fecha;
  }


  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <section className="glass-card company-detail-message">
        Cargando empresa...
      </section>
    );
  }


  /* =========================================================
     ERROR
     ========================================================= */

  if (
    error ||
    !empresa
  ) {
    return (
      <section className="glass-card company-detail-message">

        <strong>
          {error ||
            "Empresa no encontrada."}
        </strong>


        <button
          type="button"
          onClick={() =>
            navigate(
              "/empresas"
            )
          }
        >
          Volver a Empresas
        </button>

      </section>
    );
  }


  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="empresa-detail-page">

      {/* VOLVER */}

      <button
        type="button"
        className="company-detail-back"
        onClick={() =>
          navigate(
            "/empresas"
          )
        }
      >
        <ArrowLeft size={16} />

        Volver a Empresas
      </button>


      {/* =====================================================
          HEADER
          ===================================================== */}

      <section className="glass-card company-detail-header">

        <div className="company-detail-identity">

          <div className="company-detail-logo">
            <Building2
              size={25}
            />
          </div>


          <div>

            <div className="company-detail-title">

              <h1>
                {empresa.nombre}
              </h1>


              {empresa.activa && (
                <span>
                  Activa
                </span>
              )}

            </div>


            <p>
              {empresa.cuit
                ? `CUIT ${empresa.cuit}`
                : "CUIT sin registrar"}
            </p>

          </div>

        </div>


        <div className="company-detail-total">

          <span>
            Personal registrado
          </span>

          <strong>
            {resumen.total}
          </strong>

        </div>

      </section>


      {/* =====================================================
          KPIs
          ===================================================== */}

      <section className="company-detail-stats">

        <article className="glass-card company-detail-stat">

          <div className="company-detail-stat-icon">
            <Users size={18} />
          </div>

          <div>
            <span>
              Total
            </span>

            <strong>
              {resumen.total}
            </strong>
          </div>

        </article>


        <article className="glass-card company-detail-stat">

          <div className="company-detail-stat-icon success">
            <CircleCheckBig size={18} />
          </div>

          <div>
            <span>
              OK
            </span>

            <strong>
              {resumen.ok}
            </strong>
          </div>

        </article>


        <article className="glass-card company-detail-stat">

          <div className="company-detail-stat-icon warning">
            <Clock3 size={18} />
          </div>

          <div>
            <span>
              En curso
            </span>

            <strong>
              {resumen.enCurso}
            </strong>
          </div>

        </article>


        <article className="glass-card company-detail-stat">

          <div className="company-detail-stat-icon danger">
            <TriangleAlert size={18} />
          </div>

          <div>
            <span>
              Problemas
            </span>

            <strong>
              {resumen.problema}
            </strong>
          </div>

        </article>


        <article className="glass-card company-detail-stat">

          <div className="company-detail-stat-icon neutral">
            <UserRoundX size={18} />
          </div>

          <div>
            <span>
              Bajas
            </span>

            <strong>
              {resumen.baja}
            </strong>
          </div>

        </article>

      </section>


      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="glass-card company-detail-filters">

        <div className="company-detail-search">

          <Search size={17} />

          <input
            type="text"
            placeholder="Buscar personal por nombre, email o CAU..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />

        </div>


        <select
          value={estado}
          onChange={(e) =>
            setEstado(
              e.target.value
            )
          }
        >
          <option value="todos">
            Todos los estados
          </option>

          <option value="OK">
            OK
          </option>

          <option value="En curso">
            En curso
          </option>

          <option value="Problema">
            Problema
          </option>

          <option value="Baja">
            Baja
          </option>

        </select>

      </section>


      {/* =====================================================
          PERSONAL
          ===================================================== */}

      <section className="glass-card company-detail-personnel">

        <div className="company-detail-section-heading">

          <div>

            <span>
              PERSONAL ASOCIADO
            </span>

            <h2>
              Ejecutantes
            </h2>

          </div>


          <strong>
            {
              personalFiltrado.length
            }
          </strong>

        </div>


        {personalFiltrado.length === 0 ? (

          <div className="company-detail-empty">

            <Users size={25} />

            <strong>
              No encontramos personal
            </strong>

            <span>
              Probá modificando la búsqueda o el filtro.
            </span>

          </div>

        ) : (

          <div className="company-person-list">

            {personalFiltrado.map(
              (persona) => (

                <article
                  key={
                    persona.ejecutante_id
                  }
                  className={`company-person-row ${getRowClass(
                    persona.estado_operacional
                  )}`}
                >

                  <div className="company-person-avatar">

                    {persona.ejecutante
                      ?.charAt(0)
                      ?.toUpperCase() ||
                      "E"}

                  </div>


                  <div className="company-person-main">

                    <strong>
                      {
                        persona.ejecutante
                      }
                    </strong>


                    <span>
                      <Mail
                        size={12}
                      />

                      {
                        persona.email ||
                        "Sin email"
                      }
                    </span>

                  </div>


                  <div className="company-person-cau">

                    <span>
                      CAU / REQ
                    </span>

                    <strong>
                      {
                        persona.cau_req ||
                        "Sin CAU"
                      }
                    </strong>

                  </div>


                  <div className="company-person-petra">

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


                  <div className="company-person-ingreso">

                    <span>
                      Ingreso
                    </span>

                    <strong>
                      {
                        persona.ingreso_estado ||
                        "—"
                      }
                    </strong>

                  </div>


                  <div className="company-person-date">

                    <span>
                      Solicitud
                    </span>

                    <strong>
                      {
                        formatFecha(
                          persona.fecha_solicitud
                        )
                      }
                    </strong>

                  </div>


                  <span
                    className={`personal-status ${getStatusClass(
                      persona.estado_operacional
                    )}`}
                  >
                    {
                      persona.estado_operacional
                    }
                  </span>


                  <button
                    type="button"
                    className="company-person-open"
                    onClick={() =>
                      navigate(
                        `/personal/${persona.ejecutante_id}`
                      )
                    }
                  >
                    <ChevronRight
                      size={17}
                    />
                  </button>

                </article>

              )
            )}

          </div>

        )}

      </section>

    </div>
  );
}