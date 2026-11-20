import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  Mail,
  FileText,
  Database,
  CircleCheckBig,
  Clock3,
  TriangleAlert,
  UserRoundX,
  KeyRound,
  ShieldCheck,
  CalendarClock,
  RefreshCcw,
  Copy,
  Send,
  History,
  Layers3,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  CircleX,
  User,
  ChevronRight,
  Plus,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { id: "resumen", label: "Resumen" },
  { id: "credenciales", label: "Credenciales" },
  { id: "aplicaciones", label: "Aplicaciones" },
  { id: "historial", label: "Historial" },
  { id: "recuperaciones", label: "Recuperaciones" },
];

export default function EjecutanteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();

  const [tab, setTab] = useState("resumen");

  const [ejecutante, setEjecutante] = useState(null);
  const [credenciales, setCredenciales] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [aplicaciones, setAplicaciones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [editingRecovery, setEditingRecovery] = useState(null);
  const [recoveryType, setRecoveryType] = useState("Login directo PETRA");
  const [recoveryChannel, setRecoveryChannel] = useState("Teams");
  const [recoveryStatus, setRecoveryStatus] = useState("Solicitada");
  const [recoveryObservation, setRecoveryObservation] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  // Credenciales sensibles: solo se solicitan al backend cuando soporte decide verlas.
  const [secretCredential, setSecretCredential] = useState(null);
  const [secretStatus, setSecretStatus] = useState({
    tiene_password_ibm: false,
    tiene_pin: false,
    tiene_petra_login: false,
    updated_at: null,
  });
  const [secretVisible, setSecretVisible] = useState({
    password: false,
    pin: false,
    petra_login: false,
  });
  const [loadingSecret, setLoadingSecret] = useState(false);
  const [secretError, setSecretError] = useState("");
  const [ypfRecoveryMessage, setYpfRecoveryMessage] = useState("");
  const [openingYpfRecovery, setOpeningYpfRecovery] = useState(false);

  const [showSecretModal, setShowSecretModal] = useState(false);
  const [savingSecret, setSavingSecret] = useState(false);
  const [secretSaveError, setSecretSaveError] = useState("");
  const [secretForm, setSecretForm] = useState({
    usuario: "",
    password: "",
    pin: "",
    petra_login: "",
  });

  // Cada modal se registra como una capa del historial del navegador.
  // Atrás cierra primero la última acción y mantiene abierta la ficha
  // del mismo ejecutante, sin volver a cargar sus datos.
  useEffect(() => {
    function handlePopState() {
      setShowSecretModal(false);
      setShowRecoveryModal(false);
      setShowDeleteModal(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function abrirCapaHistorial(tipo) {
    const actual = window.history.state || {};

    if (
      actual?.portalDetalleAccion === tipo &&
      actual?.portalEjecutanteId === id
    ) {
      return;
    }

    window.history.pushState(
      {
        ...actual,
        portalDetalleAccion: tipo,
        portalEjecutanteId: id,
      },
      "",
      window.location.href
    );
  }

  function cerrarCapaHistorial(tipo, cierreLocal) {
    const actual = window.history.state || {};

    if (
      actual?.portalDetalleAccion === tipo &&
      actual?.portalEjecutanteId === id
    ) {
      window.history.back();
      return;
    }

    cierreLocal();
  }

  useEffect(() => {
    cargarFicha();
  }, [id]);

  useEffect(() => {
    if (canEdit) {
      cargarEstadoSecretos();
    } else {
      setSecretStatus({
        tiene_password_ibm: false,
        tiene_pin: false,
        tiene_petra_login: false,
        updated_at: null,
      });
    }
  }, [id, canEdit]);

  async function cargarEstadoSecretos() {
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "estado_credenciales_secretas",
        { p_ejecutante_id: id }
      );

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;

      setSecretStatus({
        tiene_password_ibm: Boolean(row?.tiene_password_ibm),
        tiene_pin: Boolean(row?.tiene_pin),
        tiene_petra_login: Boolean(row?.tiene_petra_login),
        updated_at: row?.updated_at || null,
      });
    } catch (err) {
      console.error(
        "Error cargando estado de credenciales sensibles:",
        err
      );
    }
  }

  async function cargarFicha() {
    setLoading(true);
    setError("");

    try {
      const fichaResult = await supabase
        .from("v_ejecutantes_seguimiento")
        .select("*")
        .eq("ejecutante_id", id)
        .order("fecha_solicitud", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(1);

      if (fichaResult.error) {
        throw fichaResult.error;
      }

      if (!fichaResult.data?.length) {
        setError("No encontramos este ejecutante.");
        setLoading(false);
        return;
      }

      setEjecutante(fichaResult.data[0]);

      const [
        credencialesResult,
        historialResult,
        recuperacionesResult,
        aplicacionesResult,
      ] = await Promise.all([
        supabase
          .from("estado_credenciales")
          .select("*")
          .eq("ejecutante_id", id)
          .maybeSingle(),

        supabase
          .from("historial_credenciales")
          .select("*")
          .eq("ejecutante_id", id)
          .order("fecha", {
            ascending: false,
          }),

        supabase
          .from("recuperaciones")
          .select("*")
          .eq("ejecutante_id", id)
          .order("fecha", {
            ascending: false,
          }),

        supabase
          .from("ejecutante_aplicaciones")
          .select(`
            id,
            estado,
            created_at,
            aplicacion_id,
            aplicaciones (
              id,
              nombre,
              descripcion,
              url_acceso,
              autenticacion,
              activa
            )
          `)
          .eq("ejecutante_id", id),
      ]);

      if (!credencialesResult.error) {
        setCredenciales(
          credencialesResult.data || null
        );
      }

      if (!historialResult.error) {
        setHistorial(
          historialResult.data || []
        );
      }

      if (!recuperacionesResult.error) {
        setRecuperaciones(
          recuperacionesResult.data || []
        );
      }

      if (!aplicacionesResult.error) {
        setAplicaciones(
          aplicacionesResult.data || []
        );
      }

      setLoading(false);
    } catch (err) {
      console.error(
        "Error cargando ficha:",
        err
      );

      setError(
        "No se pudo cargar la ficha del ejecutante."
      );

      setLoading(false);
    }
  }

  function formatFecha(fecha) {
    if (!fecha) return "Sin registro";

    const value = String(fecha);

    if (
      value.includes("T") ||
      value.includes(":")
    ) {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
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
    }

    const parts = value.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return value;
  }

  function estadoIcon(estado) {
    if (estado === "OK") {
      return (
        <CircleCheckBig size={15} />
      );
    }

    if (estado === "En curso") {
      return <Clock3 size={15} />;
    }

    if (estado === "Problema") {
      return (
        <TriangleAlert size={15} />
      );
    }

    return <UserRoundX size={15} />;
  }

  function estadoClass(estado) {
    if (estado === "OK") {
      return "detail-status success";
    }

    if (estado === "En curso") {
      return "detail-status warning";
    }

    if (estado === "Problema") {
      return "detail-status danger";
    }

    return "detail-status neutral";
  }

  async function eliminarEjecutante() {
    if (!ejecutante?.ejecutante_id) {
      return;
    }

    setDeleting(true);

    const { error } = await supabase
      .from("ejecutantes")
      .delete()
      .eq(
        "id",
        ejecutante.ejecutante_id
      );

    if (error) {
      console.error(
        "Error eliminando ejecutante:",
        error
      );

      alert(
        "No se pudo eliminar el ejecutante. Revisá los permisos de Supabase."
      );

      setDeleting(false);
      return;
    }

    navigate("/personal", {
      replace: true,
    });
  }

  async function copiarEmail() {
    if (!ejecutante?.email) return;

    await navigator.clipboard.writeText(
      ejecutante.email
    );
  }


  async function abrirRecuperacionYpf() {
    if (!canEdit || openingYpfRecovery) return;

    const email =
      ejecutante?.email?.trim();

    if (!email) {
      setYpfRecoveryMessage(
        "Este ejecutante no tiene un email registrado para iniciar la recuperación."
      );
      return;
    }

    setOpeningYpfRecovery(true);
    setYpfRecoveryMessage("");

    /*
     * Abrimos primero la página oficial desde el click del usuario
     * para evitar que el navegador la bloquee como popup.
     */
    window.open(
      "https://ssofed.ypf.com/ufpw/recupero_clave_cp",
      "_blank",
      "noopener,noreferrer"
    );

    let copiado = false;

    try {
      await navigator.clipboard.writeText(email);
      copiado = true;
    } catch (clipboardError) {
      console.warn(
        "No se pudo copiar automáticamente el email:",
        clipboardError
      );
    }

    try {
      const { error: auditError } = await supabase.rpc(
        "registrar_apertura_recuperacion_ypf",
        {
          p_ejecutante_id: id,
        }
      );

      if (auditError) {
        console.error(
          "No se pudo registrar la apertura del recuperador YPF:",
          auditError
        );
      }
    } catch (auditError) {
      console.error(
        "Error registrando la apertura del recuperador YPF:",
        auditError
      );
    } finally {
      setYpfRecoveryMessage(
        copiado
          ? `Se abrió el recuperador oficial de YPF y se copió ${email} al portapapeles.`
          : `Se abrió el recuperador oficial de YPF. Email a utilizar: ${email}.`
      );

      setOpeningYpfRecovery(false);
    }
  }


  async function obtenerCredencialSecreta() {
    if (!canEdit) {
      setSecretError(
        "Tu perfil no tiene permiso para visualizar credenciales sensibles."
      );
      return null;
    }

    if (secretCredential) {
      return secretCredential;
    }

    setLoadingSecret(true);
    setSecretError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "ver_credencial_secreta",
        { p_ejecutante_id: id }
      );

      if (rpcError) {
        const message = rpcError.message || "";

        if (
          message
            .toLowerCase()
            .includes("no tiene credenciales registradas")
        ) {
          setSecretError(
            "Todavía no hay credenciales sensibles registradas para este ejecutante."
          );
          return null;
        }

        throw rpcError;
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (!row) {
        setSecretError(
          "Todavía no hay credenciales sensibles registradas para este ejecutante."
        );
        return null;
      }

      setSecretCredential(row);
      return row;
    } catch (err) {
      console.error(
        "Error leyendo credenciales sensibles:",
        err
      );

      setSecretError(
        err?.message ||
          "No se pudieron consultar las credenciales sensibles."
      );
      return null;
    } finally {
      setLoadingSecret(false);
    }
  }

  async function alternarSecreto(tipo) {
    if (secretVisible[tipo]) {
      setSecretVisible((prev) => ({
        ...prev,
        [tipo]: false,
      }));
      return;
    }

    const row = await obtenerCredencialSecreta();
    if (!row) return;

    setSecretVisible((prev) => ({
      ...prev,
      [tipo]: true,
    }));
  }

  async function copiarSecreto(tipo) {
    const row = await obtenerCredencialSecreta();
    if (!row) return;

    const value = row[tipo];

    if (!value) {
      setSecretError(
        tipo === "password"
          ? "No hay contraseña IBM registrada para este ejecutante."
          : tipo === "petra_login"
          ? "No hay contraseña de Login directo PETRA registrada para este ejecutante."
          : "No hay PIN registrado para este ejecutante."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
    } catch (err) {
      console.error("No se pudo copiar la credencial:", err);
      setSecretError(
        "No se pudo copiar la credencial al portapapeles."
      );
    }
  }

  function abrirModalCredencial() {
    if (!canEdit) return;

    setSecretSaveError("");
    setSecretForm({
      usuario:
        secretCredential?.usuario ||
        ejecutante?.usuario_ibm ||
        "",
      password: "",
      pin: "",
      petra_login: "",
    });
    abrirCapaHistorial("credencial");
    setShowSecretModal(true);
  }

  function limpiarModalCredencial() {
    setShowSecretModal(false);
    setSecretSaveError("");
    setSecretForm({
      usuario: "",
      password: "",
      pin: "",
      petra_login: "",
    });
  }

  function cerrarModalCredencial() {
    if (savingSecret) return;
    cerrarCapaHistorial("credencial", limpiarModalCredencial);
  }

  async function guardarCredencialSecreta(event) {
    event.preventDefault();
    if (!canEdit) return;

    if (
      !secretForm.usuario.trim() &&
      !secretForm.password &&
      !secretForm.pin &&
      !secretForm.petra_login
    ) {
      setSecretSaveError(
        "Ingresá al menos el usuario, la contraseña IBM, el PIN o el Login directo PETRA."
      );
      return;
    }

    if (
      secretForm.pin &&
      !/^\d{5}$/.test(secretForm.pin)
    ) {
      setSecretSaveError(
        "El PIN debe tener exactamente 5 números."
      );
      return;
    }

    setSavingSecret(true);
    setSecretSaveError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "guardar_credencial_secreta",
        {
          p_ejecutante_id: id,
          p_usuario: secretForm.usuario.trim() || null,
          p_password: secretForm.password || null,
          p_pin: secretForm.pin || null,
          p_petra_login: secretForm.petra_login || null,
        }
      );

      if (rpcError) throw rpcError;

      // No retenemos el secreto recién ingresado en memoria.
      // La próxima lectura vuelve a pasar por la RPC auditada.
      setSecretCredential(null);
      setSecretVisible({
        password: false,
        pin: false,
        petra_login: false,
      });
      setSecretError("");
      cerrarCapaHistorial("credencial", limpiarModalCredencial);
      await cargarEstadoSecretos();
    } catch (err) {
      console.error(
        "Error guardando credenciales sensibles:",
        err
      );
      setSecretSaveError(
        err?.message ||
          "No se pudieron guardar las credenciales."
      );
    } finally {
      setSavingSecret(false);
    }
  }

  function abrirNuevaRecuperacion(tipo = "Login directo PETRA") {
    if (!canEdit) return;

    setEditingRecovery(null);
    setRecoveryType(tipo);
    setRecoveryChannel("Teams");
    setRecoveryStatus("Solicitada");
    setRecoveryObservation("");
    setRecoveryError("");
    abrirCapaHistorial("recuperacion");
    setShowRecoveryModal(true);
  }


  function abrirEdicionRecuperacion(item) {
    if (!canEdit) return;

    setEditingRecovery(item);
    setRecoveryType(item.tipo || "Acceso IBM");
    setRecoveryChannel(item.canal || "Otro");
    setRecoveryStatus(item.estado || "En gestión");
    setRecoveryObservation(item.observacion || "");
    setRecoveryError("");
    abrirCapaHistorial("recuperacion");
    setShowRecoveryModal(true);
  }


  function limpiarRecoveryModal() {
    setShowRecoveryModal(false);
    setEditingRecovery(null);
    setRecoveryError("");
  }

  function cerrarRecoveryModal() {
    if (savingRecovery) return;
    cerrarCapaHistorial("recuperacion", limpiarRecoveryModal);
  }


  async function guardarRecuperacion() {
    if (!canEdit || !ejecutante?.ejecutante_id) return;

    setSavingRecovery(true);
    setRecoveryError("");

    try {
      if (editingRecovery) {
        const { error } = await supabase.rpc(
          "actualizar_recuperacion",
          {
            p_recuperacion_id: editingRecovery.id,
            p_estado: recoveryStatus,
            p_observacion: recoveryObservation.trim() || null,
          }
        );

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc(
          "registrar_recuperacion",
          {
            p_ejecutante_id: ejecutante.ejecutante_id,
            p_tipo: recoveryType,
            p_canal: recoveryChannel,
            p_estado: recoveryStatus,
            p_observacion: recoveryObservation.trim() || null,
          }
        );

        if (error) throw error;
      }

      const { data, error } = await supabase
        .from("recuperaciones")
        .select("*")
        .eq("ejecutante_id", ejecutante.ejecutante_id)
        .order("fecha", { ascending: false });

      if (error) throw error;

      setRecuperaciones(data || []);
      setRecoveryObservation("");
      cerrarCapaHistorial("recuperacion", limpiarRecoveryModal);
    } catch (err) {
      console.error("Error guardando recuperación:", err);
      setRecoveryError(
        err?.message ||
          "No se pudo registrar la recuperación."
      );
    } finally {
      setSavingRecovery(false);
    }
  }


  function recoveryStatusClass(estado) {
    if (estado === "Restablecida") {
      return "recovery-status-success";
    }

    if (estado === "En gestión") {
      return "recovery-status-warning";
    }

    if (estado === "No resuelta") {
      return "recovery-status-danger";
    }

    return "recovery-status-neutral";
  }

  const initials = useMemo(() => {
    if (!ejecutante?.ejecutante) {
      return "E";
    }

    return ejecutante.ejecutante
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase()
      )
      .join("");
  }, [ejecutante]);

  function limpiarDeleteModal() {
    setShowDeleteModal(false);
  }

  function cerrarDeleteModal() {
    if (deleting) return;
    cerrarCapaHistorial("eliminar", limpiarDeleteModal);
  }


  if (loading) {
    return (
      <div className="detail-loading glass-card">
        Cargando ficha del ejecutante...
      </div>
    );
  }

  if (error || !ejecutante) {
    return (
      <div className="detail-loading glass-card">
        <strong>
          {error || "Ejecutante no encontrado"}
        </strong>

        <button
          type="button"
          onClick={() =>
            navigate("/personal")
          }
        >
          Volver a Personal
        </button>
      </div>
    );
  }

  return (
    <div className="ejecutante-detail-page">

      <button
        className="detail-back-button"
        type="button"
        onClick={() =>
          navigate("/personal")
        }
      >
        <ArrowLeft size={16} />
        Volver a Personal
      </button>


      {/* ===================================================
          HEADER
      =================================================== */}

      <section className="glass-card detail-profile-header">

        <div className="detail-profile-main">

          <div className="detail-avatar">
            {initials}
          </div>

          <div className="detail-profile-info">

            <div className="detail-title-row">

              <h1>
                {ejecutante.ejecutante}
              </h1>

              <span
                className={estadoClass(
                  ejecutante.estado_operacional
                )}
              >
                {estadoIcon(
                  ejecutante.estado_operacional
                )}

                {
                  ejecutante.estado_operacional
                }
              </span>

            </div>


            <div className="detail-profile-meta">

              <span>
                <Building2 size={14} />
                {ejecutante.empresa ||
                  "Sin empresa"}
              </span>

              <span>
                <Mail size={14} />
                {ejecutante.email ||
                  "Sin email"}
              </span>

              <span>
                <FileText size={14} />
                {ejecutante.cau_req ||
                  "Sin CAU"}
              </span>

            </div>

          </div>

        </div>


        {canEdit && (
          <div className="detail-header-actions">

            <button
              className="detail-action-button secondary"
              type="button"
              onClick={() =>
                navigate(
                  `/personal/${id}/editar`
                )
              }
            >
              <Pencil size={15} />
              Editar
            </button>


            <button
              className="detail-action-button danger"
              type="button"
              onClick={() => {
                abrirCapaHistorial("eliminar");
                setShowDeleteModal(true);
              }}
            >
              <Trash2 size={15} />
              Eliminar
            </button>

          </div>
        )}

      </section>


      {/* ===================================================
          TABS
      =================================================== */}

      <nav className="glass-card detail-tabs">

        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              tab === item.id
                ? "active"
                : ""
            }
            onClick={() =>
              setTab(item.id)
            }
          >
            {item.label}
          </button>
        ))}

      </nav>


      {/* ===================================================
          RESUMEN
      =================================================== */}

      {tab === "resumen" && (
        <div className="detail-tab-content">

          <section className="detail-summary-grid">

            <article className="glass-card detail-summary-card">

              <span className="detail-section-kicker">
                IDENTIDAD
              </span>

              <h2>
                Información del ejecutante
              </h2>

              <div className="detail-data-grid">

                <DetailField
                  label="Nombre"
                  value={
                    ejecutante.ejecutante
                  }
                />

                <DetailField
                  label="Email"
                  value={
                    ejecutante.email
                  }
                />

                <DetailField
                  label="Empresa"
                  value={
                    ejecutante.empresa
                  }
                />

                <DetailField
                  label="CUIT empresa"
                  value={
                    ejecutante.cuit
                  }
                />

              </div>

            </article>


            <article className="glass-card detail-summary-card">

              <span className="detail-section-kicker">
                SEGUIMIENTO
              </span>

              <h2>
                Estado operativo
              </h2>

              <div className="detail-data-grid">

                <DetailField
                  label="CAU / REQ"
                  value={
                    ejecutante.cau_req
                  }
                />

                <DetailField
                  label="Estado CAU"
                  value={
                    ejecutante.cau_estado
                  }
                />

                <DetailField
                  label="PETRA"
                  value={
                    ejecutante.petra_estado
                  }
                />

                <DetailField
                  label="Ingreso"
                  value={
                    ejecutante.ingreso_estado
                  }
                />

                <DetailField
                  label="Fecha solicitud"
                  value={formatFecha(
                    ejecutante.fecha_solicitud
                  )}
                />

                <DetailField
                  label="Estado operacional"
                  value={
                    ejecutante.estado_operacional
                  }
                />

              </div>

            </article>

          </section>


          <section className="glass-card detail-notes-card">

            <span className="detail-section-kicker">
              OBSERVACIONES
            </span>

            <h2>
              Notas del seguimiento
            </h2>

            <p>
              {ejecutante.notas ||
                "No hay observaciones registradas para este ejecutante."}
            </p>

          </section>

        </div>
      )}


      {/* ===================================================
          CREDENCIALES
      =================================================== */}

      {tab === "credenciales" && (
        <div className="detail-tab-content">

          <section className="glass-card detail-secret-panel">

            <div className="detail-section-heading">
              <div>
                <span className="detail-section-kicker">
                  ACCESO SOPORTE
                </span>
                <h2>Credenciales vigentes</h2>
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="detail-action-button secondary"
                  onClick={abrirModalCredencial}
                >
                  <Pencil size={15} />
                  Actualizar credenciales
                </button>
              )}
            </div>

            {!canEdit ? (
              <div className="detail-identity-warning">
                <ShieldCheck size={19} />
                <div>
                  <strong>Acceso restringido</strong>
                  <span>
                    Solo Administrador y Soporte pueden visualizar PIN, contraseña IBM y Login directo PETRA.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="secret-credentials-grid">
                  <SecretField
                    label="Usuario IBM"
                    value={
                      secretCredential?.usuario ||
                      ejecutante.usuario_ibm ||
                      "Sin información"
                    }
                    visible
                    canReveal={false}
                    status={
                      secretCredential?.usuario || ejecutante.usuario_ibm
                        ? "Registrado"
                        : "Sin información"
                    }
                  />

                  <SecretField
                    label="Contraseña IBM"
                    value={secretCredential?.password}
                    visible={secretVisible.password}
                    loading={loadingSecret}
                    status={
                      secretStatus.tiene_password_ibm
                        ? "Registrada"
                        : "Sin información"
                    }
                    onToggle={() => alternarSecreto("password")}
                    onCopy={() => copiarSecreto("password")}
                  />

                  <SecretField
                    label="PIN IBM"
                    value={secretCredential?.pin}
                    visible={secretVisible.pin}
                    loading={loadingSecret}
                    status={
                      secretStatus.tiene_pin
                        ? "Registrado"
                        : "Sin información"
                    }
                    onToggle={() => alternarSecreto("pin")}
                    onCopy={() => copiarSecreto("pin")}
                  />

                  <SecretField
                    label="Login directo PETRA"
                    value={secretCredential?.petra_login}
                    visible={secretVisible.petra_login}
                    loading={loadingSecret}
                    status={
                      secretStatus.tiene_petra_login
                        ? "Registrado"
                        : "Sin información"
                    }
                    onToggle={() => alternarSecreto("petra_login")}
                    onCopy={() => copiarSecreto("petra_login")}
                  />
                </div>

                {(secretStatus.updated_at || secretCredential?.updated_at) && (
                  <div className="secret-last-update">
                    <CalendarClock size={15} />
                    Última actualización de credenciales: {formatFecha(
                      secretStatus.updated_at || secretCredential?.updated_at
                    )}
                  </div>
                )}

                {secretError && (
                  <div className="secret-inline-error">
                    <AlertTriangle size={16} />
                    {secretError}
                  </div>
                )}
              </>
            )}

          </section>

          <section className="glass-card detail-actions-card">
            <div className="detail-section-heading">
              <div>
                <span className="detail-section-kicker">ACCIONES</span>
                <h2>Gestión de credenciales</h2>
              </div>
            </div>

            <div className="credential-action-grid">
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    abrirNuevaRecuperacion("Login directo PETRA")
                  }
                >
                  <Send size={17} />
                  <div>
                    <strong>Registrar recuperación</strong>
                    <span>Crear gestión de acceso</span>
                  </div>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  className="ypf-recovery-action"
                  onClick={abrirRecuperacionYpf}
                  disabled={openingYpfRecovery}
                >
                  <Mail size={17} />
                  <div>
                    <strong>Reenviar contraseña YPF</strong>
                    <span>Copiar email y abrir recuperador oficial</span>
                  </div>
                </button>
              )}

              <button type="button" onClick={copiarEmail}>
                <Copy size={17} />
                <div>
                  <strong>Copiar email</strong>
                  <span>Copiar contacto del ejecutante</span>
                </div>
              </button>

              {canEdit && (
                <button type="button" onClick={abrirModalCredencial}>
                  <RefreshCcw size={17} />
                  <div>
                    <strong>Actualizar contraseña</strong>
                    <span>Guardar contraseña cifrada</span>
                  </div>
                </button>
              )}

              {canEdit && (
                <button type="button" onClick={abrirModalCredencial}>
                  <KeyRound size={17} />
                  <div>
                    <strong>Actualizar PIN</strong>
                    <span>Guardar PIN cifrado</span>
                  </div>
                </button>
              )}
            </div>

            {ypfRecoveryMessage && (
              <div className="ypf-recovery-feedback">
                <CheckCircle2 size={16} />
                <span>{ypfRecoveryMessage}</span>
              </div>
            )}
          </section>

          <section className="detail-identity-warning">
            <ShieldCheck size={19} />
            <div>
              <strong>Identidad IBM compartida</strong>
              <span>
                Un cambio de contraseña IBM puede afectar otros accesos asociados a la misma identidad. La visualización de PIN, contraseña IBM y Login directo PETRA queda registrada en Auditoría.
              </span>
            </div>
          </section>

        </div>
      )}


      {/* ===================================================
          APLICACIONES
      =================================================== */}

      {tab === "aplicaciones" && (
        <div className="detail-tab-content">

          <section className="glass-card detail-list-card">

            <div className="detail-section-heading">

              <div>
                <span className="detail-section-kicker">
                  ACCESOS
                </span>

                <h2>
                  Aplicaciones asociadas
                </h2>
              </div>

              <span className="detail-count">
                {aplicaciones.length}
              </span>

            </div>


            {aplicaciones.length === 0 ? (

              <EmptyState
                icon={
                  <Layers3 size={22} />
                }
                title="Sin aplicaciones asociadas"
                description="Todavía no hay aplicaciones vinculadas a este ejecutante."
              />

            ) : (

              <div className="detail-app-list">

                {aplicaciones.map(
                  (item) => (

                    <div
                      className="detail-app-row"
                      key={item.id}
                    >

                      <div className="detail-app-icon">
                        <Layers3
                          size={18}
                        />
                      </div>

                      <div className="detail-app-info">

                        <strong>
                          {item.aplicaciones
                            ?.nombre ||
                            "Aplicación"}
                        </strong>

                        <span>
                          {item.aplicaciones
                            ?.descripcion ||
                            "Sin descripción"}
                        </span>

                      </div>

                      <span className="detail-simple-badge success">
                        {item.estado ||
                          "Activo"}
                      </span>

                      <ChevronRight
                        size={17}
                      />

                    </div>

                  )
                )}

              </div>
            )}

          </section>

        </div>
      )}


      {/* ===================================================
          HISTORIAL
      =================================================== */}

      {tab === "historial" && (
        <div className="detail-tab-content">

          <section className="glass-card detail-list-card">

            <div className="detail-section-heading">

              <div>
                <span className="detail-section-kicker">
                  TRAZABILIDAD
                </span>

                <h2>
                  Historial del ejecutante
                </h2>
              </div>

              <span className="detail-count">
                {historial.length}
              </span>

            </div>


            {historial.length === 0 ? (

              <EmptyState
                icon={
                  <History size={22} />
                }
                title="Sin movimientos registrados"
                description="Los cambios de credenciales aparecerán acá automáticamente."
              />

            ) : (

              <div className="detail-timeline">

                {historial.map(
                  (item, index) => (

                    <article
                      key={item.id}
                      className="detail-timeline-item"
                    >

                      <div className="timeline-marker">
                        <History
                          size={15}
                        />
                      </div>


                      {index <
                        historial.length -
                          1 && (
                        <span className="timeline-line" />
                      )}


                      <div className="timeline-content">

                        <div className="timeline-heading">

                          <div>
                            <strong>
                              {item.tipo ||
                                "Movimiento"}
                            </strong>

                            <span>
                              {item.aplicacion ||
                                "Portal de ejecución"}
                            </span>
                          </div>

                          <time>
                            {formatFecha(
                              item.fecha
                            )}
                          </time>

                        </div>


                        {item.detalle && (
                          <p>
                            {item.detalle}
                          </p>
                        )}


                        <div className="timeline-user">

                          <User size={13} />

                          {item.soporte ||
                            "Sistema"}

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>
            )}

          </section>

        </div>
      )}


      {/* ===================================================
          RECUPERACIONES
      =================================================== */}

      {tab === "recuperaciones" && (
        <div className="detail-tab-content">

          <section className="glass-card detail-actions-card recovery-control-card">

            <div className="detail-section-heading">

              <div>
                <span className="detail-section-kicker">
                  RECUPERACIÓN DE ACCESO
                </span>

                <h2>
                  Gestión de recuperaciones
                </h2>

                <p className="recovery-section-copy">
                  Registrá la asistencia realizada y su estado.
                  No se almacenan contraseñas, PIN ni enlaces sensibles.
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  className="recovery-primary-button"
                  onClick={() => abrirNuevaRecuperacion()}
                >
                  <Plus size={15} />
                  Registrar recuperación
                </button>
              )}

            </div>

            {!canEdit && (
              <div className="recovery-readonly-notice">
                <ShieldCheck size={16} />

                <div>
                  <strong>Modo consulta</strong>
                  <span>
                    Podés visualizar la trazabilidad, pero no modificarla.
                  </span>
                </div>
              </div>
            )}

          </section>


          <section className="glass-card detail-list-card">

            <div className="detail-section-heading">

              <div>
                <span className="detail-section-kicker">
                  TRAZABILIDAD
                </span>

                <h2>
                  Historial de recuperaciones
                </h2>
              </div>

              <span className="detail-count">
                {recuperaciones.length}
              </span>

            </div>


            {recuperaciones.length === 0 ? (

              <EmptyState
                icon={
                  <RefreshCcw size={22} />
                }
                title="Sin recuperaciones registradas"
                description="Cuando se registre una recuperación aparecerá en esta sección."
              />

            ) : (

              <div className="recovery-list-real">

                {recuperaciones.map((item) => (
                  <article
                    className="recovery-row recovery-row-real"
                    key={item.id}
                  >

                    <div className="recovery-icon">
                      <RefreshCcw size={17} />
                    </div>

                    <div className="recovery-main">
                      <strong>
                        {item.tipo || "Recuperación"}
                      </strong>

                      <span>
                        {item.canal || "Sin canal"}
                      </span>

                      {item.observacion && (
                        <p className="recovery-observation">
                          {item.observacion}
                        </p>
                      )}
                    </div>

                    <div className="recovery-support">
                      <span>Gestionado por</span>
                      <strong>
                        {item.soporte || "Sistema"}
                      </strong>
                    </div>

                    <div className="recovery-date">
                      {formatFecha(item.fecha)}
                    </div>

                    <span
                      className={`recovery-status-badge ${recoveryStatusClass(
                        item.estado
                      )}`}
                    >
                      {item.estado || "Solicitada"}
                    </span>

                    {canEdit && (
                      <button
                        type="button"
                        className="recovery-edit-button"
                        onClick={() =>
                          abrirEdicionRecuperacion(item)
                        }
                      >
                        <Pencil size={13} />
                        Actualizar
                      </button>
                    )}

                  </article>
                ))}

              </div>
            )}

          </section>

        </div>
      )}


      {/* ===================================================
          MODAL RECUPERACIÓN
      =================================================== */}

      {showRecoveryModal && (
        <div
          className="detail-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cerrarRecoveryModal();
            }
          }}
        >

          <div className="recovery-modal">

            <button
              className="detail-modal-close"
              type="button"
              disabled={savingRecovery}
              onClick={cerrarRecoveryModal}
            >
              <X size={18} />
            </button>

            <div className="recovery-modal-header">
              <div>
                <span className="detail-section-kicker">
                  RECUPERACIÓN DE ACCESO
                </span>

                <h2>
                  {editingRecovery
                    ? "Actualizar recuperación"
                    : "Registrar recuperación"}
                </h2>

                <p>
                  {ejecutante.ejecutante}
                </p>
              </div>
            </div>

            <div className="recovery-modal-grid">

              <label className="recovery-modal-field">
                <span>Tipo</span>
                <select
                  value={recoveryType}
                  disabled={Boolean(editingRecovery) || savingRecovery}
                  onChange={(event) =>
                    setRecoveryType(event.target.value)
                  }
                >
                  <option value="Login directo PETRA">
                    Login directo PETRA
                  </option>

                  <option value="IBM - PIN">
                    IBM - PIN
                  </option>

                  <option value="Otro">
                    Otro
                  </option>
                </select>
              </label>

              <label className="recovery-modal-field">
                <span>Canal</span>
                <select
                  value={recoveryChannel}
                  disabled={Boolean(editingRecovery) || savingRecovery}
                  onChange={(event) =>
                    setRecoveryChannel(event.target.value)
                  }
                >
                  <option value="Email">Email</option>
                  <option value="Teams">Teams</option>
                  <option value="Teléfono">Teléfono</option>
                  <option value="Presencial">Presencial</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>

              <label className="recovery-modal-field">
                <span>Estado</span>
                <select
                  value={recoveryStatus}
                  disabled={savingRecovery}
                  onChange={(event) =>
                    setRecoveryStatus(event.target.value)
                  }
                >
                  <option value="Solicitada">Solicitada</option>
                  <option value="En gestión">En gestión</option>
                  <option value="Restablecida">Restablecida</option>
                  <option value="No resuelta">No resuelta</option>
                </select>
              </label>

              <label className="recovery-modal-field recovery-modal-field-full">
                <span>Observación</span>
                <textarea
                  rows={4}
                  value={recoveryObservation}
                  disabled={savingRecovery}
                  placeholder="Ej.: Se informó procedimiento de recuperación. Pendiente de confirmación."
                  onChange={(event) =>
                    setRecoveryObservation(event.target.value)
                  }
                />
              </label>

            </div>

            <div className="recovery-security-note">
              <ShieldCheck size={15} />
              <span>
                Registrá únicamente información operativa. No ingreses contraseña, PIN, token ni enlaces sensibles.
              </span>
            </div>

            {recoveryError && (
              <div className="recovery-modal-error">
                {recoveryError}
              </div>
            )}

            <div className="recovery-modal-actions">
              <button
                type="button"
                className="cancel"
                disabled={savingRecovery}
                onClick={cerrarRecoveryModal}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="save"
                disabled={savingRecovery}
                onClick={guardarRecuperacion}
              >
                <Save size={14} />
                {savingRecovery
                  ? "Guardando..."
                  : editingRecovery
                    ? "Guardar actualización"
                    : "Registrar recuperación"}
              </button>
            </div>

          </div>

        </div>
      )}


      {/* ===================================================
          MODAL CREDENCIALES SENSIBLES
      =================================================== */}

      {showSecretModal && canEdit && (
        <div className="detail-modal-backdrop">
          <div className="detail-secret-modal">
            <button
              className="detail-modal-close"
              type="button"
              disabled={savingSecret}
              onClick={cerrarModalCredencial}
            >
              <X size={18} />
            </button>

            <div className="detail-secret-modal-icon">
              <ShieldCheck size={24} />
            </div>

            <h2>Actualizar credenciales</h2>
            <p>{ejecutante.ejecutante}</p>

            <form
              className="secret-credential-form"
              onSubmit={guardarCredencialSecreta}
            >
              <label>
                <span>Usuario IBM</span>
                <input
                  type="text"
                  value={secretForm.usuario}
                  autoComplete="off"
                  onChange={(event) =>
                    setSecretForm((prev) => ({
                      ...prev,
                      usuario: event.target.value,
                    }))
                  }
                  placeholder="Ej. RY12345"
                />
              </label>

              <label>
                <span>Nueva contraseña IBM</span>
                <input
                  type="password"
                  value={secretForm.password}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setSecretForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Vacío = conservar la actual"
                />
              </label>

              <label>
                <span>Nuevo PIN</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={5}
                  value={secretForm.pin}
                  autoComplete="off"
                  onChange={(event) =>
                    setSecretForm((prev) => ({
                      ...prev,
                      pin: event.target.value.replace(/\D/g, "").slice(0, 5),
                    }))
                  }
                  placeholder="5 números · vacío = conservar el actual"
                />
              </label>

              <label>
                <span>Login directo PETRA</span>
                <input
                  type="password"
                  value={secretForm.petra_login}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setSecretForm((prev) => ({
                      ...prev,
                      petra_login: event.target.value,
                    }))
                  }
                  placeholder="Vacío = conservar el actual"
                />
              </label>

              <div className="secret-form-note">
                <ShieldCheck size={15} />
                Los valores se almacenan cifrados. Los campos vacíos no reemplazan datos existentes.
              </div>

              {secretSaveError && (
                <div className="secret-inline-error">
                  <AlertTriangle size={16} />
                  {secretSaveError}
                </div>
              )}

              <div className="detail-modal-actions">
                <button
                  type="button"
                  className="cancel"
                  disabled={savingSecret}
                  onClick={cerrarModalCredencial}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="save"
                  disabled={savingSecret}
                >
                  <Save size={15} />
                  {savingSecret ? "Guardando..." : "Guardar credenciales"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ===================================================
          MODAL ELIMINAR
      =================================================== */}

      {showDeleteModal && (

        <div className="detail-modal-backdrop">

          <div className="detail-delete-modal">

            <button
              className="detail-modal-close"
              type="button"
              onClick={cerrarDeleteModal}
            >
              <X size={18} />
            </button>


            <div className="detail-delete-icon">
              <AlertTriangle
                size={25}
              />
            </div>


            <h2>
              Eliminar ejecutante
            </h2>


            <p>
              Vas a eliminar a{" "}
              <strong>
                {ejecutante.ejecutante}
              </strong>
              .
            </p>


            <div className="detail-delete-summary">

              <span>
                {ejecutante.empresa ||
                  "Sin empresa"}
              </span>

              <span>
                {ejecutante.email}
              </span>

            </div>


            <div className="detail-delete-warning">

              <AlertTriangle
                size={16}
              />

              Esta acción también puede eliminar
              información relacionada al
              ejecutante.

            </div>


            <div className="detail-modal-actions">

              <button
                type="button"
                className="cancel"
                disabled={deleting}
                onClick={cerrarDeleteModal}
              >
                Cancelar
              </button>


              <button
                type="button"
                className="delete"
                disabled={deleting}
                onClick={
                  eliminarEjecutante
                }
              >
                <Trash2 size={15} />

                {deleting
                  ? "Eliminando..."
                  : "Eliminar definitivamente"}
              </button>

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

function DetailField({
  label,
  value,
}) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>
        {value || "Sin información"}
      </strong>
    </div>
  );
}


function SecretField({
  label,
  value,
  visible,
  loading = false,
  canReveal = true,
  status = "Sin información",
  onToggle,
  onCopy,
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    String(value).length > 0;

  let displayValue = "••••••••••";

  if (!canReveal) {
    displayValue = value || "Sin información";
  } else if (visible) {
    displayValue = hasValue
      ? String(value)
      : "Sin dato cargado";
  }

  return (
    <article className="secret-field-card">
      <div className="secret-field-heading">
        <span className="secret-field-label">{label}</span>

        <span
          className={`secret-status-badge ${
            status === "Registrada" || status === "Registrado"
              ? "registered"
              : "empty"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="secret-field-value-row">
        <strong className="secret-field-value">
          {loading && canReveal
            ? "Consultando..."
            : displayValue}
        </strong>

        {canReveal && (
          <div className="secret-field-actions">
            <button
              type="button"
              onClick={onToggle}
              disabled={loading}
              title={visible ? "Ocultar" : "Ver"}
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {visible ? "Ocultar" : "Ver"}
            </button>

            <button
              type="button"
              onClick={onCopy}
              disabled={loading}
              title="Copiar"
            >
              <Copy size={16} />
              Copiar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}


function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <div className="detail-empty-state">

      <div>
        {icon}
      </div>

      <strong>
        {title}
      </strong>

      <span>
        {description}
      </span>

    </div>
  );
}