import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Mail,
  Building2,
  KeyRound,
  KeySquare,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  RefreshCcw,
  ShieldCheck,
  Info,
  CheckCircle2,
  CircleHelp,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const PAGE_SIZE = 30;

function formatFecha(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function CorreosCorporativos() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("todas");
  const [estado, setEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [passwords, setPasswords] = useState({});
  const [accionando, setAccionando] = useState({});
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, empresa, estado]);

  async function cargar() {
    setLoading(true);
    setError("");

    const { data, error: queryError } =
      await supabase
        .from("v_correos_corporativos")
        .select("*")
        .eq("activo", true)
        .order("empresa", { ascending: true })
        .order("nombre_persona", { ascending: true });

    if (queryError) {
      console.error(queryError);
      setError(
        "No se pudieron cargar los correos corporativos."
      );
      setRegistros([]);
    } else {
      setRegistros(data || []);
    }

    setLoading(false);
  }

  const empresas = useMemo(() => {
    return [...new Set(
      registros
        .map((item) => item.empresa)
        .filter(Boolean)
    )].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [registros]);

  const stats = useMemo(() => {
    const total = registros.length;
    const conPassword =
      registros.filter((r) => r.tiene_password).length;

    return {
      total,
      empresas: empresas.length,
      conPassword,
      sinPassword: total - conPassword,
    };
  }, [registros, empresas]);

  const filtrados = useMemo(() => {
    const termino =
      search.trim().toLowerCase();

    return registros.filter((item) => {
      const matchSearch =
        !termino ||
        [
          item.nombre_persona,
          item.email,
          item.empresa,
          item.proveedor,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(termino)
          );

      const matchEmpresa =
        empresa === "todas" ||
        item.empresa === empresa;

      const matchEstado =
        estado === "todos" ||
        (estado === "con" &&
          item.tiene_password) ||
        (estado === "sin" &&
          !item.tiene_password);

      return (
        matchSearch &&
        matchEmpresa &&
        matchEstado
      );
    });
  }, [
    registros,
    search,
    empresa,
    estado,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtrados.length / PAGE_SIZE)
  );

  const visibles = filtrados.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  async function obtenerPassword(
    item,
    accion = "ver"
  ) {
    if (!item?.tiene_password) {
      setMensaje(
        `No hay contraseña registrada para ${item.email}.`
      );
      return null;
    }

    setAccionando((prev) => ({
      ...prev,
      [item.id]: accion,
    }));

    setMensaje("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "obtener_password_correo_corporativo",
          {
            p_correo_id: item.id,
            p_accion: accion,
          }
        );

      if (rpcError) {
        throw rpcError;
      }

      const registro = Array.isArray(data)
        ? data[0]
        : data;

      const password =
        registro?.contrasena || "";

      if (!password) {
        setMensaje(
          `No hay contraseña registrada para ${item.email}.`
        );
        return null;
      }

      return password;
    } catch (err) {
      console.error(err);
      setMensaje(
        err?.message ||
          "No se pudo acceder a la contraseña."
      );
      return null;
    } finally {
      setAccionando((prev) => ({
        ...prev,
        [item.id]: "",
      }));
    }
  }

  async function togglePassword(item) {
    if (passwords[item.id]) {
      setPasswords((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    const password =
      await obtenerPassword(item, "ver");

    if (password) {
      setPasswords((prev) => ({
        ...prev,
        [item.id]: password,
      }));
    }
  }

  async function copiarPassword(item) {
    const password =
      await obtenerPassword(
        item,
        "copiar"
      );

    if (!password) return;

    try {
      await navigator.clipboard.writeText(
        password
      );

      setMensaje(
        `Contraseña de ${item.email} copiada.`
      );
    } catch (err) {
      console.error(err);
      setMensaje(
        "No se pudo copiar automáticamente. Podés verla y copiarla manualmente."
      );

      setPasswords((prev) => ({
        ...prev,
        [item.id]: password,
      }));
    }
  }

  function abrirWebmail(item) {
    if (!item.webmail_url) {
      setMensaje(
        `${item.empresa} utiliza ${item.proveedor}. No hay una URL de webmail registrada.`
      );
      return;
    }

    window.open(
      item.webmail_url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="corp-mail-page">
      <div className="corp-mail-header">
        <div>
          <div className="corp-mail-eyebrow">
            <Mail size={15} />
            Accesos de empresas contratistas
          </div>

          <h1>Correos corporativos</h1>

          <p>
            Consulta centralizada de cuentas
            corporativas informadas a Soporte.
          </p>
        </div>

        <button
          type="button"
          className="corp-mail-refresh"
          onClick={cargar}
          disabled={loading}
        >
          <RefreshCcw
            size={17}
            className={
              loading ? "is-spinning" : ""
            }
          />
          Actualizar
        </button>
      </div>

      <div className="corp-mail-kpis">
        <div className="corp-mail-kpi">
          <span className="corp-mail-kpi-icon">
            <Mail size={20} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <span>Correos registrados</span>
          </div>
        </div>

        <div className="corp-mail-kpi">
          <span className="corp-mail-kpi-icon">
            <Building2 size={20} />
          </span>
          <div>
            <strong>{stats.empresas}</strong>
            <span>Empresas con información</span>
          </div>
        </div>

        <div className="corp-mail-kpi success">
          <span className="corp-mail-kpi-icon">
            <KeyRound size={20} />
          </span>
          <div>
            <strong>{stats.conPassword}</strong>
            <span>Con contraseña</span>
          </div>
        </div>

        <div className="corp-mail-kpi warning">
          <span className="corp-mail-kpi-icon">
            <CircleHelp size={20} />
          </span>
          <div>
            <strong>{stats.sinPassword}</strong>
            <span>Sin contraseña informada</span>
          </div>
        </div>
      </div>

      <div className="corp-mail-info">
        <Info size={21} />
        <div>
          <strong>Información parcial</strong>
          <p>
            Se muestran únicamente los correos
            corporativos informados a Soporte. La
            ausencia de un registro no implica que el
            ejecutante no posea una cuenta corporativa.
          </p>
        </div>
      </div>

      <div className="corp-mail-security">
        <ShieldCheck size={18} />
        Las contraseñas no se descargan junto con la
        tabla. Se descifran únicamente al solicitar
        “Ver” o “Copiar”, y la acción queda registrada
        en Auditoría.
      </div>

      {mensaje && (
        <div className="corp-mail-message">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="corp-mail-error">
          {error}
        </div>
      )}

      <div className="corp-mail-toolbar">
        <label className="corp-mail-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Buscar por persona, email o empresa..."
          />
        </label>

        <select
          value={empresa}
          onChange={(e) =>
            setEmpresa(e.target.value)
          }
        >
          <option value="todas">
            Todas las empresas
          </option>
          {empresas.map((nombre) => (
            <option
              key={nombre}
              value={nombre}
            >
              {nombre}
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
            Todas las contraseñas
          </option>
          <option value="con">
            Con contraseña
          </option>
          <option value="sin">
            Sin contraseña
          </option>
        </select>
      </div>

      <div className="corp-mail-table-card">
        <div className="corp-mail-table-head">
          <span>Persona</span>
          <span>Empresa</span>
          <span>Email corporativo</span>
          <span>Acceso</span>
          <span>Contraseña</span>
          <span>Actualización</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          <div className="corp-mail-empty">
            Cargando correos corporativos...
          </div>
        ) : visibles.length === 0 ? (
          <div className="corp-mail-empty">
            No hay registros para los filtros
            seleccionados.
          </div>
        ) : (
          visibles.map((item) => {
            const passwordVisible =
              passwords[item.id];

            const trabajando =
              accionando[item.id];

            return (
              <div
                key={item.id}
                className="corp-mail-row"
              >
                <div
                  className="corp-mail-person"
                  data-label="Persona"
                >
                  <span className="corp-mail-avatar">
                    {String(
                      item.nombre_persona || "?"
                    )
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <strong>
                      {item.nombre_persona}
                    </strong>

                    {item.ejecutante_id && (
                      <small>
                        <CheckCircle2 size={12} />
                        Vinculado al portal
                      </small>
                    )}
                  </div>
                </div>

                <div data-label="Empresa">
                  <span className="corp-mail-company">
                    {item.empresa}
                  </span>
                </div>

                <div
                  className="corp-mail-email"
                  data-label="Email corporativo"
                >
                  {item.email}
                </div>

                <div data-label="Acceso">
                  <button
                    type="button"
                    className={`corp-mail-provider ${
                      item.webmail_url
                        ? "clickable"
                        : ""
                    }`}
                    onClick={() =>
                      abrirWebmail(item)
                    }
                  >
                    {item.proveedor}
                    {item.webmail_url && (
                      <ExternalLink size={13} />
                    )}
                  </button>
                </div>

                <div
                  className="corp-mail-password"
                  data-label="Contraseña"
                >
                  {!item.tiene_password ? (
                    <span className="corp-mail-no-pass">
                      Sin informar
                    </span>
                  ) : passwordVisible ? (
                    <code>{passwordVisible}</code>
                  ) : (
                    <span className="corp-mail-hidden-pass">
                      ••••••••••••
                    </span>
                  )}
                </div>

                <div
                  className="corp-mail-updated"
                  data-label="Actualización"
                >
                  {formatFecha(item.updated_at)}
                </div>

                <div
                  className="corp-mail-actions"
                  data-label="Acciones"
                >
                  <button
                    type="button"
                    title={
                      passwordVisible
                        ? "Ocultar contraseña"
                        : "Ver contraseña"
                    }
                    disabled={
                      !item.tiene_password ||
                      Boolean(trabajando)
                    }
                    onClick={() =>
                      togglePassword(item)
                    }
                  >
                    {passwordVisible ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Copiar contraseña"
                    disabled={
                      !item.tiene_password ||
                      Boolean(trabajando)
                    }
                    onClick={() =>
                      copiarPassword(item)
                    }
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    type="button"
                    title={
                      item.webmail_url
                        ? "Abrir acceso"
                        : `Acceso mediante ${item.proveedor}`
                    }
                    onClick={() =>
                      abrirWebmail(item)
                    }
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="corp-mail-footer">
        <span>
          Mostrando{" "}
          {filtrados.length === 0
            ? 0
            : (page - 1) * PAGE_SIZE + 1}
          –
          {Math.min(
            page * PAGE_SIZE,
            filtrados.length
          )}{" "}
          de {filtrados.length}
        </span>

        <div className="corp-mail-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((prev) =>
                Math.max(1, prev - 1)
              )
            }
          >
            Anterior
          </button>

          <span>
            Página {page} de {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((prev) =>
                Math.min(
                  totalPages,
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
