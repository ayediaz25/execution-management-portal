import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  Mail,
  FileText,
  CalendarDays,
  Database,
  Save,
  X,
  CircleCheckBig,
  Clock3,
  TriangleAlert,
  UserRoundX,
  CheckCircle2,
  AlertTriangle,
  StickyNote,
} from "lucide-react";

import { supabase } from "../lib/supabase";


export default function EjecutanteForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [empresas, setEmpresas] = useState([]);

  const [seguimientoId, setSeguimientoId] =
    useState(null);

  const [form, setForm] = useState({
    nombreCompleto: "",
    email: "",
    empresaId: "",

    fechaSolicitud: "",
    cauReq: "",
    cauEstado: "Pendiente",

    petraEstado: "No",
    ingresoEstado: "No",

    estadoOperativoManual: "",
    notas: "",
  });


  /* =========================================================
     CARGA INICIAL
     ========================================================= */

  useEffect(() => {
    cargarEmpresas();

    if (isEdit) {
      cargarEjecutante();
    }
  }, [id]);


  async function cargarEmpresas() {
    const { data, error } = await supabase
      .from("empresas")
      .select("id, nombre, cuit")
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


  async function cargarEjecutante() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("v_ejecutantes_seguimiento")
        .select("*")
        .eq("ejecutante_id", id)
        .order("fecha_solicitud", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setError(
          "No encontramos el ejecutante."
        );

        setLoading(false);
        return;
      }

      setSeguimientoId(
        data.seguimiento_id
      );

      setForm({
        nombreCompleto:
          data.ejecutante || "",

        email:
          data.email || "",

        empresaId:
          data.empresa_id || "",

        fechaSolicitud:
          data.fecha_solicitud || "",

        cauReq:
          data.cau_req || "",

        cauEstado:
          data.cau_estado ||
          "Pendiente",

        petraEstado:
          data.petra_estado ||
          "No",

        ingresoEstado:
          data.ingreso_estado ||
          "No",

        estadoOperativoManual:
          data.estado_operativo_manual ||
          "",

        notas:
          data.notas || "",
      });

      setLoading(false);

    } catch (err) {

      console.error(
        "Error cargando ejecutante:",
        err
      );

      setError(
        "No se pudo cargar el ejecutante."
      );

      setLoading(false);
    }
  }


  /* =========================================================
     CAMBIO DE CAMPOS
     ========================================================= */

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }


  /* =========================================================
     EMPRESA SELECCIONADA
     ========================================================= */

  const empresaSeleccionada =
    useMemo(() => {

      return empresas.find(
        (empresa) =>
          empresa.id ===
          form.empresaId
      );

    }, [
      empresas,
      form.empresaId,
    ]);


  /* =========================================================
     ESTADO CALCULADO
     ========================================================= */

  function getEstadoCalculado() {
    if (
      form.estadoOperativoManual
    ) {
      return form.estadoOperativoManual;
    }

    const cau =
      String(
        form.cauEstado || ""
      ).toLowerCase();

    if (
      cau === "resuelto"
    ) {
      return "OK";
    }

    if (
      cau === "pendiente" ||
      cau === "abierto"
    ) {
      return "En curso";
    }

    if (
      cau === "rechazado"
    ) {
      return "Problema";
    }

    if (
      cau === "eliminado" ||
      cau === "baja"
    ) {
      return "Baja";
    }

    return "Sin clasificar";
  }


  const estadoActual =
    getEstadoCalculado();


  function getEstadoClass(estado) {
    if (estado === "OK") {
      return "edit-status-preview success";
    }

    if (
      estado === "En curso"
    ) {
      return "edit-status-preview warning";
    }

    if (
      estado === "Problema"
    ) {
      return "edit-status-preview danger";
    }

    if (
      estado === "Baja"
    ) {
      return "edit-status-preview neutral";
    }

    return "edit-status-preview";
  }


  function getEstadoIcon(estado) {
    if (estado === "OK") {
      return (
        <CircleCheckBig
          size={16}
        />
      );
    }

    if (
      estado === "En curso"
    ) {
      return (
        <Clock3
          size={16}
        />
      );
    }

    if (
      estado === "Problema"
    ) {
      return (
        <TriangleAlert
          size={16}
        />
      );
    }

    return (
      <UserRoundX
        size={16}
      />
    );
  }


  /* =========================================================
     GUARDAR
     ========================================================= */

  async function guardar(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (
        !form.nombreCompleto.trim()
      ) {
        throw new Error(
          "El nombre completo es obligatorio."
        );
      }

      if (
        !form.email.trim()
      ) {
        throw new Error(
          "El email es obligatorio."
        );
      }

      if (
        !form.empresaId
      ) {
        throw new Error(
          "Seleccioná una empresa."
        );
      }


      if (isEdit) {
        const ejecutanteResult =
          await supabase
            .from("ejecutantes")
            .update({
              nombre:
                form.nombreCompleto.trim(),

              nombre_completo:
                form.nombreCompleto.trim(),

              email:
                form.email
                  .trim()
                  .toLowerCase(),

              empresa_id:
                form.empresaId,

              activo:
                estadoActual !== "Baja",

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq("id", id);


        if (
          ejecutanteResult.error
        ) {
          throw ejecutanteResult.error;
        }


        const seguimientoResult =
          await supabase
            .from(
              "seguimiento_ejecutantes"
            )
            .update({
              fecha_solicitud:
                form.fechaSolicitud ||
                null,

              cau_req:
                form.cauReq.trim() ||
                null,

              cau_estado:
                form.cauEstado,

              petra_estado:
                form.petraEstado,

              ingreso_estado:
                form.ingresoEstado,

              notas:
                form.notas.trim() ||
                null,

              estado_operativo_manual:
                form.estadoOperativoManual ||
                null,

              estado_actualizado_por:
                "Ayelén Diaz",

              estado_actualizado_at:
                new Date()
                  .toISOString(),

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              seguimientoId
            );


        if (
          seguimientoResult.error
        ) {
          throw seguimientoResult.error;
        }


        setSuccess(
          "Los cambios fueron guardados correctamente."
        );


        // Nos quedamos en la misma pantalla después de guardar.
        // Así evitamos el salto visual y la recarga de la ficha.

      } else {

        const nuevoEjecutante =
          await supabase
            .from("ejecutantes")
            .insert({
              nombre:
                form.nombreCompleto.trim(),

              apellido: "",

              nombre_completo:
                form.nombreCompleto.trim(),

              email:
                form.email
                  .trim()
                  .toLowerCase(),

              empresa_id:
                form.empresaId,

              activo:
                estadoActual !== "Baja",

              fecha_alta:
                form.fechaSolicitud ||
                null,
            })
            .select("id")
            .single();


        if (
          nuevoEjecutante.error
        ) {
          throw nuevoEjecutante.error;
        }


        const nuevoSeguimiento =
          await supabase
            .from(
              "seguimiento_ejecutantes"
            )
            .insert({
              ejecutante_id:
                nuevoEjecutante.data.id,

              fecha_solicitud:
                form.fechaSolicitud ||
                null,

              cau_req:
                form.cauReq.trim() ||
                null,

              cau_estado:
                form.cauEstado,

              petra_estado:
                form.petraEstado,

              ingreso_estado:
                form.ingresoEstado,

              notas:
                form.notas.trim() ||
                null,

              estado_operativo_manual:
                form.estadoOperativoManual ||
                null,

              estado_actualizado_por:
                "Ayelén Diaz",

              estado_actualizado_at:
                new Date()
                  .toISOString(),

              origen:
                "Portal",
            });


        if (
          nuevoSeguimiento.error
        ) {
          throw nuevoSeguimiento.error;
        }


        navigate(
          `/personal/${nuevoEjecutante.data.id}`
        );
      }

    } catch (err) {

      console.error(
        "Error guardando ejecutante:",
        err
      );


      setError(
        err.message ||
        "No se pudieron guardar los cambios."
      );

    } finally {

      setSaving(false);
    }
  }


  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <section className="glass-card edit-loading-card">
        Cargando información...
      </section>
    );
  }


  return (
    <div className="ejecutante-edit-page">

      {/* =====================================================
          VOLVER
          ===================================================== */}

      <button
        type="button"
        className="edit-back-button"
        onClick={() => {
          if (isEdit) {
            navigate(
              `/personal/${id}`
            );
          } else {
            navigate(
              "/personal"
            );
          }
        }}
      >
        <ArrowLeft size={16} />

        {isEdit
          ? "Volver a la ficha"
          : "Volver a Personal"}
      </button>


      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="edit-page-header">

        <div>

          <span className="edit-page-kicker">
            PERSONAL DE EJECUCIÓN · CILC
          </span>

          <h1>
            {isEdit
              ? "Editar ejecutante"
              : "Nuevo ejecutante"}
          </h1>

          <p>
            {isEdit
              ? "Actualizá la identidad y el seguimiento operativo."
              : "Registrá un nuevo ejecutante y su seguimiento inicial."}
          </p>

        </div>


        <div
          className={
            getEstadoClass(
              estadoActual
            )
          }
        >
          {
            getEstadoIcon(
              estadoActual
            )
          }

          <div>
            <span>
              Estado actual
            </span>

            <strong>
              {estadoActual}
            </strong>
          </div>
        </div>

      </section>


      {/* =====================================================
          FORM
          ===================================================== */}

      <form
        onSubmit={guardar}
        className="edit-form"
      >

        <section className="edit-main-grid">

          {/* ===============================================
              IDENTIDAD
              =============================================== */}

          <article className="glass-card edit-section-card">

            <div className="edit-section-header">

              <div className="edit-section-icon">
                <Mail size={18} />
              </div>


              <div>

                <span>
                  IDENTIDAD Y EMPRESA
                </span>

                <h2>
                  Datos del ejecutante
                </h2>

              </div>

            </div>


            <div className="edit-field-grid">

              <label className="edit-field edit-field-full">

                <span>
                  Nombre completo *
                </span>

                <input
                  type="text"
                  name="nombreCompleto"
                  value={
                    form.nombreCompleto
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Nombre y apellido"
                />

              </label>


              <label className="edit-field edit-field-full">

                <span>
                  Email *
                </span>

                <input
                  type="email"
                  name="email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="correo@empresa.com"
                />

              </label>


              <label className="edit-field">

                <span>
                  Empresa *
                </span>

                <select
                  name="empresaId"
                  value={
                    form.empresaId
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Seleccionar empresa
                  </option>

                  {empresas.map(
                    (empresa) => (
                      <option
                        key={
                          empresa.id
                        }
                        value={
                          empresa.id
                        }
                      >
                        {
                          empresa.nombre
                        }
                      </option>
                    )
                  )}

                </select>

              </label>


              <div className="edit-field">

                <span>
                  CUIT empresa
                </span>

                <div className="edit-readonly-field">
                  <Building2 size={15} />

                  {
                    empresaSeleccionada
                      ?.cuit ||
                    "Sin información"
                  }
                </div>

              </div>

            </div>

          </article>


          {/* ===============================================
              SEGUIMIENTO
              =============================================== */}

          <article className="glass-card edit-section-card">

            <div className="edit-section-header">

              <div className="edit-section-icon">
                <Database size={18} />
              </div>


              <div>

                <span>
                  SEGUIMIENTO CILC
                </span>

                <h2>
                  Estado operativo
                </h2>

              </div>

            </div>


            <div className="edit-field-grid">

              <label className="edit-field">

                <span>
                  Fecha de solicitud
                </span>

                <input
                  type="date"
                  name="fechaSolicitud"
                  value={
                    form.fechaSolicitud
                  }
                  onChange={
                    handleChange
                  }
                />

              </label>


              <label className="edit-field">

                <span>
                  CAU / REQ
                </span>

                <input
                  type="text"
                  name="cauReq"
                  value={
                    form.cauReq
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="REQ / EP..."
                />

              </label>


              <label className="edit-field">

                <span>
                  Estado CAU
                </span>

                <select
                  name="cauEstado"
                  value={
                    form.cauEstado
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="Abierto">
                    Abierto
                  </option>

                  <option value="Pendiente">
                    Pendiente
                  </option>

                  <option value="Resuelto">
                    Resuelto
                  </option>

                  <option value="Rechazado">
                    Rechazado
                  </option>

                  <option value="Eliminado">
                    Eliminado
                  </option>

                  <option value="Baja">
                    Baja
                  </option>

                </select>

              </label>


              <label className="edit-field">

                <span>
                  PETRA
                </span>

                <select
                  name="petraEstado"
                  value={
                    form.petraEstado
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="Si">
                    Sí
                  </option>

                  <option value="No">
                    No
                  </option>

                </select>

              </label>


              <label className="edit-field">

                <span>
                  Estado de ingreso
                </span>

                <select
                  name="ingresoEstado"
                  value={
                    form.ingresoEstado
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="Confirmado">
                    Confirmado
                  </option>

                  <option value="No">
                    No
                  </option>

                </select>

              </label>


              <label className="edit-field">

                <span>
                  Estado operativo manual
                </span>

                <select
                  name="estadoOperativoManual"
                  value={
                    form.estadoOperativoManual
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="">
                    Automático según CAU
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

              </label>

            </div>


            <div className="edit-status-help">

              <CheckCircle2
                size={16}
              />

              <div>

                <strong>
                  Estado operativo
                </strong>

                <span>
                  Si dejás “Automático según CAU”, el portal lo calcula usando el estado CAU. También podés definirlo manualmente.
                </span>

              </div>

            </div>

          </article>

        </section>


        {/* ===================================================
            OBSERVACIONES
            =================================================== */}

        <section className="glass-card edit-notes-card">

          <div className="edit-section-header">

            <div className="edit-section-icon">
              <StickyNote
                size={18}
              />
            </div>


            <div>

              <span>
                OBSERVACIONES
              </span>

              <h2>
                Notas del seguimiento
              </h2>

            </div>

          </div>


          <textarea
            name="notas"
            value={
              form.notas
            }
            onChange={
              handleChange
            }
            placeholder="Agregar observaciones, incidencias o información útil para el seguimiento..."
            rows={5}
          />

        </section>


        {/* ===================================================
            MENSAJES
            =================================================== */}

        {error && (
          <div className="edit-form-message error">
            <AlertTriangle
              size={16}
            />

            {error}
          </div>
        )}


        {success && (
          <div className="edit-form-message success">
            <CheckCircle2
              size={16}
            />

            {success}
          </div>
        )}


        {/* ===================================================
            FOOTER
            =================================================== */}

        <div className="edit-form-footer">

          <button
            type="button"
            className="edit-cancel-button"
            disabled={saving}
            onClick={() => {
              if (isEdit) {
                navigate(
                  `/personal/${id}`
                );
              } else {
                navigate(
                  "/personal"
                );
              }
            }}
          >
            <X size={16} />
            Cancelar
          </button>


          <button
            type="submit"
            className="edit-save-button"
            disabled={saving}
          >
            <Save size={16} />

            {saving
              ? "Guardando..."
              : "Guardar cambios"}
          </button>

        </div>

      </form>

    </div>
  );
}