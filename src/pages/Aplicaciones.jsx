import {
  useMemo,
  useState,
} from "react";

import {
  Search,
  Filter,
  Layers3,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ArrowUpRight,
  Workflow,
  LockKeyhole,
  Link2,
} from "lucide-react";


const aplicaciones = [
  {
    id: "petra",
    nombre: "PETRA",
    descripcion:
      "Aplicación principal para la gestión y seguimiento operativo del personal de ejecución.",
    autenticacion: "IBM",
    estado: "Activa",
    rol: "Aplicación principal",
    impacto:
      "El acceso depende de la identidad IBM utilizada por el ejecutante.",
    accion:
      "Seguimiento operativo",
    url: null,
  },
  {
    id: "fsm",
    nombre: "FSM",
    descripcion:
      "Aplicación vinculada a la identidad IBM desde la que puede gestionarse el cambio de contraseña.",
    autenticacion: "IBM",
    estado: "Activa",
    rol: "Gestión de credencial",
    impacto:
      "Un cambio de contraseña realizado en FSM puede afectar el acceso a PETRA.",
    accion:
      "Cambio de contraseña",
    url: null,
  },
];


export default function Aplicaciones() {
  const [search, setSearch] =
    useState("");

  const [estado, setEstado] =
    useState("Todas");


  const filtradas =
    useMemo(() => {
      const texto =
        search
          .trim()
          .toLowerCase();


      return aplicaciones.filter(
        (app) => {
          const coincideBusqueda =
            !texto ||
            app.nombre
              .toLowerCase()
              .includes(texto) ||
            app.descripcion
              .toLowerCase()
              .includes(texto) ||
            app.autenticacion
              .toLowerCase()
              .includes(texto) ||
            app.rol
              .toLowerCase()
              .includes(texto);


          const coincideEstado =
            estado === "Todas" ||
            app.estado === estado;


          return (
            coincideBusqueda &&
            coincideEstado
          );
        }
      );

    }, [
      search,
      estado,
    ]);


  return (
    <div className="aplicaciones-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <div className="dashboard-hero">

        <div>

          <div className="eyebrow">
            ECOSISTEMA DE APLICACIONES
          </div>

          <h1>
            Aplicaciones
          </h1>

          <p>
            PETRA y FSM comparten la identidad IBM utilizada
            por el personal de ejecución.
          </p>

        </div>


        <div className="dashboard-update">

          <span>
            Autenticación común
          </span>

          <strong>
            IBM
          </strong>

          <small>
            Identidad compartida
          </small>

        </div>

      </div>


      {/* =====================================================
          KPIs
          ===================================================== */}

      <section className="applications-summary-grid">

        <ApplicationSummary
          icon={Layers3}
          value="2"
          label="Aplicaciones"
          description="PETRA + FSM"
          type="blue"
        />


        <ApplicationSummary
          icon={KeyRound}
          value="1"
          label="Identidad"
          description="IBM compartida"
          type="green"
        />


        <ApplicationSummary
          icon={Workflow}
          value="PETRA"
          label="Principal"
          description="seguimiento operativo"
          type="purple"
        />


        <ApplicationSummary
          icon={LockKeyhole}
          value="FSM"
          label="Credencial"
          description="cambio de contraseña"
          type="warning"
        />

      </section>


      {/* =====================================================
          AVISO IDENTIDAD
          ===================================================== */}

      <section className="glass-card application-security-banner">

        <div className="application-security-icon">
          <KeyRound size={23} />
        </div>


        <div>

          <strong>
            Identidad IBM compartida
          </strong>

          <p>
            PETRA y FSM utilizan la misma identidad IBM.
            Si la contraseña se modifica desde FSM,
            el acceso a PETRA también puede verse afectado.
          </p>

        </div>


        <ShieldCheck
          size={24}
        />

      </section>


      {/* =====================================================
          FILTROS
          ===================================================== */}

      <section className="glass-card application-search-panel">

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
            placeholder="Buscar PETRA o FSM..."
          />

        </div>


        <div className="filter-field application-filter">

          <Filter
            size={17}
          />

          <select
            value={estado}
            onChange={(e) =>
              setEstado(
                e.target.value
              )
            }
          >
            <option>
              Todas
            </option>

            <option>
              Activa
            </option>
          </select>

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
              ? "aplicación encontrada"
              : "aplicaciones encontradas"}
          </span>

        </div>


        <span>
          Ecosistema IBM del ejecutante
        </span>

      </section>


      {/* =====================================================
          TARJETAS
          ===================================================== */}

      <section className="applications-grid">

        {filtradas.map(
          (app) => (
            <ApplicationCard
              key={app.id}
              app={app}
            />
          )
        )}

      </section>


      {/* =====================================================
          MAPA / RELACIÓN
          ===================================================== */}

      <section className="glass-card applications-table-card">

        <div className="card-header">

          <div>

            <span className="card-kicker">
              RELACIÓN ENTRE SISTEMAS
            </span>

            <h2>
              Mapa de aplicaciones
            </h2>

          </div>

        </div>


        <div className="table-wrapper">

          <table>

            <thead>

              <tr>
                <th>
                  Aplicación
                </th>

                <th>
                  Rol
                </th>

                <th>
                  Autenticación
                </th>

                <th>
                  Función relevante
                </th>

                <th>
                  Impacto
                </th>

                <th>
                  Estado
                </th>

                <th>
                  Acceso
                </th>
              </tr>

            </thead>


            <tbody>

              {filtradas.map(
                (app) => (

                  <tr key={app.id}>

                    <td>
                      <strong>
                        {app.nombre}
                      </strong>
                    </td>


                    <td>
                      {app.rol}
                    </td>


                    <td>

                      <span className="application-auth-badge">

                        <KeyRound
                          size={12}
                        />

                        {app.autenticacion}

                      </span>

                    </td>


                    <td>
                      {app.accion}
                    </td>


                    <td>
                      {app.impacto}
                    </td>


                    <td>
                      <ApplicationStatus
                        estado={
                          app.estado
                        }
                      />
                    </td>


                    <td>

                      {app.url ? (

                        <a
                          href={app.url}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                        >
                          <ArrowUpRight
                            size={13}
                          />
                          Abrir
                        </a>

                      ) : (

                        <span className="application-access-pending">
                          No configurado
                        </span>

                      )}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}


/* =========================================================
   KPI
   ========================================================= */

function ApplicationSummary({
  icon: Icon,
  value,
  label,
  description,
  type,
}) {
  return (
    <article
      className={`application-summary-card ${type}`}
    >

      <div className="application-summary-icon">
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
   CARD
   ========================================================= */

function ApplicationCard({
  app,
}) {
  const isPetra =
    app.id === "petra";


  return (
    <article className="glass-card application-card">

      <div className="application-card-header">

        <div className="application-card-title">

          <div className="application-logo-placeholder">

            {isPetra ? (
              <Layers3
                size={23}
              />
            ) : (
              <LockKeyhole
                size={23}
              />
            )}

          </div>


          <div>

            <div className="application-name-row">

              <h3>
                {app.nombre}
              </h3>

              <ApplicationStatus
                estado={
                  app.estado
                }
              />

            </div>


            <span>
              {app.autenticacion}
            </span>

          </div>

        </div>


        <div className="application-card-top-icon">

          {isPetra ? (
            <Workflow
              size={18}
            />
          ) : (
            <Link2
              size={18}
            />
          )}

        </div>

      </div>


      <p className="application-description">
        {app.descripcion}
      </p>


      <div className="application-relation-box">

        <div>

          <span>
            Rol
          </span>

          <strong>
            {app.rol}
          </strong>

        </div>


        <div>

          <span>
            Función
          </span>

          <strong>
            {app.accion}
          </strong>

        </div>

      </div>


      <div className="application-impact-box">

        <ShieldCheck
          size={16}
        />

        <div>

          <span>
            Impacto sobre identidad
          </span>

          <strong>
            {app.impacto}
          </strong>

        </div>

      </div>


      <div className="application-card-meta">

        <div>

          <span>
            Autenticación
          </span>

          <strong className="application-auth-text">

            <KeyRound
              size={13}
            />

            IBM

          </strong>

        </div>


        <div>

          <span>
            Estado
          </span>

          <ApplicationStatus
            estado={
              app.estado
            }
          />

        </div>

      </div>


      <div className="application-card-footer">

        <span>
          {isPetra
            ? "Aplicación principal del seguimiento"
            : "Aplicación vinculada a la contraseña IBM"}
        </span>


        {app.url ? (

          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="profile-link"
          >
            Abrir sistema
          </a>

        ) : (

          <span className="application-url-disabled">
            Acceso no configurado
          </span>

        )}

      </div>

    </article>
  );
}


/* =========================================================
   ESTADO
   ========================================================= */

function ApplicationStatus({
  estado,
}) {
  return (
    <span className="application-status active">

      <CheckCircle2
        size={12}
      />

      {estado}

    </span>
  );
}
