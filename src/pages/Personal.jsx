import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  Building2,
  CircleCheckBig,
  Clock3,
  TriangleAlert,
  UserRoundX,
  ChevronLeft,
  ChevronRight,
  Mail,
  FileText,
  Database,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const PAGE_SIZE = 24;

export default function Personal() {
  const navigate = useNavigate();

  const [personal, setPersonal] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [petra, setPetra] = useState("todos");
  const [ingreso, setIngreso] = useState("todos");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [stats, setStats] = useState({
    total: 0,
    ok: 0,
    enCurso: 0,
    problema: 0,
    baja: 0,
  });

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  useEffect(() => {
    cargarEmpresas();
    cargarEstadisticas();
  }, []);

  useEffect(() => {
    cargarPersonal();
  }, [
    page,
    empresa,
    estado,
    petra,
    ingreso,
    search,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    empresa,
    estado,
    petra,
    ingreso,
    search,
  ]);

  async function cargarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre")
      .eq("activa", true)
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

  async function contarPorEstado(
    estadoOperacional
  ) {
    const { count, error } = await supabase
      .from("v_ejecutantes_seguimiento")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "estado_operacional",
        estadoOperacional
      );

    if (error) {
      console.error(
        `Error contando ${estadoOperacional}:`,
        error
      );

      return 0;
    }

    return count || 0;
  }

  async function cargarEstadisticas() {
    try {
      const [
        totalResult,
        ok,
        enCurso,
        problema,
        baja,
      ] = await Promise.all([
        supabase
          .from(
            "v_ejecutantes_seguimiento"
          )
          .select("*", {
            count: "exact",
            head: true,
          }),

        contarPorEstado("OK"),
        contarPorEstado("En curso"),
        contarPorEstado("Problema"),
        contarPorEstado("Baja"),
      ]);

      if (totalResult.error) {
        throw totalResult.error;
      }

      setStats({
        total: totalResult.count || 0,
        ok,
        enCurso,
        problema,
        baja,
      });
    } catch (err) {
      console.error(
        "Error cargando estadísticas:",
        err
      );
    }
  }

  function aplicarFiltros(query) {
    let nuevaQuery = query;

    if (empresa !== "todos") {
      nuevaQuery = nuevaQuery.eq(
        "empresa_id",
        empresa
      );
    }

    if (estado !== "todos") {
      nuevaQuery = nuevaQuery.eq(
        "estado_operacional",
        estado
      );
    }

    if (petra !== "todos") {
      nuevaQuery = nuevaQuery.eq(
        "petra_estado",
        petra
      );
    }

    if (ingreso !== "todos") {
      nuevaQuery = nuevaQuery.eq(
        "ingreso_estado",
        ingreso
      );
    }

    const termino = search.trim();

    if (termino) {
      nuevaQuery = nuevaQuery.or(
        [
          `ejecutante.ilike.%${termino}%`,
          `email.ilike.%${termino}%`,
          `empresa.ilike.%${termino}%`,
          `cau_req.ilike.%${termino}%`,
        ].join(",")
      );
    }

    return nuevaQuery;
  }

  async function cargarPersonal() {
    setLoading(true);
    setError("");

    const desde =
      (page - 1) * PAGE_SIZE;

    const hasta =
      desde + PAGE_SIZE - 1;

    let query = supabase
      .from("v_ejecutantes_seguimiento")
      .select("*", {
        count: "exact",
      });

    query = aplicarFiltros(query);

    const {
      data,
      count,
      error,
    } = await query
      .order("fecha_solicitud", {
        ascending: false,
        nullsFirst: false,
      })
      .range(desde, hasta);

    if (error) {
      console.error(
        "Error cargando ejecutantes:",
        error
      );

      setError(
        "No se pudo cargar el personal."
      );

      setPersonal([]);
      setTotal(0);
      setLoading(false);

      return;
    }

    setPersonal(data || []);
    setTotal(count || 0);
    setLoading(false);
  }

  function limpiarFiltros() {
    setSearch("");
    setEmpresa("todos");
    setEstado("todos");
    setPetra("todos");
    setIngreso("todos");
    setPage(1);
  }

  function getStatusClass(status) {
    if (status === "OK") {
      return "status-ok";
    }

    if (status === "En curso") {
      return "status-warning";
    }

    if (status === "Problema") {
      return "status-danger";
    }

    if (status === "Baja") {
      return "status-neutral";
    }

    return "status-neutral";
  }

  function getCardStatusClass(status) {
    if (status === "OK") {
      return "personal-card-ok";
    }

    if (status === "En curso") {
      return "personal-card-warning";
    }

    if (status === "Problema") {
      return "personal-card-danger";
    }

    if (status === "Baja") {
      return "personal-card-disabled";
    }

    return "";
  }

  function getPetraClass(value) {
    if (
      String(value).toLowerCase() === "si"
    ) {
      return "status-ok";
    }

    return "status-neutral";
  }

  function formatFecha(fecha) {
    if (!fecha) {
      return "Sin fecha";
    }

    const [year, month, day] =
      fecha.split("-");

    if (!year || !month || !day) {
      return fecha;
    }

    return `${day}/${month}/${year}`;
  }

  const rangoTexto = useMemo(() => {
    if (total === 0) {
      return "0 resultados";
    }

    const inicio =
      (page - 1) * PAGE_SIZE + 1;

    const fin = Math.min(
      page * PAGE_SIZE,
      total
    );

    return `${inicio}–${fin} de ${total}`;
  }, [page, total]);

  return (
    <div className="page personal-page">

      {/* HERO */}

      <section className="page-hero">
        <div>
          <span className="page-eyebrow">
            PERSONAL DE EJECUCIÓN · CILC
          </span>

          <h1>Ejecutantes</h1>

          <p>
            Seguimiento centralizado de
            ejecutantes, solicitudes CAU,
            creación en PETRA e ingreso.
          </p>
        </div>

        <div className="page-hero-badge">
          <Database size={17} />

          <div>
            <span>Fuente</span>
            <strong>
              Carga · CILC
            </strong>
          </div>
        </div>
      </section>


      {/* ESTADÍSTICAS */}

      <section className="personal-stats-grid">

        <article className="glass-card personal-stat-card">
          <div className="personal-stat-icon">
            <Users size={21} />
          </div>

          <div>
            <span>
              Seguimientos
            </span>

            <strong>
              {stats.total}
            </strong>

            <small>
              registros de Carga
            </small>
          </div>
        </article>


        <article className="glass-card personal-stat-card">
          <div className="personal-stat-icon success">
            <CircleCheckBig size={21} />
          </div>

          <div>
            <span>OK</span>

            <strong>
              {stats.ok}
            </strong>

            <small>
              CAU resuelto
            </small>
          </div>
        </article>


        <article className="glass-card personal-stat-card">
          <div className="personal-stat-icon warning">
            <Clock3 size={21} />
          </div>

          <div>
            <span>
              En curso
            </span>

            <strong>
              {stats.enCurso}
            </strong>

            <small>
              abierto o pendiente
            </small>
          </div>
        </article>


        <article className="glass-card personal-stat-card">
          <div className="personal-stat-icon danger">
            <TriangleAlert size={21} />
          </div>

          <div>
            <span>
              Problemas
            </span>

            <strong>
              {stats.problema}
            </strong>

            <small>
              solicitudes rechazadas
            </small>
          </div>
        </article>


        <article className="glass-card personal-stat-card">
          <div className="personal-stat-icon neutral">
            <UserRoundX size={21} />
          </div>

          <div>
            <span>
              Bajas
            </span>

            <strong>
              {stats.baja}
            </strong>

            <small>
              eliminados / bajas
            </small>
          </div>
        </article>

      </section>


      {/* FILTROS */}

      <section className="glass-card personal-filter-panel">

        <div className="personal-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Buscar por nombre, email, empresa o CAU..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        <div className="personal-filters">

          <select
            value={empresa}
            onChange={(e) =>
              setEmpresa(e.target.value)
            }
          >
            <option value="todos">
              Todas las empresas
            </option>

            {empresas.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.nombre}
              </option>
            ))}
          </select>


          <select
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value)
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


          <select
            value={petra}
            onChange={(e) =>
              setPetra(e.target.value)
            }
          >
            <option value="todos">
              PETRA
            </option>

            <option value="Si">
              PETRA · Sí
            </option>

            <option value="No">
              PETRA · No
            </option>
          </select>


          <select
            value={ingreso}
            onChange={(e) =>
              setIngreso(e.target.value)
            }
          >
            <option value="todos">
              Estado de ingreso
            </option>

            <option value="Confirmado">
              Confirmado
            </option>

            <option value="No">
              No confirmado
            </option>
          </select>


          <button
            className="secondary-button"
            type="button"
            onClick={limpiarFiltros}
          >
            Limpiar
          </button>

        </div>

      </section>


      {/* CONTENIDO */}

      {loading ? (

        <section className="glass-card personal-message-card">
          Cargando ejecutantes...
        </section>

      ) : error ? (

        <section className="glass-card personal-message-card error">
          {error}
        </section>

      ) : personal.length === 0 ? (

        <section className="glass-card personal-message-card">
          No encontramos registros para los filtros seleccionados.
        </section>

      ) : (

        <>
          <div className="personal-result-header">

            <div>
              <strong>
                Personal CILC
              </strong>

              <span>
                {rangoTexto}
              </span>
            </div>

          </div>


          <section className="personal-grid">

            {personal.map((persona) => (

              <article
                key={persona.seguimiento_id}
                className={`glass-card personal-card ${getCardStatusClass(
                  persona.estado_operacional
                )}`}
              >

                <div className="personal-card-top">

                  <div className="personal-avatar">
                    {persona.ejecutante
                      ?.charAt(0)
                      ?.toUpperCase() || "E"}
                  </div>


                  <div className="personal-card-title">

                    <h3>
                      {persona.ejecutante}
                    </h3>

                    <span>
                      {persona.empresa ||
                        "Sin empresa"}
                    </span>

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

                </div>


                <div className="personal-card-body">

                  <div className="personal-info-row">

                    <Mail size={15} />

                    <div>
                      <span>Email</span>

                      <strong>
                        {persona.email ||
                          "Sin email"}
                      </strong>
                    </div>

                  </div>


                  <div className="personal-info-row">

                    <Building2 size={15} />

                    <div>
                      <span>Empresa</span>

                      <strong>
                        {persona.empresa ||
                          "Sin empresa"}
                      </strong>

                      {persona.cuit && (
                        <small>
                          CUIT {persona.cuit}
                        </small>
                      )}
                    </div>

                  </div>


                  <div className="personal-info-row">

                    <FileText size={15} />

                    <div>
                      <span>CAU / REQ</span>

                      <strong>
                        {persona.cau_req ||
                          "Sin CAU"}
                      </strong>

                      <small>
                        {persona.cau_estado ||
                          "Sin estado"}
                      </small>
                    </div>

                  </div>

                </div>


                <div className="personal-card-flags">

                  <span
                    className={`personal-mini-badge ${getPetraClass(
                      persona.petra_estado
                    )}`}
                  >
                    PETRA{" "}
                    {persona.petra_estado ||
                      "—"}
                  </span>


                  <span className="personal-mini-badge">
                    Ingreso{" "}
                    {persona.ingreso_estado ||
                      "—"}
                  </span>

                </div>


                <div className="personal-card-footer">

                  <div>
                    <span>
                      Solicitud
                    </span>

                    <strong>
                      {formatFecha(
                        persona.fecha_solicitud
                      )}
                    </strong>
                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/personal/${persona.ejecutante_id}`
                      )
                    }
                  >
                    Ver ficha
                  </button>

                </div>

              </article>

            ))}

          </section>


          {/* PAGINACIÓN */}

          <div className="personal-pagination">

            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((p) =>
                  Math.max(1, p - 1)
                )
              }
            >
              <ChevronLeft size={17} />
              Anterior
            </button>


            <div>
              Página{" "}
              <strong>{page}</strong>
              {" "}de{" "}
              <strong>
                {totalPages}
              </strong>
            </div>


            <button
              type="button"
              disabled={
                page === totalPages
              }
              onClick={() =>
                setPage((p) =>
                  Math.min(
                    totalPages,
                    p + 1
                  )
                )
              }
            >
              Siguiente
              <ChevronRight size={17} />
            </button>

          </div>
        </>
      )}

    </div>
  );
}